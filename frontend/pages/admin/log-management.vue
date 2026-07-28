<template>
  <div class="log-management">
    <el-card class="header-card">
      <div class="header-content">
        <div>
          <h2>日志收集与AI分析</h2>
          <p class="subtitle">监控系统运行状态，智能分析异常，快速下发修复包</p>
        </div>
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 配置管理 -->
      <el-tab-pane label="日志收集配置" name="config">
        <el-form :model="config" label-width="180px" class="config-form">
          <el-form-item label="启用日志收集">
            <el-switch v-model="config.enabled" />
            <span class="form-tip">开启后，用户端将自动收集错误日志并上传</span>
          </el-form-item>

          <el-divider>收集级别</el-divider>

          <el-form-item label="收集JS错误">
            <el-switch v-model="config.collectErrors" />
            <span class="form-tip">捕获前端JavaScript运行时错误</span>
          </el-form-item>

          <el-form-item label="收集API错误">
            <el-switch v-model="config.collectApiErrors" />
            <span class="form-tip">捕获接口调用失败（网络错误、超时等）</span>
          </el-form-item>

          <el-form-item label="收集性能数据">
            <el-switch v-model="config.collectPerformance" />
            <span class="form-tip">记录页面加载时间、渲染性能等</span>
          </el-form-item>

          <el-form-item label="收集用户操作">
            <el-switch v-model="config.collectUserActions" />
            <span class="form-tip">记录用户点击、输入等操作轨迹（用于复现问题）</span>
          </el-form-item>

          <el-divider>上传配置</el-divider>

          <el-form-item label="上传间隔（秒）">
            <el-input-number v-model="config.uploadInterval" :min="60" :max="3600" :step="60" />
            <span class="form-tip">日志上传频率，建议300秒（5分钟）</span>
          </el-form-item>

          <el-form-item label="单次最大条数">
            <el-input-number v-model="config.maxBatchSize" :min="10" :max="200" :step="10" />
            <span class="form-tip">每次上传最多多少条日志</span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveConfig">保存配置</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 日志列表 -->
      <el-tab-pane label="日志列表" name="logs">
        <div class="filter-bar">
          <el-select v-model="logFilter.logType" placeholder="日志类型" clearable>
            <el-option label="JS错误" value="error" />
            <el-option label="API错误" value="api_error" />
            <el-option label="性能" value="performance" />
            <el-option label="用户操作" value="user_action" />
          </el-select>
          <el-select v-model="logFilter.level" placeholder="级别" clearable>
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warn" />
            <el-option label="错误" value="error" />
            <el-option label="严重" value="critical" />
          </el-select>
          <el-select v-model="logFilter.analyzed" placeholder="分析状态" clearable>
            <el-option label="未分析" :value="false" />
            <el-option label="已分析" :value="true" />
          </el-select>
          <el-button type="primary" @click="loadLogs">查询</el-button>
          <el-button @click="triggerAnalysis">
            <el-icon><MagicStick /></el-icon>
            触发AI分析
          </el-button>
        </div>

        <el-table :data="logs" v-loading="logsLoading" stripe>
          <el-table-column prop="createdAt" label="时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="userId" label="用户ID" width="80" />
          <el-table-column prop="logType" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getLogTypeTag(row.logType)">{{ row.logType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="level" label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="getLevelTag(row.level)">{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="消息" min-width="300" show-overflow-tooltip />
          <el-table-column prop="pagePath" label="页面" width="150" show-overflow-tooltip />
          <el-table-column prop="analyzed" label="已分析" width="80">
            <template #default="{ row }">
              <el-tag :type="row.analyzed ? 'success' : 'warning'">
                {{ row.analyzed ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" @click="viewLogDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="logsTotal > 0"
          :current-page="logFilter.page"
          :page-size="logFilter.pageSize"
          :total="logsTotal"
          layout="total, prev, pager, next"
          @current-change="handleLogPageChange"
        />
      </el-tab-pane>

      <!-- AI分析结果 -->
      <el-tab-pane label="AI分析结果" name="analyses">
        <div class="filter-bar">
          <el-select v-model="analysisFilter.severity" placeholder="严重级别" clearable>
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="严重" value="critical" />
          </el-select>
          <el-select v-model="analysisFilter.status" placeholder="状态" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="已下发修复" value="fix_sent" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已忽略" value="ignored" />
          </el-select>
          <el-button type="primary" @click="loadAnalyses">查询</el-button>
        </div>

        <el-table :data="analyses" v-loading="analysesLoading" stripe>
          <el-table-column prop="createdAt" label="时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="errorType" label="错误类型" width="120" />
          <el-table-column prop="severity" label="严重级别" width="100">
            <template #default="{ row }">
              <el-tag :type="getSeverityTag(row.severity)">{{ row.severity }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rootCause" label="根本原因" min-width="300" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTag(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="viewAnalysisDetail(row)">详情</el-button>
              <el-button size="small" type="primary" @click="createFixPackage(row)" :disabled="row.status !== 'pending'">
                下发修复
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="analysesTotal > 0"
          :current-page="analysisFilter.page"
          :page-size="analysisFilter.pageSize"
          :total="analysesTotal"
          layout="total, prev, pager, next"
          @current-change="handleAnalysisPageChange"
        />
      </el-tab-pane>

      <!-- 修复包管理 -->
      <el-tab-pane label="修复包管理" name="fixPackages">
        <el-button type="primary" @click="showCreateFixPackageDialog" style="margin-bottom: 16px">
          <el-icon><Plus /></el-icon>
          创建修复包
        </el-button>

        <el-table :data="fixPackages" v-loading="fixPackagesLoading" stripe>
          <el-table-column prop="sentAt" label="下发时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.sentAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" width="200" />
          <el-table-column prop="fixType" label="修复类型" width="120">
            <template #default="{ row }">
              <el-tag>{{ getFixTypeLabel(row.fixType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="targetUserIds" label="目标用户" width="120">
            <template #default="{ row }">
              {{ row.targetUserIds?.length || 0 }} 人
            </template>
          </el-table-column>
          <el-table-column prop="receivedCount" label="已接收" width="80" />
          <el-table-column prop="appliedCount" label="已应用" width="80" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" @click="viewFixPackageDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="fixPackagesTotal > 0"
          :current-page="fixPackagesPage"
          :page-size="20"
          :total="fixPackagesTotal"
          layout="total, prev, pager, next"
          @current-change="handleFixPackagePageChange"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 日志详情对话框 -->
    <el-dialog v-model="logDetailVisible" title="日志详情" width="700px">
      <el-descriptions :column="2" border v-if="selectedLog">
        <el-descriptions-item label="时间">{{ formatDate(selectedLog.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ selectedLog.userId }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="getLogTypeTag(selectedLog.logType)">{{ selectedLog.logType }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="级别">
          <el-tag :type="getLevelTag(selectedLog.level)">{{ selectedLog.level }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="消息" :span="2">{{ selectedLog.message }}</el-descriptions-item>
        <el-descriptions-item label="页面">{{ selectedLog.pagePath }}</el-descriptions-item>
        <el-descriptions-item label="URL">{{ selectedLog.pageUrl }}</el-descriptions-item>
        <el-descriptions-item label="浏览器">{{ selectedLog.userAgent }}</el-descriptions-item>
        <el-descriptions-item label="平台">{{ selectedLog.platform }}</el-descriptions-item>
        <el-descriptions-item label="屏幕分辨率">{{ selectedLog.screenResolution }}</el-descriptions-item>
        <el-descriptions-item label="网络类型">{{ selectedLog.networkType }}</el-descriptions-item>
        <el-descriptions-item label="客户端时间">{{ formatDate(selectedLog.clientTime) }}</el-descriptions-item>
        <el-descriptions-item label="已分析">{{ selectedLog.analyzed ? '是' : '否' }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="selectedLog?.details" class="detail-json">
        <h4>详细信息</h4>
        <pre>{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
      </div>
    </el-dialog>

    <!-- 分析详情对话框 -->
    <el-dialog v-model="analysisDetailVisible" title="AI分析详情" width="700px">
      <el-descriptions :column="2" border v-if="selectedAnalysis">
        <el-descriptions-item label="时间">{{ formatDate(selectedAnalysis.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="错误类型">{{ selectedAnalysis.errorType }}</el-descriptions-item>
        <el-descriptions-item label="严重级别">
          <el-tag :type="getSeverityTag(selectedAnalysis.severity)">{{ selectedAnalysis.severity }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTag(selectedAnalysis.status)">{{ selectedAnalysis.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="根本原因" :span="2">{{ selectedAnalysis.rootCause }}</el-descriptions-item>
        <el-descriptions-item label="修复建议" :span="2">{{ selectedAnalysis.suggestion }}</el-descriptions-item>
        <el-descriptions-item label="修复类型">{{ getFixTypeLabel(selectedAnalysis.fixType) }}</el-descriptions-item>
        <el-descriptions-item label="关联日志数">{{ selectedAnalysis.logIds?.length || 0 }} 条</el-descriptions-item>
      </el-descriptions>
      <div v-if="selectedAnalysis?.fixContent" class="detail-json">
        <h4>修复内容</h4>
        <pre>{{ JSON.stringify(selectedAnalysis.fixContent, null, 2) }}</pre>
      </div>
    </el-dialog>

    <!-- 创建修复包对话框 -->
    <el-dialog v-model="createFixPackageVisible" title="创建修复包" width="600px">
      <el-form :model="fixPackageForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="fixPackageForm.name" placeholder="如：网络错误修复补丁" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="fixPackageForm.description" type="textarea" :rows="3" placeholder="修复说明" />
        </el-form-item>
        <el-form-item label="修复类型" required>
          <el-select v-model="fixPackageForm.fixType">
            <el-option label="代码补丁" value="code_patch" />
            <el-option label="配置修改" value="config_change" />
            <el-option label="操作指导" value="user_guide" />
          </el-select>
        </el-form-item>
        <el-form-item label="修复内容" required>
          <el-input v-model="fixPackageForm.fixContentText" type="textarea" :rows="5" placeholder="JSON格式的修复内容" />
        </el-form-item>
        <el-form-item label="目标用户" required>
          <el-select v-model="fixPackageForm.targetUserIds" multiple placeholder="选择用户">
            <el-option v-for="user in users" :key="user.id" :label="user.realName" :value="user.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createFixPackageVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFixPackage">下发修复包</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, MagicStick, Plus } from '@element-plus/icons-vue'

const activeTab = ref('config')

// 配置
const config = reactive({
  enabled: false,
  collectErrors: true,
  collectApiErrors: true,
  collectPerformance: false,
  collectUserActions: false,
  uploadInterval: 300,
  maxBatchSize: 50,
  targetUserIds: null as number[] | null,
})

// 日志列表
const logs = ref<any[]>([])
const logsLoading = ref(false)
const logsTotal = ref(0)
const logFilter = reactive({
  logType: '',
  level: '',
  analyzed: undefined as boolean | undefined,
  page: 1,
  pageSize: 20,
})

// AI分析
const analyses = ref<any[]>([])
const analysesLoading = ref(false)
const analysesTotal = ref(0)
const analysisFilter = reactive({
  severity: '',
  status: '',
  page: 1,
  pageSize: 20,
})

// 修复包
const fixPackages = ref<any[]>([])
const fixPackagesLoading = ref(false)
const fixPackagesTotal = ref(0)
const fixPackagesPage = ref(1)

// 对话框
const logDetailVisible = ref(false)
const selectedLog = ref<any>(null)
const analysisDetailVisible = ref(false)
const selectedAnalysis = ref<any>(null)
const createFixPackageVisible = ref(false)
const fixPackageForm = reactive({
  name: '',
  description: '',
  fixType: 'user_guide',
  fixContentText: '',
  targetUserIds: [] as number[],
  analysisId: null as number | null,
})

// 用户列表
const users = ref<any[]>([])

// 加载配置
const loadConfig = async () => {
  try {
    const res = await $fetch('/api/client-log/config')
    if (res) {
      Object.assign(config, res)
    }
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

// 保存配置
const saveConfig = async () => {
  try {
    await $fetch('/api/client-log/config', {
      method: 'PUT',
      body: config,
    })
    ElMessage.success('配置保存成功')
  } catch (e) {
    ElMessage.error('保存配置失败')
  }
}

// 加载日志
const loadLogs = async () => {
  logsLoading.value = true
  try {
    const params = new URLSearchParams()
    if (logFilter.logType) params.append('logType', logFilter.logType)
    if (logFilter.level) params.append('level', logFilter.level)
    if (logFilter.analyzed !== undefined) params.append('analyzed', String(logFilter.analyzed))
    params.append('page', String(logFilter.page))
    params.append('pageSize', String(logFilter.pageSize))

    const res = await $fetch(`/api/client-log/list?${params}`)
    logs.value = res.data || []
    logsTotal.value = res.total || 0
  } catch (e) {
    ElMessage.error('加载日志失败')
  } finally {
    logsLoading.value = false
  }
}

// 加载分析
const loadAnalyses = async () => {
  analysesLoading.value = true
  try {
    const params = new URLSearchParams()
    if (analysisFilter.severity) params.append('severity', analysisFilter.severity)
    if (analysisFilter.status) params.append('status', analysisFilter.status)
    params.append('page', String(analysisFilter.page))
    params.append('pageSize', String(analysisFilter.pageSize))

    const res = await $fetch(`/api/client-log/analyses?${params}`)
    analyses.value = res.data || []
    analysesTotal.value = res.total || 0
  } catch (e) {
    ElMessage.error('加载分析结果失败')
  } finally {
    analysesLoading.value = false
  }
}

// 加载修复包
const loadFixPackages = async () => {
  fixPackagesLoading.value = true
  try {
    const res = await $fetch(`/api/client-log/fix-packages?page=${fixPackagesPage.value}&pageSize=20`)
    fixPackages.value = res.data || []
    fixPackagesTotal.value = res.total || 0
  } catch (e) {
    ElMessage.error('加载修复包失败')
  } finally {
    fixPackagesLoading.value = false
  }
}

// 触发AI分析
const triggerAnalysis = async () => {
  try {
    await ElMessageBox.confirm('确定要触发AI分析吗？将分析所有未分析的日志。', '提示', {
      type: 'warning',
    })
    const res = await $fetch('/api/client-log/analyze', { method: 'POST' })
    ElMessage.success(`AI分析完成，共分析 ${res.analyzed} 条日志`)
    loadLogs()
    loadAnalyses()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('触发AI分析失败')
    }
  }
}

// 查看日志详情
const viewLogDetail = (log: any) => {
  selectedLog.value = log
  logDetailVisible.value = true
}

// 查看分析详情
const viewAnalysisDetail = (analysis: any) => {
  selectedAnalysis.value = analysis
  analysisDetailVisible.value = true
}

// 创建修复包
const createFixPackage = (analysis: any) => {
  fixPackageForm.name = `${analysis.errorType} 修复补丁`
  fixPackageForm.description = analysis.suggestion || ''
  fixPackageForm.fixType = analysis.fixType || 'user_guide'
  fixPackageForm.fixContentText = analysis.fixContent ? JSON.stringify(analysis.fixContent, null, 2) : ''
  fixPackageForm.targetUserIds = []
  fixPackageForm.analysisId = analysis.id
  createFixPackageVisible.value = true
}

const showCreateFixPackageDialog = () => {
  fixPackageForm.name = ''
  fixPackageForm.description = ''
  fixPackageForm.fixType = 'user_guide'
  fixPackageForm.fixContentText = ''
  fixPackageForm.targetUserIds = []
  fixPackageForm.analysisId = null
  createFixPackageVisible.value = true
}

const submitFixPackage = async () => {
  if (!fixPackageForm.name) {
    ElMessage.warning('请输入修复包名称')
    return
  }
  if (fixPackageForm.targetUserIds.length === 0) {
    ElMessage.warning('请选择目标用户')
    return
  }

  let fixContent: any
  try {
    fixContent = JSON.parse(fixPackageForm.fixContentText || '{}')
  } catch {
    ElMessage.warning('修复内容必须是有效的JSON格式')
    return
  }

  try {
    await $fetch('/api/client-log/fix-package', {
      method: 'POST',
      body: {
        name: fixPackageForm.name,
        description: fixPackageForm.description,
        analysisId: fixPackageForm.analysisId,
        fixType: fixPackageForm.fixType,
        fixContent,
        targetUserIds: fixPackageForm.targetUserIds,
      },
    })
    ElMessage.success('修复包下发成功')
    createFixPackageVisible.value = false
    loadFixPackages()
    loadAnalyses()
  } catch (e) {
    ElMessage.error('下发修复包失败')
  }
}

const viewFixPackageDetail = (pkg: any) => {
  ElMessageBox.alert(
    `<div>
      <p><strong>名称：</strong>${pkg.name}</p>
      <p><strong>说明：</strong>${pkg.description || '无'}</p>
      <p><strong>修复类型：</strong>${getFixTypeLabel(pkg.fixType)}</p>
      <p><strong>目标用户：</strong>${pkg.targetUserIds?.length || 0} 人</p>
      <p><strong>已接收：</strong>${pkg.receivedCount} 人</p>
      <p><strong>已应用：</strong>${pkg.appliedCount} 人</p>
    </div>`,
    '修复包详情',
    { dangerouslyUseHTMLString: true }
  )
}

// 分页
const handleLogPageChange = (page: number) => {
  logFilter.page = page
  loadLogs()
}

const handleAnalysisPageChange = (page: number) => {
  analysisFilter.page = page
  loadAnalyses()
}

const handleFixPackagePageChange = (page: number) => {
  fixPackagesPage.value = page
  loadFixPackages()
}

// 辅助函数
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const getLogTypeTag = (type: string) => {
  const map: Record<string, string> = {
    error: 'danger',
    api_error: 'warning',
    performance: 'info',
    user_action: 'success',
  }
  return map[type] || 'info'
}

const getLevelTag = (level: string) => {
  const map: Record<string, string> = {
    info: 'info',
    warn: 'warning',
    error: 'danger',
    critical: 'danger',
  }
  return map[level] || 'info'
}

const getSeverityTag = (severity: string) => {
  const map: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  return map[severity] || 'info'
}

const getStatusTag = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    fix_sent: 'success',
    resolved: 'success',
    ignored: 'info',
  }
  return map[status] || 'info'
}

const getFixTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    code_patch: '代码补丁',
    config_change: '配置修改',
    user_guide: '操作指导',
  }
  return map[type] || type
}

const refreshData = () => {
  loadConfig()
  loadLogs()
  loadAnalyses()
  loadFixPackages()
}

// 加载用户列表
const loadUsers = async () => {
  try {
    const res = await $fetch('/api/users')
    users.value = res.data || res || []
  } catch (e) {
    console.error('加载用户列表失败', e)
  }
}

onMounted(() => {
  refreshData()
  loadUsers()
})
</script>

<style scoped>
.log-management {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.config-form {
  max-width: 700px;
  padding: 20px 0;
}

.form-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.detail-json {
  margin-top: 16px;
}

.detail-json h4 {
  margin: 0 0 8px 0;
}

.detail-json pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
  font-size: 12px;
}
</style>
