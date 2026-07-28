<template>
  <div class="tasks-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-gray-800">工作任务</h3>
          <el-divider direction="vertical" />
          <!-- 视图切换 -->
          <el-button-group size="small">
            <el-button 
              :type="viewMode === 'tree' ? 'primary' : ''" 
              @click="viewMode = 'tree'"
            >
              <el-icon><Menu /></el-icon>
              树形
            </el-button>
            <el-button 
              :type="viewMode === 'kanban' ? 'primary' : ''" 
              @click="viewMode = 'kanban'"
            >
              <el-icon><Grid /></el-icon>
              看板
            </el-button>
            <el-button 
              :type="viewMode === 'list' ? 'primary' : ''" 
              @click="viewMode = 'list'"
            >
              <el-icon><List /></el-icon>
              列表
            </el-button>
            <el-button 
              :type="viewMode === 'gantt' ? 'primary' : ''" 
              @click="viewMode = 'gantt'"
            >
              <el-icon><Histogram /></el-icon>
              甘特图
            </el-button>
          </el-button-group>
          <el-divider direction="vertical" />
          <!-- 状态筛选 -->
          <el-select v-model="statusFilter" placeholder="状态" clearable size="small" style="width: 120px" @change="filterTasks">
            <el-option label="待办" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
          <!-- 优先级筛选 -->
          <el-select v-model="priorityFilter" placeholder="优先级" clearable size="small" style="width: 120px" @change="filterTasks">
            <el-option label="重要紧急" value="urgent_important" />
            <el-option label="重要不紧急" value="important" />
            <el-option label="紧急不重要" value="urgent" />
            <el-option label="普通" value="normal" />
            <el-option label="低" value="low" />
          </el-select>
        </div>
        <el-button type="primary" size="small" @click="showCreateDialog(null)">
          <el-icon><Plus /></el-icon>
          新建任务
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 树形视图 -->
      <template v-if="viewMode === 'tree'">
        <!-- 左侧任务树 -->
        <div class="task-tree-panel">
          <div class="panel-header">
            <span>任务列表</span>
            <span class="task-count">{{ filteredTree.length }}</span>
          </div>
          <div class="tree-container" v-loading="loading">
            <el-tree
              ref="treeRef"
              :data="filteredTree"
              :props="treeProps"
              node-key="id"
              highlight-current
              default-expand-all
              @node-click="onNodeClick"
              @node-contextmenu="onNodeContextMenu"
            >
              <template #default="{ node, data }">
                <div class="tree-node-content">
                  <span class="tree-node-title">{{ data.title }}</span>
                  <div class="tree-node-tags">
                    <el-tag
                      :type="statusTagType(data.status)"
                      size="small"
                      class="status-tag"
                    >
                      {{ statusLabel(data.status) }}
                    </el-tag>
                    <el-tag
                      :type="priorityTagType(data.priority)"
                      size="small"
                      class="priority-tag"
                    >
                      {{ priorityLabel(data.priority) }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-tree>
            <div v-if="!loading && filteredTree.length === 0" class="empty-text">
              暂无任务
            </div>
          </div>
        </div>

        <!-- 右侧任务详情 -->
        <div class="task-detail-panel">
          <template v-if="selectedTask">
            <div class="detail-header">
              <h3 class="detail-title">{{ selectedTask.title }}</h3>
              <div class="detail-actions">
                <el-button size="small" @click="showCreateDialog(selectedTask)">
                  <el-icon><Plus /></el-icon>
                  添加子任务
                </el-button>
                <el-button size="small" @click="showEditDialog(selectedTask)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(selectedTask)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </div>

            <div class="detail-body">
              <div class="detail-item">
                <label>状态</label>
                <el-tag :type="statusTagType(selectedTask.status)" size="large">
                  {{ statusLabel(selectedTask.status) }}
                </el-tag>
              </div>

              <div class="detail-item">
                <label>优先级</label>
                <el-tag :type="priorityTagType(selectedTask.priority)" size="large">
                  {{ priorityLabel(selectedTask.priority) }}
                </el-tag>
              </div>

              <div class="detail-item" v-if="selectedTask.dueDate">
                <label>截止日期</label>
                <span>{{ formatDate(selectedTask.dueDate) }}</span>
              </div>

              <div class="detail-item" v-if="selectedTask.description">
                <label>描述</label>
                <p class="description-text">{{ selectedTask.description }}</p>
              </div>

              <div class="detail-item" v-if="selectedTask.createdAt">
                <label>创建时间</label>
                <span>{{ formatDate(selectedTask.createdAt) }}</span>
              </div>

              <div class="detail-item" v-if="selectedTask.updatedAt">
                <label>更新时间</label>
                <span>{{ formatDate(selectedTask.updatedAt) }}</span>
              </div>
            </div>
          </template>

          <div v-else class="empty-detail">
            <el-icon :size="48" color="#c0c4cc"><Document /></el-icon>
            <p>请选择一个任务查看详情</p>
          </div>
        </div>
      </template>

      <!-- 看板视图 -->
      <template v-else-if="viewMode === 'kanban'">
        <div class="kanban-container" v-loading="loading">
          <TaskKanban 
            :tasks="flatTasks" 
            :loading="loading"
            @task:update="onTaskUpdate"
            @task:click="onTaskClick"
          />
        </div>
      </template>

      <!-- 列表视图 -->
      <template v-else-if="viewMode === 'list'">
        <div class="list-container" v-loading="loading">
          <TaskListView
            :tasks="taskTree"
            :loading="loading"
            @task:update="onTaskUpdate"
            @task:click="onTaskClick"
            @task:edit="showEditDialog"
            @task:delete="handleDelete"
          />
        </div>
      </template>

      <!-- 甘特图视图 -->
      <template v-else-if="viewMode === 'gantt'">
        <div class="gantt-container" v-loading="loading">
          <GanttChart
            :tasks="ganttTasks"
            :loading="loading"
            :date-range="ganttDateRange"
            :show-toolbar="true"
            @task-click="onGanttTaskClick"
          />
        </div>
      </template>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click="contextMenuVisible = false"
    >
      <div class="context-menu-item" @click="handleCompleteTask(contextMenuTask)">
        <el-icon><CircleCheck /></el-icon>
        <span>完成任务</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="showEditDialog(contextMenuTask)">
        <el-icon><Edit /></el-icon>
        <span>编辑</span>
      </div>
      <div class="context-menu-item" @click="showCreateDialog(contextMenuTask)">
        <el-icon><Plus /></el-icon>
        <span>添加子任务</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item text-red-600" @click="handleDelete(contextMenuTask)">
        <el-icon><Delete /></el-icon>
        <span>删除</span>
      </div>
    </div>

    <!-- 创建/编辑任务对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑任务' : '新建任务'"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="任务标题" required>
          <el-input v-model="form.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="选择状态" class="w-full">
            <el-option label="待办" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" placeholder="选择优先级" class="w-full">
            <el-option label="重要紧急" value="urgent_important" />
            <el-option label="紧急" value="urgent" />
            <el-option label="重要" value="important" />
            <el-option label="普通" value="normal" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="form.dueDate"
            type="date"
            placeholder="选择日期"
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入任务描述"
          />
        </el-form-item>
        <el-form-item label="指派人">
          <el-select v-model="form.assignedToId" placeholder="选择指派人" clearable class="w-full">
            <el-option 
              v-for="user in users" 
              :key="user.id" 
              :label="user.realName" 
              :value="user.id" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Plus, Edit, Delete, Document, CircleCheck, Menu, Grid, List, Histogram, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useApi } from '~/composables/useApi'
import { useTaskShortcuts } from '~/composables/useTaskShortcuts'
import type { TaskNode, CreateTaskRequest, UpdateTaskRequest } from '~/types'
import TaskListView from '~/components/TaskListView.vue'
import GanttChart from '~/components/GanttChart.vue'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()

// 视图模式
const viewMode = ref<'tree' | 'kanban' | 'list' | 'gantt'>('tree')

// 数据状态
const taskTree = ref<TaskNode[]>([])
const loading = ref(false)
const selectedTask = ref<TaskNode | null>(null)
const treeRef = ref()

// 筛选状态
const statusFilter = ref<string | undefined>(undefined)
const priorityFilter = ref<string | undefined>(undefined)

// 树形配置
const treeProps = {
  children: 'children',
  label: 'title',
}

// 右键菜单
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTask = ref<TaskNode | null>(null)

// 对话框
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = ref<CreateTaskRequest & { parentId?: number | null }>({
  title: '',
  description: '',
  status: 'pending',
  priority: 'normal',
  dueDate: '',
  parentId: null,
  assignedToId: undefined,
})

// 用户列表
const users = ref<any[]>([])

// 筛选后的任务树
const filteredTree = computed(() => {
  if (!statusFilter.value && !priorityFilter.value) {
    return taskTree.value
  }
  return filterTreeNodes(taskTree.value)
})

// 扁平化任务列表（用于看板视图）
const flatTasks = computed(() => {
  const flatten = (nodes: TaskNode[]): TaskNode[] => {
    const result: TaskNode[] = []
    for (const node of nodes) {
      const { children, ...task } = node
      result.push(task as TaskNode)
      if (children) {
        result.push(...flatten(children))
      }
    }
    return result
  }
  
  let tasks = flatten(taskTree.value)
  
  // 应用筛选
  if (statusFilter.value) {
    tasks = tasks.filter(t => t.status === statusFilter.value)
  }
  if (priorityFilter.value) {
    tasks = tasks.filter(t => t.priority === priorityFilter.value)
  }
  
  return tasks
})

// 甘特图任务数据转换
interface GanttTaskItem {
  id: number
  title: string
  status: string
  priority: string
  progress: number
  completedCount?: number
  targetCount?: number
  dueDate?: string
  ganttStartDate?: string
  ganttEndDate?: string
  ganttMode?: string
  isOverdue: boolean
  assignedTo?: { realName: string }
  children?: GanttTaskItem[]
}

const ganttTasks = computed<GanttTaskItem[]>(() => {
  const convertTask = (task: TaskNode): GanttTaskItem => {
    const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'completed' : false
    const progress = task.status === 'completed' ? 100 : 
                     task.status === 'in_progress' ? 50 : 0
    
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      progress,
      dueDate: task.dueDate,
      ganttStartDate: task.dueDate || undefined, // 使用截止日期作为甘特图参考
      ganttEndDate: task.dueDate || undefined,
      isOverdue,
      assignedTo: task.assignedTo,
      children: task.children?.map(convertTask),
    }
  }
  
  return taskTree.value.map(convertTask)
})

// 甘特图日期范围（当前月）
const ganttDateRange = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  return { start, end }
})

// 甘特图任务点击
const onGanttTaskClick = (task: GanttTaskItem) => {
  // 找到对应的原始任务
  const findTask = (nodes: TaskNode[], id: number): TaskNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findTask(node.children, id)
        if (found) return found
      }
    }
    return null
  }
  const taskNode = findTask(taskTree.value, task.id)
  if (taskNode) {
    selectedTask.value = taskNode
  }
}

// 递归筛选节点
const filterTreeNodes = (nodes: TaskNode[]): TaskNode[] => {
  const result: TaskNode[] = []
  for (const node of nodes) {
    let match = true
    if (statusFilter.value && node.status !== statusFilter.value) {
      match = false
    }
    if (priorityFilter.value && node.priority !== priorityFilter.value) {
      match = false
    }

    const filteredChildren = node.children ? filterTreeNodes(node.children) : []

    if (match || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : undefined })
    }
  }
  return result
}

const STATUS_TAG_MAP: Record<string, string> = {
  pending: 'info',
  in_progress: 'warning',
  completed: 'success',
}

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成',
}

const PRIORITY_TAG_MAP: Record<string, string> = {
  urgent_important: 'danger',
  important: 'warning',
  urgent: 'warning',
  normal: '',
  low: 'info',
}

const PRIORITY_LABEL_MAP: Record<string, string> = {
  urgent_important: '重要紧急',
  important: '重要不紧急',
  urgent: '紧急不重要',
  normal: '普通',
  low: '低',
}

// 标签类型映射
const statusTagType = (status: string) => STATUS_TAG_MAP[status] || 'info'

const statusLabel = (status: string) => STATUS_LABEL_MAP[status] || status

const priorityTagType = (priority: string) => PRIORITY_TAG_MAP[priority] || ''

const priorityLabel = (priority: string) => PRIORITY_LABEL_MAP[priority] || priority

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

// 加载任务树
const loadTaskTree = async () => {
  loading.value = true
  try {
    taskTree.value = await api.tasks.getTree() as TaskNode[]
  } catch (error) {
    console.error('加载任务失败', error)
    ElMessage.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

// 加载用户列表
const loadUsers = async () => {
  try {
    const res = await api.accounts.list({ page: 1, pageSize: 1000 }) as any
    users.value = res.list || res.items || res || []
  } catch (error) {
    console.error('加载用户列表失败', error)
  }
}

// 节点点击
const onNodeClick = (data: TaskNode) => {
  selectedTask.value = data
  // 关闭右键菜单
  contextMenuVisible.value = false
}

// 看板视图：任务点击
const onTaskClick = (task: any) => {
  selectedTask.value = task as TaskNode
}

// 看板视图：任务更新回调
const onTaskUpdate = (taskId: number, data: any) => {
  loadTaskTree()
}

// 右键菜单
const onNodeContextMenu = (e: MouseEvent, data: TaskNode) => {
  e.preventDefault()
  contextMenuTask.value = data
  
  // 边界检测：避免菜单超出视口
  const menuWidth = 180
  const menuHeight = 200
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let x = e.clientX
  let y = e.clientY
  
  if (x + menuWidth > viewportWidth) {
    x = viewportWidth - menuWidth - 8
  }
  if (y + menuHeight > viewportHeight) {
    y = viewportHeight - menuHeight - 8
  }
  
  contextMenuX.value = Math.max(8, x)
  contextMenuY.value = Math.max(8, y)
  contextMenuVisible.value = true
}

// 筛选任务
const filterTasks = () => {
  // computed 会自动响应
}

// 完成任务
const handleCompleteTask = async (task: TaskNode | null) => {
  if (!task) return
  try {
    await api.tasks.update(task.id, { status: 'completed' })
    ElMessage.success('任务已完成')
    await loadTaskTree()
    if (selectedTask.value?.id === task.id) {
      selectedTask.value.status = 'completed'
    }
  } catch (error) {
    console.error('完成任务失败', error)
    ElMessage.error('完成任务失败，请重试')
  }
  contextMenuVisible.value = false
}

// 删除任务
const handleDelete = async (task: TaskNode | null) => {
  if (!task) return
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await api.tasks.delete(task.id)
    ElMessage.success('删除成功')
    await loadTaskTree()
    if (selectedTask.value?.id === task.id) {
      selectedTask.value = null
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除任务失败', error)
    }
  }
  contextMenuVisible.value = false
}

// 显示创建对话框
const showCreateDialog = (parentTask: TaskNode | null) => {
  editingId.value = null
  form.value = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'normal',
    dueDate: '',
    parentId: parentTask?.id || null,
    assignedToId: undefined,
  }
  dialogVisible.value = true
  contextMenuVisible.value = false
}

// 显示编辑对话框
const showEditDialog = (task: TaskNode) => {
  editingId.value = task.id
  form.value = {
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || '',
    parentId: task.parentId || null,
    assignedToId: (task as any).assignedToId || (task.assignedTo)?.id || undefined,
  }
  dialogVisible.value = true
  contextMenuVisible.value = false
}

// 保存任务
const handleSave = async () => {
  if (!form.value.title) {
    ElMessage.warning('请输入任务标题')
    return
  }

  try {
    // TQ1: dueDate 空字符串转 undefined，避免后端得到 Invalid Date
    const payload = { ...form.value }
    if (!payload.dueDate) {
      delete (payload as any).dueDate
    }

    if (editingId.value) {
      await api.tasks.update(editingId.value, payload as UpdateTaskRequest)
      ElMessage.success('更新成功')
    } else {
      await api.tasks.create(payload as CreateTaskRequest)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    resetForm()
    await loadTaskTree()
  } catch (error: any) {
    console.error('保存任务失败', error)
    ElMessage.error('保存失败: ' + (error.data?.message || error.message || '未知错误'))
  }
}

// 重置表单
const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'normal',
    dueDate: '',
    parentId: null,
    assignedToId: undefined,
  }
  editingId.value = null
}

// 点击其他地方关闭右键菜单
const handleGlobalClick = () => {
  contextMenuVisible.value = false
}

useTaskShortcuts({
  createTask: () => showCreateDialog(null),
  completeTask: () => handleCompleteTask(selectedTask.value),
  deleteTask: () => handleDelete(selectedTask.value),
})

onMounted(() => {
  loadTaskTree()
  loadUsers()
  document.addEventListener('click', handleGlobalClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.tasks-page {
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
  display: flex;
  gap: 0;
  overflow: hidden;
}

/* 看板、列表、甘特图容器 */
.kanban-container,
.list-container,
.gantt-container {
  flex: 1;
  height: 100%;
  overflow: auto;
  background: #f5f7fa;
  padding: 16px;
}

/* 左侧任务树面板 */
.task-tree-panel {
  width: 360px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  background: white;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #1a1a1a;
  font-size: 14px;
}

.task-count {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: normal;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 2px 0;
}

.tree-node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #2c2c2c;
  margin-right: 8px;
}

.tree-node-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.status-tag,
.priority-tag {
  font-size: 11px !important;
  padding: 0 4px !important;
  line-height: 16px !important;
  height: 16px !important;
}

.empty-text {
  text-align: center;
  color: #bfbfbf;
  font-size: 13px;
  padding: 40px 0;
}

/* 右侧任务详情面板 */
.task-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.detail-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.detail-item {
  margin-bottom: 20px;
}

.detail-item label {
  display: block;
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 6px;
  font-weight: 500;
}

.detail-item span {
  font-size: 14px;
  color: #2c2c2c;
}

.description-text {
  font-size: 14px;
  color: #4a4a4a;
  line-height: 1.6;
  white-space: pre-wrap;
  background: #fafbfc;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.empty-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  gap: 12px;
}

.empty-detail p {
  font-size: 14px;
  margin: 0;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 3000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #2c2c2c;
}

.context-menu-item:hover {
  background-color: #f3f4f6;
}

.context-menu-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 4px 0;
}

/* Element Plus Tree 样式覆盖 */
:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  height: 36px;
  padding: 0 4px;
  border-radius: 6px;
  margin: 2px 0;
}

:deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

:deep(.is-current > .el-tree-node__content) {
  background-color: #e6f7ff !important;
}

:deep(.el-tree-node__expand-icon) {
  color: #8c8c8c;
}

/* Element Plus Dialog 样式 */
:deep(.w-full) {
  width: 100%;
}

/* 响应式 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .task-tree-panel {
    width: 100%;
    min-width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}

/* ====== 平板竖屏专属优化 ====== */
.device-tablet.orientation-portrait .tasks-page,
.tablet-screen.portrait .tasks-page {
  height: calc(100vh - 104px) !important;
}

/* 平板竖屏时工具栏紧凑 */
.device-tablet.orientation-portrait .toolbar,
.tablet-screen.portrait .toolbar {
  padding: 8px 12px !important;
}

.device-tablet.orientation-portrait .toolbar h3,
.tablet-screen.portrait .toolbar h3 {
  font-size: 15px !important;
}

/* 平板竖屏时主内容区上下布局 */
.device-tablet.orientation-portrait .main-content,
.tablet-screen.portrait .main-content {
  flex-direction: column !important;
}

/* 任务树面板全宽 */
.device-tablet.orientation-portrait .task-tree-panel,
.tablet-screen.portrait .task-tree-panel {
  width: 100% !important;
  min-width: 100% !important;
  max-height: 45vh !important;
  border-right: none !important;
  border-bottom: 1px solid #e5e7eb !important;
}

/* 详情面板全宽 */
.device-tablet.orientation-portrait .task-detail-panel,
.tablet-screen.portrait .task-detail-panel {
  flex: 1 !important;
}

.device-tablet.orientation-portrait .detail-header,
.tablet-screen.portrait .detail-header {
  padding: 12px 16px !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.device-tablet.orientation-portrait .detail-title,
.tablet-screen.portrait .detail-title {
  font-size: 16px !important;
}

.device-tablet.orientation-portrait .detail-body,
.tablet-screen.portrait .detail-body {
  padding: 12px 16px !important;
}

/* 树节点触摸区域增大 */
.device-tablet.orientation-portrait :deep(.el-tree-node__content),
.tablet-screen.portrait :deep(.el-tree-node__content) {
  height: 44px !important;
  padding: 4px 8px !important;
}

/* 右键菜单触摸优化 */
.device-tablet.orientation-portrait .context-menu,
.tablet-screen.portrait .context-menu {
  min-width: 180px !important;
}

.device-tablet.orientation-portrait .context-menu-item,
.tablet-screen.portrait .context-menu-item {
  padding: 12px 16px !important;
  font-size: 15px !important;
}

/* 看板视图触摸优化 */
.device-tablet.orientation-portrait .kanban-container,
.tablet-screen.portrait .kanban-container {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
}

.device-tablet.orientation-portrait :deep(.el-button-group),
.tablet-screen.portrait :deep(.el-button-group) {
  min-height: 36px !important;
}

.device-tablet.orientation-portrait :deep(.el-button-group .el-button),
.tablet-screen.portrait :deep(.el-button-group .el-button) {
  min-height: 36px !important;
  padding: 8px 12px !important;
}

/* 空状态触摸优化 */
.device-tablet.orientation-portrait .empty-text,
.tablet-screen.portrait .empty-text {
  padding: 60px 0 !important;
  font-size: 14px !important;
}

.device-tablet.orientation-portrait .empty-detail,
.tablet-screen.portrait .empty-detail {
  gap: 16px !important;
}

.device-tablet.orientation-portrait .empty-detail p,
.tablet-screen.portrait .empty-detail p {
  font-size: 15px !important;
}

/* 标签触摸优化 */
.device-tablet.orientation-portrait .status-tag,
.tablet-screen.portrait .status-tag,
.device-tablet.orientation-portrait .priority-tag,
.tablet-screen.portrait .priority-tag {
  min-height: 24px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
}

/* 树节点标签触摸优化 */
.device-tablet.orientation-portrait .tree-node-tags,
.tablet-screen.portrait .tree-node-tags {
  gap: 6px !important;
}

/* 详情项触摸优化 */
.device-tablet.orientation-portrait .detail-item,
.tablet-screen.portrait .detail-item {
  margin-bottom: 20px !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid #f0f0f0 !important;
}

.device-tablet.orientation-portrait .detail-item:last-child,
.tablet-screen.portrait .detail-item:last-child {
  border-bottom: none !important;
}

.device-tablet.orientation-portrait .detail-item label,
.tablet-screen.portrait .detail-item label {
  font-size: 12px !important;
  margin-bottom: 8px !important;
}

.device-tablet.orientation-portrait .detail-item span,
.tablet-screen.portrait .detail-item span {
  font-size: 15px !important;
}

.device-tablet.orientation-portrait .detail-item .el-tag,
.tablet-screen.portrait .detail-item .el-tag {
  min-height: 32px !important;
  padding: 0 12px !important;
  font-size: 13px !important;
}

/* 描述文本触摸优化 */
.device-tablet.orientation-portrait .description-text,
.tablet-screen.portrait .description-text {
  padding: 14px 16px !important;
  font-size: 14px !important;
  line-height: 1.7 !important;
}

/* 任务计数触摸优化 */
.device-tablet.orientation-portrait .task-count,
.tablet-screen.portrait .task-count {
  padding: 3px 10px !important;
  font-size: 12px !important;
}

/* ====== 深度优化：空间利用率提升（对标飞书任务 v4） ====== */

/* 页面容器 flex 布局 */
.device-tablet.orientation-portrait .tasks-page,
.tablet-screen.portrait .tasks-page {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  padding: 8px !important;
}

/* 工具栏紧凑网格布局 */
.device-tablet.orientation-portrait .toolbar,
.tablet-screen.portrait .toolbar {
  flex-shrink: 0 !important;
  padding: 8px !important;
  margin-bottom: 8px !important;
  background: #f8f9fa !important;
  border-radius: 8px !important;
}

.device-tablet.orientation-portrait .toolbar > div,
.tablet-screen.portrait .toolbar > div {
  flex-wrap: wrap !important;
  gap: 6px !important;
}

/* 视图切换按钮全宽网格 */
.device-tablet.orientation-portrait .toolbar .el-button-group,
.tablet-screen.portrait .toolbar .el-button-group {
  width: 100% !important;
  display: flex !important;
}

.device-tablet.orientation-portrait .toolbar .el-button-group .el-button,
.tablet-screen.portrait .toolbar .el-button-group .el-button {
  flex: 1 !important;
  min-height: 36px !important;
}

/* 主内容区占满剩余空间 */
.device-tablet.orientation-portrait .main-content,
.tablet-screen.portrait .main-content {
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 任务树面板紧凑 */
.device-tablet.orientation-portrait .task-tree-panel,
.tablet-screen.portrait .task-tree-panel {
  max-height: 40vh !important;
  background: white !important;
  border-radius: 8px !important;
  padding: 8px !important;
}

/* 树节点紧凑 */
.device-tablet.orientation-portrait :deep(.el-tree-node__content),
.tablet-screen.portrait :deep(.el-tree-node__content) {
  height: 40px !important;
  padding: 4px 6px !important;
}

.device-tablet.orientation-portrait :deep(.el-tree-node__label),
.tablet-screen.portrait :deep(.el-tree-node__label) {
  font-size: 13px !important;
}

/* 树节点标签紧凑 */
.device-tablet.orientation-portrait .tree-node-tags,
.tablet-screen.portrait .tree-node-tags {
  gap: 4px !important;
  margin-left: 6px !important;
}

.device-tablet.orientation-portrait .tree-node-tags .el-tag,
.tablet-screen.portrait .tree-node-tags .el-tag {
  min-height: 20px !important;
  padding: 0 6px !important;
  font-size: 10px !important;
  line-height: 18px !important;
}

/* 详情面板优化 */
.device-tablet.orientation-portrait .task-detail-panel,
.tablet-screen.portrait .task-detail-panel {
  flex: 1 !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  background: white !important;
  border-radius: 8px !important;
  margin-top: 8px !important;
  padding: 12px !important;
}

/* 详情头部紧凑 */
.device-tablet.orientation-portrait .detail-header,
.tablet-screen.portrait .detail-header {
  padding: 8px 0 !important;
  margin-bottom: 12px !important;
  border-bottom: 1px solid #f0f0f0 !important;
}

.device-tablet.orientation-portrait .detail-title,
.tablet-screen.portrait .detail-title {
  font-size: 15px !important;
  font-weight: 600 !important;
  margin-bottom: 4px !important;
}

/* 详情项紧凑 */
.device-tablet.orientation-portrait .detail-item,
.tablet-screen.portrait .detail-item {
  margin-bottom: 12px !important;
  padding-bottom: 8px !important;
}

.device-tablet.orientation-portrait .detail-item label,
.tablet-screen.portrait .detail-item label {
  font-size: 11px !important;
  color: #888 !important;
  margin-bottom: 4px !important;
  display: block !important;
}

.device-tablet.orientation-portrait .detail-item span,
.tablet-screen.portrait .detail-item span {
  font-size: 13px !important;
  color: #333 !important;
}

/* 状态和优先级标签紧凑 */
.device-tablet.orientation-portrait .status-tag,
.tablet-screen.portrait .status-tag,
.device-tablet.orientation-portrait .priority-tag,
.tablet-screen.portrait .priority-tag {
  min-height: 22px !important;
  padding: 0 6px !important;
  font-size: 11px !important;
  line-height: 20px !important;
}

/* 描述文本紧凑 */
.device-tablet.orientation-portrait .description-text,
.tablet-screen.portrait .description-text {
  padding: 8px 10px !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
  background: #f8f9fa !important;
  border-radius: 6px !important;
}

/* 看板视图优化 */
.device-tablet.orientation-portrait .kanban-container,
.tablet-screen.portrait .kanban-container {
  padding: 0 !important;
}

.device-tablet.orientation-portrait .kanban-column,
.tablet-screen.portrait .kanban-column {
  min-width: 260px !important;
  max-width: 280px !important;
}

.device-tablet.orientation-portrait .kanban-card,
.tablet-screen.portrait .kanban-card {
  padding: 10px !important;
  margin-bottom: 6px !important;
}

.device-tablet.orientation-portrait .kanban-card-title,
.tablet-screen.portrait .kanban-card-title {
  font-size: 13px !important;
  margin-bottom: 4px !important;
}

/* 列表视图优化 */
.device-tablet.orientation-portrait .list-container,
.tablet-screen.portrait .list-container {
  padding: 8px !important;
}

.device-tablet.orientation-portrait .list-toolbar,
.tablet-screen.portrait .list-toolbar {
  flex-direction: column !important;
  gap: 8px !important;
  padding: 8px !important;
}

/* 甘特图视图优化 */
.device-tablet.orientation-portrait .gantt-container,
.tablet-screen.portrait .gantt-container {
  padding: 0 !important;
}

/* 空状态优化 */
.device-tablet.orientation-portrait .empty-text,
.tablet-screen.portrait .empty-text {
  padding: 40px 0 !important;
  font-size: 13px !important;
  color: #999 !important;
}

.device-tablet.orientation-portrait .empty-detail,
.tablet-screen.portrait .empty-detail {
  padding: 40px 0 !important;
}

.device-tablet.orientation-portrait .empty-detail p,
.tablet-screen.portrait .empty-detail p {
  font-size: 13px !important;
  color: #999 !important;
}

/* 右键菜单优化 */
.device-tablet.orientation-portrait .context-menu,
.tablet-screen.portrait .context-menu {
  min-width: 160px !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
}

.device-tablet.orientation-portrait .context-menu-item,
.tablet-screen.portrait .context-menu-item {
  padding: 10px 14px !important;
  font-size: 13px !important;
  min-height: 40px !important;
}

/* 滚动条优化 */
.device-tablet.orientation-portrait .tasks-page ::-webkit-scrollbar,
.tablet-screen.portrait .tasks-page ::-webkit-scrollbar {
  width: 6px !important;
  height: 6px !important;
}

.device-tablet.orientation-portrait .tasks-page ::-webkit-scrollbar-thumb,
.tablet-screen.portrait .tasks-page ::-webkit-scrollbar-thumb {
  background: #d0d0d0 !important;
  border-radius: 3px !important;
}

/* 加载状态优化 */
.device-tablet.orientation-portrait .tasks-page .el-loading-spinner,
.tablet-screen.portrait .tasks-page .el-loading-spinner {
  transform: scale(0.85) !important;
}

/* 任务计数紧凑 */
.device-tablet.orientation-portrait .task-count,
.tablet-screen.portrait .task-count {
  padding: 2px 8px !important;
  font-size: 11px !important;
  min-height: 20px !important;
  line-height: 18px !important;
}

/* 对话框全屏优化 */
.device-tablet.orientation-portrait .tasks-page :deep(.el-dialog),
.tablet-screen.portrait .tasks-page :deep(.el-dialog) {
  width: 95vw !important;
  max-width: 95vw !important;
  margin: 2vh auto !important;
  max-height: 96vh !important;
}

.device-tablet.orientation-portrait .tasks-page :deep(.el-dialog__body),
.tablet-screen.portrait .tasks-page :deep(.el-dialog__body) {
  padding: 12px 16px !important;
  max-height: 80vh !important;
  overflow-y: auto !important;
}

/* 表单紧凑 */
.device-tablet.orientation-portrait .tasks-page :deep(.el-form-item),
.tablet-screen.portrait .tasks-page :deep(.el-form-item) {
  margin-bottom: 10px !important;
}

.device-tablet.orientation-portrait .tasks-page :deep(.el-form-item__label),
.tablet-screen.portrait .tasks-page :deep(.el-form-item__label) {
  font-size: 12px !important;
}

.device-tablet.orientation-portrait .tasks-page :deep(.el-input__inner),
.tablet-screen.portrait .tasks-page :deep(.el-input__inner),
.device-tablet.orientation-portrait .tasks-page :deep(.el-textarea__inner),
.tablet-screen.portrait .tasks-page :deep(.el-textarea__inner) {
  min-height: 36px !important;
  padding: 6px 10px !important;
  font-size: 13px !important;
}
</style>
