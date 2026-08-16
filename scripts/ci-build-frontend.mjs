#!/usr/bin/env node
/**
 * 熊猫笔记 · 前端 CI 构建加固包装器
 *
 * 本脚本三重保险：
 *   ① 构建前清理 nuxt/vite/node_modules/.cache 避免脏缓存吃内存
 *   ② 构建中用 child_process 显式 spawn nuxt build，捕获所有非 0 exit + signal 立即 exit 1
 *   ③ 构建后验证 .output 关键目录/文件必须存在，否则直接 exit 1
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

// // ====== v10-v20 旧版配置（已全部注释掉，运行成功后删除）====================================
// // ---------- Step 0: 清理缓存 ----------
// log('Step 0/3: Clean build caches...');
// // （原 Step 0 清理缓存：保留，但用 v21 重写版）
// // ====== 以上全部注释掉 ========================================================================

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
// // ====== v10-v20 旧版配置（已全部注释掉，运行成功后删除）====================================
// log('Step 1/3: Run nuxt build (max-old-space-size=8192 + gc-interval=100, CI no-PWA)...');
// log('  (v0816-19: 18轮证明 used 紧跟 old-space！V8 GC 太懒→垃圾堆积。gc-interval=100 强制每 50MB GC 一次)');
// const buildEnv = {
//   ...process.env,
//   NODE_OPTIONS: '--max-old-space-size=8192 --max-semi-space-size=8 --expose-gc --gc-interval=100 --gc-global',
//   NUXT_TELEMETRY_DISABLED: '1',
//   DISABLE_OPENCOLLECTIVE: '1',
//   NEXT_TELEMETRY_DISABLED: '1',
//   NUXT_DISABLE_PWA_IN_CI: '1',
//   CI: 'true',
// };
// const nodeArgs = [
//   '--max-old-space-size=8192',
//   '--max-semi-space-size=8',
//   '--expose-gc',
//   '--gc-global',
//   '--gc-interval=100',
//   '--no-concurrent-recompilation',
//   '--no-turbo-inlining',
//   '--lazy',
//   '--max-stack-trace-source-length=100',
//   npxPath,
//   'nuxt',
//   'build',
// ];
// // ====== 以上全部注释掉 ========================================================================

// ★ v21 干净版：只给 --max-old-space-size=6144（配合 .npmrc），其他 V8 flag 全不用，让 V8 用默认策略
log('Step 1/3: Run nuxt build (v21 干净版 → NODE_OPTIONS=--max-old-space-size=6144)...');
log('  (old-space 选 6144 = 6GB：v16(4096) V8 FATAL used=3820 / v18(8192) SIGKILL → 6GB 在中间)');
const buildEnv = {
  ...process.env,
  NODE_OPTIONS: '--max-old-space-size=6144',
  NUXT_TELEMETRY_DISABLED: '1',
  DISABLE_OPENCOLLECTIVE: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  NUXT_DISABLE_PWA_IN_CI: '1',
  CI: 'true',
};
const npxPath = execFileSync('which', ['npx'], { encoding: 'utf8' }).trim();
log(`  using npx at: ${npxPath}`);
log(`  buildEnv.NODE_OPTIONS = ${buildEnv.NODE_OPTIONS}`);
const nodeArgs = [
  '--max-old-space-size=6144',
  npxPath,
  'nuxt',
  'build',
];
log(`  outer node argv: ${nodeArgs.join(' ')}`);
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

// ---------- Step 3: 写成功标记 ----------
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
