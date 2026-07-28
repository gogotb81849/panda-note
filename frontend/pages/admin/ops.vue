<template>
  <div class="ops-page">
    <div class="ops-header">
      <h2>运维控制面板</h2>
      <div class="header-actions">
        <el-button type="primary" :loading="checking" @click="runFullCheck">全面自检</el-button>
        <el-button type="warning" @click="restartFrontend">通知前端重启</el-button>
        <el-button @click="exportLog">导出日志</el-button>
      </div>
    </div>

    <!-- 启动过程说明 -->
    <el-card class="mb-3" shadow="never">
      <template #header>
        <span>系统启动流程</span>
      </template>
      <div class="startup-steps">
        <div v-for="(step, idx) in startupSteps" :key="idx" class="step-item" :class="step.status">
          <div class="step-icon">
            <el-icon v-if="step.status === 'done'" color="#67c23a"><Check /></el-icon>
            <el-icon v-else-if="step.status === 'running'" color="#e6a23c"><Loading /></el-icon>
            <el-icon v-else-if="step.status === 'error'" color="#f56c6c"><Close /></el-icon>
            <span v-else class="step-num">{{ idx + 1 }}</span>
          </div>
          <div class="step-content">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-desc">{{ step.desc }}</div>
            <div v-if="step.detail" class="step-detail">{{ step.detail }}</div>
          </div>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16">
      <!-- 后端状态 -->
      <el-col :span="12">
        <el-card shadow="never" class="mb-3">
          <template #header>
            <div class="card-title-row">
              <span>后端服务</span>
              <el-tag :type="backendStatus.type" size="small">{{ backendStatus.label }}</el-tag>
            </div>
          </template>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">端口</span>
              <span class="info-value">{{ backendInfo.port || 3002 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">PID</span>
              <span class="info-value">{{ backendInfo.pid || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">运行时长</span>
              <span class="info-value">{{ backendInfo.uptimeHuman || backendInfo.process?.uptimeHuman || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Node 版本</span>
              <span class="info-value">{{ backendInfo.nodeVersion || backendInfo.process?.nodeVersion || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">内存占用</span>
              <span class="info-value">{{ backendInfo.memory?.rss || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">数据库</span>
              <el-tag :type="dbStatus.type" size="small">{{ dbStatus.label }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 前端状态 -->
      <el-col :span="12">
        <el-card shadow="never" class="mb-3">
          <template #header>
            <div class="card-title-row">
              <span>前端服务</span>
              <el-tag :type="frontendStatus.type" size="small">{{ frontendStatus.label }}</el-tag>
            </div>
          </template>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">端口</span>
              <span class="info-value">3000</span>
            </div>
            <div class="info-item">
              <span class="info-label">监听地址</span>
              <span class="info-value">{{ frontendInfo.host || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">构建状态</span>
              <el-tag :type="frontendInfo.built ? 'success' : 'warning'" size="small">
                {{ frontendInfo.built ? '已构建' : '未构建' }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="info-label">最后检测</span>
              <span class="info-value">{{ lastCheckTime || '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 端口检测 -->
    <el-card shadow="never" class="mb-3">
      <template #header><span>端口监听检测</span></template>
      <el-table :data="portChecks" size="small" :show-header="false">
        <el-table-column prop="name" width="120" />
        <el-table-column prop="port" width="80" />
        <el-table-column>
          <template #default="{ row }">
            <el-tag :type="row.listening ? 'success' : 'danger'" size="small">
              {{ row.listening ? '✓ 正在监听' : '✗ 未监听' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 运行日志 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-title-row">
          <span>运行日志</span>
          <el-button size="small" @click="clearLog">清空</el-button>
        </div>
      </template>
      <div class="log-box">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line" :data-type="log.type">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-empty">暂无日志</div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Check, Loading, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

definePageMeta({
  middleware: ['auth', 'role'],
  allowedRoles: ['admin'],
})

interface LogEntry {
  time: string
  msg: string
  type: 'info' | 'success' | 'error' | 'warning'
}

interface StartupStep {
  title: string
  desc: string
  detail?: string
  status: 'pending' | 'running' | 'done' | 'error'
}

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const checking = ref(false)
const logs = ref<LogEntry[]>([])
const lastCheckTime = ref('')
const allLogs: LogEntry[] = []

const getToken = () => {
  const cookie = useCookie('auth_token')
  return cookie.value
}

const startupSteps = ref<StartupStep[]>([
  { title: '检查后端端口 (3002)', desc: '检测 NestJS 后端服务是否启动', status: 'pending' },
  { title: '检查前端端口 (3000)', desc: '检测 Nuxt 前端服务是否启动', status: 'pending' },
  { title: '数据库连接测试', desc: '验证 PostgreSQL 数据库连接状态', status: 'pending' },
  { title: '后端健康检查', desc: '调用 /api/ops/health 获取服务详情', status: 'pending' },
  { title: '系统就绪', desc: '所有服务正常运行', status: 'pending' },
])

const backendInfo = ref<any>({})
const frontendInfo = ref<any>({})
const portChecks = ref<any[]>([])

const backendStatus = computed(() => {
  const info = backendInfo.value
  const pid = info.pid || info.process?.pid
  if (!pid) return { type: 'info' as const, label: '未知' }
  return { type: 'success' as const, label: '运行中' }
})

const frontendStatus = computed(() => {
  return frontendInfo.value.listening
    ? { type: 'success' as const, label: '运行中' }
    : { type: 'danger' as const, label: '未运行' }
})

const dbStatus = computed(() => {
  const s = backendInfo.value.services?.database?.status
  if (s === 'connected') return { type: 'success' as const, label: '已连接' }
  if (s === 'disconnected') return { type: 'danger' as const, label: '断开' }
  return { type: 'info' as const, label: '未知' }
})

const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
  const entry: LogEntry = { time: new Date().toLocaleTimeString(), msg, type }
  logs.value.push(entry)
  allLogs.push(entry)
}

const runFullCheck = async () => {
  checking.value = true
  logs.value = []
  addLog('开始全面自检...', 'info')

  // Step 1: 后端端口
  startupSteps.value[0].status = 'running'
  try {
    const res = await fetch(`${apiBase}/ops/health`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    backendInfo.value = data
    const pid = data.pid || '-'
    startupSteps.value[0].status = 'done'
    startupSteps.value[0].detail = `PID: ${pid} | 端口: ${data.services?.backend?.port || 3002}`
    addLog(`后端服务正常 (PID: ${pid}, 端口: ${data.services?.backend?.port || 3002})`, 'success')
  } catch (e: any) {
    startupSteps.value[0].status = 'error'
    startupSteps.value[0].detail = `错误: ${e.message}`
    addLog(`后端服务异常: ${e.message}`, 'error')
  }

  // Step 2: 前端端口
  startupSteps.value[1].status = 'running'
  try {
    const res = await fetch('http://localhost:3000/', { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    frontendInfo.value = { listening: true, host: 'localhost:3000', built: true }
    startupSteps.value[1].status = 'done'
    startupSteps.value[1].detail = '前端服务正常响应'
    addLog('前端服务正常 (端口: 3000)', 'success')
  } catch (e: any) {
    frontendInfo.value = { listening: false, host: '-', built: false }
    startupSteps.value[1].status = 'error'
    startupSteps.value[1].detail = `错误: ${e.message}`
    addLog(`前端服务异常: ${e.message}`, 'error')
  }

  // Step 3: 数据库
  startupSteps.value[2].status = 'running'
  const dbS = backendInfo.value.services?.database
  if (dbS?.status === 'connected') {
    startupSteps.value[2].status = 'done'
    startupSteps.value[2].detail = `延迟: ${dbS.latency}ms`
    addLog(`数据库连接正常 (延迟: ${dbS.latency}ms)`, 'success')
  } else if (dbS?.status === 'disconnected') {
    startupSteps.value[2].status = 'error'
    startupSteps.value[2].detail = dbS.error
    addLog(`数据库连接失败: ${dbS.error}`, 'error')
  } else {
    startupSteps.value[2].status = backendInfo.value.pid ? 'done' : 'error'
    startupSteps.value[2].detail = backendInfo.value.pid ? '后端未返回数据库信息' : '后端未运行'
    addLog(backendInfo.value.pid ? '数据库状态未知（后端未提供信息）' : '后端未运行，无法检测数据库', 'warning')
  }

  // Step 4: 后端详细健康
  startupSteps.value[3].status = 'running'
  try {
    const res = await fetch(`${apiBase}/ops/status`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    backendInfo.value = { ...backendInfo.value, ...data }
    startupSteps.value[3].status = 'done'
    const mem = data.memory?.rss || '-'
    startupSteps.value[3].detail = `内存: ${mem}`
    addLog(`后端详细状态: 内存 ${mem}`, 'success')
  } catch (e: any) {
    startupSteps.value[3].status = 'error'
    addLog(`后端详细健康检查失败: ${e.message}`, 'warning')
  }

  // Step 5: 总体
  const allDone = startupSteps.value.slice(0, 4).every(s => s.status === 'done')
  startupSteps.value[4].status = allDone ? 'done' : 'error'
  startupSteps.value[4].detail = allDone ? '所有服务正常运行' : '部分服务异常，请检查日志'
  addLog(allDone ? '✓ 自检完成，所有服务正常' : '✗ 自检完成，发现异常', allDone ? 'success' : 'error')

  lastCheckTime.value = new Date().toLocaleTimeString()
  checking.value = false

  // 如果有错误，保存日志到后端文件
  if (!allDone) {
    saveLogToFile()
  }
}

const restartFrontend = async () => {
  addLog('发送前端重启信号...', 'warning')
  try {
    await fetch(`${apiBase}/ops/restart-frontend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    addLog('前端重启信号已发送', 'success')
    ElMessage.success('前端重启信号已发送，请刷新页面')
  } catch (e: any) {
    addLog(`重启失败: ${e.message}`, 'error')
  }
}

const clearLog = () => {
  logs.value = []
}

const exportLog = () => {
  const text = allLogs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ops-log-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const saveLogToFile = async () => {
  const text = allLogs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n')
  try {
    await fetch(`${apiBase}/ops/save-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ content: text }),
    })
    addLog('日志已保存到 logs/ops.log', 'info')
  } catch {
    addLog('日志保存失败（后端未运行）', 'warning')
  }
}

// 自动检测端口
const checkPorts = async () => {
  // 从 apiBase 提取后端端口
  let backendPort = 3002
  try {
    const url = new URL(apiBase)
    backendPort = parseInt(url.port) || 3002
  } catch { /* ignore */ }

  const ports = [
    { name: '后端 API', port: backendPort },
    { name: '前端 Nuxt', port: 3000 },
  ]

  const results = []
  for (const p of ports) {
    try {
      await fetch(`http://localhost:${p.port}/`, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
      results.push({ ...p, listening: true })
    } catch {
      results.push({ ...p, listening: false })
    }
  }
  portChecks.value = results
}

onMounted(() => {
  runFullCheck()
  checkPorts()
})
</script>

<style scoped>
.ops-page {
  padding: 20px;
  overflow-y: auto;
  height: calc(100vh - 56px);
  background: #f5f7fa;
}

.ops-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.ops-header h2 {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.mb-3 {
  margin-bottom: 16px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-label {
  color: #888;
  font-size: 13px;
}

.info-value {
  font-weight: 500;
  font-size: 13px;
}

/* 启动步骤 */
.startup-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fafbfc;
  transition: all 0.3s;
}

.step-item.running {
  background: #fff7e6;
  border-left: 3px solid #e6a23c;
}

.step-item.done {
  background: #f0f9eb;
  border-left: 3px solid #67c23a;
}

.step-item.error {
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
}

.step-item.pending {
  opacity: 0.5;
}

.step-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.step-desc {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.step-detail {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-family: monospace;
}

/* 日志 */
.log-box {
  max-height: 300px;
  overflow-y: auto;
  background: #1a1a2e;
  border-radius: 8px;
  padding: 12px;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.8;
}

.log-line {
  display: flex;
  gap: 8px;
}

.log-time {
  color: #666;
  flex-shrink: 0;
}

.log-msg {
  color: #e0e0e0;
}

.log-line[data-type="success"] .log-msg {
  color: #67c23a;
}

.log-line[data-type="error"] .log-msg {
  color: #f56c6c;
}

.log-line[data-type="warning"] .log-msg {
  color: #e6a23c;
}

.log-empty {
  color: #555;
  text-align: center;
  padding: 20px;
}
</style>
