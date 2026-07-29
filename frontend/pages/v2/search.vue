<template>
  <div class="search-page">
    <!-- 搜索头部 -->
    <div class="search-header">
      <div class="search-input-wrapper">
        <el-input
          v-model="searchQuery"
          size="large"
          placeholder="输入关键词搜索日记、经验、模板、船员..."
          clearable
          @input="onInput"
          @clear="clearSearch"
          @keyup.enter="doSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" size="large" @click="doSearch" :loading="loading">
          搜索
        </el-button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchPerformed" class="search-results">
      <!-- 结果统计 -->
      <div class="results-summary" v-if="!loading">
        <span v-if="totalResults > 0">
          找到 <strong>{{ totalResults }}</strong> 条结果
        </span>
        <span v-else class="no-results">
          未找到与 "<strong>{{ lastQuery }}</strong>" 相关的结果
        </span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>搜索中...</span>
      </div>

      <!-- 结果分组标签页 -->
      <template v-if="!loading && groups.length > 0">
        <el-tabs v-model="activeTab" type="card" class="result-tabs">
          <el-tab-pane
            v-for="group in groups"
            :key="group.type"
            :label="`${group.label} (${group.count})`"
            :name="group.type"
          >
            <div class="result-list">
              <div
                v-for="item in group.items"
                :key="`${group.type}-${item.id}`"
                class="result-item"
                @click="navigateToItem(group.type, item.id)"
              >
                <div class="result-header">
                  <el-tag
                    :type="typeBadgeType(group.type)"
                    size="small"
                    class="type-badge"
                  >
                    {{ group.label }}
                  </el-tag>
                  <span class="result-title">{{ item.title }}</span>
                  <span class="result-date">{{ item.date }}</span>
                </div>
                <div class="result-snippet" v-html="item.highlight"></div>
                <div v-if="item.extra" class="result-extra">
                  <template v-if="group.type === 'diary' && item.extra.shipName">
                    <el-icon><Ship /></el-icon>
                    <span>{{ item.extra.shipName }}</span>
                  </template>
                  <template v-if="group.type === 'experience' && item.extra.category">
                    <el-icon><Collection /></el-icon>
                    <span>{{ item.extra.category }}</span>
                  </template>
                  <template v-if="group.type === 'template'">
                    <el-tag size="small" :type="item.extra.isPublished ? 'success' : 'info'">
                      {{ item.extra.isPublished ? '已发布' : '草稿' }}
                    </el-tag>
                  </template>
                  <template v-if="group.type === 'crew'">
                    <el-icon><User /></el-icon>
                    <span>{{ item.extra.position || '-' }}</span>
                    <span v-if="item.extra.shipName" class="extra-divider">|</span>
                    <span v-if="item.extra.shipName">{{ item.extra.shipName }}</span>
                  </template>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>

    <!-- 空状态 -->
    <div v-if="!searchPerformed" class="empty-state">
      <el-empty description="输入关键词开始搜索" :image-size="160">
        <template #image>
          <el-icon :size="80" color="#c0c4cc"><Search /></el-icon>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Search, Loading, Ship, Collection, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: false,
});

const authStore = useAuthStore();

const searchQuery = ref('');
const lastQuery = ref('');
const loading = ref(false);
const searchPerformed = ref(false);
const groups = ref([]);
const activeTab = ref('');

// Debounce timer
let debounceTimer = null;

const totalResults = computed(() => {
  return groups.value.reduce((sum, g) => sum + g.count, 0);
});

function onInput() {
  clearTimeout(debounceTimer);
  if (searchQuery.value.trim()) {
    debounceTimer = setTimeout(() => {
      doSearch();
    }, 400);
  }
}

async function doSearch() {
  const q = searchQuery.value.trim();
  if (!q) {
    clearSearch();
    return;
  }

  loading.value = true;
  searchPerformed.value = true;
  lastQuery.value = q;

  try {
    const token = authStore.token || localStorage.getItem('auth_token');
    const response = await $fetch('/api/search', {
      method: 'GET',
      params: { q },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    groups.value = response.groups || [];
    if (groups.value.length > 0) {
      activeTab.value = groups.value[0].type;
    }
  } catch (error) {
    ElMessage.error('搜索失败，请稍后重试');
    groups.value = [];
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  searchQuery.value = '';
  groups.value = [];
  searchPerformed.value = false;
  lastQuery.value = '';
}

function typeBadgeType(type) {
  const map = {
    diary: 'primary',
    experience: 'success',
    template: 'warning',
    crew: 'danger',
  };
  return map[type] || 'info';
}

function navigateToItem(type, id) {
  const routes = {
    diary: `/diary?id=${id}`,
    experience: `/experiences?id=${id}`,
    template: `/publish-v2?id=${id}`,
    crew: `/crew-list?id=${id}`,
  };
  const route = routes[type];
  if (route) {
    navigateTo(route);
  }
}
</script>

<style scoped>
.search-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
  min-height: 100vh;
  background: var(--el-bg-color-page, #f5f7fa);
}

.search-header {
  margin-bottom: 24px;
}

.search-input-wrapper {
  display: flex;
  gap: 12px;
}

.search-input-wrapper .el-input {
  flex: 1;
}

.search-results {
  background: var(--el-bg-color, #fff);
  border-radius: 8px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.results-summary {
  margin-bottom: 16px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 14px;
}

.results-summary strong {
  color: var(--el-color-primary, #409eff);
}

.no-results {
  color: var(--el-text-color-placeholder, #c0c4cc);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--el-text-color-secondary, #909399);
}

.result-tabs {
  margin-top: 4px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.result-item {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-item:hover {
  border-color: var(--el-color-primary-light-3, #a0cfff);
  background: var(--el-color-primary-light-9, #ecf5ff);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.type-badge {
  flex-shrink: 0;
}

.result-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-date {
  font-size: 12px;
  color: var(--el-text-color-placeholder, #c0c4cc);
  flex-shrink: 0;
}

.result-snippet {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  line-height: 1.6;
  margin-bottom: 8px;
}

.result-snippet :deep(mark) {
  background: #fff3cd;
  color: #856404;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 500;
}

.result-extra {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.result-extra .el-icon {
  font-size: 14px;
}

.extra-divider {
  color: var(--el-border-color, #dcdfe6);
  margin: 0 4px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

@media (max-width: 640px) {
  .search-page {
    padding: 16px 12px;
  }

  .search-input-wrapper {
    flex-direction: column;
  }

  .search-results {
    padding: 16px;
  }

  .result-header {
    flex-wrap: wrap;
  }
}
</style>