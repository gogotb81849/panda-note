<template>
  <div class="boolean-field">
    <el-switch
      :model-value="modelValue"
      active-text="是"
      inactive-text="否"
      style="--el-switch-on-color: #1677ff; --el-switch-off-color: #dcdfe6"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FieldDefinition } from '../FormRenderer.vue'

defineProps<{
  field: FieldDefinition
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.boolean-field {
  width: 100%;
  padding: 4px 0;
}
</style>