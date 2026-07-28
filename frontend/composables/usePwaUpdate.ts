import { ref, onMounted } from 'vue'

/**
 * PWA 无感知自动更新 Composable
 * 配合 registerType: 'autoUpdate' + skipWaiting + clientsClaim 使用
 * 当检测到新版本时，在后台自动刷新页面，用户无感知
 */
export function usePwaUpdate() {
  const isNewVersionAvailable = ref(false)
  const isUpdating = ref(false)

  onMounted(() => {
    // 监听自定义 PWA 更新事件
    // 这个事件由 pwa-update.client.ts 插件派发
    if (typeof window !== 'undefined') {
      window.addEventListener('pwa:update-available', () => {
        isNewVersionAvailable.value = true
      })

      window.addEventListener('pwa:update-applied', () => {
        isNewVersionAvailable.value = false
        isUpdating.value = false
      })
    }
  })

  /**
   * 执行自动更新
   * 在 skipWaiting + clientsClaim 模式下，新 SW 已经激活
   * 只需要刷新页面即可加载新资源
   */
  const applyUpdate = () => {
    if (typeof window === 'undefined') return
    isUpdating.value = true
    // 清理旧缓存
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          // 保留 v2 版本的缓存，清理旧版本
          if (!name.includes('-v2')) {
            caches.delete(name)
          }
        })
      })
    }
    // 强制刷新，绕过缓存
    window.location.reload()
  }

  return {
    isNewVersionAvailable,
    isUpdating,
    applyUpdate,
  }
}
