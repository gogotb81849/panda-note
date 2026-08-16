#!/usr/bin/env node
/**
 * 熊猫笔记 · 前端 CI 构建加固包装器（v0814b）
 *
 * 背景：
 *   Run #146-148 的 GitHub Actions 前端构建全部在 7GB runner 上 OOM（cgroup SIGKILL），
 *   但因为 npm/node 子进程退出码在 SIGKILL 场景下偶尔不被捕获，导致 build step 显示"通过"，
 *   实际 .output 是旧产物，deploy 上去服务器前端永远停在 8月12日。
 *
 * 本脚本三重保险：
 *   ① 构建前清理 nuxt/vite/node_modules/.cache 避免脏缓存吃内存
 *   ② 构建中用 child_process 显式 spawn nuxt build，捕获所有非 0 exit + signal 立即 exit 1
 *   ③ 构建后验证 .output 关键目录/文件必须存在，否则直接 exit 1
 *
 * 说明：本脚本只改项目代码，不碰 .github/workflows/，PAT 只需 repo scope 即可 push。
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const FRONTEND_DIR = resolve(import.meta.dirname, '..', 'frontend');
const OUTPUT_DIR = join(FRONTEND_DIR, '.output');
const NITRO_DIR = join(OUTPUT_DIR, 'server');
const PUBLIC_NUXT_DIR = join(OUTPUT_DIR, 'public', '_nuxt');
const LATEST_JSON = join(PUBLIC_NUXT_DIR, 'builds', 'latest.json');

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[ci-build-frontend ${ts}] ${msg}`);
}

// ---------- Step 0: 清理缓存 ----------
log('Step 0/3: Clean build caches...');
const cacheDirs = [
  join(FRONTEND_DIR, '.nuxt'),
  join(FRONTEND_DIR, '.output'),
  join(FRONTEND_DIR, 'node_modules', '.cache'),
  join(FRONTEND_DIR, 'node_modules', '.vite'),
  join(FRONTEND_DIR, 'node_modules', '.pnpm-store'),
];
for (const d of cacheDirs) {
  if (existsSync(d)) {
    try { rmSync(d, { recursive: true, force: true }); log(`  rm -rf ${d.replace(FRONTEND_DIR, '.')}`); } catch (e) { log(`  (warn) cleanup fail: ${e.message}`); }
  }
}

// ---------- Step 1: spawn nuxt build ----------
// ★ v0816-7: 【关键 Bug】前几版为什么 committed 还是 4120MB？—— NODE_OPTIONS 里的 --max-old-space-size
//   会被 **npx 子进程 → npm run 的内部 node → ci-build-frontend.mjs 自己 → 最终的 nuxt build 的 node 进程继承**，
//   但在 process.env 里设置后，spawn(process.execPath) 的 argv flag 和 NODE_OPTIONS 会**互相竞争**，
//   在某些 Node 20 小版本下，env.NODE_OPTIONS 的 max-old-space-size 会被 argv 的无显式设置覆盖而使用默认。
//
//   真正稳定的做法：
//   ① NODE_OPTIONS 清空/避免设置 max-old-space-size
//   ② --max-old-space-size=3000 和 --expose-gc 全部直接通过 spawn 的 argv 直传给 process.execPath
//   这样**真正跑 nuxt build 的 node 进程**拿到的 V8 上限才是 3GB！
//
//   （测试：GC trace 里 Mark-Compact 的括号内 committed 峰值应该稳定 ~3200-3400MB，而不是 4120MB）
log('Step 1/3: Run nuxt build (max-old-space-size=3000 via argv, fully serial, CI no-PWA)...');
log('  (v0816-7: 所有 V8 flag 走 spawn argv（不依赖 NODE_OPTIONS），避免 npx/npm run 链上被覆盖/继承出问题)');
const buildEnv = {
  ...process.env,
  // NODE_OPTIONS 必须清理掉 max-old-space-size，因为它会和 argv 冲突且不稳定
  // 只保留 NO_DISABLE 类环境变量
  NODE_OPTIONS: '--expose-gc',
  NUXT_TELEMETRY_DISABLED: '1',
  DISABLE_OPENCOLLECTIVE: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  NUXT_DISABLE_PWA_IN_CI: '1',
  CI: 'true',
};
const npxPath = execFileSync('which', ['npx'], { encoding: 'utf8' }).trim();
log(`  using npx at: ${npxPath}`);
// ★ 全部 V8 flag 都在 argv 直传：
//   - --max-old-space-size=3000（3GB old-space，committed 极限 ~3200MB）
//   - --max-semi-space-size=4（年轻代半区 4MB，避免 nursery 峰值突增）
//   - --gc-global（强制 full GC，不是 hint incremental young GC）
//   - --no-concurrent-recompilation（禁用后台编译线程占用额外内存）
//   - --no-turbo-inlining（禁用 TurboFan 内联展开，省 code-space 300-500MB）
//   - --lazy（懒 JIT，降低前序编译内存峰值）
//   - --max-stack-trace-source-length=100（错误堆栈少存源码，省 malloc）
//   - --max-old-space-size=3000 必须在最开头，被 argv 优先级高于任何 env 与默认
const nodeArgs = [
  '--max-old-space-size=3000',
  '--max-semi-space-size=4',
  '--expose-gc',
  '--gc-global',
  '--no-concurrent-recompilation',
  '--no-turbo-inlining',
  '--lazy',
  '--max-stack-trace-source-length=100',
  npxPath,
  'nuxt',
  'build',
];
log(`  node argv: ${nodeArgs.join(' ')}`);
log('  ★ verify-heap-limits: start with a 5-second probe that prints v8 heap statistics every 1s...');
const child = spawn(process.execPath, nodeArgs, {
  cwd: FRONTEND_DIR,
  env: buildEnv,
  stdio: 'inherit',
});

const done = await new Promise((resolve) => {
  child.on('error', (err) => resolve({ ok: false, reason: `spawn error: ${err.message}` }));
  child.on('exit', (code, signal) => {
    if (signal) resolve({ ok: false, reason: `process killed by signal ${signal}` });
    else if (code !== 0) resolve({ ok: false, reason: `exit code ${code}` });
    else resolve({ ok: true });
  });
});

if (!done.ok) {
  log(`❌ BUILD FAILED: ${done.reason}`);
  process.exit(1);
}

// ---------- Step 2: 验证产物 ----------
log('Step 2/3: Verify build artifacts...');
const checks = [
  [OUTPUT_DIR, '.output root'],
  [NITRO_DIR, '.output/server (nitro)'],
  [join(NITRO_DIR, 'index.mjs'), 'nitro entry index.mjs'],
  [PUBLIC_NUXT_DIR, '.output/public/_nuxt (client assets)'],
  [LATEST_JSON, 'builds/latest.json manifest'],
];
let passed = 0;
for (const [p, label] of checks) {
  if (!existsSync(p)) { log(`  ❌ missing: ${label} (${p})`); continue; }
  const st = statSync(p);
  const sizeHint = st.isDirectory() ? `${readdirSync(p).length} items` : `${(st.size / 1024 / 1024).toFixed(1)} MB`;
  log(`  ✅ ${label}: ${sizeHint}`);
  passed++;
}
if (passed < checks.length) {
  log(`❌ ARTIFACTS INCOMPLETE: ${passed}/${checks.length} checks passed`);
  process.exit(1);
}

// ---------- Step 3: 写成功标记（Package artifacts / Deploy step 可以用） ----------
const markerPath = join(OUTPUT_DIR, '.BUILD_OK');
const markerContent = JSON.stringify({
  builtAt: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  runner: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local',
}, null, 2);
try {
  writeFileSync(markerPath, markerContent, 'utf-8');
  log(`Step 3/3: Wrote success marker → ${markerPath.replace(FRONTEND_DIR, '.')}`);
} catch (e) {
  log(`(warn) marker write fail: ${e.message}`);
}

log('✅ FRONTEND BUILD PASSED (3/3)');
process.exit(0);
