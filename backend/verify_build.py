# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ssh.connect(get_server_ip(), username='root', , timeout=30)

# 检查前端输出文件中是否有 /api 前缀
print('=== 检查前端构建产物中的 apiBase ===')
stdin, stdout, stderr = ssh.exec_command('grep -o "apiBase.*" /www/wwwroot/nav-log-system/frontend/.output/server/index.mjs | head -5', timeout=10)
print(stdout.read().decode('utf-8', errors='ignore'))

# 查看前端进程启动时间
print('\n=== PM2 状态 ===')
stdin, stdout, stderr = ssh.exec_command('pm2 status', timeout=10)
print(stdout.read().decode('utf-8', errors='ignore'))

# 清空日志后测试 API
print('\n=== 清空前端错误日志并测试 ===')
stdin, stdout, stderr = ssh.exec_command('echo "" > /root/.pm2/logs/nav-log-frontend-error.log', timeout=5)

# 访问首页触发 SSR
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null http://106.14.57.62:3000/', timeout=10)
print('访问首页完成')

import time
time.sleep(2)

# 检查新的错误日志
print('\n=== 新的前端错误日志 ===')
stdin, stdout, stderr = ssh.exec_command('cat /root/.pm2/logs/nav-log-frontend-error.log', timeout=10)
output = stdout.read().decode('utf-8', errors='ignore')
print(output if output else '(无错误)')

# 检查前端输出日志
print('\n=== 前端输出日志 ===')
stdin, stdout, stderr = ssh.exec_command('tail -30 /root/.pm2/logs/nav-log-frontend-out.log', timeout=10)
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
