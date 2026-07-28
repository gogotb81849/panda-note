import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type UpdateType = 'required' | 'recommended' | 'optional' | 'none'

export interface VersionInfo {
  version: string
  buildTime: string
  environment: string
  nodeVersion: string
  gitCommitHash: string | null
  migrationStatus: {
    connected: boolean
    totalMigrations: number
    lastMigrationName: string | null
    lastMigrationDate: string | null
    status: 'connected' | 'disconnected' | 'error'
  } | null
}

export interface VersionCheckResult {
  currentVersion: string
  clientVersion: string
  needsUpdate: boolean
  updateType: UpdateType
  updateMessage: string
}

export function useVersion() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const currentVersion = computed(() => config.public.appVersion || '1.0.0')

  const serverVersion = ref<string>('')
  const updateAvailable = ref<boolean>(false)
  const updateType = ref<UpdateType>('none')
  const updateMessage = ref<string>('')

  const fetchVersionInfo = async (): Promise<VersionInfo | null> => {
    try {
      // 添加时间戳避免缓存
      const timestamp = Date.now()
      const data = await $fetch<VersionInfo>(`${apiBase}/version/info?_t=${timestamp}`)
      serverVersion.value = data.version
      return data
    } catch (error: any) {
      console.error('获取服务器版本信息失败:', error)
      return null
    }
  }

  const checkVersionUpdate = async (): Promise<VersionCheckResult | null> => {
    try {
      // 添加时间戳避免缓存
      const timestamp = Date.now()
      const data = await $fetch<VersionCheckResult>(`${apiBase}/version/check?_t=${timestamp}`, {
        method: 'POST',
        body: {
          clientVersion: currentVersion.value,
        },
      })

      serverVersion.value = data.currentVersion
      updateAvailable.value = data.needsUpdate
      updateType.value = data.updateType
      updateMessage.value = data.updateMessage

      return data
    } catch (error: any) {
      console.error('检查版本更新失败:', error)
      return null
    }
  }

  return {
    currentVersion,
    serverVersion,
    updateAvailable,
    updateType,
    updateMessage,
    fetchVersionInfo,
    checkVersionUpdate,
  }
}
