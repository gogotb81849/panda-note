<template>
  <div class="resource-monitor" :class="isRemote ? 'monitor-remote' : 'monitor-local'">
    <!-- 头部 -->
    <div class="monitor-header">
      <div class="header-left">
        <span class="header-icon">RES</span>
        <span class="header-title">{{ isRemote ? '服务器资源' : '本机资源' }}</span>
      </div>
      <div class="header-right">
        <span class="uptime-badge" v-if="uptime">
          <span class="uptime-icon">UP</span>
          {{ uptime }}
        </span>
      </div>
    </div>

    <!-- 四宫格仪表盘 -->
    <div class="gauge-grid">
      <!-- CPU -->
      <div class="gauge-cell">
        <div class="gauge-container">
          <svg viewBox="0 0 120 70" class="gauge-svg">
            <!-- 背景弧 -->
            <path
              :d="arcPath(0, 90)"
              fill="none"
              stroke="#E5E7EB"
              stroke-width="10"
              stroke-linecap="round"
            />
            <!-- 进度弧 -->
            <path
              :d="arcPath(0, cpuAngle)"
              fill="none"
              :stroke="getGaugeColor(cpuPercent)"
              stroke-width="10"
              stroke-linecap="round"
              class="gauge-progress"
            />
            <!-- 刻度线 -->
            <g class="gauge-ticks">
              <line x1="15" y1="60" x2="20" y2="60" stroke="#D1D5DB" stroke-width="1" />
              <line x1="60" y1="10" x2="60" y2="15" stroke="#D1D5DB" stroke-width="1" />
              <line x1="105" y1="60" x2="100" y2="60" stroke="#D1D5DB" stroke-width="1" />
            </g>
          </svg>
          <div class="gauge-value">
            <span class="value-number">{{ cpuPercent }}</span>
            <span class="value-unit">%</span>
          </div>
        </div>
        <div class="gauge-label">
          <span class="label-icon">CPU</span>
          <span class="label-text">CPU</span>
        </div>
        <div class="gauge-detail" v-if="cpuCores">
          <span>{{ cpuCores }} 核心</span>
        </div>
      </div>

      <!-- 内存 -->
      <div class="gauge-cell">
        <div class="gauge-container">
          <svg viewBox="0 0 120 70" class="gauge-svg">
            <path
              :d="arcPath(0, 90)"
              fill="none"
              stroke="#E5E7EB"
              stroke-width="10"
              stroke-linecap="round"
            />
            <path
              :d="arcPath(0, memAngle)"
              fill="none"
              :stroke="getGaugeColor(memPercent)"
              stroke-width="10"
              stroke-linecap="round"
              class="gauge-progress"
            />
            <g class="gauge-ticks">
              <line x1="15" y1="60" x2="20" y2="60" stroke="#D1D5DB" stroke-width="1" />
              <line x1="60" y1="10" x2="60" y2="15" stroke="#D1D5DB" stroke-width="1" />
              <line x1="105" y1="60" x2="100" y2="60" stroke="#D1D5DB" stroke-width="1" />
            </g>
          </svg>
          <div class="gauge-value">
            <span class="value-number">{{ memPercent }}</span>
            <span class="value-unit">%</span>
          </div>
        </div>
        <div class="gauge-label">
          <span class="label-icon">MEM</span>
          <span class="label-text">内存</span>
        </div>
        <div class="gauge-detail" v-if="memUsed">
          <span>{{ memUsed }} / {{ memTotal }} GB</span>
        </div>
      </div>

      <!-- 磁盘 -->
      <div class="gauge-cell">
        <div class="gauge-container">
          <svg viewBox="0 0 120 70" class="gauge-svg">
            <path
              :d="arcPath(0, 90)"
              fill="none"
              stroke="#E5E7EB"
              stroke-width="10"
              stroke-linecap="round"
            />
            <path
              :d="arcPath(0, diskAngle)"
              fill="none"
              :stroke="getGaugeColor(diskPercent)"
              stroke-width="10"
              stroke-linecap="round"
              class="gauge-progress"
            />
            <g class="gauge-ticks">
              <line x1="15" y1="60" x2="20" y2="60" stroke="#D1D5DB" stroke-width="1" />
              <line x1="60" y1="10" x2="60" y2="15" stroke="#D1D5DB" stroke-width="1" />
              <line x1="105" y1="60" x2="100" y2="60" stroke="#D1D5DB" stroke-width="1" />
            </g>
          </svg>
          <div class="gauge-value">
            <span class="value-number">{{ diskPercent }}</span>
            <span class="value-unit">%</span>
          </div>
        </div>
        <div class="gauge-label">
          <span class="label-icon">DSK</span>
          <span class="label-text">磁盘</span>
        </div>
        <div class="gauge-detail" v-if="diskUsed">
          <span>{{ diskUsed }} / {{ diskTotal }} GB</span>
        </div>
      </div>

      <!-- 网络 -->
      <div class="gauge-cell">
        <div class="gauge-container">
          <svg viewBox="0 0 120 70" class="gauge-svg">
            <path
              :d="arcPath(0, 90)"
              fill="none"
              stroke="#E5E7EB"
              stroke-width="10"
              stroke-linecap="round"
            />
            <path
              :d="arcPath(0, networkAngle)"
              fill="none"
              stroke="#3B82F6"
              stroke-width="10"
              stroke-linecap="round"
              class="gauge-progress"
            />
            <g class="gauge-ticks">
              <line x1="15" y1="60" x2="20" y2="60" stroke="#D1D5DB" stroke-width="1" />
              <line x1="60" y1="10" x2="60" y2="15" stroke="#D1D5DB" stroke-width="1" />
              <line x1="105" y1="60" x2="100" y2="60" stroke="#D1D5DB" stroke-width="1" />
            </g>
          </svg>
          <div class="gauge-value gauge-value-network">
            <span class="value-icon">NET</span>
          </div>
        </div>
        <div class="gauge-label">
          <span class="label-icon">NET</span>
          <span class="label-text">网络</span>
        </div>
        <div class="gauge-detail network-stats">
          <span class="net-down">↓ {{ netRecv }}MB</span>
          <span class="net-up">↑ {{ netSent }}MB</span>
        </div>
      </div>
    </div>

    <!-- 趋势图表 -->
    <div class="trend-section" v-if="trendData.length > 0">
      <div class="trend-header">
        <span class="trend-title">资源趋势</span>
      </div>
      <TrendChart
        :data="trendData"
        :width="280"
        :height="50"
        line-color="#3B82F6"
        :show-labels="true"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import TrendChart from './TrendChart.vue'

export default {
  name: 'ResourceMonitor',
  components: { TrendChart },
  props: {
    data: { type: Object, default: () => ({}) },
    isRemote: { type: Boolean, default: false },
    uptime: { type: String, default: '' }
  },
  setup(props) {
    const cpuPercent = computed(() => Math.round(props.data?.cpu?.percent || 0))
    const memPercent = computed(() => Math.round(props.data?.memory?.percent || 0))
    const diskPercent = computed(() => Math.round(props.data?.disk?.percent || 0))
    const cpuCores = computed(() => props.data?.cpu?.cores || null)
    const memUsed = computed(() => (props.data?.memory?.used_gb || 0).toFixed(1))
    const memTotal = computed(() => (props.data?.memory?.total_gb || 0).toFixed(1))
    const diskUsed = computed(() => (props.data?.disk?.used_gb || 0).toFixed(1))
    const diskTotal = computed(() => (props.data?.disk?.total_gb || 0).toFixed(1))
    const netSent = computed(() => (props.data?.network?.sent_mb || 0).toFixed(1))
    const netRecv = computed(() => (props.data?.network?.recv_mb || 0).toFixed(1))

    // 模拟趋势数据
    const trendData = computed(() => {
      const base = cpuPercent.value
      return Array.from({ length: 20 }, (_, i) => {
        return Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 20))
      })
    })

    // 角度计算 (0-90度对应0-100%)
    const cpuAngle = computed(() => (cpuPercent.value / 100) * 90)
    const memAngle = computed(() => (memPercent.value / 100) * 90)
    const diskAngle = computed(() => (diskPercent.value / 100) * 90)
    const networkAngle = computed(() => 45) // 固定45度

    function getGaugeColor(percent) {
      if (percent >= 85) return '#EF4444' // 红色
      if (percent >= 65) return '#F59E0B' // 黄色
      return '#10B981' // 绿色
    }

    // 半圆弧路径计算
    function arcPath(startAngle, endAngle) {
      const cx = 60
      const cy = 60
      const r = 50
      const startRad = (startAngle - 90) * Math.PI / 180
      const endRad = (endAngle - 90) * Math.PI / 180
      const x1 = cx + r * Math.cos(startRad)
      const y1 = cy + r * Math.sin(startRad)
      const x2 = cx + r * Math.cos(endRad)
      const y2 = cy + r * Math.sin(endRad)
      const largeArc = endAngle - startAngle > 45 ? 1 : 0
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
    }

    return {
      cpuPercent,
      memPercent,
      diskPercent,
      cpuCores,
      memUsed,
      memTotal,
      diskUsed,
      diskTotal,
      netSent,
      netRecv,
      trendData,
      cpuAngle,
      memAngle,
      diskAngle,
      networkAngle,
      getGaugeColor,
      arcPath
    }
  }
}
</script>

<style scoped>
.resource-monitor {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e2e6ed;
  margin-top: 10px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00508E;
  font-size: 11px;
  font-weight: 700;
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}

.uptime-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #fafbfc;
  border-radius: 6px;
  font-size: 11px;
  color: #5a607f;
  font-variant-numeric: tabular-nums;
  border: 1px solid #e2e6ed;
}

.uptime-icon {
  font-size: 10px;
  font-weight: 600;
}

/* 四宫格仪表盘 */
.gauge-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.gauge-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #f0f2f5;
}

.gauge-container {
  position: relative;
  width: 80px;
  height: 50px;
}

.gauge-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.gauge-progress {
  transition: stroke-dasharray 0.5s ease;
}

.gauge-value {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.gauge-value-network {
  bottom: 4px;
}

.value-number {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.value-unit {
  font-size: 10px;
  font-weight: 500;
  color: #9ca3af;
  margin-left: 1px;
}

.value-icon {
  font-size: 12px;
  font-weight: 700;
  color: #00508E;
}

.gauge-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.label-icon {
  font-size: 10px;
  font-weight: 700;
  color: #00508E;
}

.label-text {
  font-size: 11px;
  font-weight: 500;
  color: #5a607f;
}

.gauge-detail {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.network-stats {
  display: flex;
  gap: 6px;
}

.net-down {
  color: #389e0d;
}

.net-up {
  color: #00508E;
}

/* 趋势图表 */
.trend-section {
  padding-top: 10px;
  border-top: 1px solid #f0f2f5;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.trend-title {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
}

@media (max-width: 600px) {
  .gauge-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
