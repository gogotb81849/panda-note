#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
熊猫笔记 - SSH 密钥认证客户端（统一安全工具）

⚠️ 安全原则：
   1. 所有 SSH 连接必须使用密钥认证，绝不使用密码认证
   2. 所有配置从项目根目录 .env 文件读取（已在 .gitignore 排除）
   3. 私钥文件本地保护，不进入版本库

使用方法：
    from scripts.ssh_client import connect_ssh, run_ssh_cmd, run_ssh_cmd_simple
    ssh = connect_ssh()
    ok, out, err = run_ssh_cmd(ssh, "pm2 status")
    ssh.close()
"""
import os
import sys
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("❌ 缺少 paramiko，请执行: pip install paramiko python-dotenv")
    sys.exit(1)

# ---- 路径定位 ----
def _find_project_root():
    """向上查找项目根目录（包含 .env.example 的目录）"""
    cur = Path(__file__).resolve().parent
    for _ in range(5):
        if (cur / '.env.example').exists() or (cur / 'README.md').exists():
            return cur
        cur = cur.parent
    return Path(__file__).resolve().parent.parent

PROJECT_ROOT = _find_project_root()
ENV_FILE = PROJECT_ROOT / '.env'

# ---- 加载 .env ----
def _load_env():
    """加载项目根目录的 .env 文件"""
    env_vars = {}
    if not ENV_FILE.exists():
        return env_vars
    try:
        from dotenv import load_dotenv
        load_dotenv(str(ENV_FILE))
    except ImportError:
        # 手动解析 KEY=VALUE
        try:
            with open(str(ENV_FILE), 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#') or '=' not in line:
                        continue
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    os.environ[key] = value
                    env_vars[key] = value
        except Exception:
            pass
    return env_vars


def _get_config():
    """从环境变量读取 SSH 配置"""
    _load_env()
    return {
        'ip': os.environ.get('SERVER_IP', ''),
        'user': os.environ.get('SERVER_USER', 'root'),
        'port': int(os.environ.get('SERVER_SSH_PORT', '22')),
        'key_path': os.environ.get('SSH_KEY_PATH', ''),
        'passphrase': os.environ.get('SSH_KEY_PASSPHRASE', '') or None,
    }


def _print_help():
    """打印配置帮助信息"""
    print("\n" + "=" * 60)
    print("❌ SSH 配置未完成")
    print("=" * 60)
    print(f"\n项目根目录: {PROJECT_ROOT}")
    print(f"请在根目录创建 .env 文件，包含以下配置:")
    print("""
  SERVER_IP=106.14.57.62
  SERVER_USER=root
  SERVER_SSH_PORT=22
  SSH_KEY_PATH=C:/Users/你的用户名/.ssh/panda-nav-server
  SSH_KEY_PASSPHRASE=   # 如密钥无保护密码则留空

生成密钥对命令:
  ssh-keygen -t ed25519 -f ~/.ssh/panda-nav-server -C "nav-log-deploy"

部署公钥到服务器:
  ssh-copy-id -i ~/.ssh/panda-nav-server root@106.14.57.62

测试连接:
  ssh -i ~/.ssh/panda-nav-server root@106.14.57.62
""")
    print("=" * 60)


def connect_ssh(timeout: int = 30):
    """
    建立 SSH 连接（使用密钥认证，安全方式）

    Returns:
        paramiko.SSHClient: 已连接的 SSH 客户端

    Raises:
        RuntimeError: 配置不完整或连接失败
    """
    cfg = _get_config()

    if not cfg['ip'] or not cfg['key_path']:
        _print_help()
        raise RuntimeError("SSH 配置不完整，请在 .env 中设置 SERVER_IP 和 SSH_KEY_PATH")

    # 展开 ~/ 用户目录
    key_path = os.path.expanduser(cfg['key_path'])
    if not os.path.exists(key_path):
        raise RuntimeError(f"SSH 私钥文件不存在: {key_path}\n"
                          f"请先生成密钥对: ssh-keygen -t ed25519 -f {key_path}")

    # 加载私钥（优先 ed25519，降级到 RSA）
    private_key = None
    try:
        private_key = paramiko.Ed25519Key(filename=key_path, password=cfg['passphrase'])
    except paramiko.ssh_exception.SSHException:
        try:
            private_key = paramiko.RSAKey.from_private_key_file(key_path, password=cfg['passphrase'])
        except Exception as e:
            raise RuntimeError(f"无法加载 SSH 私钥 {key_path}: {e}\n"
                              f"请检查密钥文件格式和 passphrase")

    # 建立连接（仅使用密钥认证）
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(
            hostname=cfg['ip'],
            port=cfg['port'],
            username=cfg['user'],
            pkey=private_key,
            timeout=timeout,
            banner_timeout=max(timeout, 15),
            auth_timeout=timeout,
            allow_agent=False,
            look_for_keys=False,
        )
    except paramiko.AuthenticationException:
        raise RuntimeError(
            f"SSH 密钥认证失败（服务器 {cfg['ip']}）。\n"
            f"  1. 检查服务器 ~/.ssh/authorized_keys 是否包含你的公钥\n"
            f"  2. 检查私钥权限 (Linux: chmod 600 {key_path})\n"
            f"  3. 确认 sshd_config 启用: PubkeyAuthentication yes"
        )
    return ssh


def run_ssh_cmd(ssh, cmd: str, timeout: int = 60):
    """
    在 SSH 会话中执行命令（返回完整结果）

    Returns:
        (ok: bool, output: str, error: str)
    """
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        return exit_code == 0, out.strip(), err.strip()
    except Exception as e:
        return False, '', str(e)


def run_ssh_cmd_simple(ssh, cmd: str, timeout: int = 60):
    """
    简化版执行命令 - 合并 stdout 和 stderr 返回

    Returns:
        str: 命令输出
    """
    ok, out, err = run_ssh_cmd(ssh, cmd, timeout)
    result = out
    if err:
        result = (result + "\n" + err) if result else err
    return result


def get_server_ip() -> str:
    """获取服务器 IP（从 .env 读取）"""
    cfg = _get_config()
    return cfg['ip'] or '106.14.57.62'


if __name__ == '__main__':
    print("=" * 60)
    print("SSH 密钥认证连接测试")
    print("=" * 60)
    try:
        ssh = connect_ssh(timeout=15)
        ok, out, _ = run_ssh_cmd(ssh, "hostname && whoami && uname -a")
        print(f"✅ 连接成功！服务器信息:\n{out}")
        ssh.close()
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        sys.exit(1)
