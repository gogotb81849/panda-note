# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SERVER_IP = get_server_ip()

print('测试页面是否正常...')
ssh = connect_ssh()
# 测试访问首页
print('\n=== 测试首页 ===')
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP状态: %{http_code}" http://106.14.57.62:3000/', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

# 测试访问登录页
print('\n=== 测试登录页 ===')
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP状态: %{http_code}" http://106.14.57.62:3000/login', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

# 查看前端错误日志
print('\n=== 前端错误日志（最后10行）===')
stdin, stdout, stderr = ssh.exec_command('tail -10 /root/.pm2/logs/nav-log-frontend-error.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output if output else '(无错误)')

# 查看前端输出日志
print('\n=== 前端输出日志（最后10行）===')
stdin, stdout, stderr = ssh.exec_command('tail -10 /root/.pm2/logs/nav-log-frontend-out.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output)

ssh.close()
print('\n测试完成')
