// 日志收集器客户端插件
// 用户登录后自动初始化日志收集功能，收集错误日志并上传到服务器
export default defineNuxtPlugin(() => {
  if (process.server) return

  const { loadConfig, startCollector, stopCollector } = useLogCollector()

  // 监听认证状态变化
  const initLogCollector = async () => {
    try {
      // 加载日志收集配置
      await loadConfig()
    } catch (error) {
      console.error('[LogCollector] 初始化失败:', error)
    }
  }

  // 页面加载时初始化（延迟执行，避免影响首屏）
  setTimeout(() => {
    initLogCollector()
  }, 3000)

  // 监听认证状态变化，登录后启动收集器
  const authStore = useAuthStore()
  watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) {
      // 登录后重新加载配置并启动收集器
      setTimeout(() => {
        initLogCollector()
      }, 1000)
    } else {
      stopCollector()
    }
  }, { immediate: true })
})
