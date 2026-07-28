<template>
  <div class="task-center-page">
    <!-- 顶部搜索栏 + 新建任务按钮 -->
    <div class="top-bar">
      <div class="search-area">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索任务模板..."
          prefix-icon="Search"
          clearable
          size="large"
          class="search-input"
          @input="handleSearch"
        />
      </div>
      <el-button type="primary" size="large" @click="navigateTo('/publish-v2/create')">
        <el-icon><Plus /></el-icon>
        新建任务
      </el-button>
    </div>

    <!-- 任务类型卡片 -->
    <div class="section-header">
      <h3 class="section-title">任务类型</h3>
    </div>
    <div class="task-type-grid">
      <div
        v-for="module in taskModules"
        :key="module.type"
        class="task-type-card"
        :style="{ '--card-color': module.color }"
        @click="navigateTo(`/publish-v2/create?type=${module.type}`)"
      >
        <div class="card-icon" :style="{ background: module.color }">
          <el-icon size="28" color="#fff">
            <component :is="module.icon" />
          </el-icon>
        </div>
        <div class="card-info">
          <div class="card-name">{{ module.name }}</div>
          <div class="card-desc">{{ module.description }}</div>
        </div>
        <div class="card-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <!-- 模板库 -->
    <div class="section-header">
      <h3 class="section-title">模板库</h3>
      <span class="section-count">{{ filteredTemplates.length }} 个模板</span>
    </div>

    <div v-loading="loading" class="template-library">
      <div v-if="filteredTemplates.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无模板" />
      </div>

      <template v-for="category in allDisplayCategories" :key="category.key">
        <div v-if="getCategoryTemplates(category.key).length > 0" class="category-section">
          <div class="category-header">
            <h4 class="category-title">{{ category.name }}</h4>
            <span class="category-count">{{ getCategoryTemplates(category.key).length }} 个模板</span>
          </div>
          <div class="template-scroll">
            <div
              v-for="template in getCategoryTemplates(category.key)"
              :key="template.id"
              class="template-card"
              @click="navigateTo(`/publish-v2/create?templateId=${template.id}`)"
            >
              <div class="template-card-header">
                <h5 class="template-title">{{ template.templateName }}</h5>
                <el-tag size="small" :type="getTypeTagType(template.templateType)">
                  {{ getTypeLabel(template.templateType) }}
                </el-tag>
              </div>
              <p class="template-desc">{{ template.description || '暂无描述' }}</p>
              <div class="template-footer">
                <span class="template-usage">
                  <el-icon><UserFilled /></el-icon>
                  {{ template.usageCount || 0 }} 次使用
                </span>
                <span v-if="template.deadline" class="template-deadline">
                  <el-icon><Clock /></el-icon>
                  {{ formatDeadline(template.deadline) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, ArrowRight, Search, UserFilled, EditPen, Camera, FolderOpened, MagicStick, Clock } from '@element-plus/icons-vue'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const router = useRouter()

const searchKeyword = ref('')
const loading = ref(false)

interface TaskModule {
  type: string
  name: string
  description: string
  color: string
  icon: any
}

interface TemplateData {
  id: number
  templateName: string
  title?: string
  templateType: string
  description?: string
  usageCount?: number
  category?: string
  deadline?: string
  isPublished?: boolean
}

const taskModules = ref<TaskModule[]>([
  {
    type: 'form_collect',
    name: '收集表',
    description: '创建信息收集表单，支持多种字段类型',
    color: '#1677ff',
    icon: EditPen,
  },
  {
    type: 'photo_checkin',
    name: '拍照打卡',
    description: '地理位置拍照打卡，确保任务执行到位',
    color: '#52c41a',
    icon: Camera,
  },
  {
    type: 'file_collect',
    name: '文件收集',
    description: '统一收集船舶文件材料，支持多种格式',
    color: '#fa8c16',
    icon: FolderOpened,
  },
  {
    type: 'ai_survey',
    name: 'AI问卷',
    description: 'AI智能生成问卷题目，自动分析回收结果',
    color: '#722ed1',
    icon: MagicStick,
  },
])

const templateCategories = ref([
  { name: '船员管理', key: 'crew_management' },
  { name: '航行安全', key: 'navigation_safety' },
  { name: '设备维护', key: 'equipment_maintenance' },
  { name: '港口业务', key: 'port_operations' },
  { name: '质量管理', key: 'quality_management' },
])

// 已知的分类 key 集合（用于判断模板是否属于已定义分类）
const knownCategoryKeys = new Set(templateCategories.value.map((c) => c.key))

const allTemplates = ref<TemplateData[]>([])

const filteredTemplates = computed(() => {
  if (!searchKeyword.value.trim()) return allTemplates.value
  const kw = searchKeyword.value.trim().toLowerCase()
  return allTemplates.value.filter(
    (t) =>
      t.templateName.toLowerCase().includes(kw) ||
      (t.description && t.description.toLowerCase().includes(kw))
  )
})

// 显示用的分类列表：已定义分类 + "其他模板"兜底分类
// 顺序：先显示已定义分类，再显示"其他模板"，确保未分类模板也能被渲染
const allDisplayCategories = computed(() => [
  ...templateCategories.value,
  { name: '其他模板', key: '__uncategorized__' },
])

function getCategoryTemplates(categoryKey: string) {
  if (categoryKey === '__uncategorized__') {
    // 未分类模板：category 为空，或不属于任何已定义分类
    return filteredTemplates.value.filter(
      (t) => !t.category || !knownCategoryKeys.has(t.category)
    )
  }
  return filteredTemplates.value.filter((t) => t.category === categoryKey)
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    form_collect: '收集表',
    photo_checkin: '拍照打卡',
    file_collect: '文件收集',
    ai_survey: 'AI问卷',
    ship_dynamic: '船舶动态',
    port_call_check: '靠港检查',
  }
  return map[type] || type
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    form_collect: 'primary',
    photo_checkin: 'success',
    file_collect: 'warning',
    ai_survey: '',
    ship_dynamic: 'primary',
    port_call_check: 'success',
  }
  return map[type] || 'info'
}

function handleSearch() {
  // computed already handles filtering
}

function navigateTo(path: string) {
  router.push(path)
}

async function loadData() {
  loading.value = true
  try {
    const [modulesResult, templatesResult] = await Promise.all([
      api.apiFetch('/publish-task-modules').catch(() => null),
      api.apiFetch('/publish-templates').catch(() => []),
    ])

    if (modulesResult && Array.isArray(modulesResult)) {
      taskModules.value = modulesResult.map((m: any) => ({
        type: m.type || m.code,
        name: m.name || m.label,
        description: m.description || '',
        color: m.color || '#1677ff',
        icon: getIconComponent(m.icon || 'edit'),
      }))
    }

    if (Array.isArray(templatesResult)) {
      allTemplates.value = templatesResult.map((t: any) => ({
        id: t.id,
        templateName: t.templateName || t.title,
        templateType: t.templateType,
        description: t.templateDesc || t.description,
        usageCount: t.usageCount || 0,
        category: t.category,
        deadline: t.deadline,
        isPublished: t.isPublished,
      }))
    }
  } catch {
    // Error handled by apiFetch
  } finally {
    loading.value = false
  }
}

function getIconComponent(iconName: string) {
  const map: Record<string, any> = {
    edit: EditPen,
    camera: Camera,
    folder: FolderOpened,
    magic: MagicStick,
  }
  return map[iconName] || EditPen
}

function formatDeadline(deadline: string): string {
  if (!deadline) return ''
  const date = new Date(deadline)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.task-center-page {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

/* 顶部搜索栏 */
.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  padding: 20px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.search-area {
  flex: 1;
}

.search-input {
  max-width: 480px;
}

/* 区域标题 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.section-count {
  font-size: 13px;
  color: #909399;
}

/* 任务类型卡片网格 */
.task-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.task-type-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.task-type-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--card-color);
  border-radius: 12px 0 0 12px;
}

.task-type-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--card-color);
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.card-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-arrow {
  color: #c0c4cc;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.task-type-card:hover .card-arrow {
  color: var(--card-color);
  transform: translateX(4px);
}

/* 模板库 */
.template-library {
  min-height: 200px;
}

.category-section {
  margin-bottom: 24px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.category-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.category-count {
  font-size: 12px;
  color: #c0c4cc;
}

.template-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-behavior: smooth;
}

.template-scroll::-webkit-scrollbar {
  height: 6px;
}

.template-scroll::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.template-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.template-card {
  flex: 0 0 280px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: #1677ff;
}

.template-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.template-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin: 0 0 12px;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-usage {
  font-size: 12px;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  gap: 4px;
}

.template-deadline {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-state {
  padding: 60px 0;
}

/* 响应式 */
@media (max-width: 1200px) {
  .task-type-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .task-type-grid {
    grid-template-columns: 1fr;
  }

  .template-card {
    flex: 0 0 240px;
  }
}
</style>