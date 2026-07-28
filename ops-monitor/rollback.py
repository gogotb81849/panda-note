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
back_path = os.environ.get('SERVER_BACKEND_DIR', '/www/wwwroot/nav-log-system/backend')
front_path = os.environ.get('SERVER_FRONTEND_DIR', '/www/wwwroot/nav-log-system/frontend')
backup_name = 'backup_20260624_090320'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ip, username=user, password=pwd, timeout=10)

def run_cmd(cmd, timeout=120):
    print(f'$ {cmd[:80]}...' if len(cmd) > 80 else f'$ {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    if out and len(out) < 500:
        print(out)
    elif out:
        print(out[-300:])
    return exit_code == 0

print('=== 回滚后端 dist 目录 ===')
run_cmd(f'rm -rf {back_path}/dist && cp -r /tmp/{backup_name}/backend-dist {back_path}/dist')

print()
print('=== 回滚后端 prisma 目录 ===')
run_cmd(f'rm -rf {back_path}/prisma && cp -r /tmp/{backup_name}/backend-prisma {back_path}/prisma')

print()
print('=== 回滚后端 package.json ===')
run_cmd(f'cp /tmp/{backup_name}/backend-package.json {back_path}/package.json')

print()
print('=== 回滚前端 .output 目录 ===')
run_cmd(f'rm -rf {front_path}/.output && cp -r /tmp/{backup_name}/frontend-output {front_path}/.output')

print()
print('=== 重启后端服务 ===')
run_cmd('pm2 restart nav-log-backend', timeout=30)

print()
print('=== 重启前端服务 ===')
run_cmd('pm2 restart nav-log-frontend', timeout=30)

print()
print('=== 等待服务启动 (15秒)... ===')
time.sleep(15)

print()
print('=== PM2 状态 ===')
run_cmd('pm2 list', timeout=10)

print()
print('=== 健康检查 ===')
backend_port = os.environ.get('BACKEND_PORT', '3002')
frontend_port = os.environ.get('FRONTEND_PORT', '3000')
run_cmd(f'curl -s -w "后端HTTP状态: %{{http_code}}\\n" -o /dev/null http://127.0.0.1:{backend_port}/api/health', timeout=10)
run_cmd(f'curl -s -w "前端HTTP状态: %{{http_code}}\\n" -o /dev/null http://127.0.0.1:{frontend_port}/', timeout=10)

print()
print('=== 回滚完成 ===')
ssh.close()
