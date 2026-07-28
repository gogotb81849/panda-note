#!/bin/bash
# ============================================================
# 构建脚本 - 熊猫笔记
# 用途：在本地或 CI 环境中执行，安装依赖、运行测试、
#       构建后端和前端
# 用法：bash scripts/build.sh
# ============================================================

set -e  # 遇到错误立即退出

# ---------- 颜色输出 ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ---------- 1. 安装后端依赖 ----------
log_info "安装后端依赖..."
cd "$PROJECT_ROOT/backend"
npm ci

# ---------- 2. 运行后端测试 ----------
log_info "运行后端单元测试..."
npm test

# ---------- 3. 构建后端 ----------
log_info "构建后端..."
npm run build

# ---------- 4. 安装前端依赖 ----------
log_info "安装前端依赖..."
cd "$PROJECT_ROOT/frontend"
npm ci

# ---------- 5. 构建前端 ----------
log_info "构建前端..."
npm run build

log_info "全部构建完成！"
