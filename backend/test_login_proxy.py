# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json

SERVER_IP = get_server_ip()

print('连接服务器测试登录...')
ssh = connect_ssh()
# 测试通过前端API代理登录
print('\n=== 测试通过前端API代理登录 (端口3000) ===')
test_script = """
import urllib.request
import json

url = 'http://localhost:3000/api/auth/login'
data = json.dumps({'username': 'gogotb', 'password': '123456'}).encode()
headers = {'Content-Type': 'application/json'}

req = urllib.request.Request(url, data=data, headers=headers, method='POST')
try:
    resp = urllib.request.urlopen(req)
    print(f'状态: {resp.status}')
    body = json.loads(resp.read().decode())
    print(f'登录成功! 用户: {body.get("user", {}).get("username")}')
    print(f'Token前20位: {body.get("access_token", "")[:20]}...')
except urllib.error.HTTPError as e:
    print(f'HTTP错误: {e.code}')
    print(f'响应: {e.read().decode()[:300]}')
"""

stdin, stdout, stderr = ssh.exec_command(f'python3 -c "{test_script}"', timeout=15)
exit_status = stdout.channel.recv_exit_status()
output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')
print(output)
if error:
    print(f'错误: {error}')

# 查看最新后端日志
print('\n=== 后端最新日志 (最后10行) ===')
stdin, stdout, stderr = ssh.exec_command('tail -10 /root/.pm2/logs/nav-log-backend-out.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

ssh.close()
print('\n测试完成')
