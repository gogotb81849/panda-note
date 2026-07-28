<template>
  <nav class="mobile-bottom-nav">
    <div class="nav-tabs">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="nav-tab"
        :class="{ active: isActive(item.path) }"
        @click="navigateTo(item.path)"
      >
        <div class="nav-tab-inner">
          <div class="nav-icon-wrapper">
            <component :is="item.icon" class="nav-icon" />
            <span v-if="item.badge" class="badge">{{ item.badge }}</span>
          </div>
          <span class="nav-label">{{ item.label }}</span>
        </div>
        <div class="nav-indicator"></div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, h, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// SVG图标组件（线条更细：stroke-width 2 → 1.5）
const Icons = {
  Home: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
    h('polyline', { points: '9,22 9,12 15,12 15,22' }),
  ]),
  Dashboard: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('rect', { x: '3', y: '3', width: '7', height: '7', rx: '1' }),
    h('rect', { x: '14', y: '3', width: '7', height: '7', rx: '1' }),
    h('rect', { x: '3', y: '14', width: '7', height: '7', rx: '1' }),
    h('rect', { x: '14', y: '14', width: '7', height: '7', rx: '1' }),
  ]),
  Ship: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M2 21c.8-.4 1.5-.8 2.3-1.1 1.5-.7 3.2-1 4.9-.9 1.7.1 3.4.6 5 1.4 1.6.8 3.4 1.2 5.2 1 1.8-.2 3.5-.9 5-2' }),
    h('path', { d: 'M6 15V9c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v6' }),
    h('path', { d: 'M12 7V3' }),
    h('path', { d: 'M8 3h8' }),
  ]),
  Diary: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M12 20h9' }),
    h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' }),
  ]),
  Calendar: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' }),
    h('line', { x1: '16', y1: '2', x2: '16', y2: '6' }),
    h('line', { x1: '8', y1: '2', x2: '8', y2: '6' }),
    h('line', { x1: '3', y1: '10', x2: '21', y2: '10' }),
  ]),
  WorkLog: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }),
    h('path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' }),
    h('line', { x1: '8', y1: '7', x2: '16', y2: '7' }),
    h('line', { x1: '8', y1: '11', x2: '16', y2: '11' }),
    h('line', { x1: '8', y1: '15', x2: '12', y2: '15' }),
  ]),
  Folder: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' }),
  ]),
  AI: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M12 2a10 10 0 1 0 10 10H12V2z' }),
    h('path', { d: 'M20.66 9A10 10 0 0 0 14 2.05V10h8.46' }),
  ]),
}

interface NavItem {
  path: string
  label: string
  icon: Component
  badge?: number
}

const navItems: NavItem[] = [
  { path: '/', label: '首页', icon: Icons.Home },
  { path: '/dashboard', label: '看板', icon: Icons.Dashboard },
  { path: '/ships', label: '船舶', icon: Icons.Ship },
  { path: '/work-log', label: '工作日志', icon: Icons.WorkLog },
  { path: '/files', label: '文件', icon: Icons.Folder },
  { path: '/ai-report', label: 'AI简报', icon: Icons.AI },
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const navigateTo = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
  display: none;
  /* 华为 MatePad Mini 竖屏适配：增加底部安全区域，避免系统拖拉条遮挡 */
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
}

/* 仅在手机设备上显示底部导航（平板有自己的导航栏） */
.device-phone .mobile-bottom-nav {
  display: block;
}

.nav-tabs {
  display: flex;
  align-items: stretch;
  height: 72px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.nav-tabs::-webkit-scrollbar {
  display: none;
}

.nav-tab {
  flex: 1;
  min-width: 64px;
  max-width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  color: #1f1f1f;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-tab-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.nav-icon-wrapper {
  position: relative;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 26px;
  height: 26px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: all 0.25s ease;
}

.badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ff4d4f;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  animation: badge-pulse 2s infinite;
}

@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 点击反馈动画 */
.nav-tab:active {
  transform: scale(0.92);
}

.nav-tab:active .nav-icon {
  transform: scale(0.85);
}

/* 选中状态 */
.nav-tab.active {
  color: #409eff;
}

.nav-tab.active .nav-icon {
  transform: translateY(-2px) scale(1.1);
  filter: drop-shadow(0 2px 6px rgba(64, 158, 255, 0.4));
}

.nav-tab.active .nav-label {
  color: #409eff;
  font-weight: 600;
}

/* 底部指示条 */
.nav-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #66b1ff);
  border-radius: 2px 2px 0 0;
  transform: translateX(-50%);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-tab.active .nav-indicator {
  width: 32px;
}

/* 涟漪效果 */
.nav-tab::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(64, 158, 255, 0.15);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.4s ease, height 0.4s ease, opacity 0.4s ease;
  opacity: 0;
}

.nav-tab:active::after {
  width: 120%;
  height: 120%;
  opacity: 1;
  transition: width 0s, height 0s, opacity 0s;
}

/* 横屏平板适配 */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
  .nav-tabs {
    height: 64px;
  }
  .nav-icon {
    width: 24px;
    height: 24px;
  }
  .nav-label {
    font-size: 11px;
  }
}

/* 竖屏平板适配 - 华为 MatePad Mini 重点优化 */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .mobile-bottom-nav {
    /* 增加底部安全区域，避免系统拖拉条遮挡 */
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  }
  
  .nav-tabs {
    height: 80px;
  }
  .nav-icon {
    width: 28px;
    height: 28px;
  }
  .nav-label {
    font-size: 13px;
    line-height: 1.3;
    /* 防止文字叠加和跨行 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 华为 MatePad Mini 竖屏专属优化 */
@media (min-width: 800px) and (max-width: 900px) and (orientation: portrait) {
  .mobile-bottom-nav {
    /* 华为 MatePad Mini 竖屏半尺寸约 800x1280，增加底部间距 */
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
  }
  
  .nav-tabs {
    height: 84px;
  }
  
  .nav-tab {
    padding: 10px 4px;
  }
  
  .nav-icon-wrapper {
    width: 30px;
    height: 30px;
  }
  
  .nav-icon {
    width: 28px;
    height: 28px;
  }
  
  .nav-label {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    /* 确保文字不叠加 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
