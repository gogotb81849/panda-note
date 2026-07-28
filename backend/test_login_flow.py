# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SERVER_IP = get_server_ip()

print('连接服务器...')
ssh = connect_ssh()
# 测试1: 直接请求后端API
print('\n=== 测试1: 直接请求后端API (端口3002) ===')
stdin, stdout, stderr = ssh.exec_command(
    """curl -s -X POST http://localhost:3002/api/auth/login -H 'Content-Type: application/json' -d '{"username":"gogotb","password":"123456"}'""",
    timeout=10
)
exit_status = stdout.channel.recv_exit_status()
output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')
print(f'响应: {output[:300]}')

# 测试2: 请求前端代理 (端口3000)
print('\n=== 测试2: 通过前端请求 (端口3000) ===')
stdin, stdout, stderr = ssh.exec_command(
    """curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"gogotb","password":"123456"}'""",
    timeout=10
)
exit_status = stdout.channel.recv_exit_status()
output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')
print(f'HTTP状态: {exit_status}')
print(f'响应: {output[:500]}')

# 测试3: 检查前端环境变量
print('\n=== 测试3: 检查前端PM2环境变量 ===')
stdin, stdout, stderr = ssh.exec_command('pm2 env 2 | grep -E "NUXT|API|NODE_ENV"', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(f'环境变量: {output}')

# 测试4: 检查后端错误日志（最近20行）
print('\n=== 测试4: 后端错误日志 ===')
stdin, stdout, stderr = ssh.exec_command('tail -20 /root/.pm2/logs/nav-log-backend-error.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(f'错误日志: {output}')

ssh.close()
print('\n测试完成')
