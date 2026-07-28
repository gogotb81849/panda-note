<template>
  <div class="file-collections-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-gray-800">文件收集</h3>
          <el-divider direction="vertical" />
          <!-- 状态筛选 -->
          <el-select v-model="statusFilter" placeholder="状态" clearable size="small" style="width: 120px" @change="loadCollections">
            <el-option label="进行中" value="active" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </div>
        <el-button v-if="canManage" type="primary" size="small" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建收集任务
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content" v-loading="loading">
      <div class="collection-list" v-if="collections.length > 0">
        <el-card
          v-for="collection in collections"
          :key="collection.id"
          class="collection-card"
          shadow="hover"
        >
          <div class="card-header">
            <div class="title-section">
              <h4 class="collection-title">{{ collection.title }}</h4>
              <el-tag :type="statusTagType(collection.status)" size="small">
                {{ statusLabel(collection.status) }}
              </el-tag>
            </div>
            <div class="card-actions">
              <el-button size="small" @click="viewDetail(collection.id)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
              <el-button v-if="canManage && collection.status === 'active'" size="small" type="warning" @click="showCloseConfirm(collection)">
                关闭
              </el-button>
              <el-button v-if="canManage" size="small" type="danger" @click="handleDelete(collection)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="label">创建人：</span>
              <span>{{ collection.creator?.realName || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">截止时间：</span>
              <span :class="{ 'text-red-500': isExpired(collection.deadline) }">
                {{ formatDate(collection.deadline) }}
                <span v-if="isExpired(collection.deadline)" class="text-xs">(已过期)</span>
              </span>
            </div>
            <div class="info-row">
              <span class="label">目标船舶：</span>
              <span>{{ collection.totalCount }} 艘</span>
            </div>
            <div v-if="collection.description" class="info-row">
              <span class="label">描述：</span>
              <span>{{ collection.description }}</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="progress-section">
              <div class="progress-info">
                <span class="progress-text">
                  <span class="submitted-count">{{ collection.submittedCount || 0 }}</span>
                  / {{ collection.totalCount }}
                </span>
                <span class="progress-percent">
                  {{ getProgressPercent(collection.submittedCount || 0, collection.totalCount) }}%
                </span>
              </div>
              <el-progress
                :percentage="getProgressPercent(collection.submittedCount || 0, collection.totalCount)"
                :stroke-width="8"
                :show-text="false"
                :color="getProgressColor(collection.submittedCount || 0, collection.totalCount)"
              />
            </div>
          </div>
        </el-card>
      </div>

      <el-empty v-else description="暂无收集任务" />
    </div>

    <!-- 创建任务对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建文件收集任务"
      width="720px"
      @close="resetCreateForm"
    >
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="任务名称" required>
          <el-input v-model="createForm.title" placeholder="例如：2026年6月船舶月度报告" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述（可选）"
          />
        </el-form-item>
        <el-form-item label="目标船舶" required>
          <div class="ship-transfer-wrapper">
            <div class="transfer-toolbar">
              <el-button size="small" @click="selectAllShips">全选</el-button>
              <el-button size="small" @click="clearAllShips">全不选</el-button>
              <span class="selected-count">已选择 {{ createForm.targetShipIds.length }} 艘</span>
            </div>
            <el-checkbox-group v-model="createForm.targetShipIds" class="ship-checkbox-group">
              <div class="ship-search-bar">
                <el-input v-model="shipSearchKeyword" placeholder="搜索船舶名称或编号" clearable size="small" prefix-icon="Search" />
              </div>
              <div class="ship-list">
                <el-checkbox
                  v-for="ship in filteredShips"
                  :key="ship.id"
                  :value="ship.id"
                  class="ship-checkbox-item"
                >
                  <span class="ship-name">{{ ship.cnShipName }}</span>
                  <span class="ship-code">{{ ship.shipCode || '' }}</span>
                </el-checkbox>
                <el-empty v-if="filteredShips.length === 0" description="没有找到匹配的船舶" :image-size="60" />
              </div>
            </el-checkbox-group>
          </div>
        </el-form-item>
        <el-form-item label="截止时间" required>
          <el-date-picker
            v-model="createForm.deadline"
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
                v-model="createForm.fileTypes"
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
          <el-select v-model="createForm.namingTemplate" placeholder="选择预设命名规则" class="w-full">
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
          <el-input-number v-model="createForm.maxSize" :min="1" :max="100" :step="1" />
          <span class="ml-2 text-gray-500">MB</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="submitting">
          创建任务
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, View, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFileCollection } from '~/composables/useFileCollection'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const fileCollection = useFileCollection()
const authStore = useAuthStore()

// 数据状态
const collections = ref<any[]>([])
const ships = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref<string | undefined>(undefined)
const createDialogVisible = ref(false)
const submitting = ref(false)

// 船舶搜索
const shipSearchKeyword = ref('')

// 预设文件类型
const presetFileTypes = [
  { label: 'PDF文档', value: 'pdf' },
  { label: 'Word文档', value: 'doc,docx' },
  { label: 'Excel表格', value: 'xls,xlsx' },
  { label: '图片', value: 'jpg,jpeg,png,gif,bmp' },
  { label: '视频', value: 'mp4,avi,mov' },
  { label: '压缩包', value: 'zip,rar,7z' },
]

// 自定义文件类型
const newFileType = ref('')
const customFileTypes = ref<string[]>([])

// 命名规则模板
const namingTemplates = [
  { label: '默认（船舶名称_提交人_日期）', value: 'default', example: '新金洋_张三_20260615.pdf' },
  { label: '按船舶名称排序（船舶名称_文件类型_日期）', value: 'byShipName', example: '新金洋_pdf_20260615.pdf' },
  { label: '按提交时间排序（日期_船舶名称_提交人）', value: 'bySubmitTime', example: '20260615_新金洋_张三.pdf' },
  { label: '按任务名称排序（任务名称_船舶名称_日期）', value: 'byTaskName', example: '月度报告_新金洋_20260615.pdf' },
  { label: '简洁模式（船舶名称_日期）', value: 'simple', example: '新金洋_20260615.pdf' },
]

// 创建表单
const createForm = ref({
  title: '',
  description: '',
  targetShipIds: [] as number[],
  fileTypes: [] as string[],
  namingTemplate: 'default',
  maxSize: 50,
  deadline: '',
})

// 过滤后的船舶列表
const filteredShips = computed(() => {
  if (!shipSearchKeyword.value) return ships.value
  const keyword = shipSearchKeyword.value.toLowerCase()
  return ships.value.filter((ship) => {
    const name = (ship.cnShipName || '').toLowerCase()
    const code = (ship.shipCode || '').toLowerCase()
    return name.includes(keyword) || code.includes(keyword)
  })
})

// 命名预览
const namingPreview = computed(() => {
  const tpl = createForm.value.namingTemplate
  const template = namingTemplates.find((t) => t.value === tpl)
  return template ? template.example : ''
})

// 获取所有文件类型（预设 + 自定义）
const allFileTypes = computed(() => {
  const preset = createForm.value.fileTypes.filter((ft) => presetFileTypes.some((p) => p.value === ft))
  const custom = customFileTypes.value.filter((ct) => createForm.value.fileTypes.includes(ct))
  return [...preset, ...custom].join(',')
})

// 是否有管理权限
const canManage = computed(() => {
  const role = authStore.user?.role
  const managerRoles = ['shore_crew_supervisor', 'shore_marine_supervisor', 'shore_engineer_supervisor', 'shore_electric_supervisor', 'general_manager', 'company_admin', 'admin']
  return managerRoles.includes(role || '')
})

// 加载收集任务列表
const loadCollections = async () => {
  loading.value = true
  try {
    const result = await fileCollection.getCollections(statusFilter.value)
    collections.value = Array.isArray(result) ? result : result.data || []
  } catch (error) {
    console.error('加载失败', error)
    ElMessage.error('加载收集任务列表失败')
  } finally {
    loading.value = false
  }
}

// 加载船舶列表
const loadShips = async () => {
  try {
    ships.value = await fileCollection.getShips()
  } catch (error) {
    console.error('加载船舶列表失败', error)
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  createDialogVisible.value = true
}

// 重置创建表单
const resetCreateForm = () => {
  createForm.value = {
    title: '',
    description: '',
    targetShipIds: [],
    fileTypes: [],
    namingTemplate: 'default',
    maxSize: 50,
    deadline: '',
  }
  shipSearchKeyword.value = ''
  newFileType.value = ''
  customFileTypes.value = []
}

// 全选船舶
const selectAllShips = () => {
  createForm.value.targetShipIds = ships.value.map((ship) => ship.id)
}

// 全不选船舶
const clearAllShips = () => {
  createForm.value.targetShipIds = []
}

// 添加自定义文件类型
const addCustomFileType = () => {
  const type = newFileType.value.trim().toUpperCase()
  if (!type) return
  if (customFileTypes.value.includes(type)) {
    ElMessage.warning('该类型已存在')
    return
  }
  customFileTypes.value.push(type)
  createForm.value.fileTypes.push(type)
  newFileType.value = ''
}

// 移除自定义文件类型
const removeCustomFileType = (type: string) => {
  customFileTypes.value = customFileTypes.value.filter((t) => t !== type)
  createForm.value.fileTypes = createForm.value.fileTypes.filter((t) => t !== type)
}

// 创建任务
const handleCreate = async () => {
  if (!createForm.value.title.trim()) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (createForm.value.targetShipIds.length === 0) {
    ElMessage.warning('请至少选择一艘目标船舶')
    return
  }
  if (!createForm.value.deadline) {
    ElMessage.warning('请选择截止时间')
    return
  }

  submitting.value = true
  try {
    // 将船舶 ID 转换为原 API 需要的格式
    const targetShips = createForm.value.targetShipIds.map((id) => {
      const ship = ships.value.find((s) => s.id === id)
      return { shipId: id, shipName: ship?.cnShipName || '' }
    })

    await fileCollection.createCollection({
      title: createForm.value.title,
      description: createForm.value.description,
      targetShips,
      fileType: allFileTypes.value,
      namingRule: createForm.value.namingTemplate,
      maxSize: createForm.value.maxSize,
      deadline: createForm.value.deadline,
    })
    ElMessage.success('创建成功')
    createDialogVisible.value = false
    await loadCollections()
  } catch (error) {
    console.error('创建失败', error)
  } finally {
    submitting.value = false
  }
}

// 查看详情
const viewDetail = (id: number) => {
  navigateTo(`/file-collections/${id}`)
}

// 关闭确认
const showCloseConfirm = async (collection: any) => {
  try {
    await ElMessageBox.confirm(`确定要关闭任务「${collection.title}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await fileCollection.updateCollection(collection.id, { status: 'closed' })
    ElMessage.success('任务已关闭')
    await loadCollections()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('关闭失败', error)
    }
  }
}

// 删除任务
const handleDelete = async (collection: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务「${collection.title}」吗？此操作不可恢复。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await fileCollection.deleteCollection(collection.id)
    ElMessage.success('删除成功')
    await loadCollections()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败', error)
    }
  }
}

// 工具函数
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const isExpired = (date: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}

const getProgressPercent = (submitted: number, total: number) => {
  if (total === 0) return 0
  return Math.round((submitted / total) * 100)
}

const getProgressColor = (submitted: number, total: number) => {
  const percent = getProgressPercent(submitted, total)
  if (percent >= 80) return '#67c23a'
  if (percent >= 50) return '#e6a23c'
  return '#f56c6c'
}

const statusLabel = fileCollection.statusLabel
const statusTagType = fileCollection.statusTagType

onMounted(() => {
  loadCollections()
  loadShips()
})
</script>

<style scoped>
.file-collections-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.toolbar {
  padding: 16px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.collection-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.collection-card {
  transition: all 0.2s;
}

.collection-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.collection-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.card-body {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 13px;
  margin-bottom: 6px;
  color: #606266;
}

.info-row .label {
  color: #909399;
  min-width: 70px;
}

.card-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-text {
  font-size: 13px;
  color: #606266;
}

.submitted-count {
  font-weight: 600;
  color: #409eff;
  font-size: 16px;
}

.progress-percent {
  font-size: 13px;
  font-weight: 600;
  color: #909399;
}

.naming-rule-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

/* 船舶选择区域 */
.ship-transfer-wrapper {
  width: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.transfer-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #f5f7fa;
  border-radius: 4px 4px 0 0;
}

.selected-count {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.ship-checkbox-group {
  max-height: 200px;
  overflow-y: auto;
}

.ship-search-bar {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.ship-list {
  padding: 4px 0;
}

.ship-checkbox-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  width: 100%;
  margin: 0;
}

.ship-checkbox-item:hover {
  background-color: #f5f7fa;
}

.ship-name {
  font-size: 13px;
  color: #303133;
  margin-right: 8px;
}

.ship-code {
  font-size: 12px;
  color: #909399;
}

/* 文件类型区域 */
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

/* 命名规则区域 */
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

.text-red-500 {
  color: #f56c6c !important;
}

.text-xs {
  font-size: 11px;
}

.cursor-pointer {
  cursor: pointer;
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

@media (max-width: 768px) {
  .collection-list {
    grid-template-columns: 1fr;
  }
}
</style>