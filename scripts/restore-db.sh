#!/bin/bash
# ============================================================
# 数据库恢复脚本 - 紧急情况下使用
# ============================================================

set -e

if [ -z "$1" ]; then
  echo "用法: $0 <备份文件路径>"
  echo "示例: $0 /var/lib/pgsql/backups/navlog_backup_20260704_002654.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库恢复流程开始"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份文件: $BACKUP_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="

if [ ! -f "$BACKUP_FILE" ]; then
  echo "错误: 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

# 停止后端服务
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Step 1/4: 停止后端服务..."
pm2 stop nav-log-backend

# 先备份当前数据库（以防恢复失败）
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Step 2/4: 备份当前数据库..."
CURRENT_BACKUP="/var/lib/pgsql/backups/navlog_before_restore_$(date +"%Y%m%d_%H%M%S").sql"
PGPASSWORD="navlog123" pg_dump -h 106.14.57.62 -U navlog -d navlog > "$CURRENT_BACKUP"
gzip "$CURRENT_BACKUP"
echo "当前数据库已备份: ${CURRENT_BACKUP}.gz"

# 恢复数据库
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Step 3/4: 恢复数据库..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | PGPASSWORD="navlog123" psql -h 106.14.57.62 -U navlog -d navlog
else
  PGPASSWORD="navlog123" psql -h 106.14.57.62 -U navlog -d navlog < "$BACKUP_FILE"
fi

# 重启后端服务
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Step 4/4: 重启后端服务..."
pm2 restart nav-log-backend

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库恢复流程完成"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================="
