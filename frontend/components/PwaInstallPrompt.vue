<template>
  <div v-if="showInstallButton" class="pwa-install-prompt">
    <span class="pwa-install-text">安装熊猫笔记到桌面</span>
    <el-button type="primary" size="small" @click="install">
      立即安装
    </el-button>
    <el-button link size="small" @click="dismiss">
      ✕
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const deferredPrompt = ref<any>(null)
const showInstallButton = ref(false)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallButton.value = true
  })
})

const install = async () => {
  if (!deferredPrompt.value) return

  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  console.log(`用户 ${outcome === 'accepted' ? '接受' : '拒绝'} 安装PWA`)

  deferredPrompt.value = null
  showInstallButton.value = false
}

const dismiss = () => {
  showInstallButton.value = false
}
</script>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  animation: slideUp 0.3s ease;
}

.pwa-install-text {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 768px) {
  .pwa-install-prompt {
    bottom: 70px;
    left: 16px;
    right: 16px;
    transform: none;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
