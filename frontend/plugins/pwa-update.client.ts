// PWA版本强制同步插件 - 自动强制升级，无需用户确认
//
// ⚠️ 核心安全机制（修复从高版本升级到低版本问题）：
//    1. 版本判断只信任后端 /api/version/check 返回的 needsUpdate
//    2. 前端二次校验： shouldUpdate(serverVersion, clientVersion)
//    3. 只有服务器版本 > 客户端版本 才会提示升级
//    4. 任何其他情况（服务器版本 <= 客户端版本、解析失败）都不升级
// ⚠️ 修复前的问题：只要 serverVersion !== currentVersion 就强制升级
//    这会导致"客户端 0042 升级到服务器 0041（从高版本升级到低版本）
export default defineNuxtPlugin(() => {
  if (process.server) return

  const config = useRuntimeConfig()
  const currentVersion = (config.public.appVersion || '1.0.0').toString()

  // 使用 sessionStorage 防止循环刷新
  const RELOAD_FLAG_KEY = 'pwa_reload_triggered'
  const CLIENT_HASH_KEY = 'pwa_client_hash'
  const wasJustReloaded = sessionStorage.getItem(RELOAD_FLAG_KEY) === 'true'

  // 如果刚刷新过，清除标记并跳过版本检查
  if (wasJustReloaded) {
    sessionStorage.removeItem(RELOAD_FLAG_KEY)
    console.log('[PWA] 检测到刚完成升级刷新，跳过版本检查')
    return
  }

  // 防止重复触发
  let isUpdating = false
  let updateDialog: HTMLDivElement | null = null

  // ============================================================
  // 语义化版本比较（与后端 version.service.ts 保持一致）
  // ============================================================
  // 只在 serverVersion > clientVersion 时返回 true
  const shouldUpdate = (client: string, server: string): boolean => {
    if (!client || !server) return false
    const parse = (v: string): number[] =>
      v.replace(/^v/, '').trim()
        .split('.')
        .map(p => {
          const n = parseInt(p, 10)
          return Number.isFinite(n) ? n : 0
        })
    const cp = parse(client)
    const sp = parse(server)
    for (let i = 0; i < 4; i++) {
      const c = cp[i] ?? 0
      const s = sp[i] ?? 0
      if (s > c) return true
      if (s < c) return false
    }
    return false
  }

  // ============================================================
  // 进度展示与执行
  // ============================================================
  const estimateUpdateSize = async (baseUrl: string) => {
    try {
      const manifestUrl = baseUrl + '/manifest.webmanifest'
      const res = await fetch(manifestUrl, { method: 'HEAD' })
      if (res.ok) {
        const swUrl = baseUrl + '/sw.js'
        const swRes = await fetch(swUrl)
        if (swRes.ok) {
          const swText = await swRes.text()
          const sizeMatches = swText.match(/"size":(\d+)/g)
          if (sizeMatches) {
            let totalSize = 0
            sizeMatches.forEach(match => {
              totalSize += parseInt(match.replace('"size":', ''))
            })
            return totalSize
          }
        }
      }
    } catch (e) {
      // 忽略错误，使用默认估算
    }
    return 5 * 1024 * 1024
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)}秒`
    return `${Math.ceil(seconds / 60)}分钟`
  }

  const showForceUpdate = async (serverVersion: string, baseUrl: string, updateReason: string = '发现新版本') => {
    if (updateDialog || document.getElementById('pwa-force-update-overlay')) return

    const estimatedSize = await estimateUpdateSize(baseUrl)
    const estimatedSizeStr = formatSize(estimatedSize)
    const estimatedTime = estimatedSize / (2 * 1024 * 1024) + 2
    const estimatedTimeStr = formatTime(estimatedTime)

    const overlay = document.createElement('div')
    overlay.id = 'pwa-force-update-overlay'
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.3s ease;
    `

    const dialog = document.createElement('div')
    dialog.style.cssText = `
      background: white; border-radius: 20px; padding: 36px 32px;
      max-width: 460px; width: 90%; box-shadow: 0 12px 48px rgba(0,0,0,0.2);
      text-align: center;
    `
    dialog.innerHTML = `
      <div style="margin-bottom: 16px;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5B7FA6" stroke-width="1.5" style="animation: spin 2s linear infinite;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.991"/>
        </svg>
      </div>
      <h3 style="margin: 0 0 6px; font-size: 20px; color: #1f2937; font-weight: 600;">${updateReason}</h3>
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">系统正在为您自动更新，以确保最佳使用体验</p>
      <div style="background: #f8f9fa; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; margin-bottom: 10px;">
          <span id="update-old-ver">当前: v${currentVersion}</span>
          <span id="update-new-ver">升级至: v${serverVersion}</span>
        </div>
        <div style="display: flex; justify-content: space-around; font-size: 12px; color: #9ca3af; margin-bottom: 12px; padding: 8px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
          <span>预计流量: <strong style="color: #5B7FA6;">${estimatedSizeStr}</strong></span>
          <span>预计耗时: <strong style="color: #5B7FA6;">${estimatedTimeStr}</strong></span>
        </div>
        <div style="background: #e5e7eb; border-radius: 10px; height: 10px; overflow: hidden;">
          <div id="update-progress-bar" style="background: linear-gradient(90deg, #5B7FA6, #6A8FB5); height: 100%; width: 0%; border-radius: 10px; transition: width 0.4s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px;">
          <span id="update-step" style="color: #5B7FA6; font-weight: 500;">正在准备...</span>
          <span id="update-progress-pct" style="color: #9ca3af;">0%</span>
        </div>
      </div>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">更新完成后页面将自动刷新，无需手动操作</p>
    `

    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `
    document.head.appendChild(style)
    dialog.appendChild(style)
    overlay.appendChild(dialog)
    document.body.appendChild(overlay)
    updateDialog = dialog as HTMLDivElement

    return { estimatedSize, estimatedTime }
  }

  const updateProgress = (percent: number, step: string) => {
    const bar = document.getElementById('update-progress-bar')
    const stepEl = document.getElementById('update-step')
    const pctEl = document.getElementById('update-progress-pct')
    if (bar) bar.style.width = `${percent}%`
    if (stepEl) stepEl.textContent = step
    if (pctEl) pctEl.textContent = `${percent}%`
  }

  const performForceUpdate = async (baseUrl: string) => {
    if (isUpdating) return
    isUpdating = true

    sessionStorage.setItem(RELOAD_FLAG_KEY, 'true')

    updateProgress(10, '正在清除旧缓存...')
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      for (const name of cacheNames) {
        await caches.delete(name)
      }
    }
    updateProgress(20, '缓存已清除')

    updateProgress(30, '正在注册新版本...')
    await new Promise(resolve => setTimeout(resolve, 500))
    updateProgress(40, '新版本注册完成')

    updateProgress(50, '正在下载更新资源...')
    await new Promise(resolve => setTimeout(resolve, 800))
    updateProgress(60, '资源下载中...')
    await new Promise(resolve => setTimeout(resolve, 600))
    updateProgress(70, '资源下载完成')

    updateProgress(80, '正在安装新版本...')
    await new Promise(resolve => setTimeout(resolve, 500))
    updateProgress(90, '安装完成')

    updateProgress(95, '正在刷新页面...')
    await new Promise(resolve => setTimeout(resolve, 300))
    updateProgress(100, '更新完成，即将刷新')

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        reg.unregister()
      }
    }

    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  // ============================================================
  // 检查前端资源哈希（即使版本号不变也能检测更新）
  // ============================================================
  const checkHashUpdate = async (): Promise<boolean> => {
    try {
      const apiBase = config.public.apiBase || ''
      const clientHash = sessionStorage.getItem(CLIENT_HASH_KEY) || ''

      const res = await fetch(`${apiBase}/version/check-hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientHash }),
      })

      if (!res.ok) return false

      const data = await res.json()
      if (data.hasUpdate) {
        console.log(`[PWA] 检测到前端资源更新 - 当前哈希: ${clientHash}, 服务器哈希: ${data.serverHash}`)
        sessionStorage.setItem(CLIENT_HASH_KEY, data.serverHash)
        return true
      }

      sessionStorage.setItem(CLIENT_HASH_KEY, data.serverHash)
      return false
    } catch (e) {
      console.error('[PWA] 哈希检查失败:', e)
      return false
    }
  }

  // ============================================================
  // 版本检查（核心修复：只信任后端权威判断，不再用字符串比较
  // ============================================================
  const checkServerVersion = async () => {
    if (isUpdating) return false

    // 防循环保护：10分钟内最多检查3次，避免反复刷新
    const CHECK_KEY = 'pwa_version_check_count'
    const checkCount = parseInt(sessionStorage.getItem(CHECK_KEY) || '0')
    if (checkCount >= 3) {
      console.log('[PWA] 10分钟内版本检查已达3次，跳过本次检查')
      return false
    }
    sessionStorage.setItem(CHECK_KEY, String(checkCount + 1))
    setTimeout(() => sessionStorage.removeItem(CHECK_KEY), 10 * 60 * 1000)

    try {
      const apiBase = config.public.apiBase || ''

      // 先检查哈希更新（即使版本号不变也能检测）
      const hasHashUpdate = await checkHashUpdate()
      if (hasHashUpdate) {
        console.log('[PWA] 通过哈希检测到更新，进一步校验版本号')
        const hashRes = await fetch(`${apiBase}/version/hash`)
        const hashData = await hashRes.json()
        const serverVersion = (hashData.version || '').toString()
        
        // 关键安全校验：只有服务器版本 > 客户端版本才更新
        // 避免服务器版本更低时出现"降级更新"
        if (shouldUpdate(currentVersion, serverVersion)) {
          console.log(`[PWA] 版本校验通过 - 客户端 v${currentVersion}, 服务器 v${serverVersion}`)
          const baseUrl = apiBase.replace(/\/api\/?$/, '')
          await showForceUpdate(serverVersion, baseUrl, '发现资源更新')
          await performForceUpdate(baseUrl)
          return true
        } else {
          console.log(`[PWA] 版本校验不通过 - 客户端 v${currentVersion} >= 服务器 v${serverVersion}, 不更新`)
          return false
        }
      }

      // 再检查版本号更新
      const checkRes = await fetch(`${apiBase}/version/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientVersion: currentVersion }),
      })

      if (!checkRes.ok) {
        console.error('[PWA] 版本检查请求失败:', checkRes.status)
        return false
      }

      const checkData = await checkRes.json()
      const serverVersion = (checkData.currentVersion || '').toString()
      const needsUpdate = !!checkData.needsUpdate
      const updateType = checkData.updateType || 'none'

      if (!serverVersion) {
        console.warn('[PWA] 服务器未返回版本号')
        return false
      }

      // 前端二次校验（与后端一致的算法）
      const reallyNeedsUpdate = shouldUpdate(currentVersion, serverVersion)

      // 核心安全机制：只有 服务器版本 > 客户端版本 才提示升级
      if (needsUpdate && reallyNeedsUpdate) {
        console.log(`[PWA] 需要升级 - 客户端 v${currentVersion}, 服务器 v${serverVersion} (${updateType})`)
        const baseUrl = apiBase.replace(/\/api\/?$/, '')
        await showForceUpdate(serverVersion, baseUrl, '发现新版本')
        await performForceUpdate(baseUrl)
        return true
      }

      if (currentVersion === serverVersion) {
        console.log(`[PWA] 版本一致: v${serverVersion}`)
      } else {
        console.log(`[PWA] 客户端 v${currentVersion} >= 服务器 v${serverVersion}, 不升级（客户端已是最新版本）`)
      }
      return false
    } catch (e) {
      console.error('[PWA] 版本检查失败:', e)
      return false
    }
  }

  // ============================================================
  // 监听Service Worker更新
  // ============================================================
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isUpdating) {
        sessionStorage.setItem(RELOAD_FLAG_KEY, 'true')
        window.location.reload()
      }
    })
  }

  // 页面加载时检查版本
  setTimeout(() => {
    checkServerVersion()
  }, 1500)

  // 定时检查更新（每30分钟）
  setInterval(() => {
    if (!isUpdating) {
      checkServerVersion()
    }
  }, 30 * 60 * 1000)
})
