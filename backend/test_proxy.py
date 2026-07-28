# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json

SERVER_IP = get_server_ip()

print('连接服务器测试代理...')
ssh = connect_ssh()
# 测试1: POST请求通过前端端口3000
print('\n=== 测试1: POST /api/auth/login 通过端口3000 ===')
test_script = '''import urllib.request, json
url = 'http://localhost:3000/api/auth/login'
data = json.dumps({"username": "gogotb", "password": "123456"}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
try:
    resp = urllib.request.urlopen(req)
    print(f"状态: {resp.status}")
    print(f"响应头: {dict(resp.headers)}")
    body = resp.read().decode()
    print(f"响应体: {body[:200]}")
except Exception as e:
    print(f"异常: {type(e).__name__}: {e}")
    if hasattr(e, "read"):
        print(f"错误响应: {e.read().decode()[:300]}")'''

stdin, stdout, stderr = ssh.exec_command(f'python3 -c \'{test_script}\'', timeout=15)
exit_status = stdout.channel.recv_exit_status()
output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')
print(output)
if error:
    print(f'脚本错误: {error}')

# 测试2: 检查后端是否收到请求
print('\n=== 测试2: 后端最新日志（看是否有登录请求）===')
stdin, stdout, stderr = ssh.exec_command('tail -15 /root/.pm2/logs/nav-log-backend-out.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

ssh.close()
