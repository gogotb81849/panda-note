<template>
  <el-dialog
    v-model="visible"
    title="搜索日程"
    width="620px"
    :close-on-click-modal="true"
    append-to-body
    custom-class="hw-search-dialog"
    destroy-on-close
  >
    <div class="hw-search">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="keyword"
          placeholder="输入标题、分类、船舶或详情进行搜索…"
          clearable
          size="large"
          @input="onKeywordInput"
          @keyup.enter="doSearch"
        >
          <template #prefix>
            <el-icon :size="16"><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" size="large" :loading="loading" @click="doSearch">搜索</el-button>
      </div>

      <!-- 过滤条件 -->
      <div class="filter-bar">
        <el-select v-model="filterPriority" size="small" placeholder="优先级" clearable style="width: 140px">
          <el-option label="🔴 重要紧急" value="urgent_important" />
          <el-option label="🟡 重要不紧急" value="important" />
          <el-option label="🔵 紧急不重要" value="urgent" />
          <el-option label="🟢 不紧急不重要" value="normal" />
        </el-select>
        <el-select v-model="filterStatus" size="small" placeholder="状态" clearable style="width: 120px">
          <el-option label="待处理" value="pending" />
          <el-option label="进行中" value="in_progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-date-picker
          v-model="filterRange"
          type="daterange"
          size="small"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 280px"
        />
        <el-button size="small" text @click="resetFilters">重置</el-button>
      </div>

      <!-- 搜索结果列表 -->
      <div class="result-wrap">
        <div v-if="!hasSearched" class="result-hint result-empty">
          <el-icon :size="36"><Search /></el-icon>
          <div class="hint-text">输入关键词并点击搜索，或从筛选条件中缩小范围</div>
        </div>

        <div v-else-if="loading" class="result-hint">
          <el-icon class="is-loading" :size="28"><Loading /></el-icon>
          <div class="hint-text">正在搜索…</div>
        </div>

        <div v-else-if="results.length === 0" class="result-hint result-empty">
          <el-icon :size="36"><DocumentDelete /></el-icon>
          <div class="hint-text">没有找到匹配的日程，试试其他关键词</div>
        </div>

        <div v-else class="result-list">
          <div class="result-meta">
            共找到 <b>{{ results.length }}</b> 条结果
            <span v-if="results.length > resultLimit">，前 {{ resultLimit }} 条如下</span>
          </div>
          <div
            v-for="r in displayedResults"
            :key="r.id"
            class="result-item"
            :class="priorityBgClass(r.priority)"
            @click="handleItemClick(r)"
          >
            <div class="ri-left">
              <div class="ri-date">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(r.recordDate) }}</span>
                <span v-if="r.startTime" class="ri-time">{{ formatTime(r.startTime) }}</span>
              </div>
              <div class="ri-title" :class="priorityTextClass(r.priority)">
                {{ r.secondType || r.firstType || '(未命名日程)' }}
              </div>
              <div v-if="r.eventDetail" class="ri-detail">{{ r.eventDetail }}</div>
              <div class="ri-meta">
                <el-tag size="small" :type="priorityTagType(r.priority)" effect="light">
                  {{ priorityLabel(r.priority) }}
                </el-tag>
                <el-tag size="small" :type="statusTagType(r.finishStatus)" effect="plain">
                  {{ statusLabel(r.finishStatus) }}
                </el-tag>
                <span v-if="r.ship?.cnShipName" class="ri-ship">
                  <el-icon><OfficeBuilding /></el-icon>
                  {{ r.ship.cnShipName }}
                </span>
              </div>
            </div>
            <div class="ri-right">
              <el-button size="small" type="primary" link @click.stop="handleItemClick(r)">查看</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Calendar, OfficeBuilding, Loading, DocumentDelete } from '@element-plus/icons-vue'
import type { Schedule } from '~/types'

interface Props {
  modelValue: boolean
  schedules: Schedule[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'pick', schedule: Schedule): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const api = useApi()

const keyword = ref('')
const filterPriority = ref('')
const filterStatus = ref('')
const filterRange = ref<[string, string] | null>(null)
const loading = ref(false)
const hasSearched = ref(false)
const allResults = ref<Schedule[]>([])
const resultLimit = 100

// 简单本地搜索（如果 schedules 已经是全量数据，就不用调后端了）
const localSchedulesReady = computed(() => Array.isArray(props.schedules) && props.schedules.length > 0)

function onKeywordInput() {
  // 不做实时防抖搜索，等用户回车或点按钮
}

async function doSearch() {
  hasSearched.value = true
  loading.value = true
  try {
    if (localSchedulesReady.value) {
      // 本地过滤
      allResults.value = localFilter(props.schedules)
    } else {
      // 兜底：走后端搜索 API（如果有的话）
      try {
        const params: any = {}
        if (keyword.value) params.keyword = keyword.value
        if (filterPriority.value) params.priority = filterPriority.value
        if (filterStatus.value) params.finishStatus = filterStatus.value
        if (filterRange.value?.[0]) params.startDate = filterRange.value[0]
        if (filterRange.value?.[1]) params.endDate = filterRange.value[1]
        // search API 尚未实现，直接 getAll 后本地过滤
        const data: any = await api.schedules.getAll()
        const list: Schedule[] = Array.isArray(data) ? data : (data?.list ?? [])
        allResults.value = localFilter(list)
      } catch (err) {
        console.error('[SearchDialog] doSearch 后端兜底失败:', err)
        allResults.value = []
      }
    }
  } finally {
    loading.value = false
  }
}

function localFilter(list: Schedule[]): Schedule[] {
  const kw = keyword.value.trim().toLowerCase()
  return list.filter((s) => {
    if (filterPriority.value && s.priority !== filterPriority.value) return false
    if (filterStatus.value && s.finishStatus !== filterStatus.value) return false
    if (filterRange.value?.[0]) {
      const d = s.recordDate ? String(s.recordDate).split('T')[0] : ''
      if (d && d < filterRange.value[0]) return false
    }
    if (filterRange.value?.[1]) {
      const d = s.recordDate ? String(s.recordDate).split('T')[0] : ''
      if (d && d > filterRange.value[1]) return false
    }
    if (!kw) return true
    const hay = [
      s.firstType ?? '',
      s.secondType ?? '',
      s.eventDetail ?? '',
      (s as any).ship?.cnShipName ?? '',
    ].join(' ').toLowerCase()
    return hay.includes(kw)
  }).sort((a, b) => {
    const ad = new Date(a.recordDate ?? 0).getTime()
    const bd = new Date(b.recordDate ?? 0).getTime()
    return bd - ad // 倒序，最近的在前面
  })
}

const results = computed(() => allResults.value)
const displayedResults = computed(() => results.value.slice(0, resultLimit))

function resetFilters() {
  keyword.value = ''
  filterPriority.value = ''
  filterStatus.value = ''
  filterRange.value = null
  allResults.value = []
  hasSearched.value = false
}

function handleItemClick(r: Schedule) {
  emit('pick', r)
  visible.value = false
}

function formatDate(d: any): string {
  if (!d) return '—'
  const s = String(d).split('T')[0]
  return s
}
function formatTime(dt: any): string {
  if (!dt) return ''
  try {
    const d = new Date(String(dt).replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}
function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    urgent_important: '重要紧急',
    important: '重要不紧急',
    urgent: '紧急不重要',
    normal: '不紧急不重要',
    low: '低优先级',
  }
  return map[p] ?? p
}
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[s] ?? s
}
function priorityTagType(p: string): any {
  const map: Record<string, any> = {
    urgent_important: 'danger', important: 'warning', urgent: 'primary', normal: 'success', low: 'info',
  }
  return map[p] ?? 'info'
}
function statusTagType(s: string): any {
  const map: Record<string, any> = {
    pending: 'info', in_progress: 'warning', completed: 'success', cancelled: 'danger',
  }
  return map[s] ?? 'info'
}
function priorityBgClass(p: string): string {
  const map: Record<string, string> = {
    urgent_important: 'bg-urgent-important',
    important: 'bg-important',
    urgent: 'bg-urgent',
    normal: 'bg-normal',
    low: 'bg-low',
  }
  return map[p] ?? 'bg-normal'
}
function priorityTextClass(p: string): string {
  const map: Record<string, string> = {
    urgent_important: 'tx-danger', important: 'tx-warning', urgent: 'tx-primary', normal: 'tx-success', low: 'tx-info',
  }
  return map[p] ?? ''
}

// 打开时自动加载全部本地结果（如果无关键词和筛选）
watch(visible, (v) => {
  if (v) {
    hasSearched.value = false
    allResults.value = []
  }
})
</script>

<style>
.hw-search-dialog .el-dialog__body { padding: 16px 20px 2px; }
</style>

<style scoped>
.hw-search { display: flex; flex-direction: column; gap: 12px; }

.search-bar {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.search-bar .el-input { flex: 1; }

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 2px 0;
}

.result-wrap {
  min-height: 260px;
  max-height: 480px;
  overflow-y: auto;
  padding: 4px 0;
}

.result-hint {
  height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #909399;
}
.result-hint.result-empty .el-icon { color: #dcdfe6; }
.hint-text { font-size: 13px; color: #909399; }

.result-meta {
  font-size: 12px;
  color: #606266;
  padding: 4px 4px 10px;
}
.result-meta b { color: #f56c6c; font-size: 13px; }

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
  gap: 12px;
  border-left: 4px solid #c0c4cc;
}
.result-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
.result-item.bg-urgent-important { border-left-color: #f56c6c; }
.result-item.bg-important       { border-left-color: #e6a23c; }
.result-item.bg-urgent          { border-left-color: #409eff; }
.result-item.bg-normal          { border-left-color: #67c23a; }
.result-item.bg-low             { border-left-color: #909399; }

.ri-left { flex: 1; min-width: 0; }
.ri-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.ri-date .ri-time { margin-left: 4px; color: #606266; font-weight: 500; }
.ri-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 2px;
}
.ri-title.tx-danger  { color: #f56c6c; }
.ri-title.tx-warning { color: #e6a23c; }
.ri-title.tx-primary { color: #409eff; }
.ri-title.tx-success { color: #67c23a; }
.ri-title.tx-info    { color: #909399; }

.ri-detail {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ri-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ri-ship {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #606266;
}
</style>
