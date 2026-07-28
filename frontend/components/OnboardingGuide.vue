<template>
  <div v-if="visible" class="onboarding-overlay" @click.self="handleOverlayClick">
    <div class="onboarding-container" :style="{ maxWidth: currentStep?.width || '600px' }">
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="closeGuide" title="关闭">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- 进度条 -->
      <div class="onboarding-progress">
        <div v-for="(step, idx) in steps" :key="idx" class="progress-dot" :class="{ active: idx === currentStepIndex, completed: idx < currentStepIndex }">
          <span v-if="idx < currentStepIndex" class="check-icon">✓</span>
          <span v-else-if="idx === currentStepIndex" class="step-number">{{ idx + 1 }}</span>
          <span v-else class="step-number">{{ idx + 1 }}</span>
        </div>
        <div class="progress-line" :style="{ width: `${(currentStepIndex / Math.max(steps.length - 1, 1)) * 100}%` }"></div>
      </div>

      <!-- 步骤内容 -->
      <div v-if="currentStep" class="step-content">
        <div class="step-icon" :style="{ background: currentStep.color + '20', color: currentStep.color }">
          <el-icon :size="48"><component :is="currentStep.icon" /></el-icon>
        </div>
        <h2 class="step-title">{{ currentStep.title }}</h2>
        <p class="step-description">{{ currentStep.description }}</p>

        <!-- 高亮提示区域（可选） -->
        <div v-if="currentStep.highlight" class="highlight-area">
          <div class="highlight-arrow">↓</div>
          <div class="highlight-text">{{ currentStep.highlight }}</div>
        </div>

        <!-- 操作按钮 -->
        <div class="step-actions">
          <el-button v-if="currentStepIndex > 0" @click="prevStep">上一步</el-button>
          <el-button v-if="currentStepIndex < steps.length - 1" type="primary" @click="nextStep">下一步</el-button>
          <el-button v-else type="primary" size="large" @click="finishOnboarding">开始使用</el-button>
        </div>
      </div>
    </div>

    <!-- 底部控制区域 -->
    <div class="bottom-controls">
      <label class="dont-show-again" @click.stop>
        <input type="checkbox" v-model="dontShowAgain" />
        <span class="checkbox-label">下次不再提示</span>
      </label>
      <el-button text @click="skipOnboarding">跳过引导</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Edit, Reading, Setting, MagicStick, DataBoard, FolderOpened, ChatLineRound, Connection, Calendar, Files } from '@element-plus/icons-vue'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'complete'])

const authStore = useAuthStore()
const visible = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })

const currentStepIndex = ref(0)
const dontShowAgain = ref(false)

// 所有可用的引导步骤池（每次随机取2-3个不同的）
const allStepsPool = [
  {
    title: '欢迎来到熊猫笔记！',
    description: '这是一套专为船舶政工管理的智能系统。让我来帮你快速了解核心功能，全程只需1分钟。',
    icon: Reading,
    color: '#409eff',
    width: '500px'
  },
  {
    title: '如何写日记',
    description: '在右侧编辑器中输入日记内容，支持富文本格式。你可以加粗、斜体、下划线，还可以插入手写内容和照片。',
    icon: Edit,
    color: '#67c23a',
    highlight: '提示：点击工具栏可以插入标题或更多格式选项',
    width: '600px'
  },
  {
    title: '智能标题分类',
    description: '点击工具栏的"插入标题"，从预设的一二级标题中选择，或者自定义新标题。保存日记时，AI会自动分析内容并建议最合适的分类。',
    icon: MagicStick,
    color: '#e6a23c',
    highlight: '系统已预设了航行安全、公司检查、人员管理等常用分类',
    width: '600px'
  },
  {
    title: '页面个性化设置',
    description: '在工具栏中可以调整纸张样式（道林纸、宣纸等）、行高、文字位置。所有设置会自动保存，下次打开依然有效。',
    icon: Setting,
    color: '#909399',
    width: '550px'
  },
  {
    title: '船工主管看板',
    description: '船工主管可以在"船工看板"页面实时监控各船舶动态。支持按天/周/月切换，AI会自动提炼重点关注事项。',
    icon: DataBoard,
    color: '#f56c6c',
    width: '550px'
  },
  {
    title: '日程管理',
    description: '在日程管理页面，你可以按日/周/月查看日程，设置优先级和提醒，确保工作井井有条。',
    icon: Calendar,
    color: '#67c23a',
    highlight: '点击日历上的日期可以快速创建新日程',
    width: '550px'
  },
  {
    title: '共享文件',
    description: '在共享文件中，可以上传和管理团队文档，支持多种格式预览，方便随时随地查阅资料。',
    icon: Files,
    color: '#409eff',
    width: '500px'
  },
  {
    title: '小贴士：快捷键',
    description: '编辑器支持常用快捷键：Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+U 下划线、Ctrl+S 保存。熟练使用可以大幅提升效率。',
    icon: ChatLineRound,
    color: '#e6a23c',
    width: '500px'
  },
  {
    title: '小贴士：右键菜单',
    description: '在编辑器中右键点击，可以快速插入标题、加粗文字、插入照片等操作，非常便捷。',
    icon: FolderOpened,
    color: '#909399',
    width: '500px'
  },
  {
    title: '小贴士：团队协作',
    description: '通过管理员的角色切换功能，可以模拟不同角色的视角，方便管理和调试系统。',
    icon: Connection,
    color: '#f56c6c',
    width: '500px'
  }
]

// 根据用户ID生成伪随机数，确保每次显示不同的步骤组合
function getSeededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// 随机选取2-3个不同的步骤，加上始终显示的欢迎和结尾
const steps = computed(() => {
  const userId = authStore.user?.id || 0
  const daySeed = userId + Math.floor(Date.now() / 86400000) // 每天更换一次
  
  // 从中间步骤池中随机选2-3个（排除第一个欢迎和最后一个结尾）
  const poolMiddle = allStepsPool.slice(1, -1) // 索引1到倒数第二个
  const count = 2 + Math.floor(getSeededRandom(daySeed) * 2) // 2或3个
  
  // 基于种子打乱并选取
  const shuffled = [...poolMiddle].sort((a, b) => {
    return getSeededRandom(daySeed + poolMiddle.indexOf(a)) - getSeededRandom(daySeed + poolMiddle.indexOf(b))
  })
  
  const selected = shuffled.slice(0, Math.min(count, shuffled.length))
  
  // 组装：欢迎 + 随机步骤 + 结尾
  return [
    allStepsPool[0], // 欢迎
    ...selected,
    allStepsPool[allStepsPool.length - 1] // 结尾
  ]
})

const currentStep = computed(() => steps.value[currentStepIndex.value])

const nextStep = () => {
  if (currentStepIndex.value < steps.value.length - 1) {
    currentStepIndex.value++
  }
}

const prevStep = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
  }
}

const finishOnboarding = async () => {
  // 如果勾选了"下次不再提示"，保存到localStorage
  if (dontShowAgain.value) {
    localStorage.setItem(`guideSkipped_${authStore.user?.id}`, 'true')
  }
  
  // 保存引导完成状态
  try {
    await $fetch('/api/user-guide/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { completedSteps: steps.value.map((_, idx) => idx) }
    })
  } catch (e) {
    console.error('保存引导状态失败', e)
  }
  
  emit('complete')
  visible.value = false
}

const skipOnboarding = async () => {
  localStorage.setItem(`guideSkipped_${authStore.user?.id}`, 'true')
  
  try {
    await $fetch('/api/user-guide/skip', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('保存跳过状态失败', e)
  }
  
  emit('complete')
  visible.value = false
}

const handleOverlayClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    // 点击遮罩层不关闭，只能通过按钮操作
  }
}

const closeGuide = () => {
  // 如果勾选了"下次不再提示"，保存状态
  if (dontShowAgain.value) {
    localStorage.setItem(`guideSkipped_${authStore.user?.id}`, 'true')
  }
  emit('complete')
  visible.value = false
}

// 每次打开引导时重置步骤索引
onMounted(() => {
  currentStepIndex.value = 0
})
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.onboarding-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease-out;
  position: relative;
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #999;
  background: transparent;
  border: none;
  z-index: 10;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 进度条 */
.onboarding-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  position: relative;
}

.progress-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #999;
  position: relative;
  z-index: 2;
  transition: all 0.3s;
}

.progress-dot.active {
  background: #409eff;
  color: white;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
}

.progress-dot.completed {
  background: #67c23a;
  color: white;
}

.check-icon {
  font-size: 16px;
}

.progress-line {
  position: absolute;
  top: 50%;
  left: calc(50% - 150px);
  height: 2px;
  background: #e8e8e8;
  transform: translateY(-50%);
  z-index: 1;
  transition: width 0.3s;
}

/* 步骤内容 */
.step-content {
  text-align: center;
}

.step-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.step-title {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 16px 0;
}

.step-description {
  font-size: 15px;
  color: #606266;
  line-height: 1.8;
  margin: 0 0 24px 0;
}

/* 高亮提示 */
.highlight-area {
  background: #f0f5ff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  position: relative;
}

.highlight-arrow {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  color: #409eff;
}

.highlight-text {
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
}

/* 操作按钮 */
.step-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}

/* 底部控制区域 */
.bottom-controls {
  position: absolute;
  bottom: 20px;
  left: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dont-show-again {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.dont-show-again input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #409eff;
}

.checkbox-label {
  font-size: 13px;
  color: #909399;
}

@media (max-width: 768px) {
  .onboarding-container {
    margin: 20px;
    padding: 24px;
  }
  
  .step-title {
    font-size: 20px;
  }
  
  .step-icon {
    width: 80px;
    height: 80px;
  }
  
  .bottom-controls {
    bottom: 12px;
    left: 16px;
    right: 16px;
  }
}
</style>
