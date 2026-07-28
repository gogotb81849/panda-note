<template>
  <Teleport to="body">
    <div 
      class="screen-saver"
      @click="handleClick"
      @keydown="handleKeydown"
      tabindex="0"
      ref="containerRef"
    >
      <div class="screensaver-content">
        <!-- 日期 -->
        <div class="date-display">
          {{ formattedDate }}
        </div>
        
        <!-- 时钟 -->
        <div class="time-display">
          <div class="time-hours">{{ formattedTime.hours }}</div>
          <div class="time-separator">:</div>
          <div class="time-minutes">{{ formattedTime.minutes }}</div>
          <div class="time-seconds">{{ formattedTime.seconds }}</div>
        </div>
        
        <!-- 星期 -->
        <div class="weekday-display">
          {{ weekday }}
        </div>
        
        <!-- 日程摘要（如果有） -->
        <div v-if="scheduleSummary" class="schedule-summary">
          <p class="schedule-title">今日日程</p>
          <p class="schedule-items">{{ scheduleSummary }}</p>
        </div>
        
        <!-- 提示 -->
        <div class="hint-text">
          按 ESC 或 点击任意处退出
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const currentTime = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null

const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const formattedDate = computed(() => {
  const date = currentTime.value
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
})

const formattedTime = computed(() => {
  const date = currentTime.value
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return { hours, minutes, seconds }
})

const weekday = computed(() => {
  return weekdays[currentTime.value.getDay()]
})

// TODO: 从日程API获取今日日程
const scheduleSummary = ref<string | null>(null)

const updateTime = () => {
  currentTime.value = new Date()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

const handleClick = () => {
  emit('close')
}

onMounted(() => {
  // 启动时钟更新
  timer = setInterval(updateTime, 1000)
  
  // 聚焦以便接收键盘事件
  containerRef.value?.focus()
  
  // 隐藏鼠标光标（一段时间无操作后）
  document.body.style.cursor = 'none'
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  document.body.style.cursor = 'auto'
})
</script>

<style scoped>
.screen-saver {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: none;
  outline: none;
}

.screensaver-content {
  text-align: center;
  color: white;
  user-select: none;
}

.date-display {
  font-size: 28px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
  letter-spacing: 4px;
}

.time-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 20px;
}

.time-hours,
.time-minutes {
  font-size: 160px;
  font-weight: 700;
  color: white;
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.time-separator {
  font-size: 140px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.5);
  animation: blink 1s infinite;
  line-height: 1;
}

.time-seconds {
  font-size: 60px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  align-self: flex-end;
  margin-bottom: 20px;
  font-variant-numeric: tabular-nums;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.weekday-display {
  font-size: 32px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 60px;
  letter-spacing: 8px;
}

.schedule-summary {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px 48px;
  margin-bottom: 60px;
  backdrop-filter: blur(10px);
}

.schedule-title {
  margin: 0 0 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.schedule-items {
  margin: 0;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.hint-text {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 1px;
}

@media (max-width: 768px) {
  .time-hours,
  .time-minutes {
    font-size: 80px;
  }
  
  .time-separator {
    font-size: 70px;
  }
  
  .time-seconds {
    font-size: 30px;
    margin-bottom: 10px;
  }
  
  .date-display {
    font-size: 18px;
  }
  
  .weekday-display {
    font-size: 20px;
    margin-bottom: 40px;
  }
}
</style>
