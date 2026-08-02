<!--
  admin.vue 已经包含卡片网格（/admin 根路由时显示），这里作为 Nuxt 嵌套路由默认子页面保留空模板即可。
  如果此文件包含卡片，/admin 时 NuxtPage 会再次渲染导致重复。
-->
<template>
  <div></div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})
</script>

<style scoped>
/* empty */
</style>
