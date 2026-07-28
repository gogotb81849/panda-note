<template>
  <div class="editor-toolbar">
    <!-- 左侧：预设样式和字体 -->
    <div class="toolbar-section">
      <!-- 预设样式 -->
      <el-select
        v-model="presetStyle"
        size="small"
        placeholder="预设样式"
        style="width: 100px"
        @change="applyPresetStyle"
      >
        <el-option label="标题1" value="h1">
          <span style="font-size: 20px; font-weight: bold;">标题1</span>
        </el-option>
        <el-option label="标题2" value="h2">
          <span style="font-size: 16px; font-weight: bold;">标题2</span>
        </el-option>
        <el-option label="标题3" value="h3">
          <span style="font-size: 14px; font-weight: bold;">标题3</span>
        </el-option>
        <el-option label="正文" value="p">
          <span>正文</span>
        </el-option>
        <el-option label="引用" value="quote">
          <span style="font-style: italic; color: #666;">引用</span>
        </el-option>
      </el-select>

      <el-divider direction="vertical" />

      <!-- 字体选择 -->
      <el-select
        v-model="fontFamily"
        size="small"
        placeholder="字体"
        style="width: 120px"
        @change="handleFontChange"
      >
        <el-option
          v-for="font in fontList"
          :key="font.value"
          :label="font.label"
          :value="font.value"
          :style="{ fontFamily: font.value }"
        />
      </el-select>

      <!-- 字号选择 -->
      <el-input-number
        v-model="fontSize"
        :min="8"
        :max="72"
        size="small"
        style="width: 90px"
        @change="handleSizeChange"
      />
    </div>

    <!-- 中间：格式按钮 -->
    <div class="toolbar-section">
      <el-button-group>
        <el-tooltip content="加粗 (Ctrl+B)" placement="bottom">
          <el-button
            size="small"
            :type="isBold ? 'primary' : 'default'"
            @click="format('bold')"
          >
            <strong>B</strong>
          </el-button>
        </el-tooltip>
        <el-tooltip content="斜体 (Ctrl+I)" placement="bottom">
          <el-button
            size="small"
            :type="isItalic ? 'primary' : 'default'"
            @click="format('italic')"
          >
            <em>I</em>
          </el-button>
        </el-tooltip>
        <el-tooltip content="下划线 (Ctrl+U)" placement="bottom">
          <el-button
            size="small"
            :type="isUnderline ? 'primary' : 'default'"
            @click="format('underline')"
          >
            <span style="text-decoration: underline">U</span>
          </el-button>
        </el-tooltip>
        <el-tooltip content="删除线" placement="bottom">
          <el-button
            size="small"
            :type="isStrike ? 'primary' : 'default'"
            @click="format('strike')"
          >
            <span style="text-decoration: line-through">S</span>
          </el-button>
        </el-tooltip>
      </el-button-group>

      <el-divider direction="vertical" />

      <!-- 对齐按钮 -->
      <el-button-group>
        <el-tooltip content="左对齐" placement="bottom">
          <el-button
            size="small"
            :type="align === 'left' ? 'primary' : 'default'"
            @click="format('align-left')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z"/>
            </svg>
          </el-button>
        </el-tooltip>
        <el-tooltip content="居中" placement="bottom">
          <el-button
            size="small"
            :type="align === 'center' ? 'primary' : 'default'"
            @click="format('align-center')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M3 3h18v2H3V3zm3 4h12v2H6V7zm-3 4h18v2H3v-2zm3 4h12v2H6v-2zm-3 4h18v2H3v-2z"/>
            </svg>
          </el-button>
        </el-tooltip>
        <el-tooltip content="右对齐" placement="bottom">
          <el-button
            size="small"
            :type="align === 'right' ? 'primary' : 'default'"
            @click="format('align-right')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M3 3h18v2H3V3zm6 4h12v2H9V7zm-6 4h18v2H3v-2zm6 4h12v2H9v-2zm-6 4h18v2H3v-2z"/>
            </svg>
          </el-button>
        </el-tooltip>
      </el-button-group>

      <el-divider direction="vertical" />

      <!-- 列表按钮 -->
      <el-button-group>
        <el-tooltip content="无序列表" placement="bottom">
          <el-button
            size="small"
            :type="listType === 'ul' ? 'primary' : 'default'"
            @click="format('ul')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
            </svg>
          </el-button>
        </el-tooltip>
        <el-tooltip content="有序列表" placement="bottom">
          <el-button
            size="small"
            :type="listType === 'ol' ? 'primary' : 'default'"
            @click="format('ol')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
            </svg>
          </el-button>
        </el-tooltip>
      </el-button-group>
    </div>

    <!-- 右侧：颜色和AI -->
    <div class="toolbar-section">
      <el-tooltip content="文字颜色" placement="bottom">
        <el-color-picker
          v-model="textColor"
          size="small"
          :predefine="textColors"
          @change="handleColorChange"
        />
      </el-tooltip>

      <el-tooltip content="背景颜色" placement="bottom">
        <el-color-picker
          v-model="bgColor"
          size="small"
          :predefine="bgColors"
          @change="handleBgColorChange"
        />
      </el-tooltip>

      <el-divider direction="vertical" />

      <!-- 清除格式 -->
      <el-tooltip content="清除格式" placement="bottom">
        <el-button size="small" @click="format('clear')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21l1.27-1.27L3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/>
          </svg>
        </el-button>
      </el-tooltip>

      <el-divider direction="vertical" />

      <!-- AI优化按钮 -->
      <el-button type="success" size="small" @click="showAIPanel">
        🤖 AI优化
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  currentFormat?: {
    font?: string
    size?: number
    bold?: boolean
    italic?: boolean
    underline?: boolean
    strike?: boolean
    color?: string
    bgColor?: string
    align?: 'left' | 'center' | 'right'
    listType?: 'ul' | 'ol' | null
  }
}

const props = withDefaults(defineProps<Props>(), {
  currentFormat: () => ({}),
})

const emit = defineEmits<{
  (e: 'format', type: string): void
  (e: 'font-change', font: string): void
  (e: 'size-change', size: number): void
  (e: 'color-change', color: string): void
  (e: 'bg-color-change', color: string): void
  (e: 'preset-style', style: string): void
  (e: 'ai-optimize'): void
}>()

// 字体列表
const fontList = [
  { value: 'SimSun', label: '宋体' },
  { value: 'SimHei', label: '黑体' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'FangSong', label: '仿宋' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
]

// 文字颜色预设
const textColors = [
  '#000000', '#333333', '#666666', '#999999',
  '#FF0000', '#FF6600', '#FFCC00', '#00CC00',
  '#0066FF', '#9900FF', '#FF00FF', '#00CCCC',
]

// 背景颜色预设
const bgColors = [
  '#FFFFFF', '#FFFF00', '#00FF00', '#FF0000',
  '#00BFFF', '#FFA500', '#FF69B4', '#E6E6E6',
]

// 当前状态
const presetStyle = ref('p')
const fontFamily = ref('SimSun')
const fontSize = ref(12)
const isBold = ref(false)
const isItalic = ref(false)
const isUnderline = ref(false)
const isStrike = ref(false)
const textColor = ref('#000000')
const bgColor = ref('#FFFFFF')
const align = ref<'left' | 'center' | 'right'>('left')
const listType = ref<'ul' | 'ol' | null>(null)

// 监听外部格式变化
watch(() => props.currentFormat, (newFormat) => {
  if (newFormat) {
    fontFamily.value = newFormat.font || 'SimSun'
    fontSize.value = newFormat.size || 12
    isBold.value = newFormat.bold || false
    isItalic.value = newFormat.italic || false
    isUnderline.value = newFormat.underline || false
    isStrike.value = newFormat.strike || false
    textColor.value = newFormat.color || '#000000'
    bgColor.value = newFormat.bgColor || '#FFFFFF'
    align.value = newFormat.align || 'left'
    listType.value = newFormat.listType || null
  }
}, { immediate: true })

// 应用格式
const format = (type: string) => {
  switch (type) {
    case 'bold':
      isBold.value = !isBold.value
      break
    case 'italic':
      isItalic.value = !isItalic.value
      break
    case 'underline':
      isUnderline.value = !isUnderline.value
      break
    case 'strike':
      isStrike.value = !isStrike.value
      break
    case 'align-left':
      align.value = 'left'
      break
    case 'align-center':
      align.value = 'center'
      break
    case 'align-right':
      align.value = 'right'
      break
    case 'ul':
      listType.value = listType.value === 'ul' ? null : 'ul'
      break
    case 'ol':
      listType.value = listType.value === 'ol' ? null : 'ol'
      break
  }
  emit('format', type)
}

// 应用预设样式
const applyPresetStyle = (style: string) => {
  emit('preset-style', style)
  // 根据预设样式更新字号
  switch (style) {
    case 'h1':
      fontSize.value = 24
      isBold.value = true
      break
    case 'h2':
      fontSize.value = 18
      isBold.value = true
      break
    case 'h3':
      fontSize.value = 14
      isBold.value = true
      break
    case 'p':
      fontSize.value = 12
      isBold.value = false
      break
    case 'quote':
      fontSize.value = 12
      isItalic.value = true
      textColor.value = '#666666'
      break
  }
}

// 处理字体变化
const handleFontChange = (font: string) => {
  emit('font-change', font)
}

// 处理字号变化
const handleSizeChange = (size: number | undefined) => {
  if (size) {
    emit('size-change', size)
  }
}

// 处理文字颜色变化
const handleColorChange = (color: string) => {
  emit('color-change', color)
}

// 处理背景颜色变化
const handleBgColorChange = (color: string) => {
  emit('bg-color-change', color)
}

// 显示AI面板
const showAIPanel = () => {
  emit('ai-optimize')
}

// 暴露方法
defineExpose({
  getCurrentFormat: () => ({
    font: fontFamily.value,
    size: fontSize.value,
    bold: isBold.value,
    italic: isItalic.value,
    underline: isUnderline.value,
    strike: isStrike.value,
    color: textColor.value,
    bgColor: bgColor.value,
    align: align.value,
    listType: listType.value,
  }),
  reset: () => {
    presetStyle.value = 'p'
    fontFamily.value = 'SimSun'
    fontSize.value = 12
    isBold.value = false
    isItalic.value = false
    isUnderline.value = false
    isStrike.value = false
    textColor.value = '#000000'
    bgColor.value = '#FFFFFF'
    align.value = 'left'
    listType.value = null
  },
})
</script>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-section:first-child {
  flex: 1;
}

.toolbar-section:last-child {
  justify-content: flex-end;
}

:deep(.el-divider--vertical) {
  height: 20px;
  margin: 0 8px;
}

:deep(.el-button-group .el-button) {
  padding: 8px 10px;
}

:deep(.el-input-number) {
  margin-left: 4px;
}

:deep(.el-color-picker) {
  margin: 0 4px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-section {
    justify-content: center;
    flex-wrap: wrap;
  }

  .toolbar-section:first-child {
    flex: none;
  }
}
</style>