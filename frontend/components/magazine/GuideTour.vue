<template>
  <div class="guide-tour" v-if="active">
    <!-- 高亮遮罩 -->
    <div class="guide-overlay" @click="handleOverlayClick"></div>

    <!-- 高亮目标区域 -->
    <div
      v-if="currentTarget"
      class="guide-highlight"
      :style="highlightStyle"
    ></div>

    <!-- 提示卡片 -->
    <div
      class="guide-card"
      :style="cardStyle"
      ref="cardRef"
    >
      <!-- 进度指示器 -->
      <div class="guide-progress">
        <div class="progress-dots">
          <span
            v-for="(_, index) in steps"
            :key="index"
            class="progress-dot"
            :class="{ active: index === currentStep, completed: index < currentStep }"
          ></span>
        </div>
        <span class="progress-text">{{ currentStep + 1 }} / {{ steps.length }}</span>
      </div>

      <!-- 步骤标题 -->
      <div class="guide-title">
        <span class="guide-icon" v-if="currentStepData.icon">{{ currentStepData.icon }}</span>
        {{ currentStepData.title }}
      </div>

      <!-- 步骤内容 -->
      <div class="guide-content">{{ currentStepData.content }}</div>

      <!-- 操作提示 -->
      <div class="guide-hint" v-if="currentStepData.hint">
        <el-icon><InfoFilled /></el-icon>
        {{ currentStepData.hint }}
      </div>

      <!-- 操作按钮 -->
      <div class="guide-actions">
        <el-button @click="skipGuide" text>
          跳过引导
        </el-button>
        <div class="action-group">
          <el-button v-if="currentStep > 0" @click="prevStep">
            上一步
          </el-button>
          <el-button
            v-if="currentStep < steps.length - 1"
            type="primary"
            @click="nextStep"
          >
            下一步
          </el-button>
          <el-button
            v-else
            type="success"
            @click="finishGuide"
          >
            开始使用
          </el-button>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <el-button
        class="close-btn"
        circle
        size="small"
        @click="skipGuide"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <!-- 斑点动画 -->
    <div class="guide-spotlight" :style="spotlightStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Close, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { GuideStep } from './types'

// Props
const props = defineProps<{
  steps: GuideStep[]
  storageKey?: string
  autoStart?: boolean
}>()

// Emits
const emit = defineEmits<{
  'complete': []
  'skip': []
  'step-change': [step: number]
}>()

const active = ref(false)
const currentStep = ref(0)
const cardRef = ref<HTMLElement | null>(null)
const currentTarget = ref<HTMLElement | null>(null)

// 默认步骤
const defaultSteps: GuideStep[] = [
  {
    target: '.editor-toolbar',
    title: '编辑工具栏',
    content: '这里可以调整字体、字号、颜色等样式。选中文字后工具栏会自动激活。',
    position: 'bottom',
    icon: '✏️',
    hint: '提示：选中文本后工具栏会自动出现',
  },
  {
    target: '.block-editor',
    title: '块编辑器',
    content: '文章由多个"块"组成，每个块可以是标题、正文、图片等。点击左侧把手可以拖拽排序。',
    position: 'right',
    icon: '📝',
    hint: '试试拖拽块来重新排序',
  },
  {
    target: '.ai-optimize-btn',
    title: 'AI智能优化',
    content: '选中文字后点击AI按钮，可以自动润色、扩写、缩写或纠错。',
    position: 'bottom',
    icon: '✨',
  },
  {
    target: '.preview-panel',
    title: '实时预览',
    content: '右侧面板实时显示杂志效果，编辑内容会立即反映在预览中。',
    position: 'left',
    icon: '👁️',
  },
  {
    target: '.version-history-btn',
    title: '版本历史',
    content: '点击这里可以查看所有历史版本，随时恢复到之前的版本。',
    position: 'bottom',
    icon: '📚',
  },
]

// 使用传入的步骤或默认步骤
const steps = computed(() => props.steps.length > 0 ? props.steps : defaultSteps)

// 当前步骤数据
const currentStepData = computed(() => steps.value[currentStep.value])

// 高亮样式
const highlightStyle = computed(() => {
  if (!currentTarget.value) return {}

  const rect = currentTarget.value.getBoundingClientRect()
  return {
    top: `${rect.top - 4}px`,
    left: `${rect.left - 4}px`,
    width: `${rect.width + 8}px`,
    height: `${rect.height + 8}px`,
  }
})

// 卡片位置样式
const cardStyle = computed(() => {
  if (!currentTarget.value) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  const rect = currentTarget.value.getBoundingClientRect()
  const cardWidth = 360
  const cardHeight = 200
  const margin = 20

  let top = 0
  let left = 0

  switch (currentStepData.value.position) {
    case 'top':
      top = rect.top - cardHeight - margin
      left = rect.left + rect.width / 2 - cardWidth / 2
      break
    case 'bottom':
      top = rect.bottom + margin
      left = rect.left + rect.width / 2 - cardWidth / 2
      break
    case 'left':
      top = rect.top + rect.height / 2 - cardHeight / 2
      left = rect.left - cardWidth - margin
      break
    case 'right':
      top = rect.top + rect.height / 2 - cardHeight / 2
      left = rect.right + margin
      break
  }

  // 边界检查
  top = Math.max(margin, Math.min(top, window.innerHeight - cardHeight - margin))
  left = Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin))

  return {
    top: `${top}px`,
    left: `${left}px`,
  }
})

// 聚光灯样式
const spotlightStyle = computed(() => {
  if (!currentTarget.value) return {}

  const rect = currentTarget.value.getBoundingClientRect()
  return {
    top: `${rect.top - 4}px`,
    left: `${rect.left - 4}px`,
    width: `${rect.width + 8}px`,
    height: `${rect.height + 8}px`,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
  }
})

// 更新目标元素
const updateTarget = () => {
  const selector = currentStepData.value.target
  currentTarget.value = document.querySelector(selector)

  if (!currentTarget.value) {
    console.warn(`Guide target not found: ${selector}`)
  }
}

// 下一步
const nextStep = () => {
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
    emit('step-change', currentStep.value)
    nextTick(updateTarget)
  }
}

// 上一步
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
    emit('step-change', currentStep.value)
    nextTick(updateTarget)
  }
}

// 跳过引导
const skipGuide = () => {
  const key = props.storageKey || 'magazine_guide_seen'
  localStorage.setItem(key, 'true')
  active.value = false
  emit('skip')
  ElMessage.info('可以随时通过帮助菜单重新查看引导')
}

// 完成引导
const finishGuide = () => {
  const key = props.storageKey || 'magazine_guide_seen'
  localStorage.setItem(key, 'true')
  active.value = false
  emit('complete')
  ElMessage.success('引导完成，开始创作吧！')
}

// 点击遮罩
const handleOverlayClick = () => {
  // 可选：点击遮罩时不关闭，引导用户完成
}

// 开始引导
const startGuide = () => {
  const key = props.storageKey || 'magazine_guide_seen'
  const hasSeenGuide = localStorage.getItem(key)

  if (!hasSeenGuide && props.autoStart !== false) {
    active.value = true
    nextTick(updateTarget)
  }
}

// 重置引导（用于重新查看）
const resetGuide = () => {
  const key = props.storageKey || 'magazine_guide_seen'
  localStorage.removeItem(key)
  currentStep.value = 0
  active.value = true
  nextTick(updateTarget)
}

// 监听步骤变化
watch(currentStep, () => {
  nextTick(updateTarget)
})

// 监听窗口大小变化
onMounted(() => {
  startGuide()
  window.addEventListener('resize', updateTarget)
})

// 暴露方法
defineExpose({
  startGuide,
  resetGuide,
  nextStep,
  prevStep,
  skipGuide,
})
</script>

<style scoped>
.guide-tour {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  z-index: 1;
}

.guide-highlight {
  position: absolute;
  border: 2px solid #409eff;
  border-radius: 4px;
  z-index: 2;
  pointer-events: none;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(64, 158, 255, 0);
  }
}

.guide-spotlight {
  position: absolute;
  border-radius: 4px;
  z-index: 2;
  pointer-events: none;
}

.guide-card {
  position: absolute;
  background: white;
  border-radius: 12px;
  padding: 20px;
  width: 360px;
  z-index: 3;
  pointer-events: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.guide-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.progress-dots {
  display: flex;
  gap: 6px;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdfe6;
  transition: all 0.3s;
}

.progress-dot.active {
  background: #409eff;
  transform: scale(1.2);
}

.progress-dot.completed {
  background: #67c23a;
}

.progress-text {
  font-size: 12px;
  color: #909399;
}

.guide-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.guide-icon {
  font-size: 20px;
}

.guide-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 16px;
}

.guide-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #409eff;
  margin-bottom: 16px;
}

.guide-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.action-group {
  display: flex;
  gap: 8px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #909399;
}

.close-btn:hover {
  color: #606266;
}
</style>