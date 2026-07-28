<template>
  <!-- 强制更新弹窗 (major 版本不同) -->
  <el-dialog
    v-if="updateType === 'required'"
    v-model="dialogVisible"
    title="🔄 版本更新"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="update-prompt required">
      <div class="update-icon">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3>发现重要版本更新</h3>
      <p class="update-message">{{ updateMessage }}</p>
      <div class="version-info">
        <div class="version-row">
          <span class="label">当前版本:</span>
          <span class="value old">{{ currentVersion }}</span>
        </div>
        <div class="version-row">
          <span class="label">最新版本:</span>
          <span class="value new">{{ serverVersion }}</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="handleUpdate" size="large">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        立即更新
      </el-button>
    </template>
  </el-dialog>

  <!-- 建议更新横幅 (minor 版本不同) -->
  <transition name="slide-down">
    <div v-if="updateType === 'recommended' && showBanner" class="update-banner recommended">
      <div class="banner-content">
        <svg class="w-5 h-5 banner-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="banner-text">
          <strong>新版本可用:</strong> v{{ serverVersion }} 已发布，{{ updateMessage }}
        </span>
      </div>
      <div class="banner-actions">
        <el-button size="small" @click="handleUpdate" type="warning">立即更新</el-button>
        <el-button size="small" link @click="dismissBanner">稍后更新</el-button>
      </div>
    </div>
  </transition>

  <!-- 可选更新指示器 (patch 版本不同) -->
  <el-tooltip v-if="updateType === 'optional'" content="有新版本可用" placement="bottom">
    <div class="optional-update-indicator" @click="handleUpdate">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span class="indicator-version">v{{ serverVersion }}</span>
    </div>
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

// ⚠️ 版本比较工具：4 段式语义化比较，只在 server > client 时返回需要更新
//    避免字符串比较导致的"1.1.0.00010" < "1.1.0.0009" 错误
const versionGte = (a: string, b: string): boolean => {
  const parse = (v: string): number[] =>
    v.replace(/^v/, '').trim()
      .split('.')
      .map(p => {
        const n = parseInt(p, 10)
        return Number.isFinite(n) ? n : 0
      })
  const pa = parse(a || '0')
  const pb = parse(b || '0')
  for (let i = 0; i < 4; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va > vb) return true
    if (va < vb) return false
  }
  return true // a === b
}

const { currentVersion, serverVersion, updateAvailable, updateType, updateMessage, checkVersionUpdate } = useVersion()

const dialogVisible = ref(false)
const showBanner = ref(false)

// 记录用户已忽略的最高版本，避免重复提示同一版本
const getIgnoredVersion = (): string => {
  return localStorage.getItem('updateIgnoredVersion') || ''
}

const setIgnoredVersion = (version: string) => {
  localStorage.setItem('updateIgnoredVersion', version)
}

const handleUpdate = async () => {
  // 记录当前服务器版本，避免刷新后重复提示
  if (serverVersion.value) {
    setIgnoredVersion(serverVersion.value)
  }

  // 清除 Service Worker 缓存
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      registration.unregister()
    }
  }

  // 清除 HTTP 缓存
  if ('caches' in window) {
    const names = await caches.keys()
    for (const name of names) {
      await caches.delete(name)
    }
  }

  // 不清除 localStorage 和 sessionStorage，保留用户状态
  // 使用带 cache-busting 的方式刷新
  const url = new URL(window.location.href)
  url.searchParams.set('_t', Date.now().toString())
  window.location.href = url.toString()
}

const checkUpdate = async () => {
  const result = await checkVersionUpdate()
  if (result && result.needsUpdate) {
    // 检查当前提示的版本是否已经被用户忽略
    const ignored = getIgnoredVersion()
    // 修复：使用语义化版本比较，避免字符串比较导致的错误
    // 如果服务器版本 <= 已忽略版本，不提示（用户已经见过这个或更新的版本）
    if (ignored && !versionGte(result.currentVersion, ignored)) {
      console.log(`[VersionUpdate] 版本 ${result.currentVersion} 已被忽略，不重复提示`)
      return
    }
    
    if (result.updateType === 'required') {
      dialogVisible.value = true
    } else if (result.updateType === 'recommended') {
      showBanner.value = true
    }
    // optional 类型只显示小指示器
  }
}

// 当用户点击"稍后更新"时，记录当前看到的版本
const dismissBanner = () => {
  if (serverVersion.value) {
    setIgnoredVersion(serverVersion.value)
  }
  showBanner.value = false
}

onMounted(() => {
  checkUpdate()
})
</script>

<style scoped>
/* 强制更新弹窗样式 */
.update-prompt {
  text-align: center;
  padding: 20px 0;
}

.update-prompt .update-icon {
  color: #f56c6c;
  margin-bottom: 16px;
}

.update-prompt h3 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #1a1a1a;
}

.update-prompt .update-message {
  margin: 0 0 20px;
  color: #606266;
  font-size: 14px;
}

.version-info {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  display: inline-block;
  text-align: left;
}

.version-row {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 8px;
}

.version-row:last-child {
  margin-bottom: 0;
}

.version-row .label {
  color: #909399;
  font-size: 13px;
}

.version-row .value {
  font-weight: 600;
  font-size: 14px;
  font-family: monospace;
}

.version-row .value.old {
  color: #909399;
}

.version-row .value.new {
  color: #67c23a;
}

/* 建议更新横幅样式 */
.update-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e65100;
}

.banner-icon {
  flex-shrink: 0;
}

.banner-text {
  font-size: 14px;
}

.banner-text strong {
  font-weight: 600;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 可选更新指示器样式 */
.optional-update-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  background-color: #e8f5e9;
  color: #2e7d32;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  user-select: none;
}

.optional-update-indicator:hover {
  background-color: #c8e6c9;
}

.indicator-version {
  font-family: monospace;
  font-weight: 500;
}

/* 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
