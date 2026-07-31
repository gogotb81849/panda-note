<template>
  <div class="work-log-page">
    <ViewSwitcher
      v-if="isPoliticalInstructor"
      ref="viewSwitcherRef"
      :available-ships="availableShips"
      :current-ship-id="currentShipId"
      :current-user-id="authStore.user?.id"
      @view-change="handleViewChange"
      @ship-change="handleShipChange"
    />

    <!-- 顶部日期选择器 -->
    <div class="date-selector">
      <button class="nav-btn" @click="prevDay">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <div class="date-display" @click="showDatePicker = true">
        <div class="date-main">{{ selectedDateLabel }}</div>
        <div class="date-sub">{{ lunarInfo.lunar }} {{ lunarInfo.holiday || '' }}</div>
      </div>
      <button class="nav-btn" @click="nextDay">
        <el-icon><ArrowRight /></el-icon>
      </button>
      <button class="today-btn" @click="goToday">今天</button>
    </div>

    <!-- 日期选择弹窗 -->
    <el-dialog v-model="showDatePicker" title="选择日期" width="360px" :close-on-click-modal="true">
      <el-calendar v-model="tempDate" />
      <template #footer>
        <el-button @click="showDatePicker = false">取消</el-button>
        <el-button type="primary" @click="confirmDate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 迷你日历 -->
    <div class="calendar-section" :class="{ 'calendar-collapsed': calendarCollapsed }">
      <div class="calendar-header" @click="calendarCollapsed = !calendarCollapsed">
        <span class="calendar-title">📅 {{ calendarYearMonth }}</span>
        <div class="calendar-nav">
          <button class="cal-nav-btn" @click.stop="prevMonth">‹</button>
          <button class="cal-nav-btn" @click.stop="nextMonth">›</button>
          <el-icon class="calendar-toggle-icon">
            <ArrowDown v-if="calendarCollapsed" />
            <ArrowUp v-else />
          </el-icon>
        </div>
      </div>
      <div v-show="!calendarCollapsed" class="calendar-body">
        <!-- 星期表头 -->
        <div class="mini-cal-weekdays">
          <span v-for="w in weekdayLabels" :key="w">{{ w }}</span>
        </div>
        <!-- 日期网格 -->
        <div class="mini-cal-grid">
          <div
            v-for="day in miniCalendarDays"
            :key="day.dateStr"
            class="mini-cal-day"
            :class="{
              'is-other-month': !day.inCurrentMonth,
              'is-today': day.isToday,
              'is-selected': day.isSelected,
              'has-diary': day.hasDiary,
              'has-todo': day.hasTodo,
            }"
            @click="jumpToDate(day.dateStr)"
          >
            <span class="mini-cal-daynum">{{ day.dayNum }}</span>
            <span class="mini-cal-dots">
              <span v-if="day.hasDiary" class="dot dot-diary"></span>
              <span v-if="day.hasTodo" class="dot dot-todo"></span>
            </span>
          </div>
        </div>
        <!-- 图例 -->
        <div class="mini-cal-legend">
          <span class="legend-item"><span class="dot dot-diary"></span>有日记</span>
          <span class="legend-item"><span class="dot dot-todo"></span>有待办</span>
        </div>
      </div>
    </div>

    <!-- 日记编辑器 -->
    <div class="diary-section">
      <div class="section-header">
        <span class="section-title">📝 {{ diaryTitle }}</span>
      </div>
      <div class="diary-content">
        <template v-if="isPoliticalInstructor">
          <div class="info-bar">
            <div class="info-row">
              <div class="info-group">
                <label class="info-label">出发港</label>
                <el-select v-model="diaryForm.departurePort" placeholder="出发港" size="small" filterable>
                  <el-option v-for="port in ports" :key="'dep-' + port.id" :label="`${port.name}${port.enName ? ` (${port.enName})` : ''}`" :value="port.name" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">目的港</label>
                <el-select v-model="diaryForm.arrivalPort" placeholder="目的港" size="small" filterable>
                  <el-option v-for="port in ports" :key="'arr-' + port.id" :label="`${port.name}${port.enName ? ` (${port.enName})` : ''}`" :value="port.name" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">出发日期时间</label>
                <el-date-picker
                  v-model="diaryForm.departureTime"
                  type="datetime"
                  placeholder="选择时间"
                  size="small"
                  style="width: 100%"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DD HH:mm:ss"
                />
              </div>
              <div class="info-group">
                <label class="info-label">是否放海港区</label>
                <el-select v-model="diaryForm.isFreePortZone" placeholder="请选择" size="small">
                  <el-option label="是" value="true" />
                  <el-option label="否" value="false" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">是否战区</label>
                <el-select v-model="diaryForm.isWarZone" placeholder="请选择" size="small">
                  <el-option label="是" value="true" />
                  <el-option label="否" value="false" />
                </el-select>
              </div>
            </div>
            <div class="info-row mt-2">
              <div class="info-group">
                <label class="info-label">时区</label>
                <el-select v-model="diaryForm.timezone" placeholder="时区" size="small">
                  <el-option label="UTC+0 格林威治" value="UTC+0" />
                  <el-option label="UTC+8 北京时间" value="UTC+8" />
                  <el-option label="UTC+9 东京时间" value="UTC+9" />
                  <el-option label="UTC+1 欧洲中部" value="UTC+1" />
                  <el-option label="UTC-5 纽约时间" value="UTC-5" />
                  <el-option label="UTC+5:30 印度时间" value="UTC+5:30" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">天气</label>
                <el-select v-model="diaryForm.weather" placeholder="天气" size="small">
                  <el-option label="晴" value="晴" />
                  <el-option label="多云" value="多云" />
                  <el-option label="阴" value="阴" />
                  <el-option label="小雨" value="小雨" />
                  <el-option label="中雨" value="中雨" />
                  <el-option label="大雨" value="大雨" />
                  <el-option label="暴雨" value="暴雨" />
                  <el-option label="雾" value="雾" />
                  <el-option label="雪" value="雪" />
                  <el-option label="雷阵雨" value="雷阵雨" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">海况</label>
                <el-select v-model="diaryForm.seaCondition" placeholder="海况" size="small">
                  <el-option label="平静" value="平静" />
                  <el-option label="轻浪" value="轻浪" />
                  <el-option label="中浪" value="中浪" />
                  <el-option label="大浪" value="大浪" />
                  <el-option label="巨浪" value="巨浪" />
                  <el-option label="狂浪" value="狂浪" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">今日动态</label>
                <el-select v-model="diaryForm.dynamicStatus" placeholder="动态" size="small">
                  <el-option label="航行中" value="航行中" />
                  <el-option label="靠泊中" value="靠泊中" />
                  <el-option label="锚泊中" value="锚泊中" />
                  <el-option label="在港" value="在港" />
                  <el-option label="修船" value="修船" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">船舶位置</label>
                <el-input v-model="diaryForm.shipPosition" placeholder="经纬度位置" size="small" />
              </div>
            </div>
          </div>
        </template>

        <!-- 非政委表单 -->
        <template v-else>
          <div class="info-bar">
            <div class="info-row">
              <div class="info-group">
                <label class="info-label">天气</label>
                <el-select v-model="diaryForm.weather" placeholder="天气" size="small">
                  <el-option label="☀ 晴" value="晴" />
                  <el-option label="☁ 多云" value="多云" />
                  <el-option label="☂ 阴" value="阴" />
                  <el-option label="🌦 小雨" value="小雨" />
                  <el-option label="🌧 中雨" value="中雨" />
                  <el-option label="🌧 大雨" value="大雨" />
                  <el-option label="🌧 暴雨" value="暴雨" />
                  <el-option label="🌫 雾" value="雾" />
                  <el-option label="❄ 雪" value="雪" />
                  <el-option label="⛈ 雷阵雨" value="雷阵雨" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">今日动态</label>
                <el-select v-model="diaryForm.dynamicStatus" placeholder="今日动态" size="small">
                  <el-option label="在公司" value="在公司" />
                  <el-option label="出差访船" value="出差访船" />
                  <el-option label="出差路上" value="出差路上" />
                  <el-option label="培训" value="培训" />
                  <el-option label="开会" value="开会" />
                  <el-option label="休假" value="休假" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">船舶</label>
                <div v-if="detectedShipName" class="ship-name-badge" title="自动识别船舶">
                  <el-tag type="primary" size="small" effect="light">🚢 {{ detectedShipName }}</el-tag>
                </div>
                <div v-else class="ship-name-hint text-xs text-gray-400">
                  输入船名将自动识别
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 日记编辑器（兼容模式：纯文本大框） -->
        <div class="diary-editor">
          <el-input v-model="diaryForm.content" type="textarea" :rows="10" placeholder="记录今天的工作内容（兼容传统模式，下方为新式「条目化记录」）..." />
        </div>

        <!-- 条目化块编辑器（日记 + 待办 + 备忘 混排） -->
        <div v-if="currentDiaryId > 0" class="blocks-section">
          <div class="section-header blocks-header">
            <span class="section-title">📌 条目化记录（日记/待办/备忘/图片/文件/链接混排，右键切换类型）</span>
            <el-tag size="small" type="info">回车换行 · 拖拽排序 · AI 自动识别船名并流转</el-tag>
          </div>
          <DiaryBlockEditor
            ref="blockEditorRef"
            :diary-id="currentDiaryId"
            :api="api"
          />
        </div>
        <el-alert
          v-else
          type="info"
          :closable="false"
          show-icon
          title="提示：先保存日记，即可开启条目化记录（待办、备忘、图片、文件等）"
          class="blocks-empty-tip"
        />

        <!-- 保存按钮 -->
        <div class="diary-actions">
          <el-button type="primary" @click="saveDiary" :loading="diarySaving">保存日记</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import DiaryBlockEditor from '~/components/DiaryBlockEditor.vue'
import type DiaryBlockEditorComp from '~/components/DiaryBlockEditor.vue'
import { ElMessage } from 'element-plus'
import type { Schedule, Ship } from '~/types'
import { useLunar } from '~/composables/useLunar'
import ViewSwitcher from '~/components/ViewSwitcher.vue'

definePageMeta({
  middleware: ['auth'],
})

const pageHead = computed(() => ({
  title: `${authStore.diaryTypeName} - 熊猫笔记`,
}))

useHead(pageHead)

const api = useApi()
const authStore = useAuthStore()
const { getLunarDate } = useLunar()

const selectedDate = ref(new Date())
const tempDate = ref(new Date())
const showDatePicker = ref(false)
const calendarDate = ref(new Date())
const calendarCollapsed = ref(false)
const diaryDates = ref<Set<string>>(new Set())

const schedules = ref<Schedule[]>([])
const ships = ref<Ship[]>([])
const ports = ref<{ id: number; name: string }[]>([])
const availableShips = ref<any[]>([])
const currentShipId = ref<number | null>(null)
const currentView = ref<'ship' | 'personal'>('ship')

const viewSwitcherRef = ref<InstanceType<typeof ViewSwitcher> | null>(null)

const diaryForm = ref({
  content: '',
  relatedScheduleIds: [] as number[],
  weather: '',
  seaCondition: '',
  dynamicStatus: '',
  departurePort: '',
  arrivalPort: '',
  departureTime: '',
  isFreePortZone: '',
  isWarZone: '',
  timezone: '',
  shipPosition: '',
  shipName: '',
})
const diarySaving = ref(false)
const currentDiaryId = ref<number | null>(null)
const blockEditorRef = ref<InstanceType<typeof DiaryBlockEditorComp> | null>(null)

const isPoliticalInstructor = computed(() => {
  return authStore.userRole === 'ship_political_instructor'
})

const diaryTitle = computed(() => {
  return authStore.diaryTypeName
})

const selectedDateLabel = computed(() => {
  const d = selectedDate.value
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
})

const selectedDateStr = computed(() => {
  return formatDate(selectedDate.value)
})

const lunarInfo = computed(() => {
  try {
    const lunar = getLunarDate(selectedDate.value)
    return {
      lunar: lunar?.lunar || '',
      holiday: lunar?.holiday || '',
    }
  } catch {
    return { lunar: '', holiday: '' }
  }
})

const detectedShipName = computed(() => {
  const content = diaryForm.value.content || ''
  if (!content || !ships.value || ships.value.length === 0) {
    return diaryForm.value.shipName || ''
  }
  for (const ship of ships.value) {
    if (ship.cnShipName && content.includes(ship.cnShipName)) {
      return ship.cnShipName
    }
    if (ship.enShipName && content.toLowerCase().includes(ship.enShipName.toLowerCase())) {
      return ship.cnShipName
    }
  }
  return diaryForm.value.shipName || ''
})

const daySchedules = computed(() => {
  const dateStr = formatDate(selectedDate.value)
  return schedules.value.filter(s => {
    const sDate = formatDate(new Date(s.recordDate))
    return sDate === dateStr
  })
})

const availableSchedules = computed(() => {
  return daySchedules.value.filter(s => s.finishStatus === 'completed')
})

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const prevDay = () => {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d
}

const nextDay = () => {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d
}

const goToday = () => {
  selectedDate.value = new Date()
}

const confirmDate = () => {
  selectedDate.value = tempDate.value
  showDatePicker.value = false
}

const isScheduleSelected = (schedule: any) => {
  const id = schedule.id || schedule.scheduleId
  return diaryForm.value.relatedScheduleIds.includes(id)
}

const toggleScheduleRelation = (schedule: any) => {
  const id = schedule.id || schedule.scheduleId
  const index = diaryForm.value.relatedScheduleIds.indexOf(id)
  if (index > -1) {
    diaryForm.value.relatedScheduleIds.splice(index, 1)
  } else {
    diaryForm.value.relatedScheduleIds.push(id)
  }
}

const selectAllSchedules = () => {
  diaryForm.value.relatedScheduleIds = availableSchedules.value.map(s => s.id).filter(Boolean) as number[]
}

const isValidDateStr = (val: any) => {
  if (!val) return false
  if (typeof val !== 'string') return false
  const d = new Date(val)
  return !isNaN(d.getTime())
}

const saveDiary = async () => {
  if (!diaryForm.value.content.trim() && diaryForm.value.relatedScheduleIds.length === 0) {
    ElMessage.warning('请输入日记内容或关联日程')
    return
  }

  diarySaving.value = true
  try {
    const content = diaryForm.value.content || ''
    // 自动从内容识别船名（优先使用用户手动输入的）
    const autoShipName = detectedShipName.value || ''
    const finalShipName = diaryForm.value.shipName || autoShipName

    const diaryData: any = {
      content,
      relatedScheduleIds: diaryForm.value.relatedScheduleIds || [],
    }
    // 仅在创建时传 date，更新时不传（避免 UpdateDiaryDto 无 date 字段导致 whitelist 剥离）
    if (!currentDiaryId.value) {
      diaryData.date = selectedDateStr.value
    }
    // 仅当有有效值时才传，避免 undefined 或 Invalid Date
    if (diaryForm.value.weather) diaryData.weather = diaryForm.value.weather
    if (diaryForm.value.seaCondition) diaryData.seaCondition = diaryForm.value.seaCondition
    if (diaryForm.value.dynamicStatus) diaryData.dynamicStatus = diaryForm.value.dynamicStatus
    if (diaryForm.value.departurePort) diaryData.departurePort = diaryForm.value.departurePort
    if (diaryForm.value.arrivalPort) diaryData.arrivalPort = diaryForm.value.arrivalPort
    if (isValidDateStr(diaryForm.value.departureTime)) diaryData.departureTime = diaryForm.value.departureTime
    if (diaryForm.value.timezone) diaryData.timezone = diaryForm.value.timezone
    if (diaryForm.value.shipPosition) diaryData.shipPosition = diaryForm.value.shipPosition
    if (finalShipName) diaryData.shipName = finalShipName
    // 布尔字段：仅当有明确值（true/false 非空字符串）时才传
    if (diaryForm.value.isFreePortZone === 'true' || diaryForm.value.isFreePortZone === 'false') {
      diaryData.isFreePortZone = diaryForm.value.isFreePortZone === 'true'
    }
    if (diaryForm.value.isWarZone === 'true' || diaryForm.value.isWarZone === 'false') {
      diaryData.isWarZone = diaryForm.value.isWarZone === 'true'
    }

    let result: any
    if (currentDiaryId.value) {
      result = await api.diary.update(currentDiaryId.value, diaryData)
      ElMessage.success('日记已更新')
    } else {
      result = await api.diary.create(diaryData)
      if (result?.id !== undefined) {
        currentDiaryId.value = result.id
      }
      ElMessage.success('日记已保存')
    }
    // 保存成功后刷新当日日记、日历标记，和条目化块编辑器
    await loadDiary()
    await loadDiaryDates()
    if (currentDiaryId.value) {
      await nextTick()
      blockEditorRef.value?.loadBlocks()
    }
  } catch (error: any) {
    // 归一化错误消息：NestJS ValidationPipe 常返回 message: string[]，避免传给 ElMessage 导致 startsWith 报错
    const pickMsg = (raw: any): string => {
      if (raw === undefined || raw === null) return '';
      if (typeof raw === 'string') return raw;
      if (Array.isArray(raw)) return raw.map(pickMsg).filter(Boolean).join('；');
      if (typeof raw === 'object') {
        if (raw.message) return pickMsg(raw.message);
        if (raw.constraints) return Object.values(raw.constraints).map(String).join('；');
        try { return JSON.stringify(raw); } catch { return String(raw); }
      }
      try { return String(raw); } catch { return ''; }
    };
    const msg = pickMsg(error?.data?.message || error?.response?._data?.message) || pickMsg(error?.message) || '保存失败';
    console.error('[saveDiary] 保存失败', error, { diaryData: error?.config?.data });
    ElMessage.error(msg);
  } finally {
    diarySaving.value = false
  }
}

const loadSchedules = async () => {
  try {
    const response = await api.get('/schedule', {
      params: {
        startDate: selectedDateStr.value,
        endDate: selectedDateStr.value,
      },
    })
    schedules.value = response.data || response
  } catch (error) {
    console.error('加载日程失败', error)
  }
}

const loadDiary = async () => {
  try {
    const diaryResp = await api.diary.getByDate(selectedDateStr.value)
    // 兼容兜底：如果缓存策略异常返回了数组，从数组中匹配日期
    let diary: any = diaryResp
    if (Array.isArray(diaryResp)) {
      const targetDate = new Date(selectedDateStr.value)
      targetDate.setHours(0, 0, 0, 0)
      const targetTs = targetDate.getTime()
      diary = diaryResp.find((item: any) => {
        if (!item.date) return false
        const d = new Date(item.date)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === targetTs
      }) || null
    }
    if (diary) {
      currentDiaryId.value = diary.id
      diaryForm.value = {
        content: diary.content || '',
        relatedScheduleIds: diary.relatedScheduleIds || [],
        weather: diary.weather || '',
        seaCondition: diary.seaCondition || '',
        dynamicStatus: diary.dynamicStatus || '',
        departurePort: diary.departurePort || '',
        arrivalPort: diary.arrivalPort || '',
        departureTime: diary.departureTime || '',
        isFreePortZone: diary.isFreePortZone ? 'true' : 'false',
        isWarZone: diary.isWarZone ? 'true' : 'false',
        timezone: diary.timezone || '',
        shipPosition: diary.shipPosition || '',
        shipName: diary.shipName || '',
      }
    } else {
      currentDiaryId.value = null
      diaryForm.value = {
        content: '',
        relatedScheduleIds: [],
        weather: '',
        seaCondition: '',
        dynamicStatus: '',
        departurePort: '',
        arrivalPort: '',
        departureTime: '',
        isFreePortZone: '',
        isWarZone: '',
        timezone: '',
        shipPosition: '',
        shipName: '',
      }
    }
    // 加载条目化块编辑器
    if (currentDiaryId.value) {
      await nextTick()
      blockEditorRef.value?.loadBlocks()
    }
  } catch (error) {
    currentDiaryId.value = null
    diaryForm.value = {
      content: '',
      relatedScheduleIds: [],
      weather: '',
      seaCondition: '',
      dynamicStatus: '',
      departurePort: '',
      arrivalPort: '',
      departureTime: '',
      isFreePortZone: '',
      isWarZone: '',
      timezone: '',
      shipPosition: '',
      shipName: '',
    }
  }
}

const loadShips = async () => {
  try {
    ships.value = await api.ships.getAll()
  } catch {
    ships.value = []
  }
}

const loadPorts = async () => {
  try {
    ports.value = await api.port.getAll()
  } catch {
    ports.value = []
  }
}

const loadAvailableShips = async () => {
  try {
    const permission = await api.diary.getPermissionInfo()
    const historyShipIds = permission.historyShipIds || []
    const currentShipIdVal = permission.currentShipId
    
    if (currentShipIdVal) {
      currentShipId.value = currentShipIdVal
    }
    
    const allShips = await api.ships.getAll()
    const shipSet = new Set([currentShipIdVal, ...historyShipIds])
    availableShips.value = allShips.filter(s => shipSet.has(s.id))
    
    if (availableShips.value.length === 0) {
      availableShips.value = allShips.slice(0, 10)
    }
    
    await nextTick()
    if (viewSwitcherRef.value && currentShipId.value) {
      viewSwitcherRef.value.setSelectedShip(currentShipId.value)
    }
  } catch (e) {
    console.error('加载可用船舶失败', e)
    availableShips.value = ships.value
  }
}

const handleViewChange = async (data: { view: string; shipId: number | null }) => {
  currentView.value = data.view as 'ship' | 'personal'
  currentShipId.value = data.shipId
  await loadDiary()
  await loadDiaryDates()
}

const handleShipChange = (shipId: number) => {
  currentShipId.value = shipId
}

// ====== 迷你日历相关 ======

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']
const todoDates = ref<Set<string>>(new Set())

const calendarYearMonth = computed(() => {
  const y = calendarDate.value.getFullYear()
  const m = calendarDate.value.getMonth() + 1
  return `${y}年${m}月`
})

interface MiniCalDay {
  dateStr: string
  dayNum: number
  inCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  hasDiary: boolean
  hasTodo: boolean
}

const miniCalendarDays = computed<MiniCalDay[]>(() => {
  const year = calendarDate.value.getFullYear()
  const month = calendarDate.value.getMonth()
  const todayStr = formatDate(new Date())
  const selectedStr = formatDate(selectedDate.value)

  // 当月第一天是星期几（0=周日，转为周一为首）
  const firstDay = new Date(year, month, 1)
  let firstWeekday = firstDay.getDay() // 0=周日
  firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1 // 转为 0=周一

  // 日历起始日期（可能包含上月末尾几天）
  const startDate = new Date(year, month, 1 - firstWeekday)

  const days: MiniCalDay[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const ds = formatDate(d)
    days.push({
      dateStr: ds,
      dayNum: d.getDate(),
      inCurrentMonth: d.getMonth() === month,
      isToday: ds === todayStr,
      isSelected: ds === selectedStr,
      hasDiary: diaryDates.value.has(ds),
      hasTodo: todoDates.value.has(ds),
    })
  }
  return days
})

const jumpToDate = (dateStr: string) => {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  selectedDate.value = d
  calendarDate.value = new Date(d)
}

const prevMonth = () => {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() - 1)
  calendarDate.value = d
}

const nextMonth = () => {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + 1)
  calendarDate.value = d
}

const loadDiaryDates = async () => {
  try {
    const year = calendarDate.value.getFullYear()
    const month = calendarDate.value.getMonth()
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    let diaries: any[] = []
    if (currentView.value === 'ship' && currentShipId.value) {
      const result = await api.diary.getByShipView(currentShipId.value)
      diaries = Array.isArray(result) ? result : []
    } else {
      const result = await api.diary.getAll(startDate, endDate)
      diaries = Array.isArray(result) ? result : []
    }

    const dates = new Set<string>()
    diaries.forEach((d: any) => {
      if (d.date) {
        const dDate = new Date(d.date)
        dDate.setHours(0, 0, 0, 0)
        dates.add(formatDate(dDate))
      }
    })
    diaryDates.value = dates
  } catch (error) {
    console.error('加载日记日期失败', error)
  }
}

// 加载当月有待办（未完成日程）的日期
const loadTodoDates = async () => {
  try {
    const year = calendarDate.value.getFullYear()
    const month = calendarDate.value.getMonth()
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    // 查询当月日程，筛选未完成项
    const result = await api.schedules.getAll(startDate, endDate)
    const scheds = Array.isArray(result) ? result : []
    const dates = new Set<string>()
    scheds.forEach((s: any) => {
      if (s.recordDate && s.finishStatus !== 'completed') {
        const d = new Date(s.recordDate)
        d.setHours(0, 0, 0, 0)
        dates.add(formatDate(d))
      }
    })
    todoDates.value = dates
  } catch (error) {
    console.error('加载待办日期失败', error)
  }
}

watch(selectedDate, () => {
  calendarDate.value = new Date(selectedDate.value)
  loadSchedules()
  loadDiary()
})

watch(calendarDate, (newVal, oldVal) => {
  const newMonth = newVal.getMonth()
  const oldMonth = oldVal.getMonth()
  const newYear = newVal.getFullYear()
  const oldYear = oldVal.getFullYear()
  if (newMonth !== oldMonth || newYear !== oldYear) {
    loadDiaryDates()
    loadTodoDates()
  }
})

onMounted(async () => {
  await Promise.all([
    loadSchedules(),
    loadDiary(),
    loadShips(),
    loadPorts(),
  ])
  if (isPoliticalInstructor.value) {
    await loadAvailableShips()
  }
  await Promise.all([
    loadDiaryDates(),
    loadTodoDates(),
  ])
})
</script>

<style scoped>
.work-log-page {
  padding: 16px;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

.calendar-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.calendar-header:hover {
  background: #f5f7fa;
}

.calendar-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cal-nav-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #606266;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.cal-nav-btn:hover {
  background: #ecf0f1;
  color: #409eff;
}

.calendar-toggle-icon {
  color: #909399;
  transition: transform 0.2s;
  margin-left: 4px;
}

.calendar-collapsed .calendar-toggle-icon {
  transform: rotate(180deg);
}

.calendar-body {
  padding: 8px 12px 12px;
}

/* 迷你日历星期表头 */
.mini-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}

.mini-cal-weekdays span {
  text-align: center;
  font-size: 11px;
  color: #909399;
  font-weight: 500;
  padding: 2px 0;
}

/* 迷你日历日期网格 */
.mini-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.mini-cal-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s;
  min-height: 32px;
}

.mini-cal-day:hover {
  background: #ecf5ff;
}

.mini-cal-day.is-other-month {
  opacity: 0.35;
}

.mini-cal-day.is-today {
  background: #f0f9ff;
  border: 1px solid #409eff;
}

.mini-cal-day.is-selected {
  background: #409eff;
}

.mini-cal-day.is-selected .mini-cal-daynum {
  color: white;
  font-weight: 700;
}

.mini-cal-daynum {
  font-size: 13px;
  color: #303133;
  line-height: 1.2;
}

.mini-cal-day.has-diary .mini-cal-daynum {
  color: #67c23a;
  font-weight: 600;
}

.mini-cal-day.has-todo .mini-cal-daynum {
  color: #f56c6c;
  font-weight: 600;
}

/* 日期下方的点标记 */
.mini-cal-dots {
  display: flex;
  gap: 3px;
  margin-top: 1px;
  height: 4px;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

.dot-diary {
  background: #67c23a;
}

.dot-todo {
  background: #f56c6c;
}

/* 图例 */
.mini-cal-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #909399;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 16px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.date-display {
  flex: 1;
  text-align: center;
  cursor: pointer;
}

.date-main {
  font-size: 20px;
  font-weight: 600;
}

.date-sub {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 2px;
}

.today-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.today-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.diary-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #f8f9fa;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.diary-content {
  padding: 16px;
}

.info-bar {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.info-group {
  flex: 1;
  min-width: 120px;
}

.info-label {
  display: block;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.ship-select {
  width: 140px;
}

.relation-section {
  margin-bottom: 16px;
}

.relation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
}

.empty-text-small {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 12px;
}

.relation-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.relation-item:hover {
  border-color: #409eff;
}

.relation-item.is-selected {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.check-icon {
  font-size: 14px;
}

.relation-summary {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.diary-editor {
  margin-bottom: 16px;
}

.diary-editor .el-textarea__inner {
  border-radius: 8px;
}

.blocks-section {
  margin-bottom: 16px;
}

.blocks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.blocks-empty-tip {
  margin: 8px 0 16px;
}

.diary-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .date-selector {
    padding: 12px;
  }

  .date-main {
    font-size: 18px;
  }

  .info-row {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .info-group {
    flex: 1 1 28%;
    min-width: 0;
  }

  .relation-list {
    flex-direction: column;
  }

  .relation-item {
    width: 100%;
  }

  .work-log-page {
    /* 给手机底部固定导航栏留足够空间，避免保存按钮被遮挡 */
    padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
  }

  .diary-actions {
    padding-bottom: 12px;
  }

  .mini-cal-day {
    min-height: 28px;
  }

  .mini-cal-daynum {
    font-size: 12px;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .work-log-page {
    padding: 12px;
    max-width: 100%;
    /* 给平板竖屏底部固定导航栏留足够空间 */
    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px));
  }

  .date-selector {
    padding: 12px 16px;
    gap: 10px;
  }

  .date-main {
    font-size: 18px;
  }

  .date-sub {
    font-size: 12px;
  }

  .diary-content {
    padding: 12px;
  }

  .info-bar {
    padding: 12px;
    margin-bottom: 12px;
  }

  .info-row {
    gap: 10px;
  }

  .info-group {
    flex: 1;
    min-width: 150px;
  }

  .diary-actions {
    padding-bottom: 12px;
  }
}
</style>
