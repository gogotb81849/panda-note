# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SERVER_IP = get_server_ip()

print('检查当前500错误状态...')
ssh = connect_ssh()
# 1. 清空前端错误日志并测试
print('\n=== 清空前端错误日志并测试 ===')
stdin, stdout, stderr = ssh.exec_command('echo "" > /root/.pm2/logs/nav-log-frontend-error.log', timeout=5)

# 2. 测试访问首页
print('\n测试首页:')
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP状态: %{http_code}" http://106.14.57.62:3000/', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

# 3. 等2秒让日志写入
import time
time.sleep(2)

# 4. 查看新的错误日志
print('\n=== 新的前端错误日志 ===')
stdin, stdout, stderr = ssh.exec_command('tail -30 /root/.pm2/logs/nav-log-frontend-error.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output if output else '(无错误 - 修复成功!)')

# 5. 查看前端输出日志
print('\n=== 前端输出日志（最后30行）===')
stdin, stdout, stderr = ssh.exec_command('tail -30 /root/.pm2/logs/nav-log-frontend-out.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

ssh.close()
print('\n检查完成')
