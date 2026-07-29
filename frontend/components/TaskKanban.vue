<template>
  <div class="kanban-board">
    <!-- 搜索过滤栏 -->
    <div class="kanban-toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索任务..."
        prefix-icon="Search"
        clearable
        size="small"
        style="width: 180px"
      />
      <span class="task-count">共 {{ filteredTasks.length }} 个任务</span>
    </div>

    <!-- 看板列 -->
    <div class="kanban-columns">
      <div 
        v-for="column in columns" 
        :key="column.status" 
        class="kanban-column"
        @dragover.prevent="onDragOver($event, column.status)"
        @drop="onDrop($event, column.status)"
      >
        <!-- 列头 -->
        <div class="column-header">
          <div class="column-title">
            <span class="column-icon">{{ column.icon }}</span>
            <span>{{ column.title }}</span>
            <span class="column-count">{{ column.tasks.length }}</span>
          </div>
        </div>

        <!-- 任务卡片 -->
        <div class="column-body">
          <div
            v-for="task in column.tasks"
            :key="task.id"
            class="kanban-card"
            :class="{ 
              'is-dragging': draggingTask?.id === task.id,
              'priority-urgent': task.priority === 'urgent_important',
              'priority-important': task.priority === 'important',
            }"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @click="onTaskClick(task)"
          >
            <!-- 优先级标识 -->
            <div class="card-priority-indicator" :class="`priority-${task.priority}`"></div>
            
            <!-- 任务标题 -->
            <h4 class="card-title">{{ task.title }}</h4>
            
            <!-- 任务描述 -->
            <p v-if="task.description" class="card-description">
              {{ task.description.substring(0, 60) }}{{ task.description.length > 60 ? '...' : '' }}
            </p>
            
            <!-- 标签 -->
            <div class="card-tags">
              <el-tag size="small" :type="priorityTagType(task.priority)">
                {{ priorityLabel(task.priority) }}
              </el-tag>
              <el-tag v-if="task.dueDate" size="small" :type="isOverdue(task.dueDate) ? 'danger' : 'info'">
                {{ formatDate(task.dueDate) }}
              </el-tag>
            </div>
            
            <!-- 指派信息 -->
            <div v-if="task.assignedTo" class="card-footer">
              <el-avatar :size="24">
                {{ task.assignedTo.realName?.charAt(0) }}
              </el-avatar>
              <span class="assignee-name">{{ task.assignedTo.realName }}</span>
            </div>
          </div>
          
          <!-- 空列提示 -->
          <div v-if="column.tasks.length === 0" class="empty-column">
            <el-icon :size="32" color="#d9d9d9"><Document /></el-icon>
            <p>拖拽任务到此处</p>
          </div>
        </div>
      </div>
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
          <span>{{ formatDate(selectedTask.createdAt) }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Document, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

const props = defineProps<{
  tasks: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  'task:update': [taskId: number, data: any]
  'task:click': [task: any]
}>()

const api = useApi()

// 搜索关键词
const searchKeyword = ref('')

// 筛选后的任务
const filteredTasks = computed(() => {
  if (!searchKeyword.value) return props.tasks
  const keyword = searchKeyword.value.toLowerCase()
  return props.tasks.filter(t => 
    t.title.toLowerCase().includes(keyword) ||
    t.description?.toLowerCase().includes(keyword)
  )
})

// 看板列定义
const columns = computed(() => {
  const allTasks = filteredTasks.value || []
  
  return [
    {
      status: 'pending',
      title: '待办',
      icon: '📋',
      tasks: allTasks.filter(t => t.status === 'pending'),
    },
    {
      status: 'in_progress',
      title: '进行中',
      icon: '🔄',
      tasks: allTasks.filter(t => t.status === 'in_progress'),
    },
    {
      status: 'completed',
      title: '已完成',
      icon: '✅',
      tasks: allTasks.filter(t => t.status === 'completed'),
    },
    {
      status: 'cancelled',
      title: '已取消',
      icon: '❌',
      tasks: allTasks.filter(t => t.status === 'cancelled'),
    },
  ]
})

// 拖拽状态
const draggingTask = ref<any>(null)

// 任务详情
const detailVisible = ref(false)
const selectedTask = ref<any>(null)

// 拖拽事件
const onDragStart = (event: DragEvent, task: any) => {
  draggingTask.value = task
  event.dataTransfer?.setData('text/plain', task.id.toString())
  event.dataTransfer!.effectAllowed = 'move'
}

const onDragEnd = () => {
  draggingTask.value = null
}

const onDragOver = (event: DragEvent, columnStatus: string) => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
}

const onDrop = async (event: DragEvent, columnStatus: string) => {
  event.preventDefault()
  
  if (!draggingTask.value) return
  
  const taskId = draggingTask.value.id
  const oldStatus = draggingTask.value.status
  
  // 如果状态没有改变，不处理
  if (oldStatus === columnStatus) {
    draggingTask.value = null
    return
  }
  
  try {
    // 更新任务状态
    await api.tasks.update(taskId, { status: columnStatus })
    ElMessage.success('任务状态已更新')
    
    // 更新本地拖拽任务状态
    draggingTask.value.status = columnStatus
    
    // 通知父组件更新
    emit('task:update', taskId, { status: columnStatus })
  } catch (error: any) {
    console.error('更新任务状态失败', error)
    ElMessage.error('更新失败，请重试')
  } finally {
    draggingTask.value = null
  }
}

// 任务点击
const onTaskClick = (task: any) => {
  selectedTask.value = { ...task }
  detailVisible.value = true
  emit('task:click', task)
}

// 更新任务状态
const updateTaskStatus = async () => {
  if (!selectedTask.value) return
  
  try {
    await api.tasks.update(selectedTask.value.id, { 
      status: selectedTask.value.status 
    })
    ElMessage.success('状态已更新')
  } catch (error) {
    ElMessage.error('更新失败')
  }
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

// 是否逾期
const isOverdue = (date: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}
</script>

<style scoped>
.kanban-board {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  padding: 16px;
  background: #f5f7fa;
}

.kanban-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 16px 0;
}

.task-count {
  font-size: 13px;
  color: #8c8c8c;
}

.kanban-columns {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.kanban-column {
  flex: 1;
  min-width: 280px;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}

.kanban-column.drag-over {
  background: #e6f7ff;
  border: 2px dashed #409eff;
}

.column-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.column-icon {
  font-size: 18px;
}

.column-count {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: normal;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.column-body {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
  cursor: grab;
  transition: all 0.2s;
  position: relative;
}

.kanban-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.kanban-card.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.card-priority-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 8px 0 0 8px;
}

.card-priority-indicator.priority-urgent_important {
  background: #f56c6c;
}

.card-priority-indicator.priority-important {
  background: #e6a23c;
}

.card-priority-indicator.priority-urgent {
  background: #409eff;
}

.card-title {
  margin: 0 0 8px 8px;
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
}

.card-description {
  margin: 0 0 8px 8px;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-left: 8px;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  margin-left: 8px;
}

.assignee-name {
  font-size: 12px;
  color: #595959;
}

.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #bfbfbf;
  text-align: center;
}

.empty-column p {
  margin-top: 8px;
  font-size: 13px;
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
  .kanban-columns {
    flex-direction: column;
  }
  
  .kanban-column {
    min-width: 100%;
    max-width: 100%;
  }
}
</style>
