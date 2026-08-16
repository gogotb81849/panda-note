<template>
  <div class="data-import-page">
    <div class="page-header">
      <div class="flex items-center gap-3">
        <el-button text @click="navigateTo('/admin')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2 class="page-title">数据导入</h2>
      </div>
    </div>

    <!-- 导入类型选择 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>选择导入类型</span>
        </div>
      </template>

      <div class="import-type-grid">
        <div 
          v-for="item in importTypes" 
          :key="item.type"
          class="import-type-card"
          :class="{ active: selectedType === item.type }"
          @click="selectType(item.type)"
        >
          <div class="type-icon" :style="{ background: item.color }">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
            </svg>
          </div>
          <div class="type-info">
            <h3>{{ item.label }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 文件上传区域 -->
    <el-card v-if="selectedType" class="mb-4">
      <template #header>
        <div class="card-header">
          <span>上传文件</span>
          <el-button link type="primary" @click="downloadTemplate">
            <el-icon><Document /></el-icon>
            下载模板
          </el-button>
        </div>
      </template>

      <el-upload
        ref="uploadRef"
        class="import-upload"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将 Excel 文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            仅支持 .xlsx / .xls 格式文件，单次最多上传一个文件
          </div>
        </template>
      </el-upload>

      <div v-if="selectedFile" class="file-info">
        <el-icon><Document /></el-icon>
        <span>{{ selectedFile.name }}</span>
        <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
        <el-button link type="danger" @click="removeFile">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </el-card>

    <!-- 数据预览与验证 -->
    <el-card v-if="previewData.length > 0" class="mb-4">
      <template #header>
        <div class="card-header">
          <span>数据预览（前 {{ Math.min(10, previewData.length) }} 条）</span>
          <el-tag :type="validationErrors.length === 0 ? 'success' : 'warning'">
            {{ validationErrors.length === 0 ? '验证通过' : `${validationErrors.length} 条错误` }}
          </el-tag>
        </div>
      </template>

      <el-table :data="previewData.slice(0, 10)" border stripe max-height="400">
        <el-table-column type="index" width="50" label="#" />
        <el-table-column 
          v-for="col in previewColumns" 
          :key="col" 
          :prop="col" 
          :label="col"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column label="状态" width="80" fixed="right">
          <template #default="{ $index }">
            <el-tag v-if="getRowError($index)" type="danger" size="small">错误</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 验证错误列表 -->
      <div v-if="validationErrors.length > 0" class="validation-errors">
        <h4>验证错误：</h4>
        <ul>
          <li v-for="(err, idx) in validationErrors.slice(0, 10)" :key="idx">
            第 {{ err.row + 1 }} 行：{{ err.message }}
          </li>
          <li v-if="validationErrors.length > 10">
            ... 还有 {{ validationErrors.length - 10 }} 条错误
          </li>
        </ul>
      </div>
    </el-card>

    <!-- 导入操作 -->
    <el-card v-if="selectedFile">
      <template #header>
        <div class="card-header">
          <span>导入设置</span>
        </div>
      </template>

      <el-form label-width="100px">
        <el-form-item label="重复处理">
          <el-radio-group v-model="duplicateStrategy">
            <el-radio value="skip">跳过重复</el-radio>
            <el-radio value="overwrite">覆盖更新</el-radio>
            <el-radio value="error">报错终止</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="导入说明">
          <div class="import-tips">
            <p>• 请确保 Excel 文件格式正确，第一行为表头</p>
            <p>• 建议先下载模板，按模板格式填写数据</p>
            <p>• 导入过程中请勿关闭页面</p>
          </div>
        </el-form-item>
      </el-form>

      <div class="import-actions">
        <el-button @click="resetImport">重置</el-button>
        <el-button 
          type="primary" 
          @click="startImport" 
          :loading="importing"
          :disabled="previewData.length === 0 || validationErrors.length > 0"
        >
          {{ importing ? '导入中...' : '开始导入' }}
        </el-button>
      </div>

      <!-- 导入进度 -->
      <div v-if="importing" class="import-progress">
        <el-progress :percentage="importProgress" :status="importProgress === 100 ? 'success' : ''" />
        <p class="progress-text">{{ progressText }}</p>
      </div>
    </el-card>

    <!-- 导入结果 -->
    <el-dialog v-model="resultDialogVisible" title="导入结果" width="500px">
      <div class="import-result">
        <el-icon class="result-icon" :class="importResult.success ? 'success' : 'error'">
          <SuccessFilled v-if="importResult.success" />
          <CircleCloseFilled v-else />
        </el-icon>
        <h3>{{ importResult.success ? '导入成功' : '导入失败' }}</h3>
        <div class="result-stats">
          <div class="stat-item">
            <span class="label">总计数据：</span>
            <span class="value">{{ importResult.total }} 条</span>
          </div>
          <div class="stat-item">
            <span class="label">成功导入：</span>
            <span class="value success">{{ importResult.successCount }} 条</span>
          </div>
          <div class="stat-item">
            <span class="label">跳过重复：</span>
            <span class="value warning">{{ importResult.skippedCount }} 条</span>
          </div>
          <div class="stat-item">
            <span class="label">失败记录：</span>
            <span class="value error">{{ importResult.failedCount }} 条</span>
          </div>
        </div>
        <div v-if="importResult.errors.length > 0" class="result-errors">
          <h4>失败原因：</h4>
          <ul>
            <li v-for="(err, idx) in importResult.errors.slice(0, 10)" :key="idx">
              {{ err }}
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="resultDialogVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeft, Document, UploadFilled, Close, SuccessFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'

// ★ v0816-17: xlsx(5MB源码) 改成 dynamic import → Rollup transform 阶段不加载其 AST，省 ~100MB 内存
const ensureXLSX = async () => import('xlsx')

definePageMeta({
  middleware: ['auth', 'role'],
  allowedRoles: ['admin'],
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const uploadRef = ref<UploadInstance>()
const selectedType = ref('')
const selectedFile = ref<File | null>(null)
const previewData = ref<any[]>([])
const previewColumns = ref<string[]>([])
const validationErrors = ref<{ row: number; message: string }[]>([])
const duplicateStrategy = ref('skip')
const importing = ref(false)
const importProgress = ref(0)
const progressText = ref('')
const resultDialogVisible = ref(false)
const importResult = ref({
  success: false,
  total: 0,
  successCount: 0,
  skippedCount: 0,
  failedCount: 0,
  errors: [] as string[],
})

const importTypes = [
  {
    type: 'users',
    label: '用户导入',
    desc: '批量导入用户账号信息',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    type: 'schedules',
    label: '工作台账导入',
    desc: '批量导入工作台账记录',
    color: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
]

const getToken = () => {
  const cookie = useCookie('auth_token')
  return cookie.value
}

const selectType = (type: string) => {
  selectedType.value = type
  resetImport()
}

const handleFileChange = (file: UploadFile) => {
  if (file.raw) {
    selectedFile.value = file.raw
    parseExcelFile(file.raw)
  }
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件，请先移除已选文件')
}

const removeFile = () => {
  selectedFile.value = null
  previewData.value = []
  previewColumns.value = []
  validationErrors.value = []
  uploadRef.value?.clearFiles()
}

const parseExcelFile = async (file: File) => {
  try {
    const data = await file.arrayBuffer()
    const XLSX = await ensureXLSX()
    const workbook = XLSX.read(data)
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(firstSheet)

    if (jsonData.length === 0) {
      ElMessage.warning('Excel 文件中没有数据')
      return
    }

    previewData.value = jsonData as any[]
    previewColumns.value = Object.keys(jsonData[0] as object)
    
    // 验证数据
    validateData(jsonData)
  } catch (error) {
    ElMessage.error('文件解析失败，请检查文件格式')
  }
}

const validateData = (data: any[]) => {
  validationErrors.value = []
  
  data.forEach((row, index) => {
    if (selectedType.value === 'users') {
      if (!row.username) validationErrors.value.push({ row: index, message: '用户名不能为空' })
      if (!row.password) validationErrors.value.push({ row: index, message: '密码不能为空' })
      if (!row.realName) validationErrors.value.push({ row: index, message: '真实姓名不能为空' })
      if (!row.teamCode) validationErrors.value.push({ row: index, message: '团队不能为空' })
      if (!row.role) validationErrors.value.push({ row: index, message: '角色不能为空' })
    } else if (selectedType.value === 'schedules') {
      if (!row.date) validationErrors.value.push({ row: index, message: '日期不能为空' })
      if (!row.firstType) validationErrors.value.push({ row: index, message: '一级分类不能为空' })
      if (!row.secondType) validationErrors.value.push({ row: index, message: '二级分类不能为空' })
    }
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const getRowError = (index: number): boolean => {
  return validationErrors.value.some(err => err.row === index)
}

const downloadTemplate = async () => {
  try {
    const token = getToken()
    const response = await $fetch(`${apiBase}/admin/export/template`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      query: { type: selectedType.value },
      responseType: 'blob',
    })

    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `template_${selectedType.value}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('模板已下载')
  } catch (error: any) {
    ElMessage.error(error.data?.message || '下载模板失败')
  }
}

const startImport = async () => {
  if (!selectedFile.value || previewData.value.length === 0) return

  importing.value = true
  importProgress.value = 0
  progressText.value = '正在准备导入...'

  try {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('type', selectedType.value)
    formData.append('duplicateStrategy', duplicateStrategy.value)

    // 模拟进度
    const progressInterval = setInterval(() => {
      if (importProgress.value < 90) {
        importProgress.value += 10
        progressText.value = `正在导入... ${importProgress.value}%`
      }
    }, 300)

    const response = await $fetch(`${apiBase}/admin/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    clearInterval(progressInterval)
    importProgress.value = 100
    progressText.value = '导入完成'

    importResult.value = {
      success: true,
      total: response.total || previewData.value.length,
      successCount: response.successCount || 0,
      skippedCount: response.skippedCount || 0,
      failedCount: response.failedCount || 0,
      errors: response.errors || [],
    }
    resultDialogVisible.value = true
  } catch (error: any) {
    importResult.value = {
      success: false,
      total: previewData.value.length,
      successCount: 0,
      skippedCount: 0,
      failedCount: previewData.value.length,
      errors: [error.data?.message || '导入失败，请检查数据格式'],
    }
    resultDialogVisible.value = true
  } finally {
    importing.value = false
  }
}

const resetImport = () => {
  selectedFile.value = null
  previewData.value = []
  previewColumns.value = []
  validationErrors.value = []
  importProgress.value = 0
  progressText.value = ''
  uploadRef.value?.clearFiles()
}
</script>

<style scoped>
.data-import-page {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
}

.mb-4 {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.import-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.import-type-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 2px solid #e8e8e8;
  cursor: pointer;
  transition: all 0.2s;
}

.import-type-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.import-type-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  color: white;
  flex-shrink: 0;
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.type-info p {
  margin: 0;
  font-size: 13px;
  color: #808080;
}

.import-upload {
  width: 100%;
}

.import-upload :deep(.el-upload) {
  width: 100%;
}

.import-upload :deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.file-info .el-icon {
  color: #409eff;
}

.file-info .file-size {
  margin-left: auto;
  color: #909399;
  font-size: 13px;
}

.validation-errors {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef0f0;
  border-radius: 6px;
  border: 1px solid #fde2e2;
}

.validation-errors h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #f56c6c;
}

.validation-errors ul {
  margin: 0;
  padding-left: 20px;
}

.validation-errors li {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.import-tips {
  color: #909399;
  font-size: 13px;
  line-height: 1.8;
}

.import-tips p {
  margin: 0;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.import-progress {
  margin-top: 20px;
}

.import-progress .progress-text {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #606266;
  text-align: center;
}

.import-result {
  text-align: center;
  padding: 20px 0;
}

.result-icon {
  font-size: 64px;
}

.result-icon.success {
  color: #67c23a;
}

.result-icon.error {
  color: #f56c6c;
}

.import-result h3 {
  margin: 16px 0 24px 0;
  font-size: 18px;
  font-weight: 600;
}

.result-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  text-align: left;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.stat-item .label {
  color: #909399;
}

.stat-item .value {
  font-weight: 600;
}

.stat-item .value.success {
  color: #67c23a;
}

.stat-item .value.warning {
  color: #e6a23c;
}

.stat-item .value.error {
  color: #f56c6c;
}

.result-errors {
  margin-top: 20px;
  text-align: left;
  padding: 12px 16px;
  background: #fef0f0;
  border-radius: 6px;
  border: 1px solid #fde2e2;
}

.result-errors h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #f56c6c;
}

.result-errors ul {
  margin: 0;
  padding-left: 20px;
}

.result-errors li {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}
</style>
