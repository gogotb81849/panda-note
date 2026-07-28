<template>
  <div class="page-container">
    <div class="page-header">
      <h2>党建活动</h2>
      <el-button type="primary" @click="showCreateDialog">新增记录</el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 160px">
        <el-option v-for="t in activityTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-date-picker v-model="filterDateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 260px" />
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="12" class="stats-row">
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">支部党员大会</span>
            <span class="stat-value">{{ stats.branchMeetingCount || 0 }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">支委会</span>
            <span class="stat-value">{{ stats.committeeMeetingCount || 0 }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">主题党日</span>
            <span class="stat-value">{{ stats.themePartyDayCount || 0 }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">本月合计</span>
            <span class="stat-value">{{ stats.totalThisMonth || 0 }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="list" size="small" v-loading="loading">
      <el-table-column prop="activityType" label="类型" width="120">
        <template #default="{ row }">
          <el-tag>{{ getActivityTypeLabel(row.activityType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="activityDate" label="日期" width="120">
        <template #default="{ row }">{{ formatDate(row.activityDate) }}</template>
      </el-table-column>
      <el-table-column prop="attendeeCount" label="参会人数" width="90" />
      <el-table-column prop="ship.cnShipName" label="船舶" width="100" />
      <el-table-column prop="createdBy.realName" label="记录人" width="100" />
      <el-table-column v-if="canDelete" label="操作" width="80">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-if="total > pageSize" :current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" class="mt-3" @current-change="handlePage" />

    <!-- 新增对话框 -->
    <el-dialog v-model="dialogVisible" title="新增党建活动" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="活动类型">
          <el-select v-model="form.activityType" style="width: 100%">
            <el-option v-for="t in activityTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="例如：X月支委会" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="form.activityDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="参会人数">
          <el-input-number v-model="form.attendeeCount" :min="1" />
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
import { ref, computed, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { ElMessage, ElMessageBox } from 'element-plus'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const loading = ref(false)
const list = ref<any[]>([])
const stats = ref<any>({})
const dialogVisible = ref(false)
const filterType = ref<string>()
const filterDateRange = ref<string[]>()
const page = ref(1)
const pageSize = 20
const total = ref(0)

const form = ref({
  activityType: 'branch_meeting',
  title: '',
  activityDate: new Date().toISOString().split('T')[0],
  attendeeCount: 1,
})

const canDelete = true // 可进一步按角色控制

const activityTypeOptions = [
  { value: 'branch_meeting', label: '支部党员大会' },
  { value: 'committee_meeting', label: '支委会' },
  { value: 'party_group_meeting', label: '党小组会' },
  { value: 'party_lecture', label: '党课' },
  { value: 'theme_party_day', label: '主题党日' },
  { value: 'study_session', label: '专题学习' },
  { value: 'organizational_life', label: '组织生活会' },
  { value: 'democratic_review', label: '民主评议' },
]

const typeLabelMap: Record<string, string> = {}
activityTypeOptions.forEach(t => { typeLabelMap[t.value] = t.label })

const getActivityTypeLabel = (v: string) => typeLabelMap[v] || v
const formatDate = (d: string) => d ? d.split('T')[0] : ''

const showCreateDialog = () => {
  form.value = { activityType: 'branch_meeting', title: '', activityDate: new Date().toISOString().split('T')[0], attendeeCount: 1 }
  dialogVisible.value = true
}

const handleCreate = async () => {
  if (!form.value.title) { ElMessage.warning('请输入活动标题'); return; }
  try {
    await api.partyActivities.create(form.value)
    dialogVisible.value = false
    ElMessage.success('已保存')
    loadData()
  } catch (error: any) {
    ElMessage.error('创建失败: ' + (error.data?.message || error.message || '未知错误'))
  }
}

const handleDelete = async (id: number) => {
  await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' })
  await api.partyActivities.delete(id)
  ElMessage.success('已删除')
  loadData()
}

const handlePage = (p: number) => { page.value = p; loadData() }

const loadData = async () => {
  loading.value = true
  try {
    const [listRes, statsRes] = await Promise.all([
      api.partyActivities.getAll(filterType.value, undefined, filterDateRange.value?.[0], filterDateRange.value?.[1]),
      api.partyActivities.getStatistics(),
    ])
    list.value = listRes?.data || listRes || []
    stats.value = statsRes || {}
    total.value = list.value.length
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
.stats-row { margin-bottom: 16px; }
.stat-card { text-align: center; }
.stat-label { display: block; font-size: 13px; color: #888; }
.stat-value { display: block; font-size: 24px; font-weight: 600; color: #1A1A1A; margin-top: 4px; }
.mt-3 { margin-top: 12px; }
</style>
