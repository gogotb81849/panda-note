<template>
  <div class="color-picker-group">
    <el-color-picker v-model="color" />
    <span class="color-value">{{ color }}</span>
    
    <!-- 预设颜色快捷选择 -->
    <div class="preset-colors">
      <div 
        v-for="preset in presets" 
        :key="preset"
        class="preset-color"
        :style="{ backgroundColor: preset }"
        @click="setColor(preset)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
  presets?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const color = ref(props.modelValue || '#333333');
const defaultPresets = [
  '#333333', '#666666', '#999999', '#cccccc',
  '#1a365d', '#2c5282', '#4299e1',
  '#234e52', '#285e61', '#38b2ac',
  '#c05621', '#dd6b20', '#ed8936',
  '#702459', '#97266d', '#d53f8c',
];

const presets = ref(props.presets || defaultPresets);

const setColor = (value: string) => {
  color.value = value;
  emit('update:modelValue', value);
};

watch(() => props.modelValue, (newVal) => {
  color.value = newVal;
});

watch(color, (newVal) => {
  emit('update:modelValue', newVal);
});
</script>

<style scoped>
.color-picker-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-value {
  font-size: 12px;
  color: #666;
  font-family: monospace;
  min-width: 60px;
}

.preset-colors {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  flex-wrap: wrap;
}

.preset-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  transition: all 0.2s ease;
}

.preset-color:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>
