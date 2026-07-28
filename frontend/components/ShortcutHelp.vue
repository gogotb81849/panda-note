<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="shortcut-help-overlay"
        @click="handleOverlayClick"
      >
        <div
          class="shortcut-help-container"
          @click.stop
        >
          <div class="shortcut-help-header">
            <div class="header-left">
              <span class="header-icon">⌨️</span>
              <h2 class="header-title">快捷键</h2>
              <span class="shortcut-count">{{ totalCount }} 个快捷键</span>
            </div>
            <div class="header-actions">
              <el-button
                size="small"
                type="default"
                @click="handleResetAll"
              >
                恢复默认
              </el-button>
              <button
                class="close-btn"
                @click="handleClose"
                aria-label="关闭"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="shortcut-help-search">
            <div class="search-wrapper">
              <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索快捷键..."
                @keydown="handleSearchKeydown"
              />
              <kbd v-if="!searchQuery" class="search-shortcut">Ctrl + Shift + ?</kbd>
            </div>
          </div>

          <div class="shortcut-help-body">
            <div v-if="filteredShortcuts.length > 0" class="shortcut-groups">
              <template v-for="group in groupedShortcuts" :key="group.category">
                <div v-if="group.items.length > 0" class="shortcut-group">
                  <div class="group-header">
                    <span class="group-icon">{{ group.icon }}</span>
                    <span class="group-name">{{ group.name }}</span>
                    <span class="group-count">{{ group.items.length }}</span>
                  </div>
                  <div class="group-items">
                    <div
                      v-for="item in group.items"
                      :key="item.id"
                      class="shortcut-item"
                    >
                      <div class="shortcut-info">
                        <span class="shortcut-desc">{{ item.description }}</span>
                        <span class="shortcut-scope">{{ getScopeName(item.scope) }}</span>
                      </div>
                      <div class="shortcut-keys">
                        <kbd v-for="(key, idx) in getShortcutKeys(item)" :key="idx" class="kbd-key">
                          {{ key }}
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <div v-else class="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="M6 8h.01"></path>
                <path d="M10 8h.01"></path>
                <path d="M14 8h.01"></path>
                <path d="M18 8h.01"></path>
                <path d="M8 12h.01"></path>
                <path d="M12 12h.01"></path>
                <path d="M16 12h.01"></path>
                <path d="M7 16h10"></path>
              </svg>
              <p class="empty-title">未找到匹配的快捷键</p>
              <p class="empty-desc">试试其他关键词</p>
            </div>
          </div>

          <div class="shortcut-help-footer">
            <div class="footer-tip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              <span>提示：按 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>?</kbd> 可随时打开此面板</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  shortcutHelpVisible,
  closeShortcutHelp,
  getAllShortcuts,
  categoryNames,
  categoryIcons,
  scopeNames,
  resetAllShortcuts,
  type ShortcutConfig,
  type ShortcutCategory,
  type ShortcutScope,
} from '~/composables/useGlobalShortcuts'

const searchInputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')

const visible = computed(() => shortcutHelpVisible.value)

const allShortcuts = computed(() => getAllShortcuts.value)

const totalCount = computed(() => allShortcuts.value.length)

const filteredShortcuts = computed(() => {
  if (!searchQuery.value.trim()) {
    return allShortcuts.value
  }

  const keyword = searchQuery.value.toLowerCase()
  return allShortcuts.value.filter(shortcut =>
    shortcut.description.toLowerCase().includes(keyword) ||
    shortcut.id.toLowerCase().includes(keyword) ||
    shortcut.key.toLowerCase().includes(keyword) ||
    categoryNames[shortcut.category]?.toLowerCase().includes(keyword) ||
    scopeNames[shortcut.scope]?.toLowerCase().includes(keyword)
  )
})

const groupedShortcuts = computed(() => {
  const categories: ShortcutCategory[] = ['file', 'edit', 'view', 'navigation', 'help']
  
  return categories.map(category => ({
    category,
    name: categoryNames[category],
    icon: categoryIcons[category],
    items: filteredShortcuts.value.filter(s => s.category === category),
  }))
})

const getScopeName = (scope: ShortcutScope): string => {
  return scopeNames[scope] || scope
}

const getShortcutKeys = (shortcut: ShortcutConfig): string[] => {
  const keys: string[] = []
  if (shortcut.ctrlKey || shortcut.metaKey) keys.push('Ctrl')
  if (shortcut.shiftKey) keys.push('Shift')
  if (shortcut.altKey) keys.push('Alt')
  keys.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key)
  return keys
}

const handleOverlayClick = () => {
  handleClose()
}

const handleClose = () => {
  closeShortcutHelp()
}

const handleSearchKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (searchQuery.value) {
      searchQuery.value = ''
    } else {
      handleClose()
    }
  }
}

const handleResetAll = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复所有快捷键为默认设置吗？',
      '恢复默认',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    resetAllShortcuts()
    ElMessage.success('已恢复所有默认快捷键')
  } catch {
  }
}

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && visible.value) {
    handleClose()
  }
}

watch(visible, (val) => {
  if (val) {
    searchQuery.value = ''
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.shortcut-help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.shortcut-help-container {
  width: 90%;
  max-width: 680px;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05),
    0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.shortcut-help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 28px;
}

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
}

.shortcut-count {
  padding: 4px 10px;
  background: #e2e8f0;
  border-radius: 20px;
  font-size: 12px;
  color: #475569;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.shortcut-help-search {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  background: white;
  color: #0f172a;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-shortcut {
  position: absolute;
  right: 12px;
  padding: 3px 8px;
  font-size: 11px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #64748b;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.shortcut-help-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.shortcut-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.shortcut-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.group-icon {
  font-size: 18px;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.group-count {
  margin-left: auto;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 12px;
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background-color 0.15s;
}

.shortcut-item:hover {
  background: #f8fafc;
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcut-desc {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.shortcut-scope {
  font-size: 12px;
  color: #94a3b8;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
}

.kbd-key {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #475569;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  min-width: 24px;
  text-align: center;
}

.empty-state {
  padding: 60px 24px;
  text-align: center;
  color: #94a3b8;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.4;
}

.empty-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
  color: #64748b;
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
}

.shortcut-help-footer {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}

.footer-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}

.footer-tip kbd {
  padding: 2px 6px;
  font-size: 11px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #475569;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.shortcut-help-body::-webkit-scrollbar {
  width: 8px;
}

.shortcut-help-body::-webkit-scrollbar-track {
  background: transparent;
}

.shortcut-help-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.shortcut-help-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

@media (max-width: 768px) {
  .shortcut-help-container {
    width: 95%;
    max-height: 85vh;
  }

  .shortcut-help-header {
    padding: 16px;
  }

  .shortcut-help-search {
    padding: 12px 16px;
  }

  .shortcut-help-body {
    padding: 16px;
  }

  .shortcut-help-footer {
    padding: 12px 16px;
  }
}
</style>
