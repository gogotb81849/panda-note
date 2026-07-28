<template>
  <div class="gantt-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>甘特图</h2>
      <p class="page-desc">可视化查看任务进度和时间安排</p>
    </div>

    <!-- 筛选控制面板 -->
    <div class="filter-panel">
      <div class="filter-row">
        <!-- 日期范围选择 -->
        <div class="filter-item">
          <label>日期范围</label>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="loadData"
          />
        </div>

        <!-- 快捷日期范围 -->
        <div class="filter-item">
          <label>快捷选择</label>
          <el-button-group>
            <el-button size="small" @click="setRange('month')">本月</el-button>
            <el-button size="small" @click="setRange('quarter')">本季度</el-button>
            <el-button size="small" @click="setRange('year')">本年度</el-button>
          </el-button-group>
        </div>

        <!-- 视图模式 -->
        <div class="filter-item">
          <label>视图模式</label>
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="day">日视图</el-radio-button>
            <el-radio-button value="week">周视图</el-radio-button>
            <el-radio-button value="month">月视图</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 操作按钮 -->
        <div class="filter-item filter-actions">
          <el-button type="primary" size="small" @click="loadData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button size="small" @click="exportData" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </div>
      </div>
    </div>

    <!-- 甘特图主体 -->
    <GanttChart
      :tasks="tasks"
      :dateRange="parsedDateRange"
      :loading="loading"
      :viewMode="viewMode"
      @update:viewMode="viewMode = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { Refresh, Download } from '@element-plus/icons-vue';
import type { GanttTaskItem } from '~/composables/useGantt';

definePageMeta({
  middleware: ['auth'],
});

const { fetchGanttData, exportGanttData: doExport } = useGantt();

const loading = ref(false);
const exporting = ref(false);
const tasks = ref<GanttTaskItem[]>([]);
const viewMode = ref<'day' | 'week' | 'month'>('day');
const dateRange = ref<[string, string] | null>(null);

const parsedDateRange = computed(() => {
  if (!dateRange.value) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
  return {
    start: new Date(dateRange.value[0]),
    end: new Date(dateRange.value[1]),
  };
});

function setRange(type: 'month' | 'quarter' | 'year') {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (type) {
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
  }

  dateRange.value = [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0],
  ];
  loadData();
}

async function loadData() {
  if (!dateRange.value) {
    setRange('month');
    return;
  }

  loading.value = true;
  try {
    const res = await fetchGanttData(dateRange.value[0], dateRange.value[1]);
    tasks.value = res.tasks;
  } catch (e: any) {
    ElMessage.error('加载甘特图数据失败');
  } finally {
    loading.value = false;
  }
}

async function exportData() {
  if (!dateRange.value) return;
  exporting.value = true;
  try {
    await doExport(dateRange.value[0], dateRange.value[1]);
    ElMessage.success('导出成功');
  } catch (e: any) {
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  setRange('month');
});
</script>

<style scoped>
.gantt-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: #808080;
}

.filter-panel {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-item label {
  font-size: 12px;
  color: #808080;
  font-weight: 500;
}

.filter-actions {
  flex-direction: row;
  align-items: flex-end;
  gap: 8px;
  margin-left: auto;
}

/* 响应式 */
@media (max-width: 1024px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions {
    margin-left: 0;
    justify-content: flex-end;
  }
}
</style>
