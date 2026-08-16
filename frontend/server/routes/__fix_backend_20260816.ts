/**
 * ★ 紧急修复路由：后端 PM2 进程宕机时，通过前端 Nuxt 服务器执行 PM2 重启
 *
 * 背景：后端完全宕机（502），后端自修复接口 /api/_fix_pm2_20260806 也无法访问。
 * 此路由运行在前端 Nuxt 服务器上（仍在运行），可以直接在服务器上执行 PM2 命令。
 *
 * 用法：GET /__fix_backend_20260816?token=Pm2FixToken_2026Aug06_x9K2m7Qp5zR4tV1wN8hB3cL6sY0jF4gD
 *
 * 安全：需要正确的 token，否则返回 404（避免被扫描发现）
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const FIX_TOKEN = 'Pm2FixToken_2026Aug06_x9K2m7Qp5zR4tV1wN8hB3cL6sY0jF4gD'

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
          deployDir = cwd.replace(/\/frontend$/, '')
          backendDir = join(deployDir, 'backend')
        }
      }
    }
  } catch (e: any) {
    log.push(`  pm2 jlist failed: ${e.message}`)
  }

  // 方法2：在候选目录中查找
  if (!backendDir || !existsSync(join(backendDir, 'dist', 'main.js'))) {
    log.push('\n--- Searching candidate directories ---')
    for (const dir of candidateDirs) {
      const mainJs = join(dir, 'backend', 'dist', 'main.js')
      log.push(`  Checking: ${mainJs}`)
      if (existsSync(mainJs)) {
        deployDir = dir
        backendDir = join(dir, 'backend')
        log.push(`  ✅ FOUND! deployDir=${deployDir}`)
        break
      }
    }
  }

  // 方法3：用 find 命令搜索（兜底）
  if (!backendDir || !existsSync(join(backendDir, 'dist', 'main.js'))) {
    log.push('\n--- Using find to search for dist/main.js ---')
    try {
      const found = execSync('find /www /opt /home /var /srv -path "*/backend/dist/main.js" -type f 2>/dev/null | head -5', { encoding: 'utf-8', timeout: 30_000 }).trim()
      if (found) {
        const lines = found.split('\n')
        for (const line of lines) {
          if (line && existsSync(line)) {
            backendDir = line.replace('/dist/main.js', '')
            deployDir = backendDir.replace(/\/backend$/, '')
            log.push(`  ✅ FOUND via find! deployDir=${deployDir} backendDir=${backendDir}`)
            break
          }
        }
      }
    } catch (e: any) {
      log.push(`  find failed: ${e.message}`)
    }
  }

  if (!backendDir || !existsSync(join(backendDir, 'dist', 'main.js'))) {
    log.push('\n❌ ERROR: Could not find backend dist/main.js anywhere!')
    log.push('\n--- PM2 process list ---')
    run('pm2 ls 2>&1 || true')
    log.push('\n--- Searching for main.js in common dirs ---')
    run('find /www /opt /home -name "main.js" -path "*/backend/dist/*" 2>/dev/null | head -10 || true')
    log.push(`\n[done] ${new Date().toISOString()}`)
    return new Response(log.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const mainJs = join(backendDir, 'dist', 'main.js')
  log.push(`\n✅ Backend found at: ${mainJs}`)
  log.push(`deployDir=${deployDir}`)
  log.push(`backendDir=${backendDir}`)

  // 1) 查看当前 PM2 状态
  log.push('\n--- PM2 status before fix ---')
  run('pm2 ls 2>&1 || true')

  // 2) 删除旧的后端进程（清除可能过时的 cwd 配置）
  log.push('\n--- Deleting stale nav-log-backend ---')
  run('pm2 delete nav-log-backend 2>/dev/null || true')

  // 3) 重新启动后端，显式指定 --cwd
  log.push('\n--- Starting nav-log-backend with explicit --cwd ---')
  run(`cd "${backendDir}" && pm2 start dist/main.js --name nav-log-backend --cwd "${backendDir}" --node-args="--max-old-space-size=512"`)

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
