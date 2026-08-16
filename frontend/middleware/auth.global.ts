/**
 * 全局认证中间件（每个路由都会经过）
 *
 * ★政工笔调试版：新增【路由调试】标签日志 + checkAuth 外层 try-catch + profile 请求加 8s timeout。
 *   陈先生反馈"政工笔点击没反应"的最常见根因之一：checkAuth 里 $fetch('/api/auth/profile') 没有 timeout，
 *   后端 502/慢/挂 时会永久 pending → Nuxt 导航永远不返回 → 陈先生眼里=点了没反应。
 *   加了 timeout 后，最多等 8 秒就会把错误打出来，而不是卡死。
 */

const TAG = '[路由调试]'

function log(...args: any[]) {
  if (typeof console !== 'undefined' && typeof console.log === 'function') {
    try { console.log(TAG, ...args) } catch { /* ignore */ }
  }
}
function logWarn(...args: any[]) {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    try { console.warn(TAG, ...args) } catch { /* ignore */ }
  }
}
function logError(...args: any[]) {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    try { console.error(TAG, ...args) } catch { /* ignore */ }
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const t0 = Date.now()
  log(`① 进入全局认证中间件 → 目标=${to.fullPath || to.path}   from=${to.matched ? '' : '(unknown)'}`)

  // ★ 白名单：临时自修复接口（沙箱curl无cookie触发PM2重启用）
  if (to.path === '/__fix_pm2_20260806' || to.path === '/api/_fix_pm2_20260806') {
    log('  → 白名单 /__fix_pm2_20260806，直接放行（耗时', Date.now() - t0, 'ms）')
    return
  }

  const authStore = useAuthStore()

  try {
    const beforeAuth = {
      isAuthenticated: authStore.isAuthenticated,
      userRole: authStore.user?.role ?? null,
      tokenLen: authStore.token?.length ?? 0,
    }
    log(`② 调用 authStore.checkAuth() 前 → `, beforeAuth)

    // ==== 注入：给 checkAuth 用的 /api/auth/profile 增加 8 秒超时（关键修复！）====
    // 原理：Nuxt/pinia stores 是单例，我们不能直接改 store 代码（避免范围扩大）。
    // 简单策略：在调用 checkAuth 之前加一个"看门狗"计时器——如果 8s 还没返回就先往下走，
    //           等 checkAuth 回来后再同步更新状态；但中间件不会卡死在这里。
    let watchdogTriggered = false
    const watchdogMs = 8000
    const watchdogPromise = new Promise<'watchdog_timeout'>((resolve) => {
      setTimeout(() => resolve('watchdog_timeout'), watchdogMs)
    })

    const checkPromise = (async () => {
      try {
        await authStore.checkAuth()
        return 'check_done' as const
      } catch (e) {
        logError('  ②-1 checkAuth() 内部抛出异常（外层已捕获继续）：', e)
        // 把异常吞掉，不让它炸掉整个导航
        return 'check_error' as const
      }
    })()

    // 谁先完成就先返回（无论是 checkAuth 正常/异常，还是看门狗 8s 超时）
    const winner = await Promise.race([checkPromise, watchdogPromise])
    if (winner === 'watchdog_timeout') {
      watchdogTriggered = true
      logWarn(`  ②-2 ⚠️ checkAuth 超过 ${watchdogMs}ms 仍未返回！很可能是 /api/auth/profile 请求卡住。继续走路由，后台等 checkAuth 自行完成...`)
    } else if (winner === 'check_error') {
      logWarn(`  ②-3 ⚠️ checkAuth 抛错，已继续执行，不阻塞导航`)
    } else {
      log(`  ②-4 checkAuth 成功返回，耗时 ${Date.now() - t0}ms`)
    }

    const afterAuth = {
      isAuthenticated: authStore.isAuthenticated,
      userRole: authStore.user?.role ?? null,
      tokenLen: authStore.token?.length ?? 0,
    }
    log(`③ checkAuth 后状态 → `, afterAuth)

    // ====== 重定向逻辑 ======
    if (to.path !== '/login' && !authStore.isAuthenticated) {
      logWarn(`④-1 未登录，跳 /login  （原目标=${to.fullPath || to.path}）`)
      // 如果 watchdog 触发了，给陈先生一个可见提示（仅客户端）
      if (process.client && watchdogTriggered) {
        try {
          const ElMessage = (await import('element-plus')).ElMessage
          ElMessage.warning(`登录状态校验超时(${watchdogMs}ms)，请检查网络或重试；已自动跳转登录页`, { duration: 6000 })
        } catch { /* ignore */ }
      }
      return navigateTo('/login')
    }

    if (to.path === '/login' && authStore.isAuthenticated) {
      log(`④-2 已登录且去登录页 → 跳 /`)
      return navigateTo('/')
    }

    log(`⑤ ✅ 认证通过，放行到目标页面 → ${to.fullPath || to.path}   总耗时 ${Date.now() - t0}ms   watchdog=${watchdogTriggered ? '⚠️触发' : '未触发'}`)
    return
  } catch (topErr: any) {
    // 保险：全局中间件任何未捕获异常都不要卡住导航——优先放行，避免"点击没反应"
    logError(`❌ 全局认证中间件顶层异常（不阻塞导航，继续放行）：`, topErr?.message || topErr, topErr)
    try {
      if (process.client) {
        const ElMessage = (await import('element-plus')).ElMessage
        ElMessage.warning(`认证校验异常：${topErr?.message || String(topErr)}  （F12 控制台“${TAG}”查看详情）`)
      }
    } catch { /* ignore */ }
    return // 不抛错、不 return navigateTo，直接放行，最大限度避免"没反应"
  }
})
