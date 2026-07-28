<template>
  <div class="select-field">
    <!-- 单选：Radio -->
    <el-radio-group
      v-if="field.type === 'single_choice'"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-radio
        v-for="opt in field.options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </el-radio>
    </el-radio-group>

    <!-- 多选：Checkbox -->
    <el-checkbox-group
      v-else-if="field.type === 'multi_choice'"
      :model-value="modelValue"
      :max="field.maxCount"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-checkbox
        v-for="opt in field.options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </el-checkbox>
    </el-checkbox-group>

    <!-- 下拉 -->
    <el-select
      v-else
      :model-value="modelValue"
      :placeholder="`请选择${field.label}`"
      clearable
      style="width: 100%"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-option
        v-for="opt in field.options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import type { FieldDefinition } from '../FormRenderer.vue'

defineProps<{
  field: FieldDefinition
  modelValue: string | number | (string | number)[]
}>()

defineEmits<{
  'update:modelValue': [value: string | number | (string | number)[]]
}>()
</script>

<style scoped>
.select-field {
  width: 100%;
}

.select-field :deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-field :deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>