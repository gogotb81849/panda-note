#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
查看生产服务器上后端服务的最近日志
（使用 SSH 密钥认证，从项目根目录 .env 读取配置）
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ssh_client import connect_ssh, run_cmd, print_config_safe

# 要查看的日志命令（按严重度排序）
CHECKS = [
    ("后端错误日志", 'pm2 logs nav-log-backend --lines 80 --nostream --err 2>&1 | tail -40'),
    ("后端标准日志", 'pm2 logs nav-log-backend --lines 80 --nostream 2>&1 | tail -40'),
    ("PM2 进程状态", 'pm2 list 2>/dev/null | tail -20'),
    ("后端进程存活", 'ps aux | grep -E "node.*backend|nest" | grep -v grep | head -5'),
    ("最近 10 行系统错误", 'tail -n 20 /var/log/syslog 2>/dev/null || tail -n 20 /var/log/messages 2>/dev/null'),
]


def main():
    print("=== 熊猫笔记 · 生产服务器日志检查 ===\n")
    print_config_safe()
    print()

    try:
        ssh = connect_ssh()
    except Exception as e:
        print(f"\n✗ 无法建立 SSH 连接: {e}")
        sys.exit(1)

    try:
        for name, cmd in CHECKS:
            print(f"=== {name} ===")
            result, ok = run_cmd(ssh, cmd, timeout=20)
            print(result.strip() if result.strip() else "(无输出)")
            print()
    finally:
        ssh.close()
    print("✓ 日志检查完成")


if __name__ == '__main__':
    main()
