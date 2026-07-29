<template>
  <div class="page-container">
    <div class="page-header">
      <h2>诉求闭环管理</h2>
      <el-button type="primary" @click="showCreateDialog">新建诉求</el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" :class="{ active: !filterStatus }" @click="filterStatus = ''">
        <div class="stat-num">{{ stats.total }}</div>
        <div class="stat-label">全部诉求</div>
      </div>
      <div class="stat-card pending" :class="{ active: filterStatus === 'pending' }" @click="filterStatus = 'pending'">
        <div class="stat-num">{{ stats.pending }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card processing" :class="{ active: filterStatus === 'processing' }" @click="filterStatus = 'processing'">
        <div class="stat-num">{{ stats.processing }}</div>
        <div class="stat-label">处理中</div>
      </div>
      <div class="stat-card resolved" :class="{ active: filterStatus === 'resolved' }" @click="filterStatus = 'resolved'">
        <div class="stat-num">{{ stats.resolved }}</div>
        <div class="stat-label">已解决</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 140px">
        <el-option label="待处理" value="pending" />
        <el-option label="处理中" value="processing" />
        <el-option label="已解决" value="resolved" />
        <el-option label="已关闭" value="closed" />
      </el-select>
      <el-select v-model="filterPriority" placeholder="全部优先级" clearable style="width: 140px">
        <el-option label="低" value="low" />
        <el-option label="普通" value="normal" />
        <el-option label="高" value="high" />
        <el-option label="紧急" value="urgent" />
      </el-select>
      <el-select v-model="filterCategory" placeholder="全部类别" clearable style="width: 140px">
        <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-select v-model="filterShipId" placeholder="全部船舶" clearable filterable style="width: 160px">
        <el-option v-for="s in ships" :key="s.id" :label="s.cnShipName" :value="s.id" />
      </el-select>
      <el-input v-model="filterSearch" placeholder="搜索标题/内容/船员/船舶" clearable style="width: 200px" @clear="loadData" @keyup.enter="loadData" />
      <el-button type="primary" @click="loadData">搜索</el-button>
    </div>

    <!-- 诉求卡片列表 -->
    <div v-loading="loading" class="appeal-list">
      <el-empty v-if="!loading && list.length === 0" description="暂无诉求记录" />
      <div v-for="item in list" :key="item.id" class="appeal-card" @click="openDetail(item)">
        <div class="card-header">
          <span class="card-title">{{ item.title }}</span>
          <div class="card-badges">
            <el-tag :type="categoryBadgeType(item.category)" size="small">{{ categoryLabel(item.category) }}</el-tag>
            <el-tag :type="priorityBadgeType(item.priority)" size="small">{{ priorityLabel(item.priority) }}</el-tag>
            <el-tag :type="statusBadgeType(item.status)" size="small">{{ statusLabel(item.status) }}</el-tag>
          </div>
        </div>
        <div class="card-body">
          <p class="card-content">{{ item.content }}</p>
        </div>
        <div class="card-footer">
          <span class="card-meta">
            <el-icon><User /></el-icon> {{ item.crewName }}
          </span>
          <span class="card-meta">
            <el-icon><Ship /></el-icon> {{ item.shipName }}
          </span>
          <span class="card-meta">
            <el-icon><Clock /></el-icon> {{ formatDate(item.createdAt) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 新建诉求对话框 -->
    <el-dialog v-model="createVisible" title="新建诉求" width="550px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="船员姓名" required>
          <el-input v-model="createForm.crewName" placeholder="请输入船员姓名" />
        </el-form-item>
        <el-form-item label="所属船舶" required>
          <el-select v-model="createForm.shipId" placeholder="请选择船舶" filterable style="width: 100%">
            <el-option v-for="s in ships" :key="s.id" :label="s.cnShipName" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="诉求标题" required>
          <el-input v-model="createForm.title" placeholder="请输入诉求标题" />
        </el-form-item>
        <el-form-item label="诉求类别" required>
          <el-select v-model="createForm.category" placeholder="请选择类别" style="width: 100%">
            <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="createForm.priority" style="width: 100%">
            <el-option label="普通" value="normal" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="诉求内容" required>
          <el-input v-model="createForm.content" type="textarea" :rows="4" placeholder="请详细描述诉求内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">提交</el-button>
      </template>
    </el-dialog>

    <!-- 诉求详情对话框 -->
    <el-dialog v-model="detailVisible" title="诉求详情" width="650px" :close-on-click-modal="false">
      <template v-if="currentItem">
        <div class="detail-section">
          <div class="detail-header">
            <h3>{{ currentItem.title }}</h3>
            <div class="detail-badges">
              <el-tag :type="categoryBadgeType(currentItem.category)">{{ categoryLabel(currentItem.category) }}</el-tag>
              <el-tag :type="priorityBadgeType(currentItem.priority)">{{ priorityLabel(currentItem.priority) }}</el-tag>
              <el-tag :type="statusBadgeType(currentItem.status)">{{ statusLabel(currentItem.status) }}</el-tag>
            </div>
          </div>
          <div class="detail-meta">
            <span>船员：{{ currentItem.crewName }}</span>
            <span>船舶：{{ currentItem.shipName }}</span>
            <span>提交时间：{{ formatDate(currentItem.createdAt) }}</span>
          </div>
          <div class="detail-content">
            <h4>诉求内容</h4>
            <p>{{ currentItem.content }}</p>
          </div>
        </div>

        <!-- 回复内容 -->
        <div v-if="currentItem.response" class="detail-section">
          <h4>处理回复</h4>
          <div class="response-box">
            <p>{{ currentItem.response }}</p>
            <span v-if="currentItem.respondedAt" class="response-time">回复于 {{ formatDate(currentItem.respondedAt) }}</span>
          </div>
        </div>

        <!-- 状态流转时间线 -->
        <div class="detail-section">
          <h4>状态流转</h4>
          <el-timeline>
            <el-timeline-item :timestamp="formatDate(currentItem.createdAt)" placement="top" type="primary">
              创建诉求
            </el-timeline-item>
            <el-timeline-item v-if="currentItem.status !== 'pending'" :timestamp="formatDate(currentItem.updatedAt)" placement="top" type="warning">
              状态更新为：{{ statusLabel(currentItem.status) }}
            </el-timeline-item>
            <el-timeline-item v-if="currentItem.respondedAt" :timestamp="formatDate(currentItem.respondedAt)" placement="top" type="success">
              已回复
            </el-timeline-item>
            <el-timeline-item v-if="currentItem.resolvedAt" :timestamp="formatDate(currentItem.resolvedAt)" placement="top" type="success">
              已解决
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 操作区 -->
        <div v-if="currentItem.status !== 'resolved' && currentItem.status !== 'closed'" class="detail-section">
          <h4>处理操作</h4>
          <div class="action-area">
            <div class="status-buttons">
              <span class="action-label">更新状态：</span>
              <el-button
                v-if="currentItem.status === 'pending'"
                type="warning"
                size="small"
                @click="handleStatusChange('processing')"
              >
                开始处理
              </el-button>
              <el-button
                v-if="currentItem.status === 'processing'"
                type="success"
                size="small"
                @click="handleStatusChange('resolved')"
              >
                标记已解决
              </el-button>
              <el-button
                type="info"
                size="small"
                @click="handleStatusChange('closed')"
              >
                关闭诉求
              </el-button>
            </div>
            <div class="response-form">
              <el-input
                v-model="responseText"
                type="textarea"
                :rows="3"
                placeholder="输入处理回复..."
              />
              <el-button
                type="primary"
                size="small"
                style="margin-top: 8px"
                :loading="submitting"
                @click="handleSubmitResponse"
              >
                提交回复
              </el-button>
            </div>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { ElMessage } from 'element-plus'
import { User, Ship, Clock } from '@element-plus/icons-vue'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const loading = ref(false)
const submitting = ref(false)
const list = ref<any[]>([])
const ships = ref<any[]>([])

const filterStatus = ref('')
const filterPriority = ref('')
const filterCategory = ref('')
const filterShipId = ref<number | ''>('')
const filterSearch = ref('')

const createVisible = ref(false)
const detailVisible = ref(false)
const currentItem = ref<any>(null)
const responseText = ref('')

const createForm = ref({
  crewName: '',
  crewId: 0,
  shipId: null as number | null,
  shipName: '',
  title: '',
  content: '',
  category: 'other',
  priority: 'normal',
})

const stats = ref({ total: 0, pending: 0, processing: 0, resolved: 0 })

const categoryOptions = [
  { value: 'health', label: '健康' },
  { value: 'work', label: '工作' },
  { value: 'family', label: '家庭' },
  { value: 'suggestion', label: '建议' },
  { value: 'complaint', label: '投诉' },
  { value: 'other', label: '其他' },
]

const categoryMap: Record<string, { label: string; type: string }> = {
  health: { label: '健康', type: 'danger' },
  work: { label: '工作', type: 'primary' },
  family: { label: '家庭', type: 'warning' },
  suggestion: { label: '建议', type: 'success' },
  complaint: { label: '投诉', type: 'danger' },
  other: { label: '其他', type: 'info' },
}

const priorityMap: Record<string, { label: string; type: string }> = {
  low: { label: '低', type: 'info' },
  normal: { label: '普通', type: '' },
  high: { label: '高', type: 'warning' },
  urgent: { label: '紧急', type: 'danger' },
}

const statusMap: Record<string, { label: string; type: string }> = {
  pending: { label: '待处理', type: 'info' },
  processing: { label: '处理中', type: 'warning' },
  resolved: { label: '已解决', type: 'success' },
  closed: { label: '已关闭', type: '' },
}

const categoryLabel = (v: string) => categoryMap[v]?.label || v
const categoryBadgeType = (v: string) => (categoryMap[v]?.type || 'info') as any
const priorityLabel = (v: string) => priorityMap[v]?.label || v
const priorityBadgeType = (v: string) => (priorityMap[v]?.type || 'info') as any
const statusLabel = (v: string) => statusMap[v]?.label || v
const statusBadgeType = (v: string) => (statusMap[v]?.type || 'info') as any

const formatDate = (d: string) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadShips = async () => {
  try {
    ships.value = await api.ships.getAll() || []
  } catch {
    ships.value = []
  }
}

const loadStats = async () => {
  try {
    const res = await api.apiFetch('/appeal/stats')
    stats.value = res || { total: 0, pending: 0, processing: 0, resolved: 0 }
  } catch {
    // ignore
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filterStatus.value) params.append('status', filterStatus.value)
    if (filterPriority.value) params.append('priority', filterPriority.value)
    if (filterCategory.value) params.append('category', filterCategory.value)
    if (filterShipId.value) params.append('shipId', String(filterShipId.value))
    if (filterSearch.value) params.append('search', filterSearch.value)
    const query = params.toString()
    const res = await api.apiFetch(`/appeal${query ? '?' + query : ''}`)
    list.value = res || []
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  createForm.value = {
    crewName: '',
    crewId: 0,
    shipId: null,
    shipName: '',
    title: '',
    content: '',
    category: 'other',
    priority: 'normal',
  }
  createVisible.value = true
}

const handleCreate = async () => {
  if (!createForm.value.crewName || !createForm.value.title || !createForm.value.content || !createForm.value.shipId) {
    ElMessage.warning('请填写完整信息')
    return
  }
  const ship = ships.value.find((s: any) => s.id === createForm.value.shipId)
  submitting.value = true
  try {
    await api.apiFetch('/appeal', {
      method: 'POST',
      body: {
        crewId: 0,
        crewName: createForm.value.crewName,
        shipId: createForm.value.shipId,
        shipName: ship?.cnShipName || '',
        title: createForm.value.title,
        content: createForm.value.content,
        category: createForm.value.category,
        priority: createForm.value.priority,
      },
    })
    createVisible.value = false
    ElMessage.success('诉求已提交')
    loadData()
    loadStats()
  } finally {
    submitting.value = false
  }
}

const openDetail = (item: any) => {
  currentItem.value = item
  responseText.value = ''
  detailVisible.value = true
}

const handleStatusChange = async (status: string) => {
  submitting.value = true
  try {
    await api.apiFetch(`/appeal/${currentItem.value.id}/status`, {
      method: 'PUT',
      body: { status },
    })
    ElMessage.success('状态已更新')
    detailVisible.value = false
    loadData()
    loadStats()
  } finally {
    submitting.value = false
  }
}

const handleSubmitResponse = async () => {
  if (!responseText.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  submitting.value = true
  try {
    await api.apiFetch(`/appeal/${currentItem.value.id}/status`, {
      method: 'PUT',
      body: {
        status: currentItem.value.status,
        response: responseText.value,
      },
    })
    ElMessage.success('回复已提交')
    detailVisible.value = false
    loadData()
    loadStats()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadShips()
  loadStats()
  loadData()
})
</script>

<style scoped>
.page-container {
  padding: 16px;
  overflow-y: auto;
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card.active {
  border-color: #409eff;
}

.stat-card.pending .stat-num { color: #909399; }
.stat-card.processing .stat-num { color: #e6a23c; }
.stat-card.resolved .stat-num { color: #67c23a; }

.stat-num {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* 诉求卡片列表 */
.appeal-list {
  min-height: 200px;
}

.appeal-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 10px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
  border: 1px solid #ebeef5;
}

.appeal-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.card-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.card-body {
  margin-bottom: 8px;
}

.card-content {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 详情对话框 */
.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #303133;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.detail-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.detail-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.detail-content {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
}

.detail-content p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}

.response-box {
  background: #f0f9eb;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e1f3d8;
}

.response-box p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}

.response-time {
  font-size: 12px;
  color: #909399;
}

.action-area {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
}

.status-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.action-label {
  font-size: 13px;
  color: #606266;
}

.response-form {
  margin-top: 4px;
}
</style>