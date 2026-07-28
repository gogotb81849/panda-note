<template>
  <div class="search-page">
    <div class="page-header">
      <h2 class="page-title">高级查询</h2>
      <p class="page-subtitle">按船舶、分类、状态、优先级、日期范围、关键词进行筛选，并支持导出 CSV。</p>
    </div>

    <!-- 筛选区 -->
    <div class="filter-card">
      <el-form :model="filters" label-width="90px" size="default">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="所属船舶">
              <el-select v-model="filters.shipId" placeholder="选择船舶" clearable style="width: 100%">
                <el-option
                  v-for="ship in ships"
                  :key="ship.id"
                  :label="ship.cnShipName"
                  :value="ship.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="一级分类">
              <el-select v-model="filters.firstType" placeholder="选择分类" clearable style="width: 100%" @change="onFirstTypeChange">
                <el-option
                  v-for="type in firstTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="二级分类">
              <el-select v-model="filters.secondType" placeholder="选择分类" clearable style="width: 100%" :disabled="!filters.firstType">
                <el-option
                  v-for="type in filteredSecondTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="状态">
              <el-select v-model="filters.finishStatus" placeholder="选择状态" clearable style="width: 100%">
                <el-option label="待处理" value="pending" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="优先级">
              <el-select v-model="filters.priority" placeholder="选择优先级" clearable style="width: 100%">
                <el-option label="重要紧急" value="urgent_important" />
                <el-option label="重要不紧急" value="important" />
                <el-option label="紧急不重要" value="urgent" />
                <el-option label="不紧急不重要" value="normal" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="关键词">
              <el-input
                v-model="filters.keyword"
                placeholder="搜索标题 / 事件详情 / 分类..."
                clearable
                style="width: 100%"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="开始日期">
              <el-date-picker
                v-model="filters.startDate"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="结束日期">
              <el-date-picker
                v-model="filters.endDate"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="flex gap-2 justify-end">
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" @click="currentPage = 1">查询</el-button>
          <el-button type="success" plain @click="handleExport" :disabled="filteredSchedules.length === 0">
            <el-icon><Download /></el-icon>
            导出 CSV
          </el-button>
        </div>
      </el-form>
    </div>

    <!-- 结果区 -->
    <div class="result-card">
      <div class="result-header">
        <span class="result-count">
          共 <b>{{ filteredSchedules.length }}</b> 条记录，已应用筛选：显示 {{ pageData.length }} 条
        </span>
      </div>

      <el-table :data="pageData" stripe style="width: 100%" height="calc(100vh - 440px)">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="recordDate" label="登记日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.recordDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="shipId" label="所属船舶" width="140">
          <template #default="{ row }">
            {{ ships.find((s) => s.id === row.shipId)?.cnShipName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="firstType" label="一级分类" width="110" />
        <el-table-column prop="secondType" label="二级分类" width="110" />
        <el-table-column prop="eventDetail" label="事件详情" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="filters.keyword" v-html="highlight(row.eventDetail || '')"></span>
            <span v-else>{{ row.eventDetail || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="finishStatus" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.finishStatus)" size="small">
              {{ getStatusText(row.finishStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small" effect="plain">
              {{ getPriorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteSchedule(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredSchedules.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>

    <!-- 编辑弹窗（复用 schedule/index.vue 的 inline 弹窗编辑体验） -->
    <el-dialog v-model="dialogVisible" title="编辑日程" width="800px" @close="resetForm">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="登记日期" required>
              <el-date-picker
                v-model="form.recordDate"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属船舶">
              <el-select v-model="form.shipId" placeholder="选择船舶" style="width: 100%">
                <el-option
                  v-for="ship in ships"
                  :key="ship.id"
                  :label="ship.cnShipName"
                  :value="ship.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="一级分类" required>
              <el-select v-model="form.firstType" placeholder="选择分类" style="width: 100%" @change="onFormFirstTypeChange">
                <el-option
                  v-for="type in firstTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="二级分类" required>
              <el-select v-model="form.secondType" placeholder="选择分类" style="width: 100%" :disabled="!form.firstType">
                <el-option
                  v-for="type in filteredFormSecondTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
                <el-option label="重要紧急" value="urgent_important" />
                <el-option label="重要不紧急" value="important" />
                <el-option label="紧急不重要" value="urgent" />
                <el-option label="不紧急不重要" value="normal" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.finishStatus" placeholder="选择状态" style="width: 100%">
                <el-option label="待处理" value="pending" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="事件详情">
          <el-input v-model="form.eventDetail" type="textarea" :rows="6" placeholder="请输入事件详情..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search, Download } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Schedule, Ship, DictCategory } from '~/types';

definePageMeta({
  middleware: ['auth'],
})

const api = useApi();

const ships = ref<Ship[]>([]);
const firstTypes = ref<DictCategory[]>([]);
const secondTypes = ref<DictCategory[]>([]);
const schedules = ref<Schedule[]>([]);

const currentPage = ref(1);
const pageSize = ref(20);

const filters = ref({
  shipId: undefined as number | undefined,
  firstType: undefined as string | undefined,
  secondType: undefined as string | undefined,
  finishStatus: undefined as string | undefined,
  priority: undefined as string | undefined,
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
  keyword: '' as string,
});

// 编辑弹窗状态
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = ref({
  recordDate: '',
  shipId: undefined as number | undefined,
  firstType: '',
  secondType: '',
  priority: 'normal' as string,
  finishStatus: 'pending',
  startTime: '',
  endTime: '',
  eventDetail: '',
});

const filteredSecondTypes = computed(() => {
  if (!filters.value.firstType) return [];
  const parent = firstTypes.value.find((ft) => ft.categoryName === filters.value.firstType);
  if (!parent) return [];
  return secondTypes.value.filter((st) => st.parentId === parent.id);
});

const filteredFormSecondTypes = computed(() => {
  if (!form.value.firstType) return [];
  const parent = firstTypes.value.find((ft) => ft.categoryName === form.value.firstType);
  if (!parent) return [];
  return secondTypes.value.filter((st) => st.parentId === parent.id);
});

const onFirstTypeChange = () => {
  filters.value.secondType = undefined;
};
const onFormFirstTypeChange = () => {
  form.value.secondType = '';
};

// 关键词高亮（仅在前端展示用，避免注入使用 replace 安全替换）
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

const highlight = (text: string) => {
  const kw = filters.value.keyword?.trim();
  if (!kw) return escapeHtml(text);
  const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escapeHtml(text).replace(re, '<mark style="background:#ffe58f;">$1</mark>');
};

// 统一的过滤逻辑（与 schedule/index.vue 一致）
const filteredSchedules = computed(() => {
  let result = [...schedules.value];
  if (filters.value.shipId) result = result.filter((s) => s.shipId === filters.value.shipId);
  if (filters.value.firstType) result = result.filter((s) => s.firstType === filters.value.firstType);
  if (filters.value.secondType) result = result.filter((s) => s.secondType === filters.value.secondType);
  if (filters.value.finishStatus) result = result.filter((s) => s.finishStatus === filters.value.finishStatus);
  if (filters.value.priority) result = result.filter((s) => s.priority === filters.value.priority);
  if (filters.value.startDate) result = result.filter((s) => (s.recordDate || '').toString().split('T')[0] >= filters.value.startDate!);
  if (filters.value.endDate) result = result.filter((s) => (s.recordDate || '').toString().split('T')[0] <= filters.value.endDate!);
  if (filters.value.keyword) {
    const kw = filters.value.keyword.toLowerCase();
    result = result.filter((s) => {
      const hay = [
        s.title,
        s.eventDetail,
        s.firstType,
        s.secondType,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }
  // 按日期倒序，和主页一致
  return result.sort((a, b) => {
    const ad = (a.recordDate || '').toString().split('T')[0];
    const bd = (b.recordDate || '').toString().split('T')[0];
    return bd.localeCompare(ad);
  });
});

const pageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredSchedules.value.slice(start, start + pageSize.value);
});

const formatDate = (v: any) => (v ? v.toString().split('T')[0] : '-');

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] || status;
};

const getPriorityType = (priority: string) => {
  const map: Record<string, any> = {
    urgent_important: 'danger',
    important: 'warning',
    urgent: 'primary',
    normal: 'success',
    low: 'info',
  };
  return map[priority] || '';
};

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: '重要紧急',
    important: '重要不紧急',
    urgent: '紧急不重要',
    normal: '不紧急不重要',
    low: '低',
  };
  return map[priority] || priority;
};

const resetFilters = () => {
  filters.value = {
    shipId: undefined,
    firstType: undefined,
    secondType: undefined,
    finishStatus: undefined,
    priority: undefined,
    startDate: undefined,
    endDate: undefined,
    keyword: '',
  };
  currentPage.value = 1;
};

const loadData = async () => {
  try {
    const [shipsData, firstTypesData, secondTypesData] = await Promise.all([
      api.ships.getAll(),
      api.dict.getFirstTypes(),
      api.dict.getSecondTypes(),
    ]);
    ships.value = shipsData;
    firstTypes.value = firstTypesData;
    secondTypes.value = secondTypesData;
  } catch (error) {
    ElMessage.error('加载基础数据失败');
  }
};

const loadSchedules = async () => {
  try {
    const data = await api.schedules.getAll();
    schedules.value = data;
  } catch (error) {
    ElMessage.error('加载台账失败');
  }
};

// --- 编辑弹窗（与 schedule/index.vue 保持一致的 inline 交互） ---
const openEditDialog = (schedule: Schedule) => {
  editingId.value = schedule.id;
  form.value = {
    recordDate: schedule.recordDate.toString().split('T')[0],
    shipId: schedule.shipId,
    firstType: schedule.firstType || '',
    secondType: schedule.secondType || '',
    priority: schedule.priority || 'normal',
    finishStatus: schedule.finishStatus || 'pending',
    startTime: formatDateTimeForDisplay(schedule.startTime),
    endTime: formatDateTimeForDisplay(schedule.endTime),
    eventDetail: schedule.eventDetail || '',
  };
  dialogVisible.value = true;
};

const resetForm = () => {
  editingId.value = null;
  form.value = {
    recordDate: '',
    shipId: undefined,
    firstType: '',
    secondType: '',
    priority: 'normal',
    finishStatus: 'pending',
    startTime: '',
    endTime: '',
    eventDetail: '',
  };
};

const formatDateTimeForDisplay = (dateTimeStr: string | null | undefined) => {
  if (!dateTimeStr) return '';
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${M}-${d} ${h}:${m}:${s}`;
  } catch {
    return '';
  }
};

const formatDateTimeForApi = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  return dateTimeStr.replace(' ', 'T');
};

const handleSave = async () => {
  if (!form.value.firstType || !form.value.secondType) {
    ElMessage.warning('请填写必填项（一级分类 / 二级分类）');
    return;
  }
  const payload = {
    ...form.value,
    startTime: form.value.startTime ? formatDateTimeForApi(form.value.startTime) : null,
    endTime: form.value.endTime ? formatDateTimeForApi(form.value.endTime) : null,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await api.schedules.update(editingId.value, payload as any);
      ElMessage.success('更新成功');
    } else {
      await api.schedules.create(payload as any);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadSchedules();
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const deleteSchedule = async (schedule: Schedule) => {
  try {
    await ElMessageBox.confirm('确定要删除这条日程吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await api.schedules.delete(schedule.id);
    ElMessage.success('删除成功');
    loadSchedules();
  } catch (error) {
    // 用户取消忽略
  }
};

// --- CSV 导出（与 schedule/index.vue 导出字段、编码一致）---
const handleExport = () => {
  if (filteredSchedules.value.length === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  try {
    const headers = ['序号', '登记日期', '所属船舶', '一级分类', '二级分类', '事件详情', '状态', '优先级'];
    const rows = filteredSchedules.value.map((s, idx) => {
      const shipName = ships.value.find((sh) => sh.id === s.shipId)?.cnShipName || '-';
      const status = getStatusText(s.finishStatus);
      const priority = getPriorityText(s.priority);
      const detail = (s.eventDetail || '').replace(/[\n\r]/g, ' ');
      const escaped = detail.includes(',') || detail.includes('"') || detail.includes('"')
        ? `"${detail.replace(/"/g, '""')}"`
        : detail;
      return [
        idx + 1,
        formatDate(s.recordDate),
        shipName,
        s.firstType || '',
        s.secondType || '',
        escaped,
        status,
        priority,
      ].join(',');
    });

    const csv = '\ufeff' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `台账查询导出_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success(`成功导出 ${filteredSchedules.value.length} 条记录`);
  } catch (e) {
    ElMessage.error('导出失败');
  }
};

onMounted(() => {
  loadData();
  loadSchedules();
});
</script>

<style scoped>
.search-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  background: white;
  padding: 16px 20px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.page-title {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #1a1a1a;
}

.page-subtitle {
  margin: 0;
  color: #8c8c8c;
  font-size: 13px;
}

.filter-card,
.result-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.result-header {
  margin-bottom: 12px;
  color: #595959;
  font-size: 13px;
}

.result-header b {
  color: #1a1a1a;
  font-size: 15px;
  margin: 0 2px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
