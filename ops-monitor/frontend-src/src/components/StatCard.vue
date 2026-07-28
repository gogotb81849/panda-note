<template>
  <div class="stat-card" :class="`card-${type}`">
    <!-- 顶部区域：标题 + 数值 -->
    <div class="card-header">
      <span class="card-label">{{ label }}</span>
      <span class="card-icon">{{ icon }}</span>
    </div>

    <!-- 主数值 -->
    <div class="card-value">
      <span class="value-number">{{ displayValue }}</span>
      <span class="value-unit" v-if="unit">{{ unit }}</span>
    </div>

    <!-- 副标题 -->
    <div class="card-sub" v-if="sub">{{ sub }}</div>

    <!-- 趋势 -->
    <div class="card-trend" v-if="trend !== 0" :class="trendClass">
      <span class="trend-arrow">{{ trend > 0 ? '↑' : '↓' }}</span>
      <span class="trend-value">{{ Math.abs(trend) }}%</span>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'StatCard',
  props: {
    icon: { type: String, default: '📊' },
    label: { type: String, required: true },
    value: { type: [Number, String], default: 0 },
    unit: { type: String, default: '' },
    sub: { type: String, default: '' },
    trend: { type: Number, default: 0 },
    type: { type: String, default: 'default' },
    showRing: { type: Boolean, default: false },
    ringPercent: { type: Number, default: 0 }
  },
  setup(props) {
    const displayValue = computed(() => {
      const v = props.value
      if (typeof v === 'number') {
        return v.toLocaleString('zh-CN')
      }
      return v
    })

    const trendClass = computed(() => {
      return props.trend > 0 ? 'trend-up' : 'trend-down'
    })

    return {
      displayValue,
      trendClass
    }
  }
}
</script>

<style scoped>
.stat-card {
  padding: 14px 16px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e6ed;
  min-width: 160px;
  flex: 1;
  transition: border-color 0.15s ease;
}

.stat-card:hover {
  border-color: #00508E;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-label {
  font-size: 12px;
  font-weight: 500;
  color: #5a607f;
}

.card-icon {
  font-size: 10px;
  font-weight: 700;
  color: #00508E;
  background: #e6f0fa;
  padding: 3px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.card-value {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-bottom: 4px;
}

.value-number {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  color: #1a1a2e;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.value-unit {
  font-size: 13px;
  font-weight: 500;
  color: #5a607f;
}

.card-sub {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 6px;
}

.card-trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.trend-up {
  color: #cf1322;
  background: #fff1f0;
}

.trend-down {
  color: #389e0d;
  background: #f6ffed;
}

.trend-arrow {
  font-size: 10px;
}

.card-success .value-number {
  color: #389e0d;
}

.card-warning .value-number {
  color: #d48806;
}

.card-info .value-number {
  color: #00508E;
}

.card-danger .value-number {
  color: #cf1322;
}
</style>
