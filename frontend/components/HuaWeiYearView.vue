<template>
  <div class="hw-year-view">
    <!-- 顶部：年份 + 干支生肖 + 休班图例（华为风） -->
    <div class="year-header">
      <div class="year-header-left">
        <span class="year-label">{{ year }}年</span>
        <span class="year-ganzhi">{{ yearGanZhi }}（{{ yearAnimal }}年）</span>
      </div>
      <div class="year-header-legend">
        <span class="legend-chip">
          <i class="lc-dot rest"></i>休假
        </span>
        <span class="legend-chip">
          <i class="lc-dot work"></i>调休
        </span>
        <span class="legend-chip">
          <i class="lc-circle"></i>今日
        </span>
      </div>
    </div>

    <div class="year-grid">
      <div
        v-for="m in 12"
        :key="m"
        class="month-card"
        :class="{ 'is-current-month': m === currentMonth }"
        @click="$emit('month-click', m)"
      >
        <!-- 月卡头 -->
        <div class="month-card-header">
          <span class="month-label" :class="{ 'month-label-current': m === currentMonth }">
            {{ m }}月
          </span>
          <span class="month-lunar">{{ monthLunarNames[m - 1] }}</span>
          <span v-if="m === currentMonth" class="current-month-badge">本月</span>
        </div>

        <div class="month-day-grid">
          <!-- 周表头 -->
          <div
            v-for="(d, i) in displayWeekDays"
            :key="'h' + i"
            class="day-header"
            :class="{ 'is-weekend': isWeekendByIndex(i) }"
          >{{ d }}</div>
          <!-- 日期格（纯数字，无caption） -->
          <div
            v-for="(cell, ci) in monthCells[m - 1]"
            :key="ci"
            class="day-mini"
            :class="dayMiniClass(cell)"
            @click.stop="$emit('date-click', cell.dateStr)"
          >
            <span class="mini-day">{{ cell.day }}</span>
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

const { getLunarInfo } = useLunar()

const year = computed(() => props.date.getFullYear())
const currentMonth = computed(() => {
  const now = new Date()
  if (now.getFullYear() === year.value) return now.getMonth() + 1
  return 0
})

const yearGanZhi = computed(() => getLunarInfo(new Date(year.value, 0, 1)).ganZhi)
const yearAnimal = computed(() => getLunarInfo(new Date(year.value, 0, 1)).animal)

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

const monthLunarNames = computed(() => {
  const names: string[] = []
  for (let m = 1; m <= 12; m++) {
    const firstDay = new Date(year.value, m - 1, 1)
    const info = getLunarInfo(firstDay)
    const lunarMonthNames = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月']
    names.push(lunarMonthNames[info.lunarMonth - 1] || `${info.lunarMonth}月`)
  }
  return names
})

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
    const info = props.showLunar ? getLunarInfo(cellDate) : null
    const events = props.schedules.filter(s => toYmdFromAny(s.recordDate) === dateStr)
    cells.push({
      date: cellDate,
      dateStr,
      day: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === m - 1,
      isToday: dateStr === todayStr,
      isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
      isHoliday: !!(info?.isHoliday),
      isWorkday: !!(info?.isWorkday),
      isFirstOrFifteen: !!(info?.isFirstOrFifteen),
      eventCount: events.length,
    })
  }
  return cells
}

function dayMiniClass(cell: any): Record<string, boolean> {
  return {
    'not-current-month': !cell.isCurrentMonth,
    'is-today': cell.isToday,
    'is-weekend': cell.isWeekend,
    'is-holiday-cell': cell.isHoliday,
    'is-workday-cell': cell.isWorkday,
    'is-first-fifteen': cell.isFirstOrFifteen && !cell.isWeekend,
    'has-event': cell.eventCount > 0,
  }
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

/* ========== 顶部 Header ========== */
.year-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 12px;
  border-bottom: 1px solid var(--color-border-light, #ebeef5);
  margin-bottom: 12px;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.year-header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.year-label {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text, #303133);
  letter-spacing: 0.5px;
}
.year-ganzhi {
  font-size: 13px;
  color: var(--color-text-secondary, #909399);
}

.year-header-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  line-height: 16px;
}
.lc-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.lc-dot.rest { background: #67c23a; }
.lc-dot.work { background: #e6a23c; }
.lc-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid #f56c6c;
  background: transparent;
  box-sizing: border-box;
  display: inline-block;
}

/* ========== 年视图 3列×4行 网格（华为截图一致） ========== */
.year-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 12px;
  min-height: 0;
}

.month-card {
  position: relative;
  background: #ffffff;
  border: 1px solid var(--color-border-light, #ebeef5);
  border-radius: 8px;
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  min-height: 0;
  overflow: hidden;
}
.month-card:hover {
  border-color: #f56c6c60;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.08);
}
.month-card.is-current-month {
  border-color: #f56c6c;
  background: rgba(253, 236, 236, 0.15);
}

.month-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.month-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #303133);
}
.month-label-current {
  color: #f56c6c;
}
.month-lunar {
  font-size: 10px;
  color: var(--color-text-secondary, #909399);
}
.current-month-badge {
  background: #f56c6c;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 6px;
  line-height: 13px;
}

/* ========== 月内 7×6 日网格（纯数字，紧凑） ========== */
.month-day-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: auto repeat(6, 1fr);
  gap: 0;
  min-height: 0;
}

.day-header {
  font-size: 9px;
  color: #909399;
  text-align: center;
  padding: 1px 0;
  line-height: 1.2;
}
.day-header.is-weekend {
  color: #f56c6c;
}

.day-mini {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.15s;
  min-height: 0;
  overflow: hidden;
}
.day-mini:hover {
  background: #f5f7fa;
}
.day-mini.not-current-month {
  opacity: 0.35;
}
.day-mini.is-weekend .mini-day {
  color: #f56c6c;
}
.day-mini.is-first-fifteen .mini-day {
  color: #f56c6c;
  font-weight: 600;
}

/* 休假/调休背景色 */
.day-mini.is-holiday-cell {
  background: rgba(103, 194, 58, 0.08);
}
.day-mini.is-workday-cell {
  background: rgba(230, 162, 60, 0.08);
}

/* 今日：空心红圈 */
.day-mini.is-today .mini-day {
  border: 1.5px solid #f56c6c;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: #f56c6c;
  font-weight: 600;
}

.mini-day {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: #303133;
}

/* 事件小圆点 */
.mini-event-dot {
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #409eff;
}
.day-mini.is-today .mini-event-dot {
  background: #f56c6c;
}
</style>
