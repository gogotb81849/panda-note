<template>
  <div class="schedule-page">
    <!-- 左侧导航栏（视图切换 + 快捷操作 + 重要日列表） -->
    <aside class="left-aside">
      <!-- 今日卡片 -->
      <div class="today-card">
        <div class="today-card-date">{{ todayLabel }}</div>
        <div class="today-card-lunar">{{ todayLunar }}</div>
        <div class="today-card-ganzhi">{{ todayGanZhi }}（{{ todayAnimal }}年）</div>
        <div v-if="todayHoliday" class="today-card-holiday">{{ todayHoliday }}</div>
      </div>

      <!-- 视图切换 -->
      <div class="aside-section">
        <div class="aside-section-title">视图</div>
        <el-radio-group v-model="viewType" size="small" class="view-switch-group">
          <el-radio-button label="year">年</el-radio-button>
          <el-radio-button label="month">月</el-radio-button>
          <el-radio-button label="week">周</el-radio-button>
          <el-radio-button label="day">日</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 设置 -->
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
          <el-checkbox v-model="settings.showTodayWatermark" size="small">今日水印</el-checkbox>
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
      <div class="aside-section">
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
    </aside>

    <!-- 中部主体（视图切换 + 工具栏 + 日历） -->
    <main class="main-body">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button size="small" @click="prevPeriod">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-button size="small" @click="goToToday">今天</el-button>
          <el-button size="small" @click="nextPeriod">
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <span class="current-date">{{ currentDateLabel }}</span>
        </div>

        <div class="toolbar-right">
          <el-select
            v-model="selectedShipId"
            placeholder="选择船舶"
            clearable
            size="small"
            style="width: 180px"
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
          <el-button type="primary" size="small" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            新建日程
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
          @date-click="handleDateClick"
          @schedule-click="handleScheduleClick"
        />
        <WeekView
          v-else-if="viewType === 'week'"
          :schedules="filteredSchedules"
          :date="currentDate"
          @date-click="handleDateClick"
          @schedule-click="handleScheduleClick"
        />
        <DayView
          v-else
          :schedules="filteredSchedules"
          :date="currentDate"
          @schedule-click="handleScheduleClick"
        />
      </div>
    </main>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ArrowLeft, ArrowRight, Setting, PieChart, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Schedule, Ship, DictCategory } from '~/types'
import { useScheduleShortcuts } from '~/composables/useScheduleShortcuts'
import { useLunar } from '~/composables/useLunar'
import HuaWeiMonthView from '~/components/HuaWeiMonthView.vue'
import HuaWeiYearView from '~/components/HuaWeiYearView.vue'
import HuaWeiCreateDialog from '~/components/HuaWeiCreateDialog.vue'
import WeekView from '~/components/WeekView.vue'
import DayView from '~/components/DayView.vue'

definePageMeta({
  middleware: ['auth'],
})

const router = useRouter()
const api = useApi()
const { getLunarInfo } = useLunar()

type ViewType = 'year' | 'month' | 'week' | 'day'

const viewType = ref<ViewType>('month')
const currentDate = ref(new Date())
const activeQuadrantFilter = ref('all')
const selectedShipId = ref<number | null>(null)

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

// ===== 今日卡片 =====
const todayLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
})
const todayLunarInfo = computed(() => getLunarInfo(new Date()))
const todayLunar = computed(() => todayLunarInfo.value.lunar)
const todayGanZhi = computed(() => todayLunarInfo.value.ganZhi)
const todayAnimal = computed(() => todayLunarInfo.value.animal)
const todayHoliday = computed(() => todayLunarInfo.value.holiday || todayLunarInfo.value.solarTerm || '')

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

const goToToday = () => { currentDate.value = new Date() }

// ===== 事件处理 =====
const handleDateClick = (dateStr: string) => {
  dialogDefaultDate.value = dateStr
  isEdit.value = false
  editingSchedule.value = null
  dialogVisible.value = true
}

const handleScheduleClick = (schedule: Schedule) => {
  isEdit.value = true
  editingSchedule.value = schedule
  dialogDefaultDate.value = schedule.recordDate?.split('T')[0] || ''
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
  dialogDefaultDate.value = currentDate.value.toISOString().split('T')[0]
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
    recordDate: currentDate.value.toISOString().split('T')[0],
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
    date: currentDate.value.toISOString().split('T')[0],
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
    ElMessage.error('添加失败：' + (err?.message || ''))
  } finally {
    importantSaving.value = false
  }
}

const jumpToImportantDate = (item: any) => {
  const d = new Date(item.date)
  currentDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  viewType.value = 'month'
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
    // 设置保存失败不阻断（接口可能不存在记录），仅本地保留
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
    ElMessage.error('加载数据失败')
  }
}

const loadSchedules = async () => {
  try {
    const data = await api.schedules.getAll()
    schedules.value = data
  } catch (err) {
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
    // 拉取近一年+未来一年的重要日（用于左侧列表显示）
    const start = new Date()
    start.setFullYear(start.getFullYear() - 1)
    const end = new Date()
    end.setFullYear(end.getFullYear() + 1)
    const data = await api.importantDates.getAll(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
    )
    importantDates.value = Array.isArray(data) ? data : []
  } catch {
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
  } catch {
    // 未配置时使用默认值
  }
}

useScheduleShortcuts({
  createSchedule: () => openCreateDialog(),
  prevPeriod: () => prevPeriod(),
  nextPeriod: () => nextPeriod(),
  goToToday: () => goToToday(),
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
  grid-template-columns: 240px 1fr;
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
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
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

.aside-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.view-switch-group {
  display: flex;
  width: 100%;
}

.view-switch-group :deep(.el-radio-button) {
  flex: 1;
}

.view-switch-group :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 6px 0;
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

/* 主体 */
.main-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-date {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  min-width: 120px;
  text-align: center;
  margin-left: 4px;
}

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

/* 响应式：窄屏隐藏左侧栏 */
@media (max-width: 1024px) {
  .schedule-page {
    grid-template-columns: 1fr;
  }
  .left-aside {
    order: 2;
  }
}
</style>
