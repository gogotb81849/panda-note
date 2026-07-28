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
back_path = os.environ.get('SERVER_BACKEND_PATH', '/opt/nav-log/backend')
front_path = os.environ.get('SERVER_FRONTEND_PATH', '/opt/nav-log/frontend')

if not ip or not user:
    print('未找到SSH配置')
    print(f'SERVER_IP={ip}')
    print(f'SERVER_USER={user}')
    sys.exit(1)

print(f'连接服务器 {ip}...')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ip, username=user, password=pwd, timeout=10)

print()
print('=== npm / node 进程 ===')
stdin, stdout, stderr = ssh.exec_command('ps aux | grep -E "npm|node" | grep -v grep')
out = stdout.read().decode('utf-8', errors='ignore').strip()
print(out if out else '(无进程)')

print()
print('=== 后端目录 package.json ===')
stdin2, stdout2, stderr2 = ssh.exec_command(f'cd {back_path} && ls -la package.json 2>&1 && head -30 package.json 2>&1')
print(stdout2.read().decode('utf-8', errors='ignore'))

print()
print('=== node_modules 大小 ===')
stdin3, stdout3, stderr3 = ssh.exec_command(f'cd {back_path} && du -sh node_modules 2>&1')
print(stdout3.read().decode('utf-8', errors='ignore'))

print()
print('=== PM2 状态 ===')
stdin4, stdout4, stderr4 = ssh.exec_command('pm2 list 2>&1')
print(stdout4.read().decode('utf-8', errors='ignore'))

ssh.close()
