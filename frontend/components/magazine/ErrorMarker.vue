<template>
  <!-- 在编辑器中标注错误 -->
  <span 
    class="error-marker"
    :class="[error.type, { 'has-suggestion': showSuggestion }]"
    @click="toggleSuggestion"
    @mouseenter="showSuggestion = true"
    @mouseleave="showSuggestion = false"
  >
    {{ text }}
    <span class="error-indicator"></span>
    
    <!-- 修正建议弹窗 -->
    <div v-if="showSuggestion" class="suggestion-popup">
      <div class="popup-header">
        <el-tag :type="getErrorTagType(error.type)" size="small">
          {{ getErrorTypeLabel(error.type) }}
        </el-tag>
        <span class="confidence">{{ (error.confidence * 100).toFixed(0) }}%</span>
      </div>
      <div class="popup-message">{{ error.message }}</div>
      <div class="popup-suggestions">
        <div class="suggestion-label">建议修改：</div>
        <el-button 
          v-for="sug in error.suggestions" 
          :key="sug"
          size="small"
          type="success"
          @click.stop="applyFix(sug)"
        >
          {{ sug }}
        </el-button>
      </div>
      <div class="popup-footer">
        <el-button size="small" text @click.stop="ignoreError">忽略</el-button>
      </div>
    </div>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps<{
  text: string
  error: {
    position: { start: number; end: number }
    type: 'spelling' | 'grammar' | 'style'
    message: string
    suggestions: string[]
    confidence: number
  }
}>()

// Emits
const emit = defineEmits<{
  (e: 'fix', suggestion: string): void
  (e: 'ignore'): void
}>()

const showSuggestion = ref(false)

// 错误类型标签
const getErrorTagType = (type: string) => {
  switch (type) {
    case 'spelling': return 'danger'
    case 'grammar': return 'warning'
    case 'style': return 'info'
    default: return 'default'
  }
}

const getErrorTypeLabel = (type: string) => {
  switch (type) {
    case 'spelling': return '拼写错误'
    case 'grammar': return '语法错误'
    case 'style': return '风格问题'
    default: return '其他'
  }
}

// 切换建议显示
const toggleSuggestion = () => {
  showSuggestion.value = !showSuggestion.value
}

// 应用修正
const applyFix = (suggestion: string) => {
  emit('fix', suggestion)
  showSuggestion.value = false
  ElMessage.success('已应用修正')
}

// 忽略错误
const ignoreError = () => {
  emit('ignore')
  showSuggestion.value = false
}
</script>

<style scoped>
.error-marker {
  position: relative;
  cursor: pointer;
  display: inline;
  border-radius: 2px;
}

.error-marker.spelling {
  background-color: rgba(245, 108, 108, 0.1);
  text-decoration: underline wavy #f56c6c;
  text-underline-offset: 3px;
}

.error-marker.grammar {
  background-color: rgba(230, 162, 60, 0.1);
  text-decoration: underline wavy #e6a23c;
  text-underline-offset: 3px;
}

.error-marker.style {
  background-color: rgba(144, 147, 153, 0.1);
  text-decoration: underline wavy #909399;
  text-underline-offset: 3px;
}

.error-marker.has-suggestion {
  background-color: rgba(64, 158, 255, 0.15);
}

.error-indicator {
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
}

.suggestion-popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  min-width: 200px;
  max-width: 300px;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  margin-top: 4px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.confidence {
  font-size: 12px;
  color: #909399;
}

.popup-message {
  font-size: 13px;
  color: #333;
  margin-bottom: 12px;
  line-height: 1.4;
}

.popup-suggestions {
  margin-bottom: 8px;
}

.suggestion-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.popup-suggestions .el-button {
  margin-right: 6px;
  margin-bottom: 6px;
}

.popup-footer {
  display: flex;
  justify-content: flex-end;
}
</style>