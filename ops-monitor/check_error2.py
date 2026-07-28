import paramiko
import os
from dotenv import load_dotenv
from pathlib import Path

_ops_env = Path(__file__).resolve().parent / '.env'
if _ops_env.exists():
    load_dotenv(str(_ops_env), override=True)

ip = os.environ.get('SERVER_IP', '')
user = os.environ.get('SERVER_USER', '')
pwd = os.environ.get('SERVER_PASSWORD', '')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ip, username=user, password=pwd, timeout=10)

print('=== PM2 后端错误日志（最后100行）===')
stdin, stdout, stderr = ssh.exec_command('pm2 logs nav-log-backend --err --lines 100 --nostream 2>&1')
out = stdout.read().decode('utf-8', errors='ignore')
# 找到最新的错误
lines = out.split('\n')
for i, line in enumerate(lines):
    if 'Error:' in line or 'Cannot find module' in line or 'MODULE_NOT_FOUND' in line:
        print('\n'.join(lines[max(0,i-5):min(len(lines),i+10)]))
        print('---')

print()
print('=== 检查后端 dist 目录 ===')
back_path = os.environ.get('SERVER_BACKEND_PATH', '/www/wwwroot/nav-log-system/backend')
stdin2, stdout2, stderr2 = ssh.exec_command(f'ls -la {back_path}/dist/ | head -30')
print(stdout2.read().decode('utf-8', errors='ignore'))

print()
print('=== 检查 node_modules 中是否有 @prisma/client ===')
stdin3, stdout3, stderr3 = ssh.exec_command(f'ls -la {back_path}/node_modules/@prisma/ 2>&1')
print(stdout3.read().decode('utf-8', errors='ignore'))

ssh.close()
