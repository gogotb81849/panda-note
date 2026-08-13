#!/usr/bin/env bash
# ============================================================
# 熊猫笔记部署后，服务器端执行的"一次性部署收尾 + 海上菜篮子联动更新"脚本
#
# 本脚本被打包进 dist-artifacts/server-side-extra.sh（见 deploy.yml Package artifacts），
# 由 deploy.yml 的 Remote deploy step 在服务器 root 用户上下文下执行（SSH_PRIVATE_KEY 登录成功后）。
#
# 触发条件（全部满足才执行真正逻辑，否则 exit 0，不影响原有部署）：
#   1) 当前用户是 root（服务器部署账号）
#   2) 环境变量 DEPLOY_DIR 存在（appleboy/ssh-action 里已注入 DEPLOY_PATH）
#   3) 不是 GitHub Actions runner（排除 Build job 里误执行）
#
# 做两件事：
#   P1. 熊猫笔记自修复（可选，PM2 状态检查 + 双进程 restart 确认）
#   P2. 联动更新海上菜篮子：按 PANDA_TO_SHIP_VERSION_MAP 当前熊猫笔记 TAG → 执行
#       /opt/ship-plant/ship-plant-big-screen/scripts/sync-update-from-panda.sh vX.Y.Z
# ============================================================
set +e  # 全程 +e：任何一步失败都不回滚熊猫笔记已成功部署的部分（安全fail-open）
DEPLOY_SCRIPT_START=$(date +%s)

PANDA_VERSION="$1"           # 例：1.1.0.0813（由调用方从 version.json 注入）
SHIP_TARGET_TAG="$2"         # 例：v1.6.2；如果传空会从 PANDA_TO_SHIP_VERSION_MAP 默认绑定解析
LOG_FILE="/var/log/panda-note-server-side-deploy.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')][panda-server-deploy] $*"; }
die()  { log "safe-skip: $* (deploy succeeded anyway, only ship-plant sync skipped)"; exit 0; }

log "============================================================"
log "参数: PANDA_VERSION=$PANDA_VERSION SHIP_TARGET_TAG=$SHIP_TARGET_TAG"
log "DEPLOY_DIR=$DEPLOY_DIR DEPLOY_PATH=$DEPLOY_PATH HOME=$HOME USER=$USER"
whoami 2>/dev/null; id 2>/dev/null

# ---------- 前置门槛检查 ----------
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  die "在 GitHub Actions runner 内执行 → 跳过（仅允许服务器端真正执行）"
fi
if [ "$(id -u 2>/dev/null || echo 1)" != "0" ]; then
  die "当前用户非 root(id=$(id -u))，PM2/全局 Docker 可能没有权限操作 → 跳过"
fi
[ -z "$DEPLOY_DIR" ] && DEPLOY_DIR="$DEPLOY_PATH"
[ -z "$DEPLOY_DIR" ] && die "DEPLOY_DIR/DEPLOY_PATH 都为空，不知道熊猫笔记装在哪 → 跳过"
[ -d "$DEPLOY_DIR/backend/dist" ] || die "DEPLOY_DIR=$DEPLOY_DIR 下没找到 backend/dist → 部署目录不对"

# ---------- P1. 熊猫笔记自修复（确认 PM2 有两个进程） ----------
log "P1 start: 检查 PM2"
if command -v pm2 >/dev/null 2>&1; then
  log "  pm2 列表:"
  pm2 jlist 2>&1 | python3 -c "import sys,json;d=json.load(sys.stdin);[print(f\"  - {r.get('name'):24s} status={r.get('pm2_env',{}).get('status'):8s} pid={r.get('pid')}\") for r in d]" 2>/dev/null || true
  for NAME in nav-log-backend nav-log-frontend; do
    if pm2 describe "$NAME" >/dev/null 2>&1; then
      log "  pm2 reload $NAME"
      pm2 reload "$NAME" --update-env >/dev/null 2>&1 || log "    reload失败，忽略"
    else
      log "  ⚠️  PM2 里没 $NAME，按 deploy.yml 兜底命令启一次"
      case "$NAME" in
        nav-log-backend)
          cd "$DEPLOY_DIR/backend" && pm2 start dist/main.js --name nav-log-backend --node-args="--max-old-space-size=512" 2>&1 | tail -3 || true
          ;;
        nav-log-frontend)
          cd "$DEPLOY_DIR/frontend" && pm2 start .output/server/index.mjs --name nav-log-frontend --node-args="--max-old-space-size=512" 2>&1 | tail -3 || true
          ;;
      esac
    fi
  done
  pm2 save >/dev/null 2>&1 || true
else
  log "  ⚠️ 服务器上没装 PM2？跳过"
fi

# ---------- P2. 联动更新海上菜篮子 ----------
# 查 PANDA_TO_SHIP_VERSION_MAP 绑定（把内嵌的映射表同步写一份在这里，免得到熊猫笔记代码里去 grep）
declare -A PANDA_TO_SHIP_VERSION_MAP=(
  ["1.1.0.0813"]="v1.6.2"
)
if [ -z "$SHIP_TARGET_TAG" ]; then
  SHIP_TARGET_TAG="${PANDA_TO_SHIP_VERSION_MAP[$PANDA_VERSION]:-}"
  log "  根据 PANDA_VERSION=$PANDA_VERSION 解析到 SHIP_TARGET_TAG=$SHIP_TARGET_TAG"
fi
if [ -z "$SHIP_TARGET_TAG" ]; then
  die "没找到熊猫笔记 $PANDA_VERSION 绑定的海上菜篮子 TAG → 本次仅部署熊猫笔记，跳过联动更新海上菜篮子"
fi

SHIP_ROOT="/opt/ship-plant"
SHIP_SCRIPT="$SHIP_ROOT/ship-plant-big-screen/scripts/sync-update-from-panda.sh"
if [ ! -f "$SHIP_SCRIPT" ]; then
  log "  P2: 海上菜篮子还没部署到 $SHIP_ROOT（sync-update-from-panda.sh 不存在）→ 尝试自动首次部署 deploy-to-server.sh（如果有）"
  FIRST_SCRIPT="$SHIP_ROOT/ship-plant-big-screen/scripts/deploy-to-server.sh"
  if [ ! -f "$FIRST_SCRIPT" ]; then
    # 代码都没 clone → 先 clone
    log "    ① git clone 海上菜篮子到 $SHIP_ROOT"
    mkdir -p "$(dirname "$SHIP_ROOT")"
    if [ -d "$SHIP_ROOT/.git" ]; then
      log "    已存在 $SHIP_ROOT/.git，不重复 clone"
    else
      if command -v git >/dev/null 2>&1; then
        git clone --depth 50 --branch "$SHIP_TARGET_TAG" https://github.com/gogotb81849/haishang-shucai-zhongzhi.git "$SHIP_ROOT" 2>&1 | tail -8 || \
          die "git clone 海上菜篮子失败（可能服务器出网被禁/没装 git）→ 手动 ssh 到服务器 clone 一次即可"
      else
        die "服务器没装 git → 无法自动首次部署海上菜篮子，手动执行"
      fi
    fi
  fi
  FIRST_SCRIPT="$SHIP_ROOT/ship-plant-big-screen/scripts/deploy-to-server.sh"
  if [ -x "$FIRST_SCRIPT" ]; then chmod +x "$FIRST_SCRIPT"; fi
  if [ -f "$FIRST_SCRIPT" ]; then
    log "    ② 执行 deploy-to-server.sh（首次全量部署），TAG=$SHIP_TARGET_TAG"
    cd "$SHIP_ROOT/ship-plant-big-screen" && bash "$FIRST_SCRIPT" "$SHIP_TARGET_TAG" 2>&1 | tail -80 || \
      log "    ⚠️ deploy-to-server.sh 非零退出 → 请手动检查日志，熊猫笔记本身部署不受影响"
  else
    die "deploy-to-server.sh 也不存在（$FIRST_SCRIPT）→ 无法自动联动"
  fi
else
  log "  P2: 已存在海上菜篮子 → 执行 sync-update-from-panda.sh $SHIP_TARGET_TAG（增量部署）"
  chmod +x "$SHIP_SCRIPT" 2>/dev/null || true
  cd "$(dirname "$SHIP_SCRIPT")/../.." 2>/dev/null  # cd 到 ship-plant-big-screen/
  cd "$SHIP_ROOT/ship-plant-big-screen" && bash "$SHIP_SCRIPT" "$SHIP_TARGET_TAG" 2>&1 | tail -80 || \
    log "    ⚠️ sync-update-from-panda.sh 非零退出 → 请手动检查日志，熊猫笔记本身部署不受影响"
fi

# ---------- 最终打印版本信息（给 GitHub Actions log 看） ----------
log "============================================================"
log "Panda Note version check: curl -sS http://127.0.0.1:3002/api/version"
curl -sS --connect-timeout 5 --max-time 10 http://127.0.0.1:3002/api/version 2>&1 | head -c 300; echo
log "Ship Plant version check: curl -sS http://127.0.0.1:8080/api/version"
curl -sS --connect-timeout 5 --max-time 10 http://127.0.0.1:8080/api/version 2>&1 | head -c 300; echo
DUR=$(( $(date +%s) - DEPLOY_SCRIPT_START ))
log "server-side-extra.sh 总耗时 = ${DUR}s"
log "============================================================"
exit 0
