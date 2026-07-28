<template>
  <div class="page-container">
    <div class="page-header">
      <h2>抵港前检查</h2>
      <div class="header-actions">
        <el-button v-if="isShoreRole" type="primary" @click="showCreateDialog">发布检查模板</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <!-- 船舶上下文提示（从船舶看板点击跳转时显示） -->
      <el-alert v-if="filterShipId" :title="`船舶筛选：${getShipName(filterShipId)}`" type="info" :closable="true" @close="clearShipFilter" class="mb-2" />
      <el-select v-model="filterTemplate" placeholder="全部模板" clearable style="width: 200px">
        <el-option v-for="t in templates" :key="t.id" :label="t.title" :value="t.id" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 120px">
        <el-option label="待完成" value="pending" />
        <el-option label="进行中" value="in_progress" />
        <el-option label="已完成" value="completed" />
      </el-select>
    </div>

    <!-- 主管视图：模板列表 + 各船舶进度 -->
    <div v-if="isShoreRole">
      <el-card v-for="tpl in filteredTemplates" :key="tpl.id" class="mb-3">
        <template #header>
          <div class="card-header">
            <span>{{ tpl.title }}</span>
            <div class="card-header-actions">
              <el-tag :type="tpl.isPublished ? 'success' : 'info'">{{ tpl.isPublished ? '已发布' : '草稿' }}</el-tag>
              <el-button size="small" @click="editTemplate(tpl)">编辑</el-button>
            </div>
          </div>
        </template>
        <el-table :data="getShipTasksForTemplate(tpl.id)" size="small">
          <el-table-column prop="ship.cnShipName" label="船舶" width="120" />
          <el-table-column label="进度" width="200">
            <template #default="{ row }">
              <el-progress :percentage="row.progress" :status="row.progress === 100 ? 'success' : ''" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="完成项" width="100">
            <template #default="{ row }">{{ row.completedItems }}/{{ row.totalItems }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 政委视图：我的检查任务 -->
    <div v-else>
      <el-table :data="myTasks" size="small">
        <el-table-column label="模板" prop="templateTitle" />
        <el-table-column label="进度" width="200">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :status="row.progress === 100 ? 'success' : ''" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openTaskDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建/编辑模板对话框 -->
    <el-dialog v-model="createDialogVisible" :title="editingTemplate ? '编辑检查模板' : '发布抵港前检查模板'" width="600px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="模板标题" required>
          <el-input v-model="createForm.title" placeholder="例如：XX港抵港前安全检查" />
        </el-form-item>
        <el-form-item label="目标船舶">
          <el-select v-model="createForm.shipIds" multiple placeholder="选择船舶（留空表示全部船舶）" filterable class="w-full">
            <el-option v-for="ship in shipList" :key="ship.id" :label="ship.cnShipName" :value="ship.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="createForm.dueDate" type="datetime" placeholder="选择截止日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="检查内容" required>
          <div class="content-input-tip">
            <p class="tip-text">请使用自然语言描述检查内容，每行一个检查项目。系统会自动解析为检查清单。</p>
            <p class="tip-example">示例：</p>
            <pre class="tip-example-content">请各船于抵港前完成以下检查：
消防设备检查（灭火器、消防栓、消防水带）
救生设备清点（救生圈、救生衣、救生艇）
航行设备校准（雷达、GPS、AIS）
文件收集（船舶证书、船员证书、货物清单）</pre>
          </div>
          <el-input v-model="createForm.contentText" type="textarea" :rows="8" placeholder="请直接描述检查内容，每行一个项目" />
          <div v-if="parsedItems.length > 0" class="parsed-preview">
            <span class="preview-label">已解析 {{ parsedItems.length }} 个检查项目：</span>
            <div v-for="(item, idx) in parsedItems" :key="idx" class="preview-item">
              <span class="preview-index">{{ idx + 1 }}.</span>
              <span class="preview-text">{{ item }}</span>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">{{ editingTemplate ? '保存修改' : '发布' }}</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情对话框 -->
    <el-dialog v-model="taskDetailVisible" :title="currentTask?.templateTitle" width="600px">
      <div v-for="(item, idx) in currentTask?.responseItems" :key="idx" class="task-item">
        <el-checkbox v-model="item.completed" @change="updateTaskItem(currentTask!.id, idx, item.completed)">
          {{ item.label }}
        </el-checkbox>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// 从URL query参数获取shipId
const filterShipId = computed(() => {
  const id = route.query.shipId
  return id ? Number(id) : null
})

const isShoreRole = computed(() => authStore.user?.role?.startsWith('shore_') || authStore.user?.role === 'company_admin' || authStore.user?.role === 'general_manager')

const templates = ref<any[]>([])
const shipTasks = ref<any[]>([])
const shipList = ref<any[]>([])
const filterTemplate = ref<number | undefined>()
const filterStatus = ref<string>()
const createDialogVisible = ref(false)
const taskDetailVisible = ref(false)
const currentTask = ref<any>(null)
const editingTemplate = ref<any>(null)

const createForm = ref({
  title: '',
  contentText: '',
  items: [] as string[],
  shipIds: [] as number[],
  dueDate: '',
})

// 解析检查项目（支持自然语言）
const parsedItems = computed(() => {
  if (!createForm.value.contentText.trim()) return []
  return createForm.value.contentText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // 去除行首的序号、符号
      return line.replace(/^[\d\.\-\*\u2022\u25cb\s]+/, '').trim()
    })
    .filter(line => line.length > 0)
})

const filteredTemplates = computed(() => {
  let list = templates.value
  if (filterTemplate.value) list = list.filter(t => t.id === filterTemplate.value)
  return list
})

const myTasks = computed(() => {
  let list = shipTasks.value
  // 如果有shipId过滤，只显示该船舶的任务
  if (filterShipId.value) {
    list = list.filter(t => t.shipId === filterShipId.value)
  }
  if (filterStatus.value) {
    return list.filter(t => t.status === filterStatus.value)
  }
  return list.filter(t => t.status !== 'completed')
})

const getShipTasksForTemplate = (templateId: number) => shipTasks.value.filter(t => t.templateId === templateId)

const getShipName = (shipId: number): string => {
  const ship = shipList.value.find(s => s.id === shipId)
  return ship?.cnShipName || `ID: ${shipId}`
}

const clearShipFilter = () => {
  // 清除URL中的shipId参数
  const query = { ...route.query }
  delete query.shipId
  router.replace({ query })
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = { pending: 'info', in_progress: 'warning', completed: 'success' }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = { pending: '待完成', in_progress: '进行中', completed: '已完成' }
  return map[status] || status
}

const showCreateDialog = () => {
  editingTemplate.value = null
  createForm.value = { title: '', contentText: '', items: [], shipIds: [], dueDate: '' }
  createDialogVisible.value = true
}

const editTemplate = (tpl: any) => {
  editingTemplate.value = tpl
  // 将已有的items转换回自然语言
  const contentText = (tpl.items || []).map((item: string, idx: number) => `${idx + 1}. ${item}`).join('\n')
  // 处理 targetShips 字段（后端存储格式）
  const shipIds = (tpl.targetShips || []).map((ts: any) => ts.shipId || ts)
  createForm.value = {
    title: tpl.title,
    contentText,
    items: tpl.items || [],
    shipIds,
    dueDate: '',
  }
  createDialogVisible.value = true
}

const handleCreate = async () => {
  const items = parsedItems.value
  if (!createForm.value.title || items.length === 0) {
    return
  }

  const templateData = {
    title: createForm.value.title,
    items,
    targetShips: createForm.value.shipIds.length > 0 ? createForm.value.shipIds.map(id => ({ shipId: id })) : undefined,
  }

  if (editingTemplate.value) {
    await api.portCheck.updateTemplate(editingTemplate.value.id, templateData)
    ElMessage.success('模板更新成功')
  } else {
    await api.portCheck.createTemplate(templateData)
    ElMessage.success('模板创建成功')
  }
  createDialogVisible.value = false
  await loadData()
}

const openTaskDetail = (task: any) => {
  currentTask.value = task
  taskDetailVisible.value = true
}

const updateTaskItem = async (taskId: number, itemIdx: number, completed: boolean) => {
  const task = shipTasks.value.find(t => t.id === taskId)
  if (!task) return

  // 构建 responseData（保存每个检查项的完成状态）
  const responseData = task.responseData || {}
  responseData[itemIdx] = { completed }

  // 构建 completedItems 索引数组
  const completedIndices = []
  const items = task.template?.items || task.responseItems || []
  for (let i = 0; i < items.length; i++) {
    const isCompleted = i === itemIdx ? completed : (responseData[i]?.completed || false)
    if (isCompleted) {
      completedIndices.push(i)
    }
  }

  await api.portCheck.updateTask(taskId, {
    responseData,
    completedItems: completedIndices,
    status: completedIndices.length === items.length && items.length > 0 ? 'completed' : 'in_progress',
  })
  ElMessage.success('已更新')
  await loadData()
}

const loadData = async () => {
  const [tplRes, taskRes, shipsRes] = await Promise.all([
    api.portCheck.listTemplates(),
    api.portCheck.listShipTasks(),
    api.ships.getAll(),
  ])
  templates.value = tplRes || []
  shipTasks.value = taskRes || []
  shipList.value = shipsRes || []
}

onMounted(loadData)
</script>

<style scoped>
.page-container {
  padding: 16px;
  overflow-y: auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.page-header h2 {
  margin: 0;
  font-size: 18px;
}
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.mb-3 {
  margin-bottom: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.task-item {
  padding: 8px 0;
}

/* 模板表单样式 */
.content-input-tip {
  background: #f0f7ff;
  border: 1px solid #d6e8fc;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.tip-text {
  font-size: 12px;
  color: #409eff;
  margin: 0 0 6px 0;
}
.tip-example {
  font-size: 11px;
  color: #666;
  margin: 0 0 4px 0;
}
.tip-example-content {
  font-size: 12px;
  color: #333;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 8px;
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}
.parsed-preview {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0f9eb;
  border: 1px solid #d9ead3;
  border-radius: 6px;
}
.preview-label {
  font-size: 12px;
  color: #67c23a;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}
.preview-item {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: #333;
  padding: 2px 0;
}
.preview-index {
  color: #67c23a;
  font-weight: 600;
  min-width: 20px;
}

/* ====== 平板竖屏专属优化 ====== */
.device-tablet.orientation-portrait .page-container,
.tablet-screen.portrait .page-container {
  padding: 8px !important;
  height: calc(100vh - 104px) !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
}

.device-tablet.orientation-portrait .page-header,
.tablet-screen.portrait .page-header {
  margin-bottom: 8px !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 8px !important;
}

.device-tablet.orientation-portrait .page-header h2,
.tablet-screen.portrait .page-header h2 {
  font-size: 17px !important;
}

/* 页面头部按钮触摸优化 */
.device-tablet.orientation-portrait .page-header .el-button,
.tablet-screen.portrait .page-header .el-button {
  width: 100% !important;
  min-height: 40px !important;
  font-size: 14px !important;
}

/* 筛选栏改为垂直布局 */
.device-tablet.orientation-portrait .filter-bar,
.tablet-screen.portrait .filter-bar {
  flex-direction: column !important;
  gap: 8px !important;
  margin-bottom: 12px !important;
}

.device-tablet.orientation-portrait .filter-bar .el-select,
.tablet-screen.portrait .filter-bar .el-select {
  width: 100% !important;
  min-height: 40px !important;
}

/* 卡片触摸优化 */
.device-tablet.orientation-portrait .page-container .el-card,
.tablet-screen.portrait .page-container .el-card {
  margin-bottom: 10px !important;
}

.device-tablet.orientation-portrait .card-header,
.tablet-screen.portrait .card-header {
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 8px !important;
}

.device-tablet.orientation-portrait .card-header-actions,
.tablet-screen.portrait .card-header-actions {
  width: 100% !important;
  justify-content: flex-end !important;
}

.device-tablet.orientation-portrait .card-header-actions .el-button,
.tablet-screen.portrait .card-header-actions .el-button {
  min-height: 36px !important;
}

/* 表格触摸优化 */
.device-tablet.orientation-portrait .page-container .el-table,
.tablet-screen.portrait .page-container .el-table {
  font-size: 13px !important;
}

.device-tablet.orientation-portrait .page-container .el-table .el-table__header th,
.tablet-screen.portrait .page-container .el-table .el-table__header th {
  padding: 10px 8px !important;
  min-height: 40px !important;
}

.device-tablet.orientation-portrait .page-container .el-table .el-table__body td,
.tablet-screen.portrait .page-container .el-table .el-table__body td {
  padding: 10px 8px !important;
  min-height: 44px !important;
}

.device-tablet.orientation-portrait .page-container .el-table .el-button--small,
.tablet-screen.portrait .page-container .el-table .el-button--small {
  min-height: 36px !important;
  padding: 8px 12px !important;
}

/* 进度条触摸优化 */
.device-tablet.orientation-portrait .page-container .el-progress,
.tablet-screen.portrait .page-container .el-progress {
  height: 20px !important;
}

.device-tablet.orientation-portrait .page-container .el-progress .el-progress-bar__outer,
.tablet-screen.portrait .page-container .el-progress .el-progress-bar__outer {
  height: 8px !important;
}

/* 标签触摸优化 */
.device-tablet.orientation-portrait .page-container .el-tag,
.tablet-screen.portrait .page-container .el-tag {
  min-height: 28px !important;
  padding: 0 10px !important;
  font-size: 12px !important;
}

/* 对话框触摸优化 */
.device-tablet.orientation-portrait .page-container :deep(.el-dialog),
.tablet-screen.portrait .page-container :deep(.el-dialog) {
  width: 92vw !important;
  max-width: 92vw !important;
  margin: 20px auto !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-dialog__header),
.tablet-screen.portrait .page-container :deep(.el-dialog__header) {
  padding: 16px 20px !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-dialog__body),
.tablet-screen.portrait .page-container :deep(.el-dialog__body) {
  padding: 16px 20px !important;
  max-height: 70vh !important;
  overflow-y: auto !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-dialog__footer),
.tablet-screen.portrait .page-container :deep(.el-dialog__footer) {
  padding: 12px 20px !important;
}

/* 对话框按钮触摸优化 */
.device-tablet.orientation-portrait .page-container :deep(.el-dialog .el-button),
.tablet-screen.portrait .page-container :deep(.el-dialog .el-button) {
  min-height: 40px !important;
  padding: 10px 20px !important;
  font-size: 14px !important;
}

/* 表单触摸优化 */
.device-tablet.orientation-portrait .page-container :deep(.el-form-item),
.tablet-screen.portrait .page-container :deep(.el-form-item) {
  margin-bottom: 16px !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-form-item__label),
.tablet-screen.portrait .page-container :deep(.el-form-item__label) {
  font-size: 13px !important;
}

/* 输入框触摸优化 */
.device-tablet.orientation-portrait .page-container :deep(.el-input__inner),
.tablet-screen.portrait .page-container :deep(.el-input__inner),
.device-tablet.orientation-portrait .page-container :deep(.el-textarea__inner),
.tablet-screen.portrait .page-container :deep(.el-textarea__inner) {
  min-height: 40px !important;
  font-size: 14px !important;
  padding: 8px 12px !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-select),
.tablet-screen.portrait .page-container :deep(.el-select) {
  width: 100% !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-date-editor),
.tablet-screen.portrait .page-container :deep(.el-date-editor) {
  width: 100% !important;
  min-height: 40px !important;
}

/* 任务项触摸优化 */
.device-tablet.orientation-portrait .task-item,
.tablet-screen.portrait .task-item {
  padding: 12px 0 !important;
  min-height: 48px !important;
}

.device-tablet.orientation-portrait .task-item .el-checkbox,
.tablet-screen.portrait .task-item .el-checkbox {
  min-height: 44px !important;
}

.device-tablet.orientation-portrait .task-item :deep(.el-checkbox__label),
.tablet-screen.portrait .task-item :deep(.el-checkbox__label) {
  font-size: 14px !important;
}

.device-tablet.orientation-portrait .task-item :deep(.el-checkbox__inner),
.tablet-screen.portrait .task-item :deep(.el-checkbox__inner) {
  width: 20px !important;
  height: 20px !important;
}

/* 检查内容输入区域触摸优化 */
.device-tablet.orientation-portrait .content-input-tip,
.tablet-screen.portrait .content-input-tip {
  padding: 12px !important;
  margin-bottom: 10px !important;
}

.device-tablet.orientation-portrait .tip-text,
.tablet-screen.portrait .tip-text {
  font-size: 13px !important;
}

.device-tablet.orientation-portrait .tip-example-content,
.tablet-screen.portrait .tip-example-content {
  padding: 10px !important;
  font-size: 13px !important;
}

/* 解析预览触摸优化 */
.device-tablet.orientation-portrait .parsed-preview,
.tablet-screen.portrait .parsed-preview {
  padding: 10px 12px !important;
  margin-top: 10px !important;
}

.device-tablet.orientation-portrait .preview-item,
.tablet-screen.portrait .preview-item {
  padding: 4px 0 !important;
  min-height: 32px !important;
}

/* ====== 深度优化：空间利用率提升（对标飞书任务 v4） ====== */

/* 页面容器改为 flex 布局，避免全局滚动 */
.device-tablet.orientation-portrait .page-container,
.tablet-screen.portrait .page-container {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  height: calc(100vh - 104px) !important;
}

/* 筛选栏紧凑化 */
.device-tablet.orientation-portrait .filter-bar,
.tablet-screen.portrait .filter-bar {
  flex-shrink: 0 !important;
  margin-bottom: 8px !important;
  padding: 8px !important;
  background: #f8f9fa !important;
  border-radius: 8px !important;
}

/* 表格区域占满剩余空间 */
.device-tablet.orientation-portrait .page-container .el-table,
.tablet-screen.portrait .page-container .el-table {
  flex: 1 !important;
  min-height: 0 !important;
}

/* 表格行高压缩（提升信息密度） */
.device-tablet.orientation-portrait .page-container .el-table__body tr,
.tablet-screen.portrait .page-container .el-table__body tr {
  height: 40px !important;
}

.device-tablet.orientation-portrait .page-container .el-table .el-table__header th,
.tablet-screen.portrait .page-container .el-table .el-table__header th {
  padding: 8px 6px !important;
  min-height: 36px !important;
  font-size: 12px !important;
  background: #f0f2f5 !important;
}

.device-tablet.orientation-portrait .page-container .el-table .el-table__body td,
.tablet-screen.portrait .page-container .el-table .el-table__body td {
  padding: 6px 8px !important;
  font-size: 13px !important;
}

/* 单元格文本截断 */
.device-tablet.orientation-portrait .page-container .el-table .cell,
.tablet-screen.portrait .page-container .el-table .cell {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* 卡片头部紧凑 */
.device-tablet.orientation-portrait .card-header,
.tablet-screen.portrait .card-header {
  padding: 10px 12px !important;
  margin-bottom: 0 !important;
}

/* 任务列表优化 */
.device-tablet.orientation-portrait .task-item,
.tablet-screen.portrait .task-item {
  padding: 10px 8px !important;
  min-height: 44px !important;
  border-bottom: 1px solid #f0f0f0 !important;
}

.device-tablet.orientation-portrait .task-item:last-child,
.tablet-screen.portrait .task-item:last-child {
  border-bottom: none !important;
}

/* 复选框增大触摸区域 */
.device-tablet.orientation-portrait .task-item :deep(.el-checkbox__inner),
.tablet-screen.portrait .task-item :deep(.el-checkbox__inner) {
  width: 18px !important;
  height: 18px !important;
}

.device-tablet.orientation-portrait .task-item :deep(.el-checkbox__label),
.tablet-screen.portrait .task-item :deep(.el-checkbox__label) {
  font-size: 13px !important;
  line-height: 1.4 !important;
}

/* 进度条紧凑 */
.device-tablet.orientation-portrait .page-container .el-progress,
.tablet-screen.portrait .page-container .el-progress {
  margin: 4px 0 !important;
}

.device-tablet.orientation-portrait .page-container .el-progress .el-progress-bar__outer,
.tablet-screen.portrait .page-container .el-progress .el-progress-bar__outer {
  height: 6px !important;
}

.device-tablet.orientation-portrait .page-container .el-progress__text,
.tablet-screen.portrait .page-container .el-progress__text {
  font-size: 11px !important;
  min-width: 32px !important;
}

/* 标签紧凑 */
.device-tablet.orientation-portrait .page-container .el-tag,
.tablet-screen.portrait .page-container .el-tag {
  min-height: 24px !important;
  padding: 0 8px !important;
  font-size: 11px !important;
  line-height: 22px !important;
}

/* 对话框优化（全屏模式） */
.device-tablet.orientation-portrait .page-container :deep(.el-dialog),
.tablet-screen.portrait .page-container :deep(.el-dialog) {
  width: 96vw !important;
  max-width: 96vw !important;
  margin: 1vh auto !important;
  max-height: 98vh !important;
  display: flex !important;
  flex-direction: column !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-dialog__body),
.tablet-screen.portrait .page-container :deep(.el-dialog__body) {
  flex: 1 !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  max-height: none !important;
  padding: 12px 16px !important;
}

/* 表单紧凑 */
.device-tablet.orientation-portrait .page-container :deep(.el-form-item),
.tablet-screen.portrait .page-container :deep(.el-form-item) {
  margin-bottom: 12px !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-form-item__label),
.tablet-screen.portrait .page-container :deep(.el-form-item__label) {
  font-size: 12px !important;
  margin-bottom: 4px !important;
}

/* 输入框紧凑 */
.device-tablet.orientation-portrait .page-container :deep(.el-input__inner),
.tablet-screen.portrait .page-container :deep(.el-input__inner) {
  min-height: 36px !important;
  padding: 6px 10px !important;
  font-size: 13px !important;
}

.device-tablet.orientation-portrait .page-container :deep(.el-textarea__inner),
.tablet-screen.portrait .page-container :deep(.el-textarea__inner) {
  min-height: 80px !important;
  padding: 8px 10px !important;
  font-size: 13px !important;
}

/* 提示区域紧凑 */
.device-tablet.orientation-portrait .content-input-tip,
.tablet-screen.portrait .content-input-tip {
  padding: 8px 10px !important;
  margin-bottom: 8px !important;
  font-size: 12px !important;
}

.device-tablet.orientation-portrait .tip-text,
.tablet-screen.portrait .tip-text {
  font-size: 12px !important;
  line-height: 1.4 !important;
}

.device-tablet.orientation-portrait .tip-example-content,
.tablet-screen.portrait .tip-example-content {
  padding: 8px !important;
  font-size: 12px !important;
  margin-top: 4px !important;
}

/* 解析预览紧凑 */
.device-tablet.orientation-portrait .parsed-preview,
.tablet-screen.portrait .parsed-preview {
  padding: 8px 10px !important;
  margin-top: 8px !important;
}

.device-tablet.orientation-portrait .preview-item,
.tablet-screen.portrait .preview-item {
  padding: 3px 0 !important;
  min-height: 28px !important;
  font-size: 12px !important;
}

/* 空状态优化 */
.device-tablet.orientation-portrait .page-container .el-table__empty-block,
.tablet-screen.portrait .page-container .el-table__empty-block {
  min-height: 150px !important;
}

.device-tablet.orientation-portrait .page-container .el-table__empty-text,
.tablet-screen.portrait .page-container .el-table__empty-text {
  font-size: 13px !important;
  color: #999 !important;
}

/* 滚动条优化 */
.device-tablet.orientation-portrait .page-container ::-webkit-scrollbar,
.tablet-screen.portrait .page-container ::-webkit-scrollbar {
  width: 6px !important;
  height: 6px !important;
}

.device-tablet.orientation-portrait .page-container ::-webkit-scrollbar-thumb,
.tablet-screen.portrait .page-container ::-webkit-scrollbar-thumb {
  background: #d0d0d0 !important;
  border-radius: 3px !important;
}

.device-tablet.orientation-portrait .page-container ::-webkit-scrollbar-track,
.tablet-screen.portrait .page-container ::-webkit-scrollbar-track {
  background: transparent !important;
}

/* 按钮组网格布局 */
.device-tablet.orientation-portrait .page-header .flex.gap-2,
.tablet-screen.portrait .page-header .flex.gap-2 {
  display: grid !important;
  grid-template-columns: repeat(2, 1fr) !important;
  gap: 6px !important;
  width: 100% !important;
}

/* 加载状态优化 */
.device-tablet.orientation-portrait .page-container .el-loading-spinner,
.tablet-screen.portrait .page-container .el-loading-spinner {
  transform: scale(0.85) !important;
}
</style>
