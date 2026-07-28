<template>
  <div class="screensaver" @click="exitScreensaver" @keydown.esc="exitScreensaver">
    <div class="clock-container">
      <div class="time">{{ currentTime }}</div>
      <div class="date">{{ currentDate }}</div>
      <div class="weekday">{{ weekday }}</div>
    </div>

    <div v-if="showSchedule && todaySchedule.length > 0" class="schedule-summary">
      <h3>今日日程</h3>
      <ul>
        <li v-for="item in todaySchedule" :key="item.id">
          <span class="schedule-time">{{ formatScheduleTime(item) }}</span>
          <span class="schedule-title">{{ item.secondType || item.title }}</span>
        </li>
      </ul>
    </div>

    <div class="hint">点击任意位置或按ESC退出</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const api = useApi()

const currentTime = ref('')
const currentDate = ref('')
const weekday = ref('')
const showSchedule = ref(true)
const todaySchedule = ref<any[]>([])

let timer: ReturnType<typeof setInterval> | null = null
let moveTimer: ReturnType<typeof setTimeout> | null = null

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  weekday.value = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
}

function formatScheduleTime(item: any) {
  if (item.startTime) {
    return item.startTime.substring(0, 5)
  }
  return ''
}

async function loadTodaySchedule() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const result: any = await api.schedules.getAll(today, today)
    if (result.data) {
      todaySchedule.value = result.data
    }
  } catch (e) {
    console.error('获取日程失败', e)
  }
}

function exitScreensaver() {
  if (window.opener) {
    window.close()
  } else {
    history.back()
  }
}

function handleMouseMove() {
  if (moveTimer) {
    clearTimeout(moveTimer)
  }
  moveTimer = setTimeout(() => {
    exitScreensaver()
  }, 30000)
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  loadTodaySchedule()
  document.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (moveTimer) {
    clearTimeout(moveTimer)
  }
  document.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
.screensaver {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  cursor: pointer;
  user-select: none;
}

.clock-container {
  text-align: center;
}

.time {
  font-size: 15vw;
  font-weight: 100;
  letter-spacing: -0.02em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.date {
  font-size: 3vw;
  opacity: 0.7;
  margin-top: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.weekday {
  font-size: 2vw;
  opacity: 0.5;
  margin-top: 10px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.schedule-summary {
  position: absolute;
  bottom: 80px;
  text-align: center;
  max-width: 80%;
}

.schedule-summary h3 {
  font-size: 1.5vw;
  font-weight: 400;
  opacity: 0.6;
  margin-bottom: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.schedule-summary ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.schedule-summary li {
  font-size: 1.2vw;
  opacity: 0.5;
  margin: 8px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.schedule-time {
  margin-right: 10px;
  opacity: 0.7;
}

.schedule-title {
  opacity: 0.9;
}

.hint {
  position: absolute;
  bottom: 30px;
  font-size: 14px;
  opacity: 0.3;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
