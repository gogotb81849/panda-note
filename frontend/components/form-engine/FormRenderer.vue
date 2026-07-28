<template>
  <div class="form-renderer">
    <el-form
      ref="formRef"
      :model="formData"
      label-position="top"
      class="renderer-form"
    >
      <el-row :gutter="24">
        <el-col
          v-for="field in fields"
          :key="field.name"
          :span="getFieldSpan(field)"
        >
          <el-form-item
            :label="field.label"
            :required="field.required"
            :prop="field.name"
          >
            <!-- 短文本 / 长文本 -->
            <TextField
              v-if="field.type === 'short_text' || field.type === 'long_text'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 数字 -->
            <NumberField
              v-else-if="field.type === 'number'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 日期 / 日期时间 -->
            <DateField
              v-else-if="field.type === 'date' || field.type === 'datetime'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 评分 -->
            <RatingField
              v-else-if="field.type === 'rating'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 单选 / 多选 / 下拉 -->
            <SelectField
              v-else-if="['single_choice', 'multi_choice', 'dropdown'].includes(field.type)"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 布尔开关 -->
            <BooleanField
              v-else-if="field.type === 'boolean_switch'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 图片上传 -->
            <PhotoField
              v-else-if="field.type === 'photo'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 文件上传 -->
            <FileField
              v-else-if="field.type === 'file'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 地理位置 -->
            <GeoField
              v-else-if="field.type === 'geolocation'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 手写签名 -->
            <SignatureField
              v-else-if="field.type === 'signature'"
              :field="field"
              :model-value="formData[field.name]"
              @update:model-value="(v: any) => (formData[field.name] = v)"
            />

            <!-- 帮助文本 -->
            <div v-if="field.helpText" class="field-help-text">
              {{ field.helpText }}
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <div class="form-footer">
      <el-button type="primary" size="large" @click="handleSubmit">
        提交
      </el-button>
      <el-button size="large" @click="handleReset">
        重置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import TextField from './fields/TextField.vue'
import NumberField from './fields/NumberField.vue'
import DateField from './fields/DateField.vue'
import RatingField from './fields/RatingField.vue'
import SelectField from './fields/SelectField.vue'
import BooleanField from './fields/BooleanField.vue'
import PhotoField from './fields/PhotoField.vue'
import FileField from './fields/FileField.vue'
import GeoField from './fields/GeoField.vue'
import SignatureField from './fields/SignatureField.vue'

export interface FieldDefinition {
  name: string
  label: string
  type: 'short_text' | 'long_text' | 'number' | 'date' | 'datetime' | 'rating' | 'single_choice' | 'multi_choice' | 'dropdown' | 'boolean_switch' | 'photo' | 'file' | 'geolocation' | 'signature'
  required?: boolean
  options?: Array<{ label: string; value: string | number }>
  defaultValue?: any
  helpText?: string
  maxCount?: number
  minValue?: number
  maxValue?: number
}

const props = defineProps<{
  fields: FieldDefinition[]
}>()

const emit = defineEmits<{
  submit: [data: Record<string, any>]
}>()

const formRef = ref()
const formData = reactive<Record<string, any>>({})

function initFormData() {
  props.fields.forEach((field) => {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      formData[field.name] = field.defaultValue
    } else {
      switch (field.type) {
        case 'multi_choice':
          formData[field.name] = []
          break
        case 'boolean_switch':
          formData[field.name] = false
          break
        case 'rating':
          formData[field.name] = 0
          break
        case 'number':
          formData[field.name] = null
          break
        case 'photo':
        case 'file':
          formData[field.name] = []
          break
        default:
          formData[field.name] = ''
      }
    }
  })
}

function getFieldSpan(field: FieldDefinition): number {
  if (field.type === 'long_text' || field.type === 'geolocation' || field.type === 'signature') {
    return 24
  }
  return 12
}

function handleSubmit() {
  const data = { ...formData }
  emit('submit', data)
}

function handleReset() {
  Object.keys(formData).forEach((key) => {
    delete formData[key]
  })
  initFormData()
}

onMounted(() => {
  initFormData()
})
</script>

<style scoped>
.form-renderer {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.renderer-form {
  margin-bottom: 8px;
}

.renderer-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.renderer-form :deep(.el-form-item__label) {
  color: #303133;
  font-weight: 500;
  font-size: 14px;
  padding-bottom: 4px;
}

.renderer-form :deep(.el-form-item.is-required .el-form-item__label::before) {
  color: #f56c6c;
}

.field-help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.form-footer {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #dcdfe6;
  margin-top: 8px;
}

.form-footer :deep(.el-button--primary) {
  background-color: #1677ff;
  border-color: #1677ff;
}

.form-footer :deep(.el-button--primary:hover) {
  background-color: #4096ff;
  border-color: #4096ff;
}
</style>