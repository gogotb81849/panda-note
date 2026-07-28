<template>
  <el-dialog
    v-model="visible"
    title="快捷键帮助"
    width="500px"
    class="shortcut-help-dialog"
    :close-on-click-modal="true"
    destroy-on-close
  >
    <div class="shortcut-list">
      <!-- 搜索框 -->
      <div class="shortcut-search">
        <el-input
          v-model="search"
          placeholder="搜索快捷键..."
          size="small"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 分类列表 -->
      <template v-for="category in categorizedShortcuts" :key="category.key">
        <div class="shortcut-group" v-if="category.items.length > 0">
          <h4 class="group-title">
            <span class="group-icon">{{ category.icon }}</span>
            {{ category.name }}
          </h4>
          <div class="group-items">
            <div
              v-for="item in category.items"
              :key="item.description"
              class="shortcut-item"
            >
              <div class="shortcut-keys">
                <kbd v-for="key in item.keys" :key="key">{{ key }}</kbd>
              </div>
              <span class="shortcut-desc">{{ item.description }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 无结果 -->
      <div v-if="filteredShortcuts.length === 0" class="no-results">
        未找到匹配的快捷键
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="dialog-footer">
      <div class="footer-tip">
        <el-icon><InfoFilled /></el-icon>
        提示：按 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>?</kbd> 可随时打开此面板
      </div>
      <el-button @click="visible = false">关闭</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, InfoFilled } from '@element-plus/icons-vue'
import { getMagazineShortcuts, categoryNames } from '~/composables/useMagazineShortcuts'
import type { ShortcutItem } from '../magazine/types'

// Props
const props = defineProps<{
  modelValue: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const search = ref('')

// 控制对话框显示
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 所有快捷键
const allShortcuts = computed(() => getMagazineShortcuts())

// 过滤后的快捷键
const filteredShortcuts = computed(() => {
  if (!search.value) return allShortcuts.value

  const keyword = search.value.toLowerCase()
  return allShortcuts.value.filter(item =>
    item.description.toLowerCase().includes(keyword) ||
    item.keys.some(k => k.toLowerCase().includes(keyword))
  )
})

// 分类后的快捷键
const categorizedShortcuts = computed(() => {
  const categories = [
    { key: 'format', name: categoryNames.format, icon: '✏️', items: [] as ShortcutItem[] },
    { key: 'block', name: categoryNames.block, icon: '📝', items: [] as ShortcutItem[] },
    { key: 'ai', name: categoryNames.ai, icon: '✨', items: [] as ShortcutItem[] },
    { key: 'navigation', name: categoryNames.navigation, icon: '🧭', items: [] as ShortcutItem[] },
  ]

  filteredShortcuts.value.forEach(item => {
    const category = categories.find(c => c.key === item.category)
    if (category) {
      category.items.push(item)
    }
  })

  return categories
})

// 暴露方法
defineExpose({
  open: () => visible.value = true,
  close: () => visible.value = false,
})
</script>

<style scoped>
.shortcut-help-dialog {
  /* 对话框样式由Element Plus控制 */
}

.shortcut-list {
  max-height: 400px;
  overflow-y: auto;
}

.shortcut-search {
  margin-bottom: 16px;
}

.shortcut-group {
  margin-bottom: 20px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.group-icon {
  font-size: 16px;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  transition: background 0.2s;
}

.shortcut-item:hover {
  background: #ecf5ff;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
}

.shortcut-keys kbd {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  color: #303133;
}

.shortcut-desc {
  font-size: 14px;
  color: #606266;
}

.no-results {
  padding: 40px;
  text-align: center;
  color: #909399;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.footer-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.footer-tip kbd {
  padding: 2px 6px;
  font-size: 11px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
}

/* 滚动条样式 */
.shortcut-list::-webkit-scrollbar {
  width: 6px;
}

.shortcut-list::-webkit-scrollbar-track {
  background: transparent;
}

.shortcut-list::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.shortcut-list::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>