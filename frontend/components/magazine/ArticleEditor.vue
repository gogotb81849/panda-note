<template>
  <div class="article-editor">
    <el-form :model="form" ref="formRef" label-width="80px">
      <!-- 导入选项 -->
      <el-form-item label="输入方式">
        <el-radio-group v-model="importType">
          <el-radio label="manual">手动输入</el-radio>
          <el-radio label="file">文件导入</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 文件导入区域 -->
      <div v-if="importType === 'file'" class="import-area">
        <el-upload
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :accept="'.docx,.doc,.md,.markdown,.txt'"
          :limit="1"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽文件到这里，或点击上传
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .docx, .md, .txt 格式
            </div>
          </template>
        </el-upload>
        
        <!-- 支持的格式说明 -->
        <div class="format-info">
          <h4>支持的文件格式：</h4>
          <ul>
            <li><strong>Word文档(.docx)</strong>：最完整的格式支持，保留排版</li>
            <li><strong>Markdown(.md)</strong>：技术文档首选</li>
            <li><strong>纯文本(.txt)</strong>：最简单的格式</li>
          </ul>
        </div>
      </div>

      <template v-if="importType === 'manual'">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入文章标题" />
        </el-form-item>

        <el-form-item label="作者">
          <el-input v-model="form.author" placeholder="请输入作者姓名" />
        </el-form-item>

        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="请输入文章摘要（可选）" />
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <!-- 固定工具栏 -->
          <EditorToolbar
            ref="toolbarRef"
            :current-format="currentFormat"
            @format="handleFormat"
            @font-change="handleFontChange"
            @size-change="handleSizeChange"
            @color-change="handleColorChange"
            @bg-color-change="handleBgColorChange"
            @preset-style="handlePresetStyle"
            @ai-optimize="showAIPanel"
          />
          
          <!-- 富文本编辑区域 -->
          <div 
            class="editor-content-wrapper"
            @mouseup="handleSelection"
            @keyup="handleSelection"
          >
            <div
              ref="editorRef"
              class="editor-content"
              contenteditable="true"
              :innerHTML="form.content"
              @input="handleInput"
              @keydown="handleKeydown"
              @paste="handlePaste"
            />
          </div>
        </el-form-item>

        <el-form-item label="图片">
          <div class="image-list">
            <div v-for="(img, index) in form.images" :key="index" class="image-item">
              <img :src="img" alt="图片" />
              <el-button class="remove-btn" size="small" @click="removeImage(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <el-upload
            :action="uploadUrl"
            :headers="{ Authorization: `Bearer ${token}` }"
            :show-file-list="false"
            :on-success="handleImageSuccess"
            accept="image/*"
          >
            <el-button size="small" type="primary">上传图片</el-button>
          </el-upload>
        </el-form-item>
      </template>
    </el-form>

    <!-- 悬浮工具栏 -->
    <FloatingToolbar
      ref="floatingToolbarRef"
      :visible="showFloatingToolbar"
      :position="floatingToolbarPosition"
      :selected-text="selectedText"
      @apply-format="applyFormatToSelection"
      @ai-optimize="handleAIOptimize"
      @close="closeFloatingToolbar"
    />

    <!-- AI优化面板 -->
    <el-dialog
      v-model="showAIDialog"
      title="AI优化"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="ai-optimize-panel">
        <div class="selected-text-preview">
          <h4>选中的文本：</h4>
          <div class="text-preview">{{ selectedText || '请先选中要优化的文本' }}</div>
        </div>
        
        <el-divider />
        
        <div class="ai-options">
          <h4>优化选项：</h4>
          <el-radio-group v-model="aiOption">
            <el-radio label="polish">润色文字</el-radio>
            <el-radio label="expand">扩展内容</el-radio>
            <el-radio label="summarize">精简摘要</el-radio>
            <el-radio label="translate">翻译润色</el-radio>
          </el-radio-group>
        </div>
        
        <div v-if="aiLoading" class="ai-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>AI正在处理...</span>
        </div>
        
        <div v-if="aiResult" class="ai-result">
          <h4>优化结果：</h4>
          <div class="result-text">{{ aiResult }}</div>
          <el-button type="primary" size="small" @click="applyAIResult">
            应用结果
          </el-button>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showAIDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          :loading="aiLoading"
          :disabled="!selectedText"
          @click="executeAIOptimize"
        >
          开始优化
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { Delete, UploadFilled, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import EditorToolbar from './EditorToolbar.vue'
import FloatingToolbar from './FloatingToolbar.vue'

const props = defineProps<{
  modelValue: {
    title: string
    content: string
    author?: string
    summary?: string
    images?: string[]
  }
}>()

const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const formRef = ref()
const toolbarRef = ref()
const floatingToolbarRef = ref()
const editorRef = ref<HTMLElement | null>(null)
const uploadUrl = '/api/file/upload'
const token = authStore.token
const importType = ref<'manual' | 'file'>('manual')

const form = reactive({
  title: props.modelValue.title || '',
  content: props.modelValue.content || '',
  author: props.modelValue.author || '',
  summary: props.modelValue.summary || '',
  images: props.modelValue.images || [],
})

// 悬浮工具栏状态
const showFloatingToolbar = ref(false)
const floatingToolbarPosition = ref({ x: 0, y: 0 })
const selectedText = ref('')
const selectionRange = ref<Range | null>(null)

// 当前格式状态
const currentFormat = ref({
  font: 'SimSun',
  size: 12,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  color: '#000000',
  bgColor: '#FFFFFF',
  align: 'left',
  listType: null,
})

// AI优化状态
const showAIDialog = ref(false)
const aiOption = ref('polish')
const aiLoading = ref(false)
const aiResult = ref('')

// 监听表单变化，向上传递
watch(form, () => {
  emit('update:modelValue', { ...form })
}, { deep: true })

// 处理输入
const handleInput = () => {
  if (editorRef.value) {
    form.content = editorRef.value.innerHTML
  }
}

// 处理粘贴
const handlePaste = (e: ClipboardEvent) => {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// 处理键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  // 快捷键支持
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault()
        handleFormat('bold')
        break
      case 'i':
        e.preventDefault()
        handleFormat('italic')
        break
      case 'u':
        e.preventDefault()
        handleFormat('underline')
        break
    }
  }
}

// 处理文本选中
const handleSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    closeFloatingToolbar()
    return
  }
  
  const text = selection.toString().trim()
  if (!text) {
    closeFloatingToolbar()
    return
  }
  
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  
  // 保存选区信息
  selectedText.value = text
  selectionRange.value = range.cloneRange()
  
  // 计算悬浮工具栏位置
  floatingToolbarPosition.value = {
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
  }
  
  showFloatingToolbar.value = true
  
  // 分析当前格式
  analyzeSelectionFormat(range)
}

// 分析选中文本的格式
const analyzeSelectionFormat = (range: Range) => {
  let container = range.commonAncestorContainer
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement as HTMLElement
  }
  
  const element = container as HTMLElement
  const computedStyle = window.getComputedStyle(element)
  
  currentFormat.value = {
    font: computedStyle.fontFamily.replace(/['"]/g, '').split(',')[0] || 'SimSun',
    size: parseInt(computedStyle.fontSize) || 12,
    bold: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 600,
    italic: computedStyle.fontStyle === 'italic',
    underline: computedStyle.textDecoration.includes('underline'),
    strike: computedStyle.textDecoration.includes('line-through'),
    color: computedStyle.color || '#000000',
    bgColor: computedStyle.backgroundColor || '#FFFFFF',
    align: computedStyle.textAlign as 'left' | 'center' | 'right' || 'left',
    listType: null,
  }
}

// 关闭悬浮工具栏
const closeFloatingToolbar = () => {
  showFloatingToolbar.value = false
  selectedText.value = ''
  selectionRange.value = null
  floatingToolbarRef.value?.reset()
}

// 应用格式到选中文本
const applyFormatToSelection = (format: any) => {
  if (!selectionRange.value) return
  
  const selection = window.getSelection()
  if (!selection) return
  
  // 重新应用保存的选区
  selection.removeAllRanges()
  selection.addRange(selectionRange.value)
  
  // 应用格式
  if (format.font) {
    document.execCommand('fontName', false, format.font)
  }
  if (format.size) {
    // 使用CSS方式设置字号
    const span = document.createElement('span')
    span.style.fontSize = `${format.size}pt`
    span.innerHTML = selectionRange.value.toString()
    selectionRange.value.deleteContents()
    selectionRange.value.insertNode(span)
  }
  if (format.bold) {
    document.execCommand('bold', false, null)
  }
  if (format.italic) {
    document.execCommand('italic', false, null)
  }
  if (format.underline) {
    document.execCommand('underline', false, null)
  }
  if (format.strike) {
    document.execCommand('strikeThrough', false, null)
  }
  if (format.color) {
    document.execCommand('foreColor', false, format.color)
  }
  if (format.highlight) {
    document.execCommand('hiliteColor', false, format.highlight)
  }
  
  // 更新内容
  if (editorRef.value) {
    form.content = editorRef.value.innerHTML
  }
  
  // 更新选区
  handleSelection()
}

// 处理工具栏格式命令
const handleFormat = (type: string) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    // 如果没有选区，直接设置格式状态
    updateFormatState(type)
    return
  }
  
  const range = selection.getRangeAt(0)
  const text = range.toString()
  
  if (!text) {
    updateFormatState(type)
    return
  }
  
  switch (type) {
    case 'bold':
      document.execCommand('bold', false, null)
      currentFormat.value.bold = !currentFormat.value.bold
      break
    case 'italic':
      document.execCommand('italic', false, null)
      currentFormat.value.italic = !currentFormat.value.italic
      break
    case 'underline':
      document.execCommand('underline', false, null)
      currentFormat.value.underline = !currentFormat.value.underline
      break
    case 'strike':
      document.execCommand('strikeThrough', false, null)
      currentFormat.value.strike = !currentFormat.value.strike
      break
    case 'align-left':
      document.execCommand('justifyLeft', false, null)
      currentFormat.value.align = 'left'
      break
    case 'align-center':
      document.execCommand('justifyCenter', false, null)
      currentFormat.value.align = 'center'
      break
    case 'align-right':
      document.execCommand('justifyRight', false, null)
      currentFormat.value.align = 'right'
      break
    case 'ul':
      document.execCommand('insertUnorderedList', false, null)
      currentFormat.value.listType = currentFormat.value.listType === 'ul' ? null : 'ul'
      break
    case 'ol':
      document.execCommand('insertOrderedList', false, null)
      currentFormat.value.listType = currentFormat.value.listType === 'ol' ? null : 'ol'
      break
    case 'clear':
      document.execCommand('removeFormat', false, null)
      toolbarRef.value?.reset()
      break
  }
  
  // 更新内容
  if (editorRef.value) {
    form.content = editorRef.value.innerHTML
  }
}

// 更新格式状态
const updateFormatState = (type: string) => {
  switch (type) {
    case 'bold':
      currentFormat.value.bold = !currentFormat.value.bold
      break
    case 'italic':
      currentFormat.value.italic = !currentFormat.value.italic
      break
    case 'underline':
      currentFormat.value.underline = !currentFormat.value.underline
      break
    case 'strike':
      currentFormat.value.strike = !currentFormat.value.strike
      break
  }
}

// 处理字体变化
const handleFontChange = (font: string) => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0 && selection.toString()) {
    document.execCommand('fontName', false, font)
    if (editorRef.value) {
      form.content = editorRef.value.innerHTML
    }
  }
  currentFormat.value.font = font
}

// 处理字号变化
const handleSizeChange = (size: number) => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0 && selection.toString()) {
    // 使用CSS方式设置字号
    const range = selection.getRangeAt(0)
    const span = document.createElement('span')
    span.style.fontSize = `${size}pt`
    span.innerHTML = range.toString()
    range.deleteContents()
    range.insertNode(span)
    if (editorRef.value) {
      form.content = editorRef.value.innerHTML
    }
  }
  currentFormat.value.size = size
}

// 处理文字颜色变化
const handleColorChange = (color: string) => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0 && selection.toString()) {
    document.execCommand('foreColor', false, color)
    if (editorRef.value) {
      form.content = editorRef.value.innerHTML
    }
  }
  currentFormat.value.color = color
}

// 处理背景颜色变化
const handleBgColorChange = (color: string) => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0 && selection.toString()) {
    document.execCommand('hiliteColor', false, color)
    if (editorRef.value) {
      form.content = editorRef.value.innerHTML
    }
  }
  currentFormat.value.bgColor = color
}

// 处理预设样式
const handlePresetStyle = (style: string) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  
  const range = selection.getRangeAt(0)
  const text = range.toString()
  
  if (!text) return
  
  // 先清除格式
  document.execCommand('removeFormat', false, null)
  
  // 应用预设样式
  const element = document.createElement(style === 'quote' ? 'blockquote' : style)
  element.innerHTML = text
  range.deleteContents()
  range.insertNode(element)
  
  if (editorRef.value) {
    form.content = editorRef.value.innerHTML
  }
}

// 显示AI面板
const showAIPanel = () => {
  showAIDialog.value = true
}

// 处理AI优化
const handleAIOptimize = (text: string) => {
  selectedText.value = text
  showAIDialog.value = true
}

// 执行AI优化
const executeAIOptimize = async () => {
  if (!selectedText.value) return
  
  aiLoading.value = true
  aiResult.value = ''
  
  try {
    // 这里应该调用实际的AI API
    // 模拟AI处理
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    switch (aiOption.value) {
      case 'polish':
        aiResult.value = `${selectedText.value}（已润色）`
        break
      case 'expand':
        aiResult.value = `${selectedText.value}，这是一个扩展后的版本，增加了更多细节和描述。`
        break
      case 'summarize':
        aiResult.value = selectedText.value.substring(0, 50) + '...'
        break
      case 'translate':
        aiResult.value = `[翻译润色] ${selectedText.value}`
        break
    }
    
    ElMessage.success('AI优化完成')
  } catch (error) {
    ElMessage.error('AI优化失败')
  } finally {
    aiLoading.value = false
  }
}

// 应用AI结果
const applyAIResult = () => {
  if (!aiResult.value || !selectionRange.value) return
  
  const selection = window.getSelection()
  if (!selection) return
  
  selection.removeAllRanges()
  selection.addRange(selectionRange.value)
  
  // 替换文本
  selectionRange.value.deleteContents()
  const textNode = document.createTextNode(aiResult.value)
  selectionRange.value.insertNode(textNode)
  
  if (editorRef.value) {
    form.content = editorRef.value.innerHTML
  }
  
  showAIDialog.value = false
  aiResult.value = ''
  closeFloatingToolbar()
}

// 处理文件选择
const handleFileChange = (uploadFile: any) => {
  const file = uploadFile.raw
  if (!file) return
  
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['docx', 'doc', 'md', 'markdown', 'txt'].includes(ext)) {
    ElMessage.error('不支持的文件格式')
    return
  }
  
  // 读取文件内容
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    emit('update:modelValue', { 
      ...form,
      file: {
        name: file.name,
        content: content,
        type: ext,
      }
    })
  }
  reader.readAsArrayBuffer(file)
}

const handleImageSuccess = (response: any) => {
  if (response.url) {
    form.images.push(response.url)
  }
}

const removeImage = (index: number) => {
  form.images.splice(index, 1)
}

// 初始化编辑器内容
onMounted(() => {
  if (editorRef.value && form.content) {
    editorRef.value.innerHTML = form.content
  }
})

defineExpose({
  validate: () => formRef.value?.validate(),
  getValue: () => ({ ...form }),
})
</script>

<style scoped>
.article-editor {
  padding: 16px;
}

.editor-content-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  min-height: 300px;
  background: white;
  overflow: auto;
}

.editor-content {
  padding: 16px;
  min-height: 280px;
  font-size: 12pt;
  line-height: 1.6;
  outline: none;
}

.editor-content:focus {
  outline: none;
}

.editor-content ::selection {
  background: #b3d7ff;
}

.editor-content h1 {
  font-size: 24pt;
  font-weight: bold;
  margin: 16px 0 8px;
}

.editor-content h2 {
  font-size: 18pt;
  font-weight: bold;
  margin: 14px 0 6px;
}

.editor-content h3 {
  font-size: 14pt;
  font-weight: bold;
  margin: 12px 0 4px;
}

.editor-content blockquote {
  margin: 16px 0;
  padding: 8px 16px;
  border-left: 4px solid #ddd;
  background: #f9f9f9;
  color: #666;
  font-style: italic;
}

.editor-content ul,
.editor-content ol {
  margin: 8px 0;
  padding-left: 24px;
}

.editor-content li {
  margin: 4px 0;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.image-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-item .remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 4px;
  min-height: auto;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
}

.import-area {
  margin-bottom: 20px;
}

.format-info {
  margin-top: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
}

.format-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.format-info ul {
  margin: 0;
  padding-left: 20px;
}

.format-info li {
  margin-bottom: 4px;
  color: #606266;
}

.el-icon--upload {
  font-size: 67px;
  color: #409eff;
  margin-bottom: 16px;
}

/* AI优化面板样式 */
.ai-optimize-panel {
  padding: 16px;
}

.selected-text-preview {
  margin-bottom: 16px;
}

.selected-text-preview h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.text-preview {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
  max-height: 100px;
  overflow: auto;
}

.ai-options {
  margin-bottom: 16px;
}

.ai-options h4 {
  margin: 0 0 12px;
  font-size: 14px;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #409eff;
}

.ai-result {
  margin-top: 16px;
}

.ai-result h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.result-text {
  padding: 12px;
  background: #e8f5e9;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
}
</style>