<template>
  <div class="geo-field">
    <div class="geo-info">
      <div class="geo-display">
        <el-icon class="geo-icon"><LocationFilled /></el-icon>
        <span v-if="modelValue" class="geo-coords">
          纬度: {{ modelValue.latitude }}, 经度: {{ modelValue.longitude }}
        </span>
        <span v-else class="geo-placeholder">
          尚未获取位置信息
        </span>
      </div>
      <el-button
        type="primary"
        :loading="loading"
        :icon="Location"
        size="small"
        @click="getCurrentPosition"
      >
        {{ modelValue ? '重新定位' : '获取当前位置' }}
      </el-button>
    </div>
    <div v-if="errorMsg" class="geo-error">
      {{ errorMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Location, LocationFilled } from '@element-plus/icons-vue'
import type { FieldDefinition } from '../FormRenderer.vue'

interface GeoData {
  latitude: number
  longitude: number
  accuracy?: number
}

defineProps<{
  field: FieldDefinition
  modelValue: GeoData | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: GeoData | null]
}>()

const loading = ref(false)
const errorMsg = ref('')

function getCurrentPosition() {
  if (!navigator.geolocation) {
    errorMsg.value = '您的浏览器不支持地理定位功能'
    return
  }

  loading.value = true
  errorMsg.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      emit('update:modelValue', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      })
      loading.value = false
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg.value = '用户拒绝了定位请求'
          break
        case error.POSITION_UNAVAILABLE:
          errorMsg.value = '位置信息不可用'
          break
        case error.TIMEOUT:
          errorMsg.value = '定位请求超时'
          break
        default:
          errorMsg.value = '获取位置失败'
      }
      loading.value = false
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  )
}
</script>

<style scoped>
.geo-field {
  width: 100%;
}

.geo-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
}

.geo-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.geo-icon {
  font-size: 20px;
  color: #1677ff;
  flex-shrink: 0;
}

.geo-coords {
  font-size: 14px;
  color: #303133;
  font-family: 'Consolas', 'Monaco', monospace;
}

.geo-placeholder {
  font-size: 14px;
  color: #c0c4cc;
}

.geo-error {
  margin-top: 8px;
  font-size: 12px;
  color: #f56c6c;
}

.geo-info :deep(.el-button--primary) {
  background-color: #1677ff;
  border-color: #1677ff;
  flex-shrink: 0;
}
</style>