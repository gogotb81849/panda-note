<template>
  <div class="beautiful-calendar">
    <!-- 年月选择头部 -->
    <div class="cal-header">
      <el-button text size="small" @click="changeYear(-1)">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <el-button text size="small" @click="changeMonth(-1)">
        <el-icon><ArrowLeftBold /></el-icon>
      </el-button>
      <div class="cal-title" @click="showYearMonthPicker = !showYearMonthPicker">
        <span class="cal-ym">{{ currentYear }}年{{ currentMonth }}月</span>
      </div>
      <el-button text size="small" @click="changeMonth(1)">
        <el-icon><ArrowRightBold /></el-icon>
      </el-button>
      <el-button text size="small" @click="changeYear(1)">
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>

    <!-- 快捷按钮 -->
    <div class="cal-actions">
      <el-button text size="small" @click="goToToday">今天</el-button>
      <el-button text size="small" @click="changeMonth(-1)">上个月</el-button>
      <el-button text size="small" @click="changeMonth(1)">下个月</el-button>
    </div>

    <!-- 年月选择器 -->
    <div v-if="showYearMonthPicker" class="year-month-picker">
      <div class="ym-header">
        <el-button text size="small" @click="ymYear -= 12">
          <el-icon><DArrowLeft /></el-icon>
        </el-button>
        <span class="ym-range">{{ ymYear }} - {{ ymYear + 11 }}</span>
        <el-button text size="small" @click="ymYear += 12">
          <el-icon><DArrowRight /></el-icon>
        </el-button>
      </div>
      <div class="ym-years">
        <div
          v-for="y in 12"
          :key="y"
          class="ym-item"
          :class="{ active: ymYear + y - 1 === currentYear }"
          @click="selectYear(ymYear + y - 1)"
        >
          {{ ymYear + y - 1 }}
        </div>
      </div>
      <div class="ym-months">
        <div
          v-for="m in 12"
          :key="m"
          class="ym-item"
          :class="{ active: m === currentMonth }"
          @click="selectMonth(m)"
        >
          {{ m }}月
        </div>
      </div>
    </div>

    <!-- 星期头 -->
    <div class="cal-weekdays">
      <span class="weekday is-weekend">日</span>
      <span class="weekday">一</span>
      <span class="weekday">二</span>
      <span class="weekday">三</span>
      <span class="weekday">四</span>
      <span class="weekday">五</span>
      <span class="weekday is-weekend">六</span>
    </div>

    <!-- 日期网格 -->
    <div class="cal-body">
      <div
        v-for="(day, idx) in calendarDays"
        :key="idx"
        class="cal-day"
        :class="{
          'is-other-month': !day.isCurrentMonth,
          'is-today': day.isToday,
          'is-selected': day.isSelected,
          'has-diary': day.hasDiary,
          'is-holiday': day.isHoliday,
          'is-weekend': day.isWeekend,
        }"
        @click="onDayClick(day)"
      >
        <div class="day-number">{{ day.day }}</div>
        <div class="day-lunar" v-if="day.isCurrentMonth">
          <span v-if="day.holiday" class="holiday-text">{{ day.holiday }}</span>
          <span v-else class="lunar-text">{{ day.lunar }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowLeft, ArrowRight, ArrowLeftBold, ArrowRightBold, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { useLunar } from '~/composables/useLunar'

const props = defineProps<{
  modelValue: Date
  diaryDates: Set<string>
}>()

const emit = defineEmits<{
  'update:modelValue': [date: Date]
  'date-click': [dateStr: string]
}>()

const { getLunarInfo } = useLunar()

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const showYearMonthPicker = ref(false)
const ymYear = ref(new Date().getFullYear() - 5)

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const days: any[] = []

  // 当月第一天
  const firstDay = new Date(year, month - 1, 1)
  const startDayOfWeek = firstDay.getDay() // 0=周日

  // 填充上月日期
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const dateStr = getDateStr(year, month - 1, day)
    const lunar = getLunarInfo(new Date(year, month - 2, day))
    days.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: false,
      hasDiary: props.diaryDates.has(dateStr),
      holiday: '',
      lunar: getLunarDayShort(lunar),
      isHoliday: false,
      isWeekend: false,
    })
  }

  // 填充当月日期
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = getDateStr(year, month, d)
    const date = new Date(year, month - 1, d)
    const lunar = getLunarInfo(date)
    const dow = date.getDay()
    
    days.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.modelValue.toISOString().split('T')[0],
      hasDiary: props.diaryDates.has(dateStr),
      holiday: lunar.holiday,
      lunar: getLunarDayShort(lunar),
      isHoliday: !!lunar.holiday,
      isWeekend: dow === 0 || dow === 6,
    })
  }

  // 填充下月日期（补齐6行）
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const day = i
    const dateStr = getDateStr(year, month + 1, day)
    const lunar = getLunarInfo(new Date(year, month, day))
    days.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: false,
      hasDiary: props.diaryDates.has(dateStr),
      holiday: '',
      lunar: getLunarDayShort(lunar),
      isHoliday: false,
      isWeekend: false,
    })
  }

  return days
})

function getDateStr(year: number, month: number, day: number) {
  // 处理月份越界
  const d = new Date(year, month - 1, day)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLunarDayShort(lunar: any) {
  if (lunar.holiday) return lunar.holiday
  // 农历日简称
  const day = lunar.lunarDay
  if (day === 1) return '初一'
  if (day === 15) return '十五'
  return ''
}

function changeMonth(delta: number) {
  let m = currentMonth.value + delta
  let y = currentYear.value
  if (m > 12) { m = 1; y++ }
  if (m < 1) { m = 12; y-- }
  currentMonth.value = m
  currentYear.value = y
}

function changeYear(delta: number) {
  currentYear.value += delta
}

function goToToday() {
  const now = new Date()
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth() + 1
  emit('update:modelValue', now)
  emit('date-click', todayStr)
}

function selectYear(year: number) {
  currentYear.value = year
  showYearMonthPicker.value = false
}

function selectMonth(month: number) {
  currentMonth.value = month
  showYearMonthPicker.value = false
}

function onDayClick(day: any) {
  const date = new Date(day.dateStr)
  emit('update:modelValue', date)
  emit('date-click', day.dateStr)
}

// 监听 modelValue 变化，同步年月
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    currentYear.value = newVal.getFullYear()
    currentMonth.value = newVal.getMonth() + 1
  }
}, { immediate: true })
</script>

<style scoped>
.beautiful-calendar {
  user-select: none;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 0 6px 0;
}

.cal-title {
  display: flex;
  align-items: baseline;
  gap: 0;
  cursor: pointer;
  padding: 2px 10px;
  border-radius: 6px;
  transition: background 0.2s;
  min-width: 110px;
  justify-content: center;
}

.cal-title:hover {
  background: #f0f5ff;
}

.cal-ym {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
}

.cal-year {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.cal-month {
  font-size: 14px;
  font-weight: 500;
  color: #595959;
}

.cal-actions {
  display: none;
  justify-content: center;
  gap: 8px;
  padding: 0 0 8px 0;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
  padding: 4px 0;
}

.weekday.is-weekend {
  color: #ff4d4f;
}

.cal-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 32px;
  gap: 2px;
}

.cal-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 32px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.cal-day:hover {
  background: #f0f5ff;
}

.day-number {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.1;
}

.day-lunar {
  font-size: 9px;
  line-height: 1;
  margin-top: 0;
}

.holiday-text {
  color: #ff4d4f;
  font-weight: 500;
}

.lunar-text {
  color: #bfbfbf;
}

/* 其他月份 */
.cal-day.is-other-month .day-number {
  color: #d9d9d9;
}
.cal-day.is-other-month .lunar-text {
  color: #e8e8e8;
}

/* 今天 */
.cal-day.is-today .day-number {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* 选中 */
.cal-day.is-selected {
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.cal-day.is-selected .day-number {
  color: white;
}
.cal-day.is-selected .lunar-text {
  color: rgba(255, 255, 255, 0.7);
}
.cal-day.is-selected .holiday-text {
  color: rgba(255, 255, 255, 0.9);
}

/* 有日记 */
.cal-day.has-diary .day-number {
  position: relative;
}
.cal-day.has-diary:not(.is-selected):not(.is-today) .day-number::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #52c41a;
}

/* 节假日 */
.cal-day.is-holiday .day-number {
  color: #ff4d4f;
}

/* 周末 */
.cal-day.is-weekend .day-number {
  color: #ff7875;
}

.cal-day.is-selected.is-weekend .day-number,
.cal-day.is-today.is-weekend .day-number {
  color: white;
}

/* 年月选择器 */
.year-month-picker {
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 8px;
}

.ym-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.ym-range {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.ym-years,
.ym-months {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.ym-item {
  text-align: center;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #1a1a1a;
  transition: all 0.2s;
}

.ym-item:hover {
  background: #f0f5ff;
}

.ym-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: 600;
}
</style>
