<template>
  <div class="data-export-page">
    <div class="page-header">
      <div class="flex items-center gap-3">
        <el-button text @click="navigateTo('/admin')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2 class="page-title">数据导入导出</h2>
      </div>
      <div class="header-actions-right">
        <el-button type="primary" @click="navigateTo('/admin/import')">
          <el-icon><Upload /></el-icon>
          数据导入
        </el-button>
      </div>
    </div>

    <!-- 数据导出 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>数据导出</span>
        </div>
      </template>

      <div class="export-grid">
        <!-- 用户列表导出 -->
        <div class="export-card" @click="exportData('users')" :class="{ 'is-exporting': exportingType === 'users' }">
          <div class="export-icon">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div class="export-info">
            <h3 class="export-title">用户列表</h3>
            <p class="export-desc">导出所有用户信息</p>
          </div>
          <div class="export-action">
            <el-icon v-if="exportingType === 'users'" class="is-loading"><Loading /></el-icon>
            <el-icon v-else><Download /></el-icon>
          </div>
        </div>

        <!-- 工作台账导出 -->
        <div class="export-card" @click="showScheduleExportDialog" :class="{ 'is-exporting': exportingType === 'schedules' }">
          <div class="export-icon" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div class="export-info">
            <h3 class="export-title">工作台账</h3>
            <p class="export-desc">按团队和时间范围导出</p>
          </div>
          <div class="export-action">
            <el-icon v-if="exportingType === 'schedules'" class="is-loading"><Loading /></el-icon>
            <el-icon v-else><Download /></el-icon>
          </div>
        </div>

        <!-- 航海日记导出 -->
        <div class="export-card" @click="showDiaryExportDialog" :class="{ 'is-exporting': exportingType === 'diaries' }">
          <div class="export-icon" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div class="export-info">
            <h3 class="export-title">航海日记</h3>
            <p class="export-desc">按团队和时间范围导出</p>
          </div>
          <div class="export-action">
            <el-icon v-if="exportingType === 'diaries'" class="is-loading"><Loading /></el-icon>
            <el-icon v-else><Download /></el-icon>
          </div>
        </div>

        <!-- 党建活动导出 -->
        <div class="export-card" @click="exportData('party-activities')" :class="{ 'is-exporting': exportingType === 'party-activities' }">
          <div class="export-icon" style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div class="export-info">
            <h3 class="export-title">党建活动</h3>
            <p class="export-desc">按团队导出所有党建活动记录</p>
          </div>
          <div class="export-action">
            <el-icon v-if="exportingType === 'party-activities'" class="is-loading"><Loading /></el-icon>
            <el-icon v-else><Download /></el-icon>
          </div>
        </div>
      </div>

      <!-- 批量导出 -->
      <div class="batch-export-section">
        <el-divider content-position="left">批量导出</el-divider>
        <div class="batch-export-actions">
          <el-checkbox-group v-model="selectedExportTypes">
            <el-checkbox label="users">用户列表</el-checkbox>
            <el-checkbox label="schedules">工作台账</el-checkbox>
            <el-checkbox label="diaries">航海日记</el-checkbox>
            <el-checkbox label="party-activities">党建活动</el-checkbox>
          </el-checkbox-group>
          <el-button type="primary" @click="batchExport" :loading="batchExporting" :disabled="selectedExportTypes.length === 0">
            <el-icon><Download /></el-icon>
            批量导出选中项
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 下载模板 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>导入模板下载</span>
        </div>
      </template>

      <div class="template-grid">
        <el-button @click="downloadTemplate('users')" size="large">
          <el-icon><Document /></el-icon>
          用户导入模板
        </el-button>
        <el-button @click="downloadTemplate('schedules')" size="large">
          <el-icon><Document /></el-icon>
          工作台账导入模板
        </el-button>
      </div>
      <p class="template-hint">提示：下载模板后填写数据，后续可通过模板批量导入</p>
    </el-card>

    <!-- 工作台账导出对话框 -->
    <el-dialog v-model="scheduleExportVisible" title="导出工作台账" width="500px">
      <el-form :model="scheduleExportForm" label-width="80px">
        <el-form-item label="团队">
          <el-select v-model="scheduleExportForm.teamCode" style="width: 100%">
            <el-option label="Team 1" value="team1" />
            <el-option label="Team 2" value="team2" />
            <el-option label="Team 3" value="team3" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="scheduleExportForm.startDate" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="scheduleExportForm.endDate" type="date" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleExportVisible = false">取消</el-button>
        <el-button type="primary" @click="doExportSchedules" :loading="exporting">导出</el-button>
      </template>
    </el-dialog>

    <!-- 航海日记导出对话框 -->
    <el-dialog v-model="diaryExportVisible" title="导出航海日记" width="500px">
      <el-form :model="diaryExportForm" label-width="80px">
        <el-form-item label="团队">
          <el-select v-model="diaryExportForm.teamCode" style="width: 100%">
            <el-option label="Team 1" value="team1" />
            <el-option label="Team 2" value="team2" />
            <el-option label="Team 3" value="team3" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="diaryExportForm.startDate" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="diaryExportForm.endDate" type="date" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="diaryExportVisible = false">取消</el-button>
        <el-button type="primary" @click="doExportDiaries" :loading="exporting">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Download, Document, ArrowLeft, Upload, Loading } from '@element-plus/icons-vue'

definePageMeta({
  middleware: ['auth', 'role'],
  allowedRoles: ['admin'],
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const exporting = ref(false)
const exportingType = ref<string | null>(null)
const scheduleExportVisible = ref(false)
const diaryExportVisible = ref(false)
const selectedExportTypes = ref<string[]>([])
const batchExporting = ref(false)

const scheduleExportForm = reactive({
  teamCode: 'team2',
  startDate: '',
  endDate: '',
})

const diaryExportForm = reactive({
  teamCode: 'team2',
  startDate: '',
  endDate: '',
})

const getToken = () => {
  const cookie = useCookie('auth_token')
  return cookie.value
}

const formatDate = (date: string | Date | null): string => {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

const exportData = async (type: string) => {
  exporting.value = true
  exportingType.value = type
  try {
    let url = `${apiBase}/admin/export/${type}`
    const token = getToken()

    const response = await $fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    })

    // Create download link
    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${type}_${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('导出成功')
  } catch (error: any) {
    ElMessage.error(error.data?.message || '导出失败')
  } finally {
    exporting.value = false
    exportingType.value = null
  }
}

const showScheduleExportDialog = () => {
  scheduleExportForm.startDate = ''
  scheduleExportForm.endDate = ''
  scheduleExportVisible.value = true
}

const showDiaryExportDialog = () => {
  diaryExportForm.startDate = ''
  diaryExportForm.endDate = ''
  diaryExportVisible.value = true
}

const doExportSchedules = async () => {
  exporting.value = true
  exportingType.value = 'schedules'
  try {
    const token = getToken()
    const query: any = { teamCode: scheduleExportForm.teamCode }
    if (scheduleExportForm.startDate) query.startDate = formatDate(scheduleExportForm.startDate)
    if (scheduleExportForm.endDate) query.endDate = formatDate(scheduleExportForm.endDate)

    const response = await $fetch(`${apiBase}/admin/export/schedules`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      query,
      responseType: 'blob',
    })

    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `schedules_${scheduleExportForm.teamCode}_${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('导出成功')
    scheduleExportVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.data?.message || '导出失败')
  } finally {
    exporting.value = false
    exportingType.value = null
  }
}

const doExportDiaries = async () => {
  exporting.value = true
  exportingType.value = 'diaries'
  try {
    const token = getToken()
    const query: any = { teamCode: diaryExportForm.teamCode }
    if (diaryExportForm.startDate) query.startDate = formatDate(diaryExportForm.startDate)
    if (diaryExportForm.endDate) query.endDate = formatDate(diaryExportForm.endDate)

    const response = await $fetch(`${apiBase}/admin/export/diaries`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      query,
      responseType: 'blob',
    })

    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `diaries_${diaryExportForm.teamCode}_${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('导出成功')
    diaryExportVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.data?.message || '导出失败')
  } finally {
    exporting.value = false
    exportingType.value = null
  }
}

const batchExport = async () => {
  if (selectedExportTypes.value.length === 0) return
  
  batchExporting.value = true
  try {
    for (const type of selectedExportTypes.value) {
      exportingType.value = type
      await exportDataSilent(type)
    }
    ElMessage.success(`批量导出完成，共导出 ${selectedExportTypes.value.length} 项`)
    selectedExportTypes.value = []
  } catch (error: any) {
    ElMessage.error(error.data?.message || '批量导出失败')
  } finally {
    batchExporting.value = false
    exportingType.value = null
  }
}

const exportDataSilent = async (type: string) => {
  const token = getToken()
  const response = await $fetch(`${apiBase}/admin/export/${type}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  })

  const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `${type}_${Date.now()}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

const downloadTemplate = async (type: string) => {
  try {
    const token = getToken()
    const response = await $fetch(`${apiBase}/admin/export/template`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      query: { type },
      responseType: 'blob',
    })

    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `template_${type}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('模板已下载')
  } catch (error: any) {
    ElMessage.error(error.data?.message || '下载失败')
  }
}
</script>

<style scoped>
.data-export-page {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.page-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
}

.header-actions-right {
  display: flex;
  gap: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
}

.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.export-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  cursor: pointer;
  transition: all 0.2s;
}

.export-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.export-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0;
}

.export-info {
  flex: 1;
  min-width: 0;
}

.export-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.export-desc {
  margin: 0;
  font-size: 13px;
  color: #808080;
}

.export-action {
  flex-shrink: 0;
  color: #5B7FA6;
}

.export-card.is-exporting {
  opacity: 0.6;
  pointer-events: none;
}

.batch-export-section {
  margin-top: 24px;
}

.batch-export-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.batch-export-actions .el-checkbox-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.template-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.template-hint {
  margin: 12px 0 0 0;
  font-size: 12px;
  color: #999;
}
</style>
