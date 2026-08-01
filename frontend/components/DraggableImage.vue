<template>
  <div
    ref="wrapperRef"
    class="draggable-image-wrapper"
    :class="{ dragging: isDragging, selected: isSelected }"
    :style="wrapperStyle"
    @mousedown="onMouseDown"
    @click.stop="onSelect"
    @dblclick.stop="onDblClick"
  >
    <img
      :src="src"
      class="draggable-img"
      :style="{ transform: `rotate(${rotation}deg)` }"
      draggable="false"
    />

    <!-- 缩放句柄（右下角） -->
    <div
      v-if="isSelected"
      class="resize-handle"
      @mousedown.stop="onResizeStart"
    ></div>

    <!-- 旋转句柄（上方） -->
    <div
      v-if="isSelected"
      class="rotate-handle"
      @mousedown.stop="onRotateStart"
    ></div>

    <!-- 工具栏 -->
    <div v-if="isSelected" class="img-toolbar" @mousedown.stop>
      <button class="tool-btn" @click="rotateImage(-90)" title="左转90°">↺</button>
      <button class="tool-btn" @click="rotateImage(90)" title="右转90°">↻</button>
      <button class="tool-btn" @click="zoomImage(0.8)" title="缩小">−</button>
      <button class="tool-btn" @click="zoomImage(1.25)" title="放大">+</button>
      <button class="tool-btn reset-btn" @click="resetTransform" title="重置">⟲</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  src: string
  initialX?: number
  initialY?: number
  initialScale?: number
  initialRotation?: number
}>()

const emit = defineEmits<{
  'update:transform': [data: { x: number; y: number; scale: number; rotation: number }]
}>()

const wrapperRef = ref<HTMLElement | null>(null)
const isSelected = ref(false)

const x = ref(props.initialX || 0)
const y = ref(props.initialY || 0)
const scale = ref(props.initialScale || 1)
const rotation = ref(props.initialRotation || 0)

// 拖拽状态
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let dragStartPosX = 0
let dragStartPosY = 0

// 缩放状态
let isResizing = false
let resizeStartDist = 0
let resizeStartScale = 1

// 旋转状态
let isRotating = false
let rotateStartAngle = 0
let rotateStartRotation = 0

const wrapperStyle = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px)`,
  width: `${scale.value * 100}%`,
}))

// === 拖拽 ===
function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  isSelected.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartPosX = x.value
  dragStartPosY = y.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    x.value = dragStartPosX + (e.clientX - dragStartX)
    y.value = dragStartPosY + (e.clientY - dragStartY)
    emitTransform()
  } else if (isResizing) {
    const wrapper = wrapperRef.value
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY)
    const ratio = dist / resizeStartDist
    scale.value = Math.max(0.2, Math.min(5, resizeStartScale * ratio))
    emitTransform()
  } else if (isRotating) {
    const wrapper = wrapperRef.value
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
    rotation.value = rotateStartRotation + (angle - rotateStartAngle)
    emitTransform()
  }
}

function onMouseUp() {
  isDragging.value = false
  isResizing = false
  isRotating = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

// === 缩放句柄 ===
function onResizeStart(e: MouseEvent) {
  isResizing = true
  const wrapper = wrapperRef.value
  if (!wrapper) return
  const rect = wrapper.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  resizeStartDist = Math.hypot(e.clientX - centerX, e.clientY - centerY)
  resizeStartScale = scale.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// === 旋转句柄 ===
function onRotateStart(e: MouseEvent) {
  isRotating = true
  const wrapper = wrapperRef.value
  if (!wrapper) return
  const rect = wrapper.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  rotateStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
  rotateStartRotation = rotation.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// === 工具栏操作 ===
function rotateImage(deg: number) {
  rotation.value += deg
  emitTransform()
}

function zoomImage(factor: number) {
  scale.value = Math.max(0.2, Math.min(5, scale.value * factor))
  emitTransform()
}

function resetTransform() {
  x.value = 0
  y.value = 0
  scale.value = 1
  rotation.value = 0
  emitTransform()
}

function onSelect() {
  isSelected.value = true
}

function onDblClick() {
  // 双击重置
  resetTransform()
}

function emitTransform() {
  emit('update:transform', {
    x: x.value,
    y: y.value,
    scale: scale.value,
    rotation: rotation.value,
  })
}

// 点击外部取消选中
function onDocClick(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    isSelected.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})

// 暴露方法供父组件调用
defineExpose({
  getTransform: () => ({ x: x.value, y: y.value, scale: scale.value, rotation: rotation.value }),
  setTransform: (data: { x: number; y: number; scale: number; rotation: number }) => {
    x.value = data.x
    y.value = data.y
    scale.value = data.scale
    rotation.value = data.rotation
  },
})
</script>

<style scoped>
.draggable-image-wrapper {
  position: relative;
  display: inline-block;
  max-width: 100%;
  cursor: move;
  user-select: none;
  transition: outline 0.15s;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.draggable-image-wrapper.selected {
  outline-color: #409eff;
}

.draggable-image-wrapper.dragging {
  opacity: 0.85;
  z-index: 100;
}

.draggable-img {
  width: 100%;
  display: block;
  border-radius: 6px;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.resize-handle {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 14px;
  height: 14px;
  background: #409eff;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: nwse-resize;
  z-index: 10;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.rotate-handle {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 14px;
  background: #67c23a;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: grab;
  z-index: 10;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.rotate-handle::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 10px;
  background: #67c23a;
}

.rotate-handle:active {
  cursor: grabbing;
}

.img-toolbar {
  position: absolute;
  top: -32px;
  right: 0;
  display: flex;
  gap: 2px;
  background: rgba(64, 158, 255, 0.95);
  border-radius: 6px;
  padding: 2px;
  z-index: 20;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.tool-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.tool-btn.reset-btn {
  font-size: 12px;
}
</style>
