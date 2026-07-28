<template>
  <div class="publish-manager">
    <!-- Template List -->
    <div class="flex items-center justify-between mb-6">
      <div></div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>新建模板
      </el-button>
    </div>

    <!-- Template Table -->
    <el-table :data="templates" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="templateName" label="模板名称" min-width="150" />
      <el-table-column label="模板类型" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.templateType === 'ship_dynamic'" type="primary">船舶动态</el-tag>
          <el-tag v-else-if="row.templateType === 'port_call_check'" type="success">靠港检查</el-tag>
          <el-tag v-else-if="row.templateType === 'file_collection'" type="warning">文件收集</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布范围" width="120">
        <template #default="{ row }">
          <span v-if="row.templateType === 'file_collection'" class="text-sm">-</span>
          <span v-else class="text-sm">{{ getTargetText(row.targetShips, row.targetValue) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'published' ? 'success' : 'info'">
            {{ row.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">
          <span class="text-sm text-gray-500">{{ formatDate(row.updatedAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="editTemplate(row)">编辑</el-button>
          <el-button size="small" type="warning" link @click="handleSaveAsDraft(row)" v-if="row.status !== 'draft'">存草稿</el-button>
          <el-button size="small" type="success" link @click="handlePublish(row)" v-if="row.status === 'draft'">发布</el-button>
          <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTemplateId ? '编辑模板' : '新建模板'"
      width="80%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="form" label-width="120px" class="template-form">
        <!-- Basic Info -->
        <el-form-item label="模板名称" required>
          <el-input v-model="form.templateName" placeholder="请输入模板名称" />
        </el-form-item>

        <el-form-item label="模板类型" required>
          <el-select v-model="form.templateType" placeholder="请选择模板类型" style="width: 100%">
            <el-option label="船舶动态" value="ship_dynamic" />
            <el-option label="靠港检查" value="port_call_check" />
            <el-option label="文件收集" value="file_collection" />
          </el-select>
        </el-form-item>

        <!-- File Collection Specific Fields -->
        <template v-if="form.templateType === 'file_collection'">
          <el-form-item label="简要说明">
            <el-input
              v-model="fileCollectionForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入任务描述（可选）"
            />
          </el-form-item>

          <el-form-item label="截止时间" required>
            <el-date-picker
              v-model="fileCollectionForm.deadline"
              type="datetime"
              placeholder="选择截止时间"
              class="w-full"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </el-form-item>

          <el-form-item label="文件类型">
            <div class="file-type-section">
              <div class="file-type-grid">
                <el-checkbox
                  v-for="ft in presetFileTypes"
                  :key="ft.value"
                  v-model="fileCollectionForm.fileTypes"
                  :value="ft.value"
                  :label="ft.label"
                />
              </div>
              <div class="custom-file-type">
                <el-input
                  v-model="newFileType"
                  placeholder="输入自定义文件类型（如：PPT）"
                  size="small"
                  style="width: 200px"
                  @keyup.enter="addCustomFileType"
                />
                <el-button size="small" @click="addCustomFileType">添加</el-button>
              </div>
              <div v-if="customFileTypes.length > 0" class="custom-tags">
                <el-tag
                  v-for="tag in customFileTypes"
                  :key="tag"
                  closable
                  size="small"
                  class="mr-1 mb-1"
                  @close="removeCustomFileType(tag)"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="命名规则">
            <el-select v-model="fileCollectionForm.namingRule" placeholder="选择预设命名规则" class="w-full">
              <el-option
                v-for="tpl in namingTemplates"
                :key="tpl.value"
                :label="tpl.label"
                :value="tpl.value"
              >
                <div class="naming-option">
                  <span>{{ tpl.label }}</span>
                  <span class="naming-example">{{ tpl.example }}</span>
                </div>
              </el-option>
            </el-select>
            <div v-if="namingPreview" class="naming-preview">
              <span class="preview-label">示例：</span>
              <span class="preview-text">{{ namingPreview }}</span>
            </div>
          </el-form-item>

          <el-form-item label="大小限制">
            <el-input-number v-model="fileCollectionForm.maxSize" :min="1" :max="100" :step="1" />
            <span class="ml-2 text-gray-500">MB</span>
          </el-form-item>
        </template>

        <!-- Publish Target (only for non-file-collection types) -->
        <template v-if="form.templateType !== 'file_collection'">
        <!-- Publish Target -->
        <el-form-item label="发布范围" required>
          <el-select v-model="form.targetShips" placeholder="请选择发布范围" style="width: 100%">
            <el-option label="全部船舶" value="all" />
            <el-option label="ETA前N天" value="eta_before" />
            <el-option label="指定航线" value="route" />
            <el-option label="自定义船舶" value="custom" />
          </el-select>
        </el-form-item>

        <el-form-item label="范围参数" v-if="form.targetShips !== 'all'">
          <el-input
            v-model="form.targetValue"
            :placeholder="getTargetPlaceholder(form.targetShips)"
          />
        </el-form-item>
        </template>

        <!-- Template Items -->
        <el-form-item label="模板项目">
          <div class="w-full">
            <el-table :data="form.items" border style="width: 100%">
              <el-table-column label="排序" width="50" align="center">
                <template #default="{ $index }">
                  <div class="sort-btns">
                    <el-button link size="small" :disabled="$index === 0" @click="moveItem($index, -1)">
                      <el-icon><ArrowUp /></el-icon>
                    </el-button>
                    <el-button link size="small" :disabled="$index === form.items.length - 1" @click="moveItem($index, 1)">
                      <el-icon><ArrowDown /></el-icon>
                    </el-button>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="字段名称" min-width="120">
                <template #default="{ row }">
                  <el-input v-model="row.fieldName" placeholder="字段标识(英文)" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="显示名称" min-width="120">
                <template #default="{ row }">
                  <el-input v-model="row.fieldLabel" placeholder="显示名称(中文)" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="字段类型" width="130">
                <template #default="{ row }">
                  <el-select v-model="row.fieldType" size="small" style="width: 100%">
                    <el-option label="文本" value="text" />
                    <el-option label="多行文本" value="textarea" />
                    <el-option label="下拉选择" value="select" />
                    <el-option label="复选框" value="checkbox" />
                    <el-option label="数字" value="number" />
                    <el-option label="日期" value="date" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="选项" min-width="150">
                <template #default="{ row }">
                  <el-input
                    v-model="row.fieldOptions"
                    placeholder='JSON数组, 如: ["选项1","选项2"]'
                    size="small"
                    v-if="row.fieldType === 'select'"
                  />
                </template>
              </el-table-column>
              <el-table-column label="必填" width="80">
                <template #default="{ row }">
                  <el-checkbox v-model="row.isRequired" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button size="small" type="danger" link @click="removeItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button class="mt-3" @click="addItem">
              <el-icon><Plus /></el-icon>添加字段
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handleSaveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="handleSavePublish" :loading="saving">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { PublishTemplate, PublishTemplateItem, FileCollectionConfig } from '~/types'

const api = useApi()
const loading = ref(false)
const saving = ref(false)
const templates = ref<PublishTemplate[]>([])
const dialogVisible = ref(false)
const editingTemplateId = ref<number | null>(null)

// File collection specific state
const fileCollectionForm = reactive<FileCollectionConfig>({
  description: '',
  fileTypes: [],
  namingRule: 'default',
  maxSize: 50,
  deadline: '',
})

const newFileType = ref('')
const customFileTypes = ref<string[]>([])

const presetFileTypes = [
  { label: 'PDF文档', value: 'pdf' },
  { label: 'Word文档', value: 'doc,docx' },
  { label: 'Excel表格', value: 'xls,xlsx' },
  { label: '图片', value: 'jpg,jpeg,png,gif,bmp' },
  { label: '视频', value: 'mp4,avi,mov' },
  { label: '压缩包', value: 'zip,rar,7z' },
]

const namingTemplates = [
  { label: '默认（船舶名称_提交人_日期）', value: 'default', example: '新金洋_张三_20260615.pdf' },
  { label: '按船舶名称排序（船舶名称_文件类型_日期）', value: 'byShipName', example: '新金洋_pdf_20260615.pdf' },
  { label: '按提交时间排序（日期_船舶名称_提交人）', value: 'bySubmitTime', example: '20260615_新金洋_张三.pdf' },
  { label: '按任务名称排序（任务名称_船舶名称_日期）', value: 'byTaskName', example: '月度报告_新金洋_20260615.pdf' },
  { label: '简洁模式（船舶名称_日期）', value: 'simple', example: '新金洋_20260615.pdf' },
]

const namingPreview = computed(() => {
  const tpl = fileCollectionForm.namingRule
  const template = namingTemplates.find((t) => t.value === tpl)
  return template ? template.example : ''
})

function addCustomFileType() {
  const type = newFileType.value.trim().toUpperCase()
  if (!type) return
  if (customFileTypes.value.includes(type)) {
    ElMessage.warning('该类型已存在')
    return
  }
  customFileTypes.value.push(type)
  fileCollectionForm.fileTypes.push(type)
  newFileType.value = ''
}

function removeCustomFileType(type: string) {
  customFileTypes.value = customFileTypes.value.filter((t) => t !== type)
  fileCollectionForm.fileTypes = fileCollectionForm.fileTypes.filter((t) => t !== type)
}

function resetFileCollectionForm() {
  fileCollectionForm.description = ''
  fileCollectionForm.fileTypes = []
  fileCollectionForm.namingRule = 'default'
  fileCollectionForm.maxSize = 50
  fileCollectionForm.deadline = ''
  newFileType.value = ''
  customFileTypes.value = []
}

const form = reactive<{
  templateName: string
  templateType: 'ship_dynamic' | 'port_call_check' | 'file_collection'
  targetShips: 'all' | 'eta_before' | 'route' | 'custom'
  targetValue: string
  items: PublishTemplateItem[]
}>({
  templateName: '',
  templateType: 'ship_dynamic',
  targetShips: 'all',
  targetValue: '',
  items: [],
})

onMounted(() => {
  fetchTemplates()
})

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

function openCreateDialog() {
  editingTemplateId.value = null
  resetForm()
  dialogVisible.value = true
}

function resetForm() {
  form.templateName = ''
  form.templateType = 'ship_dynamic'
  form.targetShips = 'all'
  form.targetValue = ''
  form.items = []
  resetFileCollectionForm()
}

function editTemplate(template: PublishTemplate) {
  editingTemplateId.value = template.id || null
  form.templateName = template.templateName
  form.templateType = template.templateType
  form.targetShips = template.targetShips
  form.targetValue = template.targetValue || ''
  form.items = (template.items || []).map(item => ({
    ...item,
    fieldOptions: item.fieldOptions || '',
  }))
  // Load file collection config if exists
  if (template.fileConfig) {
    fileCollectionForm.description = template.fileConfig.description || ''
    fileCollectionForm.fileTypes = [...template.fileConfig.fileTypes]
    fileCollectionForm.namingRule = template.fileConfig.namingRule || 'default'
    fileCollectionForm.maxSize = template.fileConfig.maxSize || 50
    fileCollectionForm.deadline = template.fileConfig.deadline || ''
    // Extract custom file types
    const presetValues = presetFileTypes.map(p => p.value)
    customFileTypes.value = template.fileConfig.fileTypes.filter((ft: string) => !presetValues.includes(ft))
  } else {
    resetFileCollectionForm()
  }
  dialogVisible.value = true
}

function addItem() {
  const newSortOrder = form.items.length
  form.items.push({
    fieldName: '',
    fieldLabel: '',
    fieldType: 'text',
    fieldOptions: '',
    isRequired: false,
    sortOrder: newSortOrder,
  })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
  // Update sort orders
  form.items.forEach((item, i) => {
    item.sortOrder = i
  })
}

function moveItem(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= form.items.length) return
  const temp = form.items[index]
  form.items[index] = form.items[newIndex]
  form.items[newIndex] = temp
  // Update sort orders
  form.items.forEach((item, i) => {
    item.sortOrder = i
  })
}

async function handleSaveDraft() {
  if (!form.templateName) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (form.templateType === 'file_collection' && !fileCollectionForm.deadline) {
    ElMessage.warning('请选择截止时间')
    return
  }
  saving.value = true
  try {
    const payload: any = {
      templateName: form.templateName,
      templateType: form.templateType,
      status: 'draft' as const,
      targetShips: form.targetShips,
      targetValue: form.targetValue,
      items: form.items.map((item, i) => ({
        ...item,
        sortOrder: i,
        id: item.id,
      })),
    }
    if (form.templateType === 'file_collection') {
      payload.fileConfig = { ...fileCollectionForm }
      payload.targetShips = 'custom'
    }
    if (editingTemplateId.value) {
      await api.publishTemplates.update(editingTemplateId.value, payload)
      ElMessage.success('草稿已保存')
    } else {
      await api.publishTemplates.create(payload)
      ElMessage.success('模板已创建')
    }
    dialogVisible.value = false
    await fetchTemplates()
  } catch (e: any) {
    // Error handled by apiFetch
  } finally {
    saving.value = false
  }
}

async function handleSavePublish() {
  if (!form.templateName) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (form.templateType === 'file_collection') {
    if (!fileCollectionForm.deadline) {
      ElMessage.warning('请选择截止时间')
      return
    }
  } else if (form.items.length === 0) {
    ElMessage.warning('请至少添加一个字段')
    return
  }
  saving.value = true
  try {
    const payload: any = {
      templateName: form.templateName,
      templateType: form.templateType,
      status: 'published' as const,
      targetShips: form.targetShips,
      targetValue: form.targetValue,
      items: form.items.map((item, i) => ({
        ...item,
        sortOrder: i,
        id: item.id,
      })),
    }
    if (form.templateType === 'file_collection') {
      payload.fileConfig = { ...fileCollectionForm }
      payload.targetShips = 'custom'
    }
    if (editingTemplateId.value) {
      await api.publishTemplates.update(editingTemplateId.value, payload)
      ElMessage.success('模板已更新并发布')
    } else {
      await api.publishTemplates.create(payload)
      ElMessage.success('模板已创建并发布')
    }
    dialogVisible.value = false
    await fetchTemplates()
  } catch (e: any) {
    // Error handled by apiFetch
  } finally {
    saving.value = false
  }
}

async function handlePublish(template: PublishTemplate) {
  try {
    await api.publishTemplates.publish(template.id!)
    ElMessage.success('模板已发布')
    await fetchTemplates()
  } catch (e: any) {
    // Error handled by apiFetch
  }
}

async function handleSaveAsDraft(template: PublishTemplate) {
  try {
    await api.publishTemplates.saveAsDraft(template.id!)
    ElMessage.success('已存为草稿')
    await fetchTemplates()
  } catch (e: any) {
    // Error handled by apiFetch
  }
}

async function handleDelete(template: PublishTemplate) {
  try {
    await ElMessageBox.confirm('确定要删除此模板吗？', '确认删除', { type: 'warning' })
    await api.publishTemplates.remove(template.id!)
    ElMessage.success('模板已删除')
    await fetchTemplates()
  } catch (e: any) {
    if (e !== 'cancel') {
      // Error handled by apiFetch
    }
  }
}

function getTargetText(target: string, value: string) {
  const map: Record<string, string> = {
    all: '全部船舶',
    eta_before: `ETA前${value || '-'}天`,
    route: `航线: ${value || '-'}`,
    custom: `自定义: ${value || '-'}`,
  }
  return map[target] || target
}

function getTargetPlaceholder(target: string) {
  const map: Record<string, string> = {
    eta_before: '请输入天数，如: 3',
    route: '请输入航线ID，多个用逗号分隔',
    custom: '请输入船舶ID，多个用逗号分隔',
  }
  return map[target] || ''
}

function formatDate(date: string | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.publish-manager {
  padding: 20px;
}

.sort-btns {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  line-height: 1;
}

.sort-btns .el-button {
  padding: 2px;
  margin: 0;
  height: auto;
  line-height: 1;
}

/* File collection form styles */
.file-type-section {
  width: 100%;
}

.file-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.custom-file-type {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.custom-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.naming-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.naming-example {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}

.naming-preview {
  margin-top: 8px;
  padding: 6px 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
}

.preview-label {
  color: #909399;
  margin-right: 4px;
}

.preview-text {
  color: #409eff;
  font-family: monospace;
}

.mr-1 {
  margin-right: 4px;
}

.mb-1 {
  margin-bottom: 4px;
}

.ml-2 {
  margin-left: 8px;
}

.w-full {
  width: 100%;
}
</style>
