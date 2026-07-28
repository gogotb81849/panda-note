<template>
  <div class="file-field">
    <el-upload
      :file-list="fileList"
      :limit="field.maxCount || 5"
      :on-remove="handleRemove"
      :on-change="handleChange"
      :before-upload="beforeUpload"
      :auto-upload="false"
      drag
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        将文件拖到此处，或 <em>点击上传</em>
      </div>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadRawFile, UploadUserFile } from 'element-plus'
import type { FieldDefinition } from '../FormRenderer.vue'

const props = defineProps<{
  field: FieldDefinition
  modelValue: UploadUserFile[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UploadUserFile[]]
}>()

const fileList = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

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
.file-field {
  width: 100%;
}

.file-field :deep(.el-upload-dragger) {
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #f5f7fa;
  padding: 24px;
}

.file-field :deep(.el-upload-dragger:hover) {
  border-color: #1677ff;
}

.file-field :deep(.el-upload-dragger .el-icon--upload) {
  font-size: 40px;
  color: #c0c4cc;
  margin-bottom: 12px;
}

.file-field :deep(.el-upload__text) {
  color: #606266;
  font-size: 14px;
}

.file-field :deep(.el-upload__text em) {
  color: #1677ff;
  font-style: normal;
}
</style>