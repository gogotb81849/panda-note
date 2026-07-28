#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
同步生产服务器上的 version.json
读取服务器 package.json 的真实版本号，写入 version.json
（使用 SSH 密钥认证，从项目根目录 .env 读取配置）
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ssh_client import connect_ssh, run_cmd, print_config_safe


def main():
    print("=== 熊猫笔记 · 服务器 version.json 同步 ===\n")
    print_config_safe()
    print()

    try:
        ssh = connect_ssh()
    except Exception as e:
        print(f"\n✗ 无法建立 SSH 连接: {e}")
        sys.exit(1)

    try:
        # 1. 读取后端 package.json 的版本号
        result, ok = run_cmd(ssh, "cat /www/wwwroot/nav-log-system/backend/package.json")
        if not ok or not result.strip():
            print("✗ 无法读取服务器 backend/package.json")
            sys.exit(1)

        try:
            pkg = json.loads(result)
            server_version = pkg.get('version', '')
        except json.JSONDecodeError:
            print("✗ package.json 格式错误")
            sys.exit(1)

        if not server_version:
            print("✗ package.json 中没有 version 字段")
            sys.exit(1)

        print(f"服务器 backend/package.json 版本: {server_version}")

        # 2. 构建新的 version.json
        new_version = {
            "version": server_version,
            "buildTime": "auto",
            "environment": "production",
            "nodeVersion": "auto"
        }
        content = json.dumps(new_version, indent=2) + "\n"

        # 3. 上传到服务器
        sftp = ssh.open_sftp()
        with sftp.file('/www/wwwroot/nav-log-system/backend/version.json', 'w') as f:
            f.write(content)
        sftp.close()
        print(f"✓ version.json 已同步为: {server_version}")

        # 4. 验证
        result, ok = run_cmd(ssh, "cat /www/wwwroot/nav-log-system/backend/version.json")
        print("\n服务器 version.json 内容:")
        print(result.strip())

        # 5. 通过 API 验证是否生效
        result, ok = run_cmd(ssh, "curl -s http://localhost:3002/api/version 2>/dev/null")
        print(f"\n后端 API 返回: {result.strip()[:200]}")

    finally:
        ssh.close()

    print("\n✓ version.json 同步完成")


if __name__ == '__main__':
    main()
