<template>
  <div class="photo-field">
    <el-upload
      :file-list="fileList"
      list-type="picture-card"
      :limit="field.maxCount || 9"
      :on-preview="handlePreview"
      :on-remove="handleRemove"
      :on-change="handleChange"
      :before-upload="beforeUpload"
      :auto-upload="false"
      accept="image/*"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>

    <el-dialog v-model="dialogVisible" title="图片预览" width="600px">
      <img :src="previewUrl" style="width: 100%" alt="预览" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import type { UploadFile, UploadRawFile, UploadUserFile } from 'element-plus'
import type { FieldDefinition } from '../FormRenderer.vue'

const props = defineProps<{
  field: FieldDefinition
  modelValue: UploadUserFile[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UploadUserFile[]]
}>()

const dialogVisible = ref(false)
const previewUrl = ref('')

const fileList = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

function handlePreview(file: UploadFile) {
  previewUrl.value = file.url || ''
  dialogVisible.value = true
}

function handleRemove(file: UploadFile) {
  const list = (props.modelValue || []).filter((f) => f.uid !== file.uid)
  emit('update:modelValue', list)
}

function handleChange(file: UploadFile, files: UploadUserFile[]) {
  emit('update:modelValue', files as UploadUserFile[])
}

function beforeUpload(rawFile: UploadRawFile) {
  return false
}
</script>

<style scoped>
.photo-field {
  width: 100%;
}

.photo-field :deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #f5f7fa;
}

.photo-field :deep(.el-upload--picture-card:hover) {
  border-color: #1677ff;
}

.photo-field :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 100px;
  height: 100px;
}
</style>