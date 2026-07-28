<template>
  <div class="date-field">
    <el-date-picker
      v-if="field.type === 'date'"
      :model-value="modelValue"
      type="date"
      :placeholder="`请选择${field.label}`"
      value-format="YYYY-MM-DD"
      style="width: 100%"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <el-date-picker
      v-else
      :model-value="modelValue"
      type="datetime"
      :placeholder="`请选择${field.label}`"
      value-format="YYYY-MM-DD HH:mm:ss"
      style="width: 100%"
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
.date-field {
  width: 100%;
}
</style>