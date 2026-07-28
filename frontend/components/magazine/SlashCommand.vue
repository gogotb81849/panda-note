<template>
  <!-- 输入/时显示命令菜单 -->
  <Teleport to="body">
    <div
      v-show="visible"
      class="slash-command"
      :style="positionStyle"
      ref="commandRef"
    >
      <div class="command-search">
        <el-input
          v-model="search"
          placeholder="搜索命令..."
          size="small"
          ref="searchInputRef"
          @keydown="handleKeydown"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="command-list" ref="listRef">
        <template v-for="category in categorizedCommands" :key="category.name">
          <div class="command-category" v-if="category.items.length > 0">
            <div class="category-title">{{ category.name }}</div>
            <div
              v-for="(cmd, idx) in category.items"
              :key="cmd.id"
              class="command-item"
              :class="{ active: selectedIndex === getGlobalIndex(category.name, idx) }"
              @click="executeCommand(cmd)"
              @mouseenter="selectedIndex = getGlobalIndex(category.name, idx)"
            >
              <span class="command-icon">{{ cmd.icon }}</span>
              <div class="command-info">
                <span class="command-name">{{ cmd.name }}</span>
                <span class="command-desc">{{ cmd.description }}</span>
              </div>
              <span class="command-shortcut" v-if="cmd.shortcut">{{ cmd.shortcut }}</span>
            </div>
          </div>
        </template>

        <div v-if="filteredCommands.length === 0" class="no-results">
          未找到匹配的命令
        </div>
      </div>

      <div class="command-footer">
        <span class="footer-hint">
          <kbd>↑</kbd><kbd>↓</kbd> 选择
          <kbd>Enter</kbd> 执行
          <kbd>Esc</kbd> 关闭
        </span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { SlashCommand } from './types'

// Props
const props = defineProps<{
  visible: boolean
  position: { x: number; y: number }
}>()

// Emits
const emit = defineEmits<{
  'select': [command: SlashCommand]
  'close': []
}>()

const search = ref('')
const selectedIndex = ref(0)
const commandRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<any>(null)
const listRef = ref<HTMLElement | null>(null)

// 命令列表
const commands = ref<SlashCommand[]>([
  // 块类型
  { id: 'heading1', name: '标题1', icon: 'H1', description: '大标题', category: 'block', shortcut: '#', action: () => {} },
  { id: 'heading2', name: '标题2', icon: 'H2', description: '中标题', category: 'block', shortcut: '##', action: () => {} },
  { id: 'heading3', name: '标题3', icon: 'H3', description: '小标题', category: 'block', shortcut: '###', action: () => {} },
  { id: 'paragraph', name: '正文', icon: 'P', description: '普通段落', category: 'block', action: () => {} },
  { id: 'quote', name: '引用', icon: '"', description: '引用区块', category: 'block', shortcut: '>', action: () => {} },
  { id: 'image', name: '图片', icon: '🖼', description: '插入图片', category: 'insert', action: () => {} },
  { id: 'divider', name: '分割线', icon: '—', description: '添加分割线', category: 'block', shortcut: '---', action: () => {} },
  { id: 'code', name: '代码块', icon: '</>', description: '插入代码', category: 'block', shortcut: '```', action: () => {} },
  { id: 'list', name: '列表', icon: '•', description: '无序列表', category: 'block', shortcut: '-', action: () => {} },
  { id: 'ordered-list', name: '编号列表', icon: '1.', description: '有序列表', category: 'block', shortcut: '1.', action: () => {} },

  // 格式化
  { id: 'bold', name: '加粗', icon: 'B', description: '粗体文字', category: 'format', shortcut: 'Ctrl+B', action: () => {} },
  { id: 'italic', name: '斜体', icon: 'I', description: '斜体文字', category: 'format', shortcut: 'Ctrl+I', action: () => {} },
  { id: 'underline', name: '下划线', icon: 'U', description: '下划线文字', category: 'format', shortcut: 'Ctrl+U', action: () => {} },
  { id: 'strikethrough', name: '删除线', icon: 'S', description: '删除线文字', category: 'format', shortcut: '~~', action: () => {} },
  { id: 'highlight', name: '高亮', icon: '✨', description: '高亮文字', category: 'format', shortcut: '==', action: () => {} },

  // AI功能
  { id: 'ai-polish', name: 'AI润色', icon: '✨', description: 'AI优化文字', category: 'ai', shortcut: 'Ctrl+Shift+P', action: () => {} },
  { id: 'ai-expand', name: 'AI扩写', icon: '📝', description: 'AI扩展内容', category: 'ai', shortcut: 'Ctrl+Shift+E', action: () => {} },
  { id: 'ai-condense', name: 'AI缩写', icon: '✂️', description: 'AI精简内容', category: 'ai', shortcut: 'Ctrl+Shift+C', action: () => {} },
  { id: 'ai-translate', name: 'AI翻译', icon: '🌐', description: '翻译选中内容', category: 'ai', action: () => {} },
  { id: 'ai-correct', name: 'AI纠错', icon: '✓', description: '检查并修正错误', category: 'ai', action: () => {} },
  { id: 'ai-title', name: 'AI生成标题', icon: '💡', description: '智能生成标题', category: 'ai', action: () => {} },
])

// 过滤后的命令
const filteredCommands = computed(() => {
  if (!search.value) return commands.value

  const keyword = search.value.toLowerCase()
  return commands.value.filter(cmd =>
    cmd.name.toLowerCase().includes(keyword) ||
    cmd.description.toLowerCase().includes(keyword) ||
    cmd.id.toLowerCase().includes(keyword)
  )
})

// 分类后的命令
const categorizedCommands = computed(() => {
  const categories = [
    { name: '块类型', key: 'block', items: [] as SlashCommand[] },
    { name: '格式化', key: 'format', items: [] as SlashCommand[] },
    { name: '插入', key: 'insert', items: [] as SlashCommand[] },
    { name: 'AI功能', key: 'ai', items: [] as SlashCommand[] },
  ]

  filteredCommands.value.forEach(cmd => {
    const category = categories.find(c => c.key === cmd.category)
    if (category) {
      category.items.push(cmd)
    }
  })

  return categories.filter(c => c.items.length > 0)
})

// 获取全局索引
const getGlobalIndex = (categoryName: string, localIndex: number): number => {
  let globalIndex = 0
  for (const category of categorizedCommands.value) {
    if (category.name === categoryName) {
      return globalIndex + localIndex
    }
    globalIndex += category.items.length
  }
  return globalIndex
}

// 位置样式
const positionStyle = computed(() => ({
  top: `${props.position.y}px`,
  left: `${props.position.x}px`,
}))

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(0, selectedIndex.value - 1)
      scrollToSelected()
      break
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = Math.min(filteredCommands.value.length - 1, selectedIndex.value + 1)
      scrollToSelected()
      break
    case 'Enter':
      e.preventDefault()
      if (filteredCommands.value[selectedIndex.value]) {
        executeCommand(filteredCommands.value[selectedIndex.value])
      }
      break
    case 'Escape':
      emit('close')
      break
  }
}

// 滚动到选中项
const scrollToSelected = () => {
  nextTick(() => {
    const selectedItem = listRef.value?.querySelector('.command-item.active')
    selectedItem?.scrollIntoView({ block: 'nearest' })
  })
}

// 执行命令
const executeCommand = (command: SlashCommand) => {
  emit('select', command)
  emit('close')
}

// 监听显示状态
watch(() => props.visible, (val) => {
  if (val) {
    search.value = ''
    selectedIndex.value = 0
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  if (commandRef.value && !commandRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 暴露方法
defineExpose({
  focus: () => searchInputRef.value?.focus(),
})
</script>

<style scoped>
.slash-command {
  position: fixed;
  width: 320px;
  max-height: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  overflow: hidden;
}

.command-search {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.command-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 8px 0;
}

.command-category {
  margin-bottom: 8px;
}

.category-title {
  padding: 4px 12px;
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.command-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.command-item:hover,
.command-item.active {
  background: #ecf5ff;
}

.command-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  color: #409eff;
  margin-right: 12px;
}

.command-info {
  flex: 1;
  min-width: 0;
}

.command-name {
  display: block;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.command-desc {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.command-shortcut {
  font-size: 11px;
  color: #c0c4cc;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.no-results {
  padding: 20px;
  text-align: center;
  color: #909399;
}

.command-footer {
  padding: 8px 12px;
  border-top: 1px solid #ebeef5;
  background: #fafafa;
}

.footer-hint {
  font-size: 12px;
  color: #909399;
}

.footer-hint kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  margin: 0 2px;
}

/* 滚动条样式 */
.command-list::-webkit-scrollbar {
  width: 6px;
}

.command-list::-webkit-scrollbar-track {
  background: transparent;
}

.command-list::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.command-list::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>