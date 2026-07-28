<template>
  <div class="global-search" :class="{ 'is-focused': isFocused || showResults }">
    <div class="search-input-wrapper">
      <el-input
        v-model="query"
        placeholder="搜索日记、日程、会议、经验..."
        :prefix-icon="Search"
        clearable
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keyup.enter="onSearch"
        @clear="onClear"
        size="default"
        class="search-input"
      />
      <el-button
        v-if="query"
        @click="onSearch"
        type="primary"
        size="default"
        class="search-btn"
      >
        搜索
      </el-button>
    </div>

    <!-- 搜索结果下拉 -->
    <transition name="search-dropdown">
      <div v-if="showResults" class="search-results">
        <!-- 搜索建议（无搜索按钮时） -->
        <div v-if="!searched && suggestions.length > 0" class="suggestion-list">
          <div
            v-for="item in suggestions"
            :key="`${item.type}-${item.id}`"
            class="suggestion-item"
            @mousedown="goToResult(item)"
          >
            <span class="result-type-tag" :class="`type-${item.type}`">{{ typeLabel(item.type) }}</span>
            <span class="result-title">{{ item.title }}</span>
          </div>
        </div>

        <!-- 搜索结果 -->
        <div v-if="searched" class="result-list">
          <div v-if="results.length === 0" class="no-results">
            没有找到相关内容
          </div>
          <div v-else>
            <div
              v-for="item in results"
              :key="`${item.type}-${item.id}`"
              class="result-item"
              @mousedown="goToResult(item)"
            >
              <div class="result-header">
                <span class="result-type-tag" :class="`type-${item.type}`">{{ typeLabel(item.type) }}</span>
                <span class="result-title">{{ item.title }}</span>
              </div>
              <p class="result-content">{{ item.content }}</p>
            </div>
            <div v-if="total > pageSize" class="result-footer">
              <span>共 {{ total }} 条结果</span>
              <el-button link type="primary" size="small" @mousedown="loadMore">加载更多</el-button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const config = useRuntimeConfig()
const authStore = useAuthStore()

const query = ref('')
const isFocused = ref(false)
const showResults = ref(false)
const searched = ref(false)
const results = ref<any[]>([])
const suggestions = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
let debounceTimer: any = null

const typeLabel = (type: string) => {
  const map: Record<string, string> = {
    diary: '日记',
    schedule: '日程',
    meeting: '会议',
    experience: '经验',
  }
  return map[type] || type
}

const typePath = (type: string, id: number) => {
  const map: Record<string, string> = {
    diary: `/diary`,
    schedule: `/schedule/${id}`,
    meeting: `/meeting-records`,
    experience: `/experiences`,
  }
  return map[type] || '/'
}

const apiBase = config.public.apiBase

const fetchSuggestions = async (q: string) => {
  if (!q.trim()) {
    suggestions.value = []
    return
  }
  try {
    const response = await $fetch(`${apiBase}/search/suggest?q=${encodeURIComponent(q)}`, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : '',
      },
    })
    suggestions.value = response || []
  } catch {
    suggestions.value = []
  }
}

const fetchResults = async (q: string, p = 1, append = false) => {
  if (!q.trim()) return
  try {
    const response = await $fetch(
      `${apiBase}/search?q=${encodeURIComponent(q)}&type=all&page=${p}&pageSize=${pageSize}`,
      {
        headers: {
          Authorization: authStore.token ? `Bearer ${authStore.token}` : '',
        },
      }
    )
    if (append) {
      results.value = [...results.value, ...(response.results || [])]
    } else {
      results.value = response.results || []
    }
    total.value = response.total || 0
  } catch {
    results.value = []
  }
}

const onInput = () => {
  searched.value = false
  clearTimeout(debounceTimer)
  if (query.value.trim()) {
    debounceTimer = setTimeout(() => {
      fetchSuggestions(query.value)
    }, 300)
  } else {
    suggestions.value = []
  }
}

const onFocus = () => {
  isFocused.value = true
  if (query.value.trim()) {
    showResults.value = true
  }
}

const onBlur = () => {
  // Delay to allow click on result items
  setTimeout(() => {
    isFocused.value = false
    showResults.value = false
  }, 200)
}

const onSearch = () => {
  if (!query.value.trim()) return
  searched.value = true
  suggestions.value = []
  page.value = 1
  fetchResults(query.value, 1)
  showResults.value = true
}

const onClear = () => {
  query.value = ''
  searched.value = false
  results.value = []
  suggestions.value = []
  total.value = 0
  showResults.value = false
}

const loadMore = () => {
  page.value++
  fetchResults(query.value, page.value, true)
}

const goToResult = (item: any) => {
  const path = typePath(item.type, item.id)
  showResults.value = false
  router.push(path)
}

// ESC 关闭搜索
const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    showResults.value = false
    isFocused.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
})
</script>

<style scoped>
.global-search {
  position: relative;
  width: 280px;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 20px;
  padding: 4px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(91, 127, 166, 0.3);
}

.search-btn {
  border-radius: 20px;
  padding: 8px 16px;
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  max-height: 400px;
  overflow-y: auto;
  z-index: 200;
}

.suggestion-list, .result-list {
  padding: 8px 0;
}

.suggestion-item, .result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.suggestion-item:hover, .result-item:hover {
  background-color: #f5f7fa;
}

.result-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-type-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  flex-shrink: 0;
}

.result-type-tag.type-diary {
  background: #e1f0ff;
  color: #409eff;
}

.result-type-tag.type-schedule {
  background: #f0f9eb;
  color: #67c23a;
}

.result-type-tag.type-meeting {
  background: #fdf6ec;
  color: #e6a23c;
}

.result-type-tag.type-experience {
  background: #f4f4f5;
  color: #909399;
}

.result-title {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-content {
  margin: 0;
  font-size: 12px;
  color: #808080;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.result-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #909399;
}

.no-results {
  padding: 24px 16px;
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
}

/* 下拉动画 */
.search-dropdown-enter-active,
.search-dropdown-leave-active {
  transition: all 0.2s ease;
}

.search-dropdown-enter-from,
.search-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 手机端适配 */
@media (max-width: 767px) {
  .global-search {
    width: 160px;
  }
}
</style>
