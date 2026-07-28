<template>
  <div class="deploy-timeline">
    <div class="timeline-header">
      <div class="header-left">
        <span class="header-icon">DEP</span>
        <span class="header-title">部署流水线</span>
        <span v-if="version" class="header-version">v{{ version }}</span>
      </div>
      <div class="header-right">
        <span v-if="deployResult" class="result-badge" :class="'result-' + deployResult">
          <span v-if="deployResult === 'success'">✓ 部署成功</span>
          <span v-else-if="deployResult === 'partial'">⚠ 部分成功</span>
          <span v-else-if="deployResult === 'failed'">✗ 部署失败</span>
          <span v-if="durationSeconds > 0" class="result-duration">{{ formatDuration(durationSeconds) }}</span>
        </span>
        <span v-else-if="isDeploying" class="deploying-badge">
          <span class="spinner"></span>
          部署进行中...
        </span>
        <button class="btn-deploy" :disabled="isDeploying" @click.stop="$emit('deploy')">
          <span>{{ isDeploying ? '部署中...' : '一键部署' }}</span>
        </button>
      </div>
    </div>

    <div class="timeline-body">
      <div v-if="steps.length === 0" class="timeline-empty">
        <div class="empty-icon">→</div>
        <div class="empty-text">点击上方"一键部署"启动完整部署流程</div>
        <div class="empty-steps">
          <span>环境预检查</span> → <span>构建</span> → <span>打包</span> →
          <span>依赖安装</span> → <span>Prisma同步</span> → <span>备份</span> →
          <span>替换</span> → <span>重启</span> → <span>健康检查</span>
        </div>
      </div>
      
      <div v-else class="timeline-tree">
        <div
          v-for="(step, idx) in steps"
          :key="idx"
          class="tree-item"
          :class="`item-${step.status}`"
        >
          <div class="tree-connector" v-if="idx > 0">
            <div class="connector-line" :class="{ 'line-done': isPreviousDone(idx) }"></div>
          </div>
          
          <div class="tree-node">
            <div class="node-icon">
              <span v-if="step.status === 'done' || step.status === 'success'">✓</span>
              <span v-else-if="step.status === 'running'" class="spinner-icon">↻</span>
              <span v-else-if="step.status === 'failed' || step.status === 'error'">✗</span>
              <span v-else-if="step.status === 'warning'">!</span>
              <span v-else-if="step.status === 'pending'">○</span>
              <span v-else>●</span>
            </div>
            
            <div class="node-content">
              <div class="node-header">
                <span class="node-name">{{ step.name }}</span>
                <span class="node-time" v-if="step.duration">{{ step.duration }}</span>
              </div>
              <div class="node-meta">
                <span class="node-status-text">{{ statusText(step.status) }}</span>
                <span v-if="step.log" class="node-log" :title="step.log">{{ step.log }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="logs.length > 0" class="timeline-logs">
      <div class="logs-header">
        <span class="logs-icon">LOG</span>
        <span class="logs-title">部署日志</span>
        <span class="logs-count">{{ logs.length }} 条</span>
      </div>
      <div class="logs-terminal" ref="logsContainer">
        <div
          v-for="(log, idx) in displayedLogs"
          :key="idx"
          class="log-line"
          :class="getLogClass(log)"
        >
          <span class="log-time">{{ extractTime(log) }}</span>
          <span class="log-content">{{ extractMessage(log) }}</span>
        </div>
      </div>
      
      <div v-if="hasFailedStep" class="error-hint">
        <span class="error-hint-icon">✗</span>
        <span class="error-hint-text">部署失败时已自动回滚到上一个稳定版本，请检查日志后重试</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, nextTick } from 'vue'

export default {
  name: 'DeployTimeline',
  props: {
    isDeploying: { type: Boolean, default: false },
    steps: { type: Array, default: () => [] },
    logs: { type: Array, default: () => [] },
    deployResult: { type: String, default: null },
    durationSeconds: { type: Number, default: 0 },
    version: { type: String, default: '' }
  },
  emits: ['deploy'],
  setup(props) {
    const logsContainer = ref(null)

    watch(() => props.logs.length, () => {
      nextTick(() => {
        if (logsContainer.value) {
          logsContainer.value.scrollTop = logsContainer.value.scrollHeight
        }
      })
    })

    const displayedLogs = computed(() => {
      return props.logs.slice(-80)
    })

    const hasFailedStep = computed(() => {
      return props.steps.some(s => s.status === 'failed')
    })
    
    function isPreviousDone(idx) {
      if (idx === 0) return false
      const prevStep = props.steps[idx - 1]
      return prevStep && (prevStep.status === 'done' || prevStep.status === 'success' || prevStep.status === 'failed' || prevStep.status === 'warning')
    }
    
    function statusText(status) {
      const map = {
        'done': '已完成',
        'success': '已完成',
        'running': '进行中...',
        'failed': '失败',
        'error': '错误',
        'warning': '警告',
        'pending': '待执行',
        'waiting': '等待中'
      }
      return map[status] || status || ''
    }

    function formatDuration(seconds) {
      if (seconds < 60) return `${seconds}秒`
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
    }
    
    function extractTime(log) {
      if (typeof log === 'string') {
        const match = log.match(/^\[?(\d{2}:\d{2}:\d{2})\]?/)
        return match ? match[1] : ''
      }
      return log.time || ''
    }
    
    function extractMessage(log) {
      if (typeof log === 'string') {
        return log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
      }
      return log.message || ''
    }
    
    function getLogClass(log) {
      const msg = typeof log === 'string' ? log : (log.message || '')
      if (msg.includes('❌') || msg.includes('FATAL') || msg.includes('失败') || msg.includes('error') || msg.includes('✗')) return 'log-error'
      if (msg.includes('⚠') || msg.includes('警告') || msg.includes('warning') || msg.includes('部分') || msg.includes('WARN')) return 'log-warning'
      if (msg.includes('✓') || msg.includes('🎉') || msg.includes('成功') || msg.includes('完成') || msg.includes('done')) return 'log-success'
      return 'log-info'
    }
    
    return {
      logsContainer,
      displayedLogs,
      hasFailedStep,
      isPreviousDone,
      statusText,
      formatDuration,
      extractTime,
      extractMessage,
      getLogClass
    }
  }
}
</script>

<style scoped>
.deploy-timeline {
  background: #fff;
  border: 1px solid #e2e6ed;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 16px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafbfc;
  border-bottom: 1px solid #f0f2f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e6f0fa;
  color: #00508E;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.header-version {
  font-size: 11px;
  color: #9ca3af;
  font-family: 'SF Mono', Consolas, Monaco, monospace;
  padding: 1px 6px;
  background: #eef1f5;
  border-radius: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.deploying-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  background: #fffbe6;
  color: #d48806;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #ffd591;
}

.result-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.result-success {
  background: #f6ffed;
  color: #389e0d;
  border: 1px solid #b7eb8f;
}
.result-partial {
  background: #fffbe6;
  color: #d48806;
  border: 1px solid #ffd591;
}
.result-failed {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffa39e;
}
.result-duration {
  font-weight: 400;
  opacity: 0.8;
  margin-left: 2px;
}

.spinner {
  width: 10px;
  height: 10px;
  border: 2px solid #faad14;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-deploy {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: #00508E;
  color: #fff;
  border: 1px solid #00508E;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.btn-deploy:not(:disabled):hover {
  background: #003d6e;
  border-color: #003d6e;
}

.btn-deploy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.timeline-body {
  padding: 16px;
}

.timeline-empty {
  text-align: center;
  padding: 28px 16px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px dashed #e2e6ed;
}

.empty-icon {
  font-size: 24px;
  font-weight: 700;
  color: #00508E;
  margin-bottom: 10px;
}

.empty-text {
  font-size: 13px;
  color: #5a607f;
  font-weight: 500;
  margin-bottom: 10px;
}

.empty-steps {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.8;
}

.empty-steps span {
  color: #00508E;
  font-weight: 500;
  padding: 1px 6px;
  background: #e6f0fa;
  border-radius: 3px;
  margin: 0 2px;
}

.timeline-tree {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #fff;
  border-radius: 6px;
  padding: 8px;
  border: 1px solid #f0f2f5;
}

.tree-item {
  position: relative;
}

.tree-connector {
  position: absolute;
  left: 15px;
  top: -10px;
  height: 10px;
}

.connector-line {
  width: 2px;
  height: 100%;
  background: #e2e6ed;
  margin-left: 9px;
}

.connector-line.line-done {
  background: #52c41a;
}

.tree-node {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
}

.tree-item:hover .tree-node {
  background: #fafbfc;
}

.node-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  border: 2px solid;
  margin-top: 1px;
}

.item-done .node-icon,
.item-success .node-icon {
  background: #f6ffed;
  border-color: #52c41a;
  color: #389e0d;
}

.item-running .node-icon {
  background: #fffbe6;
  border-color: #faad14;
  color: #d48806;
}

.item-failed .node-icon,
.item-error .node-icon {
  background: #fff1f0;
  border-color: #ff4d4f;
  color: #cf1322;
}

.item-warning .node-icon {
  background: #fffbe6;
  border-color: #faad14;
  color: #d48806;
}

.item-pending .node-icon,
.item-waiting .node-icon {
  background: #fafbfc;
  border-color: #d9d9d9;
  color: #bfbfbf;
}

.spinner-icon {
  animation: spin 1s linear infinite;
}

.node-content {
  flex: 1;
  min-width: 0;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-name {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a2e;
}

.node-time {
  font-size: 10px;
  color: #8c8c8c;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  background: #f5f5f5;
  padding: 1px 5px;
  border-radius: 3px;
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.node-duration {
  font-size: 11px;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
}

.node-status-text {
  font-size: 11px;
  font-weight: 500;
}

.node-log {
  font-size: 10px;
  color: #8c8c8c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.item-done .node-status-text,
.item-success .node-status-text {
  color: #389e0d;
}

.item-running .node-status-text {
  color: #d48806;
}

.item-failed .node-status-text,
.item-error .node-status-text {
  color: #cf1322;
}

.item-warning .node-status-text {
  color: #d48806;
}

.item-pending .node-status-text,
.item-waiting .node-status-text {
  color: #bfbfbf;
}

.timeline-logs {
  margin: 0 16px 16px;
  background: #fafbfc;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #f0f2f5;
}

.logs-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #eef1f5;
  border-bottom: 1px solid #e2e6ed;
}

.logs-icon {
  font-size: 10px;
  font-weight: 700;
  color: #00508E;
  letter-spacing: 0.5px;
}

.logs-title {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a2e;
}

.logs-count {
  margin-left: auto;
  font-size: 10px;
  color: #9ca3af;
  padding: 1px 6px;
  background: #e2e6ed;
  border-radius: 10px;
}

.logs-terminal {
  padding: 10px 12px;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.6;
}

.log-line {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.log-time {
  color: #bfbfbf;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.log-content {
  color: #595959;
  word-break: break-all;
}

.log-success .log-content {
  color: #389e0d;
}

.log-error .log-content {
  color: #cf1322;
  font-weight: 500;
}

.log-warning .log-content {
  color: #d48806;
}

.error-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fff1f0;
  border-top: 1px solid #ffa39e;
  font-size: 11px;
  color: #cf1322;
}

.error-hint-icon {
  font-weight: 700;
}

.error-hint-text {
  color: #8c8c8c;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
