<template>
  <div class="page-container">
    <div class="page-header">
      <h2>廉洁监督</h2>
      <el-button type="primary" @click="showCreateDialog">新增记录</el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterCategory" placeholder="全部类别" clearable style="width: 140px">
        <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-select v-model="filterRisk" placeholder="全部等级" clearable style="width: 120px">
        <el-option v-for="r in riskOptions" :key="r.value" :label="r.label" :value="r.value" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 120px">
        <el-option label="待处理" value="open" />
        <el-option label="处理中" value="in_progress" />
        <el-option label="已关闭" value="closed" />
      </el-select>
      <el-button type="danger" plain @click="showHighRisk">高风险</el-button>
    </div>

    <el-table :data="list" size="small" v-loading="loading">
      <el-table-column label="检查类型" width="100">
        <template #default="{ row }">{{ getInspectionTypeLabel(row.inspectionType) }}</template>
      </el-table-column>
      <el-table-column label="类别" width="120">
        <template #default="{ row }">{{ getCategoryLabel(row.category) }}</template>
      </el-table-column>
      <el-table-column label="风险等级" width="100">
        <template #default="{ row }">
          <el-tag :type="getRiskType(row.riskLevel)" :effect="['high', 'critical'].includes(row.riskLevel) ? 'dark' : 'light'">
            {{ getRiskLabel(row.riskLevel) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="findings" label="发现的问题" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button v-if="row.status === 'open'" size="small" @click="updateStatus(row.id, 'in_progress')">处理中</el-button>
          <el-button v-if="row.status !== 'closed'" size="small" type="success" @click="updateStatus(row.id, 'closed')">关闭</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增廉洁监督记录" width="550px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="检查类型">
          <el-select v-model="form.inspectionType" style="width: 100%">
            <el-option v-for="t in inspectionOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="form.category" style="width: 100%">
            <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险等级">
          <el-select v-model="form.riskLevel" style="width: 100%">
            <el-option v-for="r in riskOptions" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="检查标题" />
        </el-form-item>
        <el-form-item label="发现的问题">
          <el-input v-model="form.findings" type="textarea" :rows="3" placeholder="简要描述发现的问题" />
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
const dialogVisible = ref(false)
const filterCategory = ref<string>()
const filterRisk = ref<string>()
const filterStatus = ref<string>()

const form = ref({ inspectionType: 'routine', category: 'meal_fund', riskLevel: 'low', title: '', findings: '' })

const categoryOptions = [
  { value: 'meal_fund', label: '伙食费管理' }, { value: 'union_fund', label: '工会经费' },
  { value: 'material', label: '备件物料' }, { value: 'fuel_oil', label: '燃油加装' },
  { value: 'waste_oil', label: '油污水处理' }, { value: 'gift_redpacket', label: '礼品红包' },
  { value: 'procurement', label: '采购招标' }, { value: 'other', label: '其他' },
]
const riskOptions = [
  { value: 'low', label: '低风险' }, { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' }, { value: 'critical', label: '极高风险' },
]
const inspectionOptions = [
  { value: 'routine', label: '例行检查' }, { value: 'special', label: '专项检查' },
  { value: 'surprise', label: '突击检查' }, { value: 'follow_up', label: '复查' },
]

const categoryMap: Record<string, string> = {}
categoryOptions.forEach(c => { categoryMap[c.value] = c.label })
const riskMap: Record<string, { label: string; type: string }> = {
  low: { label: '低风险', type: 'success' }, medium: { label: '中风险', type: 'warning' },
  high: { label: '高风险', type: 'danger' }, critical: { label: '极高风险', type: 'danger' },
}
const inspectionMap: Record<string, string> = {}
inspectionOptions.forEach(t => { inspectionMap[t.value] = t.label })
const statusMap: Record<string, { label: string; type: string }> = {
  open: { label: '待处理', type: 'info' }, in_progress: { label: '处理中', type: 'warning' }, closed: { label: '已关闭', type: 'success' },
}

const getCategoryLabel = (v: string) => categoryMap[v] || v
const getRiskLabel = (v: string) => riskMap[v]?.label || v
const getRiskType = (v: string) => riskMap[v]?.type || 'info'
const getInspectionTypeLabel = (v: string) => inspectionMap[v] || v
const getStatusLabel = (v: string) => statusMap[v]?.label || v
const getStatusType = (v: string) => statusMap[v]?.type || 'info'

const showCreateDialog = () => {
  form.value = { inspectionType: 'routine', category: 'meal_fund', riskLevel: 'low', title: '', findings: '' }
  dialogVisible.value = true
}

const handleCreate = async () => {
  if (!form.value.title) { ElMessage.warning('请输入标题'); return; }
  try {
    await api.integrityRecords.create(form.value)
    dialogVisible.value = false
    ElMessage.success('已保存')
    loadData()
  } catch (error: any) {
    ElMessage.error('创建失败: ' + (error.data?.message || error.message || '未知错误'))
  }
}

const updateStatus = async (id: number, status: string) => {
  await api.integrityRecords.updateStatus(id, status)
  ElMessage.success('已更新')
  loadData()
}

const showHighRisk = async () => {
  filterRisk.value = undefined
  filterCategory.value = undefined
  filterStatus.value = undefined
  const res = await api.integrityRecords.getHighRisk()
  list.value = res || []
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.integrityRecords.getAll(filterCategory.value, filterRisk.value, filterStatus.value)
    list.value = res || []
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
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
</style>
