<template>
  <div class="month-view">
    <el-table :data="weeks" style="width: 100%" border stripe>
      <el-table-column
        v-for="day in weekDays"
        :key="day"
        :label="day"
        :width="100"
      >
        <template #default="{ row }">
          <div class="day-cell" :class="{ today: isToday(row[day].date) }" @click="handleDayClick(row[day].date)">
            <div class="day-number">{{ row[day].date.getDate() }}</div>
            <div class="events">
              <div
                v-for="event in row[day].events"
                :key="event.id"
                class="event-item"
                :class="getPriorityClass(event.priority)"
                @click.stop="$emit('schedule-click', event)"
              >
                <div class="event-title truncate">{{ event.secondType }}</div>
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Schedule } from '~/types'

interface Props {
  schedules: Schedule[]
  date: Date
}

const props = defineProps<Props>()
const emit = defineEmits(['date-click', 'schedule-click'])

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const weeks = computed(() => {
  const year = props.date.getFullYear()
  const month = props.date.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const result: any[] = []
  let currentWeek: any = {}
  let currentDay = new Date(firstDay)
  
  // 调整到本周日
  currentDay.setDate(currentDay.getDate() - currentDay.getDay())
  
  for (let i = 0; i < 42; i++) {
    const dayName = weekDays[currentDay.getDay()]
    
    const dayEvents = props.schedules.filter(s => {
      const sDate = new Date(s.recordDate)
      return sDate.toDateString() === currentDay.toDateString()
    })
    
    if (!currentWeek[dayName]) {
      currentWeek[dayName] = { date: new Date(currentDay), events: dayEvents }
    }
    
    if (currentDay.getDay() === 6) {
      result.push(currentWeek)
      currentWeek = {}
    }
    
    currentDay.setDate(currentDay.getDate() + 1)
  }
  
  return result
})

const isToday = (date: Date) => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

const handleDayClick = (date: Date) => {
  emit('date-click', date.toISOString().split('T')[0])
}

const getPriorityClass = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: 'bg-red-100 text-red-800',
    important: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-blue-100 text-blue-800',
    normal: 'bg-green-100 text-green-800',
    low: 'bg-gray-100 text-gray-800',
  }
  return map[priority] || 'bg-gray-100 text-gray-800'
}
</script>

<style scoped>
.month-view {
  height: 100%;
  overflow: auto;
}

:deep(.el-table) {
  height: 100% !important;
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto !important;
}

.day-cell {
  min-height: 80px;
  padding: 4px;
  cursor: pointer;
}

.day-cell:hover {
  background-color: #f5f5f5;
}

.day-cell.today {
  background-color: #e3f2fd;
}

.day-number {
  font-weight: bold;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-item {
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.event-item:hover {
  opacity: 0.8;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
