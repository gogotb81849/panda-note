<template>
  <div class="loading-state">
    <div class="loading-content">
      <!-- 顶部进度条 -->
      <div class="progress-bar-container">
        <div 
          class="progress-bar" 
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
      
      <!-- 当前步骤 -->
      <div class="current-step">
        <h3>{{ currentStep.title }}</h3>
        <p class="step-description">{{ currentStep.description }}</p>
      </div>
      
      <!-- 步骤指示器 -->
      <div class="step-indicators">
        <div 
          v-for="(step, index) in steps" 
          :key="step.id"
          class="step-item"
          :class="{
            'completed': currentStepIndex > index,
            'active': currentStepIndex === index,
            'pending': currentStepIndex < index
          }"
        >
          <div class="step-icon">
            <span v-if="currentStepIndex > index">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>
      
      <!-- 收集到的信息展示 -->
      <div v-if="collectedInfo.length > 0" class="collected-info">
        <h4>📊 已收集的信息</h4>
        <div class="info-scroll">
          <div v-for="(info, index) in collectedInfo" :key="index" class="info-item">
            <span class="info-label">{{ info.label }}:</span>
            <span class="info-value">{{ info.value }}</span>
          </div>
        </div>
      </div>
      
      <!-- 连接详情 -->
      <div v-if="connectionDetails.length > 0" class="connection-details">
        <h4>🔌 AI服务连接</h4>
        <div class="connection-list">
          <div v-for="(detail, index) in connectionDetails" :key="index" class="connection-item">
            <span class="connection-dot" :class="detail.status"></span>
            <span class="connection-text">{{ detail.text }}</span>
            <span v-if="detail.value" class="connection-value">{{ detail.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  progressPercent: number
  currentStep: { title: string; description: string }
  currentStepIndex: number
  steps: Array<{ id: string; label: string }>
  collectedInfo: Array<{ label: string; value: string }>
  connectionDetails: Array<{ text: string; status: string; value?: string }>
}>()
</script>

<style scoped>
.loading-state {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.loading-content {
  max-width: 600px;
  margin: 0 auto;
}

.progress-bar-container {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 24px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.current-step {
  text-align: center;
  margin-bottom: 24px;
}

.current-step h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.step-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.step-indicators {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 32px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.step-item.completed .step-icon {
  background: #10b981;
  color: white;
}

.step-item.active .step-icon {
  background: #3b82f6;
  color: white;
}

.step-item.pending .step-icon {
  background: #e5e7eb;
  color: #9ca3af;
}

.step-label {
  font-size: 12px;
  color: #6b7280;
}

.collected-info {
  background: #f0fdf4;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.collected-info h4 {
  margin: 0 0 12px 0;
  color: #166534;
  font-size: 14px;
}

.info-scroll {
  max-height: 150px;
  overflow-y: auto;
}

.info-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}

.info-label {
  color: #4b5563;
  font-weight: 500;
}

.info-value {
  color: #1f2937;
}

.connection-details {
  background: #eff6ff;
  border-radius: 8px;
  padding: 16px;
}

.connection-details h4 {
  margin: 0 0 12px 0;
  color: #1e40af;
  font-size: 14px;
}

.connection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.connection-dot.success {
  background: #10b981;
}

.connection-dot.loading {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

.connection-dot.error {
  background: #ef4444;
}

.connection-dot.pending {
  background: #9ca3af;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.connection-text {
  color: #374151;
}

.connection-value {
  color: #6b7280;
  margin-left: auto;
}
</style>
