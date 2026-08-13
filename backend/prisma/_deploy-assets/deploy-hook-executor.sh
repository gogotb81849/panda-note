#!/usr/bin/env bash
# 服务器端执行：从 prisma/_deploy-assets 便车位置把 server-side-extra.sh 复制到真实部署路径（DEPLOY_DIR/scripts/），
# 并保证可执行权限，再由 backend/package.json postinstall 自动调用它。
set +e
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR_DEFAULT="$(cd "$HOOK_DIR/../../.." && pwd)"   # $DEPLOY_DIR/backend/prisma/_deploy-assets → $DEPLOY_DIR
DEPLOY_DIR="${DEPLOY_DIR:-$DEPLOY_DIR_DEFAULT}"
mkdir -p "$DEPLOY_DIR/scripts" "$DEPLOY_DIR/backend/scripts"
cp -f "$HOOK_DIR/server-side-extra.sh" "$DEPLOY_DIR/scripts/server-side-extra.sh"
chmod +x "$DEPLOY_DIR/scripts/server-side-extra.sh" 2>/dev/null || true
# 同时也放一份到 backend/scripts/，方便 postinstall.js 按不同候选路径都能找到
cp -f "$HOOK_DIR/server-side-extra.sh" "$DEPLOY_DIR/backend/scripts/server-side-extra.sh"
chmod +x "$DEPLOY_DIR/backend/scripts/server-side-extra.sh" 2>/dev/null || true
echo "[deploy-hook-executor] server-side-extra.sh copied. DEPLOY_DIR=$DEPLOY_DIR"
exit 0