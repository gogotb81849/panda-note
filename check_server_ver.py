# 已弃用（请使用 scripts/check_server_ver.py）
# 原因：原文件包含明文 SSH 密码，违反安全红线
# 新脚本使用 SSH 密钥认证，从项目根目录 .env 读取配置
#
# 使用方法：
#   cd /path/to/nav-log-system
#   python scripts/check_server_ver.py
#
# 如果需要本地测试，请先配置项目根目录的 .env：
#   cp .env.example .env
#   (填入真实的 SSH_KEY_PATH / SERVER_IP / SERVER_USER 等)

print("本脚本已弃用，请使用: python scripts/check_server_ver.py")
print("原文件因包含明文 SSH 密码已被覆盖。")
