/**
 * ★ 紧急修复路由：后端 PM2 进程宕机时，通过前端 Nuxt 服务器执行 PM2 重启
 *
 * 背景：后端完全宕机（502），后端自修复接口 /api/_fix_pm2_20260806 也无法访问。
 * 此路由运行在前端 Nuxt 服务器上（仍在运行），可以直接在服务器上执行 PM2 命令。
 *
 * 关键修复（v2）：入口文件可能是 dist/main.js 或 dist/src/main.js
 *   （取决于 backend/tsconfig.json 的 rootDir 配置；当前 rootDir:"./" → 输出 dist/src/main.js）
 *   v1 版本第 151 行硬编码了 dist/main.js，导致找到正确路径却用错路径启动，PM2 仍 errored。
 *
 * 用法：GET /__fix_backend_20260816?token=Pm2FixToken_2026Aug06_x9K2m7Qp5zR4tV1wN8hB3cL6sY0jF4gD
 *
 * 安全：需要正确的 token，否则返回 404（避免被扫描发现）
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const FIX_TOKEN = 'Pm2FixToken_2026Aug06_x9K2m7Qp5zR4tV1wN8hB3cL6sY0jF4gD'

// 后端入口文件可能的相对路径（取决于 tsconfig rootDir）
const MAIN_JS_CANDIDATES = ['dist/main.js', 'dist/src/main.js']

/**
 * 在指定 backend 目录下查找入口文件，返回相对路径（如 'dist/src/main.js'），找不到返回 ''
 */
function findMainJs(backendDir: string): string {
  for (const p of MAIN_JS_CANDIDATES) {
    if (existsSync(join(backendDir, p))) return p
  }
  return ''
}

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string
  if (token !== FIX_TOKEN) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const log: string[] = []
  const run = (cmd: string): { code: number; out: string } => {
    log.push(`$ ${cmd}`)
    try {
      const out = execSync(cmd, { encoding: 'utf-8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] })
      log.push(out.trimEnd())
      return { code: 0, out }
    } catch (e: any) {
      const errMsg = [e.stdout?.toString() || '', e.stderr?.toString() || '', `exit code = ${e.status ?? 'unknown'}`]
        .filter(Boolean).join('\n').trimEnd()
      log.push(errMsg)
      return { code: e.status ?? 1, out: '' }
    }
  }

  log.push(`[start] ${new Date().toISOString()}`)

  // 0) 查找后端实际部署路径
  const candidateDirs = [
    '/www/wwwroot/nav-log-system',
    '/opt/panda-note',
    '/opt/panda-nav',
    '/home/panda-note',
    '/home/nav-log-system',
    '/var/www/panda-note',
    '/srv/panda-note',
  ]

  let deployDir = ''
  let backendDir = ''
  let mainJsRelative = ''

  // 方法1：从 PM2 现有进程信息中获取 cwd
  log.push('\n--- Trying to find backend from PM2 process info ---')
  try {
    const pm2Info = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf-8', timeout: 10_000 })
    const procs = JSON.parse(pm2Info)
    for (const p of procs) {
      if (p.name === 'nav-log-frontend' || p.name === 'nav-log-backend') {
        const cwd = p.pm2_env?.pm_cwd || p.pm2_env?.cwd || ''
        log.push(`  PM2 process ${p.name}: cwd=${cwd} status=${p.pm2_env?.status}`)
        if (p.name === 'nav-log-frontend' && cwd) {
          // 前端的 cwd 是 .../frontend，后端应该在 .../backend
          const guessedDeploy = cwd.replace(/\/frontend$/, '')
          const guessedBackend = join(guessedDeploy, 'backend')
          const entry = findMainJs(guessedBackend)
          if (entry) {
            deployDir = guessedDeploy
            backendDir = guessedBackend
            mainJsRelative = entry
            log.push(`  ✅ FOUND via PM2 frontend cwd! deployDir=${deployDir} entry=${entry}`)
          }
        }
        // backend 进程本身也可能有有效 cwd
        if (p.name === 'nav-log-backend' && cwd && !mainJsRelative) {
          const entry = findMainJs(cwd)
          if (entry) {
            backendDir = cwd
            deployDir = cwd.replace(/\/backend$/, '')
            mainJsRelative = entry
            log.push(`  ✅ FOUND via PM2 backend cwd! backendDir=${backendDir} entry=${entry}`)
          }
        }
      }
    }
  } catch (e: any) {
    log.push(`  pm2 jlist failed: ${e.message}`)
  }

  // 方法2：在候选目录中查找
  if (!mainJsRelative) {
    log.push('\n--- Searching candidate directories ---')
    for (const dir of candidateDirs) {
      const bDir = join(dir, 'backend')
      const entry = findMainJs(bDir)
      log.push(`  Checking: ${bDir} → ${entry || 'NOT FOUND'}`)
      if (entry) {
        deployDir = dir
        backendDir = bDir
        mainJsRelative = entry
        log.push(`  ✅ FOUND! deployDir=${deployDir} entry=${entry}`)
        break
      }
    }
  }

  // 方法3：用 find 命令搜索（兜底）—— 同时搜索 dist/main.js 和 dist/src/main.js
  if (!mainJsRelative) {
    log.push('\n--- Using find to search for backend entry (dist/main.js OR dist/src/main.js) ---')
    try {
      const found = execSync(
        'find /www /opt /home /var /srv \\( -path "*/backend/dist/main.js" -o -path "*/backend/dist/src/main.js" \\) -type f 2>/dev/null | head -10',
        { encoding: 'utf-8', timeout: 30_000 },
      ).trim()
      if (found) {
        const lines = found.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !existsSync(trimmed)) continue
          // line 形如 .../backend/dist/main.js 或 .../backend/dist/src/main.js
          const match = trimmed.match(/^(.*\/backend\/dist)((?:\/src)?\/main\.js)$/)
          if (match) {
            backendDir = match[1].replace(/\/dist$/, '')
            deployDir = backendDir.replace(/\/backend$/, '')
            mainJsRelative = `dist${match[2]}`
            log.push(`  ✅ FOUND via find! deployDir=${deployDir} backendDir=${backendDir} entry=${mainJsRelative}`)
            break
          }
        }
      }
    } catch (e: any) {
      log.push(`  find failed: ${e.message}`)
    }
  }

  if (!mainJsRelative || !backendDir) {
    log.push('\n❌ ERROR: Could not find backend entry (dist/main.js or dist/src/main.js) anywhere!')
    log.push('\n--- PM2 process list ---')
    run('pm2 ls 2>&1 || true')
    log.push('\n--- Searching for any main.js under backend/dist ---')
    run('find /www /opt /home -name "main.js" -path "*/backend/dist*" 2>/dev/null | head -10 || true')
    log.push(`\n[done] ${new Date().toISOString()}`)
    return new Response(log.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  log.push(`\n=== Backend located ===`)
  log.push(`deployDir=${deployDir}`)
  log.push(`backendDir=${backendDir}`)
  log.push(`mainJsRelative=${mainJsRelative}`)

  // 1) 查看当前 PM2 状态
  log.push('\n--- PM2 status before fix ---')
  run('pm2 ls 2>&1 || true')

  // 2) 删除旧的后端进程（清除可能过时/错误的 cwd 与入口配置）
  log.push('\n--- Deleting stale nav-log-backend ---')
  run('pm2 delete nav-log-backend 2>/dev/null || true')

  // 3) 重新启动后端，显式指定 --cwd 与正确入口文件（★ v2 修复：用 mainJsRelative 而非硬编码 dist/main.js）
  log.push(`\n--- Starting nav-log-backend with entry=${mainJsRelative} ---`)
  run(`cd "${backendDir}" && pm2 start ${mainJsRelative} --name nav-log-backend --cwd "${backendDir}" --node-args="--max-old-space-size=512"`)

  // 4) 保存 PM2
  run('pm2 save || true')

  // 5) 等待后端启动
  log.push('\n--- Waiting 10s for backend to start... ---')
  execSync('sleep 10', { timeout: 15_000 })

  // 6) 检查后端健康
  log.push('\n--- Health check ---')
  try {
    const healthRes = execSync('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 http://localhost:3002/api/ops/health', { encoding: 'utf-8', timeout: 15_000 })
    log.push(`Backend health: HTTP ${healthRes}`)
    if (healthRes.trim() === '200') {
      log.push('✅✅✅ BACKEND IS ALIVE! ✅✅✅')
    } else {
      log.push('⚠️ Backend still not responding 200, checking PM2 logs...')
      run('pm2 logs nav-log-backend --lines 50 --nostream 2>&1 || true')
    }
  } catch (e: any) {
    log.push(`Health check failed: ${e.message}`)
    log.push('\n--- PM2 logs (last 50 lines) ---')
    run('pm2 logs nav-log-backend --lines 50 --nostream 2>&1 || true')
  }

  // 7) 最终 PM2 状态
  log.push('\n--- PM2 status after fix ---')
  run('pm2 ls 2>&1 || true')

  log.push(`\n[done] ${new Date().toISOString()}`)

  return new Response(log.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
})
