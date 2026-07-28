<template>
  <div class="number-field">
    <el-input-number
      :model-value="modelValue"
      :min="field.minValue"
      :max="field.maxValue"
      :placeholder="`请输入${field.label}`"
      controls-position="right"
      style="width: 100%"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FieldDefinition } from '../FormRenderer.vue'

defineProps<{
  field: FieldDefinition
  modelValue: number | null
}>()

defineEmits<{
  'update:modelValue': [value: number | null]
}>()
</script>

<style scoped>
.number-field {
  width: 100%;
}
</style>