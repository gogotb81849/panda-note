#!/usr/bin/env node
/**
 * ⚠️ Deploy self-heal: npm run postinstall 时自动触发（部署流程触发）
 *
 * 触发时机：
 *   Deploy job Step[3/5]: cd $DEPLOY_DIR/backend && npm install --omit=dev
 *     → npm postinstall
 *     → 本脚本执行（注意 postinstall 也会在 frontend npm install 时触发，frontend 没这脚本）
 *
 * 目的：强制 pm2 delete 旧进程（它们的 cwd 可能是错的，沿用了历史 deploy 目录）
 *       保证后续 Step[5/5] 的 fallback "pm2 start dist/main.js" 必然走
 *       而 Step[5/5] 执行时 shell 的 cwd 就是正确的 $DEPLOY_DIR/backend → PM2 记录的 cwd 也正确
 *
 * 安全：本文件在 Build job (ubuntu-latest) 执行 npm install 时也会触发，所以必须判断：
 *   ① process.cwd() 里包含正确的部署路径片段 (/www/wwwroot/nav-log-system)
 *   ② 系统里存在 pm2 命令
 *   否则直接 return，什么都不做（保证 Build job 不被影响）
 */
const fs = require('fs');
const { execSync } = require('child_process');

const CWD = process.cwd();
const SERVER_CWD_SIGNAL = '/www/wwwroot/nav-log-system';

let serverEnv = false;
try {
  // 只有服务器目录才处理
  if (CWD.replace(/\\/g, '/').includes(SERVER_CWD_SIGNAL)) {
    serverEnv = true;
  }
  // 进一步保险：check DEPLOY_DIR 存在
  if (serverEnv && !fs.existsSync(SERVER_CWD_SIGNAL)) {
    serverEnv = false;
  }
  // check pm2
  if (serverEnv) {
    try {
      execSync('which pm2', { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (_) {
      serverEnv = false;
    }
  }
} catch (_) {
  serverEnv = false;
}

if (!serverEnv) {
  console.log('[pm2-self-heal] 非服务器环境（Build job / 本机），跳过。');
  process.exit(0);
}

console.log('[pm2-self-heal] 检测到服务器部署环境 → 执行 pm2 delete 清理旧进程');

function safeRun(cmd) {
  try {
    const out = execSync(cmd + ' 2>&1 || true', { encoding: 'utf-8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(`  $ ${cmd}\n  ${out.trim().split('\n').join('\n  ')}`);
  } catch (e) {
    console.log(`  $ ${cmd} → 安全忽略: ${String(e.message || e)}`);
  }
}

// 1) 删进程（保证 fallback start 被触发，cwd 就是正确 DEPLOY_DIR）
safeRun('pm2 delete nav-log-backend');
safeRun('pm2 delete nav-log-frontend');
// 2) 等待 3s 让 PM2 清干净
try { require('child_process').execSync('sleep 3', { stdio: 'ignore' }); } catch(_) {}
// 3) pm2 save（防止老进程被 resurrect 回来）
safeRun('pm2 save');

console.log('[pm2-self-heal] 完成。下一步 Deploy Step[5/5] 将使用正确 cwd 启动。');
process.exit(0);
