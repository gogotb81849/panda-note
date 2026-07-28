#!/bin/bash
# ============================================================
# 数据库迁移脚本 - 安全的增量迁移方式
# 规则：
#   1. 绝不删除已有字段
#   2. 绝不重命名字段
#   3. 新增字段必须设置默认值
#   4. 必须先备份再迁移
# ============================================================

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
BACKEND_DIR="$PROJECT_DIR/backend"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库迁移流程开始"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="

# Step 1: 备份数据库
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Step 1/3: 执行数据库备份..."
cd "$PROJECT_DIR"
bash scripts/backup-db.sh

# Step 2: 生成迁移文件
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Step 2/3: 生成迁移文件..."
cd "$BACKEND_DIR"
npx prisma migrate dev --name auto_migration --preview-feature

# Step 3: 部署迁移（生产环境）
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Step 3/3: 部署迁移到生产环境..."
npx prisma migrate deploy

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库迁移流程完成"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="
