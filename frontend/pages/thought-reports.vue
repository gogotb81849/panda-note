<template>
  <div class="page-container">
    <div class="page-header">
      <h2>思想动态</h2>
      <el-button type="primary" @click="showCreateDialog">新增记录</el-button>
    </div>

    <!-- 预警提示 -->
    <el-alert v-if="warnings.length" :title="`⚠️ 共有 ${warnings.length} 条预警记录`" type="error" show-icon closable class="mb-3" />

    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 120px">
        <el-option label="待处理" value="open" />
        <el-option label="处理中" value="processing" />
        <el-option label="已关闭" value="closed" />
      </el-select>
      <el-select v-model="filterConcern" placeholder="全部等级" clearable style="width: 130px">
        <el-option v-for="l in concernOptions" :key="l.value" :label="l.label" :value="l.value" />
      </el-select>
    </div>

    <el-table :data="list" size="small" v-loading="loading">
      <el-table-column prop="crewName" label="涉及人员" width="100" />
      <el-table-column prop="crewPosition" label="岗位" width="80" />
      <el-table-column label="情绪状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getEmotionalType(row.emotionalState)">{{ getEmotionalLabel(row.emotionalState) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关注等级" width="110">
        <template #default="{ row }">
          <el-tag :type="getConcernType(row.concernLevel)" :effect="row.concernLevel === 'critical' ? 'dark' : 'light'">
            {{ getConcernLabel(row.concernLevel) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="situation" label="简要情况" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button v-if="row.status === 'open'" size="small" @click="updateStatus(row.id, 'processing')">处理中</el-button>
          <el-button v-if="row.status !== 'closed'" size="small" type="success" @click="handleClose(row.id)">关闭</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增思想动态" width="550px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="涉及人员">
          <el-input v-model="form.crewName" placeholder="船员姓名" />
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="form.crewPosition" placeholder="如：水手/机工等" />
        </el-form-item>
        <el-form-item label="情绪状态">
          <el-select v-model="form.emotionalState" style="width: 100%">
            <el-option v-for="s in emotionalOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关注等级">
          <el-select v-model="form.concernLevel" style="width: 100%">
            <el-option v-for="l in concernOptions" :key="l.value" :label="l.label" :value="l.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="简要情况">
          <el-input v-model="form.situation" type="textarea" :rows="3" placeholder="简要描述思想动态情况" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { ElMessage } from 'element-plus'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const loading = ref(false)
const list = ref<any[]>([])
const warnings = ref<any[]>([])
const dialogVisible = ref(false)
const filterStatus = ref<string>()
const filterConcern = ref<string>()

const form = ref({ crewName: '', crewPosition: '', emotionalState: 'stable', concernLevel: 'normal', situation: '' })

const emotionalOptions = [
  { value: 'stable', label: '稳定' }, { value: 'fluctuating', label: '波动' },
  { value: 'anxious', label: '焦虑' }, { value: 'depressed', label: '低落' },
  { value: 'angry', label: '愤怒' }, { value: 'enthusiastic', label: '积极' },
]
const concernOptions = [
  { value: 'normal', label: '正常' }, { value: 'attention', label: '关注' },
  { value: 'warning', label: '预警' }, { value: 'critical', label: '重点关注' },
]

const emotionalMap: Record<string, { label: string; type: string }> = {
  stable: { label: '稳定', type: 'success' }, fluctuating: { label: '波动', type: 'info' },
  anxious: { label: '焦虑', type: 'warning' }, depressed: { label: '低落', type: 'warning' },
  angry: { label: '愤怒', type: 'danger' }, enthusiastic: { label: '积极', type: 'success' },
}
const concernMap: Record<string, { label: string; type: string }> = {
  normal: { label: '正常', type: 'success' }, attention: { label: '关注', type: '' },
  warning: { label: '预警', type: 'warning' }, critical: { label: '重点关注', type: 'danger' },
}
const statusMap: Record<string, { label: string; type: string }> = {
  open: { label: '待处理', type: 'info' }, processing: { label: '处理中', type: 'warning' }, closed: { label: '已关闭', type: 'success' },
}

const getEmotionalLabel = (v: string) => emotionalMap[v]?.label || v
const getEmotionalType = (v: string) => emotionalMap[v]?.type || 'info'
const getConcernLabel = (v: string) => concernMap[v]?.label || v
const getConcernType = (v: string) => concernMap[v]?.type || 'info'
const getStatusLabel = (v: string) => statusMap[v]?.label || v
const getStatusType = (v: string) => statusMap[v]?.type || 'info'

const showCreateDialog = () => {
  form.value = { crewName: '', crewPosition: '', emotionalState: 'stable', concernLevel: 'normal', situation: '' }
  dialogVisible.value = true
}

const handleCreate = async () => {
  if (!form.value.crewName) { ElMessage.warning('请输入船员姓名'); return; }
  if (!form.value.situation) { ElMessage.warning('请输入情况描述'); return; }
  try {
    await api.thoughtReports.create(form.value)
    dialogVisible.value = false
    ElMessage.success('已保存')
    loadData()
  } catch (error: any) {
    ElMessage.error('创建失败: ' + (error.data?.message || error.message || '未知错误'))
  }
}

const updateStatus = async (id: number, status: string) => {
  await api.thoughtReports.updateStatus(id, status)
  ElMessage.success('已更新')
  loadData()
}

const handleClose = async (id: number) => {
  await api.thoughtReports.close(id)
  ElMessage.success('已关闭')
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const [listRes, warnRes] = await Promise.all([
      api.thoughtReports.getAll(filterStatus.value, filterConcern.value),
      api.thoughtReports.getWarnings(),
    ])
    list.value = listRes || []
    warnings.value = warnRes || []
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 16px; overflow-y: auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.page-header h2 { margin: 0; font-size: 18px; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.mb-3 { margin-bottom: 12px; }
</style>
