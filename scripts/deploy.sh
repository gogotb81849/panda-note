#!/bin/bash
# ============================================================
# 部署脚本 - 熊猫笔记
# 用途：在服务器上执行，用于停止旧服务、更新代码、安装依赖、
#       构建前端、运行数据库迁移、启动新服务、健康检查
# 用法：bash scripts/deploy.sh
# ============================================================

set -e  # 遇到错误立即退出

# ---------- 配置 ----------
DEPLOY_DIR="/www/wwwroot/nav-log-system"
BACKEND_PORT=3002
PM2_PROCESS_NAME="nav-log-backend"
HEALTH_URL="http://localhost:${BACKEND_PORT}/health"

# ---------- 颜色输出 ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------- 1. 停止旧服务 ----------
log_info "停止旧服务..."
pm2 stop "$PM2_PROCESS_NAME" 2>/dev/null || log_warn "未找到运行中的服务 $PM2_PROCESS_NAME"

# ---------- 2. 更新代码 ----------
log_info "拉取最新代码..."
cd "$DEPLOY_DIR"
git pull origin main

# ---------- 3. 安装后端依赖 ----------
log_info "安装后端生产依赖..."
cd "$DEPLOY_DIR/backend"
npm ci --omit=dev

# ---------- 4. 构建后端 ----------
log_info "构建后端..."
npm run build

# ---------- 5. 运行数据库迁移 ----------
log_info "运行数据库迁移..."
npx prisma migrate deploy

# ---------- 6. 安装前端依赖并构建 ----------
log_info "安装前端依赖..."
cd "$DEPLOY_DIR/frontend"
npm ci

log_info "构建前端..."
npm run build

# ---------- 7. 启动新服务 ----------
log_info "启动后端服务..."
cd "$DEPLOY_DIR/backend"
pm2 startOrRestart ecosystem.config.js 2>/dev/null || \
  pm2 start dist/main.js --name "$PM2_PROCESS_NAME"
pm2 save

# ---------- 8. 健康检查 ----------
log_info "等待服务启动..."
sleep 5

log_info "执行健康检查..."
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log_info "健康检查通过！HTTP $HTTP_CODE"
        exit 0
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_warn "健康检查失败 (第 ${RETRY_COUNT}/${MAX_RETRIES} 次)，HTTP $HTTP_CODE，5 秒后重试..."
    sleep 5
done

log_error "健康检查超时，服务可能启动失败！"
exit 1
