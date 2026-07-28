#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.ssh_client import connect_ssh, run_ssh_cmd, get_server_ip
"""
NestJS后端部署脚本
通过SSH/SFTP上传dist目录和version.json到远程服务器，并重启PM2服务
"""

import os
from pathlib import Path

# 配置信息
SERVER_HOST = get_server_ip()
SERVER_PORT = 22

REMOTE_DEPLOY_PATH = "/www/wwwroot/nav-log-system/backend"
PM2_PROCESS_NAME = "nav-log-backend"

# 本地路径
BACKEND_DIR = Path(r"d:\PYwork\熊猫笔记\nav-log-system\backend")
DIST_DIR = BACKEND_DIR / "dist"
VERSION_JSON = BACKEND_DIR / "version.json"

def upload_dir(sftp, local_dir, remote_dir):
    """递归上传目录"""
    local_dir = Path(local_dir)
    
    # 确保远程目录存在
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        print(f"  创建远程目录: {remote_dir}")
        sftp.mkdir(remote_dir)
    
    for item in local_dir.iterdir():
        if item.is_dir():
            upload_dir(sftp, item, f"{remote_dir}/{item.name}")
        else:
            remote_file = f"{remote_dir}/{item.name}"
            # 只上传修改过的文件
            try:
                remote_stat = sftp.stat(remote_file)
                local_stat = item.stat()
                if remote_stat.st_mtime < local_stat.st_mtime or remote_stat.st_size != local_stat.st_size:
                    print(f"  上传: {item.relative_to(BACKEND_DIR)}")
                    sftp.put(str(item), remote_file)
                else:
                    print(f"  跳过 (未修改): {item.relative_to(BACKEND_DIR)}")
            except FileNotFoundError:
                print(f"  上传: {item.relative_to(BACKEND_DIR)}")
                sftp.put(str(item), remote_file)

def main():
    print("=" * 60)
    print("NestJS后端部署脚本")
    print("=" * 60)
    
    # 验证本地文件
    if not DIST_DIR.exists():
        print("错误: dist目录不存在，请先运行 npm run build")
        sys.exit(1)
    
    if not VERSION_JSON.exists():
        print("错误: version.json不存在")
        sys.exit(1)
    
    print(f"\n本地dist目录: {DIST_DIR}")
    print(f"本地version.json: {VERSION_JSON}")
    print(f"远程部署路径: {REMOTE_DEPLOY_PATH}")
    print(f"远程服务器: {SERVER_USER}@{SERVER_HOST}")
    
    # 连接服务器
    print("\n正在连接服务器...")
    
    try:
        ssh = connect_ssh()
        print("服务器连接成功!")
        
        # 获取SFTP客户端
        sftp = ssh.open_sftp()
        
        # 上传dist目录
        print("\n开始上传dist目录...")
        upload_dir(sftp, DIST_DIR, f"{REMOTE_DEPLOY_PATH}/dist")
        
        # 上传version.json
        print("\n上传version.json...")
        sftp.put(str(VERSION_JSON), f"{REMOTE_DEPLOY_PATH}/version.json")
        print("  version.json上传完成")
        
        sftp.close()
        
        # 重启PM2服务
        print(f"\n正在重启PM2服务: {PM2_PROCESS_NAME}...")
        stdin, stdout, stderr = ssh.exec_command(
            f"cd {REMOTE_DEPLOY_PATH} && pm2 restart {PM2_PROCESS_NAME}"
        )
        
        # 读取输出
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if output:
            print(output)
        if error:
            print(f"警告: {error}")
        
        # 等待服务启动
        print("等待服务启动...")
        stdin, stdout, stderr = ssh.exec_command("sleep 3 && pm2 status")
        output = stdout.read().decode('utf-8')
        if output:
            print(output)
        
        ssh.close()
        
        print("\n" + "=" * 60)
        print("部署完成!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n部署失败: {e}")
        ssh.close()
        sys.exit(1)

if __name__ == "__main__":
    main()
