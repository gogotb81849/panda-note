<template>
  <div class="ai-optimize-panel">
    <div class="panel-header">
      <span class="panel-title">🤖 AI文字优化</span>
      <el-button text @click="$emit('close')" class="close-btn">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
    
    <!-- 原文显示 -->
    <div class="original-text">
      <div class="label">原文</div>
      <div class="text-preview">{{ selectedText }}</div>
      <div class="text-info">
        <span>字数：{{ selectedText.length }}</span>
      </div>
    </div>
    
    <!-- AI操作选项 -->
    <div class="ai-options">
      <el-button @click="handlePolish" :loading="polishing" type="primary">
        ✨ 润色优化
      </el-button>
      <el-button @click="handleExpand" :loading="expanding">
        📝 扩写内容
      </el-button>
      <el-button @click="handleCondense" :loading="condensing">
        📄 缩写精简
      </el-button>
      <el-button @click="handleRewrite" :loading="rewriting">
        🔄 改写表达
      </el-button>
      <el-button @click="handleCheck" :loading="checking">
        🔍 纠错检查
      </el-button>
    </div>
    
    <!-- 纠错结果显示 -->
    <div v-if="checkResult && checkResult.errors.length > 0" class="check-result">
      <div class="result-header">
        <span class="label">发现 {{ checkResult.errors.length }} 处问题</span>
        <el-button size="small" @click="clearCheckResult">清除</el-button>
      </div>
      <div 
        v-for="(error, index) in checkResult.errors" 
        :key="index"
        class="error-item"
      >
        <div class="error-info">
          <el-tag :type="getErrorTagType(error.type)" size="small">
            {{ getErrorTypeLabel(error.type) }}
          </el-tag>
          <span class="error-msg">{{ error.message }}</span>
          <span class="confidence">置信度: {{ (error.confidence * 100).toFixed(0) }}%</span>
        </div>
        <div class="suggestions">
          <span class="suggestion-label">建议修改：</span>
          <el-button 
            v-for="sug in error.suggestions" 
            :key="sug"
            size="small"
            type="success"
            @click="applyFix(error, sug)"
          >
            {{ sug }}
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 无错误提示 -->
    <div v-if="checkResult && checkResult.errors.length === 0" class="no-error">
      <el-icon class="success-icon"><SuccessFilled /></el-icon>
      <span>文字检查通过，未发现明显错误</span>
    </div>
    
    <!-- 优化结果显示 -->
    <div v-if="optimizeResult" class="optimize-result">
      <div class="result-header">
        <span class="label">优化结果</span>
        <el-button size="small" @click="clearResult">清除</el-button>
      </div>
      <div class="result-preview">{{ optimizeResult.result }}</div>
      <div class="text-info">
        <span>字数：{{ optimizeResult.result.length }}</span>
        <span v-if="selectedText.length !== optimizeResult.result.length">
          （{{ selectedText.length > optimizeResult.result.length ? '减少' : '增加' }} {{ Math.abs(selectedText.length - optimizeResult.result.length) }} 字）
        </span>
      </div>
      
      <!-- 修改对比 -->
      <div v-if="optimizeResult.changes && optimizeResult.changes.length > 0" class="changes-list">
        <div class="changes-label">修改详情：</div>
        <div 
          v-for="(change, index) in optimizeResult.changes" 
          :key="index"
          class="change-item"
        >
          <div class="change-original">
            <span class="change-label">原文：</span>
            <span class="change-text deleted">{{ change.original }}</span>
          </div>
          <div class="change-polished">
            <span class="change-label">修改：</span>
            <span class="change-text added">{{ change.polished }}</span>
          </div>
          <div class="change-reason">{{ change.reason }}</div>
        </div>
      </div>
      
      <!-- 扩写/缩写摘要 -->
      <div v-if="optimizeResult.addedContent" class="content-summary">
        <div class="summary-label">新增内容：</div>
        <div class="summary-text">{{ optimizeResult.addedContent }}</div>
      </div>
      <div v-if="optimizeResult.removedContent" class="content-summary">
        <div class="summary-label">删除内容：</div>
        <div class="summary-text">{{ optimizeResult.removedContent }}</div>
      </div>
      
      <!-- 风格变化 -->
      <div v-if="optimizeResult.styleChanges && optimizeResult.styleChanges.length > 0" class="style-changes">
        <div class="changes-label">风格变化：</div>
        <ul>
          <li v-for="(change, index) in optimizeResult.styleChanges" :key="index">{{ change }}</li>
        </ul>
      </div>
      
      <!-- 操作按钮 -->
      <div class="result-actions">
        <el-button @click="applyResult" type="primary">
          应用修改
        </el-button>
        <el-button @click="copyResult">
          复制结果
        </el-button>
        <el-button @click="clearResult">
          取消
        </el-button>
      </div>
    </div>
    
    <!-- 改写风格选择 -->
    <el-dialog
      v-model="showRewriteDialog"
      title="选择改写风格"
      width="400px"
    >
      <el-radio-group v-model="rewriteStyle" class="rewrite-style-group">
        <el-radio label="formal">正式风格</el-radio>
        <el-radio label="casual">轻松风格</el-radio>
        <el-radio label="creative">创意风格</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="showRewriteDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRewrite">确认改写</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Close, SuccessFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

// Props
const props = defineProps<{
  selectedText: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply', text: string): void
}>()

const api = useApi()

// 加载状态
const polishing = ref(false)
const expanding = ref(false)
const condensing = ref(false)
const rewriting = ref(false)
const checking = ref(false)

// 结果数据
const checkResult = ref<any>(null)
const optimizeResult = ref<any>(null)

// 改写风格选择
const showRewriteDialog = ref(false)
const rewriteStyle = ref<'formal' | 'casual' | 'creative'>('formal')

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

// AI操作处理
const handlePolish = async () => {
  if (!props.selectedText) {
    ElMessage.warning('请先选择要润色的文字')
    return
  }
  
  polishing.value = true
  clearResult()
  
  try {
    const result = await api.magazine.aiPolishText(props.selectedText)
    optimizeResult.value = result
    ElMessage.success('润色完成')
  } catch (error: any) {
    ElMessage.error(error.message || '润色失败')
  } finally {
    polishing.value = false
  }
}

const handleExpand = async () => {
  if (!props.selectedText) {
    ElMessage.warning('请先选择要扩写的文字')
    return
  }
  
  expanding.value = true
  clearResult()
  
  try {
    const result = await api.magazine.aiExpandText(props.selectedText)
    optimizeResult.value = result
    ElMessage.success('扩写完成')
  } catch (error: any) {
    ElMessage.error(error.message || '扩写失败')
  } finally {
    expanding.value = false
  }
}

const handleCondense = async () => {
  if (!props.selectedText) {
    ElMessage.warning('请先选择要缩写的文字')
    return
  }
  
  condensing.value = true
  clearResult()
  
  try {
    const result = await api.magazine.aiCondenseText(props.selectedText)
    optimizeResult.value = result
    ElMessage.success('缩写完成')
  } catch (error: any) {
    ElMessage.error(error.message || '缩写失败')
  } finally {
    condensing.value = false
  }
}

const handleRewrite = () => {
  if (!props.selectedText) {
    ElMessage.warning('请先选择要改写的文字')
    return
  }
  
  showRewriteDialog.value = true
}

const confirmRewrite = async () => {
  showRewriteDialog.value = false
  rewriting.value = true
  clearResult()
  
  try {
    const result = await api.magazine.aiRewriteText(props.selectedText, rewriteStyle.value)
    optimizeResult.value = result
    ElMessage.success('改写完成')
  } catch (error: any) {
    ElMessage.error(error.message || '改写失败')
  } finally {
    rewriting.value = false
  }
}

const handleCheck = async () => {
  if (!props.selectedText) {
    ElMessage.warning('请先选择要检查的文字')
    return
  }
  
  checking.value = true
  clearCheckResult()
  
  try {
    const result = await api.magazine.aiCheckText(props.selectedText)
    checkResult.value = result
    if (result.errors.length > 0) {
      ElMessage.warning(`发现 ${result.errors.length} 处问题`)
    } else {
      ElMessage.success('检查通过，未发现明显错误')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '检查失败')
  } finally {
    checking.value = false
  }
}

// 应用修正
const applyFix = (error: any, suggestion: string) => {
  // 获取错误位置的文本
  const start = error.position.start
  const end = error.position.end
  const errorText = props.selectedText.substring(start, end)
  
  // 替换文本
  const newText = props.selectedText.substring(0, start) + suggestion + props.selectedText.substring(end)
  emit('apply', newText)
  ElMessage.success('已应用修正')
}

// 应用优化结果
const applyResult = () => {
  if (optimizeResult.value?.result) {
    emit('apply', optimizeResult.value.result)
    ElMessage.success('已应用优化结果')
  }
}

// 复制结果
const copyResult = async () => {
  if (optimizeResult.value?.result) {
    try {
      await navigator.clipboard.writeText(optimizeResult.value.result)
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

// 清除结果
const clearResult = () => {
  optimizeResult.value = null
}

const clearCheckResult = () => {
  checkResult.value = null
}
</script>

<style scoped>
.ai-optimize-panel {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  max-height: 600px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #f5f7fa;
}

.panel-title {
  font-size: 16px;
  font-weight: bold;
}

.close-btn {
  padding: 4px;
}

.original-text {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.text-preview {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.text-info {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.ai-options {
  padding: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-bottom: 1px solid #e8e8e8;
}

.check-result {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.error-item {
  padding: 12px;
  background: #fff5f5;
  border-radius: 4px;
  margin-bottom: 8px;
  border: 1px solid #ffe0e0;
}

.error-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.error-msg {
  font-size: 14px;
  color: #333;
}

.confidence {
  font-size: 12px;
  color: #999;
}

.suggestions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.suggestion-label {
  font-size: 12px;
  color: #666;
}

.no-error {
  padding: 24px;
  text-align: center;
  color: #67c23a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.success-icon {
  font-size: 24px;
}

.optimize-result {
  padding: 16px;
}

.result-preview {
  padding: 12px;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid #d9ecff;
}

.changes-list {
  margin-top: 16px;
}

.changes-label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.change-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.change-original,
.change-polished {
  margin-bottom: 4px;
}

.change-label {
  font-size: 12px;
  color: #666;
  margin-right: 8px;
}

.change-text {
  font-size: 14px;
}

.change-text.deleted {
  color: #f56c6c;
  text-decoration: line-through;
}

.change-text.added {
  color: #67c23a;
}

.change-reason {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  padding-left: 60px;
}

.content-summary {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.summary-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.summary-text {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}

.style-changes {
  margin-top: 12px;
}

.style-changes ul {
  margin: 0;
  padding-left: 20px;
}

.style-changes li {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.result-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.rewrite-style-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>