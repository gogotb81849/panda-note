<template>
  <div class="shortcuts-settings-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="navigateTo('/')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2 class="page-title">快捷键设置</h2>
      </div>
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索快捷键..."
          clearable
          class="search-input"
          :prefix-icon="Search"
        />
        <el-button @click="handleResetAll" :icon="RefreshLeft">
          恢复默认
        </el-button>
        <el-dropdown trigger="click" @command="handleImportExport">
          <el-button :icon="Download">
            导入/导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="export">
                <el-icon><Download /></el-icon>
                导出配置
              </el-dropdown-item>
              <el-dropdown-item command="import">
                <el-icon><Upload /></el-icon>
                导入配置
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="page-content">
      <div class="category-sidebar">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          <span class="category-icon">{{ cat.icon }}</span>
          <span class="category-name">{{ cat.name }}</span>
          <span class="category-count">{{ getCategoryCount(cat.id) }}</span>
        </div>
      </div>

      <div class="shortcuts-main">
        <div v-if="filteredShortcuts.length === 0" class="empty-state">
          <el-empty description="没有找到匹配的快捷键" />
        </div>

        <div v-else class="shortcuts-list">
          <div
            v-for="shortcut in filteredShortcuts"
            :key="shortcut.id"
            class="shortcut-item"
            :class="{ disabled: !shortcut.enabled }"
          >
            <div class="shortcut-info">
              <div class="shortcut-header">
                <span class="shortcut-name">{{ shortcut.name }}</span>
                <el-tag size="small" type="info" effect="plain" class="scope-tag">
                  {{ shortcut.scope }}
                </el-tag>
              </div>
              <p class="shortcut-desc">{{ shortcut.description }}</p>
              <div class="shortcut-default" v-if="shortcut.currentKeys !== shortcut.defaultKeys && shortcut.enabled">
                默认: <span class="default-keys">{{ formatKeyDisplay(shortcut.defaultKeys) }}</span>
              </div>
            </div>

            <div class="shortcut-actions">
              <div
                class="key-input-wrapper"
                :class="{ recording: recordingId === shortcut.id, conflict: hasConflict(shortcut) }"
                @click="startRecording(shortcut)"
              >
                <span v-if="!shortcut.currentKeys && recordingId !== shortcut.id" class="placeholder">
                  未设置
                </span>
                <span v-else-if="recordingId === shortcut.id" class="recording-text">
                  按下新快捷键...
                </span>
                <span v-else class="keys-display">
                  <kbd v-for="(key, idx) in parseKeys(shortcut.currentKeys)" :key="idx" class="key-badge">
                    {{ key }}
                  </kbd>
                </span>
                <el-icon v-if="recordingId === shortcut.id" class="recording-icon"><VideoPlay /></el-icon>
              </div>

              <div class="action-buttons">
                <el-tooltip content="恢复默认" placement="top">
                  <el-button
                    circle
                    size="small"
                    :icon="RefreshRight"
                    :disabled="shortcut.currentKeys === shortcut.defaultKeys && shortcut.enabled"
                    @click.stop="handleResetOne(shortcut.id)"
                  />
                </el-tooltip>
                <el-tooltip :content="shortcut.enabled ? '禁用' : '启用'" placement="top">
                  <el-button
                    circle
                    size="small"
                    :icon="shortcut.enabled ? View : Hide"
                    :type="shortcut.enabled ? 'success' : 'info'"
                    @click.stop="handleToggle(shortcut.id, !shortcut.enabled)"
                  />
                </el-tooltip>
                <el-tooltip content="清除" placement="top">
                  <el-button
                    circle
                    size="small"
                    type="danger"
                    :icon="Delete"
                    :disabled="!shortcut.currentKeys"
                    @click.stop="handleClear(shortcut.id)"
                  />
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="conflictDialogVisible"
      title="快捷键冲突"
      width="420px"
      :close-on-click-modal="false"
    >
      <div v-if="conflictInfo" class="conflict-content">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="检测到快捷键冲突"
        />
        <div class="conflict-details">
          <div class="conflict-item">
            <span class="conflict-label">当前设置:</span>
            <span class="conflict-name">{{ conflictInfo.current?.name }}</span>
          </div>
          <div class="conflict-item">
            <span class="conflict-label">冲突的快捷键:</span>
            <span class="conflict-name">{{ conflictInfo.conflict?.name }}</span>
          </div>
          <div class="conflict-item">
            <span class="conflict-label">作用域:</span>
            <span class="conflict-scope">{{ conflictInfo.conflict?.scope }}</span>
          </div>
        </div>
        <p class="conflict-tip">是否覆盖冲突的快捷键设置？</p>
      </div>
      <template #footer>
        <el-button @click="conflictDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmOverride">覆盖冲突</el-button>
      </template>
    </el-dialog>

    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowDown,
  Search,
  RefreshLeft,
  RefreshRight,
  Download,
  Upload,
  Delete,
  View,
  Hide,
  VideoPlay,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useShortcutConfig, type ShortcutItem } from '~/composables/useShortcutConfig'

definePageMeta({
  middleware: ['auth'],
})

const router = useRouter()
const {
  shortcuts,
  categories,
  formatKeyDisplay,
  eventToKeys,
  updateShortcut,
  forceUpdateShortcut,
  clearShortcut,
  toggleShortcut,
  resetToDefault,
  resetAllToDefault,
  exportShortcuts,
  importShortcuts,
  checkConflict,
  loadShortcuts,
} = useShortcutConfig()

const searchQuery = ref('')
const activeCategory = ref('file')
const recordingId = ref<string | null>(null)
const pendingShortcut = ref<{ id: string; keys: string } | null>(null)
const conflictDialogVisible = ref(false)
const conflictInfo = ref<{ current: ShortcutItem | undefined; conflict: ShortcutItem | undefined } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const filteredShortcuts = computed(() => {
  let result = shortcuts.value.filter(s => s.category === activeCategory.value)

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = shortcuts.value.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.currentKeys.toLowerCase().includes(query)
    )
  }

  return result
})

const getCategoryCount = (catId: string) => {
  return shortcuts.value.filter(s => s.category === catId).length
}

const parseKeys = (keys: string): string[] => {
  if (!keys) return []
  return keys.split('+').map(k => k.trim())
}

const hasConflict = (shortcut: ShortcutItem): boolean => {
  if (!shortcut.currentKeys || !shortcut.enabled) return false
  const conflict = checkConflict(shortcut.id, shortcut.currentKeys, shortcut.scope)
  return !!conflict
}

const startRecording = (shortcut: ShortcutItem) => {
  if (!shortcut.enabled) {
    ElMessage.info('请先启用该快捷键')
    return
  }
  recordingId.value = shortcut.id
}

const stopRecording = () => {
  recordingId.value = null
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (!recordingId.value) return

  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape') {
    stopRecording()
    return
  }

  const keys = eventToKeys(e)
  if (!keys || keys.split('+').length < 2 && !['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Escape'].includes(e.key)) {
    return
  }

  const shortcut = shortcuts.value.find(s => s.id === recordingId.value)
  if (!shortcut) {
    stopRecording()
    return
  }

  const result = updateShortcut(recordingId.value, keys)

  if (result.success) {
    ElMessage.success('快捷键已更新')
    stopRecording()
  } else if (result.conflict) {
    pendingShortcut.value = { id: recordingId.value, keys }
    conflictInfo.value = {
      current: shortcut,
      conflict: result.conflict,
    }
    conflictDialogVisible.value = true
    stopRecording()
  }
}

const confirmOverride = () => {
  if (pendingShortcut.value) {
    forceUpdateShortcut(pendingShortcut.value.id, pendingShortcut.value.keys)
    ElMessage.success('快捷键已更新，冲突的快捷键已被清除')
    conflictDialogVisible.value = false
    pendingShortcut.value = null
    conflictInfo.value = null
  }
}

const handleClear = (id: string) => {
  ElMessageBox.confirm('确定要清除此快捷键吗？', '确认清除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    clearShortcut(id)
    ElMessage.success('快捷键已清除')
  }).catch(() => {})
}

const handleToggle = (id: string, enabled: boolean) => {
  toggleShortcut(id, enabled)
  ElMessage.success(enabled ? '已启用' : '已禁用')
}

const handleResetOne = (id: string) => {
  resetToDefault(id)
  ElMessage.success('已恢复默认设置')
}

const handleResetAll = () => {
  ElMessageBox.confirm(
    '确定要恢复所有快捷键为默认设置吗？此操作不可撤销。',
    '确认恢复',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    resetAllToDefault()
    ElMessage.success('所有快捷键已恢复默认')
  }).catch(() => {})
}

const handleImportExport = (command: string) => {
  if (command === 'export') {
    handleExport()
  } else if (command === 'import') {
    fileInputRef.value?.click()
  }
}

const handleExport = () => {
  const data = exportShortcuts()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shortcut-config-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    const success = importShortcuts(content)
    if (success) {
      ElMessage.success('配置导入成功')
      loadShortcuts()
    } else {
      ElMessage.error('配置文件格式不正确')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

const navigateTo = (path: string) => {
  router.push(path)
}

const handleDocumentClick = (e: MouseEvent) => {
  if (recordingId.value) {
    const target = e.target as HTMLElement
    if (!target.closest('.key-input-wrapper')) {
      stopRecording()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown, true)
  document.addEventListener('click', handleDocumentClick)
  loadShortcuts()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown, true)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.shortcuts-settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 240px;
}

.page-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.category-sidebar {
  width: 200px;
  background: white;
  border-right: 1px solid #e4e7ed;
  padding: 16px 0;
  overflow-y: auto;
  flex-shrink: 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.category-item:hover {
  background: #f5f7fa;
}

.category-item.active {
  background: #ecf5ff;
  border-left-color: #409eff;
  color: #409eff;
}

.category-icon {
  font-size: 18px;
}

.category-name {
  flex: 1;
  font-size: 14px;
}

.category-count {
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.category-item.active .category-count {
  background: #409eff;
  color: white;
}

.shortcuts-main {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.shortcut-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #dcdfe6;
}

.shortcut-item.disabled {
  opacity: 0.6;
}

.shortcut-info {
  flex: 1;
  min-width: 0;
}

.shortcut-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.shortcut-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.scope-tag {
  font-size: 11px;
}

.shortcut-desc {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.shortcut-default {
  margin-top: 6px;
  font-size: 11px;
  color: #909399;
}

.default-keys {
  color: #606266;
  font-family: monospace;
}

.shortcut-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.key-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.key-input-wrapper:hover {
  border-color: #c0c4cc;
}

.key-input-wrapper.recording {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.key-input-wrapper.conflict {
  border-color: #f56c6c;
  background: #fef0f0;
}

.placeholder {
  color: #c0c4cc;
  font-size: 13px;
}

.recording-text {
  color: #409eff;
  font-size: 13px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.keys-display {
  display: flex;
  align-items: center;
  gap: 4px;
}

.key-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #606266;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.recording-icon {
  color: #409eff;
  margin-left: auto;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.conflict-content {
  padding: 10px 0;
}

.conflict-details {
  margin-top: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.conflict-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
}

.conflict-label {
  width: 100px;
  color: #909399;
}

.conflict-name {
  color: #1a1a1a;
  font-weight: 500;
}

.conflict-scope {
  color: #606266;
}

.conflict-tip {
  margin: 16px 0 0 0;
  font-size: 13px;
  color: #606266;
}
</style>
