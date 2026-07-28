<template>
  <div class="magazine-detail-page">
    <div class="page-header">
      <el-button text @click="$router.push('/magazine')">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
      <h2>{{ magazine?.name || '杂志编辑' }}</h2>
      <div class="header-actions">
        <el-button @click="handleSave">保存</el-button>
        <el-button type="primary" @click="handleGeneratePdf" :loading="generatingPdf">生成PDF</el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else class="magazine-content">
      <el-row :gutter="24">
        <!-- 左侧：版块和文章管理 -->
        <el-col :span="showPreview ? 12 : 16">
          <el-card class="sections-panel">
            <template #header>
              <div class="panel-header">
                <span>版块管理</span>
                <div class="header-actions">
                  <el-button size="small" :type="showPreview ? 'primary' : 'default'" @click="showPreview = !showPreview">
                    <el-icon><View /></el-icon>
                    {{ showPreview ? '隐藏预览' : '显示预览' }}
                  </el-button>
                  <el-button size="small" type="primary" @click="showSectionDialog = true">
                    <el-icon><Plus /></el-icon>
                    添加版块
                  </el-button>
                </div>
              </div>
            </template>

            <div v-if="magazine.sections?.length === 0" class="empty-sections">
              <el-empty description="暂无版块，请添加版块来组织文章">
                <el-button type="primary" @click="showSectionDialog = true">添加版块</el-button>
              </el-empty>
            </div>

            <div v-else class="sections-list">
              <div v-for="section in magazine.sections" :key="section.id" class="section-item">
                <div class="section-header" @click="toggleSection(section.id)">
                  <el-icon class="expand-icon" :class="{ expanded: expandedSections.includes(section.id) }">
                    <ArrowRight />
                  </el-icon>
                  <span class="section-name">{{ section.name }}</span>
                  <el-tag size="small" type="info">{{ section.layout }}</el-tag>
                  <span class="article-count">{{ section.articles?.length || 0 }} 篇</span>
                  <div class="section-actions">
                    <el-button size="small" text @click.stop="editSection(section)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button size="small" text @click.stop="deleteSection(section.id)" style="color: var(--color-danger)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>

                <div v-show="expandedSections.includes(section.id)" class="section-articles">
                  <draggable
                    :list="section.articles"
                    item-key="id"
                    :group="{ name: 'articles' }"
                    ghost-class="ghost"
                    @end="handleDragEnd"
                  >
                    <template #item="{ element }">
                      <div class="article-card">
                        <div class="article-drag-handle">
                          <el-icon><Rank /></el-icon>
                        </div>
                        <div class="article-info">
                          <h4>{{ element.title }}</h4>
                          <p v-if="element.author">作者：{{ element.author }}</p>
                        </div>
                        <div class="article-actions">
                          <el-button size="small" text @click="editArticle(element)">
                            <el-icon><Edit /></el-icon>
                          </el-button>
                          <el-button size="small" text @click="deleteArticle(element.id)" style="color: var(--color-danger)">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                      </div>
                    </template>
                  </draggable>

                  <div v-if="!section.articles?.length" class="no-articles">
                    拖拽文章到此处或点击添加
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 未分配文章 -->
          <el-card class="unassigned-panel">
            <template #header>
              <div class="panel-header">
                <span>未分配文章</span>
                <el-button size="small" type="primary" @click="showArticleDialog = true">
                  <el-icon><Plus /></el-icon>
                  添加文章
                </el-button>
              </div>
            </template>

            <draggable
              :list="unassignedArticles"
              item-key="id"
              :group="{ name: 'articles' }"
              ghost-class="ghost"
            >
              <template #item="{ element }">
                <div class="article-card">
                  <div class="article-drag-handle">
                    <el-icon><Rank /></el-icon>
                  </div>
                  <div class="article-info">
                    <h4>{{ element.title }}</h4>
                    <p v-if="element.author">作者：{{ element.author }}</p>
                  </div>
                  <div class="article-actions">
                    <el-button size="small" text @click="editArticle(element)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button size="small" text @click="deleteArticle(element.id)" style="color: var(--color-danger)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </template>
            </draggable>

            <div v-if="unassignedArticles.length === 0" class="empty-unassigned">
              <el-empty description="暂无未分配的文章" />
            </div>
          </el-card>
        </el-col>

        <!-- 右侧面板 -->
        <el-col :span="showPreview ? 12 : 8">
          <el-card class="right-panel">
            <template #header>
              <div class="right-panel-header">
                <el-radio-group v-model="rightPanelTab" size="small" @change="handleRightPanelChange">
                  <el-radio-button value="preview">
                    <el-icon><View /></el-icon>
                    预览
                  </el-radio-button>
                  <el-radio-button value="style">
                    <el-icon><Brush /></el-icon>
                    样式
                  </el-radio-button>
                  <el-radio-button value="color">
                    <el-icon><Sugar /></el-icon>
                    色板
                  </el-radio-button>
                  <el-radio-button value="master">
                    <el-icon><DocumentCopy /></el-icon>
                    主版页
                  </el-radio-button>
                  <el-radio-button value="info">
                    <el-icon><InfoFilled /></el-icon>
                    信息
                  </el-radio-button>
                </el-radio-group>
              </div>
            </template>

            <div class="right-panel-content">
              <!-- 实时预览 -->
              <div v-show="rightPanelTab === 'preview'" class="panel-tab-content preview-content">
                <RealtimePreview 
                  :magazine="magazine"
                  :current-article="currentEditingArticle"
                  @page-change="handlePreviewPageChange"
                />
              </div>

              <!-- 样式面板 -->
              <div v-show="rightPanelTab === 'style'" class="panel-tab-content">
                <StylePanel @apply-style="handleApplyStyle" />
              </div>

              <!-- 色板面板 -->
              <div v-show="rightPanelTab === 'color'" class="panel-tab-content">
                <ColorSwatches v-model="selectedColor" @apply="handleApplyColor" />
              </div>

              <!-- 主版页设置 -->
              <div v-show="rightPanelTab === 'master'" class="panel-tab-content">
                <MasterPageEditor v-model="masterPageConfig" />
              </div>

              <!-- 杂志信息 -->
              <div v-show="rightPanelTab === 'info'" class="panel-tab-content">
                <el-form label-width="80px" size="small">
                  <el-form-item label="杂志名称">
                    <el-input v-model="magazine.name" @blur="handleUpdateMagazine" />
                  </el-form-item>
                  <el-form-item label="模板">
                    <el-select v-model="magazine.templateId" @change="handleUpdateMagazine">
                      <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="总页数">
                    <el-input-number v-model="magazine.totalPages" :min="4" :max="64" @change="handleUpdateMagazine" />
                  </el-form-item>
                  <el-form-item label="状态">
                    <el-tag :type="magazine.status === 'published' ? 'success' : 'info'">
                      {{ magazine.status === 'published' ? '已发布' : '草稿' }}
                    </el-tag>
                  </el-form-item>
                  <el-form-item label="创建时间">
                    {{ formatDate(magazine.createdAt) }}
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 添加/编辑版块对话框 -->
    <el-dialog v-model="showSectionDialog" :title="editingSection ? '编辑版块' : '添加版块'" width="500px">
      <el-form :model="sectionForm" ref="sectionFormRef" label-width="100px">
        <el-form-item label="版块名称" prop="name">
          <el-input v-model="sectionForm.name" placeholder="如：新闻动态、经验分享" />
        </el-form-item>
        <el-form-item label="布局">
          <el-select v-model="sectionForm.layout">
            <el-option label="单栏" value="single-column" />
            <el-option label="双栏" value="two-column" />
            <el-option label="三栏" value="three-column" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSectionDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveSection">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑文章对话框 -->
    <el-dialog v-model="showArticleDialog" :title="editingArticle ? '编辑文章' : '添加文章'" width="700px">
      <el-form :model="articleForm" ref="articleFormRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="articleForm.title" placeholder="请输入文章标题" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="articleForm.author" placeholder="请输入作者姓名" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="articleForm.summary" type="textarea" :rows="2" placeholder="请输入文章摘要" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="articleForm.content" type="textarea" :rows="10" placeholder="请输入文章内容（支持富文本HTML）" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            class="article-image-upload"
            action="/api/files/upload"
            :headers="{ Authorization: `Bearer ${useCookie('token').value}` }"
            list-type="picture-card"
            :file-list="articleForm.images.map((url, index) => ({
              uid: index,
              name: `image-${index}`,
              status: 'success',
              url: url.startsWith('/uploads') ? url : `/uploads/${url}`,
            }))"
            :on-success="handleImageUploadSuccess"
            :on-remove="handleImageRemove"
            accept="image/*"
            :limit="9"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showArticleDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveArticle">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Edit, 
  Delete, 
  Rank, 
  View,
  Brush,
  Sugar,
  DocumentCopy,
  InfoFilled,
} from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import RealtimePreview from '~/components/magazine/RealtimePreview.vue'
import StylePanel from '~/components/magazine/StylePanel.vue'
import ColorSwatches from '~/components/magazine/ColorSwatches.vue'
import MasterPageEditor from '~/components/magazine/MasterPageEditor.vue'
import { useMagazineShortcuts } from '~/composables/useMagazineShortcuts'

const route = useRoute()
const api = useApi()
const editorRef = ref<HTMLElement | null>(null)

useMagazineShortcuts(editorRef, {
  saveArticle: () => handleSave(),
  createArticle: () => { showArticleDialog.value = true; editingArticle.value = null },
  togglePreview: () => { showPreview.value = !showPreview.value },
})

const loading = ref(false)
const generatingPdf = ref(false)
const magazine = ref<any>({
  name: '',
  templateId: 'business-classic',
  totalPages: 8,
  status: 'draft',
  sections: [],
})
const templates = ref<any[]>([])

const expandedSections = ref<string[]>([])
const showSectionDialog = ref(false)
const showArticleDialog = ref(false)
const showPreview = ref(true)
const editingSection = ref<any>(null)
const editingArticle = ref<any>(null)

const rightPanelTab = ref<'preview' | 'style' | 'color' | 'master' | 'info'>('preview')
const selectedColor = ref('#333333')
const masterPageConfig = reactive({
  header: {
    enabled: true,
    text: '',
    position: 'center' as const,
    divider: true,
    height: 20,
    fontSize: 9,
    color: '#666666',
  },
  footer: {
    enabled: true,
    text: '',
    pageNumber: true,
    pageNumberFormat: '- {page} -',
    position: 'center' as const,
    divider: false,
    height: 20,
    fontSize: 9,
    color: '#666666',
  },
  margin: {
    top: 25,
    bottom: 25,
    left: 25,
    right: 25,
  },
})

// 当前正在编辑的文章（用于实时预览高亮）
const currentEditingArticle = computed(() => {
  return editingArticle.value || null
})

const sectionFormRef = ref()
const articleFormRef = ref()

const sectionForm = reactive({
  name: '',
  layout: 'single-column',
})

const articleForm = reactive({
  title: '',
  content: '',
  author: '',
  summary: '',
  images: [] as string[],
})

const handleImageUploadSuccess = (response: any) => {
  if (response.filePath) {
    articleForm.images.push(response.filePath)
  }
}

const handleImageRemove = (file: any) => {
  const filePath = file.url?.replace(/^\/uploads\//, '') || file.url
  const index = articleForm.images.indexOf(filePath)
  if (index > -1) {
    articleForm.images.splice(index, 1)
  }
}

// 未分配的文章（sectionId 为 null）
const unassignedArticles = computed(() => {
  return magazine.value.articles?.filter((a: any) => !a.sectionId) || []
})

const loadMagazine = async () => {
  loading.value = true
  try {
    magazine.value = await api.magazine.getById(route.params.id as string)
    // 默认展开所有版块
    expandedSections.value = magazine.value.sections?.map((s: any) => s.id) || []
  } catch (error) {
    ElMessage.error('加载杂志失败')
  } finally {
    loading.value = false
  }
}

// 预览页面变化处理
const handlePreviewPageChange = (page: number) => {
}

// 右侧面板切换处理
const handleRightPanelChange = (tab: string) => {
}

// 应用样式处理
const handleApplyStyle = (style: any) => {
  ElMessage.success(`已应用样式：${style.name}`)
}

// 应用颜色处理
const handleApplyColor = (color: string) => {
  ElMessage.success(`已应用颜色：${color}`)
}

const loadTemplates = async () => {
  try {
    templates.value = await api.magazine.getTemplates()
  } catch (error) {
    console.error('加载模板失败', error)
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

const toggleSection = (sectionId: string) => {
  const idx = expandedSections.value.indexOf(sectionId)
  if (idx >= 0) {
    expandedSections.value.splice(idx, 1)
  } else {
    expandedSections.value.push(sectionId)
  }
}

const handleUpdateMagazine = async () => {
  try {
    await api.magazine.update(magazine.value.id, {
      title: magazine.value.name,
      templateId: magazine.value.templateId,
      totalPages: magazine.value.totalPages,
    })
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const editSection = (section: any) => {
  editingSection.value = section
  sectionForm.name = section.name
  sectionForm.layout = section.layout
  showSectionDialog.value = true
}

const handleSaveSection = async () => {
  try {
    if (editingSection.value) {
      await api.magazine.updateSection(magazine.value.id, editingSection.value.id, sectionForm)
      ElMessage.success('版块更新成功')
    } else {
      await api.magazine.createSection(magazine.value.id, sectionForm)
      ElMessage.success('版块创建成功')
    }
    showSectionDialog.value = false
    editingSection.value = null
    sectionForm.name = ''
    sectionForm.layout = 'single-column'
    loadMagazine()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const deleteSection = async (sectionId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个版块吗？版块内的文章将移至未分配。', '删除确认', {
      type: 'warning',
    })
    await api.magazine.deleteSection(magazine.value.id, sectionId)
    ElMessage.success('删除成功')
    loadMagazine()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const editArticle = (article: any) => {
  editingArticle.value = article
  articleForm.title = article.title
  articleForm.content = article.content
  articleForm.author = article.author || ''
  articleForm.summary = article.summary || ''
  articleForm.images = article.images || []
  showArticleDialog.value = true
}

const handleSaveArticle = async () => {
  try {
    if (editingArticle.value) {
      await api.magazine.updateArticle(magazine.value.id, editingArticle.value.id, {
        title: articleForm.title,
        content: articleForm.content,
        author: articleForm.author,
        summary: articleForm.summary,
        images: articleForm.images,
      })
      ElMessage.success('文章更新成功')
    } else {
      // 添加文章时，需要指定 sectionId
      const firstSection = magazine.value.sections?.[0]
      if (!firstSection?.id) {
        ElMessage.warning('请先创建版块')
        return
      }
      await api.magazine.addArticle(magazine.value.id, {
        title: articleForm.title,
        content: articleForm.content,
        author: articleForm.author,
        summary: articleForm.summary,
        images: articleForm.images,
        sectionId: firstSection.id,
      })
      ElMessage.success('文章创建成功')
    }
    showArticleDialog.value = false
    editingArticle.value = null
    articleForm.title = ''
    articleForm.content = ''
    articleForm.author = ''
    articleForm.summary = ''
    articleForm.images = []
    loadMagazine()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const deleteArticle = async (articleId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？', '删除确认', {
      type: 'warning',
    })
    await api.magazine.deleteArticle(magazine.value.id, articleId)
    ElMessage.success('删除成功')
    loadMagazine()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleDragEnd = async () => {
  // 拖拽结束后更新文章顺序
  try {
    for (const section of magazine.value.sections) {
      for (let i = 0; i < section.articles.length; i++) {
        await api.magazine.updateArticle(magazine.value.id, section.articles[i].id, {
          order: i,
          sectionId: section.id,
        })
      }
    }
  } catch (error) {
    ElMessage.error('保存顺序失败')
  }
}

const handleSave = async () => {
  try {
    await api.magazine.update(magazine.value.id, {
      title: magazine.value.name,
      templateId: magazine.value.templateId,
      totalPages: magazine.value.totalPages,
    })
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const handleGeneratePdf = async () => {
  generatingPdf.value = true
  try {
    const base64 = await api.magazine.generatePdf(magazine.value.id)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${magazine.value.name}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('PDF生成成功')
  } catch (error) {
    ElMessage.error('PDF生成失败')
  } finally {
    generatingPdf.value = false
  }
}

onMounted(() => {
  loadMagazine()
  loadTemplates()
})
</script>

<style scoped>
.magazine-detail-page {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.loading-state {
  padding: 40px;
}

.magazine-content {
  display: flex;
  gap: 24px;
}

.sections-panel,
.unassigned-panel,
.info-panel {
  margin-bottom: 20px;
}

.preview-panel {
  margin-bottom: 20px;
  height: calc(100vh - 200px);
}

.realtime-preview-wrapper {
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-item {
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--color-bg);
  cursor: pointer;
}

.section-header:hover {
  background: var(--color-bg-alt);
}

.expand-icon {
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.section-name {
  font-weight: 600;
  flex: 1;
}

.article-count {
  font-size: 12px;
  color: var(--color-text-muted);
}

.section-actions {
  display: flex;
  gap: 4px;
}

.section-articles {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.article-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  cursor: grab;
}

.article-card:active {
  cursor: grabbing;
}

.article-card.ghost {
  opacity: 0.5;
  background: var(--color-primary-light);
}

.article-drag-handle {
  color: var(--color-text-muted);
  cursor: grab;
}

.article-info {
  flex: 1;
  min-width: 0;
}

.article-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-info p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.article-actions {
  display: flex;
  gap: 4px;
}

.no-articles {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.empty-sections,
.empty-unassigned {
  padding: 20px;
}

.template-preview {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.preview-a4 {
  width: 120px;
  height: 170px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-header {
  height: 12px;
  background: #f0f0f0;
  border-radius: 2px;
  margin-bottom: 8px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-line {
  height: 6px;
  background: #e8e8e8;
  border-radius: 2px;
}

.preview-line:nth-child(2) {
  width: 80%;
}

.preview-line:nth-child(4) {
  width: 60%;
}

.preview-line:nth-child(6) {
  width: 90%;
}

.right-panel {
  margin-bottom: 20px;
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

:deep(.right-panel .el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

:deep(.right-panel .el-card__header) {
  padding: 12px 16px;
}

.right-panel-header {
  display: flex;
  overflow-x: auto;
}

:deep(.right-panel-header .el-radio-button__inner) {
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.right-panel-content {
  height: 100%;
  overflow: hidden;
}

.panel-tab-content {
  height: 100%;
  overflow: hidden;
}

.preview-content {
  height: 100%;
}
</style>
