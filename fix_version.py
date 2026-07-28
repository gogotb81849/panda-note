# 已弃用（请使用 scripts/sync_server_version.py）
# 原因：原文件包含明文 SSH 密码 + 硬编码版本号，违反安全红线
# 新脚本从服务器 package.json 读取真实版本号，自动同步 version.json

print("本脚本已弃用，请使用: python scripts/sync_server_version.py")
print("原文件因包含明文 SSH 密码已被覆盖。")
