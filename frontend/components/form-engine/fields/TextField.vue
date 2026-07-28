<template>
  <div class="text-field">
    <el-input
      v-if="field.type === 'short_text'"
      :model-value="modelValue"
      :placeholder="`请输入${field.label}`"
      :maxlength="field.maxCount"
      :show-word-limit="!!field.maxCount"
      clearable
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <el-input
      v-else
      :model-value="modelValue"
      type="textarea"
      :placeholder="`请输入${field.label}`"
      :rows="4"
      :maxlength="field.maxCount"
      :show-word-limit="!!field.maxCount"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FieldDefinition } from '../FormRenderer.vue'

defineProps<{
  field: FieldDefinition
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.text-field {
  width: 100%;
}
</style>