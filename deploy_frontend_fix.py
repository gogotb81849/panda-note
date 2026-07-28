# 已弃用（请使用 ops-monitor 面板的一键部署功能）
# 原因：原文件包含明文 SSH 密码，违反安全红线
# 新的部署流程：
#   1. 运维面板 → 一键部署
#   2. 或使用 scripts/deploy_frontend.py（SSH 密钥认证）

print("本脚本已弃用。请使用 ops-monitor 面板或 scripts/deploy_frontend.py")
print("原文件因包含明文 SSH 密码已被覆盖。")
