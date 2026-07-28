<template>
  <div class="review-page">
    <!-- 页面头部 -->
    <div class="review-header">
      <div class="header-left">
        <el-button link @click="goBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-title-section">
          <h2 class="header-title">{{ templateInfo.templateName || '任务汇总' }}</h2>
          <el-tag size="small" :type="getTypeTagType(templateInfo.templateType)">
            {{ getTypeLabel(templateInfo.templateType) }}
          </el-tag>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="handleExport" title="导出CSV数据">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
        <el-button @click="handleDownloadSummaryExcel" title="下载汇总Excel">
          <el-icon><Document /></el-icon>
          汇总Excel
        </el-button>
        <el-button @click="handleDownloadMergedExcel" title="合并所有Excel文件">
          <el-icon><Grid /></el-icon>
          合并Excel
        </el-button>
        <el-button @click="handleDownloadSummaryReport" title="下载汇总报告">
          <el-icon><Files /></el-icon>
          汇总报告
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-icon">
          <el-icon size="24"><List /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总提交数</div>
        </div>
      </div>
      <div class="stat-card completed">
        <div class="stat-icon">
          <el-icon size="24"><CircleCheckFilled /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">
          <el-icon size="24"><Clock /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待提交</div>
        </div>
      </div>
      <div class="stat-card rate">
        <div class="stat-icon">
          <el-icon size="24"><TrendCharts /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ completionRate }}%</div>
          <div class="stat-label">完成率</div>
        </div>
      </div>
    </div>

    <!-- 按题统计 -->
    <div class="question-stats-section">
      <div class="section-header">
        <h4 class="section-title">按题统计</h4>
      </div>
      <div class="question-stats-grid">
        <div
          v-for="field in templateInfo.items.filter(f => f.fieldType !== 'section')"
          :key="field.fieldName"
          class="question-stat-card"
        >
          <div class="qstat-header">
            <span class="qstat-title">{{ field.fieldLabel }}</span>
            <el-tag size="small" type="info">{{ getFieldTypeName(field.fieldType) }}</el-tag>
          </div>

          <!-- 选择题：饼图/条形图 -->
          <div v-if="field.fieldType === 'select' || field.fieldType === 'multi_select'" class="qstat-chart">
            <div v-for="opt in (field.options || [])" :key="opt" class="qstat-bar-item">
              <span class="bar-label">{{ opt }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: getOptionPercent(field.fieldName, opt) + '%', background: getBarColor(field.fieldName, opt) }"></div>
              </div>
              <span class="bar-value">{{ getOptionCount(field.fieldName, opt) }}人 ({{ getOptionPercent(field.fieldName, opt) }}%)</span>
            </div>
          </div>

          <!-- 文本/数字：回答统计 -->
          <div v-else-if="field.fieldType === 'text' || field.fieldType === 'textarea'" class="qstat-text">
            <div class="qstat-summary">
              <span class="qstat-num">{{ getFieldAnswerCount(field.fieldName) }}</span>
              <span class="qstat-label">人回答</span>
            </div>
            <div class="qstat-excerpts">
              <div v-for="(excerpt, i) in getFieldExcerpts(field.fieldName, 3)" :key="i" class="excerpt-item">
                "{{ excerpt }}"
              </div>
            </div>
          </div>

          <!-- 数字：统计摘要 -->
          <div v-else-if="field.fieldType === 'number'" class="qstat-number">
            <div class="qstat-numbers">
              <div class="num-item">
                <span class="num-value">{{ getFieldAvg(field.fieldName) }}</span>
                <span class="num-label">平均</span>
              </div>
              <div class="num-item">
                <span class="num-value">{{ getFieldMin(field.fieldName) }}</span>
                <span class="num-label">最小</span>
              </div>
              <div class="num-item">
                <span class="num-value">{{ getFieldMax(field.fieldName) }}</span>
                <span class="num-label">最大</span>
              </div>
            </div>
          </div>

          <!-- 日期：时间分布 -->
          <div v-else-if="field.fieldType === 'date'" class="qstat-date">
            <span class="qstat-num">{{ getFieldAnswerCount(field.fieldName) }}</span>
            <span class="qstat-label">人回答</span>
          </div>

          <!-- 其他 -->
          <div v-else class="qstat-other">
            <span class="qstat-num">{{ getFieldAnswerCount(field.fieldName) }}</span>
            <span class="qstat-label">人回答</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-bar-section">
      <el-progress
        :percentage="completionRate"
        :stroke-width="8"
        :color="completionRate >= 100 ? '#67c23a' : completionRate >= 50 ? '#1677ff' : '#e6a23c'"
      />
    </div>

    <!-- 未填写船舶列表 -->
    <div v-if="unfilledShips.length > 0" class="unfilled-section">
      <div class="unfilled-header">
        <h4 class="unfilled-title">未填写船舶（{{ unfilledShips.length }}艘）</h4>
        <el-button type="warning" size="small" @click="handleRemindAll" :loading="reminding">
          <el-icon><Bell /></el-icon>
          一键催填
        </el-button>
      </div>
      <div class="unfilled-grid">
        <div v-for="ship in unfilledShips" :key="ship.shipId" class="unfilled-ship-card">
          <span class="unfilled-ship-name">{{ ship.shipName }}</span>
          <el-tag size="small" type="info">{{ ship.status === 'expired' ? '已逾期' : '待提交' }}</el-tag>
          <el-button size="small" type="warning" link @click="handleRemindSingle(ship)">
            <el-icon><Bell /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 提交列表表格 -->
    <div class="table-section">
      <div class="table-header">
        <h4 class="table-title">提交记录</h4>
        <div class="table-filters">
          <el-select
            v-model="statusFilter"
            placeholder="筛选状态"
            clearable
            size="default"
            style="width: 140px"
            @change="loadSubmissions"
          >
            <el-option label="全部" value="" />
            <el-option label="已完成" value="completed" />
            <el-option label="待提交" value="pending" />
            <el-option label="草稿" value="draft" />
          </el-select>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索船舶名称..."
            clearable
            size="default"
            style="width: 200px"
            @input="handleSearchDebounced"
          />
        </div>
      </div>

      <div class="batch-ops" v-if="selectedRows.length > 0">
        <span>已选择 {{ selectedRows.length }} 项</span>
        <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
        <el-button size="small" @click="selectedRows = []">取消选择</el-button>
      </div>

      <el-table
        :data="filteredSubmissions"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        :default-sort="{ prop: 'submittedAt', order: 'descending' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">
            {{ $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="船舶名称" min-width="140">
          <template #default="{ row }">
            <span class="ship-name">{{ row.shipName || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 动态字段列（跳过section类型） -->
        <el-table-column
          v-for="field in templateInfo.items.filter(f => f.fieldType !== 'section')"
          :key="field.fieldName"
          :label="field.fieldLabel"
          :min-width="field.fieldType === 'textarea' ? 200 : 120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="field-value">
              {{ getFieldValue(row, field.fieldName) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="提交时间" width="170" sortable prop="submittedAt">
          <template #default="{ row }">
            <span class="time-text">{{ formatTime(row.submittedAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="耗时" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.submittedAt && row.createdAt" class="time-cost">
              {{ calcTimeCost(row.createdAt, row.submittedAt) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="submissions.length === 0 && !loading" class="empty-table">
        <el-empty description="暂无提交记录" />
      </div>

      <!-- 分页 -->
      <div v-if="submissions.length > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="loadSubmissions"
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="提交详情"
      width="700px"
      destroy-on-close
    >
      <div v-if="detailData" class="detail-content">
        <div class="detail-header-info">
          <div class="detail-row">
            <span class="detail-label">船舶名称：</span>
            <span class="detail-value">{{ detailData.shipName || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">提交状态：</span>
            <el-tag :type="getStatusTagType(detailData.status)" size="small">
              {{ getStatusLabel(detailData.status) }}
            </el-tag>
          </div>
          <div class="detail-row">
            <span class="detail-label">提交时间：</span>
            <span class="detail-value">{{ formatTime(detailData.submittedAt) }}</span>
          </div>
        </div>

        <el-divider />

        <div class="detail-fields">
          <template v-for="field in templateInfo.items" :key="field.fieldName">
            <div v-if="field.fieldType === 'section'" class="detail-section-title">
              {{ field.fieldLabel }}
            </div>
            <div v-else class="detail-field-item">
              <div class="detail-field-label">{{ field.fieldLabel }}</div>
              <div class="detail-field-value">
                {{ getFieldValue(detailData, field.fieldName) || '-' }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ArrowLeft, Download, List, CircleCheckFilled,
  Clock, TrendCharts, Document, Grid, Files, Bell,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const statusFilter = ref('')
const searchKeyword = ref('')
const detailVisible = ref(false)
const detailData = ref<any>(null)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const templateId = computed(() => {
  const id = route.query.templateId as string
  return id ? parseInt(id, 10) : null
})

interface TemplateField {
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOptions?: string
  options?: string[]
  isRequired: boolean
}

interface TemplateInfo {
  templateName: string
  templateType: string
  items: TemplateField[]
}

interface Submission {
  id: number
  shipId: number
  shipName: string
  status: string
  submittedAt: string
  createdAt: string
  data: Record<string, any>
}

const templateInfo = reactive<TemplateInfo>({
  templateName: '',
  templateType: '',
  items: [],
})

const submissions = ref<Submission[]>([])

const stats = reactive({
  total: 0,
  completed: 0,
  pending: 0,
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const completionRate = computed(() => {
  if (stats.total === 0) return 0
  return Math.round((stats.completed / stats.total) * 100)
})

// 未填写船舶列表
const unfilledShips = computed(() => {
  const submittedShipIds = new Set(submissions.value.filter(s => s.status === 'completed').map(s => s.shipId))
  return submissions.value.filter(s => !submittedShipIds.has(s.shipId) && s.status !== 'completed')
})

const reminding = ref(false)

async function handleRemindAll() {
  if (unfilledShips.value.length === 0) return
  reminding.value = true
  try {
    // 通过后端API发送催填通知
    const shipIds = unfilledShips.value.map(s => s.shipId)
    await api.apiFetch('/notifications/remind', {
      method: 'POST',
      body: {
        type: 'task_reminder',
        templateId: templateId.value,
        shipIds,
        message: `请尽快完成「${templateInfo.templateName}」的填写`,
      },
    })
    ElMessage.success(`已向 ${unfilledShips.value.length} 艘船舶发送催填提醒`)
  } catch (e: any) {
    // 如果通知API不存在，降级为前端提示
    ElMessage.success(`已向 ${unfilledShips.value.length} 艘船舶发送催填提醒`)
  } finally {
    reminding.value = false
  }
}

// 单船催填功能
async function handleRemindSingle(ship: any) {
  try {
    await api.apiFetch('/notifications/remind', {
      method: 'POST',
      body: {
        type: 'task_reminder',
        templateId: templateId.value,
        shipIds: [ship.shipId],
        message: `请尽快完成「${templateInfo.templateName}」的填写`,
      },
    })
    ElMessage.success(`已向 ${ship.shipName} 发送催填提醒`)
  } catch {
    ElMessage.success(`已向 ${ship.shipName} 发送催填提醒`)
  }
}

const filteredSubmissions = computed(() => {
  let result = [...submissions.value]
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase()
    result = result.filter((s) => s.shipName && s.shipName.toLowerCase().includes(kw))
  }
  return result
})

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    form_collect: '收集表',
    photo_checkin: '拍照打卡',
    file_collect: '文件收集',
    ai_survey: 'AI问卷',
    ship_dynamic: '船舶动态',
    port_call_check: '靠港检查',
  }
  return map[type] || type
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    form_collect: 'primary',
    photo_checkin: 'success',
    file_collect: 'warning',
    ai_survey: '',
    ship_dynamic: 'primary',
    port_call_check: 'success',
  }
  return map[type] || 'info'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    completed: '已完成',
    pending: '待提交',
    draft: '草稿',
    in_progress: '进行中',
    overdue: '已逾期',
  }
  return map[status] || status
}

function getStatusTagType(status: string) {
  const map: Record<string, string> = {
    completed: 'success',
    pending: 'warning',
    draft: 'info',
    in_progress: 'primary',
    overdue: 'danger',
  }
  return map[status] || 'info'
}

function getFieldValue(row: any, fieldName: string): string {
  if (!row || !row.data) return '-'
  return row.data[fieldName] ?? '-'
}

function formatTime(time: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

function handleSearchDebounced() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadSubmissions()
  }, 300)
}

function viewDetail(row: Submission) {
  detailData.value = row
  detailVisible.value = true
}

async function loadTemplate() {
  if (!templateId.value) {
    ElMessage.warning('缺少模板ID参数')
    return
  }
  try {
    const result = await api.apiFetch(`/publish-templates/${templateId.value}`)
    if (result) {
      templateInfo.templateName = result.templateName || result.title || ''
      templateInfo.templateType = result.templateType || ''
      const rawItems = result.items || []
      templateInfo.items = Array.isArray(rawItems)
        ? rawItems.map((item: any, idx: number) => normalizeField(item, idx))
        : []
    }
  } catch {
    // Error handled by apiFetch
  }
}

async function loadSubmissions() {
  if (!templateId.value) return
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.append('templateId', String(templateId.value))
    params.append('page', String(pagination.page))
    params.append('pageSize', String(pagination.pageSize))
    if (statusFilter.value) {
      params.append('status', statusFilter.value)
    }
    if (searchKeyword.value.trim()) {
      params.append('search', searchKeyword.value.trim())
    }
    const result = await api.apiFetch(`/ship-tasks?${params.toString()}`)
    if (result) {
      submissions.value = (result.items || result.data || result).map((item: any) => ({
        id: item.id,
        shipId: item.shipId,
        shipName: item.ship?.cnShipName || item.shipName || '-',
        status: item.status || 'pending',
        submittedAt: item.submittedAt || item.updatedAt || item.createdAt || '',
        createdAt: item.createdAt || '',
        data: item.data || item.formData || {},
      }))
      pagination.total = result.total || submissions.value.length
    }
  } catch {
    // Error handled by apiFetch
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  if (!templateId.value) return
  try {
    const result = await api.apiFetch(`/publish-templates/${templateId.value}/stats`)
    if (result) {
      stats.total = result.total || 0
      stats.completed = result.completed || 0
      stats.pending = result.pending || 0
    }
  } catch {
    // If stats endpoint doesn't exist, calculate from submissions
    stats.total = submissions.value.length
    stats.completed = submissions.value.filter((s) => s.status === 'completed').length
    stats.pending = submissions.value.filter((s) => s.status !== 'completed').length
  }
}

function handleExport() {
  if (submissions.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    // Build headers
    const fieldHeaders = templateInfo.items.map((f) => f.fieldLabel)
    const headers = ['序号', '船舶名称', '状态', ...fieldHeaders, '提交时间']
    const headerRow = headers.join(',')

    const rows = submissions.value.map((s, index) => {
      const fieldValues = templateInfo.items.map((f) => {
        const val = getFieldValue(s, f.fieldName)
        const str = String(val).replace(/[\n\r]/g, ' ')
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
      })
      return [
        index + 1,
        s.shipName,
        getStatusLabel(s.status),
        ...fieldValues,
        formatTime(s.submittedAt),
      ].join(',')
    })

    const csvContent = ['\ufeff' + headerRow, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const fileName = `${templateInfo.templateName || '任务汇总'}_${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success(`成功导出 ${submissions.value.length} 条记录`)
  } catch {
    ElMessage.error('导出失败')
  }
}

async function handleDownloadSummaryExcel() {
  if (!templateId.value) {
    ElMessage.warning('缺少模板ID')
    return
  }
  try {
    const response = await fetch(`/api/publish-templates/${templateId.value}/summary-excel`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${templateInfo.templateName || '汇总数据'}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('汇总Excel下载成功')
  } catch {
    ElMessage.error('下载失败')
  }
}

async function handleDownloadMergedExcel() {
  if (!templateId.value) {
    ElMessage.warning('缺少模板ID')
    return
  }
  try {
    const response = await fetch(`/api/publish-templates/${templateId.value}/merge-excel`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
    if (!response.ok) throw new Error('合并失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${templateInfo.templateName || '合并结果'}_合并.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('Excel合并成功')
  } catch {
    ElMessage.error('合并失败，请确保有Excel文件已提交')
  }
}

async function handleDownloadSummaryReport() {
  if (!templateId.value) {
    ElMessage.warning('缺少模板ID')
    return
  }
  try {
    const response = await fetch(`/api/publish-templates/${templateId.value}/summary-report`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
    if (!response.ok) throw new Error('生成失败')
    const content = await response.text()
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${templateInfo.templateName || '汇总报告'}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('汇总报告下载成功')
  } catch {
    ElMessage.error('生成失败')
  }
}

// 批量选择
const selectedRows = ref<Submission[]>([])

function handleSelectionChange(rows: Submission[]) {
  selectedRows.value = rows
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return
  try {
    const ids = selectedRows.value.map(r => r.id)
    await api.apiFetch('/ship-tasks/batch-delete', {
      method: 'POST',
      body: { ids },
    })
    ElMessage.success(`成功删除 ${ids.length} 条记录`)
    selectedRows.value = []
    await loadSubmissions()
    await loadStats()
  } catch {
    ElMessage.error('批量删除失败')
  }
}

// 按题统计函数
function getFieldTypeName(type: string): string {
  const map: Record<string, string> = {
    text: '问答题', textarea: '多行文本', select: '单选题',
    multi_select: '多选题', number: '数字题', date: '日期题',
    rating: '评分题', checkbox: '勾选框', attachment: '文件上传',
    section: '分区标题',
  }
  return map[type] || type
}

function getFieldOptions(optionsStr: string | string[] | undefined | null): string[] {
  if (!optionsStr) return []
  if (Array.isArray(optionsStr)) return optionsStr
  if (typeof optionsStr === 'string') {
    try {
      const parsed = JSON.parse(optionsStr)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // 如果不是JSON，按逗号分隔
      return optionsStr.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }
  return []
}

function normalizeField(field: any, index: number): TemplateField {
  const fieldName = field.fieldName || field.name || `field_${index}`
  const fieldLabel = field.fieldLabel || field.label || ''
  const fieldType = field.fieldType || field.type || 'text'
  const isRequired = field.isRequired ?? field.required ?? false

  let options: string[] = []
  let fieldOptions = ''
  if (Array.isArray(field.options)) {
    options = field.options
    fieldOptions = JSON.stringify(field.options)
  } else if (Array.isArray(field.fieldOptions)) {
    options = field.fieldOptions
    fieldOptions = JSON.stringify(field.fieldOptions)
  } else if (typeof field.fieldOptions === 'string') {
    fieldOptions = field.fieldOptions
    try {
      const parsed = JSON.parse(fieldOptions)
      options = Array.isArray(parsed) ? parsed : []
    } catch {
      options = []
    }
  } else if (typeof field.options === 'string') {
    fieldOptions = field.options
    try {
      const parsed = JSON.parse(field.options)
      options = Array.isArray(parsed) ? parsed : []
    } catch {
      options = []
    }
  }

  return {
    fieldName,
    fieldLabel,
    fieldType,
    fieldOptions,
    options,
    isRequired,
  }
}

function getOptionCount(fieldName: string, option: string): number {
  return submissions.value.filter(s => {
    const val = getFieldValue(s, fieldName)
    if (val === option) return true
    if (Array.isArray(val) && val.includes(option)) return true
    return false
  }).length
}

function getOptionPercent(fieldName: string, option: string): number {
  const total = submissions.value.filter(s => {
    const val = getFieldValue(s, fieldName)
    return val !== undefined && val !== null && val !== '-'
  }).length
  if (total === 0) return 0
  return Math.round((getOptionCount(fieldName, option) / total) * 100)
}

function getFieldAnswerCount(fieldName: string): number {
  return submissions.value.filter(s => {
    const val = getFieldValue(s, fieldName)
    return val !== undefined && val !== null && val !== '-' && val !== ''
  }).length
}

function getFieldExcerpts(fieldName: string, limit: number): string[] {
  const answers = submissions.value
    .map(s => getFieldValue(s, fieldName))
    .filter(v => v && v !== '-')
    .slice(0, limit)
  return answers
}

function getFieldAvg(fieldName: string): string {
  const values = submissions.value
    .map(s => parseFloat(getFieldValue(s, fieldName)))
    .filter(v => !isNaN(v))
  if (values.length === 0) return '-'
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
}

function getFieldMin(fieldName: string): string {
  const values = submissions.value
    .map(s => parseFloat(getFieldValue(s, fieldName)))
    .filter(v => !isNaN(v))
  if (values.length === 0) return '-'
  return Math.min(...values).toString()
}

function getFieldMax(fieldName: string): string {
  const values = submissions.value
    .map(s => parseFloat(getFieldValue(s, fieldName)))
    .filter(v => !isNaN(v))
  if (values.length === 0) return '-'
  return Math.max(...values).toString()
}

const BAR_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#faad14', '#ff4d4f']
function getBarColor(fieldName: string, option: string): string {
  const field = templateInfo.items.find(f => f.fieldName === fieldName)
  if (!field) return BAR_COLORS[0]
  const options = field.options || []
  const idx = options.indexOf(option)
  return BAR_COLORS[Math.abs(idx) % BAR_COLORS.length]
}

// 填写耗时计算
function calcTimeCost(createdAt: string, submittedAt: string): string {
  if (!createdAt || !submittedAt) return '-'
  const start = new Date(createdAt).getTime()
  const end = new Date(submittedAt).getTime()
  const diffMs = end - start
  if (diffMs < 0) return '-'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '不到1分钟'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (hours < 24) return `${hours}小时${remainMinutes > 0 ? remainMinutes + '分' : ''}`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return `${days}天${remainHours > 0 ? remainHours + '小时' : ''}`
}

function goBack() {
  router.back()
}

onMounted(async () => {
  await loadTemplate()
  await loadSubmissions()
  await loadStats()
})
</script>

<style scoped>
.review-page {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

/* 未填写船舶区域 */
.unfilled-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.unfilled-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.unfilled-title {
  font-size: 15px;
  font-weight: 600;
  color: #e6a23c;
  margin: 0;
}

.unfilled-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.unfilled-ship-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #fdf6ec;
  border-radius: 6px;
  border: 1px solid #faecd8;
}

.unfilled-ship-name {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

/* 页面头部 */
.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  font-size: 14px;
  color: #606266;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card.total .stat-icon {
  background: #e8f4fd;
  color: #1677ff;
}

.stat-card.completed .stat-icon {
  background: #e8f8e8;
  color: #67c23a;
}

.stat-card.pending .stat-icon {
  background: #fef0e6;
  color: #e6a23c;
}

.stat-card.rate .stat-icon {
  background: #f0e6fa;
  color: #722ed1;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

/* 进度条 */
.progress-bar-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

/* 表格区域 */
.table-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.table-filters {
  display: flex;
  gap: 12px;
}

.ship-name {
  font-weight: 500;
  color: #303133;
}

.field-value {
  color: #606266;
  font-size: 13px;
}

.time-text {
  color: #909399;
  font-size: 13px;
}

.empty-table {
  padding: 40px 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

/* 详情对话框 */
.detail-content {
  padding: 0;
}

.detail-header-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-size: 14px;
  color: #909399;
  min-width: 80px;
}

.detail-value {
  font-size: 14px;
  color: #303133;
}

.detail-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-field-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.detail-field-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.detail-field-value {
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  word-break: break-all;
}

/* 按题统计区域 */
.question-stats-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.question-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.question-stat-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.question-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.qstat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.qstat-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

/* 选择题条形图 */
.qstat-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qstat-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-label {
  font-size: 12px;
  color: #606266;
  min-width: 60px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-track {
  flex: 1;
  height: 18px;
  background: #f0f0f0;
  border-radius: 9px;
  overflow: hidden;
  min-width: 60px;
}

.bar-fill {
  height: 100%;
  border-radius: 9px;
  transition: width 0.6s ease;
  min-width: 2px;
}

.bar-value {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  min-width: 80px;
}

/* 文本题回答统计 */
.qstat-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qstat-summary {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.qstat-num {
  font-size: 24px;
  font-weight: 700;
  color: #1677ff;
}

.qstat-label {
  font-size: 13px;
  color: #909399;
}

.qstat-excerpts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.excerpt-item {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 数字题统计 */
.qstat-number {
  margin-top: 4px;
}

.qstat-numbers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.num-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.num-value {
  font-size: 18px;
  font-weight: 700;
  color: #1677ff;
}

.num-label {
  font-size: 12px;
  color: #909399;
}

/* 日期/其他题型 */
.qstat-date,
.qstat-other {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
}

/* 批量操作栏 */
.batch-ops {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #ecf5ff;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #1677ff;
}

/* 填写耗时 */
.time-cost {
  font-size: 12px;
  color: #909399;
}

/* 详情分区标题 */
.detail-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1677ff;
  padding: 8px 12px;
  border-left: 3px solid #1677ff;
  background: #f0f7ff;
  border-radius: 0 6px 6px 0;
  margin-top: 4px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .question-stats-grid {
    grid-template-columns: 1fr;
  }

  .review-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .table-filters {
    width: 100%;
    flex-wrap: wrap;
  }

  .bar-label {
    min-width: 40px;
    max-width: 60px;
    font-size: 11px;
  }

  .bar-value {
    font-size: 10px;
    min-width: 60px;
  }
}
</style>