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

print('=== PM2 后端错误日志（最后50行）===')
stdin, stdout, stderr = ssh.exec_command('pm2 logs nav-log-backend --err --lines 50 --nostream 2>&1')
print(stdout.read().decode('utf-8', errors='ignore')[-2000:])

print()
print('=== Prisma Schema 相关部分 ===')
back_path = os.environ.get('SERVER_BACKEND_PATH', '/www/wwwroot/nav-log-system/backend')
stdin2, stdout2, stderr2 = ssh.exec_command(f'cd {back_path} && grep -n -A 5 -B 5 "MagazineVersion" prisma/schema.prisma | head -80')
print(stdout2.read().decode('utf-8', errors='ignore'))

ssh.close()
