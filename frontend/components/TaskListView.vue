<template>
  <div class="task-list-view">
    <!-- 工具栏 -->
    <div class="list-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索任务..."
          prefix-icon="Search"
          clearable
          size="small"
          style="width: 200px"
          @input="handleSearch"
        />
        <el-select
          v-model="statusFilter"
          placeholder="状态"
          clearable
          size="small"
          style="width: 120px"
          @change="handleFilter"
        >
          <el-option label="待办" value="pending" />
          <el-option label="进行中" value="in_progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-select
          v-model="priorityFilter"
          placeholder="优先级"
          clearable
          size="small"
          style="width: 120px"
          @change="handleFilter"
        >
          <el-option label="重要紧急" value="urgent_important" />
          <el-option label="重要不紧急" value="important" />
          <el-option label="紧急不重要" value="urgent" />
          <el-option label="普通" value="normal" />
          <el-option label="低" value="low" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <span class="result-count">共 {{ filteredTasks.length }} 个任务</span>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="list-container" v-loading="loading">
      <el-table
        :data="filteredTasks"
        stripe
        highlight-current-row
        :sortable="true"
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
        @row-click="onRowClick"
        @sort-change="onSortChange"
        style="width: 100%"
        empty-text="暂无任务数据"
      >
        <el-table-column type="selection" width="50" />
        
        <el-table-column prop="title" label="任务名称" min-width="200" sortable="custom">
          <template #default="{ row }">
            <div class="task-name-cell">
              <span class="task-title" :class="{ 'is-completed': row.status === 'completed' }">
                {{ row.title }}
              </span>
              <el-tag v-if="row.children?.length" size="small" type="info">
                {{ row.children.length }} 子任务
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="120" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="120" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="priorityTagType(row.priority)" size="small">
              {{ priorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="dueDate" label="截止日期" width="140" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.dueDate" class="due-date" :class="{ 'is-overdue': isOverdue(row.dueDate) }">
              <el-icon v-if="isOverdue(row.dueDate)"><WarningFilled /></el-icon>
              {{ formatDate(row.dueDate) }}
            </span>
            <span v-else class="no-date">未设置</span>
          </template>
        </el-table-column>

        <el-table-column prop="assignedTo" label="负责人" width="120">
          <template #default="{ row }">
            <div v-if="row.assignedTo" class="assignee-cell">
              <el-avatar :size="24">
                {{ row.assignedTo.realName?.charAt(0) }}
              </el-avatar>
              <span class="assignee-name">{{ row.assignedTo.realName }}</span>
            </div>
            <span v-else class="no-assignee">未指派</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="160" sortable="custom">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" text type="primary" @click.stop="onEdit(row)">
                编辑
              </el-button>
              <el-button size="small" text type="danger" @click.stop="onDelete(row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      :title="selectedTask?.title || '任务详情'"
      width="600px"
    >
      <div v-if="selectedTask" class="task-detail">
        <div class="detail-row">
          <label>状态</label>
          <el-select v-model="selectedTask.status" @change="updateTaskStatus">
            <el-option label="待办" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </div>
        
        <div class="detail-row">
          <label>优先级</label>
          <el-tag :type="priorityTagType(selectedTask.priority)" size="large">
            {{ priorityLabel(selectedTask.priority) }}
          </el-tag>
        </div>
        
        <div class="detail-row" v-if="selectedTask.dueDate">
          <label>截止日期</label>
          <span>{{ formatDate(selectedTask.dueDate) }}</span>
        </div>
        
        <div class="detail-row" v-if="selectedTask.description">
          <label>描述</label>
          <p class="description-text">{{ selectedTask.description }}</p>
        </div>
        
        <div class="detail-row" v-if="selectedTask.assignedTo">
          <label>指派人</label>
          <span>{{ selectedTask.assignedTo.realName }}</span>
        </div>
        
        <div class="detail-row">
          <label>创建时间</label>
          <span>{{ formatDateTime(selectedTask.createdAt) }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useApi } from '~/composables/useApi'

interface TaskNode {
  id: number
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  createdAt: string
  updatedAt?: string
  parentId?: number
  assignedTo?: { id: number; realName: string }
  children?: TaskNode[]
}

const props = defineProps<{
  tasks: TaskNode[]
  loading: boolean
}>()

const emit = defineEmits<{
  'task:update': [taskId: number, data: any]
  'task:click': [task: TaskNode]
  'task:edit': [task: TaskNode]
  'task:delete': [task: TaskNode]
}>()

const api = useApi()

// 筛选状态
const searchKeyword = ref('')
const statusFilter = ref<string | undefined>(undefined)
const priorityFilter = ref<string | undefined>(undefined)
const sortConfig = ref<{ prop: string; order: string }>({ prop: 'createdAt', order: 'descending' })

// 任务详情
const detailVisible = ref(false)
const selectedTask = ref<TaskNode | null>(null)

// 扁平化任务列表
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
  return flatten(props.tasks)
})

// 筛选后的任务
const filteredTasks = computed(() => {
  let tasks = [...flatTasks.value]
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(keyword) ||
      t.description?.toLowerCase().includes(keyword)
    )
  }
  
  // 状态筛选
  if (statusFilter.value) {
    tasks = tasks.filter(t => t.status === statusFilter.value)
  }
  
  // 优先级筛选
  if (priorityFilter.value) {
    tasks = tasks.filter(t => t.priority === priorityFilter.value)
  }
  
  return tasks
})

// 排序处理
const onSortChange = ({ prop, order }: { prop: string; order: string }) => {
  sortConfig.value = { prop, order }
}

// 搜索
const handleSearch = () => {
  // 依赖 computed 自动响应
}

// 筛选
const handleFilter = () => {
  // 依赖 computed 自动响应
}

// 行点击
const onRowClick = (row: TaskNode) => {
  selectedTask.value = { ...row }
  detailVisible.value = true
  emit('task:click', row)
}

// 编辑
const onEdit = (task: TaskNode) => {
  emit('task:edit', task)
}

// 删除
const onDelete = async (task: TaskNode) => {
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    emit('task:delete', task)
  } catch {
    // 用户取消
  }
}

// 更新任务状态
const updateTaskStatus = async () => {
  if (!selectedTask.value) return
  
  try {
    await api.tasks.update(selectedTask.value.id, { 
      status: selectedTask.value.status 
    })
    ElMessage.success('状态已更新')
    emit('task:update', selectedTask.value.id, { status: selectedTask.value.status })
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

// 状态标签类型
const statusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'info',
  }
  return map[status] || 'info'
}

// 状态标签
const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待办',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

// 优先级标签类型
const priorityTagType = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: 'danger',
    important: 'warning',
    urgent: 'warning',
    normal: '',
    low: 'info',
  }
  return map[priority] || 'info'
}

// 优先级标签
const priorityLabel = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: '重要紧急',
    important: '重要不紧急',
    urgent: '紧急不重要',
    normal: '普通',
    low: '低',
  }
  return map[priority] || priority
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// 是否逾期
const isOverdue = (date: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}
</script>

<style scoped>
.task-list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count {
  font-size: 13px;
  color: #8c8c8c;
}

.list-container {
  flex: 1;
  overflow: auto;
}

.task-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-title {
  font-weight: 500;
  color: #2c2c2c;
}

.task-title.is-completed {
  text-decoration: line-through;
  color: #8c8c8c;
}

.due-date {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #2c2c2c;
}

.due-date.is-overdue {
  color: #f56c6c;
}

.no-date {
  color: #c0c4cc;
  font-size: 12px;
}

.assignee-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.assignee-name {
  font-size: 13px;
  color: #595959;
}

.no-assignee {
  color: #c0c4cc;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

/* 任务详情 */
.task-detail {
  padding: 8px 0;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}

.detail-row label {
  font-size: 13px;
  color: #8c8c8c;
  min-width: 80px;
  font-weight: 500;
}

.detail-row span,
.detail-row p {
  font-size: 14px;
  color: #2c2c2c;
}

.description-text {
  flex: 1;
  background: #fafbfc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  line-height: 1.6;
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .list-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .toolbar-left {
    flex-wrap: wrap;
  }
  
  .toolbar-right {
    justify-content: flex-end;
  }
}
</style>
