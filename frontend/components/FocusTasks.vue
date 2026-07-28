<template>
  <div class="focus-tasks-section">
    <div class="card-header-with-action">
      <h3 class="card-title">⭐ 重点任务</h3>
      <div style="display: flex; gap: 8px;">
        <el-button type="info" size="small" @click="goToDashboard">
          <el-icon><PieChart /></el-icon>
          看板
        </el-button>
        <el-button type="primary" size="small" circle @click="openAddTaskDialog" class="add-task-btn" title="添加任务">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </div>
    <div v-if="filteredTasks.length > 0" class="diary-list">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="diary-item task-item"
        :class="{ 'is-completed': task.isCompleted, 'is-pinned': task.isPinned }"
        @click="openTaskDialog(task)"
        @contextmenu.prevent="onTaskContextMenu($event, task)"
      >
        <span v-if="task.isPinned" class="pin-icon">⭐</span>
        <div class="task-content">
          <div class="diary-date">{{ task.title }}</div>
          <div class="diary-preview">{{ task.itemCount }}项检查 · {{ formatDateShort(task.publishedAt || task.createdAt) }}</div>
        </div>
      </div>
    </div>
    <div v-else class="empty-text">暂无任务</div>
  </div>

  <!-- 任务右键菜单 -->
  <div v-if="contextMenu.visible" class="task-context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
    <div class="menu-item" @click="togglePin(contextMenu.task)">
      <span class="menu-icon">{{ contextMenu.task.isPinned ? '⭐' : '☆' }}</span>
      {{ contextMenu.task.isPinned ? '取消置顶' : '置顶' }}
    </div>
    <div class="menu-item" @click="toggleComplete(contextMenu.task)">
      <span class="menu-icon">{{ contextMenu.task.isCompleted ? '' : '✓' }}</span>
      {{ contextMenu.task.isCompleted ? '标记未完成' : '标记已完成' }}
    </div>
    <div class="menu-divider"></div>
    <div class="menu-item danger" @click="dismissTask(contextMenu.task)">
      <span class="menu-icon">✕</span>
      移除显示
    </div>
  </div>

  <!-- 任务详情弹窗 -->
  <el-dialog v-model="taskDialogVisible" :title="currentTask?.title || '任务详情'" width="500px">
    <div v-if="currentTask" class="task-detail">
      <div class="task-detail-header">
        <span class="task-detail-date">{{ formatDateShort(currentTask.publishedAt || currentTask.createdAt) }}</span>
        <el-tag :type="currentTask.isPublished ? 'success' : 'info'" size="small">{{ currentTask.isPublished ? '已发布' : '草稿' }}</el-tag>
      </div>
      <el-divider style="margin: 12px 0" />
      <div class="task-items">
        <div v-for="(item, idx) in currentTask.items" :key="idx" class="task-item-row">
          <span class="task-item-index">{{ idx + 1 }}.</span>
          <span class="task-item-text">{{ item }}</span>
        </div>
      </div>
      <el-divider style="margin: 16px 0 8px" />
      <div class="task-detail-footer">共 {{ currentTask.items?.length || 0 }} 项检查内容</div>
    </div>
    <template #footer>
      <el-button @click="taskDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 添加任务弹窗 -->
  <el-dialog v-model="addTaskDialogVisible" title="添加任务" width="500px" :close-on-click-modal="false">
    <el-form label-position="top" class="add-task-form">
      <el-form-item label="任务类型">
        <el-radio-group v-model="newTask.type">
          <el-radio value="personal">个人任务</el-radio>
          <el-radio value="ship">发布给船舶</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="newTask.type === 'personal'">
        <el-form-item label="任务标题" required>
          <el-input v-model="newTask.title" placeholder="请输入任务标题，如：明日抵港检查准备" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input v-model="newTask.description" type="textarea" :rows="3" placeholder="请输入任务描述（选填）" />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="newTask.dueDate" type="date" placeholder="选择截止日期" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item label="选择船舶" required>
          <el-select v-model="newTask.shipId" placeholder="请选择船舶" filterable style="width: 100%">
            <el-option v-for="ship in shipList" :key="ship.id" :label="ship.cnShipName" :value="ship.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务内容" required>
          <el-input v-model="newTask.content" type="textarea" :rows="4" placeholder="请直接描述任务内容" />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="newTask.dueDate" type="date" placeholder="选择截止日期" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="addTaskDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAddTask">确定添加</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PieChart, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Ship } from '~/types'

const props = defineProps<{
  shipList: Ship[]
}>()

const emit = defineEmits<{
  (e: 'taskAdded'): void
}>()

const api = useApi()

const tasks = ref<any[]>([])
const taskDialogVisible = ref(false)
const addTaskDialogVisible = ref(false)
const currentTask = ref<any>(null)

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  task: null as any,
})

const newTask = ref({
  type: 'personal',
  title: '',
  description: '',
  dueDate: '',
  shipId: undefined as number | undefined,
  content: '',
})

const filteredTasks = computed(() => {
  return tasks.value.filter(t => !t.isDismissed).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })
})

const formatDateShort = (dateStr: string | null | undefined) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const loadTasks = async () => {
  try {
    tasks.value = await api.task.getAll()
  } catch {
    tasks.value = []
  }
}

const goToDashboard = () => {
  window.location.href = '/dashboard'
}

const openTaskDialog = (task: any) => {
  currentTask.value = task
  taskDialogVisible.value = true
}

const openAddTaskDialog = () => {
  newTask.value = {
    type: 'personal',
    title: '',
    description: '',
    dueDate: '',
    shipId: undefined,
    content: '',
  }
  addTaskDialogVisible.value = true
}

const onTaskContextMenu = (e: MouseEvent, task: any) => {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    task,
  }
  document.addEventListener('click', closeContextMenu)
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
  document.removeEventListener('click', closeContextMenu)
}

const togglePin = async (task: any) => {
  closeContextMenu()
  try {
    await api.task.update(task.id, { isPinned: !task.isPinned })
    task.isPinned = !task.isPinned
    ElMessage.success(task.isPinned ? '已置顶' : '已取消置顶')
  } catch {
    ElMessage.error('操作失败')
  }
}

const toggleComplete = async (task: any) => {
  closeContextMenu()
  try {
    await api.task.update(task.id, { isCompleted: !task.isCompleted })
    task.isCompleted = !task.isCompleted
    ElMessage.success(task.isCompleted ? '已标记完成' : '已标记未完成')
  } catch {
    ElMessage.error('操作失败')
  }
}

const dismissTask = async (task: any) => {
  closeContextMenu()
  try {
    await api.task.update(task.id, { isDismissed: true })
    task.isDismissed = true
    ElMessage.success('已移除显示')
  } catch {
    ElMessage.error('操作失败')
  }
}

const confirmAddTask = async () => {
  try {
    if (newTask.value.type === 'personal') {
      await api.task.create({
        title: newTask.value.title,
        description: newTask.value.description,
        dueDate: newTask.value.dueDate,
        type: 'personal',
      })
    } else {
      await api.task.create({
        title: newTask.value.content.substring(0, 50),
        content: newTask.value.content,
        shipId: newTask.value.shipId,
        dueDate: newTask.value.dueDate,
        type: 'ship',
      })
    }
    ElMessage.success('任务添加成功')
    addTaskDialogVisible.value = false
    loadTasks()
    emit('taskAdded')
  } catch (error: any) {
    ElMessage.error('添加失败: ' + (error.message || '未知错误'))
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.focus-tasks-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.diary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diary-item {
  padding: 10px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.diary-item:hover {
  background: #f0f5ff;
}

.diary-item.is-completed {
  opacity: 0.6;
  text-decoration: line-through;
}

.diary-item.is-pinned {
  background: #fffbe6;
  border-left: 3px solid #faad14;
}

.pin-icon {
  font-size: 14px;
  margin-right: 8px;
}

.task-content {
  display: flex;
  flex-direction: column;
}

.diary-date {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.diary-preview {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.empty-text {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 20px;
}

.task-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 9999;
  min-width: 140px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: #303133;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-item.danger {
  color: #f56c6c;
}

.menu-icon {
  font-size: 12px;
}

.menu-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

.task-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-detail-date {
  font-size: 13px;
  color: #909399;
}

.task-items {
  max-height: 300px;
  overflow-y: auto;
}

.task-item-row {
  display: flex;
  gap: 8px;
  padding: 6px 0;
}

.task-item-index {
  font-weight: 600;
  color: #409eff;
}

.task-item-text {
  color: #303133;
}

.task-detail-footer {
  font-size: 12px;
  color: #909399;
}

.add-task-form {
  padding: 8px;
}
</style>
