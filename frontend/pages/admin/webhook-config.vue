<template>
  <div class="webhook-config-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">任务到期提醒Webhook</h2>
        <p class="page-subtitle">配置Webhook实现任务到期自动提醒，支持钉钉、飞书、企业微信等</p>
      </div>
      <div class="header-actions">
        <el-button @click="checkRemindersNow" :loading="checking" type="warning">立即检查到期任务</el-button>
        <el-button type="primary" @click="openCreateDialog">新建Webhook配置</el-button>
      </div>
    </div>

    <!-- Webhook配置列表 -->
    <div class="webhook-list">
      <el-table :data="webhooks" style="width: 100%" v-loading="loading" border stripe>
        <el-table-column prop="name" label="配置名称" width="160">
          <template #default="{ row }">
            <span class="webhook-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="Webhook URL" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.url" placement="top" :show-after="300">
              <span class="webhook-url">{{ maskUrl(row.url) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="reminderDays" label="提醒天数" width="120">
          <template #default="{ row }">
            <span>{{ formatReminderDays(row.reminderDays) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="通知对象" width="180">
          <template #default="{ row }">
            <div class="notify-targets">
              <el-tag v-if="row.notifyCreator" type="" size="small" class="mr-2">创建者</el-tag>
              <el-tag v-if="row.notifyAssignee" type="" size="small" class="mr-2">负责人</el-tag>
              <el-tag v-if="row.notifyAdmins" type="" size="small">管理员</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="success" link @click="sendTest(row)" :loading="row.testing">测试</el-button>
            <el-button size="small" type="info" link @click="viewLogs(row)">日志</el-button>
            <el-button size="small" type="danger" link @click="deleteWebhook(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && webhooks.length === 0" description="暂无Webhook配置">
        <el-button type="primary" @click="openCreateDialog">创建第一个Webhook</el-button>
      </el-empty>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑Webhook配置' : '新建Webhook配置'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="form.name" placeholder="如：钉钉提醒" />
        </el-form-item>

        <el-form-item label="Webhook类型" prop="type">
          <el-select v-model="form.type" placeholder="选择类型" style="width: 100%">
            <el-option label="钉钉" value="dingtalk" />
            <el-option label="飞书" value="feishu" />
            <el-option label="企业微信" value="wechat" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>

        <el-form-item label="Webhook URL" prop="url">
          <el-input v-model="form.url" placeholder="请输入Webhook地址" />
        </el-form-item>

        <el-form-item label="签名密钥" prop="secret">
          <el-input v-model="form.secret" placeholder="钉钉/飞书机器人的签名密钥（可选）" />
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" active-color="#13ce66" inactive-color="#ff4949" />
        </el-form-item>

        <el-divider content-position="left">提醒配置</el-divider>

        <el-form-item label="提前提醒天数" prop="reminderDays">
          <el-select v-model="form.reminderDays" multiple placeholder="选择提醒天数" style="width: 100%">
            <el-option label="提前7天" :value="7" />
            <el-option label="提前3天" :value="3" />
            <el-option label="提前1天" :value="1" />
            <el-option label="当天" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item label="通知对象">
          <el-checkbox v-model="form.notifyCreator">通知任务创建者</el-checkbox>
          <el-checkbox v-model="form.notifyAssignee">通知任务负责人</el-checkbox>
          <el-checkbox v-model="form.notifyAdmins">通知管理员</el-checkbox>
        </el-form-item>

        <el-divider content-position="left">过滤条件（可选）</el-divider>

        <el-form-item label="任务分类">
          <el-select v-model="form.taskCategories" multiple placeholder="不选择表示所有分类" clearable style="width: 100%">
            <el-option label="党建活动" value="党建活动" />
            <el-option label="安全检查" value="安全检查" />
            <el-option label="船员管理" value="船员管理" />
            <el-option label="设备维护" value="设备维护" />
            <el-option label="港口业务" value="港口业务" />
            <el-option label="质量管理" value="质量管理" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级">
          <el-select v-model="form.priorityFilter" multiple placeholder="不选择表示所有优先级" clearable style="width: 100%">
            <el-option label="重要紧急" value="urgent_important" />
            <el-option label="重要不紧急" value="important" />
            <el-option label="紧急不重要" value="urgent" />
            <el-option label="常规" value="normal" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 日志查看对话框 -->
    <el-dialog v-model="logDialogVisible" title="Webhook发送日志" width="800px">
      <div class="log-stats">
        <el-tag type="success" class="mr-4">成功: {{ logStats.success }}</el-tag>
        <el-tag type="danger">失败: {{ logStats.fail }}</el-tag>
      </div>

      <el-table :data="logs" style="width: 100%" v-loading="logsLoading" border stripe max-height="400">
        <el-table-column prop="sentAt" label="发送时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.sentAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="taskTitle" label="任务" min-width="150">
          <template #default="{ row }">
            <span>{{ row.taskTitle || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reminderLevel" label="提醒级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelTagType(row.reminderLevel)" size="small">
              {{ getLevelLabel(row.reminderLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="daysBefore" label="提前天数" width="80" align="center" />
        <el-table-column prop="success" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responseCode" label="响应码" width="80" align="center">
          <template #default="{ row }">
            {{ row.responseCode || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误信息" min-width="120">
          <template #default="{ row }">
            <span v-if="row.errorMessage" class="error-text">{{ row.errorMessage }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="logTotal > 0"
        v-model:current-page="logPage"
        :page-size="logPageSize"
        :total="logTotal"
        layout="prev, pager, next"
        @current-change="loadLogs"
        class="mt-4"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: 'auth',
})

const api = useApi()

// Webhook列表
const webhooks = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const logDialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const checking = ref(false)
const currentWebhookId = ref<number | null>(null)

// 日志
const logs = ref<any[]>([])
const logsLoading = ref(false)
const logPage = ref(1)
const logPageSize = ref(20)
const logTotal = ref(0)
const logStats = computed(() => {
  let success = 0, fail = 0
  logs.value.forEach(log => {
    if (log.success) success++
    else fail++
  })
  return { success, fail }
})

// 表单
const formRef = ref()
const form = reactive({
  id: null as number | null,
  name: '',
  type: 'custom' as 'dingtalk' | 'feishu' | 'wechat' | 'custom',
  url: '',
  secret: '',
  enabled: true,
  reminderDays: [7, 3, 1] as number[],
  notifyCreator: true,
  notifyAssignee: true,
  notifyAdmins: false,
  taskCategories: [] as string[],
  priorityFilter: [] as string[],
})

const rules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择Webhook类型', trigger: 'change' }],
  url: [{ required: true, message: '请输入Webhook URL', trigger: 'blur' }],
  reminderDays: [{ required: true, message: '请选择提醒天数', trigger: 'change' }],
}

// 加载Webhook列表
const loadWebhooks = async () => {
  loading.value = true
  try {
    const data = await api.notification.getWebhooks()
    webhooks.value = data || []
  } catch (error: any) {
    console.error('加载Webhook配置失败', error)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

// 打开创建对话框
const openCreateDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (row: any) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.type = row.type
  form.url = row.url
  form.secret = row.secret || ''
  form.enabled = row.enabled
  form.reminderDays = row.reminderDays || [7, 3, 1]
  form.notifyCreator = row.notifyCreator
  form.notifyAssignee = row.notifyAssignee
  form.notifyAdmins = row.notifyAdmins
  form.taskCategories = row.taskCategories || []
  form.priorityFilter = row.priorityFilter || []
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  form.id = null
  form.name = ''
  form.type = 'custom'
  form.url = ''
  form.secret = ''
  form.enabled = true
  form.reminderDays = [7, 3, 1]
  form.notifyCreator = true
  form.notifyAssignee = true
  form.notifyAdmins = false
  form.taskCategories = []
  form.priorityFilter = []
  formRef.value?.resetFields()
}

// 提交表单
const submitForm = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const data = {
      name: form.name,
      type: form.type,
      url: form.url,
      secret: form.secret || undefined,
      enabled: form.enabled,
      reminderDays: form.reminderDays,
      notifyCreator: form.notifyCreator,
      notifyAssignee: form.notifyAssignee,
      notifyAdmins: form.notifyAdmins,
      taskCategories: form.taskCategories.length > 0 ? form.taskCategories : undefined,
      priorityFilter: form.priorityFilter.length > 0 ? form.priorityFilter : undefined,
    }

    if (isEdit.value && form.id) {
      await api.notification.updateWebhook(form.id, data)
      ElMessage.success('Webhook配置已更新')
    } else {
      await api.notification.createWebhook(data)
      ElMessage.success('Webhook配置已创建')
    }

    dialogVisible.value = false
    await loadWebhooks()
  } catch (error: any) {
    console.error('保存Webhook配置失败', error)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

// 删除Webhook
const deleteWebhook = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除Webhook配置「${row.name}」吗？删除后不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    await api.notification.deleteWebhook(row.id)
    ElMessage.success('Webhook配置已删除')
    await loadWebhooks()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除Webhook配置失败', error)
      ElMessage.error('删除失败')
    }
  }
}

// 发送测试消息
const sendTest = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要向「${row.name}」发送测试消息吗？`,
      '发送测试',
      { type: 'info' }
    )
    
    // 标记测试中
    row.testing = true
    
    await api.notification.sendTestMessage(row.id)
    ElMessage.success('测试消息已发送，请检查Webhook是否收到')
    
    // 重新加载列表以更新状态
    await loadWebhooks()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('发送测试消息失败', error)
      ElMessage.error('发送失败')
    }
  } finally {
    row.testing = false
  }
}

// 查看日志
const viewLogs = async (row: any) => {
  currentWebhookId.value = row.id
  logDialogVisible.value = true
  logPage.value = 1
  await loadLogs()
}

// 加载日志
const loadLogs = async () => {
  if (!currentWebhookId.value) return
  
  logsLoading.value = true
  try {
    const result = await api.notification.getWebhookLogs(currentWebhookId.value, logPage.value, logPageSize.value)
    logs.value = result.data || []
    logTotal.value = result.total || 0
  } catch (error: any) {
    console.error('加载日志失败', error)
    ElMessage.error('加载日志失败')
  } finally {
    logsLoading.value = false
  }
}

// 立即检查到期任务
const checkRemindersNow = async () => {
  checking.value = true
  try {
    await api.notification.checkReminders()
    ElMessage.success('已触发任务到期检查')
  } catch (error: any) {
    console.error('触发检查失败', error)
    ElMessage.error('触发失败')
  } finally {
    checking.value = false
  }
}

// 辅助函数
const getTypeTagType = (type: string) => {
  const map: Record<string, string> = {
    dingtalk: 'primary',
    feishu: 'success',
    wechat: 'warning',
    custom: 'info',
  }
  return map[type] || 'info'
}

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    dingtalk: '钉钉',
    feishu: '飞书',
    wechat: '企业微信',
    custom: '自定义',
  }
  return map[type] || type
}

const getLevelTagType = (level: string) => {
  const map: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    urgent: 'danger',
  }
  return map[level] || 'info'
}

const getLevelLabel = (level: string) => {
  const map: Record<string, string> = {
    low: '提前7天',
    medium: '提前3天',
    high: '提前1天',
    urgent: '当天',
  }
  return map[level] || level
}

const maskUrl = (url: string) => {
  if (!url) return ''
  if (url.length <= 40) return url
  return url.substring(0, 40) + '...'
}

const formatReminderDays = (days: number[]) => {
  if (!days || !Array.isArray(days)) return '-'
  return days.map(d => d === 0 ? '当天' : `前${d}天`).join(', ')
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadWebhooks()
})
</script>

<style scoped>
.webhook-config-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.webhook-list {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.webhook-name {
  font-weight: 600;
  color: #333;
}

.webhook-url {
  font-family: monospace;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.notify-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mr-2 {
  margin-right: 8px;
}

.mr-4 {
  margin-right: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.log-stats {
  margin-bottom: 16px;
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}
</style>
