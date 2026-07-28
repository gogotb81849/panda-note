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

print('=== npm install 进程 ===')
stdin, stdout, stderr = ssh.exec_command('ps aux | grep -E "npm|node" | grep -v grep')
print(stdout.read().decode('utf-8', errors='ignore'))

print()
print('=== 后端目录内容 ===')
stdin2, stdout2, stderr2 = ssh.exec_command(f'cd {back_path} && ls -la')
print(stdout2.read().decode('utf-8', errors='ignore'))

print()
print('=== node_modules 大小 ===')
stdin3, stdout3, stderr3 = ssh.exec_command(f'cd {back_path} && du -sh node_modules 2>&1')
print(stdout3.read().decode('utf-8', errors='ignore'))

ssh.close()
