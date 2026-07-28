<template>
  <div class="week-view">
    <div class="grid grid-cols-7 gap-2">
      <div
        v-for="day in weekDays"
        :key="day.date.toISOString()"
        class="day-column"
        :class="{ today: isToday(day.date) }"
        @click="handleDayClick(day.date)"
      >
        <div class="day-header text-center py-2 font-medium border-b">
          <div>{{ day.dayName }}</div>
          <div class="text-lg">{{ day.date.getDate() }}</div>
        </div>
        <div class="day-body min-h-[400px] p-2 space-y-2">
          <div
            v-for="event in day.events"
            :key="event.id"
            class="event-card glass-card p-3 cursor-pointer"
            :class="getPriorityClass(event.priority)"
            @click.stop="$emit('schedule-click', event)"
          >
            <div class="font-medium text-sm">{{ event.secondType }}</div>
            <div class="text-xs text-gray-500 mt-1 truncate">{{ event.eventDetail }}</div>
            <div class="text-xs text-gray-400 mt-1">
              {{ event.ship?.cnShipName || '通用' }}
            </div>
          </div>
        </div>
      </div>
    </div>
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

const weekDays = computed(() => {
  const result = []
  const start = new Date(props.date)
  start.setDate(start.getDate() - start.getDay())
  
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    
    const events = props.schedules.filter(s => {
      const sDate = new Date(s.recordDate)
      return sDate.toDateString() === date.toDateString()
    })
    
    result.push({
      date,
      dayName: dayNames[i],
      events,
    })
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
    urgent_important: 'border-l-4 border-red-500',
    important: 'border-l-4 border-yellow-500',
    urgent: 'border-l-4 border-blue-500',
    normal: 'border-l-4 border-green-500',
    low: 'border-l-4 border-gray-500',
  }
  return map[priority] || 'border-l-4 border-gray-500'
}
</script>

<style scoped>
.week-view {
  height: 100%;
  overflow: auto;
}

.day-column {
  cursor: pointer;
}

.day-column:hover {
  background-color: #f5f7fa;
}

.day-column.today {
  background-color: #e3f2fd;
}

.event-card:hover {
  opacity: 0.8;
}
</style>
