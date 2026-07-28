<template>
  <el-dialog
    v-model="visible"
    title="插入标题"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="title-selector">
      <!-- 搜索框 -->
      <el-input
        v-model="searchText"
        placeholder="搜索标题..."
        clearable
        prefix-icon="Search"
        style="margin-bottom: 16px"
      />

      <!-- 一级分类选择 -->
      <div v-if="!selectedCategory" class="category-list">
        <h3 class="section-title">选择一级分类</h3>
        <div v-for="(subs, category) in filteredTitles" :key="category" class="category-item" @click="selectCategory(category)">
          <div class="category-info">
            <span class="category-name">{{ category }}</span>
            <span class="category-count">{{ subs.length }} 项</span>
          </div>
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div v-if="Object.keys(filteredTitles).length === 0" class="empty-tip">
          没有找到匹配的标题分类
        </div>
      </div>

      <!-- 二级标题选择 -->
      <div v-else class="subcategory-list">
        <div class="back-bar" @click="selectedCategory = ''">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回上一级</span>
        </div>
        <h3 class="section-title">{{ selectedCategory }}</h3>
        <div v-for="item in filteredSubs" :key="item.id" class="subcategory-item" @click="selectTitle(item)">
          <div class="sub-info">
            <span class="sub-name">{{ item.title }}</span>
            <span v-if="item.description" class="sub-desc">{{ item.description }}</span>
          </div>
          <el-icon color="#409eff"><Check /></el-icon>
        </div>
      </div>

      <!-- 自定义标题 -->
      <div class="custom-section">
        <el-divider>或自定义标题</el-divider>
        <el-form :model="customForm" label-width="80px" size="small">
          <el-form-item label="一级分类">
            <el-input v-model="customForm.categoryFirst" placeholder="输入一级分类" />
          </el-form-item>
          <el-form-item label="二级标题">
            <el-input v-model="customForm.categorySecond" placeholder="输入二级标题" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="selectCustom" style="width: 100%">使用自定义标题</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowRight, ArrowLeft, Check, Search } from '@element-plus/icons-vue'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'select'])

const authStore = useAuthStore()
const visible = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })

const searchText = ref('')
const selectedCategory = ref('')
const titles = ref<Record<string, any[]>>({})

// 过滤后的标题
const filteredTitles = computed(() => {
  if (!searchText.value) return titles.value
  const result: Record<string, any[]> = {}
  for (const [cat, subs] of Object.entries(titles.value)) {
    const filteredSubs = subs.filter(s =>
      s.title.includes(searchText.value) || cat.includes(searchText.value)
    )
    if (filteredSubs.length > 0) {
      result[cat] = filteredSubs
    }
  }
  return result
})

const filteredSubs = computed(() => {
  const subs = titles.value[selectedCategory.value] || []
  if (!searchText.value) return subs
  return subs.filter(s => s.title.includes(searchText.value))
})

const customForm = ref({ categoryFirst: '', categorySecond: '' })

const loadTitles = async () => {
  try {
    const res = await $fetch('/api/title', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: { role: authStore.user?.role }
    })
    titles.value = res as Record<string, any[]>
  } catch (e) {
    console.error('加载标题失败', e)
  }
}

const selectCategory = (cat: string) => {
  selectedCategory.value = cat
}

const selectTitle = (item: any) => {
  emit('select', { categoryFirst: selectedCategory.value, categorySecond: item.title })
  visible.value = false
}

const selectCustom = () => {
  if (customForm.value.categoryFirst && customForm.value.categorySecond) {
    emit('select', { ...customForm.value })
    visible.value = false
    customForm.value = { categoryFirst: '', categorySecond: '' }
  }
}

onMounted(() => {
  loadTitles()
})
</script>

<style scoped>
.title-selector {
  max-height: 500px;
  overflow-y: auto;
}

.section-title {
  font-size: 14px;
  color: #303133;
  margin: 0 0 12px 0;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background: #ecf5ff;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-name {
  font-size: 14px;
  color: #303133;
}

.category-count {
  font-size: 12px;
  color: #909399;
}

.back-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: #409eff;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 12px;
  border-radius: 6px;
}

.back-bar:hover {
  background: #ecf5ff;
}

.subcategory-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subcategory-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.subcategory-item:hover {
  background: #ecf5ff;
}

.sub-info {
  flex: 1;
}

.sub-name {
  font-size: 14px;
  color: #303133;
}

.sub-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.custom-section {
  margin-top: 20px;
}

.empty-tip {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}
</style>
