<template>
  <div class="collect-page">
    <!-- 任务头部信息 -->
    <div class="task-header">
      <div class="task-header-left">
        <el-button link @click="goBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="task-title-section">
          <h2 class="task-title">{{ taskInfo.templateName || '任务填写' }}</h2>
          <el-tag size="small" :type="getTypeTagType(taskInfo.templateType)">
            {{ getTypeLabel(taskInfo.templateType) }}
          </el-tag>
        </div>
      </div>
      <div class="task-header-right">
        <div v-if="isOffline" class="offline-badge">
          <el-icon><Warning /></el-icon>
          离线模式 · 数据将在网络恢复后同步
        </div>
        <div v-if="deadline" class="deadline-countdown">
          <span class="deadline-label">截止时间：</span>
          <span class="deadline-value" :class="{ urgent: isUrgent }">
            {{ deadlineText }}
          </span>
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <div v-if="!submitted" class="progress-section">
      <div class="progress-header">
        <span class="progress-label">完成进度</span>
        <span class="progress-text">{{ completedFields }}/{{ totalFields }} 项</span>
      </div>
      <el-progress
        :percentage="progressPercent"
        :stroke-width="8"
        :color="progressColor"
      />
    </div>

    <!-- 表单渲染 -->
    <div v-if="!submitted" v-loading="loading" class="form-section">
      <div v-if="taskInfo.items && taskInfo.items.length > 0" class="form-card">
        <el-form
          ref="formRef"
          :model="formData"
          label-position="top"
          class="collect-form"
          :rules="formRules"
        >
          <template v-for="(field, index) in taskInfo.items" :key="index">
            <!-- 分区标题 -->
            <div v-if="field.fieldType === 'section'" class="form-section-title">
              {{ field.fieldLabel }}
            </div>

            <!-- 条件隐藏字段 -->
            <el-row v-else-if="isFieldVisible(field)" :gutter="24" class="form-field-row">
              <el-col :span="getFieldSpan(field.fieldType)">
                <el-form-item
                  :label="field.fieldLabel"
                  :required="field.isRequired"
                  :prop="`field_${index}`"
                >
                  <!-- 提示文字 -->
                  <div v-if="field.helpText" class="field-help-text">{{ field.helpText }}</div>

                  <!-- 文本输入 -->
                  <el-input
                    v-if="field.fieldType === 'text'"
                    v-model="formData[`field_${index}`]"
                    :placeholder="`请输入${field.fieldLabel}`"
                  />

                  <!-- 多行文本 -->
                  <el-input
                    v-else-if="field.fieldType === 'textarea'"
                    v-model="formData[`field_${index}`]"
                    type="textarea"
                    :rows="4"
                    :placeholder="`请输入${field.fieldLabel}`"
                  />

                  <!-- 评分（星级） -->
                  <div v-else-if="field.fieldType === 'rating'" class="rating-field">
                    <el-rate
                      v-model="formData[`field_${index}`]"
                      :max="5"
                      :show-text="true"
                      text-color="#e6a23c"
                      style="font-size: 20px"
                    />
                  </div>

                  <!-- 下拉选择 -->
                  <el-select
                    v-else-if="field.fieldType === 'select'"
                    v-model="formData[`field_${index}`]"
                    :placeholder="`请选择${field.fieldLabel}`"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="(opt, oi) in (field.options || [])"
                      :key="oi"
                      :label="opt"
                      :value="opt"
                    />
                  </el-select>

                  <!-- 多选 -->
                  <el-checkbox-group
                    v-else-if="field.fieldType === 'multi_select'"
                    v-model="formData[`field_${index}`]"
                  >
                    <el-checkbox
                      v-for="(opt, oi) in (field.options || [])"
                      :key="oi"
                      :label="opt"
                      :value="opt"
                    />
                  </el-checkbox-group>

                  <!-- 勾选清单专用：单个勾选框（每个字段就是一个检查项） -->
                  <div v-else-if="field.fieldType === 'checkbox'" class="checkbox-field">
                    <el-checkbox v-model="formData[`field_${index}`]">
                      {{ field.fieldLabel }}
                    </el-checkbox>
                  </div>

                  <!-- 数字 -->
                  <el-input-number
                    v-else-if="field.fieldType === 'number'"
                    v-model="formData[`field_${index}`]"
                    :placeholder="`请输入${field.fieldLabel}`"
                    style="width: 100%"
                  />

                  <!-- 日期 -->
                  <el-date-picker
                    v-else-if="field.fieldType === 'date'"
                    v-model="formData[`field_${index}`]"
                    type="date"
                    :placeholder="`请选择${field.fieldLabel}`"
                    style="width: 100%"
                    value-format="YYYY-MM-DD"
                  />

                  <!-- 附件上传 -->
                  <div v-else-if="field.fieldType === 'attachment'" class="attachment-upload">
                    <el-upload
                      :ref="`upload_${index}`"
                      action="/api/file/upload"
                      :auto-upload="false"
                      :limit="field.maxCount || 5"
                      :on-change="(file, files) => handleAttachmentChange(file, files, index)"
                      :file-list="attachmentFiles[index] || []"
                      multiple
                    >
                      <el-button size="small" type="primary">
                        <el-icon><Upload /></el-icon>
                        选择附件
                      </el-button>
                      <template #tip>
                        <div class="el-upload__tip">最多上传 {{ field.maxCount || 5 }} 个附件</div>
                      </template>
                    </el-upload>
                  </div>

                  <!-- 默认文本输入 -->
                  <el-input
                    v-else
                    v-model="formData[`field_${index}`]"
                    :placeholder="`请输入${field.fieldLabel}`"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </template>
        </el-form>
      </div>

      <div v-else-if="!loading" class="empty-form">
        <el-empty description="该任务暂无表单字段" />
      </div>
    </div>

    <!-- 底部操作 -->
    <div v-if="!submitted" class="form-footer">
      <div class="footer-left">
        <span class="last-saved" v-if="lastSaved">
          <el-icon><Clock /></el-icon>
          上次保存：{{ lastSaved }}
        </span>
      </div>
      <div class="footer-right">
        <el-button @click="handleSaveDraft" :loading="saving" size="large">
          <el-icon><Document /></el-icon>
          保存草稿
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting" size="large">
          <el-icon><Check /></el-icon>
          提交
        </el-button>
      </div>
    </div>

    <!-- 提交成功确认页 -->
    <div v-if="submitted" class="submit-success-page">
      <div class="success-icon">
        <el-icon size="64"><CircleCheckFilled /></el-icon>
      </div>
      <h2 class="success-title">提交成功</h2>
      <p class="success-desc">您的{{ taskInfo.templateName || '任务' }}已成功提交</p>
      <div class="success-info">
        <div class="info-item">
          <span class="info-label">提交时间</span>
          <span class="info-value">{{ submittedTime }}</span>
        </div>
      </div>
      <el-button type="primary" size="large" @click="goBack" class="back-to-list-btn">
        返回任务列表
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, onBeforeUnmount, watch } from 'vue'
import { ArrowLeft, Clock, Document, Check, Upload, CircleCheckFilled, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const formRef = ref()
const lastSaved = ref('')
const submitted = ref(false)
const submittedTime = ref('')
const isOffline = computed(() => !navigator.onLine)

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

const taskId = computed(() => {
  const id = (route.query.taskId || route.query.templateId) as string
  return id ? parseInt(id, 10) : null
})

interface TaskField {
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOptions?: string
  options?: string[]
  isRequired: boolean
  sortOrder: number
  helpText?: string
  showWhen?: { field: string; value?: string; not?: string }
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
    patternMsg?: string
  }
}

interface TaskInfo {
  id?: number
  templateName: string
  templateType: string
  deadline?: string
  items: TaskField[]
}

const taskInfo = reactive<TaskInfo>({
  templateName: '',
  templateType: '',
  items: [],
})

const formData = reactive<Record<string, any>>({})
const formRules = reactive<Record<string, any>>({})

const deadline = computed(() => {
  return taskInfo.deadline || ''
})

const deadlineText = computed(() => {
  if (!deadline.value) return '未设置'
  const now = Date.now()
  const target = new Date(deadline.value).getTime()
  const diff = target - now

  if (diff < 0) return '已截止'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `剩余 ${days} 天 ${hours} 小时`
  if (hours > 0) return `剩余 ${hours} 小时 ${minutes} 分钟`
  return `剩余 ${minutes} 分钟`
})

const isUrgent = computed(() => {
  if (!deadline.value) return false
  const diff = new Date(deadline.value).getTime() - Date.now()
  return diff < 1000 * 60 * 60 * 24 // Less than 24 hours
})

const totalFields = computed(() => taskInfo.items.filter(f => f.fieldType !== 'section').length)

const completedFields = computed(() => {
  let count = 0
  taskInfo.items.forEach((field, index) => {
    if (field.fieldType === 'section') return
    const val = formData[`field_${index}`]
    if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
      count++
    }
  })
  return count
})

const progressPercent = computed(() => {
  if (totalFields.value === 0) return 0
  return Math.round((completedFields.value / totalFields.value) * 100)
})

const progressColor = computed(() => {
  if (progressPercent.value >= 100) return '#67c23a'
  if (progressPercent.value >= 50) return '#1677ff'
  return '#e6a23c'
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

function getFieldOptions(optionsStr: string | string[] | undefined | null): string[] {
  if (!optionsStr) return []
  if (Array.isArray(optionsStr)) return optionsStr
  if (typeof optionsStr === 'string') {
    try {
      const parsed = JSON.parse(optionsStr)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function normalizeField(field: any, index: number): TaskField {
  const fieldName = field.fieldName || field.name || `field_${index}`
  const fieldLabel = field.fieldLabel || field.label || ''
  const fieldType = field.fieldType || field.type || 'text'
  const isRequired = field.isRequired ?? field.required ?? false
  const helpText = field.helpText || ''
  const sortOrder = field.sortOrder ?? index
  const maxCount = field.maxCount ?? null

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

  let showWhen: TaskField['showWhen'] = null
  if (field.showWhen) {
    if (typeof field.showWhen === 'string') {
      try {
        const parsed = JSON.parse(field.showWhen)
        if (parsed && typeof parsed === 'object' && parsed.field) {
          showWhen = parsed
        }
      } catch {
        showWhen = null
      }
    } else if (typeof field.showWhen === 'object' && field.showWhen.field) {
      showWhen = field.showWhen
    }
  }

  let validation: TaskField['validation'] = null
  if (field.validation) {
    if (typeof field.validation === 'string') {
      try {
        const parsed = JSON.parse(field.validation)
        if (parsed && typeof parsed === 'object') {
          validation = parsed
        }
      } catch {
        validation = null
      }
    } else if (typeof field.validation === 'object') {
      validation = field.validation
    }
  }

  return {
    fieldName,
    fieldLabel,
    fieldType,
    fieldOptions,
    options,
    isRequired,
    helpText,
    showWhen,
    validation,
    maxCount,
    sortOrder,
  }
}

// 条件逻辑：判断字段是否可见
function isFieldVisible(field: TaskField): boolean {
  if (!field.showWhen) return true
  const { field: targetFieldName, value, not } = field.showWhen

  // 找到目标字段的索引和当前值
  const targetIndex = taskInfo.items.findIndex(f => f.fieldName === targetFieldName || f.name === targetFieldName)
  if (targetIndex === -1) return true

  const targetValue = formData[`field_${targetIndex}`]

  if (value !== undefined) {
    return targetValue === value
  }
  if (not !== undefined) {
    return targetValue !== not
  }
  return true
}

function getFieldSpan(fieldType: string): number {
  if (fieldType === 'textarea' || fieldType === 'attachment') return 24
  if (fieldType === 'group') return 24
  return 12
}

const attachmentFiles = reactive<Record<string, any[]>>({})

function handleAttachmentChange(file: any, fileList: any[], index: number) {
  attachmentFiles[`field_${index}`] = fileList
}

function initFormData() {
  taskInfo.items.forEach((field, index) => {
    const key = `field_${index}`
    if (field.fieldType === 'checkbox' || field.fieldType === 'multi_select') {
      formData[key] = []
    } else if (field.fieldType === 'number') {
      formData[key] = null
    } else if (field.fieldType === 'attachment') {
      formData[key] = []
      attachmentFiles[key] = []
    } else {
      formData[key] = ''
    }
  })
}

function buildFormRules() {
  taskInfo.items.forEach((field, index) => {
    const key = `field_${index}`
    const rules: any[] = []

    if (field.isRequired) {
      rules.push({
        required: true,
        message: `请填写${field.fieldLabel}`,
        trigger: ['blur', 'change'],
      })
    }

    const v = field.validation
    if (v) {
      if (v.minLength) {
        rules.push({
          min: v.minLength,
          message: `最少输入${v.minLength}个字符`,
          trigger: 'blur',
        })
      }
      if (v.maxLength) {
        rules.push({
          max: v.maxLength,
          message: `最多输入${v.maxLength}个字符`,
          trigger: 'blur',
        })
      }
      if (v.min !== undefined) {
        rules.push({
          type: 'number',
          min: v.min,
          message: `最小值为${v.min}`,
          trigger: 'blur',
        })
      }
      if (v.max !== undefined) {
        rules.push({
          type: 'number',
          max: v.max,
          message: `最大值为${v.max}`,
          trigger: 'blur',
        })
      }
      if (v.pattern) {
        rules.push({
          pattern: new RegExp(v.pattern),
          message: v.patternMsg || '格式不正确',
          trigger: 'blur',
        })
      }
    }

    if (rules.length > 0) {
      formRules[key] = rules
    }
  })
}

async function loadTask() {
  if (!taskId.value) {
    ElMessage.warning('缺少任务ID参数')
    return
  }
  loading.value = true
  try {
    const result = await api.apiFetch(`/publish-templates/${taskId.value}`)
    if (result) {
      taskInfo.templateName = result.templateName || result.title || ''
      taskInfo.templateType = result.templateType || ''
      taskInfo.deadline = result.deadline || result.fileConfig?.deadline || ''
      const rawItems = result.items || []
      taskInfo.items = Array.isArray(rawItems) 
        ? rawItems.map((item: any, idx: number) => normalizeField(item, idx))
        : []
      initFormData()
      buildFormRules()
    }

    // 加载已有草稿数据
    const shipId = route.query.shipId as string
    if (shipId && taskId.value) {
      try {
        const taskStatus = await api.apiFetch(`/ship-tasks?shipId=${shipId}&templateId=${taskId.value}`)
        if (taskStatus && Array.isArray(taskStatus) && taskStatus.length > 0) {
          const existingData = taskStatus[0]
          if (existingData.responseData) {
            Object.keys(existingData.responseData).forEach(key => {
              formData[key] = existingData.responseData[key]
            })
          }
        }
      } catch {
        // 静默忽略
      }
    }
  } catch {
    // Error handled by apiFetch
  } finally {
    loading.value = false
  }
}

async function handleSaveDraft() {
  saving.value = true
  try {
    const payload = {
      taskId: taskId.value,
      data: { ...formData },
      status: 'draft',
    }
    await api.apiFetch(`/ship-tasks/${taskId.value}/draft`, {
      method: 'POST',
      body: payload,
    })
    lastSaved.value = new Date().toLocaleString('zh-CN')
    ElMessage.success('草稿已保存')
  } catch {
    // Error handled by apiFetch
  } finally {
    saving.value = false
  }
}

// 明细题：添加一行记录
function addGroupRow(index: number) {
  if (!formData[`field_${index}`]) {
    formData[`field_${index}`] = []
  }
  formData[`field_${index}`].push({})
}

// 明细题：删除一行记录
function removeGroupRow(index: number, rowIdx: number) {
  if (formData[`field_${index}`]) {
    formData[`field_${index}`].splice(rowIdx, 1)
  }
}

// 明细题：确保数据已初始化
function ensureGroupData(index: number) {
  if (!formData[`field_${index}`]) {
    formData[`field_${index}`] = []
  }
  return formData[`field_${index}`]
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请完成必填项')
    return
  }

  submitting.value = true
  try {
    const payload = {
      taskId: taskId.value,
      data: { ...formData },
      status: 'completed',
    }
    await api.apiFetch(`/ship-tasks/${taskId.value}/submit`, {
      method: 'POST',
      body: payload,
    })
    submitted.value = true
    submittedTime.value = new Date().toLocaleString('zh-CN')
  } catch {
    // Error handled by apiFetch
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}

// 自动保存：watch formData 变化，debounce 3秒后保存草稿
watch(formData, () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(async () => {
    if (!taskId.value) return
    try {
      const payload = {
        data: { ...formData },
        status: 'draft',
      }
      await api.apiFetch(`/ship-tasks/${taskId.value}`, {
        method: 'PUT',
        body: payload,
      })
      lastSaved.value = new Date().toLocaleString('zh-CN')
    } catch {
      // 静默失败，不打扰用户
    }
  }, 3000)
}, { deep: true })

onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
})

onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
})

onMounted(() => {
  loadTask()
})
</script>

<style scoped>
.collect-page {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

/* 分区标题 */
.form-section-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  padding: 16px 0 8px 12px;
  margin-top: 8px;
  border-bottom: 2px solid #409eff;
  margin-bottom: 12px;
  letter-spacing: 1px;
  border-left: 4px solid #1677ff;
}

.form-field-row {
  margin-bottom: 8px;
}

/* 字段提示文字 */
.field-help-text {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
  line-height: 1.4;
}

/* 任务头部 */
.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.task-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  font-size: 14px;
  color: #606266;
}

.task-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.task-header-right {
  display: flex;
  align-items: center;
}

.deadline-countdown {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.deadline-label {
  font-size: 13px;
  color: #909399;
}

.deadline-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.deadline-value.urgent {
  color: #f56c6c;
}

/* 离线状态指示 */
.offline-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #fdf6ec;
  border: 1px solid #e6a23c;
  border-radius: 8px;
  font-size: 13px;
  color: #e6a23c;
  margin-right: 12px;
}

/* 进度条 */
.progress-section {
  padding: 20px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.progress-text {
  font-size: 13px;
  color: #909399;
}

/* 表单区域 */
.form-section {
  min-height: 300px;
  margin-bottom: 20px;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.form-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.collect-form {
  max-width: 900px;
}

.empty-form {
  background: #fff;
  border-radius: 12px;
  padding: 60px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 底部操作 */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.footer-left {
  display: flex;
  align-items: center;
}

.last-saved {
  font-size: 12px;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-right {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .collect-page {
    padding: 12px;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
  }

  .task-header-right {
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }

  .deadline-countdown {
    width: 100%;
    justify-content: center;
  }

  .offline-badge {
    width: 100%;
    justify-content: center;
    margin-right: 0;
    margin-bottom: 8px;
  }

  .form-card {
    padding: 16px;
    border-radius: 8px;
  }

  .form-field-row {
    margin-bottom: 12px;
  }

  .form-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 0;
    padding: 12px 16px;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    background: #fff;
  }

  .form-section {
    margin-bottom: 80px;
  }

  .collect-form :deep(.el-col) {
    max-width: 100% !important;
    flex: 0 0 100% !important;
  }

  .progress-section {
    padding: 16px;
    border-radius: 8px;
  }

  .submit-success-page {
    padding: 40px 20px;
  }
}

/* 提交成功确认页 */
.submit-success-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  min-height: 400px;
}

.success-icon {
  color: #67c23a;
  margin-bottom: 24px;
}

.success-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 12px;
}

.success-desc {
  font-size: 15px;
  color: #606266;
  margin: 0 0 32px;
}

.success-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
  padding: 20px 32px;
  background: #f5f7fa;
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.back-to-list-btn {
  min-width: 200px;
}

/* 明细题（group） */
.group-field {
  margin-top: 8px;
}

.group-rows {
  display: flex;
  flex-direction: column;
}

.group-row {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  position: relative;
}

.group-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.group-row-title {
  font-size: 14px;
  font-weight: 500;
  color: #4e5969;
}

.group-sub-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.group-sub-field {
  display: flex;
  flex-direction: column;
}

.group-sub-field-label {
  font-size: 13px;
  color: #4e5969;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-sub-required {
  color: #ff4d4f;
}

.add-group-row-btn {
  width: 100%;
  margin-top: 8px;
}
</style>