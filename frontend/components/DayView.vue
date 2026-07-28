<template>
  <div class="day-view">
    <div class="day-header text-center py-4 border-b" :class="{ today: isToday }">
      <h3 class="text-2xl font-bold">{{ currentDateStr }}</h3>
      <p class="text-gray-500">{{ weekDayName }}</p>
    </div>
    <div class="day-body p-4">
      <div v-if="dayEvents.length === 0" class="text-center text-gray-400 py-20">
        当天没有日程安排
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="event in dayEvents"
          :key="event.id"
          class="event-card glass-card p-4 cursor-pointer hover:shadow-md transition-shadow"
          :class="getPriorityClass(event.priority)"
          @click="$emit('schedule-click', event)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <el-tag size="small" :type="getStatusType(event.finishStatus)">
                  {{ getStatusText(event.finishStatus) }}
                </el-tag>
                <el-tag size="small" :type="getPriorityType(event.priority)">
                  {{ getPriorityText(event.priority) }}
                </el-tag>
              </div>
              <h4 class="text-lg font-medium mb-2">{{ event.secondType }}</h4>
              <div class="text-gray-600 mb-2">
                {{ event.ship?.cnShipName || '通用' }}
              </div>
              <div class="text-gray-700 whitespace-pre-wrap">{{ event.eventDetail }}</div>
            </div>
            <div class="text-sm text-gray-400 ml-4">
              {{ event.firstType }}
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
defineEmits(['schedule-click'])

const isToday = computed(() => {
  const today = new Date()
  return props.date.toDateString() === today.toDateString()
})

const currentDateStr = computed(() => {
  const d = props.date
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const weekDayName = computed(() => {
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return dayNames[props.date.getDay()]
})

const dayEvents = computed(() => {
  return props.schedules.filter(s => {
    const sDate = new Date(s.recordDate)
    return sDate.toDateString() === props.date.toDateString()
  }).sort((a, b) => {
      const priorityOrder = ['urgent_important', 'important', 'urgent', 'normal', 'low']
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
    })
})

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const getPriorityType = (priority: string) => {
  const map: Record<string, any> = {
    urgent_important: 'danger',
    important: 'warning',
    urgent: 'primary',
    normal: 'success',
    low: '',
  }
  return map[priority] || ''
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: '重要紧急',
    important: '重要不紧急',
    urgent: '紧急不重要',
    normal: '不紧急不重要',
    low: '低',
  }
  return map[priority] || priority
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
.day-view {
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.day-header {
  background-color: white;
  flex-shrink: 0;
}

.day-header.today {
  background-color: #e3f2fd;
}

.day-body {
  flex: 1;
  overflow-y: auto;
}

.event-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
