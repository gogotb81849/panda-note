<template>
  <div class="admin-page">
    <div class="page-header">
      <el-button text @click="navigateTo('/')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h2 class="page-title">系统管理</h2>
      <div class="header-actions">
        <!-- 切换账号按钮 -->
        <el-dropdown trigger="click" @command="handleSwitchAccount" @visible-change="onDropdownVisibleChange">
          <el-button text class="switch-account-btn">
            <el-icon><Switch /></el-icon>
            <span>切换账号</span>
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu class="switch-account-menu">
              <!-- 切换回管理员 -->
              <el-dropdown-item command="back" v-if="authStore.user?.role !== 'admin'" divided>
                <el-icon><Back /></el-icon>
                切换回系统管理员
              </el-dropdown-item>
              <!-- 按角色分组的用户列表 -->
              <template v-for="(users, role) in usersByRole" :key="role">
                <template v-if="role !== 'admin'">
                  <!-- 角色标题行，点击展开/折叠 -->
                  <div class="role-group-item">
                    <div class="role-group-header" @click.stop="toggleRoleGroup(role)">
                      <el-icon><User /></el-icon>
                      <span>{{ getRoleLabel(role) }}（{{ users.length }}人）</span>
                      <el-icon class="expand-arrow" :class="{ expanded: expandedRoles.includes(role) }"><ArrowRight /></el-icon>
                    </div>
                    <div v-show="expandedRoles.includes(role)" class="role-users-list">
                      <el-dropdown-item
                        v-for="user in users"
                        :key="user.id"
                        :command="`${user.id}:${user.role}`"
                        :class="{ 'is-current': authStore.user?.id === user.id }"
                      >
                        {{ user.realName }} <span class="user-team">{{ user.teamCode?.replace('team', 'T') || '' }}</span>
                      </el-dropdown-item>
                    </div>
                  </div>
                </template>
              </template>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 退出登录按钮 -->
        <el-popconfirm title="确定要退出登录吗？" @confirm="handleLogout">
          <template #reference>
            <el-button text class="logout-btn">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>
    <div class="modules-grid">
      <NuxtLink to="/ships" class="module-card">
        <div class="module-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">船舶资料</h3>
          <p class="module-desc">管理船舶信息</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>
      
      <NuxtLink to="/dict" class="module-card">
        <div class="module-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">字典管理</h3>
          <p class="module-desc">管理系统字典数据</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>
      
      <NuxtLink to="/operation-log" class="module-card">
        <div class="module-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">操作日志</h3>
          <p class="module-desc">查看系统操作记录</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>
      
      <!-- 仅管理员可见：用户管理 -->
      <NuxtLink v-if="isAdmin" to="/accounts" class="module-card">
        <div class="module-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">用户管理</h3>
          <p class="module-desc">管理系统用户和权限</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/export" class="module-card">
        <div class="module-icon" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">数据导入导出</h3>
          <p class="module-desc">导出系统数据备份</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/monitor" class="module-card">
        <div class="module-icon" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">系统监控</h3>
          <p class="module-desc">查看系统运行状态</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/settings/shortcuts" class="module-card">
        <div class="module-icon" style="background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">快捷键设置</h3>
          <p class="module-desc">自定义全局快捷键</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>
      
      <NuxtLink to="/admin/staff-assignments" class="module-card">
        <div class="module-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">人员派任</h3>
          <p class="module-desc">政委上船/下船/休假甘特图管理</p>
        </div>
        <div class="module-action">
          <span class="enter-btn">进入</span>
        </div>
      </NuxtLink>

      <div class="module-card disabled">
        <div class="module-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div class="module-info">
          <h3 class="module-title">数据导入</h3>
          <p class="module-desc">批量导入船舶和人员数据</p>
        </div>
        <div class="module-action">
          <span class="enter-btn disabled-btn">开发中</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Switch, SwitchButton, Back, User, ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')

// 切换账号相关
const usersByRole = ref<Record<string, Array<{ id: number; username: string; realName: string; teamCode: string }>>>({})
const usersByRoleLoaded = ref(false)
const expandedRoles = ref<string[]>([])

const toggleRoleGroup = (role: string) => {
  const idx = expandedRoles.value.indexOf(role)
  if (idx >= 0) {
    expandedRoles.value.splice(idx, 1)
  } else {
    expandedRoles.value.push(role)
  }
}

// 加载用户列表
const loadUsersByRole = async () => {
  if (!isAdmin.value || usersByRoleLoaded.value) return
  usersByRole.value = await authStore.fetchUsersByRole()
  usersByRoleLoaded.value = true
}

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: '系统管理员',
    company_admin: '油轮船管部',
    general_manager: '总管团队',
    shore_crew_supervisor: '岸基船工主管',
    shore_marine_supervisor: '岸基海务主管',
    shore_engineer_supervisor: '岸基机务主管',
    shore_electric_supervisor: '岸基电气主管',
    ship_political_instructor: '船舶政委',
  }
  return labels[role] || role
}

const onDropdownVisibleChange = (visible: boolean) => {
  if (visible) {
    loadUsersByRole()
  }
}

const handleSwitchAccount = async (cmd: string) => {
  try {
    const parts = cmd.split(':')
    if (parts[0] === 'back') {
      await authStore.switchRole('admin')
    } else {
      const userId = Number(parts[0])
      const role = parts[1]
      if (isNaN(userId) || !role) {
        ElMessage.error('无效的用户ID或角色')
        return
      }
      const success = await authStore.switchRole(role, userId)
      if (!success) {
        ElMessage.error('切换用户失败')
      }
    }
  } catch (error) {
    ElMessage.error('切换异常: ' + (error as Error).message)
  }
}

const handleLogout = () => {
  authStore.logout()
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.switch-account-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
}

.switch-account-btn:hover {
  color: #337ecc;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #f56c6c;
}

.logout-btn:hover {
  color: #e04040;
}

.admin-page {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.module-card:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.module-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.module-desc {
  margin: 0;
  font-size: 13px;
  color: #808080;
}

.module-action {
  flex-shrink: 0;
}

.enter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  background: #409eff;
  color: white;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.module-card:hover:not(.disabled) .enter-btn {
  background: #337ecc;
}

.disabled-btn {
  background: #909399 !important;
  cursor: not-allowed !important;
}
</style>

<style>
/* 切换账号菜单样式（非scoped） */
.switch-account-menu {
  min-width: 240px;
  max-height: 280px;
  overflow-y: auto;
}

.role-group-item {
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.role-group-item:last-child {
  border-bottom: none;
}

.role-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  background: #f8f9fa;
  cursor: pointer;
}

.role-group-header .el-icon {
  color: #909399;
}

.expand-arrow {
  margin-left: auto;
  transition: transform 0.2s;
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

.role-users-list {
  padding: 2px 0;
}

.role-users-list .el-dropdown-menu__item {
  padding: 6px 16px 6px 36px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.role-users-list .el-dropdown-menu__item:hover {
  background-color: #ecf5ff;
}

.role-users-list .el-dropdown-menu__item.is-current {
  color: #409eff;
  font-weight: 600;
}

.user-team {
  font-size: 11px;
  color: #909399;
  margin-left: 6px;
}
</style>
