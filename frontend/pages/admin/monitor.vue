<template>
  <div class="system-monitor-page">
    <div class="page-header">
      <div class="flex items-center gap-3">
        <el-button text @click="navigateTo('/admin')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2 class="page-title">系统监控</h2>
      </div>
      <div class="flex gap-2">
        <el-button @click="refreshStatus" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 版本信息 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>版本信息</span>
          <el-button size="small" @click="syncVersion" :loading="syncingVersion">同步版本</el-button>
        </div>
      </template>
      <div v-if="versionData" class="version-grid">
        <div class="version-item">
          <span class="version-label">后端版本</span>
          <span class="version-value">{{ versionData.backend.version }}</span>
        </div>
        <div class="version-item">
          <span class="version-label">前端版本</span>
          <span class="version-value">{{ versionData.frontend.version }}</span>
        </div>
        <div class="version-item">
          <span class="version-label">版本状态</span>
          <el-tag :type="versionMatch ? 'success' : 'warning'" size="small">
            {{ versionMatch ? '一致' : '不一致（请同步）' }}
          </el-tag>
        </div>
        <div class="version-item">
          <span class="version-label">构建时间</span>
          <span class="version-value">{{ formatBuildTime(versionData.buildTime) }}</span>
        </div>
        <div class="version-item">
          <span class="version-label">运行环境</span>
          <el-tag :type="versionData.environment === 'production' ? 'success' : 'info'" size="small">
            {{ versionData.environment }}
          </el-tag>
        </div>
      </div>
      <el-empty v-else description="暂无版本数据" />
    </el-card>

    <!-- 服务控制 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>服务控制</span>
        </div>
      </template>
      <div class="service-control">
        <div class="service-item">
          <div class="service-info">
            <h4>后端服务</h4>
            <p class="status-text" :class="healthData?.services?.backend?.status === 'running' ? 'success' : 'error'">
              {{ healthData?.services?.backend?.status === 'running' ? '运行中' : '异常' }}
            </p>
            <p v-if="versionData?.backend?.version" class="service-version">v{{ versionData.backend.version }}</p>
          </div>
          <el-button type="warning" size="small" @click="handleRestart('backend')" :loading="restartingBackend">
            重启后端
          </el-button>
        </div>
        <div class="service-item">
          <div class="service-info">
            <h4>前端服务</h4>
            <p class="status-text success">运行中</p>
            <p v-if="versionData?.frontend?.version" class="service-version">v{{ versionData.frontend.version }}</p>
          </div>
          <el-button type="warning" size="small" @click="handleRestart('frontend')" :loading="restartingFrontend">
            重启前端
          </el-button>
        </div>
        <el-alert
          title="服务重启提示"
          type="info"
          description="点击重启按钮后，重启请求将记录到日志中。请通过宝塔面板或服务器管理工具执行实际重启操作。"
          :closable="false"
          class="mt-4"
        />
      </div>
    </el-card>

    <!-- 服务状态 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="8">
        <el-card>
          <div class="status-card">
            <div class="status-icon backend">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div class="status-info">
              <h3>后端服务</h3>
              <p :class="['status-text', healthData?.services?.backend?.status === 'running' ? 'success' : 'error']">
                {{ healthData?.services?.backend?.status === 'running' ? '运行中' : '异常' }}
              </p>
              <p class="status-detail">端口: {{ healthData?.services?.backend?.port || 3002 }}</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <div class="status-card">
            <div class="status-icon database">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div class="status-info">
              <h3>数据库</h3>
              <p :class="['status-text', healthData?.services?.database?.status === 'connected' ? 'success' : 'error']">
                {{ healthData?.services?.database?.status === 'connected' ? '连接正常' : '连接异常' }}
              </p>
              <p class="status-detail">延迟: {{ healthData?.services?.database?.latency || 0 }}ms</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <div class="status-card">
            <div class="status-icon frontend">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="status-info">
              <h3>前端服务</h3>
              <p class="status-text success">运行中</p>
              <p class="status-detail">端口: 3000</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统资源 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="12">
        <el-card>
          <template #header>系统资源</template>
          <div v-if="statusData" class="resource-list">
            <div class="resource-item">
              <span class="resource-label">运行时长</span>
              <span class="resource-value">{{ statusData.process?.uptimeHuman || '-' }}</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">Node版本</span>
              <span class="resource-value">{{ statusData.process?.nodeVersion || '-' }}</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">平台</span>
              <span class="resource-value">{{ statusData.process?.platform || '-' }} ({{ statusData.process?.arch || '-' }})</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">CPU核心数</span>
              <span class="resource-value">{{ statusData.cpu?.cores || '-' }}</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">CPU型号</span>
              <span class="resource-value text-sm">{{ statusData.cpu?.model || '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>内存使用</template>
          <div v-if="statusData" class="resource-list">
            <div class="resource-item">
              <span class="resource-label">RSS</span>
              <span class="resource-value">{{ statusData.memory?.rss || '-' }}</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">堆使用</span>
              <span class="resource-value">{{ statusData.memory?.heapUsed || '-' }}</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">堆总计</span>
              <span class="resource-value">{{ statusData.memory?.heapTotal || '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 磁盘使用 -->
    <el-card class="mb-4">
      <template #header>磁盘使用</template>
      <div v-if="statusData?.disk" class="resource-list">
        <div class="resource-item">
          <span class="resource-label">总空间</span>
          <span class="resource-value">{{ statusData.disk.total || '-' }}</span>
        </div>
        <div class="resource-item">
          <span class="resource-label">已使用</span>
          <span class="resource-value">{{ statusData.disk.used || '-' }} ({{ statusData.disk.usagePercent }})</span>
        </div>
        <div class="resource-item">
          <span class="resource-label">剩余空间</span>
          <span class="resource-value">{{ statusData.disk.free || '-' }}</span>
        </div>
      </div>
      <el-empty v-else description="暂无磁盘数据" />
    </el-card>

    <!-- 数据统计 -->
    <el-card class="mb-4">
      <template #header>数据统计</template>
      <el-row :gutter="16" v-if="statusData?.database">
        <el-col :span="4" v-for="(count, label) in statusData.database" :key="label">
          <div class="stat-card">
            <div class="stat-number">{{ count }}</div>
            <div class="stat-label">{{ statLabels[label] || label }}</div>
          </div>
        </el-col>
      </el-row>
      <el-empty v-else description="暂无数据" />
    </el-card>

    <!-- 运行日志 -->
    <el-card>
      <template #header>
        <div class="log-header">
          <span>运行日志</span>
          <el-button size="small" @click="loadLogs">刷新日志</el-button>
        </div>
      </template>
      <div class="log-content">
        <pre>{{ logContent }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

definePageMeta({
  middleware: ['auth', 'role'],
  allowedRoles: ['admin'],
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const loading = ref(false)
const healthData = ref<any>(null)
const statusData = ref<any>(null)
const versionData = ref<any>(null)
const logContent = ref('')
const restartingBackend = ref(false)
const restartingFrontend = ref(false)
const syncingVersion = ref(false)

// 版本比较：判断两个版本号是否相等（支持 3 段和 4 段式）
const versionMatch = computed(() => {
  if (!versionData.value?.backend?.version || !versionData.value?.frontend?.version) {
    return true
  }
  return versionData.value.backend.version === versionData.value.frontend.version
})

const statLabels: Record<string, string> = {
  users: '用户数',
  diaries: '日记数',
  tasks: '任务数',
  files: '文件数',
  experiences: '经验分享',
  partyActivities: '党建活动',
  thoughtReports: '思想动态',
  integrityRecords: '廉洁监督',
}

const getToken = () => {
  const cookie = useCookie('auth_token')
  return cookie.value
}

const formatBuildTime = (time: string) => {
  if (!time || time === '-') return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return time
  }
}

const refreshStatus = async () => {
  loading.value = true
  try {
    const [health, status, versions] = await Promise.all([
      $fetch(`${apiBase}/ops/health`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
      $fetch(`${apiBase}/ops/status`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
      $fetch(`${apiBase}/ops/versions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
    ])
    healthData.value = health
    statusData.value = status
    versionData.value = versions
  } catch (error) {
    console.error('获取系统状态失败:', error)
    ElMessage.error('获取系统状态失败')
  } finally {
    loading.value = false
  }
}

const syncVersion = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要同步前后端版本号吗？这将更新 version.json 和 package.json。',
      '确认同步版本',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    syncingVersion.value = true
    const res = await $fetch(`${apiBase}/ops/sync-version`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: {
        backendVersion: versionData.value?.backend?.version,
        frontendVersion: versionData.value?.frontend?.version,
      },
    })

    ElMessage.success(res.message || '版本同步成功')
    // 刷新版本信息
    await refreshStatus()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('版本同步失败:', error)
      ElMessage.error('版本同步失败')
    }
  } finally {
    syncingVersion.value = false
  }
}

const handleRestart = async (service: 'frontend' | 'backend') => {
  try {
    await ElMessageBox.confirm(
      `确定要重启${service === 'backend' ? '后端' : '前端'}服务吗？重启请求将记录到日志中，请通过宝塔面板执行实际重启操作。`,
      '确认重启',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    if (service === 'backend') {
      restartingBackend.value = true
    } else {
      restartingFrontend.value = true
    }

    const res = await $fetch(`${apiBase}/ops/restart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: { service },
    })

    ElMessage.success(res.message)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('重启请求失败:', error)
      ElMessage.error('重启请求失败')
    }
  } finally {
    restartingBackend.value = false
    restartingFrontend.value = false
  }
}

const loadLogs = async () => {
  try {
    const res = await $fetch(`${apiBase}/ops/logs`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    logContent.value = res.content
  } catch (error) {
    console.error('获取日志失败:', error)
  }
}

onMounted(() => {
  refreshStatus()
  loadLogs()
})
</script>

<style scoped>
.system-monitor-page {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

/* 服务控制样式 */
.service-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.service-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  color: white;
}

.status-icon.backend {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.status-icon.database {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.status-icon.frontend {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
}

.status-info h3 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.status-text {
  margin: 0 0 2px 0;
  font-size: 16px;
  font-weight: 600;
}

.status-text.success {
  color: #48bb78;
}

.status-text.error {
  color: #f56565;
}

.status-detail {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.resource-item:last-child {
  border-bottom: none;
}

.resource-label {
  font-size: 14px;
  color: #666;
}

.resource-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.text-sm {
  font-size: 12px;
}

.stat-card {
  text-align: center;
  padding: 16px;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #5B7FA6;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.log-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
