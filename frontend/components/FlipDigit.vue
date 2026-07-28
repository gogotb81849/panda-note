<template>
  <div class="flip-digit" :style="{ width: charWidth, height: height }">
    <!-- Static bottom half (new value) -->
    <div class="flip-digit__static">
      <span class="flip-digit__text flip-digit__text--bottom">{{ displayValue }}</span>
    </div>
    <!-- Animated top half - current value -->
    <div class="flip-digit__top" :class="{ 'flip-digit__top--flipping': isFlipping }">
      <span class="flip-digit__text flip-digit__text--top">{{ oldValue }}</span>
    </div>
    <!-- Animated bottom half - new value flips down -->
    <div
      class="flip-digit__bottom"
      :class="{ 'flip-digit__bottom--flipping': isFlipping }"
    >
      <span class="flip-digit__text flip-digit__text--bottom">{{ displayValue }}</span>
    </div>
    <!-- Line separator -->
    <div class="flip-digit__line"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  value: string | number
  width?: number
  height?: string
  animationDuration?: number
}>()

const charWidth = computed(() => props.width ? `${props.width}px` : '16px')
const height = computed(() => props.height || '22px')

const displayValue = computed(() => String(props.value).slice(0, 1) || ' ')

const oldValue = ref(displayValue.value)
const prevValue = ref(displayValue.value)
const isFlipping = ref(false)

watch(
  () => props.value,
  (newVal, oldVal) => {
    const newChar = String(newVal).slice(0, 1) || ' '
    const oldChar = String(oldVal).slice(0, 1) || ' '
    if (newChar !== oldChar) {
      oldValue.value = oldChar
      isFlipping.value = true
      setTimeout(() => {
        isFlipping.value = false
      }, props.animationDuration || 600)
    }
  }
)
</script>

<style scoped>
.flip-digit {
  position: relative;
  display: inline-block;
  background: #1a1a2e;
  border-radius: 3px;
  overflow: hidden;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: bold;
  color: #e0e0e0;
  text-align: center;
  line-height: v-bind(height);
}

.flip-digit__static {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  z-index: 1;
}

.flip-digit__top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 50%;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background: #16213e;
  z-index: 2;
  transform-origin: bottom;
  transition: transform 0.6s ease-in;
}

.flip-digit__top--flipping {
  transform: rotateX(-90deg);
}

.flip-digit__bottom {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-start;
  overflow: hidden;
  background: #1a1a2e;
  z-index: 2;
  transform-origin: top;
  transform: rotateX(90deg);
  transition: transform 0.6s ease-in;
}

.flip-digit__bottom--flipping {
  transform: rotateX(0deg);
}

.flip-digit__text {
  display: block;
  width: 100%;
  text-align: center;
}

.flip-digit__text--top {
  transform: translateY(50%);
}

.flip-digit__text--bottom {
  transform: translateY(-50%);
}

.flip-digit__line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(0, 0, 0, 0.4);
  z-index: 3;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
