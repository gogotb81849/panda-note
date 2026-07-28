# 已弃用（安全原因：原文件包含明文 SSH 密码）
# 安全升级：所有运维脚本必须使用 SSH 密钥认证，从项目根目录 .env 读取配置
# 请使用以下安全替代方案：
#   1. 运维监控面板：python ops-monitor/server.py
#   2. 检查服务器版本：python scripts/check_server_ver.py
#   3. 检查服务器日志：python scripts/check_logs.py
#   4. 同步服务器 version.json：python scripts/sync_server_version.py
#
# SSH 密钥生成：ssh-keygen -t ed25519 -f ~/.ssh/panda-nav-server -C "nav-log-deploy"

print("本脚本已弃用（包含明文 SSH 密码，违反安全红线）")
print("请使用运维监控面板或 scripts/ 目录下的安全脚本")
