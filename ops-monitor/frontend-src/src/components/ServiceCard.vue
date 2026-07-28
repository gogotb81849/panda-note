<template>
  <div class="service-card" :class="[cardClass, `status-${status}`]">
    <!-- 顶部区域：图标 + 状态环形 -->
    <div class="card-top">
      <div class="service-icon" :class="iconBgClass">
        <span class="icon-emoji">{{ icon }}</span>
      </div>
      
      <!-- 环形状态指示器 -->
      <div class="ring-status">
        <svg viewBox="0 0 36 36" class="status-ring-svg">
          <circle
            class="ring-bg"
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke-width="3"
          />
          <circle
            class="ring-progress"
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke-width="3"
            :stroke-dasharray="ringDasharray"
            stroke-linecap="round"
          />
        </svg>
        <div class="ring-center">
          <span class="ring-icon">{{ statusIcon }}</span>
        </div>
      </div>
    </div>

    <!-- 服务信息 -->
    <div class="service-info">
      <h3 class="service-title">{{ title }}</h3>
      <p class="service-subtitle">{{ subtitle }}</p>
    </div>

    <!-- 状态标签 -->
    <div class="status-badge" :class="`badge-${status}`">
      <span class="badge-dot"></span>
      <span class="badge-text">{{ statusText }}</span>
    </div>

    <!-- 详情信息 -->
    <div class="detail-grid">
      <div class="detail-item" v-if="version">
        <span class="detail-label">版本</span>
        <span class="detail-value version">{{ formatVersion(version) }}</span>
      </div>
      <div class="detail-item" v-if="port">
        <span class="detail-label">端口</span>
        <span class="detail-value">{{ port }}</span>
      </div>
      <div class="detail-item" v-if="pid">
        <span class="detail-label">PID</span>
        <span class="detail-value pid">{{ pid }}</span>
      </div>
      <div class="detail-item" v-if="uptime">
        <span class="detail-label">运行时长</span>
        <span class="detail-value uptime">{{ uptime }}</span>
      </div>
    </div>

    <!-- 快速操作按钮 -->
    <div class="quick-actions" v-if="!isRemote && !isDatabase">
      <button
        class="action-btn btn-start"
        :disabled="status === 'running' || loading"
        @click.stop="handleAction('start')"
        :class="{ 'is-loading': loading && pendingAction === 'start' }"
      >
        <span class="btn-icon">▶</span>
      </button>
      <button
        class="action-btn btn-stop"
        :disabled="status !== 'running' || loading"
        @click.stop="handleAction('stop')"
        :class="{ 'is-loading': loading && pendingAction === 'stop' }"
      >
        <span class="btn-icon">■</span>
      </button>
      <button
        class="action-btn btn-restart"
        :disabled="loading"
        @click.stop="handleAction('restart')"
        :class="{ 'is-loading': loading && pendingAction === 'restart' }"
      >
        <span class="btn-icon">↻</span>
      </button>
      <button
        class="action-btn btn-refresh"
        @click.stop="$emit('refresh')"
      >
        <span class="btn-icon">🔄</span>
      </button>
    </div>

    <!-- 远程服务操作 -->
    <div class="quick-actions" v-else-if="isRemote && !isDatabase">
      <button
        class="action-btn btn-deploy"
        :disabled="deploying || loading"
        @click.stop="$emit('deploy')"
      >
        <span class="btn-icon">🚀</span>
      </button>
      <button
        class="action-btn btn-refresh"
        @click.stop="$emit('refresh')"
      >
        <span class="btn-icon">🔄</span>
      </button>
    </div>

    <!-- 数据库只读操作 -->
    <div class="quick-actions" v-else>
      <button
        class="action-btn btn-refresh"
        @click.stop="$emit('refresh')"
      >
        <span class="btn-icon">🔄</span>
      </button>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'

export default {
  name: 'ServiceCard',
  props: {
    icon: { type: String, default: '📦' },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    status: { type: String, default: 'unknown' },
    version: { type: String, default: '' },
    info: { type: String, default: '' },
    port: { type: [Number, String], default: null },
    pid: { type: [Number, String], default: null },
    uptime: { type: String, default: '' },
    isRemote: { type: Boolean, default: false },
    isDatabase: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    deploying: { type: Boolean, default: false }
  },
  emits: ['start', 'stop', 'restart', 'refresh', 'deploy', 'click'],
  setup(props, { emit }) {
    const pendingAction = ref(null)
    
    const statusText = computed(() => {
      const map = {
        'running': '运行中',
        'stopped': '已停止',
        'error': '异常',
        'starting': '启动中',
        'stopping': '停止中',
        'checking': '检查中',
        'unknown': '未知'
      }
      return map[props.status] || props.status || '未知'
    })

    const statusIcon = computed(() => {
      const icons = {
        'running': '✓',
        'stopped': '○',
        'error': '✗',
        'starting': '↻',
        'stopping': '↻',
        'checking': '?',
        'unknown': '-'
      }
      return icons[props.status] || '?'
    })

    const ringDasharray = computed(() => {
      const circumference = 2 * Math.PI * 15.5
      let percent = 0
      if (props.status === 'running') percent = 100
      else if (props.status === 'starting' || props.status === 'stopping') percent = 50
      else if (props.status === 'error') percent = 25
      return `${percent}, 100`
    })

    const cardClass = computed(() => {
      const c = []
      if (props.isRemote) c.push('card-remote')
      if (props.isDatabase) c.push('card-database')
      return c.join(' ')
    })

    const iconBgClass = computed(() => {
      if (props.isDatabase) return 'icon-db'
      if (props.isRemote) return 'icon-remote'
      if (props.title.includes('前端') || props.title.includes('Front') || props.title.includes('Nuxt')) return 'icon-front'
      if (props.title.includes('后端') || props.title.includes('Backend') || props.title.includes('Nest')) return 'icon-back'
      return 'icon-default'
    })

    function formatVersion(v) {
      if (!v) return ''
      if (v.length > 16) return v.substring(0, 14) + '...'
      return v
    }

    function handleAction(action) {
      pendingAction.value = action
      emit('click', action)
      if (action === 'start') emit('start')
      else if (action === 'stop') emit('stop')
      else if (action === 'restart') emit('restart')
      setTimeout(() => { pendingAction.value = null }, 1000)
    }

    return {
      statusText,
      statusIcon,
      ringDasharray,
      cardClass,
      iconBgClass,
      pendingAction,
      formatVersion,
      handleAction
    }
  }
}
</script>

<style scoped>
.service-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e2e6ed;
  transition: border-color 0.15s ease;
  position: relative;
}

.service-card:hover {
  border-color: #00508E;
}

/* 顶部区域 */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.service-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e6ed;
  background: #fafbfc;
  font-size: 12px;
  font-weight: 700;
  color: #00508E;
  letter-spacing: 0.5px;
}

.icon-emoji {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

/* 状态图标 */
.ring-status {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-ring-svg {
  display: none;
}

.ring-center {
  position: relative;
}

.ring-icon {
  font-size: 12px;
  font-weight: 700;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid #e2e6ed;
  background: #fafbfc;
  color: #9ca3af;
}

.status-running .ring-icon {
  color: #389e0d;
  border-color: #b7eb8f;
  background: #f6ffed;
}

.status-stopped .ring-icon {
  color: #9ca3af;
  border-color: #e2e6ed;
  background: #fafbfc;
}

.status-error .ring-icon {
  color: #cf1322;
  border-color: #ffa39e;
  background: #fff1f0;
}

.status-starting .ring-icon,
.status-stopping .ring-icon {
  color: #d48806;
  border-color: #ffd591;
  background: #fffbe6;
}

/* 服务信息 */
.service-info {
  margin-bottom: 8px;
}

.service-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 2px 0;
}

.service-subtitle {
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
}

/* 状态标签 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
  border: 1px solid transparent;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.badge-running {
  background: #f6ffed;
  color: #389e0d;
  border-color: #b7eb8f;
}

.badge-running .badge-dot {
  background: #52c41a;
}

.badge-stopped {
  background: #fafbfc;
  color: #9ca3af;
  border-color: #e2e6ed;
}

.badge-stopped .badge-dot {
  background: #bfbfbf;
}

.badge-error {
  background: #fff1f0;
  color: #cf1322;
  border-color: #ffa39e;
}

.badge-error .badge-dot {
  background: #ff4d4f;
}

.badge-starting,
.badge-stopping {
  background: #fffbe6;
  color: #d48806;
  border-color: #ffd591;
}

.badge-starting .badge-dot,
.badge-stopping .badge-dot {
  background: #faad14;
}

.badge-unknown,
.badge-checking {
  background: #fafbfc;
  color: #9ca3af;
  border-color: #e2e6ed;
}

.badge-unknown .badge-dot,
.badge-checking .badge-dot {
  background: #bfbfbf;
}

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 8px 10px;
  background: #fafbfc;
  border-radius: 6px;
  margin-bottom: 10px;
  border: 1px solid #f0f2f5;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.detail-label {
  font-size: 10px;
  font-weight: 500;
  color: #9ca3af;
}

.detail-value {
  font-size: 11px;
  font-weight: 500;
  color: #5a607f;
  font-variant-numeric: tabular-nums;
}

.detail-value.version {
  color: #00508E;
  font-family: 'SF Mono', Consolas, Monaco, monospace;
}

.detail-value.pid {
  color: #722ed1;
  font-family: 'SF Mono', Consolas, Monaco, monospace;
}

.detail-value.uptime {
  color: #389e0d;
}

/* 快速操作按钮 */
.quick-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  flex: 1;
  height: 30px;
  border: 1px solid #e2e6ed;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  font-family: inherit;
  color: #5a607f;
}

.action-btn:not(:disabled):hover {
  border-color: #00508E;
  color: #00508E;
  background: #e6f0fa;
}

.btn-icon {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.btn-deploy {
  background: #00508E;
  border-color: #00508E;
  color: #fff;
}

.btn-deploy:not(:disabled):hover {
  background: #003d6e;
  border-color: #003d6e;
  color: #fff;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.is-loading {
  position: relative;
}

.action-btn.is-loading::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
