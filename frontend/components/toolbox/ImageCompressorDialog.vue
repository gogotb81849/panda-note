<template>
  <el-dialog
    v-model="dialogVisible"
    title="图片压缩"
    width="700px"
    :close-on-click-modal="false"
    @closed="resetState"
  >
    <div class="image-compressor">
      <!-- 上传区域 -->
      <div 
        class="upload-area"
        :class="{ 'has-file': uploadedImage, 'is-dragging': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="image/*" 
          style="display: none"
          @change="handleFileSelect"
        />
        <div v-if="!uploadedImage" class="upload-placeholder">
          <el-icon class="upload-icon"><Picture /></el-icon>
          <p class="upload-text">拖拽图片到此处，或点击上传</p>
          <p class="upload-hint">支持 JPG、PNG、WebP 等格式</p>
        </div>
        <div v-else class="preview-container">
          <img :src="previewUrl" alt="预览" class="preview-image" />
        </div>
      </div>

      <!-- 压缩控制 -->
      <div v-if="uploadedImage" class="compression-controls">
        <div class="control-row">
          <label>压缩质量</label>
          <el-slider 
            v-model="quality" 
            :min="10" 
            :max="100" 
            :step="5"
            show-input
            @change="generatePreview"
          />
        </div>
        <div class="control-row">
          <label>最大宽度</label>
          <el-slider 
            v-model="maxWidth" 
            :min="100" 
            :max="4000" 
            :step="50"
            show-input
            @change="generatePreview"
          />
        </div>
      </div>

      <!-- 预览对比 -->
      <div v-if="compressedImageUrl" class="comparison-view">
        <div class="comparison-item">
          <p class="comparison-label">原始图片</p>
          <div class="comparison-image-wrapper">
            <img :src="uploadedImageUrl" alt="原始" />
          </div>
          <p class="comparison-size">{{ formatFileSize(originalSize) }}</p>
        </div>
        <div class="comparison-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="comparison-item">
          <p class="comparison-label">压缩后</p>
          <div class="comparison-image-wrapper">
            <img :src="compressedImageUrl" alt="压缩后" />
          </div>
          <p class="comparison-size success">{{ formatFileSize(compressedSize) }}</p>
        </div>
      </div>

      <!-- 压缩结果 -->
      <div v-if="compressedSize > 0" class="compression-stats">
        <el-alert
          :title="`压缩成功！节省了 ${savedPercent}% 的空间`"
          type="success"
          show-icon
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button 
          v-if="uploadedImage && !compressedSize"
          type="primary" 
          @click="generatePreview"
        >
          预览压缩效果
        </el-button>
        <el-button 
          v-if="compressedSize > 0"
          type="primary" 
          @click="downloadCompressedImage"
        >
          下载压缩图片
        </el-button>
        <el-button v-if="compressedSize > 0" @click="resetState">
          处理新图片
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Picture, ArrowRight } from '@element-plus/icons-vue'
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
const uploadedImage = ref<File | null>(null)
const uploadedImageUrl = ref<string>('')
const previewUrl = ref<string>('')
const compressedImageUrl = ref<string>('')
const isDragging = ref(false)
const quality = ref(80)
const maxWidth = ref(1920)
const originalSize = ref(0)
const compressedSize = ref(0)

const savedPercent = computed(() => {
  if (originalSize.value === 0 || compressedSize.value === 0) return 0
  return Math.round((1 - compressedSize.value / originalSize.value) * 100)
})

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    loadImage(target.files[0])
  }
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0]
    if (file.type.startsWith('image/')) {
      loadImage(file)
    } else {
      ElMessage.error('请上传图片文件')
    }
  }
}

const loadImage = (file: File) => {
  uploadedImage.value = file
  originalSize.value = file.size
  compressedSize.value = 0
  compressedImageUrl.value = ''
  
  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedImageUrl.value = e.target?.result as string
    previewUrl.value = uploadedImageUrl.value
  }
  reader.readAsDataURL(file)
}

const generatePreview = async () => {
  if (!uploadedImage.value) return
  
  try {
    const img = new Image()
    img.src = uploadedImageUrl.value
    
    await new Promise((resolve) => {
      img.onload = resolve
    })
    
    const canvas = document.createElement('canvas')
    let { width, height } = img
    
    // 按比例缩放
    if (width > maxWidth.value) {
      height = (height * maxWidth.value) / width
      width = maxWidth.value
    }
    
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.drawImage(img, 0, 0, width, height)
    
    // 压缩为 JPEG/PNG
    const outputType = uploadedImage.value.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const qualityValue = quality.value / 100
    
    const dataUrl = canvas.toDataURL(outputType, qualityValue)
    compressedImageUrl.value = dataUrl
    
    // 计算压缩后大小（base64转字节）
    const base64 = dataUrl.split(',')[1]
    const byteString = atob(base64)
    const mimeType = dataUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg'
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    compressedSize.value = new Blob([ab], { type: mimeType }).size
    
    ElMessage.success('压缩预览已生成')
  } catch (error) {
    ElMessage.error('压缩失败')
    console.error(error)
  }
}

const downloadCompressedImage = () => {
  if (!compressedImageUrl.value) return
  
  const link = document.createElement('a')
  link.href = compressedImageUrl.value
  
  const originalName = uploadedImage.value?.name || 'image'
  const ext = originalName.split('.').pop() || 'jpg'
  const nameParts = originalName.split('.')
  nameParts.pop()
  link.download = `${nameParts.join('.')}_compressed.${ext}`
  
  link.click()
  ElMessage.success('图片已下载')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const resetState = () => {
  uploadedImage.value = null
  uploadedImageUrl.value = ''
  previewUrl.value = ''
  compressedImageUrl.value = ''
  originalSize.value = 0
  compressedSize.value = 0
  quality.value = 80
  maxWidth.value = 1920
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
.image-compressor {
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
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 20px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon {
  font-size: 48px;
  color: #909399;
  margin-bottom: 12px;
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

.preview-container {
  max-width: 100%;
  max-height: 400px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
}

.compression-controls {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-row label {
  width: 80px;
  font-size: 14px;
  color: #606266;
  flex-shrink: 0;
}

.control-row .el-slider {
  flex: 1;
}

.comparison-view {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.comparison-label {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.comparison-image-wrapper {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.comparison-image-wrapper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.comparison-size {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.comparison-size.success {
  color: var(--color-success, #67c23a);
}

.comparison-arrow {
  font-size: 24px;
  color: #909399;
}

.compression-stats {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
