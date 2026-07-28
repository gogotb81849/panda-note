# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

SERVER_IP = get_server_ip()

SCRIPT_PATH = 'd:/PYwork/熊猫笔记/nav-log-system/backend/check_users.js'
REMOTE_PATH = '/www/wwwroot/nav-log-system/backend/check_users.js'

print('连接服务器...')
ssh = connect_ssh()
print('上传脚本...')
sftp = ssh.open_sftp()
sftp.put(SCRIPT_PATH, REMOTE_PATH)
sftp.close()

print('执行脚本...')
stdin, stdout, stderr = ssh.exec_command('cd /www/wwwroot/nav-log-system/backend && node check_users.js', timeout=30)
exit_status = stdout.channel.recv_exit_status()
output = stdout.read().decode('utf-8', errors='ignore')
error = stderr.read().decode('utf-8', errors='ignore')

print('输出:')
print(output)
if error:
    print('错误:')
    print(error)

ssh.close()
print('完成')
