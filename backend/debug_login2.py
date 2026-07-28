# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SERVER_IP = get_server_ip()

print('连接服务器检查用户数据...')
ssh = connect_ssh()
# 用 psql 查询用户列表
print('\n=== 数据库用户列表 ===')
stdin, stdout, stderr = ssh.exec_command("psql -U navlog -d navlog -c \"SELECT id, username, \\\"realName\\\", role, \\\"teamCode\\\" FROM \\\"User\\\" ORDER BY id\" 2>&1", timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')
print(output)
if error and 'password' not in error.lower():
    print('错误:', error)

# 查看后端日志中登录相关的请求
print('\n=== 后端日志（最近50行，筛选登录相关）===')
stdin, stdout, stderr = ssh.exec_command('tail -50 /root/.pm2/logs/nav-log-backend-out.log | grep -i -E "login|auth|Auth|登录|Unauthorized|password|Password|gogotb|chen|陈建华|254430"', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output if output else '(无登录相关日志)')

# 查看后端错误日志
print('\n=== 后端错误日志（最近20行）===')
stdin, stdout, stderr = ssh.exec_command('tail -20 /root/.pm2/logs/nav-log-backend-error.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output if output else '(无错误)')

# 测试登录 gogotb
print('\n=== 测试登录 gogotb/123456 ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:3002/api/auth/login -H "Content-Type: application/json" -d \'{"username":"gogotb","password":"123456"}\'', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output[:300])

ssh.close()
print('\n检查完成')
