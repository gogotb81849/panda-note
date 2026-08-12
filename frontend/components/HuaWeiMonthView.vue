<template>
  <div class="hw-month-view">
    <!-- 华为风：中央大号半透明月份数字水印（如巨大的"8"） -->
    <div v-if="showMonthWatermark" class="month-watermark">
      <span>{{ date.getMonth() + 1 }}</span>
    </div>

    <!-- 周数列 + 表头 + 日期6×7网格 -->
    <div class="month-grid" :style="{ '--col-count': totalColumns }">
      <!-- 表头行 -->
      <div class="grid-header-row">
        <div v-if="showWeekNumber" class="week-col-header">周</div>
        <div
          v-for="(d, i) in displayWeekDays"
          :key="i"
          class="grid-header-cell"
          :class="{ 'is-weekend': isWeekendByIndex(i) }"
        >
          {{ d }}
        </div>
      </div>

      <!-- 日期行（6 行 × 7 列 = 42 格） -->
      <div
        v-for="(week, wIdx) in weeks"
        :key="wIdx"
        class="grid-row"
      >
        <!-- 周数列 -->
        <div v-if="showWeekNumber" class="week-col">
          {{ week.weekNum }}
        </div>
        <!-- 日期格 -->
        <div
          v-for="(cell, cIdx) in week.cells"
          :key="cIdx"
          class="day-cell"
          :class="cellClass(cell)"
          @click="handleCellClick(cell)"
        >
          <!-- 行1：日期数字 + 休班标记 -->
          <div class="day-number-row">
            <span
              class="day-number"
              :class="dayNumberClass(cell)"
            >{{ cell.day }}</span>
            <span
              v-if="cell.holidayName"
              class="holiday-tag"
              :class="cell.isWorkday ? 'tag-work' : 'tag-rest'"
            >{{ cell.isWorkday ? '班' : '休' }}</span>
          </div>

          <!-- 行2：节日/三伏/节气/历史事件 灰底横条（华为风） -->
          <div
            v-if="cell.captionType !== 'lunarDay' && cell.captionType !== 'lunarMonth'"
            class="caption-bar"
            :class="`caption-bar-${cell.captionType}`"
          >
            {{ cell.captionText }}
          </div>
          <!-- 普通农历日（初一/数字月名/廿X）：无灰底，直接文字 -->
          <div
            v-else
            class="caption-lunar"
            :class="cell.captionType === 'lunarMonth' ? 'is-month-name' : ''"
          >
            {{ cell.captionText }}
          </div>

          <!-- 行3：日程事件（最多3条，超出+N） -->
          <div class="day-events">
            <div
              v-for="ev in cell.events.slice(0, 3)"
              :key="ev.id"
              class="event-pill"
              :class="priorityClass(ev.priority)"
              @click.stop="$emit('schedule-click', ev)"
            >
              <span class="event-dot" :class="priorityDotClass(ev.priority)"></span>
              <span class="event-text">{{ eventText(ev) }}</span>
            </div>
            <div v-if="cell.events.length > 3" class="event-more">
              +{{ cell.events.length - 3 }}
            </div>
          </div>

          <!-- 重要日角标 -->
          <div v-if="cell.importantDates.length > 0" class="important-badge">
            ★{{ cell.importantDates.length }}
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

interface ImportantDateItem {
  id: number | string
  name: string
  date: string | Date
}

interface Props {
  schedules: Schedule[]
  date: Date
  importantDates?: ImportantDateItem[]
  showLunar?: boolean
  showWeekNumber?: boolean
  weekStartMonday?: boolean
  showTodayWatermark?: boolean
  selectedDate?: string // YYYY-MM-DD，被选中的日期（空心红圈2）
}

const props = withDefaults(defineProps<Props>(), {
  importantDates: () => [],
  showLunar: true,
  showWeekNumber: true,
  weekStartMonday: false,
  showTodayWatermark: true,
  selectedDate: '',
})

const emit = defineEmits<{
  (e: 'date-click', dateStr: string): void
  (e: 'schedule-click', schedule: Schedule): void
  (e: 'update:selectedDate', v: string): void
}>()

const { getLunarInfo, getDayCaption, getWeekOfYear } = useLunar()

type CaptionType = 'festival' | 'fu' | 'solarTerm' | 'historical' | 'lunarDay' | 'lunarMonth'

// 是否显示"大号月份数字水印"——和传入的 showTodayWatermark 绑定（用户设置里叫"今日水印"，实际效果是月份大水印）
const showMonthWatermark = computed(() => props.showTodayWatermark)

// 总列数：7 + (显示周数 ? 1 : 0)
const totalColumns = computed(() => (props.showWeekNumber ? 8 : 7))

// 表头周日/周一开始
const displayWeekDays = computed(() => {
  if (props.weekStartMonday) return ['一', '二', '三', '四', '五', '六', '日']
  return ['日', '一', '二', '三', '四', '五', '六']
})

// 判断列索引是否周末（配合表头周日/周一）
function isWeekendByIndex(idx: number): boolean {
  if (props.weekStartMonday) return idx === 5 || idx === 6
  return idx === 0 || idx === 6
}

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

// 6×7 网格
const weeks = computed(() => {
  const year = props.date.getFullYear()
  const month = props.date.getMonth()
  const firstOfMonth = new Date(year, month, 1)

  let startOffset = firstOfMonth.getDay() // 周日=0
  if (props.weekStartMonday) startOffset = (startOffset + 6) % 7
  const startDate = new Date(year, month, 1 - startOffset)

  const result: Array<{ weekNum: number; cells: any[] }> = []
  const todayStr = toYmd(new Date())

  for (let w = 0; w < 6; w++) {
    const cells: any[] = []
    const weekStartDate = new Date(startDate)
    weekStartDate.setDate(weekStartDate.getDate() + w * 7)

    for (let c = 0; c < 7; c++) {
      const cellDate = new Date(weekStartDate)
      cellDate.setDate(cellDate.getDate() + c)
      const dateStr = toYmd(cellDate)

      // lunar + caption 类型
      const lunarInfo = props.showLunar ? getLunarInfo(cellDate) : null
      let captionText = ''
      let captionType: CaptionType = 'lunarDay'
      if (props.showLunar) {
        const cap = getDayCaption(cellDate, true) as any
        captionText = cap.text
        captionType = cap.type
      }

      const events = props.schedules.filter(s => toYmdFromAny(s.recordDate) === dateStr)
      const importantOnDay = props.importantDates.filter(i => toYmdFromAny(i.date) === dateStr)

      cells.push({
        date: cellDate,
        dateStr,
        day: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: dateStr === todayStr,
        isSelected: props.selectedDate ? dateStr === props.selectedDate : false,
        isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
        isHoliday: lunarInfo?.isHoliday ?? false,
        isWorkday: lunarInfo?.isWorkday ?? false,
        holidayName: lunarInfo?.holidayName ?? '',
        isFirstOrFifteen: lunarInfo?.isFirstOrFifteen ?? false,
        captionText,
        captionType,
        events,
        importantDates: importantOnDay,
      })
    }

    result.push({
      weekNum: getWeekOfYear(weekStartDate),
      cells,
    })
  }

  return result
})

function handleCellClick(cell: any) {
  emit('date-click', cell.dateStr)
  emit('update:selectedDate', cell.dateStr)
}

function cellClass(cell: any): Record<string, boolean> {
  return {
    'not-current-month': !cell.isCurrentMonth,
    'is-today': cell.isToday,
    'is-selected': cell.isSelected,
    'is-holiday-cell': cell.isHoliday,
    'is-workday-cell': cell.isWorkday,
  }
}

// 日期数字样式类：空心红圈今日/选中 + 初一十五标红 + 周末标红
function dayNumberClass(cell: any): Record<string, boolean> {
  return {
    'today-circle': cell.isToday,
    'selected-circle': cell.isSelected && !cell.isToday, // 选中时用同类圈，避免重复
    'is-first-fifteen': cell.isFirstOrFifteen && !cell.isWeekend, // 初一十五红（不是周末就不重复标）
    'is-weekend': cell.isWeekend,
  }
}

// 优先级辅助
function priorityClass(priority: string): string {
  const map: Record<string, string> = {
    urgent_important: 'pill-urgent-important',
    important: 'pill-important',
    urgent: 'pill-urgent',
    normal: 'pill-normal',
    low: 'pill-low',
  }
  return map[priority] || 'pill-normal'
}
function priorityDotClass(priority: string): string {
  const map: Record<string, string> = {
    urgent_important: 'dot-urgent-important',
    important: 'dot-important',
    urgent: 'dot-urgent',
    normal: 'dot-normal',
    low: 'dot-low',
  }
  return map[priority] || 'dot-normal'
}
function eventText(ev: Schedule): string {
  if (ev.secondType) return ev.secondType
  if (ev.eventDetail) {
    const txt = ev.eventDetail.replace(/\s+/g, ' ').trim()
    return txt.length > 12 ? txt.slice(0, 12) + '…' : txt
  }
  return '(未命名)'
}
</script>

<style scoped>
.hw-month-view {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #fff);
}

/* ================= 华为风：中央大号半透明月份数字水印 ================= */
.month-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 300px;
  font-weight: 900;
  line-height: 1;
  color: #f56c6c; /* 华为用橙红色调的半透明水数字 */
  opacity: 0.05;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  letter-spacing: -10px;
}
.month-watermark span {
  display: block;
}

/* ================= 网格 ================= */
.month-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2; /* 覆盖水印 */
}

/* 表头行 */
.grid-header-row {
  display: grid;
  grid-template-columns: repeat(var(--col-count), 1fr);
  border-bottom: 1px solid var(--color-border-light, #ebeef5);
  background: #fafafa;
}
.grid-header-cell,
.week-col-header,
.week-col {
  padding: 10px 6px 6px;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #909399;
}
.grid-header-cell.is-weekend {
  color: #f56c6c; /* 华为周末表头用橙红 */
}
.week-col-header,
.week-col {
  background: #fafafa;
  color: #909399;
  border-right: 1px solid #f0f0f0;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 400;
}

/* 日期行 */
.grid-row {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(var(--col-count), 1fr);
  border-bottom: 1px solid #f0f0f0;
  min-height: 0;
}

.day-cell {
  position: relative;
  border-right: 1px solid #f0f0f0;
  padding: 4px 6px 2px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  transition: background 0.12s;
}
.day-cell:hover {
  background: #f5f7fa;
}
.day-cell.not-current-month {
  background: #fafafa;
}
.day-cell.not-current-month .day-number {
  color: #c0c4cc;
}
.day-cell.not-current-month .caption-lunar,
.day-cell.not-current-month .caption-bar {
  opacity: 0.5;
}
.day-cell.is-holiday-cell:not(.not-current-month) {
  background: rgba(245, 108, 108, 0.02);
}
.day-cell.is-workday-cell:not(.not-current-month) {
  background: rgba(230, 162, 60, 0.03);
}

/* ================= 日期数字 + 空心红圈（华为风核心） ================= */
.day-number-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 4px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1;
}

/* 今日：空心 2px 红色圆圈 */
.day-number.today-circle {
  border: 2px solid #f56c6c;
  color: #f56c6c !important;
  font-weight: 600;
  box-sizing: border-box;
}

/* 选中日：空心 2px 红圈（同今日，不重复时） */
.day-number.selected-circle {
  border: 2px solid #f56c6c;
  color: #f56c6c !important;
  font-weight: 600;
  box-sizing: border-box;
}

/* 周末日期数字：橙红 */
.day-number.is-weekend {
  color: #f56c6c;
}

/* 农历初一/十五日期数字：橙红（华为截图里初一十五标红） */
.day-number.is-first-fifteen {
  color: #f56c6c;
}

/* 休班标记（休/班小角标） */
.holiday-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 0 3px;
  border-radius: 2px;
  line-height: 12px;
  height: 12px;
  display: inline-flex;
  align-items: center;
}
.holiday-tag.tag-rest {
  background: rgba(103, 194, 58, 0.15);
  color: var(--color-success, #67c23a);
}
.holiday-tag.tag-work {
  background: rgba(230, 162, 60, 0.15);
  color: var(--color-warning, #e6a23c);
}

/* ================= 文案：灰底横条（华为节日/节气/三伏/历史事件） ================= */
.caption-bar {
  font-size: 11px;
  line-height: 14px;
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #f0f0f0; /* 默认灰底 */
}
/* 节日灰底+红字（华为用灰底+红字） */
.caption-bar-festival {
  background: #fdecec;
  color: #f56c6c;
  font-weight: 500;
}
/* 三伏：同节日风格浅红 */
.caption-bar-fu {
  background: #fdecec;
  color: #f56c6c;
  font-weight: 500;
}
/* 节气：灰底+绿字（华为截图立秋/处暑灰底） */
.caption-bar-solarTerm {
  background: #f2f6ec;
  color: #67c23a;
}
/* 历史事件：灰底+灰蓝字（日本投降日/抗战胜利...） */
.caption-bar-historical {
  background: #ecf1f6;
  color: #606266;
}

/* 农历日（初一显示月名/普通日）：纯文字，无灰底 */
.caption-lunar {
  font-size: 11px;
  line-height: 14px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.caption-lunar.is-month-name {
  color: #f56c6c; /* 初一（月名）红字 */
  font-weight: 500;
}

/* ================= 日程事件行 ================= */
.day-events {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  overflow: hidden;
}
.event-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 11px;
  line-height: 15px;
  cursor: pointer;
  overflow: hidden;
}
.event-pill:hover { opacity: 0.85; }
.event-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.event-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #606266;
}
.event-more {
  font-size: 10px;
  color: #909399;
  padding-left: 4px;
}
.pill-urgent-important { background: rgba(245, 108, 108, 0.12); }
.pill-important { background: rgba(230, 162, 60, 0.12); }
.pill-urgent { background: rgba(64, 158, 255, 0.12); }
.pill-normal { background: rgba(103, 194, 58, 0.12); }
.pill-low { background: rgba(144, 147, 153, 0.12); }
.dot-urgent-important { background: #f56c6c; }
.dot-important { background: #e6a23c; }
.dot-urgent { background: #409eff; }
.dot-normal { background: #67c23a; }
.dot-low { background: #909399; }

/* 重要日角标（★） */
.important-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #f7ba2a;
  padding: 0 4px;
  border-radius: 8px;
  line-height: 13px;
}
</style>
