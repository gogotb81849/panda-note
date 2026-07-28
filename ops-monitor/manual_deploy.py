import paramiko
import os
import time
from dotenv import load_dotenv
from pathlib import Path

_ops_env = Path(__file__).resolve().parent / '.env'
if _ops_env.exists():
    load_dotenv(str(_ops_env), override=True)

ip = os.environ.get('SERVER_IP', '')
user = os.environ.get('SERVER_USER', '')
pwd = os.environ.get('SERVER_PASSWORD', '')
back_path = os.environ.get('SERVER_BACKEND_PATH', '/www/wwwroot/nav-log-system/backend')
front_path = os.environ.get('SERVER_FRONTEND_PATH', '/www/wwwroot/nav-log-system/frontend')

print(f'连接服务器 {ip}...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ip, username=user, password=pwd, timeout=10)

def run_cmd(cmd, timeout=120):
    print(f'\n$ {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out[-1000:])
    if err:
        print('STDERR:', err[-500:])
    print(f'退出码: {exit_code}')
    return exit_code == 0, out

print('\n=== Step 1: Prisma Generate ===')
ok, out = run_cmd(f'cd {back_path} && npx prisma generate 2>&1', timeout=120)
if not ok:
    print('prisma generate 失败，但继续...')

print('\n=== Step 2: Prisma DB Push ===')
ok, out = run_cmd(f'cd {back_path} && npx prisma db push 2>&1', timeout=120)
if not ok:
    print('prisma db push 失败，但继续...')

print('\n=== Step 3: 重启 PM2 后端服务 ===')
ok, out = run_cmd('pm2 restart nav-log-backend 2>&1', timeout=30)

print('\n=== Step 4: 重启 PM2 前端服务 ===')
ok, out = run_cmd('pm2 restart nav-log-frontend 2>&1', timeout=30)

print('\n=== Step 5: 等待服务启动... ===')
time.sleep(10)

print('\n=== Step 6: PM2 状态 ===')
ok, out = run_cmd('pm2 list 2>&1', timeout=10)

print('\n=== Step 7: 健康检查 - 后端 ===')
backend_port = os.environ.get('BACKEND_PORT', '3000')
ok, out = run_cmd(f'curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:{backend_port}/api/health 2>&1', timeout=10)

print('\n=== Step 8: 健康检查 - 前端 ===')
frontend_port = os.environ.get('FRONTEND_PORT', '3001')
ok, out = run_cmd(f'curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:{frontend_port}/ 2>&1', timeout=10)

print('\n=== 完成 ===')
ssh.close()
