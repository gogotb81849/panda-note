import paramiko
import os
import sys
from dotenv import load_dotenv
from pathlib import Path

_ops_env = Path(__file__).resolve().parent / '.env'
if _ops_env.exists():
    load_dotenv(str(_ops_env), override=True)

ip = os.environ.get('SERVER_IP', '')
user = os.environ.get('SERVER_USER', '')
pwd = os.environ.get('SERVER_PASSWORD', '')
back_path = os.environ.get('SERVER_BACKEND_PATH', '/www/wwwroot/nav-log-system/backend')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ip, username=user, password=pwd, timeout=10)

print('=== 所有进程 ===')
stdin, stdout, stderr = ssh.exec_command('ps aux | grep -E "node|npm|npx|prisma|pm2" | grep -v grep')
out = stdout.read().decode('utf-8', errors='ignore').strip()
print(out if out else '(无相关进程)')

print()
print('=== PM2 日志最后20行 ===')
stdin2, stdout2, stderr2 = ssh.exec_command('pm2 logs nav-log-backend --lines 20 --nostream 2>&1')
print(stdout2.read().decode('utf-8', errors='ignore')[-1000:])

print()
print('=== 后端 version.json ===')
stdin3, stdout3, stderr3 = ssh.exec_command(f'cat {back_path}/version.json')
print(stdout3.read().decode('utf-8', errors='ignore'))

ssh.close()
