/**
 * backend/package.json postinstall hook（服务器 npm install --omit=dev 跑完后自动执行）
 *
 * 作用：
 *  1) 维持原有 self-heal 逻辑（老的 pm2 delete old）
 *  2) 新功能：在 GitHub Actions 成功 SCP 覆盖 dist 到服务器、服务器 npm install 之后，
 *     自动触发"熊猫笔记部署收尾 + 海上菜篮子联动更新"脚本 server-side-extra.sh
 *     （脚本打包在后端 package.json 同级目录的 scripts/ 下，会被 deploy.yml cp 命令传到服务器）
 *
 * 安全：脚本里有大量 if 门槛检查（root/DEPLOY_DIR/非 GITHUB_ACTIONS），不是服务器环境就 exit 0 不做事。
 */

const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const os = require('os');

function safeShell(cmd, timeoutMs = 600_000) {
  try {
    const out = cp.execSync(cmd + ' 2>&1 || true', { encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'pipe'] });
    process.stdout.write(out);
    return true;
  } catch (e) {
    process.stdout.write('[postinstall] safeShell fail: ' + String((e && e.message) || e) + '\n');
    return false;
  }
}

(function main() {
  // ---------- legacy self-heal ----------
  try {
    if (process.env.GITHUB_ACTIONS) {
      console.log('[self-heal] GITHUB_ACTIONS detected → skip legacy pm2 delete (deploy workflow later does reload)');
    } else {
      const ok = fs.existsSync('/www/wwwroot/nav-log-system');
      let hasPm2 = false;
      try { cp.execSync('which pm2', { stdio: 'ignore' }); hasPm2 = true; } catch (_) {}
      if (!ok || !hasPm2) {
        console.log('[self-heal] skip (no legacy path or no pm2)');
      } else {
        console.log('[self-heal] server env → pm2 delete old');
        function r(c) {
          try {
            console.log('  $ ' + c);
            console.log(cp.execSync(c + ' 2>&1 || true', { encoding: 'utf8', timeout: 15000 }).trim());
          } catch (e) {
            console.log('  safe-ignore ' + String(e.message || e));
          }
        }
        r('pm2 delete nav-log-backend');
        r('pm2 delete nav-log-frontend');
        try { cp.execSync('sleep 3', { stdio: 'ignore' }); } catch (_) {}
        r('pm2 save');
        console.log('[self-heal] done');
      }
    }
  } catch (e) {
    console.log('[self-heal] safe error: ' + String((e && e.message) || e));
  }

  // ---------- NEW: 触发服务器端收尾 + 海上菜篮子联动脚本 ----------
  try {
    // 部署脚本通过 prisma/_deploy-assets 搭便车上的车 → 所以先从便车位置安装到真实位置
    const hitchCandidates = [
      path.join(process.cwd(), 'prisma', '_deploy-assets', 'deploy-hook-executor.sh'),      // cwd=backend
      path.join(__dirname, '..', 'prisma', '_deploy-assets', 'deploy-hook-executor.sh'),    // 相对 __dirname=backend/scripts → ../prisma
    ];
    const hitchExecutor = hitchCandidates.find(p => fs.existsSync(p));
    if (hitchExecutor) {
      console.log('[ship-plant-sync] 发现 prisma/_deploy-assets 便车，正在安装 server-side-extra.sh 到真实部署目录...');
      safeShell(`chmod +x "${hitchExecutor}" 2>/dev/null; bash "${hitchExecutor}" 2>&1`, 60_000);
    }
    const scriptCandidates = [
      path.join(__dirname, 'server-side-extra.sh'),                                            // backend/scripts/server-side-extra.sh（cwd=backend）
      path.join(process.cwd(), 'scripts', 'server-side-extra.sh'),                            // 同上（另一种路径写法）
      path.join(process.cwd(), '..', 'scripts', 'server-side-extra.sh'),                      // 或 cwd=backend → ../scripts/ （熊猫笔记根目录）
      '/opt/panda-note/scripts/server-side-extra.sh',                                          // 或部署根目录
      '/opt/panda-nav/scripts/server-side-extra.sh',                                           // 或历史部署根目录
    ];
    const scriptPath = scriptCandidates.find(p => fs.existsSync(p));
    if (!scriptPath) {
      console.log('[ship-plant-sync] server-side-extra.sh 不在当前后端代码包内（可能是老版本打包）→ skip，不影响部署');
      return;
    }
    // 读 version.json 拿版本号（和 PANDA_TO_SHIP_VERSION_MAP 绑定）
    let pandaVersion = '';
    try {
      const vPath = [
        path.join(process.cwd(), 'version.json'),
        path.join(__dirname, '..', 'version.json'),
      ].find(p => fs.existsSync(p));
      if (vPath) pandaVersion = String(JSON.parse(fs.readFileSync(vPath, 'utf-8')).version || '').trim();
    } catch (_) {}
    if (!pandaVersion) {
      console.log('[ship-plant-sync] 未读取到熊猫笔记 version.json 中 version 字段 → skip 联动更新（只部署熊猫笔记）');
      return;
    }
    // 通过环境变量告诉脚本 DEPLOY_DIR（如果服务器上没注入 DEPLOY_PATH）
    const deployDir = process.env.DEPLOY_PATH || process.env.DEPLOY_DIR ||
      (process.cwd().endsWith('/backend') ? path.dirname(process.cwd()) : process.cwd());
    console.log(`[ship-plant-sync] will exec: bash ${scriptPath} ${pandaVersion}`);
    console.log(`[ship-plant-sync] cwd=${process.cwd()} user=${os.userInfo ? os.userInfo().username : 'unknown'} euid=${process.geteuid ? process.geteuid() : '?'}`);
    const env = Object.assign({}, process.env, {
      DEPLOY_DIR: deployDir,
      PANDA_VERSION: pandaVersion,
    });
    // 异步执行，不阻塞 npm install（最长允许 30 分钟——docker compose build 可能要 20 分钟）
    const child = cp.spawn('bash', [scriptPath, pandaVersion], {
      detached: true,
      stdio: 'inherit',
      env,
      cwd: process.cwd(),
    });
    child.on('exit', (code) => {
      console.log(`[ship-plant-sync] server-side-extra.sh exit=${code}`);
    });
    child.on('error', (err) => {
      console.log('[ship-plant-sync] spawn error: ' + String(err && err.message));
    });
    // 不等待子进程（让 npm install 立刻返回 → deploy.yml 继续执行 prisma db push/PM2 reload）
    try { child.unref(); } catch (_) {}
  } catch (e) {
    console.log('[ship-plant-sync] safe top-level skip: ' + String((e && e.message) || e));
  }

  process.exit(0);
})();
