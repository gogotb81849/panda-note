<template>
  <div class="color-swatches">
    <div class="swatches-header">
      <span class="panel-title">色板</span>
      <el-button size="small" text @click="showCustomColor = !showCustomColor">
        <el-icon><Plus /></el-icon>
        自定义
      </el-button>
    </div>

    <div v-if="showCustomColor" class="custom-color-section">
      <div class="color-picker-row">
        <el-color-picker v-model="customColor" show-alpha />
        <el-button size="small" type="primary" @click="addCustomColor">添加</el-button>
      </div>
    </div>

    <div class="swatches-content">
      <div class="swatch-group">
        <div class="group-title">
          <span>主题色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in themeColors" 
            :key="`theme-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>黑白灰</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in grayColors" 
            :key="`gray-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color, 'bordered': color === '#ffffff' }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>红色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in redColors" 
            :key="`red-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>橙色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in orangeColors" 
            :key="`orange-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>黄色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in yellowColors" 
            :key="`yellow-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>绿色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in greenColors" 
            :key="`green-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>蓝色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in blueColors" 
            :key="`blue-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>紫色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in purpleColors" 
            :key="`purple-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="swatch-group">
        <div class="group-title">
          <span>粉色</span>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in pinkColors" 
            :key="`pink-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div v-if="customColors.length > 0" class="swatch-group">
        <div class="group-title">
          <span>自定义</span>
          <el-button size="small" text style="color: var(--color-danger)" @click="clearCustomColors">
            清空
          </el-button>
        </div>
        <div class="swatch-grid">
          <div 
            v-for="(color, index) in customColors" 
            :key="`custom-${index}`"
            class="swatch-item"
            :class="{ active: selectedColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          >
            <el-icon v-if="selectedColor === color" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <div class="swatches-footer">
      <div class="selected-color-info">
        <div class="color-preview" :style="{ backgroundColor: selectedColor }"></div>
        <div class="color-value">{{ selectedColor }}</div>
      </div>
      <el-button size="small" type="primary" @click="applyColor">应用</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'apply', color: string): void
}>()

const selectedColor = ref(props.modelValue || '#333333')
const customColor = ref('#409eff')
const showCustomColor = ref(false)
const customColors = ref<string[]>([])

const themeColors = [
  '#409eff',
  '#67c23a',
  '#e6a23c',
  '#f56c6c',
  '#909399',
]

const grayColors = [
  '#000000',
  '#1a1a1a',
  '#333333',
  '#4d4d4d',
  '#666666',
  '#808080',
  '#999999',
  '#b3b3b3',
  '#cccccc',
  '#e6e6e6',
  '#f2f2f2',
  '#ffffff',
]

const redColors = [
  '#7f1d1d',
  '#991b1b',
  '#b91c1c',
  '#dc2626',
  '#ef4444',
  '#f87171',
  '#fca5a5',
  '#fecaca',
  '#fee2e2',
  '#fef2f2',
]

const orangeColors = [
  '#7c2d12',
  '#9a3412',
  '#c2410c',
  '#ea580c',
  '#f97316',
  '#fb923c',
  '#fdba74',
  '#fed7aa',
  '#ffedd5',
  '#fff7ed',
]

const yellowColors = [
  '#713f12',
  '#854d0e',
  '#a16207',
  '#ca8a04',
  '#eab308',
  '#facc15',
  '#fde047',
  '#fef08a',
  '#fef9c3',
  '#fefce8',
]

const greenColors = [
  '#14532d',
  '#166534',
  '#15803d',
  '#16a34a',
  '#22c55e',
  '#4ade80',
  '#86efac',
  '#bbf7d0',
  '#dcfce7',
  '#f0fdf4',
]

const blueColors = [
  '#1e3a8a',
  '#1e40af',
  '#2563eb',
  '#3b82f6',
  '#60a5fa',
  '#93c5fd',
  '#bfdbfe',
  '#dbeafe',
  '#eff6ff',
  '#f0f9ff',
]

const purpleColors = [
  '#4c1d95',
  '#5b21b6',
  '#7c3aed',
  '#8b5cf6',
  '#a78bfa',
  '#c4b5fd',
  '#ddd6fe',
  '#ede9fe',
  '#f5f3ff',
  '#faf5ff',
]

const pinkColors = [
  '#831843',
  '#9d174d',
  '#be185d',
  '#db2777',
  '#ec4899',
  '#f472b6',
  '#f9a8d4',
  '#fbcfe8',
  '#fce7f3',
  '#fdf2f8',
]

const selectColor = (color: string) => {
  selectedColor.value = color
  emit('update:modelValue', color)
}

const addCustomColor = () => {
  if (!customColors.value.includes(customColor.value)) {
    customColors.value.unshift(customColor.value)
    if (customColors.value.length > 20) {
      customColors.value.pop()
    }
    ElMessage.success('已添加到自定义色板')
  }
  selectColor(customColor.value)
}

const clearCustomColors = () => {
  ElMessageBox.confirm('确定要清空自定义色板吗？', '确认清空', {
    type: 'warning',
  }).then(() => {
    customColors.value = []
    ElMessage.success('已清空')
  }).catch(() => {})
}

const applyColor = () => {
  emit('apply', selectedColor.value)
}
</script>

<style scoped>
.color-swatches {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.swatches-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.custom-color-section {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.swatches-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.swatch-group {
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.swatch-item {
  aspect-ratio: 1;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.swatch-item.bordered {
  box-shadow: inset 0 0 0 1px #ddd;
}

.swatch-item:hover {
  transform: scale(1.15);
  z-index: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.swatch-item.active {
  box-shadow: 0 0 0 2px #409eff;
}

.check-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 14px;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.swatches-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.selected-color-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-preview {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.color-value {
  font-family: monospace;
  font-size: 12px;
  color: #666;
}
</style>
