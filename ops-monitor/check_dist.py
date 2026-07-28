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
back_path = os.environ.get('SERVER_BACKEND_PATH', '/www/wwwroot/nav-log-system/backend')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ip, username=user, password=pwd, timeout=10)

print('=== dist/auth 目录 ===')
stdin, stdout, stderr = ssh.exec_command(f'ls -la {back_path}/dist/auth/')
print(stdout.read().decode('utf-8', errors='ignore'))

print()
print('=== dist/auth/guards 目录 ===')
stdin2, stdout2, stderr2 = ssh.exec_command(f'ls -la {back_path}/dist/auth/guards/ 2>&1')
print(stdout2.read().decode('utf-8', errors='ignore'))

print()
print('=== client-log.controller.js 引用了什么 ===')
stdin3, stdout3, stderr3 = ssh.exec_command(f'head -20 {back_path}/dist/client-log/client-log.controller.js')
print(stdout3.read().decode('utf-8', errors='ignore'))

print()
print('=== 本地后端 dist/auth 目录 ===')
local_back = Path(__file__).resolve().parent.parent / 'backend' / 'dist' / 'auth'
if local_back.exists():
    import subprocess
    result = subprocess.run(['dir', str(local_back)], capture_output=True, text=True, shell=True)
    print(result.stdout)
else:
    print(f'本地目录不存在: {local_back}')

ssh.close()
