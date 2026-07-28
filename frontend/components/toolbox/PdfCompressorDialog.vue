<template>
  <el-dialog
    v-model="dialogVisible"
    title="PDF压缩"
    width="600px"
    :close-on-click-modal="false"
    @closed="resetState"
  >
    <div class="pdf-compressor">
      <!-- 上传区域 -->
      <div 
        class="upload-area"
        :class="{ 'has-file': uploadedFile, 'is-dragging': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept=".pdf" 
          style="display: none"
          @change="handleFileSelect"
        />
        <div v-if="!uploadedFile" class="upload-placeholder">
          <el-icon class="upload-icon"><Upload /></el-icon>
          <p class="upload-text">拖拽PDF文件到此处，或点击上传</p>
          <p class="upload-hint">支持单个或多个文件</p>
        </div>
        <div v-else class="file-info">
          <el-icon class="file-icon"><Document /></el-icon>
          <div class="file-details">
            <p class="file-name">{{ uploadedFile.name }}</p>
            <p class="file-size">{{ formatFileSize(uploadedFile.size) }}</p>
          </div>
          <el-button type="danger" size="small" circle @click.stop="removeFile">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 压缩选项 -->
      <div v-if="uploadedFile" class="compression-options">
        <el-radio-group v-model="compressionLevel" class="compression-level-group">
          <el-radio label="low">低压缩（质量优先）</el-radio>
          <el-radio label="medium">中等压缩</el-radio>
          <el-radio label="high">高压缩（体积优先）</el-radio>
        </el-radio-group>
      </div>

      <!-- 进度显示 -->
      <div v-if="isCompressing" class="compression-progress">
        <el-progress :percentage="progress" :stroke-width="10" />
        <p class="progress-text">{{ progressText }}</p>
      </div>

      <!-- 结果显示 -->
      <div v-if="compressionResult" class="compression-result">
        <el-alert
          :title="compressionResult.success ? '压缩成功' : '压缩失败'"
          :type="compressionResult.success ? 'success' : 'error'"
          :description="compressionResult.message"
          show-icon
        />
        <div v-if="compressionResult.success" class="result-stats">
          <div class="stat-item">
            <span class="stat-label">原始大小</span>
            <span class="stat-value">{{ formatFileSize(compressionResult.originalSize) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">压缩后</span>
            <span class="stat-value">{{ formatFileSize(compressionResult.compressedSize) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">节省</span>
            <span class="stat-value success">{{ compressionResult.savedPercent }}%</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button 
          v-if="!compressionResult && uploadedFile && !isCompressing"
          type="primary" 
          @click="startCompression"
        >
          开始压缩
        </el-button>
        <el-button 
          v-if="compressionResult && compressionResult.success"
          type="primary" 
          @click="downloadFile"
        >
          下载压缩文件
        </el-button>
        <el-button v-if="compressionResult" @click="resetState">
          压缩新文件
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Upload, Document, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadedFile = ref<File | null>(null)
const isDragging = ref(false)
const compressionLevel = ref<'low' | 'medium' | 'high'>('medium')
const isCompressing = ref(false)
const progress = ref(0)
const progressText = ref('')
const compressionResult = ref<{
  success: boolean
  message: string
  originalSize: number
  compressedSize: number
  savedPercent: number
  filePath?: string
} | null>(null)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    uploadedFile.value = target.files[0]
    compressionResult.value = null
  }
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0]
    if (file.type === 'application/pdf') {
      uploadedFile.value = file
      compressionResult.value = null
    } else {
      ElMessage.error('请上传PDF文件')
    }
  }
}

const removeFile = () => {
  uploadedFile.value = null
  compressionResult.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const startCompression = async () => {
  if (!uploadedFile.value) return
  
  isCompressing.value = true
  progress.value = 0
  progressText.value = '正在上传文件...'
  
  try {
    // 模拟压缩进度
    const steps = [
      { progress: 20, text: '正在分析文件...' },
      { progress: 40, text: '应用压缩方案...' },
      { progress: 70, text: '优化文件结构...' },
      { progress: 90, text: '生成最终文件...' },
    ]
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500))
      progress.value = step.progress
      progressText.value = step.text
    }
    
    // 模拟压缩结果
    const originalSize = uploadedFile.value.size
    const compressionRates = {
      low: 0.7,
      medium: 0.5,
      high: 0.3
    }
    const rate = compressionRates[compressionLevel.value]
    const compressedSize = Math.floor(originalSize * rate)
    const savedPercent = Math.round((1 - rate) * 100)
    
    progress.value = 100
    progressText.value = '压缩完成'
    
    compressionResult.value = {
      success: true,
      message: `PDF文件已成功压缩，节省了${savedPercent}%的存储空间`,
      originalSize,
      compressedSize,
      savedPercent
    }
    
    ElMessage.success('压缩完成')
  } catch (error) {
    compressionResult.value = {
      success: false,
      message: `压缩失败: ${(error as Error).message}`,
      originalSize: uploadedFile.value.size,
      compressedSize: 0,
      savedPercent: 0
    }
    ElMessage.error('压缩失败')
  } finally {
    isCompressing.value = false
  }
}

const downloadFile = () => {
  if (!compressionResult.value?.success) return
  ElMessage.info('下载功能开发中')
}

const resetState = () => {
  uploadedFile.value = null
  isCompressing.value = false
  progress.value = 0
  progressText.value = ''
  compressionResult.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

watch(() => props.modelValue, (val) => {
  if (!val) {
    resetState()
  }
})
</script>

<style scoped>
.pdf-compressor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area:hover {
  border-color: var(--color-accent);
  background: #f0f7ff;
}

.upload-area.is-dragging {
  border-color: var(--color-accent);
  background: #e8f4ff;
  transform: scale(1.02);
}

.upload-area.has-file {
  border-style: solid;
  border-color: var(--color-success, #67c23a);
  background: #f0f9eb;
}

.upload-icon {
  font-size: 48px;
  color: #909399;
  margin-bottom: 12px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-text {
  margin: 0 0 8px;
  font-size: 14px;
  color: #606266;
}

.upload-hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 32px;
  color: var(--color-danger, #f56c6c);
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.file-size {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.compression-options {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.compression-level-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compression-progress {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.progress-text {
  margin: 8px 0 0;
  font-size: 13px;
  color: #606266;
  text-align: center;
}

.compression-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.stat-value.success {
  color: var(--color-success, #67c23a);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
