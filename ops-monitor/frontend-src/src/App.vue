<template>
  <div class="app-root">
    <!-- 顶部 -->
    <header class="top-bar">
      <div class="brand">
        <span class="brand-icon">Ops</span>
        <span class="brand-text">熊猫笔记 · 运维中心</span>
      </div>
      <div class="top-right">
        <span class="version">v{{ version }}</span>
        <span class="conn-dot" :class="wsConnected ? 'online' : 'offline'"></span>
        <span class="conn-text">{{ wsConnected ? '已连接' : '断开' }}</span>
      </div>
    </header>

    <!-- 主体：两栏 -->
    <div class="main-body">
      <!-- 本地 -->
      <div class="panel panel-local">
        <div class="panel-head">
          <h2>本地开发环境</h2>
          <span class="panel-sub">localhost:3000 / 3002</span>
        </div>

        <div class="svc-list">
          <div class="svc-row">
            <span class="svc-label">前端</span>
            <span class="svc-dot" :class="localFe.status"></span>
            <span class="svc-ver">{{ localFe.version }}</span>
          </div>
          <div class="svc-row">
            <span class="svc-label">后端</span>
            <span class="svc-dot" :class="localBe.status"></span>
            <span class="svc-ver">{{ localBe.version }}</span>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn btn-primary" @click="restartLocal" :disabled="localLoading">
            <span v-if="localLoading" class="spin">⟳</span>
            <span v-else>⟳</span>
            重启本地
          </button>
          <button class="btn btn-outline" @click="openLogin">
            <span>↗</span>
            一键登录
          </button>
        </div>

        <div v-if="localMsg" class="msg" :class="localMsgType">{{ localMsg }}</div>
      </div>

      <!-- 服务器 -->
      <div class="panel panel-server">
        <div class="panel-head">
          <h2>生产服务器</h2>
          <span class="panel-sub">106.14.57.62 · PM2</span>
        </div>

        <div class="svc-list">
          <div class="svc-row">
            <span class="svc-label">前端</span>
            <span class="svc-dot" :class="serverFe.status"></span>
            <span class="svc-ver">{{ serverFe.version }}</span>
          </div>
          <div class="svc-row">
            <span class="svc-label">后端</span>
            <span class="svc-dot" :class="serverBe.status"></span>
            <span class="svc-ver">{{ serverBe.version }}</span>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn btn-primary" @click="handleDeploy" :disabled="isDeploying || serverLoading">
            <span v-if="isDeploying" class="spin">⟳</span>
            <span v-else>↑</span>
            {{ isDeploying ? '部署中...' : '一键部署' }}
          </button>
          <button class="btn btn-outline" @click="restartServer" :disabled="serverLoading">
            <span v-if="serverLoading" class="spin">⟳</span>
            <span v-else>⟳</span>
            重启服务
          </button>
        </div>

        <div v-if="serverMsg" class="msg" :class="serverMsgType">{{ serverMsg }}</div>

        <!-- 部署日志 -->
        <div v-if="deployLogs.length > 0" class="log-box">
          <div class="log-box-title">部署日志</div>
          <div class="log-lines" ref="logContainer">
            <div v-for="(log, i) in deployLogs" :key="i" class="log-line">{{ log }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'

export default {
  name: 'MonitorApp',
  setup() {
    const wsConnected = ref(false)
    const version = ref('加载中...')

    const localFe = reactive({ status: 'checking', version: '...' })
    const localBe = reactive({ status: 'checking', version: '...' })
    const serverFe = reactive({ status: 'unknown', version: '...' })
    const serverBe = reactive({ status: 'unknown', version: '...' })

    const localLoading = ref(false)
    const localMsg = ref('')
    const localMsgType = ref('info')

    const serverLoading = ref(false)
    const serverMsg = ref('')
    const serverMsgType = ref('info')

    const isDeploying = ref(false)
    const deployLogs = ref([])
    const deployResult = ref(null)
    const logContainer = ref(null)

    let deployPollTimer = null
    let ws = null
    let reconnectTimer = null

    // ===== API =====
    async function apiCall(url, method = 'GET') {
      const res = await fetch(url, { method, headers: { 'Accept': 'application/json' } })
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const e = await res.json(); msg = e.message || msg } catch (_) {}
        throw new Error(msg)
      }
      return res.json()
    }

    // ===== 刷新状态 =====
    async function refreshAll() {
      try {
        const svc = await apiCall('/api/services')
        version.value = svc.canonical_version || '未知'

        localFe.status = svc.local?.frontend?.status || 'unknown'
        localFe.version = svc.local?.frontend?.version || '未知'
        localBe.status = svc.local?.backend?.status || 'unknown'
        localBe.version = svc.local?.backend?.version || '未知'

        serverFe.status = svc.server?.frontend?.status || 'unknown'
        serverFe.version = svc.server?.frontend?.version || '未知'
        serverBe.status = svc.server?.backend?.status || 'unknown'
        serverBe.version = svc.server?.backend?.version || '未知'
      } catch (e) {
        console.error('刷新失败:', e)
      }
    }

    // ===== 本地操作 =====
    async function restartLocal() {
      if (localLoading.value) return
      localLoading.value = true
      localMsg.value = '正在重启本地服务...'
      localMsgType.value = 'info'

      try {
        const r = await apiCall('/api/services/local/restart-all', 'POST')
        localMsg.value = r.message || '本地服务已重启'
        localMsgType.value = r.ok ? 'success' : 'warning'
        setTimeout(refreshAll, 3000)
      } catch (e) {
        localMsg.value = '重启失败: ' + e.message
        localMsgType.value = 'error'
      } finally {
        localLoading.value = false
        setTimeout(() => { localMsg.value = '' }, 8000)
      }
    }

    function openLogin() {
      window.open('http://localhost:3000', '_blank')
    }

    // ===== 服务器操作 =====
    async function restartServer() {
      if (serverLoading.value || isDeploying.value) return
      if (!confirm('确认重启服务器上的前后端服务？')) return
      serverLoading.value = true
      serverMsg.value = '正在重启服务器...'
      serverMsgType.value = 'info'

      try {
        const r = await apiCall('/api/services/server/restart-all', 'POST')
        serverMsg.value = r.message || '服务器已重启'
        serverMsgType.value = r.ok ? 'success' : 'warning'
        setTimeout(refreshAll, 5000)
      } catch (e) {
        serverMsg.value = '重启失败: ' + e.message
        serverMsgType.value = 'error'
      } finally {
        serverLoading.value = false
        setTimeout(() => { serverMsg.value = '' }, 8000)
      }
    }

    async function handleDeploy() {
      if (isDeploying.value || serverLoading.value) return
      if (!confirm('确认一键部署到服务器？\n\n将执行：构建 → 打包 → 上传 → 备份 → 替换 → 重启 → 验证\n预计 2-5 分钟。')) return

      isDeploying.value = true
      deployResult.value = null
      deployLogs.value = []
      serverMsg.value = ''
      serverMsgType.value = 'info'

      try {
        const r = await apiCall('/api/deploy/start', 'POST')
        if (!r.ok) {
          deployLogs.value.push('部署启动失败: ' + (r.message || '未知错误'))
          isDeploying.value = false
          return
        }
        deployLogs.value.push('部署已启动，等待流水线...')
        pollDeploy()
      } catch (e) {
        deployLogs.value.push('部署失败: ' + e.message)
        isDeploying.value = false
      }
    }

    function pollDeploy() {
      if (deployPollTimer) clearInterval(deployPollTimer)
      deployPollTimer = setInterval(async () => {
        try {
          const s = await apiCall('/api/deploy/status')
          if (s.logs) deployLogs.value = s.logs.slice(-100)
          isDeploying.value = !!s.running

          if (!s.running && s.result) {
            clearInterval(deployPollTimer)
            deployPollTimer = null
            deployResult.value = s.result
            serverMsg.value = s.result === 'success'
              ? `部署成功 (${s.version || ''})`
              : s.result === 'partial'
                ? '部署部分成功，请检查服务器'
                : '部署失败，已自动回滚'
            serverMsgType.value = s.result === 'success' ? 'success'
              : s.result === 'partial' ? 'warning' : 'error'
            setTimeout(refreshAll, 3000)
            setTimeout(() => { serverMsg.value = '' }, 15000)
          }
          nextTick(() => {
            if (logContainer.value) {
              logContainer.value.scrollTop = logContainer.value.scrollHeight
            }
          })
        } catch (e) {
          clearInterval(deployPollTimer)
          isDeploying.value = false
          deployLogs.value.push('状态查询超时')
        }
      }, 1500)
    }

    // ===== WebSocket =====
    function connectWs() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      try {
        ws = new WebSocket(`${proto}//${location.host}/ws`)
        ws.onopen = () => {
          wsConnected.value = true
          refreshAll()
        }
        ws.onmessage = (e) => {
          try {
            const m = JSON.parse(e.data)
            if (m.services) {
              version.value = m.services.canonical_version || version.value
              if (m.services.local) {
                localFe.status = m.services.local.frontend?.status || 'unknown'
                localFe.version = m.services.local.frontend?.version || '未知'
                localBe.status = m.services.local.backend?.status || 'unknown'
                localBe.version = m.services.local.backend?.version || '未知'
              }
              if (m.services.server) {
                serverFe.status = m.services.server.frontend?.status || 'unknown'
                serverFe.version = m.services.server.frontend?.version || '未知'
                serverBe.status = m.services.server.backend?.status || 'unknown'
                serverBe.version = m.services.server.backend?.version || '未知'
              }
            }
            if (m.deploy) {
              if (m.deploy.logs) deployLogs.value = m.deploy.logs.slice(-100)
              isDeploying.value = !!m.deploy.running
              if (m.deploy.result) deployResult.value = m.deploy.result
            }
          } catch (_) {}
        }
        ws.onclose = () => {
          wsConnected.value = false
          reconnectTimer = setTimeout(connectWs, 5000)
        }
        ws.onerror = () => {}
      } catch (_) {
        reconnectTimer = setTimeout(connectWs, 5000)
      }
    }

    onMounted(async () => {
      await refreshAll()
      connectWs()
      try {
        const d = await apiCall('/api/deploy/status')
        if (d.logs) deployLogs.value = d.logs.slice(-100)
        isDeploying.value = !!d.running
        deployResult.value = d.result || null
        if (isDeploying.value) pollDeploy()
      } catch (_) {}
    })

    onUnmounted(() => {
      if (ws) try { ws.close() } catch (_) {}
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (deployPollTimer) clearInterval(deployPollTimer)
    })

    return {
      wsConnected, version,
      localFe, localBe, serverFe, serverBe,
      localLoading, localMsg, localMsgType,
      serverLoading, serverMsg, serverMsgType,
      isDeploying, deployLogs, logContainer,
      refreshAll, restartLocal, openLogin, restartServer, handleDeploy
    }
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #f5f7fa;
  color: #1a1a2e;
  font-size: 13px;
  height: 100vh;
  overflow: hidden;
}

.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
}

/* ===== 顶部 ===== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border: 1px solid #e2e6ed;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00508E;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

.brand-text {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version {
  font-size: 11px;
  color: #9ca3af;
  font-family: 'SF Mono', Consolas, monospace;
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.conn-dot.online { background: #52c41a; }
.conn-dot.offline { background: #ff4d4f; }

.conn-text {
  font-size: 11px;
  color: #9ca3af;
}

/* ===== 主体两栏 ===== */
.main-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/* ===== 面板 ===== */
.panel {
  background: #fff;
  border: 1px solid #e2e6ed;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-local { border-top: 3px solid #00508E; }
.panel-server { border-top: 3px solid #00508E; }

.panel-head {
  margin-bottom: 16px;
}

.panel-head h2 {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.panel-sub {
  font-size: 11px;
  color: #9ca3af;
}

/* ===== 服务状态 ===== */
.svc-list {
  margin-bottom: 20px;
}

.svc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #f0f2f5;
}

.svc-row + .svc-row {
  margin-top: 8px;
}

.svc-label {
  font-size: 12px;
  font-weight: 500;
  color: #5a607f;
  width: 28px;
}

.svc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.svc-dot.running { background: #52c41a; }
.svc-dot.stopped { background: #ff4d4f; }
.svc-dot.starting,
.svc-dot.checking { background: #faad14; }
.svc-dot.unknown { background: #d1d5db; }

.svc-ver {
  font-size: 11px;
  color: #9ca3af;
  font-family: 'SF Mono', Consolas, monospace;
  margin-left: auto;
}

/* ===== 按钮组 ===== */
.btn-group {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  font-family: inherit;
  transition: all 0.15s;
}

.btn-primary {
  background: #00508E;
  border-color: #00508E;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #003d6e;
  border-color: #003d6e;
}

.btn-outline {
  background: #fff;
  border-color: #d1d5db;
  color: #5a607f;
}

.btn-outline:hover:not(:disabled) {
  background: #f5f7fa;
  border-color: #00508E;
  color: #00508E;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 消息 ===== */
.msg {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 12px;
}

.msg.info {
  background: #e6f0fa;
  color: #00508E;
}

.msg.success {
  background: #f6ffed;
  color: #389e0d;
}

.msg.warning {
  background: #fffbe6;
  color: #d48806;
}

.msg.error {
  background: #fff2f0;
  color: #ff4d4f;
}

/* ===== 部署日志 ===== */
.log-box {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-box-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.log-lines {
  flex: 1;
  overflow-y: auto;
  background: #fafbfc;
  border: 1px solid #f0f2f5;
  border-radius: 6px;
  padding: 8px 10px;
  font-family: 'SF Mono', Consolas, Monaco, monospace;
  font-size: 11px;
  line-height: 1.7;
}

.log-line {
  color: #5a607f;
  word-break: break-all;
}

/* ===== 动画 ===== */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}
</style>