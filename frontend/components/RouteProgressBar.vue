<template>
  <div class="route-progress">
    <div class="progress-bar">
      <!-- 未完成区域（正常灰色，剩余3天内红色渐变） -->
      <div class="progress-remaining" :style="{ left: progressPercent + '%', width: (100 - progressPercent) + '%', background: remainingGradient }"></div>
      <!-- 已完成区域（蓝绿渐变） -->
      <div class="progress-filled" :style="{ width: progressPercent + '%', background: filledGradient }"></div>
      <!-- 船只图标 -->
      <div class="progress-ship" :style="{ left: progressPercent + '%' }">
        <svg viewBox="0 0 24 16" width="20" height="13">
          <polygon points="0,3 14,3 18,8 14,13 0,13" fill="#4caf50" />
        </svg>
      </div>
    </div>
    <div class="progress-labels">
      <span class="label-departure">{{ departureLabel }}</span>
      <span class="label-remaining" :class="{ 'is-warning': remainingDays <= 3 && remainingDays > 0 }">{{ remainingText }}</span>
      <span class="label-arrival">{{ arrivalLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  departureDate: string
  arrivalDate: string
  currentDate: string
}>()

// 计算进度
const totalDays = computed(() => {
  const departure = new Date(props.departureDate)
  const arrival = new Date(props.arrivalDate)
  return Math.ceil((arrival.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24))
})

const elapsedDays = computed(() => {
  const departure = new Date(props.departureDate)
  const current = new Date(props.currentDate)
  return Math.ceil((current.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24))
})

const remainingDays = computed(() => {
  return totalDays.value - elapsedDays.value
})

const progressPercent = computed(() => {
  if (totalDays.value <= 0) return 0
  return Math.min((elapsedDays.value / totalDays.value) * 100, 100)
})

// 已完成区域渐变：淡蓝色 → 淡绿色，逐步加深
const filledGradient = computed(() => {
  if (progressPercent.value <= 0) return 'transparent'
  const pct = progressPercent.value / 100

  if (pct < 0.3) return 'linear-gradient(90deg, #e3f2fd, #bbdefb)'
  if (pct < 0.6) return 'linear-gradient(90deg, #bbdefb, #90caf9)'
  if (pct < 0.8) return 'linear-gradient(90deg, #90caf9, #a5d6a7)'
  return 'linear-gradient(90deg, #a5d6a7, #81c784)'
})

// 未完成区域渐变：正常灰色，剩余3天内从浅红渐变到深红
const remainingGradient = computed(() => {
  const remaining = remainingDays.value

  // 剩余3天以内：红色渐变，越接近到达越深
  if (remaining <= 3 && remaining > 0) {
    if (remaining <= 1) return 'linear-gradient(90deg, #ff6b6b, #ff4444)'
    if (remaining <= 2) return 'linear-gradient(90deg, #ff8a8a, #ff6b6b)'
    return 'linear-gradient(90deg, #ffa8a8, #ff8a8a)'
  }

  // 正常状态：浅灰色
  return '#e8e8e8'
})

const departureLabel = computed(() => {
  const d = new Date(props.departureDate)
  return `${d.getMonth() + 1}/${d.getDate()}`
})

const arrivalLabel = computed(() => {
  const d = new Date(props.arrivalDate)
  return `${d.getMonth() + 1}/${d.getDate()}`
})

const remainingText = computed(() => {
  if (remainingDays.value <= 0) return '已到达'
  return `剩余 ${remainingDays.value} 天`
})
</script>

<style scoped>
.route-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  position: relative;
  height: 20px;
  border-radius: 10px;
  overflow: visible;
}

.progress-bg {
  position: absolute;
  inset: 0;
  background: #e8e8e8;
  border-radius: 10px;
}

.progress-remaining {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 10px;
  transition: left 0.5s ease, width 0.5s ease, background 0.5s ease;
}

.progress-filled {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease, background 0.5s ease;
}

.progress-ship {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  transition: left 0.5s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #595959;
}

.label-departure,
.label-arrival {
  font-weight: 500;
}

.label-remaining {
  color: #1890ff;
  font-weight: 600;
  transition: color 0.3s ease;
}

.label-remaining.is-warning {
  color: #ff4444;
}
</style>
