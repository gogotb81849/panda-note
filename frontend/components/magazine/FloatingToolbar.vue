<template>
  <!-- 选中文本后悬浮显示 -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-show="visible"
        class="floating-toolbar"
        :style="toolbarStyle"
        @mousedown.stop
      >
        <!-- 字体选择 -->
        <el-select
          v-model="currentFont"
          size="small"
          placeholder="字体"
          style="width: 120px"
          @change="applyFont"
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
        <el-select
          v-model="currentSize"
          size="small"
          placeholder="字号"
          style="width: 80px"
          @change="applySize"
        >
          <el-option
            v-for="size in sizeList"
            :key="size"
            :label="size + 'pt'"
            :value="size"
          />
        </el-select>

        <el-divider direction="vertical" />

        <!-- 快捷样式按钮 -->
        <el-button-group>
          <el-button
            size="small"
            :type="isBold ? 'primary' : 'default'"
            @click="toggleBold"
            title="加粗 (Ctrl+B)"
          >
            <strong>B</strong>
          </el-button>
          <el-button
            size="small"
            :type="isItalic ? 'primary' : 'default'"
            @click="toggleItalic"
            title="斜体 (Ctrl+I)"
          >
            <em>I</em>
          </el-button>
          <el-button
            size="small"
            :type="isUnderline ? 'primary' : 'default'"
            @click="toggleUnderline"
            title="下划线 (Ctrl+U)"
          >
            <span style="text-decoration: underline">U</span>
          </el-button>
          <el-button
            size="small"
            :type="isStrike ? 'primary' : 'default'"
            @click="toggleStrike"
            title="删除线"
          >
            <span style="text-decoration: line-through">S</span>
          </el-button>
        </el-button-group>

        <el-divider direction="vertical" />

        <!-- 颜色选择 -->
        <el-tooltip content="文字颜色" placement="top">
          <el-color-picker
            v-model="currentColor"
            size="small"
            :predefine="textColors"
            @change="applyColor"
          />
        </el-tooltip>

        <!-- 背景高亮 -->
        <el-tooltip content="背景高亮" placement="top">
          <el-color-picker
            v-model="currentHighlight"
            size="small"
            :predefine="highlightColors"
            @change="applyHighlight"
          />
        </el-tooltip>

        <el-divider direction="vertical" />

        <!-- AI优化按钮 -->
        <el-button
          size="small"
          type="success"
          @click="showAIOptions"
          title="AI优化"
        >
          🤖 AI
        </el-button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  visible?: boolean
  position?: { x: number; y: number }
  selectedText?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  position: () => ({ x: 0, y: 0 }),
  selectedText: '',
})

const emit = defineEmits<{
  (e: 'apply-format', format: FormatOptions): void
  (e: 'ai-optimize', text: string): void
  (e: 'close'): void
}>()

interface FormatOptions {
  font?: string
  size?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
  highlight?: string
}

// 字体列表（对标Word）
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

// 字号列表（对标Word）
const sizeList = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]

// 文字颜色预设
const textColors = [
  '#000000', '#333333', '#666666', '#999999',
  '#FF0000', '#FF6600', '#FFCC00', '#00CC00',
  '#0066FF', '#9900FF', '#FF00FF', '#00CCCC',
]

// 高亮颜色预设
const highlightColors = [
  '#FFFF00', // 黄色
  '#00FF00', // 绿色
  '#FF0000', // 红色
  '#00BFFF', // 蓝色
  '#FFA500', // 橙色
  '#FF69B4', // 粉色
  '#FFFFFF', // 白色（清除高亮）
]

// 当前状态
const currentFont = ref('SimSun')
const currentSize = ref(12)
const isBold = ref(false)
const isItalic = ref(false)
const isUnderline = ref(false)
const isStrike = ref(false)
const currentColor = ref('#000000')
const currentHighlight = ref('')

// 计算工具栏位置
const toolbarStyle = computed(() => {
  const { x, y } = props.position
  return {
    top: `${y}px`,
    left: `${x}px`,
    transform: 'translate(-50%, -100%)',
  }
})

// 应用字体
const applyFont = (font: string) => {
  emit('apply-format', { font })
}

// 应用字号
const applySize = (size: number) => {
  emit('apply-format', { size })
}

// 切换加粗
const toggleBold = () => {
  isBold.value = !isBold.value
  emit('apply-format', { bold: isBold.value })
}

// 切换斜体
const toggleItalic = () => {
  isItalic.value = !isItalic.value
  emit('apply-format', { italic: isItalic.value })
}

// 切换下划线
const toggleUnderline = () => {
  isUnderline.value = !isUnderline.value
  emit('apply-format', { underline: isUnderline.value })
}

// 切换删除线
const toggleStrike = () => {
  isStrike.value = !isStrike.value
  emit('apply-format', { strike: isStrike.value })
}

// 应用文字颜色
const applyColor = (color: string) => {
  emit('apply-format', { color })
}

// 应用背景高亮
const applyHighlight = (color: string) => {
  emit('apply-format', { highlight: color })
}

// 显示AI优化选项
const showAIOptions = () => {
  emit('ai-optimize', props.selectedText)
}

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.floating-toolbar')) {
    emit('close')
  }
}

// 监听可见性
watch(() => props.visible, (visible) => {
  if (visible) {
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

// 暴露方法供父组件调用
defineExpose({
  reset: () => {
    currentFont.value = 'SimSun'
    currentSize.value = 12
    isBold.value = false
    isItalic.value = false
    isUnderline.value = false
    isStrike.value = false
    currentColor.value = '#000000'
    currentHighlight.value = ''
  },
})
</script>

<style scoped>
.floating-toolbar {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 12px;
  z-index: 9999;
  display: flex;
  gap: 8px;
  align-items: center;
  border: 1px solid #e4e7ed;
}

.floating-toolbar::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid white;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -110%);
}

/* Element Plus 样式覆盖 */
:deep(.el-select) {
  margin-right: 4px;
}

:deep(.el-button-group .el-button) {
  padding: 8px 12px;
}

:deep(.el-divider--vertical) {
  height: 20px;
  margin: 0 4px;
}

:deep(.el-color-picker) {
  margin: 0 4px;
}
</style>