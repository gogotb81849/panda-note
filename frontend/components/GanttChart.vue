<template>
  <div class="gantt-chart" :class="{ loading }">
    <!-- 顶部控制栏 -->
    <div class="gantt-toolbar" v-if="showToolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="localViewMode" size="small" @change="handleViewModeChange">
          <el-radio-button value="day">日</el-radio-button>
          <el-radio-button value="week">周</el-radio-button>
          <el-radio-button value="month">月</el-radio-button>
        </el-radio-group>
        <el-tag size="small" class="task-count-tag">
          共 {{ taskCount }} 个任务
        </el-tag>
      </div>
      <div class="toolbar-right">
        <slot name="toolbar" />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="gantt-loading">
      <div class="loading-spinner"></div>
      <p>加载甘特图数据...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="tasks.length === 0" class="gantt-empty">
      <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p>暂无任务数据</p>
      <p class="empty-hint">请设置任务的甘特图日期范围，或等待任务发布</p>
    </div>

    <!-- 甘特图主体 -->
    <div v-else class="gantt-container">
      <!-- 左侧任务列表 -->
      <div class="gantt-task-list">
        <div class="task-list-header">
          <div class="header-cell header-name">任务名称</div>
          <div class="header-cell header-progress">进度</div>
          <div class="header-cell header-status">状态</div>
        </div>
        <div class="task-list-body">
          <template v-for="task in flattenedTasks" :key="task.id">
            <div
              class="task-row"
              :class="{ 'is-root': task.depth === 0, 'has-children': task.children?.length > 0, 'is-overdue': task.isOverdue }"
              @mouseenter="handleTaskHover(task)"
              @mouseleave="handleTaskHover(null)"
            >
              <div class="task-cell task-name">
                <span class="depth-indent" :style="{ width: `${task.depth * 20}px` }"></span>
                <span v-if="task.hasChildren" class="expand-icon" @click="toggleExpand(task.id)">
                  <svg v-if="expandedTasks.has(task.id)" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <span class="task-title" :title="task.title">{{ task.title }}</span>
                <span v-if="task.assignedTo" class="assignee-tag">{{ task.assignedTo.realName }}</span>
              </div>
              <div class="task-cell task-progress">
                <div class="progress-bar-mini">
                  <div class="progress-fill-mini" :style="{ width: `${task.progress}%`, backgroundColor: task.isOverdue ? '#f56c6c' : '#409eff' }"></div>
                  <span class="progress-text">{{ task.progress }}%</span>
                </div>
              </div>
              <div class="task-cell task-status">
                <el-tag :type="getTaskStatusType(task)" size="small">
                  {{ getStatusLabel(task.status) }}
                </el-tag>
                <el-tag v-if="task.isOverdue" type="danger" size="small" class="overdue-tag">
                  逾期
                </el-tag>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 右侧时间轴 -->
      <div class="gantt-timeline" ref="timelineRef">
        <!-- 时间轴头部 -->
        <div class="timeline-header">
          <div
            v-for="day in timelineDays"
            :key="day.dateStr"
            class="day-header"
            :class="{
              'is-weekend': day.isWeekend,
              'is-today': day.isToday,
            }"
            :style="{ width: `${dayWidth}px` }"
          >
            <div class="day-label">{{ day.dayNum }}</div>
            <div class="day-weekday">{{ day.weekday }}</div>
          </div>
        </div>

        <!-- 时间轴主体 -->
        <div class="timeline-body">
          <!-- 背景网格 -->
          <div class="timeline-grid">
            <div
              v-for="day in timelineDays"
              :key="'grid-' + day.dateStr"
              class="grid-cell"
              :class="{
                'is-weekend': day.isWeekend,
                'is-today': day.isToday,
              }"
              :style="{ width: `${dayWidth}px` }"
            ></div>
          </div>

          <!-- 任务条 -->
          <template v-for="task in flattenedTasks" :key="'bar-' + task.id">
            <div class="timeline-row">
              <div
                v-if="task.ganttStartDate || task.dueDate"
                class="gantt-bar"
                :class="{ 'is-overdue': task.isOverdue, 'is-completed': task.status === 'completed' }"
                :style="getBarStyle(task)"
                @mouseenter="handleBarHover(task, $event)"
                @mouseleave="handleBarHover(null)"
              >
                <div class="bar-inner" :style="{ width: `${Math.max(task.progress, 5)}%` }"></div>
                <span class="bar-label">{{ task.progress }}%</span>

                <!-- 悬停提示 -->
                <div v-if="hoveredTask?.id === task.id" class="bar-tooltip">
                  <div class="tooltip-title">{{ task.title }}</div>
                  <div class="tooltip-row">
                    <span>进度：</span>
                    <strong>{{ task.completedCount }}/{{ task.targetCount }}</strong>
                  </div>
                  <div class="tooltip-row" v-if="task.ganttStartDate">
                    <span>开始：</span>
                    <strong>{{ formatDate(task.ganttStartDate) }}</strong>
                  </div>
                  <div class="tooltip-row" v-if="task.dueDate || task.ganttEndDate">
                    <span>截止：</span>
                    <strong>{{ formatDate(task.dueDate || task.ganttEndDate) }}</strong>
                  </div>
                  <div class="tooltip-row" v-if="task.assignedTo">
                    <span>负责人：</span>
                    <strong>{{ task.assignedTo.realName }}</strong>
                  </div>
                </div>
              </div>
              <!-- 里程碑（无持续时间但有截止日期的任务） -->
              <div
                v-else-if="task.dueDate"
                class="gantt-milestone"
                :class="{ 'is-overdue': task.isOverdue }"
                :style="getMilestoneStyle(task)"
              >
                <svg viewBox="0 0 24 24" class="milestone-icon">
                  <path d="M12 2L2 12l10 10 10-10L12 2z" fill="currentColor"/>
                </svg>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 模式A：多目标进度详情弹窗 -->
    <el-dialog
      v-model="showMultiTargetDialog"
      :title="selectedTask?.title"
      width="700px"
      class="multi-target-dialog"
    >
      <div v-if="selectedTask" class="multi-target-content">
        <!-- 双进度条 -->
        <div class="dual-progress">
          <div class="progress-item">
            <div class="progress-header">
              <span class="progress-label">
                <span class="progress-dot work-dot"></span>
                工作进度
              </span>
              <span class="progress-value">{{ selectedTask.completedCount }}/{{ selectedTask.targetCount }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill work-fill" :style="{ width: `${selectedTask.progress}%` }"></div>
            </div>
          </div>
          <div class="progress-item" v-if="selectedTask.ganttStartDate && selectedTask.ganttEndDate">
            <div class="progress-header">
              <span class="progress-label">
                <span class="progress-dot time-dot"></span>
                时间进度
              </span>
              <span class="progress-value">{{ timeProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill time-fill" :style="{ width: `${timeProgress}%` }"></div>
            </div>
          </div>
        </div>

        <!-- 船舶状态网格 -->
        <div class="ship-status-section">
          <h4>船舶完成状态</h4>
          <div class="ship-status-grid">
            <div
              v-for="ship in shipStatuses"
              :key="ship.shipId"
              class="ship-status-item"
              :class="ship.status"
              :title="`${ship.shipName} - ${getShipStatusLabel(ship.status)}`"
            >
              <span class="ship-name">{{ getShortShipName(ship.shipName) }}</span>
              <span class="ship-status-icon">
                <svg v-if="ship.status === 'completed'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else-if="ship.status === 'overdue'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { GanttTaskItem, GanttShipStatus, GanttDataResponse } from '~/composables/useGantt';

interface Props {
  tasks: GanttTaskItem[];
  dateRange?: { start: Date; end: Date };
  loading?: boolean;
  viewMode?: 'day' | 'week' | 'month';
  showToolbar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  viewMode: 'day',
  showToolbar: true,
});

const emit = defineEmits<{
  'update:viewMode': [mode: 'day' | 'week' | 'month'];
  'task-click': [task: GanttTaskItem];
}>();

const localViewMode = ref<'day' | 'week' | 'month'>(props.viewMode);
const expandedTasks = ref<Set<number>>(new Set());
const hoveredTask = ref<GanttTaskItem | null>(null);
const showMultiTargetDialog = ref(false);
const selectedTask = ref<GanttTaskItem | null>(null);
const shipStatuses = ref<GanttShipStatus[]>([]);
const timelineRef = ref<HTMLElement | null>(null);

const { getShipTaskStatus } = useGantt();

// 计算时间跨度
const timelineDays = computed(() => {
  if (!props.dateRange) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return generateDays(start, end);
  }
  return generateDays(props.dateRange.start, props.dateRange.end);
});

const dayWidth = computed(() => {
  switch (localViewMode.value) {
    case 'day': return 50;
    case 'week': return 30;
    case 'month': return 15;
    default: return 50;
  }
});

// 扁平化任务树
interface FlattenedTask extends GanttTaskItem {
  depth: number;
  hasChildren: boolean;
}

const flattenedTasks = computed<FlattenedTask[]>(() => {
  const result: FlattenedTask[] = [];
  const flatten = (tasks: GanttTaskItem[], depth: number) => {
    for (const task of tasks) {
      const hasChildren = task.children && task.children.length > 0;
      result.push({ ...task, depth, hasChildren, children: task.children || [] } as FlattenedTask);
      if (hasChildren && expandedTasks.value.has(task.id)) {
        flatten(task.children, depth + 1);
      }
    }
  };
  flatten(props.tasks, 0);
  return result;
});

const taskCount = computed(() => {
  const count = (tasks: GanttTaskItem[]): number => {
    return tasks.reduce((sum, t) => sum + 1 + count(t.children || []), 0);
  };
  return count(props.tasks);
});

// 时间进度百分比
const timeProgress = computed(() => {
  if (!selectedTask.value?.ganttStartDate || !selectedTask.value?.ganttEndDate) return 0;
  const start = new Date(selectedTask.value.ganttStartDate).getTime();
  const end = new Date(selectedTask.value.ganttEndDate).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
});

function generateDays(start: Date, end: Date) {
  const days = [];
  const current = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();
    days.push({
      date: new Date(current),
      dateStr,
      dayNum: current.getDate(),
      weekday: ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isToday: current.getTime() === today.getTime(),
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getBarStyle(task: FlattenedTask) {
  const days = timelineDays.value;
  if (days.length === 0) return { left: '0px', width: '0px' };

  const startDate = task.ganttStartDate || task.dueDate;
  const endDate = task.ganttEndDate || task.dueDate;
  if (!startDate || !endDate) return { left: '0px', width: '0px' };

  const start = new Date(startDate);
  const end = new Date(endDate);

  const firstDay = new Date(days[0].date);
  const lastDay = new Date(days[days.length - 1].date);

  // 裁剪到可见范围内
  const visibleStart = start < firstDay ? firstDay : start;
  const visibleEnd = end > lastDay ? lastDay : end;

  const startOffset = Math.max(0, (visibleStart.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
  const duration = Math.max(1, (visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24) + 1);

  return {
    left: `${startOffset * dayWidth.value}px`,
    width: `${duration * dayWidth.value}px`,
  };
}

function getMilestoneStyle(task: FlattenedTask) {
  if (!task.dueDate) return { left: '0px' };
  const days = timelineDays.value;
  if (days.length === 0) return { left: '0px' };

  const dueDate = new Date(task.dueDate);
  const firstDay = new Date(days[0].date);
  const offset = (dueDate.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24);

  return { left: `${offset * dayWidth.value}px` };
}

function toggleExpand(taskId: number) {
  const set = new Set(expandedTasks.value);
  if (set.has(taskId)) {
    set.delete(taskId);
  } else {
    set.add(taskId);
  }
  expandedTasks.value = set;
}

function handleTaskHover(task: GanttTaskItem | null) {
  hoveredTask.value = task;
}

async function handleBarHover(task: GanttTaskItem | null, event?: MouseEvent) {
  hoveredTask.value = task;
  if (task && event && task.ganttMode === 'multi-target') {
    // 双击打开多目标详情
  }
}

function handleViewModeChange(mode: 'day' | 'week' | 'month') {
  emit('update:viewMode', mode);
}

function getTaskStatusType(task: GanttTaskItem): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  if (task.isOverdue) return 'danger';
  switch (task.status) {
    case 'completed': return 'success';
    case 'in_progress': return 'warning';
    case 'cancelled': return 'info';
    default: return 'info';
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] || status;
}

function getShipStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: '已完成',
    overdue: '已逾期',
    pending: '待完成',
    in_progress: '进行中',
  };
  return map[status] || status;
}

function getShortShipName(name: string): string {
  if (name.length > 4) {
    return name.slice(0, 4);
  }
  return name;
}

function formatDate(date: string | Date | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 双击任务条打开多目标详情
const handleBarDoubleClick = async (task: GanttTaskItem) => {
  selectedTask.value = task;
  if (task.ganttMode === 'multi-target' || task.targetCount > 1) {
    try {
      shipStatuses.value = await getShipTaskStatus(task.id);
    } catch (e) {
      shipStatuses.value = [];
    }
  }
  showMultiTargetDialog.value = true;
};

// Expose for parent usage
defineExpose({
  handleBarDoubleClick,
});
</script>

<style scoped>
.gantt-chart {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.gantt-chart.loading {
  opacity: 0.7;
}

/* 工具栏 */
.gantt-toolbar {
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

.task-count-tag {
  font-weight: 500;
}

/* 加载/空状态 */
.gantt-loading,
.gantt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #c0c4cc;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.gantt-empty svg {
  margin-bottom: 16px;
}

.gantt-empty .empty-hint {
  font-size: 12px;
  margin-top: 8px;
}

/* 甘特图主体 */
.gantt-container {
  display: flex;
  overflow: hidden;
  height: 500px;
}

/* 左侧任务列表 */
.gantt-task-list {
  flex-shrink: 0;
  width: 320px;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.task-list-header {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e8e8e8;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  padding: 8px 0;
}

.header-cell {
  padding: 0 8px;
}

.header-name {
  flex: 1;
  min-width: 0;
}

.header-progress {
  width: 80px;
  text-align: center;
}

.header-status {
  width: 100px;
  text-align: center;
}

.task-list-body {
  flex: 1;
  overflow-y: auto;
}

.task-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.15s;
  cursor: pointer;
}

.task-row:hover {
  background-color: #f8f9fa;
}

.task-row.is-overdue {
  background-color: #fef0f0;
}

.task-row.is-overdue:hover {
  background-color: #fde2e2;
}

.task-cell {
  padding: 0 8px;
}

.task-name {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.depth-indent {
  flex-shrink: 0;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
  color: #909399;
}

.expand-icon:hover {
  color: #409eff;
}

.task-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assignee-tag {
  font-size: 11px;
  color: #909399;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.task-progress {
  width: 80px;
}

.progress-bar-mini {
  position: relative;
  height: 16px;
  background: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.progress-fill-mini {
  height: 100%;
  border-radius: 8px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #606266;
  font-weight: 500;
}

.task-status {
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.overdue-tag {
  font-size: 10px;
}

/* 右侧时间轴 */
.gantt-timeline {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  overflow-y: hidden;
}

.timeline-header {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #f0f0f0;
  flex-shrink: 0;
  padding: 4px 0;
}

.day-header.is-weekend {
  background: #fafafa;
}

.day-header.is-today {
  background: #e8f4ff;
}

.day-label {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.day-header.is-weekend .day-label {
  color: #f56c6c;
}

.day-header.is-today .day-label {
  color: #409eff;
  font-size: 14px;
}

.day-weekday {
  font-size: 10px;
  color: #909399;
}

.timeline-body {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.timeline-grid {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.grid-cell {
  border-right: 1px solid #f5f5f5;
  flex-shrink: 0;
}

.grid-cell.is-weekend {
  background: #fafafa;
}

.grid-cell.is-today {
  background: rgba(64, 158, 255, 0.05);
}

.timeline-row {
  position: relative;
  height: 36px;
  border-bottom: 1px solid #f5f5f5;
}

/* 甘特图任务条 */
.gantt-bar {
  position: absolute;
  top: 6px;
  height: 24px;
  background: #e8f4ff;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 1;
}

.gantt-bar:hover {
  transform: scaleY(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.gantt-bar.is-overdue {
  background: #fef0f0;
}

.gantt-bar.is-completed {
  background: #f0f9eb;
}

.bar-inner {
  height: 100%;
  background: #409eff;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.gantt-bar.is-overdue .bar-inner {
  background: #f56c6c;
}

.gantt-bar.is-completed .bar-inner {
  background: #67c23a;
}

.bar-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 悬停提示 */
.bar-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #303133;
  color: white;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #303133;
}

.tooltip-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
}

.tooltip-row {
  display: flex;
  gap: 4px;
  margin-top: 2px;
  color: #c0c4cc;
}

.tooltip-row strong {
  color: #fff;
}

/* 里程碑 */
.gantt-milestone {
  position: absolute;
  top: 6px;
  width: 24px;
  height: 24px;
  transform: translateX(-50%);
  cursor: pointer;
}

.milestone-icon {
  width: 100%;
  height: 100%;
  color: #e6a23c;
}

.gantt-milestone.is-overdue .milestone-icon {
  color: #f56c6c;
}

/* 多目标弹窗 */
.multi-target-content {
  padding: 8px 0;
}

.dual-progress {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.work-dot {
  background: #409eff;
}

.time-dot {
  background: #e6a23c;
}

.progress-value {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.progress-bar {
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.work-fill {
  background: linear-gradient(90deg, #409eff, #66b1ff);
}

.time-fill {
  background: linear-gradient(90deg, #e6a23c, #f5b854);
}

.ship-status-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}

.ship-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.ship-status-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #e8e8e8;
  background: white;
}

.ship-status-item.completed {
  border-color: #c2e7b0;
  background: #f0f9eb;
}

.ship-status-item.overdue {
  border-color: #fbc4c4;
  background: #fef0f0;
}

.ship-status-item.pending {
  border-color: #e8e8e8;
  background: #fafafa;
}

.ship-status-item.in_progress {
  border-color: #f5d5b0;
  background: #fdf6ec;
}

.ship-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60px;
}

.ship-status-icon {
  flex-shrink: 0;
}

.ship-status-item.completed .ship-status-icon {
  color: #67c23a;
}

.ship-status-item.overdue .ship-status-icon {
  color: #f56c6c;
}

/* 响应式 */
@media (max-width: 768px) {
  .gantt-container {
    flex-direction: column;
    height: auto;
  }

  .gantt-task-list {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e8e8e8;
  }

  .task-list-body {
    max-height: 200px;
  }

  .timeline-body {
    max-height: 400px;
  }
}
</style>
