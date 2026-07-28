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

print('=== 备份目录结构 ===')
stdin, stdout, stderr = ssh.exec_command('ls -la /tmp/backup_20260624_090320/')
print(stdout.read().decode('utf-8', errors='ignore'))

print()
print('=== 备份后端目录 ===')
stdin2, stdout2, stderr2 = ssh.exec_command('ls -la /tmp/backup_20260624_090320/backend/')
print(stdout2.read().decode('utf-8', errors='ignore'))

print()
print('=== 备份前端目录 ===')
stdin3, stdout3, stderr3 = ssh.exec_command('ls -la /tmp/backup_20260624_090320/frontend/ | head -20')
print(stdout3.read().decode('utf-8', errors='ignore'))

ssh.close()
