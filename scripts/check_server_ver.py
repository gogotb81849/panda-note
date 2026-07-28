#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
检查生产服务器上的版本号信息
（使用 SSH 密钥认证，从项目根目录 .env 读取配置）
"""
import sys
from pathlib import Path

# 确保可以从 scripts/ 目录导入共享模块
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ssh_client import connect_ssh, run_cmd, print_config_safe

COMMANDS = [
    ("version.json", "cat /www/wwwroot/nav-log-system/backend/version.json"),
    ("backend/package.json 版本号", "cat /www/wwwroot/nav-log-system/backend/package.json | grep '\"version\"'"),
    ("frontend/package.json 版本号", "cat /www/wwwroot/nav-log-system/frontend/package.json | grep '\"version\"'"),
    ("API /api/version", "curl -s http://localhost:3002/api/version 2>/dev/null"),
]


def main():
    print("=== 熊猫笔记 · 生产服务器版本检查 ===\n")
    print_config_safe()
    print()

    try:
        ssh = connect_ssh()
    except Exception as e:
        print(f"\n✗ 无法建立 SSH 连接: {e}")
        sys.exit(1)

    try:
        for name, cmd in COMMANDS:
            print(f"--- {name} ---")
            result, ok = run_cmd(ssh, cmd, timeout=15)
            if ok and result.strip():
                print(result.strip()[:500])
            elif not ok:
                print(f"(执行失败或无输出: {result[:200]})")
            else:
                print("(无输出)")
            print()
    finally:
        ssh.close()
    print("✓ 检查完成")


if __name__ == '__main__':
    main()
