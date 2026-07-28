# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import urllib.request
import json

SERVER_IP = get_server_ip()

print('连接服务器测试...')
ssh = connect_ssh()
# 创建测试脚本文件
test_script = '''import urllib.request
import json

# 测试1: 直接访问首页
print("=== 测试首页 ===")
req = urllib.request.Request('http://localhost:3000/')
try:
    resp = urllib.request.urlopen(req)
    print(f"状态: {resp.status}")
    body = resp.read().decode()
    if len(body) > 200:
        print(f"响应体前200字符: {body[:200]}")
    else:
        print(f"响应体: {body}")
except urllib.error.HTTPError as e:
    print(f"HTTP错误: {e.code}")
    body = e.read().decode()
    print(f"响应体前500字符: {body[:500]}")

# 测试2: 测试登录API
print("\\n=== 测试登录API ===")
url = 'http://localhost:3000/api/auth/login'
data = json.dumps({"username": "gogotb", "password": "123456"}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
try:
    resp = urllib.request.urlopen(req)
    print(f"状态: {resp.status}")
    body = json.loads(resp.read().decode())
    print(f"登录成功! 用户: {body.get('user', {}).get('username', 'unknown')}")
    token = body.get('access_token', '')
    if token:
        print(f"Token前20位: {token[:20]}...")
except urllib.error.HTTPError as e:
    print(f"HTTP错误: {e.code}")
    body = e.read().decode()
    print(f"响应体: {body[:300]}")
'''

# 写入临时文件并执行
stdin, stdout, stderr = ssh.exec_command('cat > /tmp/test_nav.py << \'ENDSCRIPT\'\n' + test_script + '\nENDSCRIPT\npython3 /tmp/test_nav.py', timeout=30)
output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')
print(output)
if error:
    print(f'脚本错误: {error}')

ssh.close()
print('\n测试完成')
