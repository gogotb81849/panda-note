<template>
  <div class="hw-day-view">
    <!-- ========== 华为风顶部：横排多日（7天）选择器 ========== -->
    <div class="day-strip">
      <div
        v-for="(d, idx) in stripDays"
        :key="idx"
        class="day-strip-item"
        :class="{
          'is-today': d.isToday,
          'is-selected': d.isSelected,
          'is-weekend': d.isWeekend,
        }"
        @click="jumpTo(d.dateObj)"
      >
        <div class="dsi-week">{{ d.weekShort }}</div>
        <div class="dsi-day-wrap">
          <span class="dsi-day" :class="{ 'first-fifteen-red': d.isFirstOrFifteen }">
            {{ d.day }}
          </span>
        </div>
        <div v-if="d.lunarCaption" class="dsi-caption" :class="`dsi-cap-${d.captionType}`">
          {{ d.lunarCaption }}
        </div>
      </div>
    </div>

    <!-- ========== 当日信息条（日期 + 农历 + 节日） ========== -->
    <div class="day-info-bar">
      <div class="dib-left">
        <span class="dib-date">{{ selectedDateLabel }}</span>
        <span class="dib-week">{{ WEEK_CN[selectedDate.getDay()] }}</span>
        <span class="dib-lunar">{{ lunarInfo.lunar }}</span>
        <span v-if="lunarInfo.holiday" class="dib-festival dib-festival-tag">{{ lunarInfo.holiday }}</span>
        <span v-else-if="lunarInfo.fu" class="dib-fu dib-festival-tag">{{ lunarInfo.fu }}</span>
        <span v-else-if="lunarInfo.solarTerm" class="dib-solar dib-festival-tag">{{ lunarInfo.solarTerm }}</span>
        <span v-if="lunarInfo.isHoliday" class="dib-tag rest">休</span>
        <span v-if="lunarInfo.isWorkday" class="dib-tag work">班</span>
      </div>
      <div class="dib-right">
        <el-button size="small" type="primary" round class="dib-plus" @click="handlePlusClick">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- ========== 时段轴 + 日程卡片 ========== -->
    <div class="time-grid-wrapper">
      <div class="time-grid" ref="timeGridRef">
        <!-- 当前时段红色虚线指示（华为风） -->
        <div
          v-if="isSelectedToday && nowHour >= 0"
          class="now-indicator"
          :style="{ top: nowTopPx + 'px' }"
        >
          <span class="now-circle"></span>
          <span class="now-line"></span>
        </div>

        <div
          v-for="h in 24"
          :key="h - 1"
          class="time-row"
          :class="{ 'is-now-hour': isSelectedToday && (h - 1) === nowHour }"
        >
          <!-- 时间列 -->
          <div class="time-label">
            <span>{{ String(h - 1).padStart(2, '0') }}:00</span>
          </div>
          <!-- 事件列 -->
          <div class="time-cell" @click.self="handleTimeSlotClick(h - 1)">
            <!-- 放在这个小时的日程卡片 -->
            <div
              v-for="ev in eventsByHour[h - 1] || []"
              :key="ev.id"
              class="ev-card"
              :class="priorityCardClass(ev.priority)"
              @click.stop="$emit('schedule-click', ev)"
            >
              <span class="ev-time">{{ formatEventTime(ev) }}</span>
              <span class="ev-title">{{ ev.secondType || '(未命名)' }}</span>
              <span v-if="ev.ship?.cnShipName" class="ev-ship">{{ ev.ship.cnShipName }}</span>
            </div>
          </div>
        </div>

        <!-- 空状态：当日无日程（华为风：日历图标 + 文案）内嵌在时段网格内部 -->
        <div v-if="orderedEvents.length === 0" class="empty-day">
          <div class="empty-icon">
            <el-icon :size="48"><Calendar /></el-icon>
          </div>
          <div class="empty-title">今日无日程安排</div>
          <div class="empty-desc">点击时段或「+」创建新日程</div>
          <el-button type="primary" size="small" round class="empty-btn" @click="handlePlusClick">
            <el-icon><Plus /></el-icon>
            新建日程
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Plus, Calendar } from '@element-plus/icons-vue'
import type { Schedule } from '~/types'
import { useLunar } from '~/composables/useLunar'

interface Props {
  schedules: Schedule[]
  date: Date
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'schedule-click', schedule: Schedule): void
  (e: 'date-click', dateStr: string): void
  (e: 'create-at', payload: { dateStr: string; hour: number | null }): void
}>()

const { getLunarInfo, getDayCaption } = useLunar()

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEK_SHORT = ['日', '一', '二', '三', '四', '五', '六']

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const selectedDate = computed(() => props.date)
const selectedYmd = computed(() => toYmd(selectedDate.value))
const isSelectedToday = computed(() => toYmd(new Date()) === selectedYmd.value)

const selectedDateLabel = computed(() => {
  const d = selectedDate.value
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const lunarInfo = computed(() => getLunarInfo(selectedDate.value))

// ========== 顶部 7 天横排条（选中日居中：前3 + 选中 + 后3） ==========
const stripDays = computed(() => {
  const base = new Date(selectedDate.value)
  base.setHours(0, 0, 0, 0)
  const todayStr = toYmd(new Date())
  const selStr = selectedYmd.value
  const result: any[] = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const info = getLunarInfo(d)
    const cap = getDayCaption(d, true) as any
    const showCap = cap.type !== 'lunarDay' && cap.type !== 'lunarMonth'
    result.push({
      dateObj: d,
      ymd: toYmd(d),
      isToday: toYmd(d) === todayStr,
      isSelected: toYmd(d) === selStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isFirstOrFifteen: info.isFirstOrFifteen,
      weekShort: WEEK_SHORT[d.getDay()],
      day: d.getDate(),
      lunarCaption: showCap ? cap.text : (cap.type === 'lunarMonth' ? cap.text.replace('月', '') : ''),
      captionType: cap.type,
    })
  }
  return result
})

function jumpTo(d: Date) {
  emit('date-click', toYmd(d))
}
function handlePlusClick() {
  emit('create-at', { dateStr: selectedYmd.value, hour: null })
}
function handleTimeSlotClick(hour: number) {
  emit('create-at', { dateStr: selectedYmd.value, hour })
}

// ========== 当前时间指示器（实时更新） ==========
const nowHour = ref(new Date().getHours())
const nowMinute = ref(new Date().getMinutes())
let timer: any = null
onMounted(() => {
  const tick = () => {
    const n = new Date()
    nowHour.value = n.getHours()
    nowMinute.value = n.getMinutes()
  }
  tick()
  timer = setInterval(tick, 60 * 1000)
  // 自动滚动到当前时间附近（如果是今天）
  nextTick(() => {
    if (isSelectedToday.value && timeGridRef.value) {
      const scrollTo = Math.max(0, (nowHour.value - 2) * 60)
      timeGridRef.value.scrollTop = scrollTo
    }
  })
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const ROW_HEIGHT = 60 // 每小时 60px
const nowTopPx = computed(() => nowHour.value * ROW_HEIGHT + (nowMinute.value / 60) * ROW_HEIGHT)

const timeGridRef = ref<HTMLElement | null>(null)

// ========== 日程数据组织 ==========
const orderedEvents = computed(() => {
  return props.schedules
    .filter(s => {
      const sDate = s.recordDate ? new Date(String(s.recordDate).split('T')[0]) : null
      return sDate && toYmd(sDate) === selectedYmd.value
    })
    .sort((a, b) => {
      const ah = extractHour(a.startTime)
      const bh = extractHour(b.startTime)
      if (ah !== bh) return ah - bh
      const priorityOrder = ['urgent_important', 'important', 'urgent', 'normal', 'low']
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
    })
})

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

// 按时段分组
const eventsByHour = computed(() => {
  const map: Record<number, Schedule[]> = {}
  for (const ev of orderedEvents.value) {
    const h = extractHour(ev.startTime)
    if (!map[h]) map[h] = []
    map[h].push(ev)
  }
  return map
})

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
</script>

<style scoped>
.hw-day-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #fff);
  min-height: 0;
}

/* ============== 顶部 7 天横排选择条（华为风） ============== */
.day-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: 12px 12px 8px;
  background: #fff;
  border-bottom: 1px solid var(--color-border-light, #f0f0f0);
  flex-shrink: 0;
}
.day-strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 4px;
}
.day-strip-item:hover { background: #f5f7fa; }

.dsi-week {
  font-size: 11px;
  color: #909399;
  font-weight: 500;
}
.day-strip-item.is-weekend .dsi-week { color: #f56c6c; }

.dsi-day-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  border-radius: 50%;
}
.dsi-day {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}
.day-strip-item.is-weekend .dsi-day { color: #f56c6c; }
.dsi-day.first-fifteen-red { color: #f56c6c; }

/* 今日：空心红圈 */
.day-strip-item.is-today .dsi-day-wrap {
  border: 2px solid #f56c6c;
  box-sizing: border-box;
}
.day-strip-item.is-today .dsi-day {
  color: #f56c6c;
}

/* 选中日：实心红底白字 */
.day-strip-item.is-selected .dsi-day-wrap {
  background: #f56c6c;
  border: 2px solid #f56c6c;
  box-sizing: border-box;
}
.day-strip-item.is-selected .dsi-day {
  color: #fff;
}
.day-strip-item.is-selected.is-today .dsi-day {
  color: #fff;
}

.dsi-caption {
  font-size: 9px;
  line-height: 1.1;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsi-cap-festival, .dsi-cap-fu { color: #f56c6c; font-weight: 600; }
.dsi-cap-solarTerm { color: #67c23a; }
.dsi-cap-historical { color: #606266; }

/* ============== 当日信息条 ============== */
.day-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
}
.dib-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dib-date { font-size: 16px; font-weight: 700; color: #303133; }
.dib-week { font-size: 12px; color: #606266; }
.dib-lunar { font-size: 12px; color: #909399; }
.dib-festival-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 600;
  line-height: 14px;
}
.dib-festival { background: #fdecec; color: #f56c6c; }
.dib-fu { background: #fdecec; color: #f56c6c; }
.dib-solar { background: #f2f6ec; color: #67c23a; }
.dib-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 0 3px;
  line-height: 12px;
  height: 12px;
  display: inline-flex;
  align-items: center;
  border-radius: 2px;
}
.dib-tag.rest { background: rgba(103,194,58,0.15); color: #67c23a; }
.dib-tag.work { background: rgba(230,162,60,0.15); color: #e6a23c; }

.dib-plus {
  width: 32px; height: 32px;
  padding: 0 !important;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50% !important;
  box-shadow: 0 2px 6px rgba(64,158,255,0.25);
}

/* ============== 时段网格 ============== */
.time-grid-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}
.time-grid {
  height: 100%;
  overflow-y: auto;
  position: relative;
}
.time-row {
  display: grid;
  grid-template-columns: 60px 1fr;
  border-bottom: 1px solid #f5f5f5;
  min-height: 60px;
  position: relative;
}
.time-row.is-now-hour {
  background: rgba(253, 236, 236, 0.25);
}
.time-label {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 2px 8px 0 0;
  font-size: 11px;
  color: #909399;
  border-right: 1px solid #f0f0f0;
  background: #fafafa;
}
.time-cell {
  padding: 2px 8px;
  position: relative;
  cursor: pointer;
}
.time-cell:hover { background: #f5f7fa40; }

/* 当前时间指示（红虚框 + 圆圈） */
.now-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  pointer-events: none;
  z-index: 5;
}
.now-circle {
  position: absolute;
  left: 52px;
  top: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
  box-shadow: 0 0 0 2px rgba(245,108,108,0.2);
}
.now-line {
  position: absolute;
  left: 60px;
  right: 8px;
  top: 0;
  height: 2px;
  background: #f56c6c;
  opacity: 0.8;
}

/* 日程卡片（华为风：左侧粗条 + 白卡） */
.ev-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-left: 4px solid #909399;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  font-size: 12px;
}
.ev-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}
.ev-urgent-important { border-left-color: #f56c6c; background: #fef6f6; }
.ev-important       { border-left-color: #e6a23c; background: #fdf8ef; }
.ev-urgent          { border-left-color: #409eff; background: #ecf5ff; }
.ev-normal          { border-left-color: #67c23a; background: #f5fbef; }
.ev-low             { border-left-color: #909399; background: #fafafa; }

.ev-time {
  font-size: 11px;
  color: #606266;
  font-weight: 600;
}
.ev-title {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-ship {
  font-size: 10px;
  color: #909399;
}

/* ============== 空状态（悬浮在时段网格内，不遮盖时间轴） ============== */
.empty-day {
  position: absolute;
  left: 60px;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding: 20px;
  z-index: 4;
}
.empty-icon {
  color: #dcdfe6;
  margin-bottom: 12px;
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #909399;
  margin-bottom: 4px;
}
.empty-desc {
  font-size: 11px;
  color: #c0c4cc;
  margin-bottom: 12px;
}
.empty-btn { pointer-events: auto; }
.empty-btn :deep(.el-icon) { margin-right: 4px; }
</style>
