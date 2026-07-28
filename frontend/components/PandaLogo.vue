<template>
  <div class="panda-logo" :class="{ small, tiny, large }">
    <img src="/logo.png" :alt="appName" class="logo-image" :class="{ 'is-white': white }" />
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig } from 'nuxt/app';

const config = useRuntimeConfig();
const appName = config.public.appName || '熊猫笔记';

withDefaults(defineProps<{
  small?: boolean
  tiny?: boolean
  large?: boolean
  white?: boolean
}>(), {
  small: false,
  tiny: false,
  large: false,
  white: false
});
</script>

<style scoped>
.panda-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.panda-logo.small {
  width: 88px;
  height: 88px;
}

.panda-logo.tiny {
  width: 40px;
  height: 40px;
}

.panda-logo:not(.small):not(.tiny):not(.large) {
  width: 80px;
  height: 80px;
}

.panda-logo.large {
  width: 240px;
  height: 240px;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* 白色版本 */
.logo-image.is-white {
  filter: brightness(0) invert(1);
}
</style>
