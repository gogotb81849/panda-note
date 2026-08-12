<template>
  <div class="schedule-page">
    <!-- 左侧导航栏（今日卡片 + 显示设置 + 重要日 + 微型小日历） -->
    <aside class="left-aside">
      <!-- 今日卡片 -->
      <div class="today-card">
        <div class="today-card-date">{{ todayLabel }}</div>
        <div class="today-card-week">{{ todayWeekCn }}</div>
        <div class="today-card-lunar">{{ todayLunar }}</div>
        <div class="today-card-ganzhi">{{ todayGanZhi }}（{{ todayAnimal }}年）</div>
        <div v-if="todayHoliday" class="today-card-holiday">{{ todayHoliday }}</div>
      </div>

      <!-- 显示设置 -->
      <div class="aside-section">
        <div class="aside-section-title">
          <el-icon><Setting /></el-icon>
          显示设置
        </div>
        <div class="setting-row">
          <el-checkbox v-model="settings.showLunar" size="small">显示农历</el-checkbox>
        </div>
        <div class="setting-row">
          <el-checkbox v-model="settings.showWeekNumber" size="small">显示周数</el-checkbox>
        </div>
        <div class="setting-row">
          <el-checkbox v-model="settings.weekStartMonday" size="small">周一开始</el-checkbox>
        </div>
        <div class="setting-row">
          <el-checkbox v-model="settings.showTodayWatermark" size="small">月份水印</el-checkbox>
        </div>
        <el-button
          type="primary"
          size="small"
          plain
          style="margin-top: 8px; width: 100%"
          @click="saveSettings"
        >
          保存设置
        </el-button>
      </div>

      <!-- 重要日 -->
      <div class="aside-section important-section">
        <div class="aside-section-title">
          <span>★ 重要日</span>
          <el-button
            text
            size="small"
            type="primary"
            @click="openImportantDateDialog"
          >+ 新增</el-button>
        </div>
        <div class="important-list">
          <div v-if="importantDates.length === 0" class="empty-hint">暂无重要日</div>
          <div
            v-for="item in upcomingImportantDates"
            :key="item.id"
            class="important-item"
            @click="jumpToImportantDate(item)"
          >
            <div class="important-item-name">{{ item.name }}</div>
            <div class="important-item-date">{{ formatImportantDate(item) }}</div>
            <div v-if="item.repeatType && item.repeatType !== 'none'" class="important-item-repeat">
              {{ repeatLabel(item.repeatType) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 微型小日历（华为风左栏底部快速跳转） -->
      <div class="aside-section mini-cal-section">
        <div class="mini-cal-header">
          <el-button text size="small" @click="miniPrevMonth"><el-icon><ArrowLeft /></el-icon></el-button>
          <span class="mini-cal-title">{{ miniMonthLabel }}</span>
          <el-button text size="small" @click="miniNextMonth"><el-icon><ArrowRight /></el-icon></el-button>
        </div>
        <div class="mini-cal-grid">
          <div
            v-for="d in miniWeekHeaders"
            :key="d"
            class="mini-cal-h"
          >{{ d }}</div>
          <div
            v-for="(day, i) in miniDays"
            :key="i"
            class="mini-cal-day"
            :class="day.classes"
            @click="miniJump(day)"
          >
            <span class="mini-cal-num">{{ day.n }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 中部主体（顶栏工具栏 + 四象限过滤 + 日历视图） -->
    <main class="main-body">
      <!-- 工具栏（华为风）：左=导航+日期；中=视图Tab；右=更多四点+加号+业务功能 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button size="small" @click="prevPeriod" title="上一周期">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-button size="small" @click="goToToday" class="today-btn">今天</el-button>
          <el-button size="small" @click="nextPeriod" title="下一周期">
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <span class="current-date">{{ currentDateLabel }}</span>
        </div>

        <!-- 中部：年/月/周/日 视图 Tab（华为风格，居中） -->
        <div class="toolbar-center">
          <el-radio-group v-model="viewType" size="default" class="view-tab-group">
            <el-radio-button label="year">年</el-radio-button>
            <el-radio-button label="month">月</el-radio-button>
            <el-radio-button label="week">周</el-radio-button>
            <el-radio-button label="day">日</el-radio-button>
          </el-radio-group>
        </div>

        <div class="toolbar-right">
          <!-- 更多四点按钮（华为风 ····） -->
          <el-dropdown trigger="click" @command="handleMoreCmd">
            <el-button size="default" class="more-dots-btn" title="更多">
              <span class="four-dots">
                <i></i><i></i><i></i><i></i>
              </span>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="jump">跳转日期…</el-dropdown-item>
                <el-dropdown-item command="all">查看全部日程</el-dropdown-item>
                <el-dropdown-item command="search">搜索日程</el-dropdown-item>
                <el-dropdown-item command="settings" divided>日历设置…</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 新建（加号按钮，华为风独立加号） -->
          <el-button size="default" type="primary" round class="hw-plus-btn" @click="openCreateDialog" title="新建日程">
            <el-icon style="font-size: 16px;"><Plus /></el-icon>
          </el-button>

          <!-- 原有船舶业务按钮 -->
          <el-divider direction="vertical" class="toolbar-divider" />
          <el-select
            v-model="selectedShipId"
            placeholder="选择船舶"
            clearable
            size="small"
            style="width: 160px"
          >
            <el-option
              v-for="ship in ships"
              :key="ship.id"
              :label="ship.cnShipName"
              :value="ship.id"
            />
          </el-select>
          <el-button type="info" size="small" @click="goToDashboard">
            <el-icon><PieChart /></el-icon>
            看板
          </el-button>
          <el-button type="info" size="small" @click="goToDiary">
            <el-icon><Edit /></el-icon>
            日记
          </el-button>
          <el-button type="success" size="small" @click="openBulkCreate">
            <el-icon><Plus /></el-icon>
            批量创建
          </el-button>
        </div>
      </div>

      <!-- 四象限过滤 -->
      <div class="quadrant-filter">
        <span class="quadrant-label">四象限：</span>
        <el-radio-group v-model="activeQuadrantFilter" size="small">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="urgent_important">
            <span class="quadrant-dot urgent-important"></span>
            重要紧急
          </el-radio-button>
          <el-radio-button label="important">
            <span class="quadrant-dot important"></span>
            重要不紧急
          </el-radio-button>
          <el-radio-button label="urgent">
            <span class="quadrant-dot urgent"></span>
            紧急不重要
          </el-radio-button>
          <el-radio-button label="normal">
            <span class="quadrant-dot normal"></span>
            不紧急不重要
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 视图主体 -->
      <div class="view-container">
        <HuaWeiYearView
          v-if="viewType === 'year'"
          :date="currentDate"
          :schedules="filteredSchedules"
          :show-lunar="settings.showLunar"
          :week-start-monday="settings.weekStartMonday"
          @month-click="handleMonthClick"
          @date-click="handleDateClick"
        />
        <HuaWeiMonthView
          v-else-if="viewType === 'month'"
          :schedules="filteredSchedules"
          :important-dates="importantDates"
          :date="currentDate"
          :show-lunar="settings.showLunar"
          :show-week-number="settings.showWeekNumber"
          :week-start-monday="settings.weekStartMonday"
          :show-today-watermark="settings.showTodayWatermark"
          :selected-date="selectedDateStr"
          @date-click="handleDateClick"
          @schedule-click="handleScheduleClick"
        />
        <WeekView
          v-else-if="viewType === 'week'"
          :schedules="filteredSchedules"
          :date="currentDate"
          @date-click="handleDateClick"
          @schedule-click="handleScheduleClick"
          @create-at="handleCreateAt"
        />
        <DayView
          v-else
          :schedules="filteredSchedules"
          :date="currentDate"
          @schedule-click="handleScheduleClick"
          @date-click="handleDayViewDateClick"
          @create-at="handleCreateAt"
        />
      </div>
    </main>

    <!-- 右栏详情面板（华为风：今日卡片 + 节日倒计时 + 选中日详情 + 节日/休班图例） -->
    <aside class="right-aside">
      <!-- 今天卡 -->
      <div class="right-today-card">
        <div class="rtc-label">今天</div>
        <div class="rtc-date">{{ todayShort }}</div>
        <div class="rtc-lunar">{{ todayLunarInfo.ganZhi }}年 · {{ todayLunar }} · {{ todayWeekCn }}</div>
        <div v-if="todayHoliday" class="rtc-festival-today">
          <el-icon><WarningFilled /></el-icon>
          今日：{{ todayHoliday }}
        </div>
      </div>

      <!-- 下一个节日倒计时（华为风：七夕节 5天后） -->
      <div v-if="nextFestival" class="festival-countdown-card">
        <div class="fcc-top">
          <span class="fcc-name">{{ nextFestival.name }}</span>
          <span class="fcc-days">还有 {{ nextFestival.daysLater }} 天</span>
        </div>
        <div class="fcc-date">
          {{ nextFestival.ymd }} · {{ nextFestival.lunar }}
          <span v-if="nextFestival.holidayTag" class="fcc-tag">{{ nextFestival.holidayTag }}</span>
        </div>
        <div class="fcc-bar">
          <div class="fcc-bar-inner" :style="{ width: nextFestival.barPct + '%' }"></div>
        </div>
      </div>

      <!-- 选中日详情（月视图点中时展示） -->
      <div v-if="selectedDateInfo" class="selected-date-card">
        <div class="sdc-title">选中日期</div>
        <div class="sdc-date">{{ selectedDateInfo.ymd }}  {{ selectedDateInfo.weekCn }}</div>
        <div class="sdc-lunar">{{ selectedDateInfo.lunar }}</div>
        <div v-if="selectedDateInfo.caption" class="sdc-caption" :class="`sdc-caption-${selectedDateInfo.captionType}`">
          {{ selectedDateInfo.caption }}
        </div>
        <div v-if="selectedDateInfo.isHoliday" class="sdc-holiday-tag">法定假期</div>
        <div v-if="selectedDateInfo.isWorkday" class="sdc-workday-tag">调休上班</div>
        <div v-if="selectedDateInfo.importantOnDay.length" class="sdc-important-row">
          ★ 重要日：
          <span v-for="(i, idx) in selectedDateInfo.importantOnDay" :key="i.id">
            {{ i.name }}<span v-if="idx < selectedDateInfo.importantOnDay.length - 1">、</span>
          </span>
        </div>
        <div v-if="selectedDateInfo.eventCount > 0" class="sdc-event-row">
          当日有 <b>{{ selectedDateInfo.eventCount }}</b> 条日程
        </div>
      </div>

      <!-- 休班图例 -->
      <div class="legend-card">
        <div class="legend-row"><span class="legend-dot holiday"></span>法定休假日</div>
        <div class="legend-row"><span class="legend-dot workday"></span>调休上班日</div>
        <div class="legend-row"><span class="legend-circle today"></span>今日 / 选中</div>
        <div class="legend-row"><span class="legend-text fu">初伏·中伏·末伏</span>三伏天</div>
      </div>
    </aside>

    <!-- 批量创建对话框 -->
    <el-dialog v-model="bulkCreateVisible" title="批量创建任务" width="560px">
      <div v-if="taskTemplates.length === 0" class="bulk-empty">
        <el-empty description="暂无标准任务模板">
          <el-button type="primary" @click="goToDictPage">前往分类与任务库</el-button>
        </el-empty>
      </div>
      <div v-else class="bulk-list">
        <div
          v-for="(item, idx) in bulkCreateItems"
          :key="idx"
          class="bulk-row"
          @click="toggleBulkItem(idx)"
        >
          <el-checkbox :model-value="item.selected" @click.stop @change="toggleBulkItem(idx)" />
          <el-tag size="small" type="primary" class="bulk-tag">{{ item.firstType }}</el-tag>
          <el-tag size="small" type="success" class="bulk-tag">{{ item.secondType || '未分类' }}</el-tag>
          <span class="bulk-text">{{ item.eventDetail || '（无描述）' }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="bulkCreateVisible = false">取消</el-button>
        <el-button
          v-if="taskTemplates.length > 0"
          type="primary"
          :loading="saving"
          @click="confirmBulkCreate"
        >确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑日程弹窗 -->
    <HuaWeiCreateDialog
      v-model="dialogVisible"
      :is-edit="isEdit"
      :edit-schedule="editingSchedule"
      :ships="ships"
      :first-types="firstTypes"
      :second-types="secondTypes"
      :default-date="dialogDefaultDate"
      @saved="onDialogSaved"
    />

    <!-- 新增重要日弹窗 -->
    <el-dialog v-model="importantDialogVisible" title="新增重要日" width="480px">
      <el-form :model="importantForm" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="importantForm.name" placeholder="如：考试、生日、纪念日" />
        </el-form-item>
        <el-form-item label="日期" required>
          <el-date-picker
            v-model="importantForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="重复">
          <el-select v-model="importantForm.repeatType" style="width: 100%">
            <el-option label="不重复" value="none" />
            <el-option label="每年重复" value="yearly" />
            <el-option label="每月重复" value="monthly" />
            <el-option label="每周重复" value="weekly" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="importantForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importantDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importantSaving" @click="saveImportantDate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 跳转日期弹窗（华为风三列滚轮） -->
    <HuaWeiJumpDateDialog
      v-model="jumpDialogVisible"
      :initial-date="currentDate"
      @confirm="handleJumpConfirm"
    />

    <!-- 搜索日程弹窗 -->
    <HuaWeiSearchDialog
      v-model="searchDialogVisible"
      :schedules="schedules"
      @pick="handleSearchPick"
    />

    <!-- 日历设置弹窗（华为风 3 区块） -->
    <HuaWeiSettingsDialog
      v-model="settingsDialogVisible"
      :settings="settings"
      @saved="handleSettingsSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ArrowLeft, ArrowRight, Setting, PieChart, Edit, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Schedule, Ship, DictCategory } from '~/types'
import { useScheduleShortcuts } from '~/composables/useScheduleShortcuts'
import { useLunar } from '~/composables/useLunar'
import HuaWeiMonthView from '~/components/HuaWeiMonthView.vue'
import HuaWeiYearView from '~/components/HuaWeiYearView.vue'
import HuaWeiCreateDialog from '~/components/HuaWeiCreateDialog.vue'
import HuaWeiJumpDateDialog from '~/components/HuaWeiJumpDateDialog.vue'
import HuaWeiSearchDialog from '~/components/HuaWeiSearchDialog.vue'
import HuaWeiSettingsDialog, { type ScheduleSettingsModel } from '~/components/HuaWeiSettingsDialog.vue'
import WeekView from '~/components/WeekView.vue'
import DayView from '~/components/DayView.vue'

definePageMeta({
  middleware: ['auth'],
})

const router = useRouter()
const api = useApi()
const { getLunarInfo, getDayCaption } = useLunar()

type ViewType = 'year' | 'month' | 'week' | 'day'

const viewType = ref<ViewType>('month')
const currentDate = ref(new Date())
const activeQuadrantFilter = ref('all')
const selectedShipId = ref<number | null>(null)
const selectedDateStr = ref<string>(toYmd(new Date())) // 月视图选中的日期（YMD）

const schedules = ref<Schedule[]>([])
const ships = ref<Ship[]>([])
const firstTypes = ref<DictCategory[]>([])
const secondTypes = ref<DictCategory[]>([])
const taskTemplates = ref<any[]>([])

const dialogVisible = ref(false)
const isEdit = ref(false)
const editingSchedule = ref<Schedule | null>(null)
const dialogDefaultDate = ref('')

const bulkCreateVisible = ref(false)
const bulkCreateItems = ref<any[]>([])
const saving = ref(false)

// 用户偏好设置
const settings = ref({
  showLunar: true,
  showWeekNumber: true,
  weekStartMonday: false,
  showTodayWatermark: true,
})

// 重要日
const importantDates = ref<any[]>([])
const importantDialogVisible = ref(false)
const importantSaving = ref(false)
const importantForm = ref({
  name: '',
  date: '',
  repeatType: 'none' as 'none' | 'yearly' | 'monthly' | 'weekly',
  description: '',
})

// 华为风 P1 弹窗：跳转日期 / 搜索日程 / 设置
const jumpDialogVisible = ref(false)
const searchDialogVisible = ref(false)
const settingsDialogVisible = ref(false)

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ===== 今日卡片 =====
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const todayLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
})
const todayShort = computed(() => {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日`
})
const todayWeekCn = computed(() => WEEK_CN[new Date().getDay()])
const todayLunarInfo = computed(() => getLunarInfo(new Date()))
const todayLunar = computed(() => todayLunarInfo.value.lunar)
const todayGanZhi = computed(() => todayLunarInfo.value.ganZhi)
const todayAnimal = computed(() => todayLunarInfo.value.animal)
const todayHoliday = computed(
  () => todayLunarInfo.value.holiday || todayLunarInfo.value.solarTerm || todayLunarInfo.value.fu || '',
)

// ===== 右栏：下一个节日倒计时 =====
const nextFestival = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()
  // 搜索未来 60 天内的节日/节气/三伏
  for (let i = 1; i <= 80; i++) {
    const d = new Date(todayTs + i * 86400000)
    const info = getLunarInfo(d)
    const name = info.holiday || info.solarTerm || info.fu
    if (name) {
      const cap = getDayCaption(d, true) as any
      // 只高亮传统节日或重要节气（lunarMonth 这种不算）
      if (cap.type === 'festival' || cap.type === 'fu' || cap.type === 'solarTerm') {
        const lunar = info.lunar
        const holidayTag = info.isHoliday ? '休假' : info.isWorkday ? '上班' : ''
        return {
          name,
          daysLater: i,
          ymd: toYmd(d),
          lunar,
          holidayTag,
          barPct: Math.min(100, Math.max(6, 100 - i * 2)),
        }
      }
    }
  }
  return null
})

// ===== 右栏：选中日详情 =====
const selectedDateInfo = computed(() => {
  if (!selectedDateStr.value) return null
  const d = new Date(selectedDateStr.value)
  if (Number.isNaN(d.getTime())) return null
  const info = getLunarInfo(d)
  const cap = getDayCaption(d, true) as any
  const ymd = selectedDateStr.value
  const eventCount = filteredSchedules.value.filter(
    s => (s.recordDate ? String(s.recordDate).slice(0, 10) : '') === ymd,
  ).length
  const importantOnDay = importantDates.value.filter(
    i => (i.date ? String(i.date).slice(0, 10) : '') === ymd,
  )
  return {
    ymd,
    weekCn: WEEK_CN[d.getDay()],
    lunar: info.lunar,
    caption: cap.type === 'lunarDay' || cap.type === 'lunarMonth' ? '' : cap.text,
    captionType: cap.type,
    isHoliday: !!info.isHoliday,
    isWorkday: !!info.isWorkday,
    eventCount,
    importantOnDay,
  }
})

// ===== 左栏：微型小日历 =====
const miniCursor = ref<{ y: number; m: number }>({
  y: new Date().getFullYear(),
  m: new Date().getMonth(),
})
const miniMonthLabel = computed(() => `${miniCursor.value.y}年${miniCursor.value.m + 1}月`)
const miniWeekHeaders = computed(() => {
  if (settings.value.weekStartMonday) return ['一', '二', '三', '四', '五', '六', '日']
  return ['日', '一', '二', '三', '四', '五', '六']
})
const miniDays = computed(() => {
  const { y, m } = miniCursor.value
  const first = new Date(y, m, 1)
  let offset = first.getDay() // 0=Sun
  if (settings.value.weekStartMonday) offset = (offset + 6) % 7
  const start = new Date(y, m, 1 - offset)
  const today = toYmd(new Date())
  const selected = selectedDateStr.value
  const days: Array<{ n: number; ymd: string; classes: Record<string, boolean> }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const ymd = toYmd(d)
    days.push({
      n: d.getDate(),
      ymd,
      classes: {
        'not-current': d.getMonth() !== m,
        'is-today': ymd === today,
        'is-selected': ymd === selected,
        'is-weekend': d.getDay() === 0 || d.getDay() === 6,
      },
    })
  }
  return days
})
function miniPrevMonth() {
  let { y, m } = miniCursor.value
  if (m === 0) { y -= 1; m = 11 } else m -= 1
  miniCursor.value = { y, m }
}
function miniNextMonth() {
  let { y, m } = miniCursor.value
  if (m === 11) { y += 1; m = 0 } else m += 1
  miniCursor.value = { y, m }
}
function miniJump(day: any) {
  const d = new Date(day.ymd)
  currentDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  if (viewType.value === 'year' && d.getMonth() !== currentDate.value.getMonth()) {
    // keep year view
  }
  viewType.value = 'month'
  selectedDateStr.value = day.ymd
}

// ===== 数据过滤 =====
const filteredSchedules = computed(() => {
  let result = [...schedules.value]
  if (selectedShipId.value) {
    result = result.filter(s => s.shipId === selectedShipId.value)
  }
  if (activeQuadrantFilter.value !== 'all') {
    result = result.filter(s => {
      switch (activeQuadrantFilter.value) {
        case 'urgent_important': return s.priority === 'urgent_important'
        case 'important': return s.priority === 'important'
        case 'urgent': return s.priority === 'urgent'
        case 'normal': return s.priority === 'normal' || s.priority === 'low'
        default: return true
      }
    })
  }
  return result
})

// 即将到来的重要日（按日期升序，前 10 条）
const upcomingImportantDates = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return [...importantDates.value]
    .map(d => ({ ...d, _ts: new Date(d.date).getTime() }))
    .filter(d => d._ts >= now.getTime() - 365 * 86400000)
    .sort((a, b) => a._ts - b._ts)
    .slice(0, 10)
})

// ===== 日期导航 =====
const currentDateLabel = computed(() => {
  const d = currentDate.value
  if (viewType.value === 'year') return `${d.getFullYear()}年`
  if (viewType.value === 'month') return `${d.getFullYear()}年${d.getMonth() + 1}月`
  if (viewType.value === 'week') return `${d.getFullYear()}年第${getWeekNumber(d)}周`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

const prevPeriod = () => {
  const d = currentDate.value
  if (viewType.value === 'year') currentDate.value = new Date(d.getFullYear() - 1, 0, 1)
  else if (viewType.value === 'month') currentDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  else if (viewType.value === 'week') currentDate.value = new Date(d.getTime() - 7 * 86400000)
  else currentDate.value = new Date(d.getTime() - 86400000)
}

const nextPeriod = () => {
  const d = currentDate.value
  if (viewType.value === 'year') currentDate.value = new Date(d.getFullYear() + 1, 0, 1)
  else if (viewType.value === 'month') currentDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  else if (viewType.value === 'week') currentDate.value = new Date(d.getTime() + 7 * 86400000)
  else currentDate.value = new Date(d.getTime() + 86400000)
}

const goToToday = () => {
  currentDate.value = new Date()
  selectedDateStr.value = toYmd(new Date())
}

// ===== 更多四点菜单：跳转日期/查看全部/搜索/设置 =====
function handleMoreCmd(cmd: string) {
  if (cmd === 'jump') {
    jumpDialogVisible.value = true
  } else if (cmd === 'all') {
    // 查看全部日程 = 打开搜索（无关键词立即搜，显示全部结果）
    searchDialogVisible.value = true
  } else if (cmd === 'search') {
    searchDialogVisible.value = true
  } else if (cmd === 'settings') {
    settingsDialogVisible.value = true
  }
}

// ===== DayView 新事件：点击日期切换、点击具体时段创建 =====
function handleDayViewDateClick(dateStr: string) {
  // 选中该日，更新 currentDate 使其所在月正确显示，并触发 dateClick 行为（弹创建框）
  selectedDateStr.value = dateStr
  const d = new Date(dateStr)
  if (!Number.isNaN(d.getTime())) {
    currentDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
}
function handleCreateAt(payload: { dateStr: string; hour: number | null }) {
  selectedDateStr.value = payload.dateStr
  dialogDefaultDate.value = payload.dateStr
  isEdit.value = false
  editingSchedule.value = null
  dialogVisible.value = true
}

// ===== 跳转日期弹窗确认 =====
function handleJumpConfirm(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return
  selectedDateStr.value = dateStr
  currentDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  if (viewType.value === 'year') viewType.value = 'month'
  ElMessage.success(`已跳转至 ${dateStr}`)
}

// ===== 搜索弹窗选中某条：打开编辑 =====
function handleSearchPick(schedule: Schedule) {
  isEdit.value = true
  editingSchedule.value = schedule
  const d = schedule.recordDate ? String(schedule.recordDate).split('T')[0] : ''
  dialogDefaultDate.value = d
  if (d) {
    selectedDateStr.value = d
    const pd = new Date(d)
    if (!Number.isNaN(pd.getTime())) currentDate.value = new Date(pd.getFullYear(), pd.getMonth(), 1)
  }
  dialogVisible.value = true
}

// ===== 设置弹窗保存后，同步回本地 settings =====
function handleSettingsSaved(newSettings: ScheduleSettingsModel) {
  settings.value.showLunar = newSettings.showLunar
  settings.value.showWeekNumber = newSettings.showWeekNumber
  settings.value.weekStartMonday = newSettings.weekStartMonday
  settings.value.showTodayWatermark = newSettings.showTodayWatermark
}

// ===== 事件处理 =====
const handleDateClick = (dateStr: string) => {
  selectedDateStr.value = dateStr
  dialogDefaultDate.value = dateStr
  isEdit.value = false
  editingSchedule.value = null
  dialogVisible.value = true
}

const handleScheduleClick = (schedule: Schedule) => {
  isEdit.value = true
  editingSchedule.value = schedule
  const d = schedule.recordDate ? String(schedule.recordDate).split('T')[0] : ''
  dialogDefaultDate.value = d
  if (d) selectedDateStr.value = d
  dialogVisible.value = true
}

const handleMonthClick = (m: number) => {
  // 年视图点月份 → 切到月视图
  currentDate.value = new Date(currentDate.value.getFullYear(), m - 1, 1)
  viewType.value = 'month'
}

const openCreateDialog = () => {
  isEdit.value = false
  editingSchedule.value = null
  dialogDefaultDate.value = toYmd(currentDate.value)
  dialogVisible.value = true
}

const onDialogSaved = () => {
  loadSchedules()
  loadImportantDates()
}

// ===== 批量创建 =====
const openBulkCreate = () => {
  if (taskTemplates.value.length > 0) {
    bulkCreateItems.value = taskTemplates.value.map((t: any) => ({
      firstType: t.firstType,
      secondType: t.secondType,
      eventDetail: t.title || t.eventDetail || '',
      priority: t.priority || 'normal',
      selected: false,
      fromTemplate: true,
    }))
  } else {
    bulkCreateItems.value = firstTypes.value.map((ft: any) => ({
      firstType: ft.categoryName,
      secondType: '',
      eventDetail: '',
      priority: 'normal',
      selected: false,
      fromTemplate: false,
    }))
  }
  bulkCreateVisible.value = true
}

const toggleBulkItem = (idx: number) => {
  bulkCreateItems.value[idx].selected = !bulkCreateItems.value[idx].selected
}

const confirmBulkCreate = async () => {
  const selected = bulkCreateItems.value.filter(i => i.selected).map(i => ({
    firstType: i.firstType,
    secondType: i.secondType || '未分类',
    eventDetail: i.eventDetail,
    finishStatus: 'pending',
    priority: i.priority || 'normal',
  }))
  if (selected.length === 0) {
    ElMessage.warning('请选择要创建的任务')
    return
  }
  const itemsWithDate = selected.map(s => ({
    ...s,
    recordDate: toYmd(currentDate.value),
  }))
  saving.value = true
  try {
    await api.schedules.bulkCreate(itemsWithDate)
    ElMessage.success(`成功创建 ${selected.length} 个任务`)
    bulkCreateVisible.value = false
    loadSchedules()
  } catch (err: any) {
    ElMessage.error('批量创建失败')
    console.error(err)
  } finally {
    saving.value = false
  }
}

// ===== 重要日 =====
const openImportantDateDialog = () => {
  importantForm.value = {
    name: '',
    date: toYmd(currentDate.value),
    repeatType: 'none',
    description: '',
  }
  importantDialogVisible.value = true
}

const saveImportantDate = async () => {
  if (!importantForm.value.name || !importantForm.value.date) {
    ElMessage.warning('请填写名称和日期')
    return
  }
  importantSaving.value = true
  try {
    await api.importantDates.create({
      name: importantForm.value.name,
      date: importantForm.value.date,
      repeatType: importantForm.value.repeatType,
      description: importantForm.value.description,
    })
    ElMessage.success('重要日已添加')
    importantDialogVisible.value = false
    loadImportantDates()
  } catch (err: any) {
    console.error('[Schedule] saveImportantDate 失败:', err)
    ElMessage.error('添加失败：' + (err?.message || ''))
  } finally {
    importantSaving.value = false
  }
}

const jumpToImportantDate = (item: any) => {
  const d = new Date(item.date)
  currentDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  viewType.value = 'month'
  selectedDateStr.value = toYmd(d)
}

const formatImportantDate = (item: any): string => {
  const d = new Date(item.date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const repeatLabel = (t: string): string => {
  const map: Record<string, string> = {
    none: '',
    yearly: '每年',
    monthly: '每月',
    weekly: '每周',
  }
  return map[t] || ''
}

// ===== 设置 =====
const saveSettings = async () => {
  try {
    await api.scheduleSettings.update(settings.value)
    ElMessage.success('设置已保存')
  } catch (err) {
    console.warn('[Schedule] saveSettings 云端同步失败（已存本地）:', err)
    ElMessage.info('设置已保存到本地（云端同步失败）')
  }
}

// ===== 跳转 =====
const goToDictPage = () => { bulkCreateVisible.value = false; router.push('/dict') }
const goToDashboard = () => { router.push('/dashboard') }
const goToDiary = () => { router.push('/work-log') }

// ===== 加载数据 =====
const loadData = async () => {
  try {
    const [shipsData, firstTypesData, secondTypesData] = await Promise.all([
      api.ships.getAll(),
      api.dict.getFirstTypes(),
      api.dict.getSecondTypes(),
    ])
    ships.value = shipsData
    firstTypes.value = firstTypesData
    secondTypes.value = secondTypesData
  } catch (err) {
    console.error('[Schedule] loadData 失败:', err)
    ElMessage.error('加载数据失败')
  }
}

const loadSchedules = async () => {
  try {
    const data = await api.schedules.getAll()
    schedules.value = data
  } catch (err) {
    console.error('[Schedule] loadSchedules 失败:', err)
    ElMessage.error('加载台账失败')
  }
}

const loadTaskTemplates = async () => {
  try {
    const data = await api.standardTaskTemplates.getAll()
    taskTemplates.value = Array.isArray(data) ? data : (data as any).list || []
  } catch {
    taskTemplates.value = []
  }
}

const loadImportantDates = async () => {
  try {
    const start = new Date()
    start.setFullYear(start.getFullYear() - 1)
    const end = new Date()
    end.setFullYear(end.getFullYear() + 1)
    const data = await api.importantDates.getAll(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
    )
    importantDates.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[Schedule] loadImportantDates 失败:', err)
    importantDates.value = []
  }
}

const loadSettings = async () => {
  try {
    const data: any = await api.scheduleSettings.get()
    if (data) {
      settings.value = {
        showLunar: data.showLunar ?? true,
        showWeekNumber: data.showWeekNumber ?? true,
        weekStartMonday: data.weekStartMonday ?? false,
        showTodayWatermark: data.showTodayWatermark ?? true,
      }
    }
  } catch (err) {
    console.warn('[Schedule] loadSettings 失败（使用默认值）:', err)
  }
}

useScheduleShortcuts({
  createSchedule: () => openCreateDialog(),
  prevPeriod: () => prevPeriod(),
  nextPeriod: () => nextPeriod(),
  goToToday: () => goToToday(),
})

// 当 currentDate 切到新月份时同步微型小日历的游标
watch(currentDate, (d) => {
  miniCursor.value = { y: d.getFullYear(), m: d.getMonth() }
})

onMounted(() => {
  loadData()
  loadSchedules()
  loadTaskTemplates()
  loadImportantDates()
  loadSettings()
})
</script>

<style scoped>
.schedule-page {
  height: 100%;
  display: grid;
  grid-template-columns: 240px 1fr 300px;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg);
  overflow: hidden;
}

/* 批量创建 */
.bulk-empty {
  padding: 16px 0;
}
.bulk-list {
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bulk-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--color-border-light, #ebeef5);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.bulk-row:hover {
  background-color: var(--color-bg-hover, #f5f7fa);
}
.bulk-tag {
  margin-left: 8px;
}
.bulk-text {
  margin-left: 8px;
  flex: 1;
  color: var(--color-gray-600, #606266);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 左侧栏 */
.left-aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.today-card {
  background: linear-gradient(135deg, #3a7afe 0%, #5a8fff 100%);
  color: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(58, 122, 254, 0.25);
}

.today-card-date {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
}
.today-card-week {
  font-size: 12px;
  margin-top: 2px;
  opacity: 0.9;
}
.today-card-lunar {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.9;
}
.today-card-ganzhi {
  font-size: 11px;
  margin-top: 2px;
  opacity: 0.7;
}
.today-card-holiday {
  font-size: 12px;
  margin-top: 8px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  display: inline-block;
}

.aside-section {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 12px;
  box-shadow: var(--shadow-sm);
}
.aside-section.important-section {
  max-height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.setting-row {
  margin-bottom: 6px;
}

.important-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.empty-hint {
  font-size: 12px;
  color: var(--color-text-placeholder);
  text-align: center;
  padding: 12px 0;
}

.important-item {
  padding: 8px 10px;
  background: var(--color-bg-alt);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}
.important-item:hover {
  background: var(--color-surface-hover);
}
.important-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}
.important-item-date {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.important-item-repeat {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 10px;
  color: var(--color-warning);
  background: rgba(230, 162, 60, 0.12);
  padding: 1px 6px;
  border-radius: 8px;
}

/* ===== 左栏微型小日历 ===== */
.mini-cal-section {
  margin-top: auto;
}
.mini-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 0 4px;
}
.mini-cal-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}
.mini-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  font-size: 11px;
  text-align: center;
}
.mini-cal-h {
  padding: 4px 0;
  color: #909399;
  font-weight: 500;
}
.mini-cal-day {
  padding: 4px 0;
  border-radius: 3px;
  cursor: pointer;
  color: #606266;
}
.mini-cal-day:hover {
  background: #ecf5ff;
}
.mini-cal-day.not-current {
  color: #c0c4cc;
}
.mini-cal-day.is-weekend {
  color: #f56c6c;
}
.mini-cal-day.is-today .mini-cal-num {
  background: #f56c6c;
  color: #fff;
  display: inline-block;
  width: 18px;
  height: 18px;
  line-height: 18px;
  border-radius: 50%;
}
.mini-cal-day.is-selected:not(.is-today) .mini-cal-num {
  border: 1.5px solid #f56c6c;
  color: #f56c6c;
  display: inline-block;
  width: 18px;
  height: 18px;
  line-height: 16px;
  box-sizing: border-box;
  border-radius: 50%;
}

/* 主体 */
.main-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}

/* ===== 工具栏（华为风三段式） ===== */
.toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
  gap: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-center {
  justify-self: center;
}
.toolbar-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 今天按钮（华为风：文字 + 轻微底色） */
.today-btn {
  font-weight: 500;
  padding: 0 12px;
}

.current-date {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  min-width: 120px;
  text-align: left;
  margin-left: 8px;
  letter-spacing: 0.3px;
}

/* 中部视图 Tab 组 */
.view-tab-group {
  background: #f2f3f5;
  border-radius: 6px;
  padding: 2px;
}
.view-tab-group :deep(.el-radio-button) {
  margin-right: 0;
}
.view-tab-group :deep(.el-radio-button__inner) {
  padding: 6px 18px !important;
  border-radius: 4px !important;
  border: 0 !important;
  background: transparent !important;
  color: #606266 !important;
  font-weight: 500 !important;
  font-size: 13px;
}
.view-tab-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #ffffff !important;
  color: #f56c6c !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* 更多四点按钮 */
.more-dots-btn {
  padding: 6px 10px !important;
}
.four-dots {
  display: inline-grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  width: 12px;
  height: 12px;
}
.four-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #606266;
  display: inline-block;
}

/* 华为风加号圆形按钮 */
.hw-plus-btn {
  width: 34px;
  height: 34px;
  padding: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50% !important;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.25);
}

.toolbar-divider {
  margin: 0 4px;
  border-color: var(--color-border-light, #ebeef5);
}

/* 四象限过滤 */
.quadrant-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}
.quadrant-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.quadrant-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.quadrant-dot.urgent-important { background-color: var(--color-danger); }
.quadrant-dot.important { background-color: var(--color-warning); }
.quadrant-dot.urgent { background-color: var(--color-primary); }
.quadrant-dot.normal { background-color: var(--color-success); }

.view-container {
  flex: 1;
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  min-height: 0;
}

/* ===== 右栏详情面板 ===== */
.right-aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-left: 4px;
}
.right-today-card {
  background: linear-gradient(160deg, #fef6f6 0%, #ffffff 100%);
  border: 1px solid #fce0e0;
  border-radius: 10px;
  padding: 16px;
}
.rtc-label {
  font-size: 11px;
  color: #909399;
  letter-spacing: 1px;
}
.rtc-date {
  font-size: 26px;
  font-weight: 700;
  color: #f56c6c;
  margin-top: 2px;
  line-height: 1.1;
}
.rtc-lunar {
  font-size: 12px;
  color: #606266;
  margin-top: 6px;
}
.rtc-festival-today {
  margin-top: 10px;
  font-size: 12px;
  color: #e6a23c;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: #fdf6ec;
  border-radius: 4px;
}

/* 节日倒计时 */
.festival-countdown-card {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 14px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border-light, #f0f0f0);
}
.fcc-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.fcc-name {
  font-size: 16px;
  font-weight: 700;
  color: #f56c6c;
}
.fcc-days {
  font-size: 12px;
  color: #606266;
}
.fcc-date {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 6px;
}
.fcc-tag {
  background: #67c23a22;
  color: #67c23a;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
}
.fcc-bar {
  margin-top: 12px;
  height: 4px;
  width: 100%;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}
.fcc-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #f56c6c, #ff8a8a);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* 选中日详情卡 */
.selected-date-card {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 14px;
  box-shadow: var(--shadow-sm);
}
.sdc-title {
  font-size: 11px;
  letter-spacing: 1px;
  color: #909399;
  margin-bottom: 4px;
}
.sdc-date {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.sdc-lunar {
  font-size: 12px;
  color: #606266;
  margin-top: 3px;
}
.sdc-caption {
  margin-top: 8px;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
}
.sdc-caption-festival,
.sdc-caption-fu {
  background: #fdecec;
  color: #f56c6c;
  font-weight: 500;
}
.sdc-caption-solarTerm {
  background: #f2f6ec;
  color: #67c23a;
}
.sdc-caption-historical {
  background: #ecf1f6;
  color: #606266;
}
.sdc-holiday-tag,
.sdc-workday-tag {
  margin-top: 8px;
  display: inline-block;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 700;
}
.sdc-holiday-tag {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}
.sdc-workday-tag {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}
.sdc-important-row {
  margin-top: 8px;
  font-size: 12px;
  color: #e6a23c;
}
.sdc-event-row {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}
.sdc-event-row b {
  color: #f56c6c;
  font-size: 13px;
}

/* 图例卡 */
.legend-card {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}
.legend-row {
  font-size: 12px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.legend-dot.holiday { background: #67c23a; }
.legend-dot.workday { background: #e6a23c; }
.legend-circle.today {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #f56c6c;
  background: transparent;
  box-sizing: border-box;
  flex-shrink: 0;
}
.legend-text { font-size: 11px; font-weight: 500; }
.legend-text.fu { color: #f56c6c; background: #fdecec; padding: 1px 6px; border-radius: 3px; }

/* 批量创建列表 */
.bulk-create-list {
  max-height: 400px;
  overflow-y: auto;
}
.bulk-create-row {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--color-gray-200);
  cursor: pointer;
}
.bulk-create-row:hover {
  background: #f8fafc;
}

/* 空状态引导 */
.empty-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}
.empty-guide-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}
.empty-guide-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-gray-700);
  margin-bottom: 12px;
}
.empty-guide-desc {
  font-size: 14px;
  color: var(--color-info);
  line-height: 1.6;
  margin-bottom: 24px;
  max-width: 400px;
}
.empty-guide-actions {
  display: flex;
  gap: 12px;
}

/* 响应式：窄屏隐藏左右侧栏 */
@media (max-width: 1280px) {
  .schedule-page {
    grid-template-columns: 220px 1fr;
  }
  .right-aside { display: none; }
}
@media (max-width: 960px) {
  .schedule-page {
    grid-template-columns: 1fr;
  }
  .left-aside {
    order: 2;
  }
  .toolbar {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .toolbar-center,
  .toolbar-right {
    justify-self: start;
    flex-wrap: wrap;
  }
}
</style>
