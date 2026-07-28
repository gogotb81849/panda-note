<template>
  <div class="health-ring-container">
    <svg viewBox="0 0 120 120" class="health-ring-svg">
      <!-- 背景圆环 -->
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="#f0f0f0"
        stroke-width="8"
      />
      
      <!-- 进度圆环 -->
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        :stroke="ringColor"
        stroke-width="8"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        class="ring-progress"
      />
    </svg>
    
    <!-- 中心内容 -->
    <div class="ring-center">
      <div class="ring-value">{{ value }}</div>
      <div class="ring-unit">{{ unit }}</div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'HealthRing',
  props: {
    value: { type: [Number, String], default: 0 },
    unit: { type: String, default: '%' },
    label: { type: String, default: '健康度' },
    size: { type: Number, default: 120 }
  },
  setup(props) {
    const circumference = 2 * Math.PI * 50
    
    const dashOffset = computed(() => {
      const percent = Math.min(100, Math.max(0, Number(props.value)))
      return circumference * (1 - percent / 100)
    })
    
    const ringColor = computed(() => {
      const v = Number(props.value)
      if (v >= 80) return '#52c41a'
      if (v >= 50) return '#faad14'
      return '#ff4d4f'
    })
    
    return {
      circumference,
      dashOffset,
      ringColor
    }
  }
}
</script>

<style scoped>
.health-ring-container {
  position: relative;
  width: 100px;
  height: 100px;
}

.health-ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke-dashoffset 0.5s ease;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-value {
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ring-unit {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  margin-top: 2px;
}
</style>
