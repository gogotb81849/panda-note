#!/usr/bin/env python3
"""SSH到服务器，直接在生产机构建前端（因为GitHub Actions 7GB runner + 本地 sandbox 5.8GB 都 OOM）。

服务器：106.14.57.62:22 root / BTroot260318
部署路径：/opt/app/nav-log （见 deploy.sh DEPLOY_DIR）
"""

import paramiko
import sys
import time
import select
import os

HOST = "106.14.57.62"
PORT = 22
USER = "root"
PASSWORD = "BTroot260318"
DEPLOY_DIR = "/opt/app/nav-log"

def run_chan(chan, cmd, timeout=300):
    chan.send(cmd + "\n")
    buf = ""
    deadline = time.time() + timeout
    while time.time() < deadline:
        r, _, _ = select.select([chan], [], [], 1.0)
        if chan in r:
            try:
                data = chan.recv(65536).decode("utf-8", errors="replace")
            except Exception as e:
                print(f"[recv err] {e}")
                break
            if not data:
                break
            buf += data
            sys.stdout.write(data)
            sys.stdout.flush()
            tail = buf.splitlines()[-1] if buf.splitlines() else ""
            stripped = tail.rstrip()
            if "password:" in stripped.lower():
                print("[!] 出现 password 提示，发送密码")
                chan.send(PASSWORD + "\n")
            if (
                stripped.endswith("# ")
                or stripped.endswith("$ ")
                or stripped.endswith("> ")
                or stripped.endswith("#")
                or stripped.endswith("$")
            ):
                return buf
    return buf


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    print(f"[+] 连接 SSH: {USER}@{HOST}:{PORT}")
    try:
        ssh.connect(
            HOST,
            port=PORT,
            username=USER,
            password=PASSWORD,
            timeout=15,
            banner_timeout=15,
            auth_timeout=15,
            look_for_keys=False,
            allow_agent=False,
        )
        print("[+] 登录成功（密码认证）")
    except Exception as e:
        print(f"[-] 登录失败: {e}")
        sys.exit(1)

    chan = ssh.invoke_shell(width=160, height=48)
    chan.settimeout(10)
    print("[+] 等待 shell 提示符...")
    time.sleep(2)
    try:
        while chan.recv_ready():
            data = chan.recv(65536).decode("utf-8", errors="replace")
            sys.stdout.write(data)
            sys.stdout.flush()
            time.sleep(0.3)
    except Exception:
        pass
    print()
    print("=" * 80)

    run_chan(chan, "echo '=== [Step 1] 服务器环境 ==='")
    run_chan(chan, "free -h ; echo '---' ; df -h / ; echo '---' ; uname -a")
    run_chan(chan, f"ls -la {DEPLOY_DIR} 2>&1 | head -30")
    run_chan(chan, f"ls -la {DEPLOY_DIR}/frontend 2>&1 | head -20")
    run_chan(chan, "which node && node -v ; which npm && npm -v ; which pm2 && pm2 -v")

    print("\n" + "=" * 80)
    print("[=] Step 1 完成，进入 Step 2: 前端构建前检查")

    run_chan(chan, "echo '=== [Step 2] 前端构建前检查 ==='")
    run_chan(chan, f"cd {DEPLOY_DIR}/frontend && pwd && ls package.json && cat package.json | head -40")
    run_chan(chan, f"cd {DEPLOY_DIR}/frontend && ls node_modules/.package-lock.json 2>/dev/null && echo '有 node_modules' || echo '缺 node_modules，先 npm ci 或 npm install'")

    print("\n" + "=" * 80)
    print("[=] Step 2 完成，进入 Step 3: 开始构建前端（max-old-space-size=8192）")

    run_chan(
        chan,
        f"cd {DEPLOY_DIR}/frontend && export NODE_OPTIONS='--max-old-space-size=8192' && "
        f"(ls node_modules/.package-lock.json >/dev/null 2>&1 || npm install --ignore-scripts --no-audit --no-fund 2>&1 | tail -20) && "
        f"echo '--- nuxt build start @ '$(date -Iseconds) && "
        f"time npx nuxt build 2>&1 | tail -80 ; "
        f"echo '--- build exit='$?' @ $(date -Iseconds)'",
        timeout=1200,
    )

    print("\n" + "=" * 80)
    print("[=] Step 3 完成，进入 Step 4: 验证构建产物 + reload PM2")

    run_chan(chan, "echo '=== [Step 4] 验证构建产物 & reload PM2 ==='")
    run_chan(chan, f"ls -la {DEPLOY_DIR}/frontend/.output/server/index.mjs 2>&1")
    run_chan(chan, f"ls -la {DEPLOY_DIR}/frontend/.output/public/latest.json 2>&1 && cat {DEPLOY_DIR}/frontend/.output/public/latest.json 2>&1")
    run_chan(chan, "echo '--- 前端 PM2 状态 ---' && pm2 show nav-log-frontend 2>&1 | head -25 || true")
    run_chan(chan, "echo '--- 执行 pm2 reload 前端 ---' && pm2 reload nav-log-frontend --update-env 2>&1 | tail -10")
    run_chan(chan, "sleep 3 && pm2 status 2>&1 | head -20")

    print("\n" + "=" * 80)
    print("[+] 全部完成。断开 SSH。")
    try:
        chan.close()
        ssh.close()
    except Exception:
        pass


if __name__ == "__main__":
    main()
