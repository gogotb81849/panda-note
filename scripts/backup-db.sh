#!/bin/bash
# ============================================================
# 数据库备份脚本 - 必须在任何 schema 变更前执行
# ============================================================

set -e

BACKUP_DIR="/var/lib/pgsql/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/navlog_backup_$DATE.sql"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始数据库备份..."

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份
PGPASSWORD="navlog123" pg_dump -h 106.14.57.62 -U navlog -d navlog > "$BACKUP_FILE"

# 压缩备份
gzip "$BACKUP_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成: ${BACKUP_FILE}.gz"

# 保留最近7天的备份
find "$BACKUP_DIR" -name "navlog_backup_*.sql.gz" -mtime +7 -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 已清理7天前的旧备份"

# 显示备份列表
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 当前备份列表:"
ls -la "$BACKUP_DIR"/navlog_backup_*.sql.gz
