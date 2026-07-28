<template>
  <div class="status-bar">
    <div class="status-left">
      <span class="logo">🐼 熊猫笔记 · 运维监控</span>
      <span class="version">v2.0</span>
    </div>
    <div class="status-center">
      <div class="service-dots">
        <div v-for="s in services" :key="s.name" class="dot-item" :title="s.name">
          <span class="dot" :class="'dot-' + s.status"></span>
          <span class="dot-label">{{ s.name }}</span>
        </div>
      </div>
    </div>
    <div class="status-right">
      <span class="status-badge" :class="wsConnected ? 'badge-ok' : 'badge-err'">
        <span class="pulse" :class="{ 'pulse-active': wsConnected }"></span>
        {{ wsConnected ? '实时连接' : '已断开' }}
      </span>
      <span class="update-time">{{ lastUpdate }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatusBar',
  props: {
    services: { type: Array, default: () => [] },
    lastUpdate: { type: String, default: '' },
    wsConnected: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.status-left { display: flex; align-items: center; gap: 12px; }
.logo { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.version {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg);
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
}

.status-center { display: flex; align-items: center; }
.service-dots { display: flex; gap: 24px; }
.dot-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  background: var(--text-light);
  position: relative;
  flex-shrink: 0;
}
.dot-running { background: var(--success); box-shadow: 0 0 0 3px rgba(0,180,42,0.15); }
.dot-stopped, .dot-unknown { background: var(--text-light); }
.dot-error { background: var(--danger); box-shadow: 0 0 0 3px rgba(245,63,63,0.15); }
.dot-checking { background: var(--warning); animation: pulseDot 1s infinite; }

@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.dot-label { font-size: 12px; color: var(--text-secondary); }

.status-right { display: flex; align-items: center; gap: 14px; }
.status-badge {
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.badge-ok {
  background: #E8FFF0;
  color: var(--success);
  border: 1px solid #B7F2C7;
}
.badge-err {
  background: #FFF0F0;
  color: var(--danger);
  border: 1px solid #FFD4D4;
}

.pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.pulse-active { animation: pulseGlow 1.5s ease-in-out infinite; }

@keyframes pulseGlow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.4); }
}

.update-time {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .status-center { display: none; }
  .status-bar { padding: 0 16px; }
}
</style>