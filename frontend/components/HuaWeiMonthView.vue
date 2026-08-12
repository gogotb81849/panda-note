<template>
  <div class="hw-month-view">
    <!-- 今日水印（仅当前月视图显示） -->
    <div v-if="showTodayWatermark" class="today-watermark">
      <span>{{ todayLabel }}</span>
    </div>

    <!-- 周数列 + 表头 -->
    <div class="month-grid" :style="{ '--col-count': weekStartMonday ? 8 : 7 }">
      <!-- 表头行 -->
      <div class="grid-header-row">
        <div v-if="weekStartMonday && showWeekNumber" class="week-col-header">周</div>
        <div
          v-for="(d, i) in displayWeekDays"
          :key="i"
          class="grid-header-cell"
          :class="{ 'is-weekend': isWeekendByIndex(i, weekStartMonday) }"
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
        <div v-if="weekStartMonday && showWeekNumber" class="week-col">
          {{ week.weekNum }}
        </div>
        <!-- 日期格 -->
        <div
          v-for="(cell, cIdx) in week.cells"
          :key="cIdx"
          class="day-cell"
          :class="cellClass(cell)"
          @click="$emit('date-click', cell.dateStr)"
        >
          <!-- 日期主显示：今日高亮 -->
          <div class="day-number-row">
            <span
              class="day-number"
              :class="{ 'today-pill': cell.isToday }"
            >{{ cell.day }}</span>
            <!-- 休班标记 -->
            <span
              v-if="cell.holidayName"
              class="holiday-tag"
              :class="cell.isWorkday ? 'tag-work' : 'tag-rest'"
            >{{ cell.isWorkday ? '班' : '休' }}</span>
          </div>

          <!-- 农历/节日/节气/历史事件 -->
          <div class="day-caption" :class="captionClass(cell)">
            {{ cell.caption }}
          </div>

          <!-- 日程事件（最多显示3条，超出 +N） -->
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

          <!-- 重要日标记（角标） -->
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
  id: number
  name: string
  date: string | Date
}

interface Props {
  schedules: Schedule[]
  date: Date
  importantDates?: ImportantDateItem[]
  // 用户偏好设置
  showLunar?: boolean       // 是否显示农历
  showWeekNumber?: boolean  // 是否显示周数
  weekStartMonday?: boolean // 是否周一开始（默认周日开始）
  showTodayWatermark?: boolean // 是否显示今日水印
}

const props = withDefaults(defineProps<Props>(), {
  importantDates: () => [],
  showLunar: true,
  showWeekNumber: true,
  weekStartMonday: false,
  showTodayWatermark: false,
})

defineEmits<{
  (e: 'date-click', dateStr: string): void
  (e: 'schedule-click', schedule: Schedule): void
}>()

const { getLunarInfo, getDayCaption, getWeekOfYear } = useLunar()

// 表头周一-周日 / 周日-周六
const displayWeekDays = computed(() => {
  if (props.weekStartMonday) {
    return ['一', '二', '三', '四', '五', '六', '日']
  }
  return ['日', '一', '二', '三', '四', '五', '六']
})

// 判断指定列索引是否为周末
function isWeekendByIndex(idx: number, weekStartMonday: boolean): boolean {
  if (weekStartMonday) {
    // 周一开始：第5、6列是周六、周日
    return idx === 5 || idx === 6
  }
  // 周日开始：第0、6列是周六、周日
  return idx === 0 || idx === 6
}

const todayLabel = computed(() => {
  const now = new Date()
  return `今日 ${now.getMonth() + 1}月${now.getDate()}日`
})

// 把 Date 转为 YYYY-MM-DD
function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 把字符串/Date 都转为 YYYY-MM-DD
function toYmdFromAny(d: string | Date): string {
  if (d instanceof Date) return toYmd(d)
  // ISO 字符串截取前 10
  return String(d).slice(0, 10)
}

// 构建月视图6×7网格
const weeks = computed(() => {
  const year = props.date.getFullYear()
  const month = props.date.getMonth()
  const firstOfMonth = new Date(year, month, 1)

  // 计算起点：当月第一天所在周的起始日
  let startOffset = firstOfMonth.getDay() // 0=周日
  if (props.weekStartMonday) {
    // 周一开始：把周日(0) 视为 7
    startOffset = (startOffset + 6) % 7
  }
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

      // 农历信息（仅 showLunar 时计算，节省性能）
      const lunarInfo = props.showLunar ? getLunarInfo(cellDate) : null
      const caption = props.showLunar ? getDayCaption(cellDate) : ''

      // 当日的日程
      const events = props.schedules.filter(s => toYmdFromAny(s.recordDate) === dateStr)

      // 当日的重要日
      const importantOnDay = props.importantDates.filter(i => toYmdFromAny(i.date) === dateStr)

      cells.push({
        date: cellDate,
        dateStr,
        day: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: dateStr === todayStr,
        isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
        isHoliday: lunarInfo?.isHoliday ?? false,
        isWorkday: lunarInfo?.isWorkday ?? false,
        holidayName: lunarInfo?.holidayName ?? '',
        caption,
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

function cellClass(cell: any): Record<string, boolean> {
  return {
    'not-current-month': !cell.isCurrentMonth,
    'is-today': cell.isToday,
    'is-holiday-cell': cell.isHoliday,
    'is-workday-cell': cell.isWorkday,
  }
}

function captionClass(cell: any): Record<string, boolean> {
  return {
    'caption-festival': !!cell.holidayName || (cell.caption && isFestival(cell.caption)),
    'caption-term': !!cell.caption && isSolarTerm(cell.caption),
    'caption-historical': !!cell.caption && isHistorical(cell.caption),
  }
}

// 简单识别文案类型（基于 useLunar 节气/节日/历史事件数据）
const ALL_SOLAR_TERMS = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至']
function isSolarTerm(text: string): boolean {
  return ALL_SOLAR_TERMS.includes(text)
}
const KNOWN_FESTIVALS = ['元旦','春节','元宵节','龙抬头','端午节','七夕节','中元节','中秋节','重阳节','腊八节','小年','除夕','情人节','妇女节','植树节','愚人节','劳动节','青年节','儿童节','建党节','建军节','教师节','国庆节','双十一','圣诞节']
function isFestival(text: string): boolean {
  return KNOWN_FESTIVALS.includes(text)
}
function isHistorical(text: string): boolean {
  // 历史事件名称不与节日/节气重复，且不以"初/正/二/三..腊"+月开头
  if (isFestival(text) || isSolarTerm(text)) return false
  // 农历日格式特征：包含"月初/初X/十X/廿X/三十"或月名+月
  if (/^(正|二|三|四|五|六|七|八|九|十|冬|腊)月/.test(text)) return false
  if (/^(初|十|廿|卅)/.test(text)) return false
  return true
}

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
  // 显示标题优先：secondType > eventDetail 截断
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
  background: var(--color-surface);
}

/* 今日水印 */
.today-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-22deg);
  font-size: 96px;
  font-weight: 800;
  color: var(--color-primary);
  opacity: 0.06;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  z-index: 1;
  letter-spacing: 4px;
}

.month-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
}

/* 表头行 */
.grid-header-row {
  display: grid;
  grid-template-columns: repeat(var(--col-count), 1fr);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-alt);
}

.grid-header-cell,
.week-col-header,
.week-col {
  padding: 8px 6px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.grid-header-cell.is-weekend {
  color: var(--color-danger);
}

.week-col-header,
.week-col {
  background: var(--color-bg-alt);
  color: var(--color-info);
  border-right: 1px solid var(--color-border-light);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 日期行 */
.grid-row {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(var(--col-count), 1fr);
  border-bottom: 1px solid var(--color-border-light);
  min-height: 0;
}

.day-cell {
  position: relative;
  border-right: 1px solid var(--color-border-light);
  padding: 6px 6px 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  transition: background 0.15s;
}

.day-cell:hover {
  background: var(--color-surface-hover);
}

.day-cell.not-current-month {
  background: var(--color-bg-alt);
  color: var(--color-text-placeholder);
}

.day-cell.not-current-month .day-number,
.day-cell.not-current-month .day-caption {
  color: var(--color-text-placeholder);
}

.day-cell.is-today {
  background: rgba(var(--color-primary-rgb, 64, 158, 255), 0.04);
}

.day-cell.is-holiday-cell:not(.not-current-month) {
  background: rgba(103, 194, 58, 0.04);
}

.day-cell.is-workday-cell:not(.not-current-month) {
  background: rgba(230, 162, 60, 0.06);
}

/* 日期数字行 */
.day-number-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.day-number {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
}

.day-number.today-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 11px;
}

.day-cell.is-weekend .day-number {
  color: var(--color-danger);
}

/* 休班标记 */
.holiday-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 3px;
  line-height: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
}

.holiday-tag.tag-rest {
  background: rgba(103, 194, 58, 0.15);
  color: var(--color-success);
}

.holiday-tag.tag-work {
  background: rgba(230, 162, 60, 0.15);
  color: var(--color-warning);
}

/* 农历/节日/节气 */
.day-caption {
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-caption.caption-festival {
  color: var(--color-danger);
  font-weight: 500;
}

.day-caption.caption-term {
  color: var(--color-success);
}

.day-caption.caption-historical {
  color: var(--color-info);
}

/* 事件列表 */
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
  border-radius: 3px;
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
  overflow: hidden;
}

.event-pill:hover {
  opacity: 0.85;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.event-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-more {
  font-size: 10px;
  color: var(--color-info);
  padding-left: 4px;
}

/* 优先级样式 */
.pill-urgent-important { background: rgba(245, 108, 108, 0.12); color: #c45656; }
.pill-important { background: rgba(230, 162, 60, 0.12); color: #b88230; }
.pill-urgent { background: rgba(64, 158, 255, 0.12); color: #3372cc; }
.pill-normal { background: rgba(103, 194, 58, 0.12); color: #529b2e; }
.pill-low { background: rgba(144, 147, 153, 0.12); color: #73767a; }

.dot-urgent-important { background: #f56c6c; }
.dot-important { background: #e6a23c; }
.dot-urgent { background: #409eff; }
.dot-normal { background: #67c23a; }
.dot-low { background: #909399; }

/* 重要日角标 */
.important-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--color-warning);
  padding: 1px 5px;
  border-radius: 8px;
  line-height: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
