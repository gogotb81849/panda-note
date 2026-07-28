<template>
  <div class="file-collection-detail-page">
    <!-- 返回按钮 -->
    <div class="toolbar">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <el-button text @click="navigateTo('/file-collections')">
            <el-icon><ArrowLeft /></el-icon>
            返回列表
          </el-button>
          <h3 class="text-lg font-semibold text-gray-800">{{ collection?.title }}</h3>
        </div>
        <div class="flex items-center gap-2">
          <el-tag :type="statusTagType(collection?.status)" size="small">
            {{ statusLabel(collection?.status) }}
          </el-tag>
          <el-button v-if="canManage && collection?.status === 'active'" size="small" type="warning" @click="handleClose">
            关闭任务
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content" v-loading="loading">
      <template v-if="collection">
        <!-- 任务信息卡片 -->
        <el-card class="info-card">
          <div class="info-grid">
            <div class="info-item">
              <label>创建人</label>
              <span>{{ collection.creator?.realName || '-' }}</span>
            </div>
            <div class="info-item">
              <label>截止时间</label>
              <span :class="{ 'text-red-500': isExpired(collection.deadline) }">
                {{ formatDate(collection.deadline) }}
              </span>
            </div>
            <div class="info-item">
              <label>目标船舶</label>
              <span>{{ collection.totalCount }} 艘</span>
            </div>
            <div class="info-item" v-if="collection.fileType">
              <label>文件类型</label>
              <span>{{ collection.fileType }}</span>
            </div>
            <div class="info-item" v-if="collection.namingRule">
              <label>命名规则</label>
              <el-tag size="small">{{ collection.namingRule }}</el-tag>
            </div>
            <div class="info-item" v-if="collection.maxSize">
              <label>大小限制</label>
              <span>{{ collection.maxSize }}MB</span>
            </div>
            <div class="info-item" v-if="collection.description">
              <label>描述</label>
              <span>{{ collection.description }}</span>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-text">
                <span class="submitted-count">{{ collection.submittedCount || 0 }}</span>
                / {{ collection.totalCount }} 已提交
              </span>
              <span class="progress-percent">
                {{ getProgressPercent(collection.submittedCount || 0, collection.totalCount) }}%
              </span>
            </div>
            <el-progress
              :percentage="getProgressPercent(collection.submittedCount || 0, collection.totalCount)"
              :stroke-width="12"
              :show-text="false"
              :color="getProgressColor(collection.submittedCount || 0, collection.totalCount)"
            />
          </div>

          <!-- 操作按钮 -->
          <div class="action-bar">
            <el-button type="primary" size="small" @click="downloadAll" :disabled="!collection.submittedCount">
              <el-icon><Download /></el-icon>
              批量下载
            </el-button>
            <el-button v-if="canManage" size="small" type="warning" @click="showRemindDialog">
              <el-icon><Bell /></el-icon>
              催收
            </el-button>
          </div>
        </el-card>

        <!-- 提交状态看板 -->
        <el-card class="status-card">
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">提交状态</span>
              <el-button-group size="small">
                <el-button :type="activeTab === 'all' ? 'primary' : ''" @click="activeTab = 'all'">
                  全部
                </el-button>
                <el-button :type="activeTab === 'submitted' ? 'success' : ''" @click="activeTab = 'submitted'">
                  已提交
                </el-button>
                <el-button :type="activeTab === 'unsubmitted' ? 'warning' : ''" @click="activeTab = 'unsubmitted'">
                  未提交
                </el-button>
                <el-button :type="activeTab === 'rejected' ? 'danger' : ''" @click="activeTab = 'rejected'">
                  已驳回
                </el-button>
              </el-button-group>
            </div>
          </template>

          <el-table :data="filteredSubmissions" stripe>
            <el-table-column prop="ship.cnShipName" label="船舶" width="150" />
            <el-table-column label="提交人" width="120">
              <template #default="{ row }">
                {{ row.submitter?.realName || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="文件名" min-width="200">
              <template #default="{ row }">
                <div class="file-name-cell">
                  <span>{{ row.renamedName || row.fileName }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="160">
              <template #default="{ row }">
                {{ row.submittedAt ? formatDate(row.submittedAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="submissionStatusTagType(row.status)" size="small">
                  {{ submissionStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="160">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'submitted'"
                  size="small"
                  type="danger"
                  link
                  @click="handleReject(row)"
                >
                  驳回
                </el-button>
                <el-button
                  v-if="row.status === 'rejected'"
                  size="small"
                  type="success"
                  link
                  @click="handleResubmit(row)"
                >
                  允许重提
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 未提交列表（仅看板视图） -->
        <el-card v-if="activeTab === 'unsubmitted'" class="unsubmitted-card">
          <template #header>
            <span class="card-title">未提交船舶清单</span>
          </template>
          <el-table :data="unsubmittedList" stripe>
            <el-table-column prop="cnShipName" label="船舶" width="150" />
            <el-table-column label="政委" width="120">
              <template #default="{ row }">
                {{ row.politicalOfficerName || '未设置' }}
              </template>
            </el-table-column>
            <el-table-column label="状态">
              <template #default>
                <el-tag type="warning" size="small">未提交</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </div>

    <!-- 驳回对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回提交" width="400px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectForm.reason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejecting">
          确认驳回
        </el-button>
      </template>
    </el-dialog>

    <!-- 催收对话框 -->
    <el-dialog v-model="remindDialogVisible" title="催收通知" width="500px">
      <div v-if="remindList">
        <p class="text-gray-600 mb-2">
          任务：<strong>{{ remindList.collectionTitle }}</strong>
        </p>
        <p class="text-gray-600 mb-2">
          截止：<strong>{{ formatDate(remindList.deadline) }}</strong>
        </p>
        <p class="text-gray-600 mb-4">
          提交进度：<strong>{{ remindList.submittedCount }}/{{ remindList.totalTarget }}</strong>
        </p>
        <div class="unsubmitted-list">
          <p class="font-semibold mb-2">未提交船舶：</p>
          <el-tag
            v-for="ship in remindList.unsubmittedShips"
            :key="ship.id"
            class="mb-1 mr-1"
            type="warning"
          >
            {{ ship.cnShipName }}（{{ ship.politicalOfficerName || '未设置政委' }}）
          </el-tag>
        </div>
        <p class="text-gray-400 mt-4 text-xs">提示：请将此列表信息通过现有渠道（如微信）发送给相关人员。</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Download, Bell } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFileCollection } from '~/composables/useFileCollection'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const fileCollection = useFileCollection()
const authStore = useAuthStore()

const collectionId = parseInt(route.params.id as string)

const collection = ref<any>(null)
const loading = ref(false)
const activeTab = ref<'all' | 'submitted' | 'unsubmitted' | 'rejected'>('all')
const unsubmittedList = ref<any[]>([])
const rejectDialogVisible = ref(false)
const rejectForm = ref({ reason: '', submissionId: 0 })
const rejecting = ref(false)
const remindDialogVisible = ref(false)
const remindList = ref<any>(null)

const canManage = computed(() => {
  const role = authStore.user?.role
  const managerRoles = ['shore_crew_supervisor', 'shore_marine_supervisor', 'shore_engineer_supervisor', 'shore_electric_supervisor', 'general_manager', 'company_admin', 'admin']
  return managerRoles.includes(role || '')
})

// 筛选后的提交列表
const filteredSubmissions = computed(() => {
  if (!collection.value || !collection.value.submissions) return []

  const submissions = collection.value.submissions

  if (activeTab.value === 'all') return submissions
  if (activeTab.value === 'submitted') return submissions.filter((s: any) => s.status === 'submitted')
  if (activeTab.value === 'rejected') return submissions.filter((s: any) => s.status === 'rejected')

  // unsubmitted 不在此表格显示，在下方单独显示
  if (activeTab.value === 'unsubmitted') return []
  
  return submissions
})

// 加载详情
const loadDetail = async () => {
  loading.value = true
  try {
    collection.value = await fileCollection.getCollectionDetail(collectionId)
    if (activeTab.value === 'unsubmitted') {
      await loadUnsubmitted()
    }
  } catch (error) {
    console.error('加载失败', error)
    ElMessage.error('加载任务详情失败')
  } finally {
    loading.value = false
  }
}

// 加载未提交列表
const loadUnsubmitted = async () => {
  try {
    const ships = await fileCollection.getUnsubmittedShips(collectionId)
    unsubmittedList.value = ships
  } catch (error) {
    console.error('加载未提交列表失败', error)
  }
}

// 批量下载
const downloadAll = async () => {
  if (!collection.value) return
  await fileCollection.downloadAllFiles(collectionId, collection.value.title)
}

// 驳回提交
const handleReject = (submission: any) => {
  rejectForm.value = { reason: '', submissionId: submission.id }
  rejectDialogVisible.value = true
}

// 确认驳回
const confirmReject = async () => {
  if (!rejectForm.value.reason.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }
  rejecting.value = true
  try {
    await fileCollection.rejectSubmission(collectionId, rejectForm.value.submissionId, rejectForm.value.reason)
    ElMessage.success('已驳回')
    rejectDialogVisible.value = false
    await loadDetail()
  } catch (error) {
    console.error('驳回失败', error)
  } finally {
    rejecting.value = false
  }
}

// 允许重新提交
const handleResubmit = async (submission: any) => {
  try {
    await ElMessageBox.confirm('确定允许该船舶重新提交吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
    await fileCollection.rejectSubmission(collectionId, submission.id, '')
    ElMessage.success('已允许重新提交')
    await loadDetail()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败', error)
    }
  }
}

// 显示催收对话框
const showRemindDialog = async () => {
  try {
    remindList.value = await fileCollection.getRemindList(collectionId)
    remindDialogVisible.value = true
  } catch (error) {
    console.error('加载催收列表失败', error)
    ElMessage.error('加载催收列表失败')
  }
}

// 关闭任务
const handleClose = async () => {
  try {
    await ElMessageBox.confirm('确定要关闭此收集任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await fileCollection.updateCollection(collectionId, { status: 'closed' })
    ElMessage.success('任务已关闭')
    await loadDetail()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('关闭失败', error)
    }
  }
}

// 监听tab切换
watch(activeTab, async (newTab) => {
  if (newTab === 'unsubmitted') {
    await loadUnsubmitted()
  }
})

// 工具函数
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const isExpired = (date: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}

const getProgressPercent = (submitted: number, total: number) => {
  if (total === 0) return 0
  return Math.round((submitted / total) * 100)
}

const getProgressColor = (submitted: number, total: number) => {
  const percent = getProgressPercent(submitted, total)
  if (percent >= 80) return '#67c23a'
  if (percent >= 50) return '#e6a23c'
  return '#f56c6c'
}

const statusLabel = fileCollection.statusLabel
const statusTagType = fileCollection.statusTagType
const submissionStatusLabel = fileCollection.submissionStatusLabel
const submissionStatusTagType = fileCollection.submissionStatusTagType

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.file-collection-detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.toolbar {
  padding: 16px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 12px;
  color: #909399;
}

.info-item span {
  font-size: 14px;
  color: #1a1a1a;
}

.progress-section {
  margin: 16px 0;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 14px;
  color: #606266;
}

.submitted-count {
  font-weight: 600;
  color: #409eff;
  font-size: 18px;
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: #909399;
}

.action-bar {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.status-card .card-header-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.file-name-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.unsubmitted-card {
  background-color: #fff7e6;
}

.unsubmitted-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.text-red-500 {
  color: #f56c6c !important;
}

.text-gray-600 {
  color: #606266;
}

.text-gray-400 {
  color: #c0c4cc;
}

.mb-1 {
  margin-bottom: 4px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mr-1 {
  margin-right: 4px;
}

.mt-4 {
  margin-top: 16px;
}

.font-semibold {
  font-weight: 600;
}

.text-xs {
  font-size: 12px;
}
</style>