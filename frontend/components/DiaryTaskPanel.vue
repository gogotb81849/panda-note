<template>
  <div class="diary-task-panel">
    <h3 class="text-xl font-bold mb-4">任务面板</h3>

    <!-- Template Selector -->
    <div class="mb-4">
      <el-select
        v-model="selectedTemplateId"
        placeholder="选择任务模板"
        style="width: 100%"
        @change="handleTemplateChange"
      >
        <el-option
          v-for="tpl in templates"
          :key="tpl.id"
          :label="tpl.templateName"
          :value="tpl.id"
        >
          <span>{{ tpl.templateName }}</span>
          <el-tag size="small" class="ml-2" :type="tpl.templateType === 'ship_dynamic' ? 'primary' : 'success'">
            {{ tpl.templateType === 'ship_dynamic' ? '船舶动态' : '靠港检查' }}
          </el-tag>
        </el-option>
      </el-select>
    </div>

    <!-- Progress Bar -->
    <div v-if="selectedTemplateId" class="mb-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">完成进度</span>
        <span class="text-sm" :class="getProgressColorClass(progress)">{{ progress }}%</span>
      </div>
      <el-progress
        :percentage="progress"
        :color="getProgressColor(progress)"
        :stroke-width="10"
      />
    </div>

    <!-- Ship Dynamic Form -->
    <div v-if="currentTemplate?.templateType === 'ship_dynamic'" class="ship-dynamic-form">
      <h4 class="text-lg font-medium mb-3">船舶动态报告</h4>
      <el-form :model="formValues" label-position="top">
        <el-form-item
          v-for="item in templateItems"
          :key="item.fieldName"
          :label="item.fieldLabel"
          :required="item.isRequired"
        >
          <!-- Text Input -->
          <el-input
            v-if="item.fieldType === 'text'"
            v-model="formValues[item.fieldName]"
            :placeholder="'请输入' + item.fieldLabel"
          />

          <!-- Textarea -->
          <el-input
            v-else-if="item.fieldType === 'textarea'"
            v-model="formValues[item.fieldName]"
            type="textarea"
            :rows="3"
            :placeholder="'请输入' + item.fieldLabel"
          />

          <!-- Select -->
          <el-select
            v-else-if="item.fieldType === 'select'"
            v-model="formValues[item.fieldName]"
            :placeholder="'请选择' + item.fieldLabel"
            style="width: 100%"
          >
            <el-option
              v-for="opt in parseOptions(item.fieldOptions)"
              :key="opt"
              :label="opt"
              :value="opt"
            />
          </el-select>

          <!-- Checkbox -->
          <el-checkbox
            v-else-if="item.fieldType === 'checkbox'"
            v-model="formValues[item.fieldName]"
          >
            {{ item.fieldLabel }}
          </el-checkbox>

          <!-- Number -->
          <el-input-number
            v-else-if="item.fieldType === 'number'"
            v-model="formValues[item.fieldName]"
            :placeholder="'请输入' + item.fieldLabel"
            style="width: 100%"
          />

          <!-- Date -->
          <el-date-picker
            v-else-if="item.fieldType === 'date'"
            v-model="formValues[item.fieldName]"
            type="date"
            :placeholder="'请选择' + item.fieldLabel"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>

      <el-button type="primary" class="mt-4" @click="submitForm" :loading="submitting">
        提交报告
      </el-button>
    </div>

    <!-- Port Call Checklist -->
    <div v-else-if="currentTemplate?.templateType === 'port_call_check'" class="port-call-checklist">
      <h4 class="text-lg font-medium mb-3">靠港检查清单</h4>
      <el-table :data="checkItems" stripe style="width: 100%">
        <el-table-column label="序号" width="60">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="fieldLabel" label="检查项目" min-width="200" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getItemStatusType(row.status)" size="small">
              {{ getItemStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="completedDate" label="完成时间" width="160">
          <template #default="{ row }">
            <span v-if="row.completedDate">{{ formatDate(row.completedDate) }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.status === 'completed' ? 'warning' : 'success'"
              link
              @click="toggleItemStatus(row)"
            >
              {{ row.status === 'completed' ? '撤销' : '完成' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 p-4 bg-gray-50 rounded-lg">
        <p class="text-sm text-gray-500">
          <el-icon class="mr-1"><InfoFilled /></el-icon>
          右键点击检查项目可快速标记完成状态或填写完成日期
        </p>
      </div>
    </div>

    <!-- Context Menu for Checklist Items -->
    <div
      v-if="contextMenu.visible"
      class="fixed z-50 bg-white rounded-lg shadow-xl border p-2 min-w-[180px]"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div
        class="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm flex items-center gap-2"
        @click="markItemComplete"
      >
        <el-icon color="#67c23a"><CircleCheck /></el-icon>标记为完成
      </div>
      <div
        class="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm flex items-center gap-2"
        @click="markItemIncomplete"
      >
        <el-icon color="#909399"><CircleClose /></el-icon>标记为未完成
      </div>
      <div
        class="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm flex items-center gap-2 border-t mt-1 pt-2"
        @click="setCompletionDate"
      >
        <el-icon><Calendar /></el-icon>设置完成时间
      </div>
    </div>

    <!-- Click outside to close context menu -->
    <div v-if="contextMenu.visible" class="fixed inset-0 z-40" @click="closeContextMenu" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  CircleCheck, CircleClose, Calendar, InfoFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { PublishTemplate, PublishTemplateItem, ShipTaskItem } from '~/types'

const api = useApi()
const loading = ref(false)
const submitting = ref(false)
const templates = ref<PublishTemplate[]>([])
const selectedTemplateId = ref<number | null>(null)
const currentTemplate = ref<PublishTemplate | null>(null)
const templateItems = ref<PublishTemplateItem[]>([])
const checkItems = ref<ShipTaskItem[]>([])
const formValues = reactive<Record<string, any>>({})
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  currentItem: null as ShipTaskItem | null,
})

onMounted(() => {
  fetchTemplates()
  nextTick(() => {
    attachContextMenuListener()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

function attachContextMenuListener() {
  nextTick(() => {
    const tableBody = document.querySelector('.port-call-checklist .el-table__body-wrapper')
    if (tableBody) {
      tableBody.addEventListener('contextmenu', handleTableContextMenu)
    }
  })
}

function handleTableContextMenu(e: MouseEvent) {
  const row = (e.target as HTMLElement).closest('.el-table__row')
  if (row && currentTemplate.value?.templateType === 'port_call_check') {
    const rowIndex = parseInt(row.getAttribute('data-index') || '0')
    if (checkItems.value[rowIndex]) {
      e.preventDefault()
      contextMenu.value = {
        visible: true,
        x: e.clientX,
        y: e.clientY,
        currentItem: checkItems.value[rowIndex],
      }
    }
  }
}

async function fetchTemplates() {
  loading.value = true
  try {
    templates.value = await api.publishTemplates.list()
  } catch (e: any) {
    // Error handled by apiFetch
  } finally {
    loading.value = false
  }
}

async function handleTemplateChange(templateId: number | null) {
  if (!templateId) {
    currentTemplate.value = null
    templateItems.value = []
    checkItems.value = []
    Object.keys(formValues).forEach(k => delete formValues[k])
    return
  }

  loading.value = true
  try {
    const template = await api.publishTemplates.get(templateId)
    currentTemplate.value = template
    templateItems.value = template.items || []

    if (template.templateType === 'ship_dynamic') {
      // Initialize form values
      Object.keys(formValues).forEach(k => delete formValues[k])
      template.items?.forEach(item => {
        formValues[item.fieldName] = item.fieldType === 'checkbox' ? false : ''
      })
    } else if (template.templateType === 'port_call_check') {
      // Initialize check items
      checkItems.value = (template.items || []).map(item => ({
        id: item.id || 0,
        taskId: templateId,
        fieldName: item.fieldName,
        fieldLabel: item.fieldLabel,
        status: 'not_started' as const,
        value: '',
        completedDate: '',
      }))
    }
  } catch (e: any) {
    // Error handled by apiFetch
  } finally {
    loading.value = false
  }
}

const progress = computed(() => {
  if (!currentTemplate.value) return 0

  if (currentTemplate.value.templateType === 'ship_dynamic') {
    const items = templateItems.value
    if (items.length === 0) return 0
    const completed = items.filter(item => {
      const val = formValues[item.fieldName]
      if (item.fieldType === 'checkbox') return val === true
      return val !== undefined && val !== null && val !== ''
    }).length
    return Math.round((completed / items.length) * 100)
  }

  if (currentTemplate.value.templateType === 'port_call_check') {
    const items = checkItems.value
    if (items.length === 0) return 0
    const completed = items.filter(item => item.status === 'completed').length
    return Math.round((completed / items.length) * 100)
  }

  return 0
})

function getProgressColorClass(prog: number): string {
  if (prog === 0) return 'text-red-500'
  if (prog === 100) return 'text-green-500'
  return 'text-yellow-500'
}

function getProgressColor(prog: number): string {
  if (prog === 0) return '#f56c6c'
  if (prog < 100) return '#e6a23c'
  return '#67c23a'
}

function parseOptions(options?: string): string[] {
  if (!options) return []
  try {
    return JSON.parse(options)
  } catch {
    return options.split(',').map(s => s.trim())
  }
}

function getItemStatusType(status: string): 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, any> = {
    not_started: 'info',
    in_progress: 'warning',
    completed: 'success',
  }
  return map[status] || 'info'
}

function getItemStatusText(status: string): string {
  const map: Record<string, string> = {
    not_started: '未开始',
    in_progress: '进行中',
    completed: '已完成',
  }
  return map[status] || status
}

function formatDate(date: string | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function toggleItemStatus(item: ShipTaskItem) {
  if (item.status === 'completed') {
    item.status = 'not_started'
    item.completedDate = ''
  } else {
    item.status = 'completed'
    item.completedDate = new Date().toISOString()
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.currentItem = null
}

function markItemComplete() {
  if (!contextMenu.value.currentItem) return
  const item = contextMenu.value.currentItem
  item.status = 'completed'
  item.completedDate = new Date().toISOString()
  ElMessage.success('已标记为完成')
  closeContextMenu()
}

function markItemIncomplete() {
  if (!contextMenu.value.currentItem) return
  const item = contextMenu.value.currentItem
  item.status = 'not_started'
  item.completedDate = ''
  ElMessage.success('已标记为未完成')
  closeContextMenu()
}

async function setCompletionDate() {
  if (!contextMenu.value.currentItem) return
  try {
    const { value } = await ElMessageBox.prompt('请输入完成时间', '设置完成时间', {
      inputType: 'datetime-local',
      inputValue: new Date().toISOString().slice(0, 16),
    })
    contextMenu.value.currentItem.completedDate = value
    ElMessage.success('完成时间已设置')
  } catch (e: any) {
    // User cancelled
  }
  closeContextMenu()
}

async function submitForm() {
  if (!currentTemplate.value) return

  // Validate required fields
  for (const item of templateItems.value) {
    if (item.isRequired) {
      const val = formValues[item.fieldName]
      if (item.fieldType === 'checkbox' && val === false) {
        ElMessage.warning(`请填写必填项: ${item.fieldLabel}`)
        return
      }
      if (item.fieldType !== 'checkbox' && (!val || val === '')) {
        ElMessage.warning(`请填写必填项: ${item.fieldLabel}`)
        return
      }
    }
  }

  submitting.value = true
  try {
    await api.diaries.create({
      templateId: currentTemplate.value.id,
      templateType: currentTemplate.value.templateType,
      data: { ...formValues },
      date: new Date().toISOString().split('T')[0],
    })
    ElMessage.success('报告已提交')
  } catch (e: any) {
    // Error handled by apiFetch
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.diary-task-panel {
  padding: 20px;
}
</style>
