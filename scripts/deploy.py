#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
熊猫笔记 - 部署脚本
按照文档规定的流程：备份 → 编译 → 上传 → 部署迁移 → 重启服务 → 验证
"""
import os
import sys
import time
from pathlib import Path

try:
    import paramiko
    from scp import SCPClient
except ImportError:
    print("❌ 缺少依赖，请执行: pip install paramiko scp")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / 'backend'
FRONTEND_DIR = PROJECT_ROOT / 'frontend'

SERVER_IP = '106.14.57.62'
SERVER_USER = 'root'
SERVER_PORT = 22
SSH_KEY_PATH = 'C:/Users/陈建华/.ssh/panda-nav-server'


def connect_ssh(timeout=30):
    key_path = os.path.expanduser(SSH_KEY_PATH)
    if not os.path.exists(key_path):
        raise RuntimeError(f"SSH 私钥文件不存在: {key_path}")
    
    private_key = None
    try:
        private_key = paramiko.Ed25519Key(filename=key_path)
    except paramiko.ssh_exception.SSHException:
        private_key = paramiko.RSAKey.from_private_key_file(key_path)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=SERVER_IP,
        port=SERVER_PORT,
        username=SERVER_USER,
        pkey=private_key,
        timeout=timeout,
        allow_agent=False,
        look_for_keys=False,
    )
    return ssh


def run_ssh_cmd(ssh, cmd, timeout=60):
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        return exit_code == 0, out.strip(), err.strip()
    except Exception as e:
        return False, '', str(e)


def upload_directory(ssh, local_dir, remote_dir):
    print(f"\n📤 上传 {local_dir} → {remote_dir}")
    try:
        # 先删除远程旧目录，避免 SCP 不覆盖已存在文件的问题
        print(f"🗑️ 删除远程旧目录 {remote_dir} ...")
        ok, out, err = run_ssh_cmd(ssh, f'rm -rf {remote_dir}', timeout=30)
        if not ok:
            print(f"⚠️ 删除目录警告: {err}")

        with SCPClient(ssh.get_transport()) as scp:
            scp.put(str(local_dir), remote_path=str(Path(remote_dir).parent), recursive=True)
        print(f"✅ 上传成功")
        return True
    except Exception as e:
        print(f"❌ 上传失败: {e}")
        return False


def deploy():
    print("=" * 60)
    print("熊猫笔记 - 部署到服务器")
    print("=" * 60)
    
    try:
        ssh = connect_ssh(timeout=30)
        print("✅ SSH 连接成功")
        
        backend_dist = BACKEND_DIR / 'dist'
        if not backend_dist.exists():
            print("❌ 后端构建产物不存在，请先执行 npm run build")
            ssh.close()
            return
        
        ok = upload_directory(ssh, backend_dist, '/www/wwwroot/nav-log-system/backend/dist')
        if not ok:
            ssh.close()
            return
        
        frontend_output = FRONTEND_DIR / '.output'
        if not frontend_output.exists():
            print("❌ 前端构建产物不存在，请先执行 npm run build")
            ssh.close()
            return
        
        ok = upload_directory(ssh, frontend_output, '/www/wwwroot/nav-log-system/frontend/.output')
        if not ok:
            ssh.close()
            return
        
        print("\n🔄 重新生成 Prisma Client...")
        ok, out, err = run_ssh_cmd(ssh, 'cd /www/wwwroot/nav-log-system/backend && npx prisma generate', timeout=120)
        if ok:
            print("✅ Prisma Client 重新生成成功")
        else:
            print(f"⚠️ Prisma generate 输出: {out}")
            print(f"⚠️ 警告: {err}")
        
        print("\n🔄 运行数据库迁移...")
        ok, out, err = run_ssh_cmd(ssh, 'cd /www/wwwroot/nav-log-system/backend && npx prisma migrate deploy', timeout=120)
        if ok:
            print("✅ 数据库迁移成功")
            print(f"📋 迁移输出: {out}")
        else:
            print(f"⚠️ 迁移输出: {out}")
            if 'No pending migrations' in err:
                print("✅ 没有待执行的迁移")
            else:
                print(f"❌ 迁移错误: {err}")
        
        print("\n🔄 重启后端服务...")
        ok, out, err = run_ssh_cmd(ssh, 'pm2 restart nav-log-backend', timeout=30)
        if ok:
            print("✅ 后端服务重启成功")
        else:
            print(f"⚠️ 重启输出: {out}")
            print(f"❌ 重启错误: {err}")

        print("\n🔄 重启前端服务...")
        ok, out, err = run_ssh_cmd(ssh, 'pm2 restart nav-log-frontend', timeout=30)
        if ok:
            print("✅ 前端服务重启成功")
        else:
            print(f"⚠️ 重启输出: {out}")
            print(f"❌ 重启错误: {err}")
        
        print("\n⏳ 等待服务启动...")
        time.sleep(10)
        
        print("\n🔍 健康检查...")
        ok, out, err = run_ssh_cmd(ssh, 'curl -s http://localhost:3002/api/health')
        if ok:
            print(f"✅ 健康检查通过!")
            print(f"📊 响应: {out}")
        else:
            print(f"❌ 健康检查失败")
            print(f"📋 输出: {out}")
            print(f"📋 错误: {err}")
            
            print("\n📝 检查后端日志...")
            ok, out, err = run_ssh_cmd(ssh, 'pm2 logs nav-log-backend --lines 30')
            print(f"日志输出:\n{out}")
            if err:
                print(f"错误:\n{err}")
        
        ssh.close()
        
        print("\n" + "=" * 60)
        print("🎉 部署完成!")
        print("=" * 60)
        print(f"前端地址: http://106.14.57.62:3000")
        print(f"后端地址: http://106.14.57.62:3002")
        print(f"宝塔面板: http://106.14.57.62:8888")
        
    except Exception as e:
        print(f"\n❌ 部署失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    deploy()
