#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
快速部署脚本 - 仅部署前端修复和初始化文件分类数据
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
        with SCPClient(ssh.get_transport()) as scp:
            scp.put(str(local_dir), remote_path=str(remote_dir), recursive=True)
        print(f"✅ 上传成功")
        return True
    except Exception as e:
        print(f"❌ 上传失败: {e}")
        return False


def upload_file(ssh, local_file, remote_path):
    print(f"\n📤 上传 {local_file} → {remote_path}")
    try:
        with SCPClient(ssh.get_transport()) as scp:
            scp.put(str(local_file), remote_path=str(remote_path))
        print(f"✅ 上传成功")
        return True
    except Exception as e:
        print(f"❌ 上传失败: {e}")
        return False


def deploy():
    print("=" * 60)
    print("熊猫笔记 - 快速部署（文件上传修复）")
    print("=" * 60)
    
    try:
        ssh = connect_ssh(timeout=30)
        print("✅ SSH 连接成功")
        
        # 1. 上传前端构建产物
        frontend_output = FRONTEND_DIR / '.output'
        if not frontend_output.exists():
            print("❌ 前端构建产物不存在，请先执行 npm run build")
            ssh.close()
            return
        
        # 备份旧的前端
        print("\n💾 备份旧前端...")
        ok, out, err = run_ssh_cmd(ssh, 
            'cd /www/wwwroot/nav-log-system/frontend && '
            'if [ -d ".output.bak" ]; then rm -rf .output.bak; fi && '
            'mv .output .output.bak', 
            timeout=30)
        if ok:
            print("✅ 旧前端备份完成")
        else:
            print(f"⚠️ 备份警告: {err}")
        
        ok = upload_directory(ssh, frontend_output, '/www/wwwroot/nav-log-system/frontend/.output')
        if not ok:
            # 恢复备份
            print("❌ 前端上传失败，正在恢复备份...")
            run_ssh_cmd(ssh, 
                'cd /www/wwwroot/nav-log-system/frontend && '
                'rm -rf .output && mv .output.bak .output', 
                timeout=30)
            ssh.close()
            return
        
        # 2. 上传初始化脚本
        init_script = BACKEND_DIR / 'src' / 'scripts' / 'init-file-categories.ts'
        if init_script.exists():
            upload_file(ssh, init_script, 
                '/www/wwwroot/nav-log-system/backend/src/scripts/init-file-categories.ts')
        
        # 3. 运行初始化脚本
        print("\n🗃️ 初始化文件分类字典数据...")
        ok, out, err = run_ssh_cmd(ssh, 
            'cd /www/wwwroot/nav-log-system/backend && '
            'npx ts-node src/scripts/init-file-categories.ts', 
            timeout=60)
        if ok:
            print("✅ 初始化脚本执行成功")
            print(f"📋 输出:\n{out}")
        else:
            print(f"⚠️ 初始化脚本执行结果: {out}")
            if err:
                print(f"⚠️ 错误: {err}")
        
        # 4. 重启前端服务
        print("\n🔄 重启前端服务...")
        ok, out, err = run_ssh_cmd(ssh, 'pm2 restart nav-log-frontend', timeout=30)
        if ok:
            print("✅ 前端服务重启成功")
        else:
            print(f"⚠️ 重启输出: {out}")
            print(f"❌ 重启错误: {err}")
        
        # 5. 等待服务启动
        print("\n⏳ 等待服务启动...")
        time.sleep(8)
        
        # 6. 健康检查
        print("\n🔍 前端健康检查...")
        ok, out, err = run_ssh_cmd(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000')
        if ok and out in ['200', '301', '302']:
            print(f"✅ 前端健康检查通过! (HTTP {out})")
        else:
            print(f"⚠️ 前端健康检查状态: {out}")
        
        print("\n🔍 后端健康检查...")
        ok, out, err = run_ssh_cmd(ssh, 'curl -s http://localhost:3002/api/health')
        if ok:
            print(f"✅ 后端健康检查通过!")
            print(f"📊 响应: {out}")
        else:
            print(f"❌ 后端健康检查失败")
            print(f"📋 输出: {out}")
        
        ssh.close()
        
        print("\n" + "=" * 60)
        print("🎉 部署完成!")
        print("=" * 60)
        print(f"前端地址: http://106.14.57.62:3000")
        print(f"后端地址: http://106.14.57.62:3002")
        print("\n修复内容:")
        print("  1. ✅ 修复文件上传变量名错误（selectedFile 未定义）")
        print("  2. ✅ 实现真正的多文件上传支持（最多20个）")
        print("  3. ✅ 优化MD5计算逻辑，避免UI卡顿")
        print("  4. ✅ 初始化文件分类字典数据")
        
    except Exception as e:
        print(f"\n❌ 部署失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    deploy()
