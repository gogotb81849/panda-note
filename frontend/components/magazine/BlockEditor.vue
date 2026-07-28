<template>
  <div class="block-editor" ref="editorRef">
    <!-- 块列表 -->
    <div
      v-for="(block, index) in blocks"
      :key="block.id"
      class="block-item"
      :class="{ active: activeBlock === block.id, dragging: dragIndex === index }"
      @click="activateBlock(block.id)"
    >
      <!-- 左侧拖拽把手 -->
      <div
        class="block-handle"
        @mousedown="startDrag(index, $event)"
        title="拖拽排序"
      >
        <span class="handle-icon">⋮⋮</span>
      </div>

      <!-- 块内容 -->
      <div class="block-content">
        <!-- 标题块 -->
        <div v-if="block.type === 'heading'" class="block-heading">
          <input
            v-model="block.content"
            :placeholder="'标题' + block.level"
            :style="{ fontSize: (24 - (block.level || 1) * 4) + 'px', fontWeight: 'bold' }"
            class="heading-input"
            @input="updateContent"
          />
        </div>

        <!-- 正文块 -->
        <div v-else-if="block.type === 'paragraph'" class="block-paragraph">
          <textarea
            v-model="block.content"
            placeholder="输入正文内容... (按 / 打开命令菜单)"
            rows="3"
            class="paragraph-input"
            @input="updateContent"
            @keydown="handleKeyDown($event, index)"
          />
        </div>

        <!-- 图片块 -->
        <div v-else-if="block.type === 'image'" class="block-image">
          <div v-if="block.url" class="image-preview">
            <img :src="block.url" :alt="block.caption" />
            <el-input v-model="block.caption" placeholder="图片说明" class="caption-input" @input="updateContent" />
          </div>
          <div v-else class="image-upload">
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="(res: any) => handleImageSuccess(res, block)"
              accept="image/*"
            >
              <el-button size="small" type="primary">上传图片</el-button>
            </el-upload>
          </div>
        </div>

        <!-- 引用块 -->
        <div v-else-if="block.type === 'quote'" class="block-quote">
          <textarea
            v-model="block.content"
            placeholder="引用内容..."
            class="quote-input"
            @input="updateContent"
          />
        </div>

        <!-- 分割线块 -->
        <div v-else-if="block.type === 'divider'" class="block-divider">
          <hr />
        </div>

        <!-- 代码块 -->
        <div v-else-if="block.type === 'code'" class="block-code">
          <textarea
            v-model="block.content"
            placeholder="代码内容..."
            class="code-input"
            rows="5"
            @input="updateContent"
          />
        </div>
      </div>

      <!-- 右侧操作菜单 -->
      <div class="block-menu" v-show="activeBlock === block.id">
        <el-dropdown trigger="click" @command="(cmd: string) => handleBlockCommand(cmd, index)">
          <el-button size="small" circle class="menu-btn add-btn">
            +
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="add-heading">
                <span class="menu-icon">H1</span> 标题
              </el-dropdown-item>
              <el-dropdown-item command="add-paragraph">
                <span class="menu-icon">P</span> 正文
              </el-dropdown-item>
              <el-dropdown-item command="add-image">
                <span class="menu-icon">🖼</span> 图片
              </el-dropdown-item>
              <el-dropdown-item command="add-quote">
                <span class="menu-icon">"</span> 引用
              </el-dropdown-item>
              <el-dropdown-item command="add-divider">
                <span class="menu-icon">—</span> 分割线
              </el-dropdown-item>
              <el-dropdown-item command="add-code">
                <span class="menu-icon">&lt;/&gt;</span> 代码块
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-dropdown trigger="click" @command="(cmd: string) => handleBlockCommand(cmd, index)">
          <el-button size="small" circle class="menu-btn settings-btn">
            ⚙
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="change-type">
                转换类型
              </el-dropdown-item>
              <el-dropdown-item command="duplicate">
                复制块
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                删除块
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 添加新块按钮 -->
    <div class="add-block-btn" @click="addBlock('paragraph')">
      <span class="add-icon">+</span> 添加新段落
    </div>

    <!-- 拖拽占位符 -->
    <div
      v-if="dragIndex !== null && dropIndex !== null"
      class="drop-indicator"
      :style="{ top: dropIndicatorTop + 'px' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { Block } from './types'

// Props
const props = defineProps<{
  modelValue: Block[]
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [blocks: Block[]]
  'block-change': [block: Block]
}>()

const authStore = useAuthStore()
const editorRef = ref<HTMLElement | null>(null)
const activeBlock = ref<string | null>(null)
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const dropIndicatorTop = ref(0)

// 上传配置
const uploadUrl = '/api/file/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`
}))

// 块列表
const blocks = reactive<Block[]>(props.modelValue || [])

// 生成唯一ID
const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 激活块
const activateBlock = (id: string) => {
  activeBlock.value = id
}

// 更新内容
const updateContent = () => {
  emit('update:modelValue', [...blocks])
}

// 添加块
const addBlock = (type: Block['type'], afterIndex?: number) => {
  const newBlock: Block = {
    id: generateId(),
    type,
    content: '',
    level: type === 'heading' ? 1 : undefined,
  }

  if (afterIndex !== undefined) {
    blocks.splice(afterIndex + 1, 0, newBlock)
  } else {
    blocks.push(newBlock)
  }

  activeBlock.value = newBlock.id
  updateContent()

  nextTick(() => {
    // 聚焦到新块
    const blockEl = editorRef.value?.querySelector(`[data-id="${newBlock.id}"]`)
    const input = blockEl?.querySelector('input, textarea') as HTMLElement
    input?.focus()
  })
}

// 删除块
const deleteBlock = (index: number) => {
  if (blocks.length > 1) {
    blocks.splice(index, 1)
    updateContent()
  }
}

// 复制块
const duplicateBlock = (index: number) => {
  const block = blocks[index]
  const newBlock: Block = {
    ...JSON.parse(JSON.stringify(block)),
    id: generateId(),
  }
  blocks.splice(index + 1, 0, newBlock)
  updateContent()
}

// 转换块类型
const changeBlockType = (index: number) => {
  const block = blocks[index]
  const types: Block['type'][] = ['heading', 'paragraph', 'quote', 'code']
  const currentIndex = types.indexOf(block.type)
  const nextType = types[(currentIndex + 1) % types.length]

  block.type = nextType
  if (nextType === 'heading') {
    block.level = 1
  }
  updateContent()
}

// 处理块命令
const handleBlockCommand = (command: string, index: number) => {
  switch (command) {
    case 'add-heading':
      addBlock('heading', index)
      break
    case 'add-paragraph':
      addBlock('paragraph', index)
      break
    case 'add-image':
      addBlock('image', index)
      break
    case 'add-quote':
      addBlock('quote', index)
      break
    case 'add-divider':
      addBlock('divider', index)
      break
    case 'add-code':
      addBlock('code', index)
      break
    case 'change-type':
      changeBlockType(index)
      break
    case 'duplicate':
      duplicateBlock(index)
      break
    case 'delete':
      deleteBlock(index)
      break
  }
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent, index: number) => {
  // 检测斜杠命令
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    // 触发斜杠命令菜单
    emit('block-change', { type: 'slash-command', index })
  }
}

// 图片上传成功
const handleImageSuccess = (response: any, block: Block) => {
  if (response.url) {
    block.url = response.url
    updateContent()
  }
}

// 拖拽开始
const startDrag = (index: number, e: MouseEvent) => {
  e.preventDefault()
  dragIndex.value = index

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', endDrag)
}

// 拖拽中
const handleDrag = (e: MouseEvent) => {
  if (dragIndex.value === null) return

  const blockItems = editorRef.value?.querySelectorAll('.block-item')
  if (!blockItems) return

  let newDropIndex = dragIndex.value
  let minDistance = Infinity

  blockItems.forEach((item, idx) => {
    const rect = item.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    const distance = Math.abs(e.clientY - centerY)

    if (distance < minDistance) {
      minDistance = distance
      newDropIndex = idx
      dropIndicatorTop.value = e.clientY < centerY ? rect.top : rect.bottom
    }
  })

  dropIndex.value = newDropIndex
}

// 拖拽结束
const endDrag = () => {
  if (dragIndex.value !== null && dropIndex.value !== null && dragIndex.value !== dropIndex.value) {
    const [movedBlock] = blocks.splice(dragIndex.value, 1)
    blocks.splice(dropIndex.value, 0, movedBlock)
    updateContent()
  }

  dragIndex.value = null
  dropIndex.value = null

  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', endDrag)
}

// 暴露方法
defineExpose({
  addBlock,
  deleteBlock,
  getBlocks: () => [...blocks],
})
</script>

<style scoped>
.block-editor {
  position: relative;
  min-height: 200px;
}

.block-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.block-item:hover {
  background: #f5f7fa;
}

.block-item.active {
  background: #ecf5ff;
  border: 1px solid #409eff;
}

.block-item.dragging {
  opacity: 0.5;
}

.block-handle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: #c0c4cc;
  user-select: none;
  flex-shrink: 0;
  margin-right: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.block-handle:hover {
  color: #409eff;
  background: #ecf5ff;
}

.handle-icon {
  font-size: 14px;
  letter-spacing: -2px;
}

.block-content {
  flex: 1;
  min-width: 0;
}

.block-heading .heading-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 4px 0;
  color: #303133;
}

.block-paragraph .paragraph-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 4px 0;
  resize: vertical;
  min-height: 60px;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
}

.block-image .image-preview {
  width: 100%;
}

.block-image img {
  max-width: 100%;
  border-radius: 4px;
  margin-bottom: 8px;
}

.block-image .caption-input {
  margin-top: 8px;
}

.block-image .image-upload {
  padding: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  text-align: center;
}

.block-quote {
  border-left: 4px solid #409eff;
  padding-left: 16px;
  margin: 8px 0;
}

.block-quote .quote-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 4px 0;
  resize: vertical;
  min-height: 40px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  font-style: italic;
}

.block-divider {
  padding: 8px 0;
}

.block-divider hr {
  border: none;
  border-top: 1px solid #dcdfe6;
  margin: 0;
}

.block-code .code-input {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 8px 12px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #f5f7fa;
  resize: vertical;
}

.block-menu {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.block-item.active .block-menu,
.block-item:hover .block-menu {
  opacity: 1;
}

.menu-btn {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
}

.add-btn:hover {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.settings-btn:hover {
  background: #909399;
  color: white;
  border-color: #909399;
}

.menu-icon {
  display: inline-block;
  width: 24px;
  font-weight: bold;
  color: #409eff;
}

.add-block-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  margin-top: 8px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  color: #909399;
  cursor: pointer;
  transition: all 0.2s;
}

.add-block-btn:hover {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.add-icon {
  font-size: 18px;
  margin-right: 4px;
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #409eff;
  pointer-events: none;
  z-index: 100;
}
</style>