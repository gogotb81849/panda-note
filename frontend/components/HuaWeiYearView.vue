<template>
  <div class="hw-year-view">
    <div class="year-header">
      <span class="year-label">{{ year }}年</span>
      <span class="year-ganzhi">{{ yearGanZhi }}（{{ yearAnimal }}年）</span>
    </div>

    <div class="year-grid">
      <div
        v-for="m in 12"
        :key="m"
        class="month-card"
        :class="{ 'is-current-month': m === currentMonth }"
        @click="$emit('month-click', m)"
      >
        <div class="month-card-header">
          <span class="month-label">{{ m }}月</span>
          <span class="month-lunar">{{ monthLunarNames[m - 1] }}</span>
        </div>
        <div class="month-day-grid">
          <!-- 周表头 -->
          <div
            v-for="(d, i) in displayWeekDays"
            :key="'h' + i"
            class="day-header"
            :class="{ 'is-weekend': isWeekendByIndex(i) }"
          >{{ d }}</div>
          <!-- 日期格 -->
          <div
            v-for="(cell, ci) in monthCells[m - 1]"
            :key="ci"
            class="day-mini"
            :class="dayMiniClass(cell, m)"
            @click.stop="$emit('date-click', cell.dateStr)"
          >
            <span class="mini-day">{{ cell.day }}</span>
            <span v-if="cell.caption" class="mini-caption">{{ cell.caption }}</span>
            <span v-if="cell.eventCount > 0" class="mini-event-dot"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Schedule } from '~/types'
import { useLunar } from '~/composables/useLunar'

interface Props {
  date: Date
  schedules?: Schedule[]
  weekStartMonday?: boolean
  showLunar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  schedules: () => [],
  weekStartMonday: false,
  showLunar: true,
})

defineEmits<{
  (e: 'month-click', month: number): void
  (e: 'date-click', dateStr: string): void
}>()

const { getLunarInfo, getDayCaption } = useLunar()

const year = computed(() => props.date.getFullYear())
const currentMonth = computed(() => {
  const now = new Date()
  if (now.getFullYear() === year.value) return now.getMonth() + 1
  return 0
})

// 年干支+生肖
const yearGanZhi = computed(() => getLunarInfo(props.date).ganZhi)
const yearAnimal = computed(() => getLunarInfo(props.date).animal)

// 表头周一-周日 / 周日-周六
const displayWeekDays = computed(() => {
  if (props.weekStartMonday) {
    return ['一', '二', '三', '四', '五', '六', '日']
  }
  return ['日', '一', '二', '三', '四', '五', '六']
})

function isWeekendByIndex(idx: number): boolean {
  if (props.weekStartMonday) {
    return idx === 5 || idx === 6
  }
  return idx === 0 || idx === 6
}

// 每月农历月名（取月初的农历月名）
const monthLunarNames = computed(() => {
  const names: string[] = []
  for (let m = 1; m <= 12; m++) {
    const firstDay = new Date(year.value, m - 1, 1)
    const info = getLunarInfo(firstDay)
    // 用农历月名表示，如"正月"、"二月"等
    const lunarMonthNames = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月']
    names.push(lunarMonthNames[info.lunarMonth - 1] || `${info.lunarMonth}月`)
  }
  return names
})

// 12 个月的日期网格
const monthCells = computed(() => {
  const result: any[][] = []
  for (let m = 1; m <= 12; m++) {
    result.push(buildMonthCells(year.value, m))
  }
  return result
})

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toYmdFromAny(d: string | Date): string {
  if (d instanceof Date) return toYmd(d)
  return String(d).slice(0, 10)
}

function buildMonthCells(y: number, m: number): any[] {
  const firstOfMonth = new Date(y, m - 1, 1)
  let startOffset = firstOfMonth.getDay()
  if (props.weekStartMonday) {
    startOffset = (startOffset + 6) % 7
  }
  const startDate = new Date(y, m - 1, 1 - startOffset)

  const cells: any[] = []
  const todayStr = toYmd(new Date())
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate)
    cellDate.setDate(cellDate.getDate() + i)
    const dateStr = toYmd(cellDate)
    const caption = props.showLunar ? getDayCaption(cellDate) : ''
    const events = props.schedules.filter(s => toYmdFromAny(s.recordDate) === dateStr)
    cells.push({
      date: cellDate,
      dateStr,
      day: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === m - 1,
      isToday: dateStr === todayStr,
      isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
      caption,
      eventCount: events.length,
    })
  }
  return cells
}

function dayMiniClass(cell: any, m: number): Record<string, boolean> {
  return {
    'not-current-month': !cell.isCurrentMonth,
    'is-today': cell.isToday,
    'is-weekend': cell.isWeekend,
    'has-event': cell.eventCount > 0,
    'has-festival': !!cell.caption && isFestival(cell.caption),
  }
}

const KNOWN_FESTIVALS = ['元旦','春节','元宵节','龙抬头','端午节','七夕节','中元节','中秋节','重阳节','腊八节','小年','除夕','情人节','妇女节','植树节','愚人节','劳动节','青年节','儿童节','建党节','建军节','教师节','国庆节','双十一','圣诞节']
function isFestival(text: string): boolean {
  return KNOWN_FESTIVALS.includes(text)
}
</script>

<style scoped>
.hw-year-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  padding: 12px;
  overflow: auto;
}

.year-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 4px 16px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 12px;
}

.year-label {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.year-ganzhi {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.year-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  min-height: 0;
}

.month-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  min-height: 0;
}

.month-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.month-card.is-current-month {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb, 64, 158, 255), 0.02);
}

.month-card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 6px;
}

.month-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.month-lunar {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.month-day-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  gap: 1px;
  min-height: 0;
}

.day-header {
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-align: center;
  padding: 2px 0;
}

.day-header.is-weekend {
  color: var(--color-danger);
}

.day-mini {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  padding: 1px;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.15s;
}

.day-mini:hover {
  background: var(--color-surface-hover);
}

.day-mini.not-current-month {
  color: var(--color-text-placeholder);
  opacity: 0.4;
}

.day-mini.is-weekend .mini-day {
  color: var(--color-danger);
}

.day-mini.is-today {
  background: var(--color-primary);
  color: #fff;
}

.day-mini.is-today .mini-day,
.day-mini.is-today .mini-caption {
  color: #fff;
}

.day-mini.has-festival .mini-caption {
  color: var(--color-danger);
}

.mini-day {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
}

.mini-caption {
  font-size: 9px;
  color: var(--color-text-secondary);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.mini-event-dot {
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-primary);
}

.day-mini.is-today .mini-event-dot {
  background: #fff;
}
</style>
