<template>
  <div class="admin-dashboard">
    <h2 class="page-title">系统管理</h2>
    <p class="page-subtitle">管理系统的各项配置与权限</p>

    <div class="admin-cards">
      <div class="admin-card" @click="navCard('/admin/menu-config')">
        <div class="card-icon" style="background: #e8f4fd;">
          <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <div class="card-content">
          <h3>菜单权限配置</h3>
          <p>配置各角色可见的菜单和功能模块</p>
        </div>
        <span class="card-arrow">→</span>
      </div>

      <div class="admin-card" @click="navCard('/admin/monitor')">
        <div class="card-icon" style="background: #e8f5e9;">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div class="card-content">
          <h3>运维监控</h3>
          <p>查看服务状态、资源使用和日志</p>
        </div>
        <span class="card-arrow">→</span>
      </div>

      <div class="admin-card" @click="navCard('/admin/export')">
        <div class="card-icon" style="background: #fff3e0;">
          <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div class="card-content">
          <h3>数据导出</h3>
          <p>导出系统数据、报表和统计信息</p>
        </div>
        <span class="card-arrow">→</span>
      </div>

      <div class="admin-card" @click="navCard('/admin/ops')">
        <div class="card-icon" style="background: #f3e5f5;">
          <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div class="card-content">
          <h3>系统设置</h3>
          <p>配置系统参数和运行环境</p>
        </div>
        <span class="card-arrow">→</span>
      </div>

      <div class="admin-card" @click="navCard('/admin/staff-assignments')">
        <div class="card-icon" style="background: #e3f2fd;">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="card-content">
          <h3>人员派任</h3>
          <p>管理政委上船登记、下船登记和休假管理</p>
        </div>
        <span class="card-arrow">→</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
definePageMeta({
  middleware: 'auth',
})

// 卡片导航：兼容平板/移动端触摸
const _navLock = ref(false)
const navCard = (path: string) => {
  if (_navLock.value) return
  _navLock.value = true
  try {
    navigateTo(path)
  } finally {
    setTimeout(() => { _navLock.value = false }, 500)
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #999;
  margin-bottom: 32px;
}

.admin-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.admin-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
  z-index: 1;
  /* 移动端触摸友好 */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

.admin-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

/* 平板/移动端触摸反馈 */
.admin-card:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  pointer-events: none;
}

.card-content {
  flex: 1;
  pointer-events: none;
}

.card-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.card-content p {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.card-arrow {
  font-size: 20px;
  color: #ccc;
  flex-shrink: 0;
  pointer-events: none;
}
</style>