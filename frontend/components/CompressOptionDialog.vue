<template>
  <el-dialog
    v-model="visible"
    title="文件处理选项"
    width="400px"
    :close-on-click-modal="false"
  >
    <div class="file-info">
      <div class="file-name">{{ fileName }}</div>
      <div class="file-size">原始大小: {{ formatSize(originalSize) }}</div>
    </div>
    
    <el-form>
      <el-form-item label="处理方式">
        <el-radio-group v-model="compressEnabled">
          <el-radio :label="true">压缩文件</el-radio>
          <el-radio :label="false">保持原样</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <template v-if="compressEnabled">
        <el-form-item label="压缩质量">
          <el-slider v-model="quality" :min="10" :max="100" :step="5" show-stops />
          <div class="quality-label">{{ quality }}%</div>
        </el-form-item>
        
        <el-form-item label="最大尺寸">
          <el-select v-model="maxSize">
            <el-option label="原尺寸" :value="0" />
            <el-option label="1920px" :value="1920" />
            <el-option label="1280px" :value="1280" />
            <el-option label="800px" :value="800" />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="estimatedSize" label="预估大小">
          <span class="estimated-size">{{ formatSize(estimatedSize) }}</span>
          <span v-if="estimatedSize < originalSize" class="size-reduction text-green-500">
            (减少 {{ Math.round((1 - estimatedSize / originalSize) * 100) }}%)
          </span>
          <span v-else class="size-increase text-orange-500">
            (可能比原图更大)
          </span>
        </el-form-item>
      </template>
    </el-form>
    
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

export interface CompressOptions {
  compressEnabled: boolean;
  quality: number;
  maxSize: number;
}

const props = defineProps<{
  modelValue: boolean;
  fileName: string;
  originalSize: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [options: CompressOptions];
  'cancel': [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const compressEnabled = ref(true);
const quality = ref(80);
const maxSize = ref(1920);

// 根据质量估算压缩后大小（粗略估算）
const estimatedSize = computed(() => {
  if (!compressEnabled.value || props.originalSize === 0) return null;
  // 假设压缩质量与大小大致成正比
  const qualityRatio = quality.value / 100;
  // 尺寸缩小也会影响大小
  const sizeRatio = maxSize.value > 0 ? 0.7 : 1; // 估算尺寸调整的影响
  return Math.round(props.originalSize * qualityRatio * sizeRatio);
});

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const handleCancel = () => {
  emit('cancel');
  visible.value = false;
};

const handleConfirm = () => {
  emit('confirm', {
    compressEnabled: compressEnabled.value,
    quality: quality.value,
    maxSize: maxSize.value,
  });
  visible.value = false;
};

// 重置选项
watch(visible, (val) => {
  if (val) {
    compressEnabled.value = true;
    quality.value = 80;
    maxSize.value = 1920;
  }
});
</script>

<style scoped>
.file-info {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.file-name {
  font-weight: 500;
  color: #303133;
  word-break: break-all;
}

.file-size {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.quality-label {
  text-align: center;
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}

.estimated-size {
  font-weight: 500;
  color: #303133;
}

.size-reduction,
.size-increase {
  margin-left: 8px;
  font-size: 13px;
}
</style>
