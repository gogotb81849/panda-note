<template>
  <div class="magazine-list-page">
    <div class="page-header">
      <h2>杂志编排</h2>
      <el-button type="primary" @click="$router.push('/magazine/create')">
        <el-icon><Plus /></el-icon>
        创建杂志
      </el-button>
    </div>

    <!-- 杂志列表 -->
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="magazines.length === 0" class="empty-state">
      <el-empty description="暂无杂志">
        <el-button type="primary" @click="$router.push('/magazine/create')">创建第一本杂志</el-button>
      </el-empty>
    </div>

    <div v-else class="magazine-grid">
      <el-card v-for="magazine in magazines" :key="magazine.id" class="magazine-card" shadow="hover">
        <div class="magazine-cover">
          <div class="cover-placeholder">
            <svg class="cover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
        </div>
        <div class="magazine-info">
          <h3 class="magazine-name">{{ magazine.name }}</h3>
          <div class="magazine-meta">
            <el-tag :type="magazine.status === 'published' ? 'success' : 'info'" size="small">
              {{ magazine.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
            <span class="article-count">{{ getArticleCount(magazine) }} 篇文章</span>
          </div>
          <p class="magazine-date">{{ formatDate(magazine.createdAt) }}</p>
        </div>
        <div class="magazine-actions">
          <el-button size="small" @click="$router.push(`/magazine/${magazine.id}`)">编辑</el-button>
          <el-button size="small" type="primary" @click="handleGeneratePdf(magazine.id)" :loading="generatingId === magazine.id">生成PDF</el-button>
          <el-dropdown trigger="click">
            <el-button size="small">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleDuplicate(magazine)">复制</el-dropdown-item>
                <el-dropdown-item @click="handleDelete(magazine.id)" divided style="color: var(--color-danger)">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreFilled } from '@element-plus/icons-vue'

const api = useApi()
const magazines = ref<any[]>([])
const loading = ref(false)
const generatingId = ref<string | null>(null)

const loadMagazines = async () => {
  loading.value = true
  try {
    magazines.value = await api.magazine.getAll()
  } catch (error) {
    ElMessage.error('加载杂志列表失败')
  } finally {
    loading.value = false
  }
}

const getArticleCount = (magazine: any) => {
  return magazine.sections?.reduce((sum: number, section: any) => sum + (section.articles?.length || 0), 0) || 0
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleGeneratePdf = async (id: string) => {
  generatingId.value = id
  try {
    const base64 = await api.magazine.generatePdf(id)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `magazine-${id}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('PDF生成成功')
  } catch (error) {
    ElMessage.error('PDF生成失败')
  } finally {
    generatingId.value = null
  }
}

const handleDuplicate = async (magazine: any) => {
  try {
    await api.magazine.create({
      title: `${magazine.name} (副本)`,
      templateId: magazine.templateId,
      totalPages: magazine.totalPages,
    })
    ElMessage.success('杂志复制成功')
    loadMagazines()
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这本杂志吗？此操作不可恢复。', '删除确认', {
      type: 'warning',
    })
    await api.magazine.delete(id)
    ElMessage.success('删除成功')
    loadMagazines()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadMagazines()
})
</script>

<style scoped>
.magazine-list-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.loading-state,
.empty-state {
  padding: 60px 0;
}

.magazine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.magazine-card {
  display: flex;
  flex-direction: column;
}

.magazine-cover {
  height: 160px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-placeholder {
  color: white;
  opacity: 0.8;
}

.cover-icon {
  width: 64px;
  height: 64px;
}

.magazine-info {
  padding: 16px;
  flex: 1;
}

.magazine-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.magazine-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.article-count {
  font-size: 13px;
  color: var(--color-text-muted);
}

.magazine-date {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.magazine-actions {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  gap: 8px;
}
</style>
