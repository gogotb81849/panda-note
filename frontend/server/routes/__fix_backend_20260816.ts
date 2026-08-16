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
const DEPLOY_DIR = '/www/wwwroot/nav-log-system'

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
  log.push(`DEPLOY_DIR=${DEPLOY_DIR}`)

  // 0) 检查目录
  const backendDir = join(DEPLOY_DIR, 'backend')
  const mainJs = join(backendDir, 'dist', 'main.js')
  if (!existsSync(mainJs)) {
    log.push(`ERROR: ${mainJs} not found — backend dist not deployed?`)
    return new Response(log.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
  log.push(`✅ Found ${mainJs}`)

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
  log.push('\n--- Waiting 8s for backend to start... ---')
  execSync('sleep 8', { timeout: 15_000 })

  // 6) 检查后端健康
  log.push('\n--- Health check ---')
  try {
    const healthRes = execSync('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 http://localhost:3002/api/ops/health', { encoding: 'utf-8', timeout: 15_000 })
    log.push(`Backend health: HTTP ${healthRes}`)
    if (healthRes.trim() === '200') {
      log.push('✅✅✅ BACKEND IS ALIVE! ✅✅✅')
    } else {
      log.push('⚠️ Backend still not responding 200, checking PM2 logs...')
      run('pm2 logs nav-log-backend --lines 30 --nostream 2>&1 || true')
    }
  } catch (e: any) {
    log.push(`Health check failed: ${e.message}`)
    log.push('\n--- PM2 logs (last 30 lines) ---')
    run('pm2 logs nav-log-backend --lines 30 --nostream 2>&1 || true')
  }

  // 7) 最终 PM2 状态
  log.push('\n--- PM2 status after fix ---')
  run('pm2 ls 2>&1 || true')

  log.push(`\n[done] ${new Date().toISOString()}`)

  return new Response(log.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
})
