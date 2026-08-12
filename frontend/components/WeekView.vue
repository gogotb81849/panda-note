<template>
  <div class="hw-week-view">
    <!-- ========== 顶部：7天表头 + 全天事件区 ========== -->
    <div class="week-header">
      <!-- 左上角空白（对齐时间轴列） -->
      <div class="wh-corner"></div>
      <!-- 7天表头 -->
      <div class="wh-days">
        <div
          v-for="(day, i) in weekDays"
          :key="i"
          class="wh-day"
          :class="{
            'is-today': day.isToday,
            'is-weekend': day.isWeekend,
          }"
          @click="handleDayClick(day.dateObj)"
        >
          <div class="wd-week" :class="{ 'weekend-red': day.isWeekend }">{{ day.dayName }}</div>
          <div class="wd-day-wrap">
            <span
              class="wd-day"
              :class="{
                'today-circle': day.isToday,
                'weekend-red': day.isWeekend && !day.isToday,
                'first-fifteen-red': day.isFirstOrFifteen && !day.isWeekend && !day.isToday,
              }"
            >{{ day.dayNum }}</span>
          </div>
          <div v-if="day.caption" class="wd-caption" :class="`cap-${day.captionType}`">
            {{ day.caption }}
          </div>
          <div class="wd-tags">
            <span v-if="day.isHoliday" class="hw-tag rest">休</span>
            <span v-if="day.isWorkday" class="hw-tag work">班</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 全天事件行 -->
    <div v-if="hasAllDayEvents" class="all-day-row">
      <div class="adr-label">全天</div>
      <div class="adr-cells">
        <div
          v-for="(day, i) in weekDays"
          :key="i"
          class="adr-cell"
        >
          <div
            v-for="ev in day.allDayEvents"
            :key="ev.id"
            class="adr-event"
            :class="priorityCardClass(ev.priority)"
            @click.stop="$emit('schedule-click', ev)"
          >
            {{ ev.secondType || '(未命名)' }}
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 时段网格：左=时间轴，右=7列事件 ========== -->
    <div class="week-body" ref="scrollBodyRef">
      <div class="wb-inner" :style="{ height: (24 * ROW_HEIGHT) + 'px' }">
        <!-- 左侧时间轴 -->
        <div class="wb-time-axis">
          <div
            v-for="h in 24"
            :key="h - 1"
            class="ta-hour"
            :style="{ height: ROW_HEIGHT + 'px' }"
          >
            <span v-if="h - 1 > 0">{{ String(h - 1).padStart(2, '0') }}:00</span>
          </div>
        </div>

        <!-- 7列事件区 -->
        <div class="wb-day-columns">
          <div
            v-for="(day, i) in weekDays"
            :key="i"
            class="wb-day-col"
            :class="{ 'is-today-col': day.isToday, 'is-weekend-col': day.isWeekend }"
          >
            <!-- 横线（每小时） -->
            <div
              v-for="h in 24"
              :key="h - 1"
              class="wb-hour-line"
              :class="{ 'is-now-hour': day.isToday && (h - 1) === nowHour }"
              :style="{ height: ROW_HEIGHT + 'px' }"
              @click.self="handleTimeSlotClick(day.ymd, h - 1)"
            >
              <!-- 事件卡片（绝对定位） -->
              <div
                v-for="ev in getEventsAtHour(day.timedEvents, h - 1)"
                :key="ev.id"
                class="wb-ev-card"
                :class="priorityCardClass(ev.priority)"
                @click.stop="$emit('schedule-click', ev)"
              >
                <span class="ev-time">{{ formatEventTime(ev) }}</span>
                <span class="ev-title">{{ ev.secondType || '(未命名)' }}</span>
                <span v-if="ev.ship?.cnShipName" class="ev-ship">{{ ev.ship.cnShipName }}</span>
              </div>
            </div>

            <!-- 当前时间红线（仅今日列） -->
            <div
              v-if="day.isToday"
              class="wb-now-line"
              :style="{ top: nowTopPx + 'px' }"
            >
              <span class="now-dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { Schedule } from '~/types'
import { useLunar } from '~/composables/useLunar'

interface Props {
  schedules: Schedule[]
  date: Date
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'date-click', dateStr: string): void
  (e: 'schedule-click', schedule: Schedule): void
  (e: 'create-at', payload: { dateStr: string; hour: number | null }): void
}>()

const { getLunarInfo, getDayCaption } = useLunar()

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const ROW_HEIGHT = 56

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

function weekStart(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(r.getDate() - r.getDay())
  return r
}

const weekDays = computed(() => {
  const start = weekStart(props.date)
  const todayStr = toYmd(new Date())
  const result: any[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const ymd = toYmd(d)
    const info = getLunarInfo(d)
    const cap = getDayCaption(d, true) as any
    // 显示 caption：节日/三伏/节气/历史事件/农历月份名
    const showCap = cap.type !== 'lunarDay'
    const allEvents = props.schedules.filter(s => toYmdFromAny(s.recordDate) === ymd)
    const allDayEvents = allEvents.filter(s => !s.startTime)
    const timedEvents = allEvents.filter(s => !!s.startTime)
      .sort((a, b) => extractHour(a.startTime) - extractHour(b.startTime))
    result.push({
      dateObj: d,
      ymd,
      dayName: DAY_NAMES[i],
      dayNum: d.getDate(),
      isToday: ymd === todayStr,
      isWeekend: i === 0 || i === 6,
      isHoliday: !!info.isHoliday,
      isWorkday: !!info.isWorkday,
      isFirstOrFifteen: !!info.isFirstOrFifteen,
      caption: showCap ? cap.text : '',
      captionType: cap.type,
      allDayEvents,
      timedEvents,
    })
  }
  return result
})

const hasAllDayEvents = computed(() =>
  weekDays.value.some(d => d.allDayEvents.length > 0)
)

function handleDayClick(d: Date) {
  emit('date-click', toYmd(d))
}

function handleTimeSlotClick(dateStr: string, hour: number) {
  emit('create-at', { dateStr, hour })
}

function getEventsAtHour(events: Schedule[], hour: number): Schedule[] {
  return events.filter(e => extractHour(e.startTime) === hour)
}

function extractHour(dateTimeStr: string | null | undefined): number {
  if (!dateTimeStr) return 9
  try {
    const d = new Date(dateTimeStr.replace(' ', 'T'))
    if (!Number.isNaN(d.getTime())) return d.getHours()
  } catch {}
  return 9
}
function extractMinute(dateTimeStr: string | null | undefined): number {
  if (!dateTimeStr) return 0
  try {
    const d = new Date(dateTimeStr.replace(' ', 'T'))
    if (!Number.isNaN(d.getTime())) return d.getMinutes()
  } catch {}
  return 0
}
function formatEventTime(ev: Schedule): string {
  if (!ev.startTime) return '全天'
  const h = extractHour(ev.startTime)
  const m = extractMinute(ev.startTime)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function priorityCardClass(priority: string): string {
  const map: Record<string, string> = {
    urgent_important: 'ev-urgent-important',
    important: 'ev-important',
    urgent: 'ev-urgent',
    normal: 'ev-normal',
    low: 'ev-low',
  }
  return map[priority] || 'ev-normal'
}

// ========== 当前时间指示 ==========
const nowHour = ref(new Date().getHours())
const nowMinute = ref(new Date().getMinutes())
const scrollBodyRef = ref<HTMLElement | null>(null)
let timer: any = null

onMounted(() => {
  const tick = () => {
    const n = new Date()
    nowHour.value = n.getHours()
    nowMinute.value = n.getMinutes()
  }
  tick()
  timer = setInterval(tick, 60 * 1000)
  // 自动滚动到当前时间附近
  nextTick(() => {
    if (scrollBodyRef.value) {
      scrollBodyRef.value.scrollTop = Math.max(0, (nowHour.value - 2) * ROW_HEIGHT)
    }
  })
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const nowTopPx = computed(() => nowHour.value * ROW_HEIGHT + (nowMinute.value / 60) * ROW_HEIGHT)
</script>

<style scoped>
.hw-week-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #fff);
  min-height: 0;
  overflow: hidden;
}

/* ========== 顶部表头 ========== */
.week-header {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}
.wh-corner {
  width: 56px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
}
.wh-days {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.wh-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 2px 6px;
  cursor: pointer;
  position: relative;
  border-right: 1px solid #f0f0f0;
  transition: background 0.15s;
  gap: 2px;
}
.wh-day:hover { background: #f5f7fa; }
.wh-day.is-today { background: rgba(253, 236, 236, 0.2); }
.wh-day.is-weekend { background: #fafafa; }
.wh-day.is-today.is-weekend { background: rgba(253, 236, 236, 0.2); }

.wd-week {
  font-size: 11px;
  color: #909399;
  font-weight: 500;
}
.wd-week.weekend-red { color: #f56c6c; }

.wd-day-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  border-radius: 50%;
}
.wd-day {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}
.wd-day.weekend-red { color: #f56c6c; }
.wd-day.first-fifteen-red { color: #f56c6c; }

/* 今日：空心红圈 */
.wh-day.is-today .wd-day-wrap {
  border: 2px solid #f56c6c;
  box-sizing: border-box;
}
.wh-day.is-today .wd-day {
  color: #f56c6c;
}

.wd-caption {
  font-size: 9px;
  line-height: 1.1;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.wd-caption.cap-festival, .wd-caption.cap-fu { color: #f56c6c; font-weight: 600; }
.wd-caption.cap-solarTerm { color: #67c23a; }
.wd-caption.cap-historical { color: #606266; }
.wd-caption.cap-lunarMonth { color: #f56c6c; font-weight: 600; }

.wd-tags {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  gap: 1px;
}
.hw-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 0 2px;
  line-height: 11px;
  height: 11px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
}
.hw-tag.rest { background: rgba(103,194,58,0.9); color: #fff; }
.hw-tag.work { background: rgba(230,162,60,0.9); color: #fff; }

/* ========== 全天事件行 ========== */
.all-day-row {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
  min-height: 24px;
}
.adr-label {
  width: 56px;
  flex-shrink: 0;
  font-size: 10px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e4e7ed;
}
.adr-cells {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.adr-cell {
  border-right: 1px solid #f0f0f0;
  padding: 2px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 20px;
}
.adr-event {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  border-left: 3px solid #909399;
  background: #f5f7fa;
}
.adr-event.ev-urgent-important { border-left-color: #f56c6c; background: #fef6f6; color: #f56c6c; }
.adr-event.ev-important       { border-left-color: #e6a23c; background: #fdf8ef; color: #e6a23c; }
.adr-event.ev-urgent          { border-left-color: #409eff; background: #ecf5ff; color: #409eff; }
.adr-event.ev-normal          { border-left-color: #67c23a; background: #f5fbef; color: #67c23a; }
.adr-event.ev-low             { border-left-color: #909399; background: #fafafa; color: #909399; }

/* ========== 时段网格（可滚动） ========== */
.week-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}
.wb-inner {
  display: flex;
  position: relative;
}

/* 左侧时间轴 */
.wb-time-axis {
  width: 56px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
}
.ta-hour {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 1px 6px 0 0;
  font-size: 10px;
  color: #c0c4cc;
  border-bottom: 1px solid #f5f5f5;
}

/* 7列事件区 */
.wb-day-columns {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  position: relative;
}
.wb-day-col {
  position: relative;
  border-right: 1px solid #f0f0f0;
}
.wb-day-col.is-weekend-col { background: rgba(250, 250, 250, 0.5); }
.wb-day-col.is-today-col { background: rgba(253, 236, 236, 0.06); }

.wb-hour-line {
  border-bottom: 1px solid #f5f5f5;
  position: relative;
  cursor: pointer;
}
.wb-hour-line:hover { background: rgba(64, 158, 255, 0.03); }
.wb-hour-line.is-now-hour { background: rgba(253, 236, 236, 0.15); }

/* 事件卡片 */
.wb-ev-card {
  position: absolute;
  left: 2px;
  right: 2px;
  top: 1px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 5px;
  border-radius: 3px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-left: 3px solid #909399;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  overflow: hidden;
}
.wb-ev-card:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  transform: translateY(-1px);
  z-index: 3;
}
.wb-ev-card.ev-urgent-important { border-left-color: #f56c6c; background: #fef6f6; }
.wb-ev-card.ev-important       { border-left-color: #e6a23c; background: #fdf8ef; }
.wb-ev-card.ev-urgent          { border-left-color: #409eff; background: #ecf5ff; }
.wb-ev-card.ev-normal          { border-left-color: #67c23a; background: #f5fbef; }
.wb-ev-card.ev-low             { border-left-color: #909399; background: #fafafa; }

.ev-time { font-size: 9px; color: #606266; font-weight: 600; }
.ev-title {
  font-size: 11px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-ship { font-size: 9px; color: #909399; }

/* 当前时间红线 */
.wb-now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  z-index: 5;
  pointer-events: none;
}
.now-dot {
  position: absolute;
  left: -4px;
  top: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
  box-shadow: 0 0 0 2px rgba(245,108,108,0.2);
}
.wb-now-line::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1.5px;
  background: #f56c6c;
  opacity: 0.7;
}
</style>
