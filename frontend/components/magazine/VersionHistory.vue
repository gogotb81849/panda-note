<template>
  <div class="version-history">
    <div class="history-header">
      <h3>📜 版本历史</h3>
      <el-button @click="handleCreateVersion" type="primary" size="small" :loading="creating">
        创建版本
      </el-button>
    </div>

    <div class="version-list" v-loading="loading">
      <div
        v-for="version in versions"
        :key="version.id"
        class="version-item"
        :class="{ current: version.versionNumber === currentVersionNumber }"
      >
        <div class="version-info">
          <div class="version-name">{{ version.name }}</div>
          <div class="version-meta">
            <span>{{ version.createdBy }}</span>
            <span>{{ formatDate(version.createdAt) }}</span>
          </div>
          <div v-if="version.description" class="version-desc">
            {{ version.description }}
          </div>
        </div>

        <div class="version-actions">
          <el-button size="small" @click="handlePreview(version)">
            预览
          </el-button>
          <el-button size="small" type="warning" @click="handleRestore(version)">
            恢复
          </el-button>
          <el-button
            v-if="versions.length > 1"
            size="small"
            type="info"
            @click="handleCompare(version)"
          >
            对比
          </el-button>
        </div>
      </div>

      <el-empty v-if="versions.length === 0 && !loading" description="暂无版本记录" />
    </div>

    <!-- 版本对比对话框 -->
    <el-dialog v-model="showCompare" title="版本对比" width="80%" destroy-on-close>
      <div class="compare-view">
        <div class="compare-panel">
          <h4>选中版本 (v{{ selectedVersion?.versionNumber }})</h4>
          <div class="compare-content">
            <div v-if="compareResult.added.articles.length > 0" class="compare-section">
              <div class="compare-label added">+ 新增</div>
              <div v-for="article in compareResult.added.articles" :key="article" class="compare-item">
                {{ article }}
              </div>
            </div>
            <div v-if="compareResult.removed.articles.length > 0" class="compare-section">
              <div class="compare-label removed">- 删除</div>
              <div v-for="article in compareResult.removed.articles" :key="article" class="compare-item">
                {{ article }}
              </div>
            </div>
            <div v-if="compareResult.modified.articles.length > 0" class="compare-section">
              <div class="compare-label modified">~ 修改</div>
              <div v-for="item in compareResult.modified.articles" :key="item.title" class="compare-item">
                <div class="modified-title">{{ item.title }}</div>
                <div v-for="change in item.changes" :key="change" class="modified-change">
                  {{ change }}
                </div>
              </div>
            </div>
            <el-empty
              v-if="compareResult.added.articles.length === 0 &&
                    compareResult.removed.articles.length === 0 &&
                    compareResult.modified.articles.length === 0"
              description="无差异"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCompare = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 版本预览对话框 -->
    <el-dialog v-model="showPreview" title="版本预览" width="80%" destroy-on-close>
      <div class="preview-content" v-if="previewData">
        <h3>{{ previewData.name }}</h3>
        <div class="preview-sections">
          <div v-for="section in previewData.sections" :key="section.id" class="preview-section">
            <h4>{{ section.name }}</h4>
            <div v-for="article in section.articles" :key="article.id" class="preview-article">
              <div class="article-title">{{ article.title }}</div>
              <div v-if="article.author" class="article-author">作者: {{ article.author }}</div>
              <div class="article-summary">{{ article.summary || article.content.substring(0, 100) }}...</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Version {
  id: string
  versionNumber: number
  name: string
  description: string
  createdBy: string
  createdAt: string
}

interface CompareResult {
  added: { section: string; articles: string[] }
  removed: { section: string; articles: string[] }
  modified: { section: string; articles: { title: string; changes: string[] }[] }
}

interface MagazineData {
  id: string
  name: string
  sections: {
    id: string
    name: string
    articles: {
      id: string
      title: string
      content: string
      author: string | null
      summary: string | null
    }[]
  }[]
}

const props = defineProps<{
  magazineId: string
  currentVersionNumber?: number
}>()

const emit = defineEmits(['restore', 'version-created'])

const loading = ref(false)
const creating = ref(false)
const versions = ref<Version[]>([])
const showCompare = ref(false)
const showPreview = ref(false)
const selectedVersion = ref<Version | null>(null)
const compareResult = ref<CompareResult>({
  added: { section: '', articles: [] },
  removed: { section: '', articles: [] },
  modified: { section: '', articles: [] },
})
const previewData = ref<MagazineData | null>(null)

const api = {
  async getVersions(magazineId: string): Promise<Version[]> {
    const response = await fetch(`/api/magazine/${magazineId}/versions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (!response.ok) throw new Error('获取版本列表失败')
    return response.json()
  },

  async createVersion(magazineId: string, description?: string): Promise<{ id: string; versionNumber: number }> {
    const response = await fetch(`/api/magazine/${magazineId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ description }),
    })
    if (!response.ok) throw new Error('创建版本失败')
    return response.json()
  },

  async getVersion(magazineId: string, versionId: string): Promise<MagazineData> {
    const response = await fetch(`/api/magazine/${magazineId}/versions/${versionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (!response.ok) throw new Error('获取版本详情失败')
    return response.json()
  },

  async restoreVersion(magazineId: string, versionId: string): Promise<any> {
    const response = await fetch(`/api/magazine/${magazineId}/versions/${versionId}/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (!response.ok) throw new Error('恢复版本失败')
    return response.json()
  },

  async compareVersions(magazineId: string, v1: string, v2: string): Promise<CompareResult> {
    const response = await fetch(`/api/magazine/${magazineId}/versions/compare?v1=${v1}&v2=${v2}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (!response.ok) throw new Error('版本对比失败')
    return response.json()
  },
}

const loadVersions = async () => {
  loading.value = true
  try {
    versions.value = await api.getVersions(props.magazineId)
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

const handleCreateVersion = async () => {
  creating.value = true
  try {
    const result = await api.createVersion(props.magazineId)
    ElMessage.success(`版本 ${result.versionNumber} 创建成功`)
    emit('version-created', result)
    await loadVersions()
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    creating.value = false
  }
}

const handlePreview = async (version: Version) => {
  try {
    previewData.value = await api.getVersion(props.magazineId, version.id)
    showPreview.value = true
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}

const handleRestore = async (version: Version) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到此版本 (${version.name}) 吗？恢复前将自动创建当前版本的备份。`,
      '恢复版本',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const result = await api.restoreVersion(props.magazineId, version.id)
    ElMessage.success('版本恢复成功')
    emit('restore', result)
    await loadVersions()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '恢复版本失败')
    }
  }
}

const handleCompare = async (version: Version) => {
  if (versions.value.length < 2) {
    ElMessage.warning('需要至少两个版本才能对比')
    return
  }

  selectedVersion.value = version

  // 使用当前最新版本与选中版本对比
  const latestVersion = versions.value[0]
  const olderVersion = version

  // 确保 olderVersion 是较旧的版本
  const v1 = olderVersion.versionNumber < latestVersion.versionNumber ? olderVersion.id : latestVersion.id
  const v2 = olderVersion.versionNumber < latestVersion.versionNumber ? latestVersion.id : olderVersion.id

  try {
    compareResult.value = await api.compareVersions(props.magazineId, v1, v2)
    showCompare.value = true
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}

const formatDate = (dateStr: string) => {
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
  loadVersions()
})

defineExpose({
  loadVersions,
})
</script>

<style scoped>
.version-history {
  padding: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.history-header h3 {
  margin: 0;
  font-size: 16px;
}

.version-list {
  max-height: 400px;
  overflow-y: auto;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.version-item:hover {
  background: var(--color-bg-light);
}

.version-item.current {
  border-left: 3px solid var(--color-primary);
}

.version-info {
  flex: 1;
}

.version-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.version-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.version-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.version-actions {
  display: flex;
  gap: 4px;
}

.compare-view {
  display: flex;
  gap: 16px;
}

.compare-panel {
  flex: 1;
}

.compare-panel h4 {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.compare-content {
  max-height: 400px;
  overflow-y: auto;
}

.compare-section {
  margin-bottom: 16px;
}

.compare-label {
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  display: inline-block;
}

.compare-label.added {
  background: #e6f7ed;
  color: #52c41a;
}

.compare-label.removed {
  background: #fff1f0;
  color: #ff4d4f;
}

.compare-label.modified {
  background: #fffbe6;
  color: #faad14;
}

.compare-item {
  padding: 4px 8px;
  margin-bottom: 4px;
  background: var(--color-bg);
  border-radius: 4px;
  font-size: 13px;
}

.modified-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.modified-change {
  color: var(--color-text-muted);
  font-size: 12px;
  padding-left: 8px;
}

.preview-content {
  max-height: 60vh;
  overflow-y: auto;
}

.preview-content h3 {
  margin-bottom: 16px;
}

.preview-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-section {
  background: var(--color-bg);
  padding: 12px;
  border-radius: 8px;
}

.preview-section h4 {
  margin-bottom: 8px;
  color: var(--color-primary);
}

.preview-article {
  padding: 8px;
  background: var(--color-bg-light);
  border-radius: 4px;
  margin-bottom: 8px;
}

.preview-article:last-child {
  margin-bottom: 0;
}

.article-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.article-author {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.article-summary {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
