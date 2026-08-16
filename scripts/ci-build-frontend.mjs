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
// ★ v0816-6: runner 7GB 实测极限：OS + runner + 进程 ≈ 3GB → node 进程最多 ~3.2GB RSS（不是 V8 old-space）
//   V8 committed = old-space + code-space + nursery + malloc = 3GB old-space → ~3.3GB RSS
//   → 所以 old-space=3072（3GB）才能真正压在 cgroup kill 阈值下。
log('Step 1/3: Run nuxt build (max-old-space-size=3072, fully serial, CI no-PWA)...');
log('  (v0816-6: V8 committed ~3.2GB → RSS ~3.4GB，留 3.6GB 给 runner OS；不能加 --jitless 因为 Vite/Rollup 需要 WASM)');
log('  (add node flags: --gc-global --no-concurrent-recompilation --no-turbo-inlining --lazy --max-stack-trace-source-length=100)');
const buildEnv = {
  ...process.env,
  NODE_OPTIONS: '--max-old-space-size=3072 --max-semi-space-size=4 --expose-gc',
  NUXT_TELEMETRY_DISABLED: '1',
  DISABLE_OPENCOLLECTIVE: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  NUXT_DISABLE_PWA_IN_CI: '1',
  CI: 'true',
};
// 找到 npx 的真实位置，然后用 node 直接启动：node [v8 flags] $(which npx) nuxt build
// （如果直接 spawn('npx', ...) 会丢失 v8 flag，因为 shebang #!/usr/bin/env node 不会带 argv flag）
const npxPath = execFileSync('which', ['npx'], { encoding: 'utf8' }).trim();
log(`  using npx at: ${npxPath}`);
const nodeArgs = [
  '--gc-global',
  '--no-concurrent-recompilation',
  '--no-turbo-inlining',
  '--lazy',
  '--max-stack-trace-source-length=100',
  // ★ v0816-6 不能加 --jitless：Vite 的 Rollup/terser 等依赖 WebAssembly
  //    jitless 运行时会禁用 WASM → 直接 Exit prior to config file resolving
  npxPath,
  'nuxt',
  'build',
];
log(`  node argv: ${nodeArgs.join(' ')}`);
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
