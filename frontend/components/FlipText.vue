<template>
  <div class="flip-text" :style="{ fontSize }">
    <div v-for="(char, index) in paddedChars" :key="`${index}-${char}`" class="flip-text__char-wrapper">
      <FlipDigit :value="char" :width="digitWidth" :height="height" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FlipDigit from './FlipDigit.vue'

const props = defineProps<{
  value: string
  maxLength?: number
  fontSize?: string
  digitWidth?: number
  height?: string
  bgColor?: string
  textColor?: string
}>()

const displayValue = computed(() => {
  const val = props.value || ''
  if (props.maxLength && val.length > props.maxLength) {
    return val.slice(0, props.maxLength)
  }
  return val
})

const paddedChars = computed(() => {
  const chars = displayValue.value.split('')
  if (props.maxLength && chars.length < props.maxLength) {
    while (chars.length < props.maxLength) {
      chars.push(' ')
    }
  }
  return chars
})

const digitWidth = computed(() => props.digitWidth || 14)
const height = computed(() => props.height || '20px')
const fontSize = computed(() => props.fontSize || '13px')
const computedColor = computed(() => props.textColor || '#e0e0e0')
const computedBg = computed(() => props.bgColor || 'transparent')
const computedPadding = computed(() => props.bgColor ? '2px 4px' : '0')
const computedRadius = computed(() => props.bgColor ? '3px' : '0')
</script>

<style scoped>
.flip-text {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  font-family: 'Courier New', monospace;
  color: v-bind(computedColor);
  background: v-bind(computedBg);
  padding: v-bind(computedPadding);
  border-radius: v-bind(computedRadius);
}

.flip-text__char-wrapper {
  display: inline-flex;
}
</style>
