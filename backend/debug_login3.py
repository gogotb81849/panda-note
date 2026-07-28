# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SERVER_IP = get_server_ip()

print('连接服务器检查用户数据和登录问题...')
ssh = connect_ssh()
# 1. 用 psql 查询用户列表
print('\n=== 数据库用户列表 ===')
stdin, stdout, stderr = ssh.exec_command("psql -U navlog -d navlog -c \"SELECT id, username, \\\"realName\\\", role, \\\"teamCode\\\" FROM \\\"User\\\" ORDER BY id\" 2>&1", timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

# 2. 检查后端 auth.service.ts 的登录逻辑是否有额外的日志
print('\n=== 查看后端 auth service 登录相关代码 ===')
stdin, stdout, stderr = ssh.exec_command('grep -n -A 5 "UnauthorizedException\|密码\|password" /www/wwwroot/nav-log-system/backend/dist/auth/auth.service.js | head -40', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

# 3. 测试直接调用后端API登录
print('\n=== 测试后端登录API ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:3002/api/auth/login -H "Content-Type: application/json" -d \'{"username":"gogotb","password":"123456"}\'', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output[:500])

# 4. 测试通过前端代理登录
print('\n=== 测试通过前端代理登录 ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"gogotb","password":"123456"}\'', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output[:500])

# 5. 查看最新的后端日志
print('\n=== 后端最新日志（最后30行）===')
stdin, stdout, stderr = ssh.exec_command('tail -30 /root/.pm2/logs/nav-log-backend-out.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

ssh.close()
print('\n检查完成')
