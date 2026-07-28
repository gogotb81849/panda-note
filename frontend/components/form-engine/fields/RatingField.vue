<template>
  <div class="rating-field">
    <el-rate
      :model-value="modelValue"
      :max="5"
      :texts="['很差', '较差', '一般', '较好', '很好']"
      show-text
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FieldDefinition } from '../FormRenderer.vue'

defineProps<{
  field: FieldDefinition
  modelValue: number
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<style scoped>
.rating-field {
  width: 100%;
  padding: 4px 0;
}

.rating-field :deep(.el-rate__icon) {
  font-size: 24px;
}
</style>