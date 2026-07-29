<template>
  <div class="schedule-page">
    <el-tabs v-model="activeTab" class="schedule-tabs">
      <el-tab-pane label="日程管理" name="schedule">
        <div class="schedule-content">
          <!-- 批量创建对话框 -->
          <el-dialog v-model="bulkCreateVisible" title="批量创建标准任务" :width="taskTemplates.length > 0 ? '640px' : '520px'">
            <!-- 任务库为空时的引导提示 -->
            <div v-if="taskTemplates.length === 0" class="empty-guide">
              <div class="empty-guide-icon">📋</div>
              <div class="empty-guide-title">暂无标准任务模板</div>
              <div class="empty-guide-desc">
                请先在【分类与任务库】中定义任务模板，或批量导入常用任务。<br>
                定义后可在此一键勾选创建当日任务，大幅减少重复操作。
              </div>
              <div class="empty-guide-actions">
                <el-button type="primary" @click="goToDictPage">
                  <el-icon><Setting /></el-icon>
                  前往分类与任务库
                </el-button>
                <el-button @click="bulkCreateVisible = false">取消</el-button>
              </div>
            </div>
            <!-- 有任务库时显示正常勾选界面 -->
            <template v-else>
              <div style="margin-bottom: 12px; padding: 8px 12px; background: #ecf5ff; border-radius: 4px; font-size: 12px; color: var(--color-primary);">
                📋 已从标准任务库加载 {{ taskTemplates.length }} 个任务模板，勾选后可批量创建。如需调整分类或内容，请到【分类与任务库】管理页。
              </div>
              <div class="bulk-create-list">
                <div v-for="(item, idx) in bulkCreateItems" :key="idx" class="bulk-create-row" @click="toggleBulkItem(idx)">
                  <el-checkbox :model-value="item.selected" @change="toggleBulkItem(idx)" />
                  <el-tag size="small" type="primary" style="margin-left: 8px;">{{ item.firstType }}</el-tag>
                  <el-tag size="small" type="success" style="margin-left: 4px;">{{ item.secondType || '未分类' }}</el-tag>
                  <el-tag v-if="item.priority && item.priority !== 'normal'" size="small" type="warning" style="margin-left: 4px;">
                    {{ item.priority === 'high' ? '高' : item.priority === 'urgent' ? '紧急' : '普通' }}
                  </el-tag>
                  <span v-else style="margin-left: 8px; flex: 1; color: var(--color-gray-600); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.eventDetail || '（无描述）' }}
                  </span>
                </div>
              </div>
            </template>
            <template #footer v-if="taskTemplates.length > 0">
              <el-button @click="bulkCreateVisible = false">取消</el-button>
              <el-button type="primary" :loading="saving" @click="confirmBulkCreate">确认创建</el-button>
            </template>
          </el-dialog>

          <div class="ship-selector-bar">
            <el-select
              v-model="selectedShipId"
              placeholder="选择船舶查看信息"
              clearable
              size="small"
              style="width: 220px"
            >
              <el-option
                v-for="ship in ships"
                :key="ship.id"
                :label="ship.cnShipName"
                :value="ship.id"
              />
            </el-select>
          </div>
          <div class="toolbar">
            <div class="toolbar-left">
              <el-radio-group v-model="viewType" size="small">
                <el-radio-button label="month">月视图</el-radio-button>
                <el-radio-button label="week">周视图</el-radio-button>
                <el-radio-button label="day">日视图</el-radio-button>
              </el-radio-group>
              
              <div class="date-nav">
                <el-button size="small" @click="prevPeriod">
                  <el-icon><ArrowLeft /></el-icon>
                </el-button>
                <el-button size="small" @click="goToToday">今天</el-button>
                <el-button size="small" @click="nextPeriod">
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
                <span class="current-date">{{ currentDateLabel }}</span>
              </div>
            </div>
            
            <div class="toolbar-right">
              <el-button type="info" size="small" @click="goToDashboard">
                <el-icon><PieChart /></el-icon>
                查看看板
              </el-button>
              <el-button type="info" size="small" @click="goToDiary">
                <el-icon><Edit /></el-icon>
                写日记
              </el-button>
              <el-button type="success" size="small" @click="openBulkCreate">
                <el-icon><Plus /></el-icon>
                批量创建标准任务
              </el-button>
              <el-button type="primary" size="small" @click="openCreateDialog">
                <el-icon><Plus /></el-icon>
                添加日程
              </el-button>
            </div>
          </div>

          <div class="view-container">
            <MonthView 
              v-if="viewType === 'month'" 
              :schedules="filteredSchedules" 
              :date="currentDate"
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

          <div class="quadrant-filter">
            <div class="quadrant-label">四象限：</div>
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
        </div>
      </el-tab-pane>

      <el-tab-pane label="高级查询" name="search">
        <div class="search-entry">
          <div class="search-entry-card">
            <div class="search-entry-left">
              <h3>🔍 高级查询与导出</h3>
              <p>支持按船舶、分类、状态、优先级、日期范围以及关键词（可高亮匹配内容）进行组合筛选，并可一键导出 CSV。</p>
            </div>
            <NuxtLink to="/schedule-search" class="search-entry-btn">
              进入高级查询
            </NuxtLink>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建/编辑日程对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑日程' : '新建日程'"
      width="800px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="登记日期" required>
              <el-date-picker
                v-model="form.recordDate"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属船舶">
              <el-select v-model="form.shipId" placeholder="选择船舶" style="width: 100%">
                <el-option
                  v-for="ship in ships"
                  :key="ship.id"
                  :label="ship.cnShipName"
                  :value="ship.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="一级分类" required>
              <el-select v-model="form.firstType" placeholder="选择分类" style="width: 100%" @change="onFormFirstTypeChange">
                <el-option
                  v-for="type in firstTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="二级分类" required>
              <el-select v-model="form.secondType" placeholder="选择分类" style="width: 100%" :disabled="!form.firstType">
                <el-option
                  v-for="type in filteredFormSecondTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
                <el-option label="🔴 重要紧急" value="urgent_important" />
                <el-option label="🟡 重要不紧急" value="important" />
                <el-option label="🔵 紧急不重要" value="urgent" />
                <el-option label="🟢 不紧急不重要" value="normal" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.finishStatus" placeholder="选择状态" style="width: 100%">
                <el-option label="待处理" value="pending" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="事件详情">
          <el-input
            v-model="form.eventDetail"
            type="textarea"
            :rows="6"
            placeholder="请输入事件详情..."
          />
        </el-form-item>
        <el-form-item label="AI 建议">
          <div style="width: 100%">
            <el-button 
              type="info" 
              size="small" 
              @click="getAICategorySuggestion" 
              :loading="aiSuggesting"
              :disabled="!form.eventDetail"
            >
              <el-icon><MagicStick /></el-icon>
              AI 智能分类建议
            </el-button>
            <div v-if="aiSuggestion" style="margin-top: 12px; padding: 12px; background: var(--color-gray-100); border-radius: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <span style="color: var(--color-gray-600); font-size: 14px;">AI 建议分类：</span>
                  <span style="color: var(--color-primary); font-weight: 600;">{{ aiSuggestion.categoryFirst }}</span>
                  <span style="color: var(--color-info);"> → </span>
                  <span style="color: var(--color-primary); font-weight: 600;">{{ aiSuggestion.categorySecond }}</span>
                  <span v-if="aiSuggestion.confidence" style="margin-left: 8px; color: var(--color-info); font-size: 12px;">
                    (置信度: {{ Math.round(aiSuggestion.confidence * 100) }}%)
                  </span>
                </div>
                <div>
                  <el-button type="primary" size="small" @click="applyAISuggestion">采用</el-button>
                  <el-button size="small" @click="aiSuggestion = null">忽略</el-button>
                </div>
              </div>
              <div v-if="aiSuggestion.reason" style="margin-top: 8px; color: var(--color-info); font-size: 12px;">
                💡 {{ aiSuggestion.reason }}
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Download, ArrowLeft, ArrowRight, Close, Setting, MagicStick } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Schedule, Ship, DictCategory, Priority } from '~/types'
import { useScheduleShortcuts } from '~/composables/useScheduleShortcuts'
import MonthView from '~/components/MonthView.vue'
import WeekView from '~/components/WeekView.vue'
import DayView from '~/components/DayView.vue'

definePageMeta({
  middleware: ['auth'],
})

const router = useRouter()
const api = useApi()

const activeTab = ref('schedule')
const viewType = ref<'month' | 'week' | 'day'>('month')
const currentDate = ref(new Date())
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const activeQuadrantFilter = ref('all')
const selectedShipId = ref<number | null>(null)

const selectedShipInfo = computed(() => {
  if (!selectedShipId.value) return null
  return ships.value.find(s => s.id === selectedShipId.value) || null
})

const shipScheduleCount = computed(() => {
  if (!selectedShipId.value) return 0
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return schedules.value.filter(s => {
    if (s.shipId !== selectedShipId.value) return false
    const d = new Date(s.recordDate)
    return d.getFullYear() === year && d.getMonth() === month
  }).length
})

const shipPendingCount = computed(() => {
  if (!selectedShipId.value) return 0
  return schedules.value.filter(s => 
    s.shipId === selectedShipId.value && 
    (s.finishStatus === 'pending' || s.finishStatus === 'in_progress')
  ).length
})

const shipCompletedCount = computed(() => {
  if (!selectedShipId.value) return 0
  return schedules.value.filter(s => 
    s.shipId === selectedShipId.value && s.finishStatus === 'completed'
  ).length
})

const schedules = ref<Schedule[]>([])
const ships = ref<Ship[]>([])
const firstTypes = ref<DictCategory[]>([])
const secondTypes = ref<DictCategory[]>([])
const dailyStats = ref<any[]>([])
const statsLoading = ref(false)
const bulkCreateVisible = ref(false)
const bulkCreateItems = ref<any[]>([])
const taskTemplates = ref<any[]>([])
const aiSuggesting = ref(false)
const aiSuggestion = ref<any>(null)

const form = ref({
  recordDate: '',
  shipId: undefined as number | undefined,
  firstType: '',
  secondType: '',
  priority: 'normal' as Priority,
  finishStatus: 'pending',
  startTime: '',
  endTime: '',
  eventDetail: '',
})



const filteredFormSecondTypes = computed(() => {
  if (!form.value.firstType) {
    return []
  }
  const firstTypeItem = firstTypes.value.find(ft => ft.categoryName === form.value.firstType)
  if (!firstTypeItem) {
    return []
  }
  return secondTypes.value.filter(st => st.parentId === firstTypeItem.id)
})

const filteredSchedules = computed(() => {
  let result = [...schedules.value]
  
  if (activeQuadrantFilter.value !== 'all') {
    result = result.filter(s => {
      switch (activeQuadrantFilter.value) {
        case 'urgent_important':
          return s.priority === 'urgent_important'
        case 'important':
          return s.priority === 'important'
        case 'urgent':
          return s.priority === 'urgent'
        case 'normal':
          return s.priority === 'normal' || s.priority === 'low'
        default:
          return true
      }
    })
  }
  
  return result
})

const currentDateLabel = computed(() => {
  const date = currentDate.value
  if (viewType.value === 'month') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`
  } else if (viewType.value === 'week') {
    return `${date.getFullYear()}年第${getWeekNumber(date)}周`
  } else {
    return formatDate(date.toISOString().split('T')[0])
  }
})

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const prevPeriod = () => {
  const date = currentDate.value
  if (viewType.value === 'month') {
    currentDate.value = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  } else if (viewType.value === 'week') {
    currentDate.value = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    currentDate.value = new Date(date.getTime() - 24 * 60 * 60 * 1000)
  }
}

const nextPeriod = () => {
  const date = currentDate.value
  if (viewType.value === 'month') {
    currentDate.value = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  } else if (viewType.value === 'week') {
    currentDate.value = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
  } else {
    currentDate.value = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  }
}

const goToToday = () => {
  currentDate.value = new Date()
}

const handleDateClick = (date: string) => {
  form.value.recordDate = date
  openCreateDialog()
}

const handleScheduleClick = (schedule: Schedule) => {
  openEditDialog(schedule)
}

const openCreateDialog = () => {
  isEdit.value = false
  editingId.value = null
  const today = new Date().toISOString().split('T')[0]
  form.value = {
    recordDate: today,
    shipId: undefined,
    firstType: '',
    secondType: '',
    priority: 'normal',
    finishStatus: 'pending',
    startTime: '',
    endTime: '',
    eventDetail: '',
  }
  dialogVisible.value = true
}

const openEditDialog = (schedule: Schedule) => {
  isEdit.value = true
  editingId.value = schedule.id
  form.value = {
    recordDate: schedule.recordDate.split('T')[0],
    shipId: schedule.shipId,
    firstType: schedule.firstType || '',
    secondType: schedule.secondType || '',
    priority: schedule.priority || 'normal',
    finishStatus: schedule.finishStatus || 'pending',
    startTime: formatDateTimeForDisplay(schedule.startTime),
    endTime: formatDateTimeForDisplay(schedule.endTime),
    eventDetail: schedule.eventDetail || '',
  }
  dialogVisible.value = true
}

// 格式化时间为显示格式
const formatDateTimeForDisplay = (dateTimeStr: string | null | undefined): string => {
  if (!dateTimeStr) return ''
  // 将 ISO8601 格式转换为 "YYYY-MM-DD HH:mm:ss"
  try {
    const date = new Date(dateTimeStr)
    if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return ''
  }
}

const resetForm = () => {
  isEdit.value = false
  editingId.value = null
  form.value = {
    recordDate: '',
    shipId: undefined,
    firstType: '',
    secondType: '',
    priority: 'normal',
    finishStatus: 'pending',
    startTime: '',
    endTime: '',
    eventDetail: '',
  }
}

const onFormFirstTypeChange = () => {
  form.value.secondType = ''
}

const deleteSchedule = async (schedule: Schedule) => {
  try {
    await ElMessageBox.confirm('确定要删除这条日程吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await api.schedules.delete(schedule.id)
    ElMessage.success('删除成功')
    loadSchedules()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSave = async () => {
  if (!form.value.firstType || !form.value.secondType) {
    ElMessage.warning('请填写必填项')
    return
  }

  // 处理时间格式，转换为 ISO8601
  const dataToSave = {
    ...form.value,
    startTime: form.value.startTime ? formatDateTimeForApi(form.value.startTime) : null,
    endTime: form.value.endTime ? formatDateTimeForApi(form.value.endTime) : null,
  }

  saving.value = true
  try {
    if (isEdit.value && editingId.value) {
      await api.schedules.update(editingId.value, dataToSave as any)
      ElMessage.success('更新成功')
    } else {
      await api.schedules.create(dataToSave as any)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadSchedules()
  } catch (error) {
    ElMessage.error('保存失败: ' + (error as any).message || '未知错误')
  } finally {
    saving.value = false
  }
}

// 格式化时间为 ISO8601 格式
const formatDateTimeForApi = (dateTimeStr: string): string => {
  if (!dateTimeStr) return ''
  // 将 "YYYY-MM-DD HH:mm:ss" 转换为 "YYYY-MM-DDTHH:mm:ss"
  return dateTimeStr.replace(' ', 'T')
}

// AI 智能分类建议
const getAICategorySuggestion = async () => {
  if (!form.value.eventDetail) {
    ElMessage.warning('请先输入事件详情')
    return
  }
  
  aiSuggesting.value = true
  aiSuggestion.value = null
  
  try {
    const response = await api.aiCategorization.suggest(form.value.eventDetail)
    if (response.success && response.suggestions && response.suggestions.length > 0) {
      aiSuggestion.value = response.suggestions[0]
      ElMessage.success('AI 分类建议已生成')
    } else {
      ElMessage.info('AI 无法生成分类建议')
    }
  } catch (error) {
    console.error('AI 分类建议失败:', error)
    ElMessage.error('AI 分类建议失败')
  } finally {
    aiSuggesting.value = false
  }
}

// 应用 AI 分类建议
const applyAISuggestion = () => {
  if (!aiSuggestion.value) return
  
  form.value.firstType = aiSuggestion.value.categoryFirst
  form.value.secondType = aiSuggestion.value.categorySecond
  
  // 触发一级分类变化，加载对应的二级分类
  onFormFirstTypeChange(aiSuggestion.value.categoryFirst)
  
  // 延迟设置二级分类，等待二级分类列表加载完成
  setTimeout(() => {
    form.value.secondType = aiSuggestion.value.categorySecond
  }, 100)
  
  aiSuggestion.value = null
  ElMessage.success('已应用 AI 分类建议')
}

const handleExport = () => {
  const exportData = filteredSchedules.value
  if (exportData.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    const headers = ['序号', '登记日期', '所属船舶', '一级分类', '二级分类', '事件详情', '状态', '优先级']
    const headerRow = headers.join(',')

    const rows = exportData.map((s, index) => {
      const shipName = ships.value.find(sh => sh.id === s.shipId)?.cnShipName || '-'
      const status = getStatusText(s.finishStatus)
      const priority = getPriorityText(s.priority)
      const detail = (s.eventDetail || '').replace(/[\n\r]/g, ' ')
      const detailEscaped = detail.includes(',') || detail.includes('"')
        ? `"${detail.replace(/"/g, '""')}"` : detail
      return [
        index + 1,
        s.recordDate.split('T')[0],
        shipName,
        s.firstType || '',
        s.secondType || '',
        detailEscaped,
        status,
        priority
      ].join(',')
    })

    const csvContent = [headerRow, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `台账导出_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success(`成功导出 ${exportData.length} 条记录`)
  } catch {
    ElMessage.error('导出失败')
  }
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const getPriorityType = (priority: string) => {
  const map: Record<string, any> = {
    urgent_important: 'danger',
    important: 'warning',
    urgent: 'primary',
    normal: 'success',
    low: 'info',
  }
  return map[priority] || ''
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: '重要紧急',
    important: '重要不紧急',
    urgent: '紧急不重要',
    normal: '不紧急不重要',
    low: '低',
  }
  return map[priority] || priority
}

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
  } catch (error) {
    ElMessage.error('加载数据失败')
  }
}

const loadSchedules = async () => {
  try {
    const data = await api.schedules.getAll()
    schedules.value = data
  } catch (error) {
    ElMessage.error('加载台账失败')
  }
}

const loadDailyStats = async () => {
  statsLoading.value = true
  try {
    const dateStr = currentDate.value.toISOString().split('T')[0]
    const data = await api.schedules.getDailyStats(dateStr)
    if (Array.isArray(data)) {
      dailyStats.value = data
    } else if (data && Array.isArray(data.stats)) {
      dailyStats.value = data.stats
    } else {
      dailyStats.value = []
    }
  } catch (err) {
    dailyStats.value = []
  } finally {
    statsLoading.value = false
  }
}

const getCompletionColor = (rate: number) => {
  if (rate >= 0.8) return 'var(--color-success)'
  if (rate >= 0.5) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

const getCompletionText = (item: any) => {
  return `${item.completed || 0}/${item.total || 0}`
}

const loadTaskTemplates = async () => {
  try {
    const data = await api.standardTaskTemplates.getAll()
    taskTemplates.value = Array.isArray(data) ? data : (data as any).list || []
  } catch (err) {
    taskTemplates.value = []
  }
}

const openBulkCreate = () => {
  if (taskTemplates.value.length > 0) {
    // 有任务库时，从任务库生成可勾选的条目
    bulkCreateItems.value = taskTemplates.value.map((t: any) => ({
      firstType: t.firstType,
      secondType: t.secondType,
      eventDetail: t.title || t.eventDetail || '',
      priority: t.priority || 'normal',
      selected: false,
      fromTemplate: true,
    }))
  } else {
    // 没有任务库时，回退到从一级分类生成
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
  const selected = bulkCreateItems.value.filter((i: any) => i.selected).map((i: any) => ({
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
  const itemsWithDate = selected.map((s: any) => ({
    ...s,
    recordDate: currentDate.value.toISOString().split('T')[0],
  }))
  saving.value = true
  try {
    await api.schedules.bulkCreate(itemsWithDate)
    ElMessage.success(`成功创建 ${selected.length} 个任务`)
    bulkCreateVisible.value = false
    loadSchedules()
    loadDailyStats()
  } catch (err: any) {
    ElMessage.error('批量创建失败')
    console.error(err)
  } finally {
    saving.value = false
  }
}

// 跳转到分类与任务库页面
const goToDictPage = () => {
  bulkCreateVisible.value = false
  router.push('/dict')
}

// 跳转到看板页面
const goToDashboard = () => {
  router.push('/dashboard')
}

// 跳转到工作日志页面
const goToDiary = () => {
  router.push('/work-log')
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
  loadDailyStats()
  loadTaskTemplates()
})
</script>

<style scoped>
.schedule-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  background-color: var(--color-bg);
}

.schedule-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.el-tabs__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-tab-pane) {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.schedule-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: 100%;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.date-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.current-date {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  min-width: 120px;
  text-align: center;
}

.view-container {
  flex: 1;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.quadrant-filter {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.quadrant-label {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.quadrant-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

.quadrant-dot.urgent-important {
  background-color: var(--color-danger);
}

.quadrant-dot.important {
  background-color: var(--color-warning);
}

.quadrant-dot.urgent {
  background-color: var(--color-primary);
}

.quadrant-dot.normal {
  background-color: var(--color-success);
}

.search-entry {
  padding: 24px;
}

.search-entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  background: linear-gradient(135deg, #f8fbff 0%, #eaf2ff 100%);
  border: 1px solid #d8e3f5;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.search-entry-left h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #1a2a4a;
}

.search-entry-left p {
  margin: 0;
  color: #5a6a88;
  font-size: 14px;
  line-height: 1.6;
}

.search-entry-btn {
  padding: 12px 28px;
  background: #3a7afe;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s, transform 0.2s;
}

.search-entry-btn:hover {
  background: #2e68e0;
  transform: translateY(-1px);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.results-count {
  font-size: 14px;
  color: #666;
}

.ship-selector-bar {
  margin-bottom: 12px;
}

.ship-info-card {
  background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
  border: 1px solid #bae6fd;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.ship-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ship-card-header .ship-name {
  font-size: 16px;
  font-weight: 700;
  color: #0c4a6e;
}

.ship-card-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.ship-info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ship-info-item .info-label {
  font-size: 11px;
  color: #0369a1;
  font-weight: 500;
}

.ship-info-item .info-value {
  font-size: 13px;
  color: #1e293b;
}

.ship-card-stats {
  display: flex;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #bae6fd;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-number {
  font-size: 18px;
  font-weight: 700;
  color: #0369a1;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
}

.daily-stats-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--shadow-md);
}
.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}
.stats-header .card-title {
  font-size: var(--font-size-base);
  color: var(--color-text);
  font-weight: 600;
  margin: 0;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-sm);
}
.stat-item-card {
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: all 0.2s;
}
.stat-item-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-info);
}
.stat-item-title {
  font-size: 12px;
  color: var(--color-gray-600);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-item-body {
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-bar-mini {
  flex: 1;
  height: 6px;
  background: var(--color-gray-200);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill-mini {
  height: 100%;
  transition: width 0.3s;
}
.progress-text {
  font-size: 12px;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}
.bulk-create-list {
  max-height: 400px;
  overflow-y: auto;
}
.bulk-create-row {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--color-gray-200);
}
.bulk-create-row:hover {
  background: #f8fafc;
}

/* 空状态引导样式 */
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
</style>
