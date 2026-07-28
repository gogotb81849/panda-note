<template>
  <div class="page-container">
    <div class="page-header">
      <h2>政委履职档案</h2>
    </div>

    <!-- 政委列表 -->
    <el-table :data="list" size="small" v-loading="loading" @row-click="viewDetail">
      <el-table-column prop="user.realName" label="姓名" width="100" />
      <el-table-column prop="ship.cnShipName" label="任职船舶" width="120" />
      <el-table-column label="评级" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.overallGrade" :type="getGradeType(row.overallGrade)">{{ getGradeLabel(row.overallGrade) }}</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="标记" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.isNewbie" type="warning" size="small" class="mr-1">新政委</el-tag>
          <el-tag v-if="row.isThin" type="danger" size="small">能力薄弱</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="统计" width="180">
        <template #default="{ row }">
          <span>活动 {{ row.activityCount || 0 }} · 学习 {{ row.studyCount || 0 }} · 活跃 {{ row.activeDays || 0 }}天</span>
        </template>
      </el-table-column>
      <el-table-column label="最后活跃" width="120">
        <template #default="{ row }">{{ row.lastActiveAt ? formatDate(row.lastActiveAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click.stop="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" :title="`${currentProfile?.user?.realName || ''} - 履职档案`" width="700px">
      <div v-if="currentProfile">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任职船舶">{{ currentProfile.ship?.cnShipName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="上船日期">{{ formatDate(currentProfile.appointmentDate) }}</el-descriptions-item>
          <el-descriptions-item label="评级">{{ getGradeLabel(currentProfile.overallGrade) || '未评级' }}</el-descriptions-item>
          <el-descriptions-item label="标记">
            <el-tag v-if="currentProfile.isNewbie" type="warning" size="small">新政委</el-tag>
            <el-tag v-if="currentProfile.isThin" type="danger" size="small">能力薄弱</el-tag>
            <span v-if="!currentProfile.isNewbie && !currentProfile.isThin">-</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>统计数据</el-divider>
        <el-row :gutter="12" class="stats-row">
          <el-col :span="8"><el-card shadow="never"><div class="stat-card"><span class="stat-label">党建活动</span><span class="stat-value">{{ currentProfile.activityCount || 0 }}</span></div></el-card></el-col>
          <el-col :span="8"><el-card shadow="never"><div class="stat-card"><span class="stat-label">学习记录</span><span class="stat-value">{{ currentProfile.studyCount || 0 }}</span></div></el-card></el-col>
          <el-col :span="8"><el-card shadow="never"><div class="stat-card"><span class="stat-label">活跃天数</span><span class="stat-value">{{ currentProfile.activeDays || 0 }}</span></div></el-card></el-col>
        </el-row>

        <el-divider>考核记录</el-divider>
        <el-table :data="evaluations" size="small">
          <el-table-column prop="evalDate" label="日期" width="110">
            <template #default="{ row }">{{ formatDate(row.evalDate) }}</template>
          </el-table-column>
          <el-table-column prop="evalType" label="类型" width="80" />
          <el-table-column label="评级" width="80">
            <template #default="{ row }">
              <el-tag size="small">{{ getGradeLabel(row.overallGrade) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="overallScore" label="评分" width="70" />
          <el-table-column prop="comments" label="评价意见" />
        </el-table>

        <el-divider>传帮带记录</el-divider>
        <el-table :data="mentorships" size="small">
          <el-table-column prop="recordDate" label="日期" width="110">
            <template #default="{ row }">{{ formatDate(row.recordDate) }}</template>
          </el-table-column>
          <el-table-column prop="mentor.realName" label="导师" width="100" />
          <el-table-column prop="topic" label="帮扶主题" />
          <el-table-column prop="effectiveness" label="效果" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.effectiveness === 'excellent' ? 'success' : row.effectiveness === 'good' ? '' : 'warning'">
                {{ { excellent: '优秀', good: '良好', fair: '一般', poor: '较差' }[row.effectiveness] || row.effectiveness }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const loading = ref(false)
const list = ref<any[]>([])
const detailVisible = ref(false)
const currentProfile = ref<any>(null)
const evaluations = ref<any[]>([])
const mentorships = ref<any[]>([])

const gradeMap: Record<string, { label: string; type: string }> = {
  excellent: { label: '优秀', type: 'success' }, good: { label: '良好', type: '' },
  qualified: { label: '合格', type: 'warning' }, needs_improve: { label: '需改进', type: 'warning' },
  unqualified: { label: '不合格', type: 'danger' },
}

const getGradeLabel = (v: string) => gradeMap[v]?.label || v || '-'
const getGradeType = (v: string) => gradeMap[v]?.type || 'info'
const formatDate = (d: string) => d ? d.split('T')[0] : ''

const viewDetail = async (row: any) => {
  currentProfile.value = row
  detailVisible.value = true
  try {
    const [evRes, mtRes] = await Promise.all([
      api.officerProfiles.getEvaluations(),
      api.officerProfiles.getMentorships(),
    ])
    evaluations.value = (evRes || []).filter((e: any) => e.officerProfileId === row.id)
    mentorships.value = (mtRes || []).filter((m: any) => m.officerProfileId === row.id)
  } catch (_) { /* ignore */ }
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.officerProfiles.getAll()
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
.stats-row { margin-bottom: 16px; }
.stat-card { text-align: center; }
.stat-label { display: block; font-size: 12px; color: #888; }
.stat-value { display: block; font-size: 20px; font-weight: 600; color: #1A1A1A; margin-top: 2px; }
.mr-1 { margin-right: 4px; }
</style>
