#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
熊猫笔记 - Web运维监控面板 后端服务 v2
FastAPI + WebSocket 实时监控
"""
import asyncio
import json
import os
import sys
import time
import socket
import sqlite3
import subprocess
import threading
import urllib.request
import urllib.error
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

import psutil
import paramiko
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ===== .env 加载（复用熊猫笔记主项目的凭证管理方式）
try:
    from dotenv import load_dotenv
    # 先加载运维面板自身的 .env，其次加载熊猫笔记后端的 .env
    _ops_env = Path(__file__).resolve().parent / '.env'
    if _ops_env.exists():
        load_dotenv(str(_ops_env), override=True)
        print(f"[配置] 已加载运维面板 .env: {_ops_env}")
    else:
        # 退而求其次，使用熊猫笔记后端 .env（确保版本号/数据库一致）
        _backend_env = Path(__file__).resolve().parent.parent / 'backend' / '.env'
        if _backend_env.exists():
            load_dotenv(str(_backend_env), override=True)
            print(f"[配置] 已加载后端 .env: {_backend_env}")
        else:
            print("[配置] 警告：未找到 .env 文件，将使用默认值")
except ImportError:
    print("[配置] 警告：未安装 python-dotenv，使用默认值")

# ==================== 配置（全部从环境变量读取，绝不再硬编码凭证） ====================
PROJECT_DIR = Path(os.environ.get('PROJECT_DIR', Path(__file__).resolve().parent.parent))
BACKEND_DIR = PROJECT_DIR / os.environ.get('BACKEND_SUBDIR', 'backend')
FRONTEND_DIR = PROJECT_DIR / os.environ.get('FRONTEND_SUBDIR', 'frontend')
OPS_DIR = Path(__file__).resolve().parent
STATIC_DIR = OPS_DIR / 'static'
DB_FILE = OPS_DIR / 'ops_monitor.db'
AUDIT_LOG_FILE = OPS_DIR / 'audit_log.jsonl'

_backend_env = BACKEND_DIR / '.env'
if _backend_env.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(str(_backend_env), override=False)
    except Exception:
        pass

BACKEND_PORT = int(os.environ.get('BACKEND_PORT', '3002'))
FRONTEND_PORT = int(os.environ.get('FRONTEND_PORT', '3000'))
MONITOR_PORT = int(os.environ.get('MONITOR_PORT', '8899'))
BACKEND_HEALTH_URL = os.environ.get('BACKEND_HEALTH_URL', f"http://127.0.0.1:{BACKEND_PORT}/api/version")
FRONTEND_TEST_URL = os.environ.get('FRONTEND_TEST_URL', f"http://127.0.0.1:{FRONTEND_PORT}/")

# 生产服务器 SSH 凭据（从 .env 读取，默认空值表示未配置）
# ⚠️ 注意：严禁在此文件或任何代码中硬编码密码，必须使用 SSH 密钥认证
SERVER_IP = os.environ.get('SERVER_IP', '')
SERVER_USER = os.environ.get('SERVER_USER', '')
SSH_KEY_PATH = os.environ.get('SSH_KEY_PATH', '')
SERVER_SSH_PORT = int(os.environ.get('SERVER_SSH_PORT', '22'))
SERVER_BACKEND_DIR = os.environ.get('SERVER_BACKEND_DIR', '/www/wwwroot/nav-log-system/backend')
SERVER_FRONTEND_DIR = os.environ.get('SERVER_FRONTEND_DIR', '/www/wwwroot/nav-log-system/frontend')

# 数据库连接（用于服务器 PostgreSQL，用于运维检查）
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# ==================== 数据库 ====================
def init_db():
    conn = sqlite3.connect(str(DB_FILE))
    conn.execute('''CREATE TABLE IF NOT EXISTS deploy_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT, target TEXT,
        status TEXT, steps TEXT, started_at TEXT, finished_at TEXT, log TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS backup_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT, target TEXT,
        backup_path TEXT, size_bytes INTEGER, created_at TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS alert_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, webhook_url TEXT,
        enabled INTEGER DEFAULT 1, created_at TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS heartbeat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT, service_name TEXT, status TEXT,
        response_time REAL, checked_at TEXT)''')
    conn.commit()
    conn.close()

init_db()

# ==================== 工具函数 ====================

def get_canonical_version():
    """从后端 version.json 获取权威版本号（单一真相源）"""
    try:
        ver_path = BACKEND_DIR / 'version.json'
        if ver_path.exists():
            with open(str(ver_path), 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get('version', '未知')
    except Exception:
        pass
    # fallback: package.json
    try:
        pkg_path = BACKEND_DIR / 'package.json'
        if pkg_path.exists():
            with open(str(pkg_path), 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get('version', '未知')
    except Exception:
        pass
    return '未知'

def get_frontend_version():
    """前端版本号"""
    try:
        pkg_path = FRONTEND_DIR / 'package.json'
        if pkg_path.exists():
            with open(str(pkg_path), 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get('version', '未知')
    except Exception:
        pass
    return '未知'

def check_port(port, host='127.0.0.1', timeout=2):
    """检测端口是否被监听"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False

def check_http(url, timeout=3):
    """检测HTTP服务是否响应"""
    try:
        req = urllib.request.Request(url, method='GET')
        start = time.time()
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = (time.time() - start) * 1000
            return {"ok": resp.status == 200, "status_code": resp.status,
                    "response_time_ms": round(elapsed, 1)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:100]}

def get_local_db_status():
    """本地数据库状态（从熊猫笔记 DATABASE_URL 中读取，不再默认查找 SQLite）"""
    try:
        # 优先从环境变量 DATABASE_URL 判断数据库类型（与熊猫笔记保持一致）
        db_url = os.environ.get('DATABASE_URL', '')
        if not db_url:
            # 无配置时，也尝试查找本地 SQLite 文件作为备选
            found_dbs = []
            for pattern in [BACKEND_DIR / 'prisma' / 'dev.db', BACKEND_DIR / 'prisma' / 'prod.db']:
                if pattern.exists():
                    found_dbs.append({"path": str(pattern.relative_to(PROJECT_DIR)),
                                     "size_mb": round(pattern.stat().st_size / 1024 / 1024, 2)})
            for f in BACKEND_DIR.rglob('*.db'):
                rel = str(f.relative_to(PROJECT_DIR))
                if not any(rel == d['path'] for d in found_dbs):
                    found_dbs.append({"path": rel, "size_mb": round(f.stat().st_size / 1024 / 1024, 2)})
            return {
                "type": "SQLite",
                "ok": len(found_dbs) > 0,
                "files": found_dbs[:5],
                "total_size_mb": round(sum(d['size_mb'] for d in found_dbs), 2)
            }

        # 从 DATABASE_URL 中解析信息
        db_type = "PostgreSQL" if db_url.startswith("postgres") else \
                  "MySQL" if db_url.startswith("mysql") else \
                  "SQLite" if db_url.startswith("file") or '.db' in db_url else "Unknown"
        # 提取 host 与 port 做连接测试
        db_host, db_port = '', ''
        try:
            from urllib.parse import urlparse
            parsed = urlparse(db_url)
            db_host = parsed.hostname or ''
            db_port = str(parsed.port or 5432)
        except Exception:
            db_host, db_port = '', ''

        return {
            "type": db_type,
            "ok": True,
            "files": [],
            "total_size_mb": 0,
            "host": db_host,
            "port": db_port,
            "connection_string": f"{db_type}://{db_host}:{db_port}"
        }
    except Exception as e:
        return {"type": "SQLite", "ok": False, "error": str(e)[:100],
                "files": [], "total_size_mb": 0}

def get_ssh_client():
    """
    建立 SSH 连接（密钥认证，安全第一）
    从根目录 .env 读取 SSH 配置，绝不使用密码认证
    """
    # 优先使用根目录 .env，如果没有则回退到 ops-monitor/.env
    root_env = Path(__file__).resolve().parent.parent / '.env'
    ops_env = Path(__file__).resolve().parent / '.env'
    env_file = root_env if root_env.exists() else ops_env

    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(str(env_file), override=True)
        except ImportError:
            # 手动解析简单的 KEY=VALUE 格式
            try:
                for line in open(str(env_file), encoding='utf-8'):
                    line = line.strip()
                    if not line or line.startswith('#') or '=' not in line:
                        continue
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")
            except Exception:
                pass

    ip = os.environ.get('SERVER_IP', SERVER_IP)
    port = int(os.environ.get('SERVER_SSH_PORT', str(SERVER_SSH_PORT)))
    user = os.environ.get('SERVER_USER', SERVER_USER)
    key_path = os.environ.get('SSH_KEY_PATH', '')

    if not ip or not user:
        raise RuntimeError(
            "SSH 凭据未配置完整。请在项目根目录的 .env 中设置：\n"
            "  SERVER_IP=你的服务器IP\n"
            "  SERVER_USER=root\n"
            "  SERVER_SSH_PORT=22\n"
            "  SSH_KEY_PATH=~/.ssh/panda-nav-server  （推荐，密钥认证）\n"
            "  或 SERVER_PASSWORD=密码  （备选，密码认证）\n"
            "\n生成密钥命令: ssh-keygen -t ed25519 -f ~/.ssh/panda-nav-server\n"
            "部署公钥到服务器: ssh-copy-id -i ~/.ssh/panda-nav-server root@服务器IP"
        )

    # 建立连接（优先密钥认证，fallback 密码认证）
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # 尝试密钥认证
    if key_path:
        key_path = os.path.expanduser(key_path)
        if os.path.exists(key_path):
            passphrase = os.environ.get('SSH_KEY_PASSPHRASE', '') or None
            private_key = None
            try:
                private_key = paramiko.Ed25519Key(filename=key_path, password=passphrase)
            except paramiko.ssh_exception.SSHException:
                try:
                    private_key = paramiko.RSAKey.from_private_key_file(key_path, password=passphrase)
                except Exception:
                    private_key = None
            
            if private_key:
                try:
                    ssh.connect(
                        hostname=ip,
                        port=port,
                        username=user,
                        pkey=private_key,
                        timeout=10,
                        banner_timeout=15,
                        auth_timeout=10,
                        allow_agent=False,
                        look_for_keys=False,
                    )
                    return ssh
                except paramiko.AuthenticationException:
                    # 密钥认证失败，尝试密码认证
                    pass
                except Exception as e:
                    raise RuntimeError(f"SSH 连接失败 ({key_path}): {e}")
    
    # 尝试密码认证
    password = os.environ.get('SERVER_PASSWORD', '')
    if password:
        try:
            ssh.connect(
                hostname=ip,
                port=port,
                username=user,
                password=password,
                timeout=10,
                banner_timeout=15,
                auth_timeout=10,
                allow_agent=False,
                look_for_keys=False,
            )
            return ssh
        except paramiko.AuthenticationException:
            raise RuntimeError(
                f"SSH 密码认证失败。请检查：\n"
                f"  1) 密码是否正确\n"
                f"  2) 服务器 {ip} 的 sshd_config 是否启用: PasswordAuthentication yes"
            )
        except Exception as e:
            raise RuntimeError(f"SSH 密码连接失败: {e}")
    
    # 既没有密钥也没有密码
    raise RuntimeError(
        f"SSH 认证方式未配置。请设置 SSH_KEY_PATH 或 SERVER_PASSWORD\n"
        f"  SSH_KEY_PATH={key_path} (文件不存在)\n"
        f"  SERVER_PASSWORD={'已设置' if password else '未设置'}"
    )

def run_ssh_cmd(ssh, cmd, timeout=30):
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8', errors='ignore')
        error = stderr.read().decode('utf-8', errors='ignore')
        return {"ok": exit_code == 0, "exit_code": exit_code,
                "output": output.strip(), "error": error.strip()}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def write_audit(action, target, status, detail=''):
    entry = {"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
             "action": action, "target": target, "status": status, "detail": detail}
    with open(AUDIT_LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

def save_heartbeat(service_name, status, response_time=0):
    try:
        conn = sqlite3.connect(str(DB_FILE))
        conn.execute(
            "INSERT INTO heartbeat_history (service_name, status, response_time, checked_at) VALUES (?, ?, ?, ?)",
            (service_name, status, response_time,
             datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        conn.close()
    except Exception:
        pass

# ==================== 服务控制 - Windows 增强版 ====================
_service_processes = {}  # 维护已启动的进程引用

def _write_batch_file(target_name, working_dir, command_list):
    """
    生成 .bat 启动脚本
    返回脚本绝对路径
    """
    bat_path = Path(os.environ.get('TEMP', r'C:\Windows\Temp')) / f'start_{target_name}.bat'
    try:
        with open(str(bat_path), 'w', encoding='utf-8') as f:
            f.write('@echo off\n')
            f.write(f'title Panda-{target_name}\n')
            f.write(f'cd /d "{working_dir}"\n')
            f.write(f'echo Starting {target_name}...\n')
            f.write(f'echo Command: {" ".join(command_list)}\n')
            f.write('echo Timestamp: %DATE% %TIME%\n')
            f.write('echo.\n')
            f.write(f'{" ".join(command_list)}\n')
            f.write('echo.\n')
            f.write(f'echo [{target_name}] Process exited with code %%ERRORLEVEL%%\n')
            f.write('pause\n')
        return str(bat_path)
    except Exception as e:
        return None


def start_service_by_port(target_name, port, working_dir, command):
    """
    可靠的 Windows 服务启动 v2
    """
    logs = []
    ts = datetime.now().strftime('%H:%M:%S')
    logs.append(f"[{ts}] 准备启动 {target_name}")
    logs.append(f"  工作目录: {working_dir}")
    logs.append(f"  启动命令: {' '.join(command)}")
    logs.append(f"  期望端口: {port}")

    # 1. 检查端口是否已占用
    if check_port(port):
        logs.append(f"  端口 {port} 已被占用，检查是否是目标服务...")
        http_check = check_http(f"http://127.0.0.1:{port}" if port == FRONTEND_PORT else BACKEND_HEALTH_URL)
        if http_check.get('ok'):
            logs.append(f"  ✓ {target_name}已在运行 ({http_check.get('response_time_ms',0):.0f}ms)")
            return {
                "ok": True, "status": "running",
                "message": f"{target_name}已在运行",
                "logs": logs
            }
        else:
            # 端口被非目标进程占用，先杀掉
            logs.append(f"  端口被其他进程占用，释放中...")
            try:
                result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True,
                                      creationflags=subprocess.CREATE_NO_WINDOW)
                import re
                for line in result.stdout.split('\n'):
                    m = re.search(f":{port}\\s+.*\\s+(\\d+)\\s*$", line)
                    if m:
                        pid = m.group(1)
                        if pid.isdigit() and int(pid) > 0:
                            subprocess.run(['taskkill', '/F', '/PID', pid],
                                         capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
                            logs.append(f"  已终止占用进程 PID={pid}")
                            time.sleep(1.5)
                            break
            except Exception:
                pass

    # 2. 检查工作目录和必要文件
    if not Path(working_dir).exists():
        logs.append(f"  ✗ 工作目录不存在: {working_dir}")
        return {"ok": False, "status": "error",
                "message": f"工作目录不存在: {working_dir}", "logs": logs}

    # 3. 生成 .bat 脚本并执行
    bat_path = _write_batch_file(target_name.replace('/', '_'),
                                str(working_dir), command)
    if not bat_path:
        logs.append(f"  ✗ 无法生成启动脚本")
        return {"ok": False, "status": "error",
                "message": "无法生成启动脚本", "logs": logs}
    logs.append(f"  启动脚本: {bat_path}")

    try:
        # 使用 cmd.exe /c start 打开新窗口
        start_cmd = ['cmd.exe', '/c', 'start', '/D', str(working_dir),
                    f'"Panda-{target_name}"', bat_path]
        logs.append(f"  执行: {' '.join(start_cmd)}")

        proc = subprocess.Popen(
            start_cmd,
            creationflags=subprocess.CREATE_NEW_CONSOLE | subprocess.CREATE_NEW_PROCESS_GROUP,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        # 等待 start 命令自己返回
        try:
            proc.wait(timeout=5)
        except Exception:
            pass

        _service_processes[target_name] = True
        logs.append(f"  已发送启动请求，等待端口 {port} 就绪...")

        # 4. 轮询检查（最多 35 秒）
        found_running = False
        last_msg = "等待中..."
        for i in range(35):
            time.sleep(1)
            if check_port(port):
                # 对后端做健康检查
                if port == BACKEND_PORT:
                    hc = check_http(BACKEND_HEALTH_URL, timeout=3)
                    if hc.get('ok'):
                        logs.append(f"  ✓ {i+1}s: 后端健康检查通过 ({hc.get('response_time_ms')}ms)")
                        found_running = True
                        break
                elif port == FRONTEND_PORT:
                    # 前端只需要端口监听
                    hc = check_http(FRONTEND_TEST_URL, timeout=3)
                    logs.append(f"  ✓ {i+1}s: 前端端口已就绪 (HTTP {hc.get('status_code','-')})")
                    found_running = True
                    break
                else:
                    logs.append(f"  ✓ {i+1}s: 端口已就绪")
                    found_running = True
                    break
            last_msg = f"{i+1}s 等待端口 {port}..."

        if found_running:
            logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ {target_name} 启动成功！")
            write_audit('start', target_name, 'success',
                       f"port={port}, 启动用时约 {35 - (35 - logs.count('等待中...'))}s")
            return {
                "ok": True, "status": "running",
                "message": f"{target_name}启动成功！新窗口应已打开",
                "logs": logs
            }
        else:
            logs.append(f"  ⚠ 启动完成但端口 {port} 未在 35 秒内就绪")
            logs.append(f"    请手动检查新窗口是否有报错信息")
            write_audit('start', target_name, 'timeout',
                       f"port={port} 未在 35 秒内就绪")
            # 仍然返回 ok=True（用户可能需要等待更长时间）
            return {
                "ok": True, "status": "starting",
                "message": f"{target_name}已启动（端口 {port} 可能仍在预热，请稍后刷新）",
                "logs": logs
            }

    except Exception as e:
        logs.append(f"  ✗ 启动异常: {type(e).__name__}: {e}")
        write_audit('start', target_name, 'failed', str(e))
        return {"ok": False, "status": "error",
                "message": f"{target_name}启动失败：{e}", "logs": logs}


def stop_service_by_port(target_name, port):
    """停止指定端口监听的服务 - 增强版"""
    logs = []
    logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] 停止 {target_name} (端口 {port})")

    try:
        if not check_port(port):
            logs.append(f"  ✓ 端口 {port} 当前未被占用")
            return {"ok": True, "status": "stopped",
                    "message": f"{target_name}当前未运行", "logs": logs}

        # 查找所有监听该端口的进程
        try:
            result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True,
                                  creationflags=subprocess.CREATE_NO_WINDOW)
        except Exception:
            result = type('obj', (object,), {'stdout': ''})()

        killed_pids = []
        import re
        for line in result.stdout.split('\n'):
            m = re.search(f":{port}\\s+.*\\s+(\\d+)\\s*$", line)
            if m:
                pid = m.group(1)
                if pid.isdigit() and int(pid) > 0 and int(pid) < 999999:
                    try:
                        subprocess.run(['taskkill', '/F', '/PID', pid],
                                     capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW,
                                     timeout=5)
                        killed_pids.append(pid)
                        logs.append(f"  已终止进程 PID={pid}")
                    except Exception:
                        pass

        # 也杀掉 node/npm 相关进程（防止子进程未被清理）
        try:
            subprocess.run(['taskkill', '/F', '/IM', 'node.exe', '/FI', f'CPUTIME gt 00:00:01'],
                         capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW,
                         timeout=5)
            time.sleep(1)
        except Exception:
            pass

        # 验证端口释放
        for i in range(5):
            time.sleep(1)
            if not check_port(port):
                logs.append(f"  ✓ 端口 {port} 已成功释放（用时 {i+1}s）")
                write_audit('stop', target_name, 'success',
                           f"已终止 {len(killed_pids)} 个进程")
                return {"ok": True, "status": "stopped",
                        "message": f"{target_name}已停止（终止 {len(killed_pids)} 个进程）",
                        "logs": logs}

        logs.append(f"  ⚠ 进程已终止但端口 {port} 仍在监听")
        return {"ok": True, "status": "stopped",
                "message": f"{target_name}已停止（端口可能还在释放中）", "logs": logs}

    except Exception as e:
        logs.append(f"  ✗ 停止异常: {e}")
        write_audit('stop', target_name, 'failed', str(e))
        return {"ok": False, "status": "error",
                "message": f"停止失败：{e}", "logs": logs}


# ==================== 版本同步工具 ====================
def bump_version(new_version=None):
    """
    同步版本号：
    1. 写入 backend/version.json
    2. 同步到 backend/package.json
    3. 同步到 frontend/package.json
    """
    try:
        current = get_canonical_version()
        if not new_version:
            # 自增 patch 版本
            parts = current.split('.')
            if len(parts) >= 3 and all(p.isdigit() for p in parts):
                parts[2] = str(int(parts[2]) + 1)
                new_version = '.'.join(parts)
            else:
                new_version = datetime.now().strftime('%Y%m%d.%H%M')

        # 写入 version.json（权威版本）
        ver_path = BACKEND_DIR / 'version.json'
        with open(str(ver_path), 'w', encoding='utf-8') as f:
            json.dump({
                "version": new_version,
                "previous_version": current,
                "bumped_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "bumped_by": "ops-monitor"
            }, f, ensure_ascii=False, indent=2)

        # 同步到 backend/package.json
        try:
            be_pkg = BACKEND_DIR / 'package.json'
            if be_pkg.exists():
                with open(str(be_pkg), 'r', encoding='utf-8') as f:
                    data = json.load(f)
                data['version'] = new_version
                with open(str(be_pkg), 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        # 同步到 frontend/package.json
        try:
            fe_pkg = FRONTEND_DIR / 'package.json'
            if fe_pkg.exists():
                with open(str(fe_pkg), 'r', encoding='utf-8') as f:
                    data = json.load(f)
                data['version'] = new_version
                with open(str(fe_pkg), 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        write_audit('bump_version', '前后端同步', 'success',
                   f"{current} -> {new_version}")
        return {"ok": True, "version": new_version, "previous": current}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ==================== FastAPI 应用 ====================
app = FastAPI(title="熊猫笔记运维监控", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== API - 基础信息 ====================
@app.get("/health")
async def health_root():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/info")
async def get_info():
    canonical_ver = get_canonical_version()
    frontend_ver = get_frontend_version()
    return {
        "canonical_version": canonical_ver,
        "frontend_version": frontend_ver,
        "backend_version": canonical_ver,
        "project_root": str(PROJECT_DIR),
        "server_ip": SERVER_IP,
        "ports": {"frontend": FRONTEND_PORT, "backend": BACKEND_PORT,
                  "monitor": MONITOR_PORT}
    }

# ==================== API - 资源监控 ====================
@app.get("/api/resources")
async def get_resources():
    cpu = psutil.cpu_percent(interval=0.3)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(str(PROJECT_DIR))
    net = psutil.net_io_counters()
    boot = psutil.boot_time()
    uptime = int(time.time() - boot)

    return {
        "cpu": {"percent": round(cpu, 1),
                "cores": psutil.cpu_count(logical=False),
                "threads": psutil.cpu_count(logical=True)},
        "memory": {"total_gb": round(mem.total / 1024**3, 1),
                   "used_gb": round(mem.used / 1024**3, 1),
                   "available_gb": round(mem.available / 1024**3, 1),
                   "percent": round(mem.percent, 1)},
        "disk": {"total_gb": round(disk.total / 1024**3, 1),
                 "used_gb": round(disk.used / 1024**3, 1),
                 "free_gb": round(disk.free / 1024**3, 1),
                 "percent": round(disk.percent, 1)},
        "network": {"sent_mb": round(net.bytes_sent / 1024**2, 1),
                    "recv_mb": round(net.bytes_recv / 1024**2, 1)},
        "uptime_seconds": uptime,
        "uptime_display": str(timedelta(seconds=uptime))
    }

@app.get("/api/resources/remote")
async def get_remote_resources():
    """服务器资源监控"""
    try:
        ssh = get_ssh_client()
        # 获取CPU / 内存 / 磁盘
        cpu_cmd = "top -bn1 | grep 'Cpu(s)' | head -1 | awk '{print $2+$4}'"
        mem_cmd = "free -m | grep Mem | awk '{print $3, $2, $3/$2*100}'"
        disk_cmd = "df -h / | tail -1 | awk '{print $3, $2, $5}'"
        uptime_cmd = "uptime -p"

        r1 = run_ssh_cmd(ssh, cpu_cmd)
        r2 = run_ssh_cmd(ssh, mem_cmd)
        r3 = run_ssh_cmd(ssh, disk_cmd)
        r4 = run_ssh_cmd(ssh, uptime_cmd)
        ssh.close()

        cpu_pct = float(r1['output'].strip()) if r1['ok'] and r1['output'].strip() else 0.0
        mem_parts = r2['output'].split() if r2['ok'] else ['0','0','0']
        mem_used = float(mem_parts[0]) if len(mem_parts) >= 1 else 0
        mem_total = float(mem_parts[1]) if len(mem_parts) >= 2 else 0
        mem_pct = float(mem_parts[2]) if len(mem_parts) >= 3 else 0.0

        disk_parts = r3['output'].split() if r3['ok'] else ['0G','0G','0%']
        disk_used_str = disk_parts[0].replace('G','').replace('M','')
        disk_total_str = disk_parts[1].replace('G','').replace('M','')
        disk_pct = float(disk_parts[2].replace('%','')) if len(disk_parts) >= 3 else 0.0

        return {
            "ok": True,
            "cpu": {"percent": round(cpu_pct, 1), "cores": 4},
            "memory": {"total_gb": round(mem_total / 1024, 1),
                      "used_gb": round(mem_used / 1024, 1),
                      "percent": round(mem_pct, 1)},
            "disk": {"percent": round(disk_pct, 1),
                     "total_gb": round(float(disk_total_str), 1) if disk_total_str else 0,
                     "used_gb": round(float(disk_used_str), 1) if disk_used_str else 0},
            "uptime_display": r4['output'].replace('up ', '').strip() if r4['ok'] else '未知'
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

# ==================== API - 服务状态 ====================
@app.get("/api/services")
async def get_services():
    canonical_ver = get_canonical_version()
    frontend_ver = get_frontend_version()

    be_port = check_port(BACKEND_PORT)
    fe_port = check_port(FRONTEND_PORT)

    be_status = 'stopped'
    be_info = ''
    if be_port:
        health = check_http(BACKEND_HEALTH_URL)
        if health.get('ok'):
            be_status = 'running'
            be_info = f"健康检查通过 ({health.get('response_time_ms',0):.0f}ms)"
        else:
            be_status = 'starting'
            be_info = "端口已监听，服务正在启动..."

    fe_status = 'stopped'
    fe_info = ''
    if fe_port:
        http_check = check_http(FRONTEND_TEST_URL)
        fe_status = 'running'
        fe_info = f"端口监听正常 ({http_check.get('response_time_ms',0):.0f}ms)"

    db_status = get_local_db_status()

    # 服务器端信息
    server_be = {"status": "unknown", "version": "未连接", "url": f"http://{SERVER_IP}:{BACKEND_PORT}"}
    server_fe = {"status": "unknown", "version": "未连接", "url": f"http://{SERVER_IP}:{FRONTEND_PORT}"}
    server_db = "unknown"
    ssh_configured = bool(SERVER_IP and SERVER_USER and (SSH_KEY_PATH or os.environ.get('SERVER_PASSWORD', '')))
    ssh_error = ''

    if not ssh_configured:
        ssh_error = "SSH 凭据未配置（请在 .env 中设置 SERVER_IP/SERVER_USER，以及 SSH_KEY_PATH 或 SERVER_PASSWORD）"
    else:
        try:
            ssh = get_ssh_client()
            r1 = run_ssh_cmd(ssh, f'cat {SERVER_BACKEND_DIR}/version.json 2>/dev/null || echo "NOT_FOUND"')
            if r1['ok'] and 'NOT_FOUND' not in r1['output']:
                try:
                    server_be['version'] = json.loads(r1['output']).get('version', '未知')
                except Exception:
                    server_be['version'] = r1['output'][:40]

            # 服务器前端版本 - 优先从 package.json 读取，fallback 到 .output/server/package.json
            r_fe_ver = run_ssh_cmd(ssh, f'cd {SERVER_FRONTEND_DIR} && cat package.json 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get(\"version\",\"\"))" 2>/dev/null || echo "NOT_FOUND"')
            if r_fe_ver['ok'] and r_fe_ver['output'] and r_fe_ver['output'] != 'NOT_FOUND':
                server_fe['version'] = r_fe_ver['output'].strip()
            else:
                # fallback: 从 .output/server/package.json 读取（Nuxt 构建产物）
                r_fe_ver2 = run_ssh_cmd(ssh, f'cat {SERVER_FRONTEND_DIR}/.output/server/package.json 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get(\"version\",\"\"))" 2>/dev/null || echo "NOT_FOUND"')
                if r_fe_ver2['ok'] and r_fe_ver2['output'] and r_fe_ver2['output'] != 'NOT_FOUND':
                    server_fe['version'] = r_fe_ver2['output'].strip()

            # PM2 状态
            r2 = run_ssh_cmd(ssh, 'pm2 jlist 2>/dev/null | head -c 8000')
            if r2['ok']:
                try:
                    pm2_list = json.loads(r2['output']) if r2['output'].strip() else []
                    for proc in pm2_list:
                        name = proc.get('name', '')
                        status = proc.get('pm2_env', {}).get('status', 'stopped')
                        if 'nav-log-backend' in name or 'backend' in name.lower():
                            server_be['status'] = 'running' if status == 'online' else 'stopped'
                        if 'nav-log-frontend' in name or 'frontend' in name.lower() or name == 'nav-log-frontend':
                            server_fe['status'] = 'running' if status == 'online' else 'stopped'
                except Exception:
                    pass

            # PostgreSQL 状态 - 使用 pg_isready（官方健康检查工具）
            r3 = run_ssh_cmd(ssh, 'pg_isready -h 127.0.0.1 -p 5432 -d postgres 2>&1 | head -3')
            if r3['ok'] and ('accepting connections' in r3['output'].lower() or 'ready' in r3['output'].lower()):
                server_db = 'running'
            elif not r3['ok']:
                r4 = run_ssh_cmd(ssh, 'psql -h 127.0.0.1 -U postgres -d postgres -c "SELECT 1;" 2>&1 | head -3')
                if r4['ok'] and ('1 row' in r4['output'] or '(1' in r4['output']):
                    server_db = 'running'
                elif check_port(5432, SERVER_IP, 3):
                    server_db = 'running'
                else:
                    server_db = 'stopped'
            elif check_port(5432, SERVER_IP, 3):
                server_db = 'running'
            else:
                server_db = 'stopped'
            try:
                ssh.close()
            except Exception:
                pass
        except Exception as e:
            ssh_error = str(e)[:100]

    # 心跳记录
    for name, status in [('本地前端', fe_status), ('本地后端', be_status),
                          ('服务器前端', server_fe['status']), ('服务器后端', server_be['status'])]:
        save_heartbeat(name, status)

    return {
        "canonical_version": canonical_ver,
        "ssh_configured": ssh_configured,
        "ssh_error": ssh_error,
        "local": {
            "frontend": {"status": fe_status, "version": frontend_ver,
                        "info": fe_info, "port": FRONTEND_PORT},
            "backend": {"status": be_status, "version": canonical_ver,
                       "info": be_info, "port": BACKEND_PORT},
            "database": db_status
        },
        "server": {
            "frontend": server_fe,
            "backend": server_be,
            "database": server_db
        },
        "version_sync": {
            "canonical": canonical_ver,
            "frontend_package": frontend_ver,
            "server_backend": server_be.get('version', '未连接'),
            "in_sync_local": canonical_ver == frontend_ver,
            "in_sync_server": canonical_ver == server_be.get('version', '')
        }
    }

# ==================== API - 服务控制 ====================
@app.post("/api/services/local-frontend/start")
async def start_local_frontend():
    return start_service_by_port("本地前端Nuxt服务", FRONTEND_PORT,
                                FRONTEND_DIR, ['npm', 'run', 'dev'])

@app.post("/api/services/local-frontend/stop")
async def stop_local_frontend():
    return stop_service_by_port("本地前端Nuxt服务", FRONTEND_PORT)

@app.post("/api/services/local-frontend/restart")
async def restart_local_frontend():
    stop_result = stop_service_by_port("本地前端Nuxt服务", FRONTEND_PORT)
    await asyncio.sleep(3)
    start_result = start_service_by_port("本地前端Nuxt服务", FRONTEND_PORT,
                                         FRONTEND_DIR, ['npm', 'run', 'dev'])
    return {"ok": start_result.get('ok', False),
            "stop": stop_result.get('message'),
            "start": start_result.get('message'),
            "logs": stop_result.get('logs', []) + start_result.get('logs', [])}

@app.post("/api/services/local-backend/start")
async def start_local_backend():
    return start_service_by_port("本地后端NestJS服务", BACKEND_PORT,
                                BACKEND_DIR, ['npm', 'run', 'start:dev'])

@app.post("/api/services/local-backend/stop")
async def stop_local_backend():
    return stop_service_by_port("本地后端NestJS服务", BACKEND_PORT)

@app.post("/api/services/local-backend/restart")
async def restart_local_backend():
    stop_result = stop_service_by_port("本地后端NestJS服务", BACKEND_PORT)
    await asyncio.sleep(3)
    start_result = start_service_by_port("本地后端NestJS服务", BACKEND_PORT,
                                         BACKEND_DIR, ['npm', 'run', 'start:dev'])
    return {"ok": start_result.get('ok', False),
            "stop": stop_result.get('message'),
            "start": start_result.get('message'),
            "logs": stop_result.get('logs', []) + start_result.get('logs', [])}

@app.post("/api/services/local/restart-all")
async def restart_local_all():
    """一键重启本地前后端"""
    logs = []
    fe_ok = False
    be_ok = False
    
    # 停止
    logs.append("== 停止本地服务 ==")
    fe_stop = stop_service_by_port("本地前端", FRONTEND_PORT)
    be_stop = stop_service_by_port("本地后端", BACKEND_PORT)
    logs.extend(fe_stop.get('logs', []))
    logs.extend(be_stop.get('logs', []))
    
    await asyncio.sleep(3)
    
    # 启动
    logs.append("== 启动本地服务 ==")
    fe_start = start_service_by_port("本地前端", FRONTEND_PORT, FRONTEND_DIR, ['npm', 'run', 'dev'])
    logs.extend(fe_start.get('logs', []))
    fe_ok = fe_start.get('ok', False)
    
    be_start = start_service_by_port("本地后端", BACKEND_PORT, BACKEND_DIR, ['npm', 'run', 'start:dev'])
    logs.extend(be_start.get('logs', []))
    be_ok = be_start.get('ok', False)
    
    write_audit('restart_all', '本地前后端', 'success' if fe_ok and be_ok else 'partial')
    return {
        "ok": fe_ok or be_ok,
        "message": f"前端{'✓' if fe_ok else '✗'} 后端{'✓' if be_ok else '✗'}",
        "logs": logs
    }


# ==================== API - 服务器端服务控制 ====================
@app.post("/api/services/server-backend/restart")
async def restart_server_backend():
    """通过 SSH + PM2 重启服务器后端"""
    try:
        ssh = get_ssh_client()
        logs = []
        logs.append("重启服务器后端...")
        
        r = run_ssh_cmd(ssh, f'cd {SERVER_BACKEND_DIR} && pm2 restart nav-log-backend 2>&1 || pm2 start dist/main.js --name nav-log-backend 2>&1')
        logs.append(f"PM2: {r.get('output', '')[:200]}")
        
        run_ssh_cmd(ssh, 'pm2 save 2>/dev/null')
        ssh.close()
        
        write_audit('restart', '服务器后端', 'success' if r['ok'] else 'failed')
        return {"ok": r['ok'], "message": "服务器后端已重启" if r['ok'] else f"重启失败: {r.get('error', '')}", "logs": logs}
    except Exception as e:
        return {"ok": False, "message": f"SSH连接失败: {str(e)[:100]}", "logs": [str(e)]}

@app.post("/api/services/server-frontend/restart")
async def restart_server_frontend():
    """通过 SSH + PM2 重启服务器前端"""
    try:
        ssh = get_ssh_client()
        logs = []
        logs.append("重启服务器前端...")
        
        r = run_ssh_cmd(ssh, f'cd {SERVER_FRONTEND_DIR} && pm2 restart nav-log-frontend 2>&1 || pm2 start .output/server/index.mjs --name nav-log-frontend 2>&1')
        logs.append(f"PM2: {r.get('output', '')[:200]}")
        
        run_ssh_cmd(ssh, 'pm2 save 2>/dev/null')
        ssh.close()
        
        write_audit('restart', '服务器前端', 'success' if r['ok'] else 'failed')
        return {"ok": r['ok'], "message": "服务器前端已重启" if r['ok'] else f"重启失败: {r.get('error', '')}", "logs": logs}
    except Exception as e:
        return {"ok": False, "message": f"SSH连接失败: {str(e)[:100]}", "logs": [str(e)]}

@app.post("/api/services/server/restart-all")
async def restart_server_all():
    """一键重启服务器前后端"""
    try:
        ssh = get_ssh_client()
        logs = []
        logs.append("== 重启服务器所有服务 ==")
        
        r_be = run_ssh_cmd(ssh, f'cd {SERVER_BACKEND_DIR} && pm2 restart nav-log-backend 2>&1 || pm2 start dist/main.js --name nav-log-backend 2>&1')
        logs.append(f"后端: {r_be.get('output', '')[:200]}")
        
        r_fe = run_ssh_cmd(ssh, f'cd {SERVER_FRONTEND_DIR} && pm2 restart nav-log-frontend 2>&1 || pm2 start .output/server/index.mjs --name nav-log-frontend 2>&1')
        logs.append(f"前端: {r_fe.get('output', '')[:200]}")
        
        run_ssh_cmd(ssh, 'pm2 save 2>/dev/null')
        ssh.close()
        
        be_ok = r_be['ok']
        fe_ok = r_fe['ok']
        write_audit('restart_all', '服务器前后端', 'success' if be_ok and fe_ok else 'partial')
        return {
            "ok": be_ok or fe_ok,
            "message": f"后端{'✓' if be_ok else '✗'} 前端{'✓' if fe_ok else '✗'}",
            "logs": logs
        }
    except Exception as e:
        return {"ok": False, "message": f"SSH连接失败: {str(e)[:100]}", "logs": [str(e)]}


# ==================== API - 部署流水线 ====================
deploy_state = {
    "running": False,
    "current_step": -1,
    "steps": [],
    "logs": [],
    "started_at": None,
    "finished_at": None,
    "result": None,
    "backup_name": None,
    "version": None,
    "duration_seconds": 0
}

_step_start_times = {}

def _set_step(idx, name, status='pending', log=''):
    now = time.time()
    if status == 'running':
        _step_start_times[idx] = now
        duration = ''
    elif status in ('success', 'failed', 'warning'):
        start = _step_start_times.get(idx, now)
        dur = round(now - start, 1)
        duration = f"{dur}s"
    else:
        duration = ''

    step_data = {"name": name, "status": status, "log": log, "duration": duration}
    if idx >= len(deploy_state['steps']):
        deploy_state['steps'].append(step_data)
    else:
        deploy_state['steps'][idx] = step_data
    deploy_state['current_step'] = idx
    total_steps = len(deploy_state['steps'])

    status_cn = {'pending': '等待', 'running': '进行中', 'success': '成功',
                 'failed': '失败', 'warning': '警告'}.get(status, status)
    log_part = f" - {log}" if log else ""
    deploy_state['logs'].append(
        f"[{datetime.now().strftime('%H:%M:%S')}] [步骤 {idx+1}/{total_steps}] {name}: {status_cn}{log_part}")

def _add_log(msg):
    deploy_state['logs'].append(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def _fail_step_and_exit(idx, step_name, error_msg, ssh=None, sftp=None, rollback=True):
    """统一的失败处理：标记步骤失败、关闭连接、可选回滚、记录结果"""
    _set_step(idx, step_name, 'failed', error_msg)
    _add_log(f"❌ 部署失败: {error_msg}")

    # 自动回滚
    backup_name = deploy_state.get('backup_name')
    if rollback and backup_name and ssh:
        _add_log("⚠️ 正在自动回滚到备份版本...")
        try:
            rollback_cmds = [
                f"cp -r /tmp/{backup_name}/frontend-output/* {SERVER_FRONTEND_DIR}/.output/ 2>/dev/null",
                f"cp -r /tmp/{backup_name}/backend-dist/* {SERVER_BACKEND_DIR}/dist/ 2>/dev/null",
                f"cd {SERVER_BACKEND_DIR} && pm2 restart nav-log-backend 2>/dev/null",
                f"cd {SERVER_FRONTEND_DIR} && pm2 restart nav-log-frontend 2>/dev/null",
            ]
            for cmd in rollback_cmds:
                run_ssh_cmd(ssh, cmd)
            _add_log("✓ 回滚完成")
        except Exception as rb_err:
            _add_log(f"⚠ 回滚过程出现异常: {rb_err}")

    if sftp:
        try: sftp.close()
        except: pass
    if ssh:
        try: ssh.close()
        except: pass

    deploy_state['result'] = 'failed'
    deploy_state['running'] = False
    deploy_state['finished_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if deploy_state.get('started_at'):
        try:
            st = datetime.strptime(deploy_state['started_at'], "%Y-%m-%d %H:%M:%S")
            deploy_state['duration_seconds'] = int((datetime.now() - st).total_seconds())
        except:
            pass
    write_audit('deploy', 'server', 'failed', f"{deploy_state.get('version','?')}: {error_msg[:80]}")
    return

@app.get("/api/deploy/status")
async def deploy_status_api():
    return deploy_state

@app.get("/api/deploy/history")
async def deploy_history_api(limit: int = 20):
    try:
        conn = sqlite3.connect(str(DB_FILE))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, version, target, status, started_at, finished_at FROM deploy_history "
            "ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        return {"ok": True, "history": [dict(r) for r in rows]}
    except Exception as e:
        return {"ok": False, "error": str(e), "history": []}

@app.post("/api/deploy/start")
async def deploy_start():
    if deploy_state['running']:
        return {"ok": False, "message": "已有部署任务在进行中，请等待..."}

    current_version = get_canonical_version()
    deploy_state.update({
        "running": True, "current_step": 0, "steps": [],
        "logs": [], "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "finished_at": None, "result": None,
        "backup_name": None, "version": current_version, "duration_seconds": 0
    })
    _step_start_times.clear()

    def _run():
        ssh = None
        sftp = None
        zip_path = OPS_DIR / 'deploy-build.zip'
        try:
            # 完整步骤（13步）
            step_names = [
                ("环境预检查", "检查SSH配置、服务器连通性、磁盘空间"),
                ("本地构建检查", "确认前后端构建产物存在"),
                ("前端构建", "执行 npm run build"),
                ("后端构建", "执行 npm run build"),
                ("打包产物", "压缩部署文件"),
                ("SSH连接", f"连接服务器 {SERVER_IP}"),
                ("上传部署包", "SFTP上传到服务器"),
                ("备份旧版本", "备份当前版本以便回滚"),
                ("替换文件", "解压并部署新文件"),
                ("服务器依赖安装", "npm install --production"),
                ("Prisma同步", "生成客户端并同步数据库schema"),
                ("PM2重启服务", "重启前后端服务"),
                ("健康检查验证", "验证服务可用性"),
            ]
            total = len(step_names)

            for name, _ in step_names:
                deploy_state['steps'].append({"name": name, "status": "pending", "log": "", "duration": ""})

            # ========== Step 0: 环境预检查 ==========
            _set_step(0, step_names[0][0], 'running', '检查配置...')
            if not SERVER_IP or not SERVER_USER:
                _fail_step_and_exit(0, step_names[0][0], 'SSH配置不完整：请检查 .env 中的 SERVER_IP 和 SERVER_USER')
                return
            if not (SSH_KEY_PATH or os.environ.get('SERVER_PASSWORD', '')):
                _fail_step_and_exit(0, step_names[0][0], 'SSH认证未配置：请设置 SSH_KEY_PATH 或 SERVER_PASSWORD')
                return
            _add_log("SSH配置检查通过 ✓")

            try:
                ssh = get_ssh_client()
                _add_log("SSH连通性检查通过 ✓")

                df_check = run_ssh_cmd(ssh, "df -k / | tail -1 | awk '{print $4}'")
                if df_check['ok']:
                    avail_kb = int(df_check['output'].strip())
                    avail_mb = avail_kb / 1024
                    if avail_mb < 500:
                        ssh.close(); ssh = None
                        _fail_step_and_exit(0, step_names[0][0], f'服务器磁盘空间不足（剩余 {avail_mb:.0f} MB，需要至少 500 MB）')
                        return
                    _add_log(f"服务器磁盘空间: {avail_mb:.0f} MB 可用 ✓")

                env_check = run_ssh_cmd(ssh, f"test -f {SERVER_BACKEND_DIR}/.env && echo EXISTS || echo MISSING")
                if env_check['ok'] and 'MISSING' in env_check['output']:
                    _add_log("⚠ 警告：服务器后端 .env 文件不存在，可能导致服务启动失败")
                else:
                    _add_log("服务器环境文件检查通过 ✓")

                node_check = run_ssh_cmd(ssh, "node -v 2>&1")
                npm_check = run_ssh_cmd(ssh, "npm -v 2>&1")
                pm2_check = run_ssh_cmd(ssh, "pm2 -v 2>&1")
                _add_log(f"服务器环境: Node {node_check['output'].strip()[:8]}, npm {npm_check['output'].strip()[:6]}, pm2 {pm2_check['output'].strip()[:4]}")
                ssh.close(); ssh = None
                _set_step(0, step_names[0][0], 'success', '环境检查通过')
            except Exception as e:
                if ssh:
                    try: ssh.close()
                    except: pass
                    ssh = None
                _fail_step_and_exit(0, step_names[0][0], f'预检查失败: {str(e)[:150]}')
                return

            # ========== Step 1: 本地构建检查 ==========
            _set_step(1, step_names[1][0], 'running', '检查构建产物...')
            output_dir = FRONTEND_DIR / '.output'
            backend_dist = BACKEND_DIR / 'dist'
            need_fe_build = not output_dir.exists()
            need_be_build = not backend_dist.exists()
            if need_fe_build:
                _add_log("⚠ 前端构建产物不存在，将执行构建")
            if need_be_build:
                _add_log("⚠ 后端构建产物不存在，将执行构建")
            _set_step(1, step_names[1][0], 'success',
                     f"{'需要构建前端' if need_fe_build else '前端产物已存在'} | {'需要构建后端' if need_be_build else '后端产物已存在'}")

            # ========== Step 2: 前端构建 ==========
            _set_step(2, step_names[2][0], 'running', '执行 npm run build...')
            _add_log("开始构建前端（预计 2-5 分钟，首次构建可能更久）")
            try:
                import subprocess as _sp
                fe_build_needed = need_fe_build
                if fe_build_needed:
                    proc = _sp.Popen(
                        ['cmd', '/c', 'npm run build'],
                        cwd=str(FRONTEND_DIR),
                        stdout=_sp.PIPE, stderr=_sp.STDOUT,
                        text=True, bufsize=1
                    )
                    for line in proc.stdout:
                        line = line.strip()
                        if line:
                            _add_log(f"[前端构建] {line[:200]}")
                    proc.wait(timeout=900)
                    if proc.returncode != 0:
                        _fail_step_and_exit(2, step_names[2][0], f'前端构建失败，退出码 {proc.returncode}，请查看日志')
                        return
                    _add_log("前端构建完成 ✓")
                else:
                    _add_log("前端构建产物已存在，跳过构建步骤")
                _set_step(2, step_names[2][0], 'success', '前端构建完成')
            except Exception as e:
                _fail_step_and_exit(2, step_names[2][0], f'前端构建异常: {str(e)[:200]}')
                return

            # ========== Step 3: 后端构建 ==========
            _set_step(3, step_names[3][0], 'running', '执行 npm run build...')
            _add_log("开始构建后端（预计 30-60 秒）")
            try:
                import subprocess as _sp2
                be_build_needed = need_be_build
                if be_build_needed:
                    proc_be = _sp2.Popen(
                        ['cmd', '/c', 'npm run build'],
                        cwd=str(BACKEND_DIR),
                        stdout=_sp2.PIPE, stderr=_sp2.STDOUT,
                        text=True, bufsize=1
                    )
                    for line in proc_be.stdout:
                        line = line.strip()
                        if line:
                            _add_log(f"[后端构建] {line[:200]}")
                    proc_be.wait(timeout=300)
                    if proc_be.returncode != 0:
                        _fail_step_and_exit(3, step_names[3][0], f'后端构建失败，退出码 {proc_be.returncode}，请查看日志')
                        return
                    _add_log("后端构建完成 ✓")
                else:
                    _add_log("后端构建产物已存在，跳过构建步骤")
                _set_step(3, step_names[3][0], 'success', '后端构建完成')
            except Exception as e:
                _fail_step_and_exit(3, step_names[3][0], f'后端构建异常: {str(e)[:200]}')
                return

            # ========== Step 4: 打包 ==========
            _set_step(4, step_names[4][0], 'running', '压缩部署产物...')
            import zipfile
            output_dir = FRONTEND_DIR / '.output'
            backend_dist = BACKEND_DIR / 'dist'

            if not output_dir.exists():
                _fail_step_and_exit(4, step_names[4][0], f"未找到前端构建产物: {output_dir}")
                return
            if not backend_dist.exists():
                _fail_step_and_exit(4, step_names[4][0], f"未找到后端构建产物: {backend_dist}")
                return

            if zip_path.exists():
                zip_path.unlink()

            file_count = 0
            with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
                for root, dirs, files in os.walk(str(output_dir)):
                    for f in files:
                        full_path = os.path.join(root, f)
                        arc_name = 'frontend-output/' + os.path.relpath(full_path, str(output_dir))
                        zf.write(full_path, arc_name)
                        file_count += 1
                for root, dirs, files in os.walk(str(backend_dist)):
                    for f in files:
                        full_path = os.path.join(root, f)
                        arc_name = 'backend-dist/' + os.path.relpath(full_path, str(backend_dist))
                        zf.write(full_path, arc_name)
                        file_count += 1
                be_pkg = BACKEND_DIR / 'package.json'
                if be_pkg.exists():
                    zf.write(str(be_pkg), 'backend-package.json')
                    file_count += 1
                be_ver = BACKEND_DIR / 'version.json'
                if be_ver.exists():
                    zf.write(str(be_ver), 'backend-version.json')
                    file_count += 1
                fe_pkg = FRONTEND_DIR / 'package.json'
                if fe_pkg.exists():
                    zf.write(str(fe_pkg), 'frontend-package.json')
                    file_count += 1
                fe_output_pkg = output_dir / 'server' / 'package.json'
                if fe_output_pkg.exists():
                    zf.write(str(fe_output_pkg), 'frontend-output/server/package.json')
                    file_count += 1
                prisma_dir = BACKEND_DIR / 'prisma'
                if prisma_dir.exists():
                    for root, dirs, files in os.walk(str(prisma_dir)):
                        for f in files:
                            full_path = os.path.join(root, f)
                            arc_name = 'backend-prisma/' + os.path.relpath(full_path, str(prisma_dir))
                            zf.write(full_path, arc_name)
                            file_count += 1

            if not zip_path.exists() or zip_path.stat().st_size < 1024:
                _fail_step_and_exit(4, step_names[4][0], '打包失败：zip文件为空或过小')
                return
            zip_size_mb = round(zip_path.stat().st_size / 1024 / 1024, 2)
            _add_log(f"打包完成: {file_count} 个文件, {zip_size_mb} MB")
            _set_step(4, step_names[4][0], 'success', f"{file_count} 个文件 / {zip_size_mb} MB")

            # ========== Step 5: SSH连接 ==========
            _set_step(5, step_names[5][0], 'running', f'连接 {SERVER_IP}...')
            try:
                ssh = get_ssh_client()
                sftp = ssh.open_sftp()
                _set_step(5, step_names[5][0], 'success', 'SSH连接成功')
            except Exception as e:
                _fail_step_and_exit(5, step_names[5][0], f'SSH连接失败: {str(e)[:200]}')
                return

            # ========== Step 6: 上传 ==========
            _set_step(6, step_names[6][0], 'running', f'上传 {zip_size_mb} MB...')
            try:
                sftp.put(str(zip_path), '/tmp/deploy-build.zip')
                _add_log("SFTP上传完成 ✓")
                _set_step(6, step_names[6][0], 'success', '上传完成')
            except Exception as e:
                _fail_step_and_exit(6, step_names[6][0], f'上传失败: {str(e)[:200]}', ssh=ssh, sftp=sftp)
                return

            # ========== Step 7: 备份 ==========
            _set_step(7, step_names[7][0], 'running', '备份当前版本...')
            backup_name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            deploy_state['backup_name'] = backup_name
            run_ssh_cmd(ssh, f'mkdir -p /tmp/{backup_name}')
            run_ssh_cmd(ssh, f'cp -r {SERVER_FRONTEND_DIR}/.output /tmp/{backup_name}/frontend-output 2>/dev/null')
            run_ssh_cmd(ssh, f'cp -r {SERVER_BACKEND_DIR}/dist /tmp/{backup_name}/backend-dist 2>/dev/null')
            run_ssh_cmd(ssh, f'cp -r {SERVER_BACKEND_DIR}/prisma /tmp/{backup_name}/backend-prisma 2>/dev/null')
            run_ssh_cmd(ssh, f'cp {SERVER_BACKEND_DIR}/package.json /tmp/{backup_name}/backend-package.json 2>/dev/null')
            run_ssh_cmd(ssh, f'cp {SERVER_BACKEND_DIR}/node_modules /tmp/{backup_name}/node_modules -r 2>/dev/null || true')
            r_bk_ver = run_ssh_cmd(ssh, f'cat {SERVER_BACKEND_DIR}/version.json 2>/dev/null')
            if r_bk_ver['ok'] and r_bk_ver['output'].strip():
                try:
                    old_ver = json.loads(r_bk_ver['output']).get('version', '未知')
                    _add_log(f"正在从版本 {old_ver} 升级到 {current_version}")
                except:
                    pass
            _set_step(7, step_names[7][0], 'success', f'备份已保存: /tmp/{backup_name}/')

            # ========== Step 8: 解压替换 ==========
            _set_step(8, step_names[8][0], 'running', '解压并替换文件...')
            run_ssh_cmd(ssh, 'rm -rf /tmp/deploy-extract')
            run_ssh_cmd(ssh, 'mkdir -p /tmp/deploy-extract')

            r_unzip = run_ssh_cmd(ssh, 'cd /tmp/deploy-extract && unzip -o /tmp/deploy-build.zip', timeout=60)
            unzip_ok = r_unzip['ok']
            if not unzip_ok:
                r_unzip2 = run_ssh_cmd(ssh,
                    'python3 -c "import zipfile; z=zipfile.ZipFile(\\\"/tmp/deploy-build.zip\\\"); z.extractall(\\\"/tmp/deploy-extract\\\"); print(\\\"OK\\\")"',
                    timeout=60)
                unzip_ok = r_unzip2['ok'] and 'OK' in r_unzip2.get('output', '')
                if not unzip_ok:
                    _fail_step_and_exit(8, step_names[8][0], '解压失败：服务器缺少unzip且python解压也失败', ssh=ssh, sftp=sftp)
                    return

            _add_log("部署前端文件...")
            run_ssh_cmd(ssh, f'mkdir -p {SERVER_FRONTEND_DIR}/.output')
            run_ssh_cmd(ssh, f'rm -rf {SERVER_FRONTEND_DIR}/.output/*')
            r_cp_fe = run_ssh_cmd(ssh, f'cp -r /tmp/deploy-extract/frontend-output/* {SERVER_FRONTEND_DIR}/.output/')
            if not r_cp_fe['ok']:
                _fail_step_and_exit(8, step_names[8][0], f'前端文件替换失败: {r_cp_fe.get("error", "")[:100]}', ssh=ssh, sftp=sftp)
                return
            run_ssh_cmd(ssh, f'cp /tmp/deploy-extract/frontend-package.json {SERVER_FRONTEND_DIR}/package.json 2>/dev/null')

            _add_log("部署后端文件...")
            run_ssh_cmd(ssh, f'rm -rf {SERVER_BACKEND_DIR}/dist')
            r_mv_be = run_ssh_cmd(ssh, f'mv /tmp/deploy-extract/backend-dist {SERVER_BACKEND_DIR}/dist')
            if not r_mv_be['ok']:
                _fail_step_and_exit(8, step_names[8][0], f'后端文件替换失败: {r_mv_be.get("error", "")[:100]}', ssh=ssh, sftp=sftp)
                return
            run_ssh_cmd(ssh, f'cp /tmp/deploy-extract/backend-package.json {SERVER_BACKEND_DIR}/package.json')
            run_ssh_cmd(ssh, f'cp /tmp/deploy-extract/backend-version.json {SERVER_BACKEND_DIR}/version.json')
            run_ssh_cmd(ssh, f'rm -rf {SERVER_BACKEND_DIR}/prisma')
            run_ssh_cmd(ssh, f'mv /tmp/deploy-extract/backend-prisma {SERVER_BACKEND_DIR}/prisma 2>/dev/null || true')

            run_ssh_cmd(ssh, 'rm -rf /tmp/deploy-extract /tmp/deploy-build.zip')
            _add_log("前后端文件替换完成 ✓")
            _set_step(8, step_names[8][0], 'success', '文件替换完成')

            # ========== Step 9: 服务器依赖安装 ==========
            _set_step(9, step_names[9][0], 'running', '检查依赖变化...')
            _add_log("检查 package.json 是否有变化...")
            bk_name = deploy_state.get('backup_name', '')
            old_pkg = f'/tmp/{bk_name}/backend-package.json' if bk_name else ''
            if old_pkg and bk_name:
                r_diff = run_ssh_cmd(ssh, f'diff {old_pkg} {SERVER_BACKEND_DIR}/package.json > /dev/null 2>&1 && echo "same" || echo "different"')
                pkg_changed = r_diff.get('output', 'different').strip() == 'different'
            else:
                pkg_changed = True
            
            if not pkg_changed:
                _add_log("package.json 未变化，跳过 npm install ✓")
                _set_step(9, step_names[9][0], 'success', '依赖无变化，跳过安装')
            else:
                _add_log("检测到依赖变化，执行 npm install --production...")
                _set_step(9, step_names[9][0], 'running', '安装生产依赖中...')
                r_npm = run_ssh_cmd(ssh, f'cd {SERVER_BACKEND_DIR} && npm install --production 2>&1 | tail -30', timeout=600)
                npm_output = r_npm.get('output', '')
                if not r_npm['ok']:
                    if 'ERR!' in npm_output:
                        _add_log(f"npm install 输出末尾:\n{npm_output[-800:]}")
                        _set_step(9, step_names[9][0], 'warning', 'npm install有错误，请检查日志')
                    else:
                        _add_log("npm install 完成（有警告）✓")
                        _set_step(9, step_names[9][0], 'success', '依赖安装完成')
                else:
                    _add_log("npm install 完成 ✓")
                    _set_step(9, step_names[9][0], 'success', '依赖安装完成')

            # ========== Step 10: Prisma同步 ==========
            _set_step(10, step_names[10][0], 'running', '同步数据库schema...')
            _add_log("执行 prisma generate...")
            r_gen = run_ssh_cmd(ssh, f'cd {SERVER_BACKEND_DIR} && npx prisma generate 2>&1 | tail -10', timeout=120)
            if not r_gen['ok']:
                _add_log(f"⚠ prisma generate 返回非零退出码")
                gen_out = r_gen.get('output', '')
                if gen_out:
                    _add_log(f"prisma generate 输出: {gen_out[-300:]}")
            else:
                _add_log("prisma generate 完成 ✓")

            _add_log("执行 prisma db push（同步schema，不重置数据）...")
            r_push = run_ssh_cmd(ssh, f'cd {SERVER_BACKEND_DIR} && npx prisma db push --skip-generate 2>&1 | tail -15', timeout=120)
            push_output = r_push.get('output', '')
            if 'error' in push_output.lower() and 'already in sync' not in push_output.lower():
                _add_log(f"⚠ prisma db push 输出: {push_output[-300:]}")
                _set_step(10, step_names[10][0], 'warning', 'Prisma同步有警告，请检查日志')
            else:
                _add_log("prisma db push 完成 ✓")
                _set_step(10, step_names[10][0], 'success', '数据库schema同步完成')

            # ========== Step 11: PM2重启 ==========
            _set_step(11, step_names[11][0], 'running', '重启服务...')

            # 先停止旧服务，确保干净重启
            run_ssh_cmd(ssh, 'pm2 delete nav-log-backend 2>/dev/null; pm2 delete nav-log-frontend 2>/dev/null; true')
            time.sleep(2)

            # 启动后端
            r_be_start = run_ssh_cmd(ssh,
                f'cd {SERVER_BACKEND_DIR} && pm2 start dist/main.js --name nav-log-backend 2>&1')
            _add_log(f"后端启动: exit={r_be_start.get('exit_code')}")
            if not r_be_start.get('ok'):
                _add_log(f"  后端启动输出: {r_be_start.get('output', '')[:300]}")

            time.sleep(3)

            # 启动前端
            r_fe_start = run_ssh_cmd(ssh,
                f'cd {SERVER_FRONTEND_DIR} && pm2 start .output/server/index.mjs --name nav-log-frontend 2>&1')
            _add_log(f"前端启动: exit={r_fe_start.get('exit_code')}")
            if not r_fe_start.get('ok'):
                _add_log(f"  前端启动输出: {r_fe_start.get('output', '')[:300]}")

            run_ssh_cmd(ssh, 'pm2 save 2>/dev/null')

            # 等待几秒让服务初始化
            time.sleep(5)

            # 检查PM2进程状态
            r_pm2_list = run_ssh_cmd(ssh, 'pm2 list 2>&1 | head -30')
            if r_pm2_list.get('ok'):
                _add_log("PM2 进程状态:")
                for line in r_pm2_list['output'].strip().split('\n'):
                    if line.strip():
                        _add_log(f"  {line[:120]}")

            _set_step(11, step_names[11][0], 'success', 'PM2重启完成')

            # ========== Step 12: 健康检查 ==========
            _set_step(12, step_names[12][0], 'running', '等待服务就绪...')
            be_ok = False
            fe_ok = False
            be_code = '000'
            fe_code = '000'

            for attempt in range(20):
                time.sleep(5)
                r_be_h = run_ssh_cmd(ssh,
                    f'curl -s -o /dev/null -w "%{{http_code}}" --max-time 3 http://127.0.0.1:{BACKEND_PORT}/api/health 2>/dev/null || echo "000"')
                if r_be_h['ok']:
                    be_code = r_be_h['output'].strip()[:3]
                    be_ok = be_code in ('200', '301', '302')
                r_fe_h = run_ssh_cmd(ssh,
                    f'curl -s -o /dev/null -w "%{{http_code}}" --max-time 3 http://127.0.0.1:{FRONTEND_PORT}/ 2>/dev/null || echo "000"')
                if r_fe_h['ok']:
                    fe_code = r_fe_h['output'].strip()[:3]
                    fe_ok = fe_code in ('200', '301', '302')
                _add_log(f"健康检查 ({attempt+1}/20): 后端={be_code} 前端={fe_code}")
                if be_ok and fe_ok:
                    break

            # 如果后端没起来，输出PM2错误日志帮助诊断
            if not be_ok:
                _add_log("⚠ 后端服务未就绪，查看PM2错误日志:")
                r_be_logs = run_ssh_cmd(ssh, 'pm2 logs nav-log-backend --err --nostream --lines 20 2>&1 || pm2 logs nav-log-backend --lines 20 2>&1')
                if r_be_logs.get('ok') and r_be_logs.get('output'):
                    for line in r_be_logs['output'].strip().split('\n')[-15:]:
                        if line.strip():
                            _add_log(f"  [后端错误] {line[:200]}")

            if not fe_ok:
                _add_log("⚠ 前端服务未就绪，查看PM2错误日志:")
                r_fe_logs = run_ssh_cmd(ssh, 'pm2 logs nav-log-frontend --err --nostream --lines 20 2>&1 || pm2 logs nav-log-frontend --lines 20 2>&1')
                if r_fe_logs.get('ok') and r_fe_logs.get('output'):
                    for line in r_fe_logs['output'].strip().split('\n')[-15:]:
                        if line.strip():
                            _add_log(f"  [前端错误] {line[:200]}")

            final_status = 'success'
            if be_ok and fe_ok:
                _set_step(12, step_names[12][0], 'success',
                         f'后端 HTTP {be_code} | 前端 HTTP {fe_code} ✓')
                deploy_state['result'] = 'success'
                _add_log(f"🎉 部署成功！版本 {current_version} 已上线")
            elif be_ok or fe_ok:
                _set_step(12, step_names[12][0], 'warning',
                         f'后端 HTTP {be_code} | 前端 HTTP {fe_code} - 部分服务异常，请手动检查')
                deploy_state['result'] = 'partial'
                _add_log("⚠ 部分服务启动异常，请手动检查PM2日志")
                final_status = 'partial'
            else:
                _set_step(12, step_names[12][0], 'failed',
                         f'后端 HTTP {be_code} | 前端 HTTP {fe_code} - 服务启动失败，正在回滚...')
                deploy_state['result'] = 'failed'
                final_status = 'failed'
                _add_log("❌ 健康检查失败，正在自动回滚...")
                backup_name = deploy_state.get('backup_name')
                if backup_name:
                    try:
                        run_ssh_cmd(ssh, f'cp -r /tmp/{backup_name}/frontend-output/* {SERVER_FRONTEND_DIR}/.output/ 2>/dev/null')
                        run_ssh_cmd(ssh, f'cp -r /tmp/{backup_name}/backend-dist/* {SERVER_BACKEND_DIR}/dist/ 2>/dev/null')
                        run_ssh_cmd(ssh, f'cd {SERVER_BACKEND_DIR} && pm2 delete nav-log-backend 2>/dev/null; pm2 start dist/main.js --name nav-log-backend 2>/dev/null')
                        time.sleep(3)
                        run_ssh_cmd(ssh, f'cd {SERVER_FRONTEND_DIR} && pm2 delete nav-log-frontend 2>/dev/null; pm2 start .output/server/index.mjs --name nav-log-frontend 2>/dev/null')
                        run_ssh_cmd(ssh, 'pm2 save 2>/dev/null')
                        _add_log("✓ 自动回滚完成，已恢复到上一个版本")
                    except Exception as rb_err:
                        _add_log(f"⚠ 回滚过程出现异常: {rb_err}")

            try:
                sftp.close()
            except:
                pass
            try:
                ssh.close()
            except:
                pass
            if zip_path.exists():
                try: zip_path.unlink()
                except: pass

            deploy_state['running'] = False
            deploy_state['finished_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            try:
                st = datetime.strptime(deploy_state['started_at'], "%Y-%m-%d %H:%M:%S")
                deploy_state['duration_seconds'] = int((datetime.now() - st).total_seconds())
            except:
                pass

            try:
                conn = sqlite3.connect(str(DB_FILE))
                conn.execute(
                    "INSERT INTO deploy_history (version, target, status, steps, started_at, finished_at, log) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (current_version, 'server', final_status,
                     json.dumps([s["status"] for s in deploy_state['steps']], ensure_ascii=False),
                     deploy_state['started_at'], deploy_state['finished_at'],
                     json.dumps(deploy_state['logs'][-200:], ensure_ascii=False)))
                conn.commit()
                conn.close()
            except Exception as e:
                _add_log(f"⚠ 保存部署记录失败: {e}")
            write_audit('deploy', 'server', final_status, f"{current_version} -> {final_status}")

        except Exception as e:
            import traceback
            _add_log(f"FATAL ERROR: {e}")
            _add_log(traceback.format_exc()[-500:])
            if sftp:
                try: sftp.close()
                except: pass
            if ssh:
                try: ssh.close()
                except: pass
            if zip_path.exists():
                try: zip_path.unlink()
                except: pass
            deploy_state['result'] = 'failed'
            deploy_state['running'] = False
            deploy_state['finished_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            try:
                st = datetime.strptime(deploy_state['started_at'], "%Y-%m-%d %H:%M:%S")
                deploy_state['duration_seconds'] = int((datetime.now() - st).total_seconds())
            except:
                pass
            write_audit('deploy', 'server', 'failed', str(e)[:100])

    threading.Thread(target=_run, daemon=True).start()
    return {"ok": True, "message": f"部署任务已启动（版本 {current_version}），查看流水线进度..."}


# ==================== API - 版本号管理 ====================
@app.post("/api/version/bump")
async def api_bump_version(new_version: str = None):
    """自增版本号并同步到前后端 package.json"""
    result = bump_version(new_version)
    return result


@app.get("/api/version")
async def api_get_version():
    """返回当前所有版本号信息"""
    canonical = get_canonical_version()
    frontend = get_frontend_version()
    be_pkg = '未知'
    fe_pkg = '未知'
    try:
        with open(str(BACKEND_DIR / 'package.json'), 'r', encoding='utf-8') as f:
            be_pkg = json.load(f).get('version', '未知')
    except Exception:
        pass
    try:
        with open(str(FRONTEND_DIR / 'package.json'), 'r', encoding='utf-8') as f:
            fe_pkg = json.load(f).get('version', '未知')
    except Exception:
        pass
    return {
        "canonical": canonical,
        "backend_package_json": be_pkg,
        "frontend_package_json": fe_pkg,
        "frontend_api": frontend,
        "in_sync": canonical == be_pkg == fe_pkg
    }


# ==================== API - 其他 ====================
@app.get("/api/audit")
async def get_audit(limit: int = 50):
    logs = []
    try:
        with open(AUDIT_LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for line in lines[-limit:]:
                try:
                    logs.append(json.loads(line.strip()))
                except Exception:
                    pass
    except FileNotFoundError:
        pass
    return list(reversed(logs))

# ==================== WebSocket ====================
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        # 立即发送一次全量状态
        svc = await get_services()
        res = await get_resources()
        await ws.send_json({"type": "full", "services": svc,
                          "resources": res, "deploy": deploy_state,
                          "timestamp": datetime.now().isoformat()})

        # 后续每 8 秒推送一次增量
        while True:
            # 检查是否有消息（非阻塞）
            try:
                await asyncio.sleep(8)
                svc = await get_services()
                res = await get_resources()
                await ws.send_json({"type": "update", "services": svc,
                                  "resources": res, "deploy": deploy_state,
                                  "timestamp": datetime.now().isoformat()})
            except Exception:
                break
    except Exception:
        pass
    # 连接关闭


# ==================== 静态文件 ====================
@app.get("/")
async def serve_index():
    index_html = STATIC_DIR / 'index.html'
    if index_html.exists():
        with open(str(index_html), 'r', encoding='utf-8') as f:
            html = f.read()
        return Response(content=html, media_type='text/html')
    return {"message": "运维监控 API 服务运行中", "docs": "/docs"}

@app.get("/assets/{file_path:path}")
async def serve_assets(file_path: str):
    full = STATIC_DIR / 'assets' / file_path
    if full.exists() and full.is_file():
        if str(file_path).endswith('.js'):
            media_type = 'application/javascript'
        elif str(file_path).endswith('.css'):
            media_type = 'text/css'
        elif str(file_path).endswith('.svg'):
            media_type = 'image/svg+xml'
        elif str(file_path).endswith('.png'):
            media_type = 'image/png'
        else:
            media_type = 'application/octet-stream'
        return FileResponse(str(full), media_type=media_type)
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    # 避免与 API 冲突
    if file_path.startswith('api/') or file_path.startswith('docs') or file_path.startswith('openapi'):
        raise HTTPException(status_code=404)
    full = STATIC_DIR / file_path
    if full.exists() and full.is_file():
        return FileResponse(str(full))
    raise HTTPException(status_code=404)


# ==================== 启动 ====================
if __name__ == "__main__":
    print(f"="*60)
    print(f"  熊猫笔记 运维监控面板 v2.0")
    print(f"  访问地址: http://127.0.0.1:{MONITOR_PORT}")
    print(f"  API 文档: http://127.0.0.1:{MONITOR_PORT}/docs")
    print(f"  权威版本: {get_canonical_version()}")
    print(f"="*60)
    uvicorn.run(app, host="0.0.0.0", port=MONITOR_PORT, log_level="info",
               ws_ping_interval=30, ws_ping_timeout=60)
