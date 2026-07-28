# 已弃用
# 原文件包含明文 SSH 密码 BTroot260318，已被移除以符合安全要求
# 请使用项目根目录的 scripts/check_server_ver.py 或运维监控面板 (ops-monitor)
#
# 新的安全方式：
#   1. 生成 SSH 密钥对：ssh-keygen -t ed25519 -f ~/.ssh/panda-nav-server
#   2. 部署公钥到服务器：ssh-copy-id -i ~/.ssh/panda-nav-server root@服务器IP
#   3. 在项目根目录 .env 中配置：
#        SERVER_IP=106.14.57.62
#        SERVER_USER=root
#        SSH_KEY_PATH=~/.ssh/panda-nav-server
#   4. 运行：python scripts/check_server_ver.py

print("本脚本已弃用（安全原因：包含明文 SSH 密码）")
print("请使用：python scripts/check_server_ver.py 或访问运维监控面板")
print("")
print("SSH 密钥生成命令:")
print("  ssh-keygen -t ed25519 -f ~/.ssh/panda-nav-server -C \"nav-log-deploy\"")
