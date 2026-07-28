<template>
  <div class="signature-field">
    <div class="signature-pad-container">
      <canvas
        ref="canvasRef"
        class="signature-canvas"
        @mousedown="startDraw"
        @mousemove="draw"
        @mouseup="endDraw"
        @mouseleave="endDraw"
        @touchstart.prevent="startTouch"
        @touchmove.prevent="touchDraw"
        @touchend="endDraw"
      />
      <div class="signature-placeholder" v-if="!hasContent && !isDrawing">
        请在此处签名
      </div>
    </div>
    <div class="signature-actions">
      <el-button size="small" text type="primary" @click="clearCanvas">
        清除
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import type { FieldDefinition } from '../FormRenderer.vue'

const props = defineProps<{
  field: FieldDefinition
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const canvasRef = ref<HTMLCanvasElement>()
const isDrawing = ref(false)
const hasContent = ref(false)

function initCanvas() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * 2
  canvas.height = rect.height * 2
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(2, 2)
    ctx.strokeStyle = '#303133'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
}

function getPos(e: MouseEvent | Touch) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function startDraw(e: MouseEvent) {
  isDrawing.value = true
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  const pos = getPos(e)
  ctx.beginPath()
  ctx.moveTo(pos.x, pos.y)
}

function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  const pos = getPos(e)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
}

function startTouch(e: TouchEvent) {
  if (e.touches.length === 1) {
    const touch = e.touches[0]
    isDrawing.value = true
    const ctx = canvasRef.value?.getContext('2d')
    if (!ctx) return
    const pos = getPos(touch)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }
}

function touchDraw(e: TouchEvent) {
  if (!isDrawing.value || e.touches.length !== 1) return
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  const pos = getPos(e.touches[0])
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
}

function endDraw() {
  if (isDrawing.value) {
    isDrawing.value = false
    hasContent.value = true
    const dataUrl = canvasRef.value?.toDataURL('image/png')
    emit('update:modelValue', dataUrl || null)
  }
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  hasContent.value = false
  emit('update:modelValue', null)
}

onMounted(() => {
  nextTick(() => {
    initCanvas()
  })
})

watch(() => props.modelValue, (val) => {
  if (!val) {
    hasContent.value = false
  }
})
</script>

<style scoped>
.signature-field {
  width: 100%;
}

.signature-pad-container {
  position: relative;
  width: 100%;
  height: 180px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.signature-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  display: block;
}

.signature-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  color: #c0c4cc;
  pointer-events: none;
  user-select: none;
}

.signature-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.signature-actions :deep(.el-button) {
  color: #1677ff;
}
</style>