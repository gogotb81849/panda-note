import { ref } from 'vue'

interface LogEntry {
  logType: 'error' | 'api_error' | 'performance' | 'user_action'
  level: 'info' | 'warn' | 'error' | 'critical'
  message: string
  details?: any
  userAgent?: string
  platform?: string
  screenResolution?: string
  networkType?: string
  pageUrl?: string
  pagePath?: string
  clientTime: string
}

// 日志缓冲区
const logBuffer = ref<LogEntry[]>([])
const maxBufferSize = 100

// 配置
let uploadInterval: number = 300 // 秒
let maxBatchSize: number = 50
let enabled: boolean = false
let collectErrors: boolean = true
let collectApiErrors: boolean = true
let collectPerformance: boolean = false
let collectUserActions: boolean = false

// 定时器
let uploadTimer: any = null

/**
 * 初始化日志收集器
 */
export const useLogCollector = () => {
  /**
   * 加载配置
   */
  const loadConfig = async () => {
    try {
      const res = await $fetch('/api/client-log/config')
      if (res) {
        enabled = res.enabled || false
        collectErrors = res.collectErrors !== false
        collectApiErrors = res.collectApiErrors !== false
        collectPerformance = res.collectPerformance === true
        collectUserActions = res.collectUserActions === true
        uploadInterval = res.uploadInterval || 300
        maxBatchSize = res.maxBatchSize || 50

        if (enabled) {
          startCollector()
        } else {
          stopCollector()
        }
      }
    } catch (e) {
      console.error('加载日志配置失败', e)
    }
  }

  /**
   * 启动日志收集
   */
  const startCollector = () => {
    if (uploadTimer) return

    // 注册错误监听
    if (collectErrors) {
      window.addEventListener('error', handleError)
      window.addEventListener('unhandledrejection', handlePromiseRejection)
    }

    // 启动定时上传
    uploadTimer = setInterval(() => {
      uploadLogs()
    }, uploadInterval * 1000)

    console.log('日志收集器已启动')
  }

  /**
   * 停止日志收集
   */
  const stopCollector = () => {
    if (uploadTimer) {
      clearInterval(uploadTimer)
      uploadTimer = null
    }

    window.removeEventListener('error', handleError)
    window.removeEventListener('unhandledrejection', handlePromiseRejection)

    console.log('日志收集器已停止')
  }

  /**
   * 处理 JavaScript 错误
   */
  const handleError = (event: ErrorEvent) => {
    if (!enabled || !collectErrors) return

    const log: LogEntry = {
      logType: 'error',
      level: 'error',
      message: event.message,
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      },
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      networkType: getNetworkType(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      clientTime: new Date().toISOString(),
    }

    addLog(log)
  }

  /**
   * 处理 Promise 拒绝
   */
  const handlePromiseRejection = (event: PromiseRejectionEvent) => {
    if (!enabled || !collectErrors) return

    const log: LogEntry = {
      logType: 'error',
      level: 'error',
      message: 'Unhandled Promise Rejection',
      details: {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      },
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      networkType: getNetworkType(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      clientTime: new Date().toISOString(),
    }

    addLog(log)
  }

  /**
   * 记录 API 错误
   */
  const logApiError = (url: string, method: string, status: number, message: string, details?: any) => {
    if (!enabled || !collectApiErrors) return

    const log: LogEntry = {
      logType: 'api_error',
      level: status >= 500 ? 'error' : 'warn',
      message: `API ${method} ${url} failed: ${status} ${message}`,
      details: {
        url,
        method,
        status,
        ...details,
      },
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      networkType: getNetworkType(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      clientTime: new Date().toISOString(),
    }

    addLog(log)
  }

  /**
   * 记录用户操作
   */
  const logUserAction = (action: string, target: string, details?: any) => {
    if (!enabled || !collectUserActions) return

    const log: LogEntry = {
      logType: 'user_action',
      level: 'info',
      message: `User action: ${action} on ${target}`,
      details,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      networkType: getNetworkType(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      clientTime: new Date().toISOString(),
    }

    addLog(log)
  }

  /**
   * 记录性能数据
   */
  const logPerformance = (metric: string, value: number, details?: any) => {
    if (!enabled || !collectPerformance) return

    const log: LogEntry = {
      logType: 'performance',
      level: value > 3000 ? 'warn' : 'info',
      message: `Performance: ${metric} = ${value}ms`,
      details: {
        metric,
        value,
        ...details,
      },
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      networkType: getNetworkType(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      clientTime: new Date().toISOString(),
    }

    addLog(log)
  }

  /**
   * 添加日志到缓冲区
   */
  const addLog = (log: LogEntry) => {
    logBuffer.value.push(log)

    // 超过缓冲区大小，移除最早的
    if (logBuffer.value.length > maxBufferSize) {
      logBuffer.value.shift()
    }
  }

  /**
   * 上传日志
   */
  const uploadLogs = async () => {
    if (logBuffer.value.length === 0) return

    const logsToUpload = logBuffer.value.slice(0, maxBatchSize)

    try {
      await $fetch('/api/client-log/upload', {
        method: 'POST',
        body: { logs: logsToUpload },
      })

      // 上传成功，从缓冲区移除
      logBuffer.value = logBuffer.value.slice(logsToUpload.length)

      console.log(`成功上传 ${logsToUpload.length} 条日志`)
    } catch (e) {
      console.error('上传日志失败', e)
    }
  }

  /**
   * 获取网络类型
   */
  const getNetworkType = () => {
    const connection = (navigator as any).connection
    if (connection) {
      return connection.effectiveType || 'unknown'
    }
    return 'unknown'
  }

  /**
   * 检查是否有待接收的修复包
   */
  const checkPendingFixes = async () => {
    try {
      const fixes = await $fetch('/api/client-log/pending-fixes')
      if (fixes && fixes.length > 0) {
        return fixes
      }
    } catch (e) {
      console.error('检查修复包失败', e)
    }
    return []
  }

  /**
   * 确认接收修复包
   */
  const confirmReceipt = async (packageId: number) => {
    try {
      await $fetch(`/api/client-log/fix-package/${packageId}/receive`, {
        method: 'POST',
      })
      return true
    } catch (e) {
      console.error('确认接收失败', e)
      return false
    }
  }

  /**
   * 确认应用修复包
   */
  const confirmApplied = async (packageId: number, feedback?: string) => {
    try {
      await $fetch(`/api/client-log/fix-package/${packageId}/apply`, {
        method: 'POST',
        body: { feedback },
      })
      return true
    } catch (e) {
      console.error('确认应用失败', e)
      return false
    }
  }

  return {
    loadConfig,
    startCollector,
    stopCollector,
    logApiError,
    logUserAction,
    logPerformance,
    uploadLogs,
    checkPendingFixes,
    confirmReceipt,
    confirmApplied,
  }
}
