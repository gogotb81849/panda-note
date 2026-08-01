<template>
  <div class="layout-container">
    <slot v-if="!authStore.isAuthenticated" />

    <template v-else>
      <header class="layout-header">
        <div class="header-content">
          <div class="header-left">
            <!-- 手机端汉堡菜单按钮 -->
            <button @click="mobileDrawerOpen = true" class="hamburger-btn">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button @click="toggleSidebar" class="sidebar-toggle-btn">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div class="logo-section">
              <div class="logo-wrapper">
                <PandaLogo tiny />
              </div>
              <div class="logo-text">
                <h1>熊猫笔记 <span style="font-size: 12px; color: #999; margin-left: 8px;">[{{ deviceType }}]</span></h1>
                <p>船舶政工智慧管理</p>
              </div>
            </div>
          </div>

          <div class="header-right">
            <!-- 全局搜索 -->
            <GlobalSearch class="header-search" />
            <!-- 管理员角色切换器（二级菜单：角色类型 → 具体用户） -->
            <el-dropdown v-if="isAdmin" trigger="click" @command="handleAdminCommand" @visible-change="onDropdownVisibleChange" class="admin-dropdown">
              <span class="role-switcher">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span v-if="authStore.user?.role !== 'admin'">
                  <span class="impersonate-label">以</span>{{ authStore.user?.realName }}<span class="impersonate-role">({{ roleLabel }})</span>
                </span>
                <span v-else>{{ roleLabel }}</span>
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu class="admin-role-menu">
                  <!-- 切换回管理员 -->
                  <el-dropdown-item command="back" v-if="authStore.user?.role !== 'admin'" divided>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    切换回系统管理员
                  </el-dropdown-item>
                  <!-- 按角色分组的用户列表 -->
                  <template v-for="(users, role) in usersByRole" :key="role">
                    <!-- 跳过 admin 角色（不显示管理员自己的列表） -->
                    <template v-if="role !== 'admin'">
                      <!-- 角色标题行，点击展开/折叠 -->
                      <div class="role-group-item">
                        <div class="role-group-header" @click.stop="toggleRoleGroup(role)">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{{ getRoleLabel(role) }}（{{ users.length }}人）</span>
                          <svg class="expand-arrow" :class="{ expanded: expandedRoles.includes(role) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                          </svg>
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

            <!-- 非管理员角色切换器（保持原有逻辑） -->
            <el-dropdown v-else-if="authStore.availableRoles.length > 1" trigger="click" @command="handleRoleSwitch">
              <span class="role-switcher">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>{{ roleLabel }}</span>
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="r in authStore.availableRoles"
                    :key="r"
                    :command="r"
                    :class="{ 'is-active': authStore.userRole === r }"
                  >
                    {{ getRoleLabel(r) }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <!-- 视图模式切换（仅管理员且桌面端可用） -->
            <button v-if="isAdmin && isDesktop" class="view-mode-toggle" @click="toggleViewMode" :title="isTabletMode ? '切换为桌面模式' : '切换为平板模式'">
              <svg v-if="!isTabletMode" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>

            <!-- 平板方向切换（仅桌面端平板模式下可见） -->
            <button v-if="isTabletMode && isDesktop" class="view-mode-toggle orientation-toggle" @click="toggleOrientation" :title="tabletOrientation === 'landscape' ? '切换竖屏' : '切换横屏'">
              <svg v-if="tabletOrientation === 'landscape'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14l4-4m0 0l4 4m-4-4v12m8-16l-4 4m4-4l-4 4m4 0v12" />
              </svg>
            </button>

            <!-- 离线状态紧凑指示器（平板模式显示） -->
            <div class="header-offline-status" :class="{ offline: !isOnline, syncing: isSyncing }">
              <div class="offline-indicator-dot" :class="{ offline: !isOnline }"></div>
              <div class="offline-divider"></div>
              <button class="offline-action-btn" @click="triggerSync" title="同步数据">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button class="offline-action-btn" @click="triggerManualUpdate" title="检查更新">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>

            <!-- 船名达人入口 -->
            <NuxtLink to="/training/ship-quiz" class="quiz-entry-btn" title="船名达人 - 船舶知识记忆训练">
              <span class="quiz-emoji">🚢</span>
              <span v-if="!isTabletMode" class="quiz-label">船名达人</span>
            </NuxtLink>

            <!-- 下载本地电脑版按钮（始终可见） -->
            <button class="offline-download-btn" @click="showOfflineDialog = true" title="下载数据到本地电脑（断网可用）">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>下载本地电脑版</span>
            </button>

            <!-- 通知铃铛 -->
            <el-popover
              v-if="authStore.isAuthenticated"
              trigger="click"
              placement="bottom-end"
              width="360"
              :show-arrow="false"
            >
              <template #reference>
                <div class="notification-bell" :class="{ 'has-unread': wsState.unreadCount.value > 0 }" @click="wsState.markAllAsRead()">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span v-if="wsState.unreadCount.value > 0" class="notification-badge">
                    {{ wsState.unreadCount.value > 99 ? '99+' : wsState.unreadCount.value }}
                  </span>
                </div>
              </template>
              <div class="notification-panel">
                <div class="notification-header">
                  <h3>通知中心</h3>
                  <el-button link type="primary" size="small" @click="wsState.clearNotifications()">清空</el-button>
                </div>
                <div v-if="wsState.notifications.value.length === 0" class="notification-empty">
                  <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>暂无通知</p>
                </div>
                <div v-else class="notification-list">
                  <div
                    v-for="item in wsState.notifications.value.slice(0, 20)"
                    :key="item.id"
                    class="notification-item"
                    :class="{ 'is-unread': !item.read }"
                    @click="wsState.markAsRead(item.id)"
                  >
                    <div class="notification-icon" :class="`type-${item.type}`">
                      <svg v-if="item.type === 'task_assigned'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <svg v-else-if="item.type === 'task_updated'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <svg v-else-if="item.type === 'comment_added'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <svg v-else-if="item.type === 'warning_triggered'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <svg v-else-if="item.type === 'meeting_processed'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div class="notification-content">
                      <div class="notification-title">
                        <span class="type-tag">{{ wsState.getTypeLabel(item.type) }}</span>
                        <span class="title-text">{{ item.title }}</span>
                      </div>
                      <p class="notification-message">{{ item.message }}</p>
                      <span class="notification-time">{{ formatTime(item.timestamp) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-popover>

            <!-- 用户头像下拉菜单 -->
            <el-dropdown trigger="click" @command="handleUserMenuCommand">
              <div class="user-info">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div class="user-details">
                  <p class="user-name">{{ authStore.user?.realName }}</p>
                  <p class="team-code">{{ teamCodeLabel }}</p>
                </div>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    个人信息
                  </el-dropdown-item>
                  <el-dropdown-item command="password">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    修改密码
                  </el-dropdown-item>
                  <el-dropdown-item command="offline">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    下载到本地
                  </el-dropdown-item>
                  <el-dropdown-item command="shortcuts">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    快捷键设置
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>

      <div class="offline-status-wrapper">
        <OfflineStatusBar />
      </div>

      <!-- 手机端抽屉侧边栏 -->
      <transition name="drawer">
        <div v-if="mobileDrawerOpen" class="mobile-drawer-overlay" @click="mobileDrawerOpen = false">
          <aside class="mobile-drawer" @click.stop>
            <div class="drawer-header">
              <div class="drawer-logo">
                <PandaLogo tiny />
                <span>熊猫笔记</span>
              </div>
              <button @click="mobileDrawerOpen = false" class="drawer-close">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="drawer-content">
              <!-- 手机端搜索框 -->
              <div class="drawer-search">
                <GlobalSearch />
              </div>
              <nav class="nav-menu">
                <NuxtLink v-for="item in menuItems" :key="item.path" :to="item.path" class="nav-item" :class="{ active: isActive(item.path) }" @click="mobileDrawerOpen = false">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="item.icon === 'calendar'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    <path v-else-if="item.icon === 'search'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <path v-else-if="item.icon === 'ship'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    <path v-else-if="item.icon === 'user'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    <path v-else-if="item.icon === 'flow'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    <path v-else-if="item.icon === 'case'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    <path v-else-if="item.icon === 'files'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path v-else-if="item.icon === 'dict'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    <path v-else-if="item.icon === 'ai'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    <path v-else-if="item.icon === 'log'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path v-else-if="item.icon === 'diary'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    <path v-else-if="item.icon === 'data-board'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    <path v-else-if="item.icon === 'dashboard'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    <path v-else-if="item.icon === 'admin'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path v-else-if="item.icon === 'gantt'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
                    <path v-else-if="item.icon === 'crew'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path v-else-if="item.icon === 'publish'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M12 18v-6 M9 15l3-3 3 3" />
                    <path v-else-if="item.icon === 'toolbox'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    <path v-else-if="item.icon === 'magazine'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    <circle v-else cx="12" cy="12" r="3" />
                  </svg>
                  <span>{{ item.label }}</span>
                </NuxtLink>
              </nav>
            </div>
          </aside>
        </div>
      </transition>

      <div class="layout-body" :class="{ 'tablet-mode-active': isTabletMode }">
        <template v-if="isTabletMode">
          <!-- 平板模式：带边框的模拟设备 -->
          <div class="tablet-frame">
            <div class="tablet-device" :class="tabletOrientation">
              <div class="tablet-bezel-top"></div>
              <div class="tablet-screen" :class="tabletOrientation">
                <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
                  <div class="sidebar-content">
                    <nav class="nav-menu">
                      <NuxtLink v-for="item in menuItems" :key="item.path" :to="item.path" class="nav-item" :class="{ active: isActive(item.path) }">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="item.icon === 'calendar'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          <path v-else-if="item.icon === 'search'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          <path v-else-if="item.icon === 'ship'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          <path v-else-if="item.icon === 'user'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          <path v-else-if="item.icon === 'flow'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          <path v-else-if="item.icon === 'case'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          <path v-else-if="item.icon === 'files'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          <path v-else-if="item.icon === 'dict'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          <path v-else-if="item.icon === 'ai'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          <path v-else-if="item.icon === 'log'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path v-else-if="item.icon === 'diary'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          <path v-else-if="item.icon === 'data-board'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          <path v-else-if="item.icon === 'dashboard'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          <path v-else-if="item.icon === 'admin'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path v-else-if="item.icon === 'gantt'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
                          <circle v-else cx="12" cy="12" r="3" />
                        </svg>
                        <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                      </NuxtLink>
                    </nav>
                  </div>
                  <div class="sidebar-footer">
                    <div class="sidebar-user-info">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div class="sidebar-user-details">
                        <p class="sidebar-user-name">{{ authStore.user?.realName }}</p>
                        <p class="sidebar-team-code">{{ teamCodeLabel }}</p>
                      </div>
                    </div>
                    <el-button type="default" size="small" class="sidebar-logout-btn" @click="authStore.logout">
                      退出登录
                    </el-button>
                  </div>
                </aside>
                <main class="main-content">
                  <slot />
                </main>
              </div>
              <div class="tablet-bezel-bottom"></div>
            </div>
            <div class="tablet-info">
              <span class="tablet-label">华为 MatePad Mini · 2560×1600 · {{ tabletOrientation === 'landscape' ? '横屏' : '竖屏' }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <!-- 普通模式（桌面端/平板横屏） -->
          <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }"
            @mouseenter="handleSidebarHover(true)"
            @mouseleave="handleSidebarHover(false)">
            <div class="sidebar-content">
              <nav class="nav-menu">
                <NuxtLink v-for="item in menuItems" :key="item.path" :to="item.path" class="nav-item" :class="{ active: isActive(item.path) }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="item.icon === 'calendar'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    <path v-else-if="item.icon === 'search'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <path v-else-if="item.icon === 'ship'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    <path v-else-if="item.icon === 'user'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    <path v-else-if="item.icon === 'flow'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    <path v-else-if="item.icon === 'case'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    <path v-else-if="item.icon === 'files'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path v-else-if="item.icon === 'dict'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    <path v-else-if="item.icon === 'ai'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    <path v-else-if="item.icon === 'log'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path v-else-if="item.icon === 'diary'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    <path v-else-if="item.icon === 'data-board'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    <path v-else-if="item.icon === 'dashboard'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    <path v-else-if="item.icon === 'admin'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path v-else-if="item.icon === 'gantt'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
                    <path v-else-if="item.icon === 'crew'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path v-else-if="item.icon === 'publish'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M12 18v-6 M9 15l3-3 3 3" />
                    <path v-else-if="item.icon === 'toolbox'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    <path v-else-if="item.icon === 'magazine'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    <circle v-else cx="12" cy="12" r="3" />
                  </svg>
                  <span v-if="!sidebarCollapsed || sidebarHoverExpanded">{{ item.label }}</span>
                </NuxtLink>
              </nav>
            </div>
          </aside>

          <main class="main-content">
            <slot />
          </main>
        </template>
      </div>

      <!-- 手机端底部导航（仅手机设备显示，平板有自己的导航） -->
      <MobileBottomNav v-if="isPhone" />

      <!-- 平板竖屏底部导航（仅平板竖屏显示，动态显示菜单项） -->
      <nav
        v-if="isTablet && isPortrait"
        class="tablet-portrait-bottom-nav"
        ref="tabletBottomNavRef"
        @mousedown="onNavDragStart"
        @mousemove="onNavDragMove"
        @mouseup="onNavDragEnd"
        @mouseleave="onNavDragEnd"
        @touchstart="onNavDragStart"
        @touchmove="onNavDragMove"
        @touchend="onNavDragEnd"
        @click="onNavClick"
      >
        <NuxtLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="tablet-nav-tab"
          :class="{ active: isActive(item.path) }"
        >
          <svg class="tablet-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="item.icon === 'dashboard'" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            <path v-else-if="item.icon === 'calendar'" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            <path v-else-if="item.icon === 'ship'" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            <path v-else-if="item.icon === 'user'" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            <path v-else-if="item.icon === 'log'" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path v-else-if="item.icon === 'data-board'" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            <path v-else-if="item.icon === 'publish'" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M12 18v-6 M9 15l3-3 3 3" />
            <path v-else-if="item.icon === 'toolbox'" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            <path v-else-if="item.icon === 'files'" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path v-else-if="item.icon === 'crew'" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            <path v-else-if="item.icon === 'gantt'" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
            <path v-else-if="item.icon === 'admin'" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path v-else-if="item.icon === 'case'" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            <path v-else-if="item.icon === 'flow'" d="M13 10V3L4 14h7v7l9-11h-7z" />
            <path v-else-if="item.icon === 'ai'" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            <path v-else d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- PWA安装提示 -->
      <PwaInstallPrompt />

      <!-- 版本更新提示 -->
      <VersionUpdatePrompt />

      <!-- 欢迎引导 -->
      <OnboardingGuide v-model="showOnboarding" @complete="handleOnboardingComplete" />

      <!-- 下载到本地对话框 -->
      <OfflineDownloadDialog v-model="showOfflineDialog" @success="handleOfflineDownloadSuccess" />

      <!-- PWA 更新中指示器 -->
      <transition name="fade">
        <div v-if="isNewVersionAvailable" class="pwa-updating-indicator">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>更新中...</span>
        </div>
      </transition>

      <!-- 命令面板 -->
      <CommandPalette />

      <!-- 快捷键帮助面板 -->
      <ShortcutHelp />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'
import { useLogCollector } from '~/composables/useLogCollector'
import { useWebSocket } from '~/composables/useWebSocket'
import { useRealtimeSync } from '~/composables/useRealtimeSync'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const api = useApi()
const route = useRoute()
const { loadConfig: loadLogConfig, stopCollector } = useLogCollector()
const sidebarCollapsed = ref(false)
const mobileDrawerOpen = ref(false)
const sidebarHoverExpanded = ref(false)

// 离线状态管理（顶部紧凑指示器）
const isOnline = ref(process.client ? navigator.onLine : true)
const isSyncing = ref(false)

const checkOnlineStatus = () => {
  isOnline.value = process.client ? navigator.onLine : true
}

const triggerSync = async () => {
  if (isSyncing.value || !isOnline.value) return
  isSyncing.value = true
  try {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase || '/api'
    await fetch(`${apiBase}/version/hash`)
    ElMessage.success('数据同步完成')
  } catch (error: any) {
    console.error('同步失败:', error)
    ElMessage.error('同步失败')
  } finally {
    isSyncing.value = false
  }
}

const triggerManualUpdate = async () => {
  try {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase || '/api'
    const clientHash = sessionStorage.getItem('pwa_client_hash') || ''
    const res = await fetch(`${apiBase}/version/check-hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientHash }),
    })
    const data = await res.json()
    if (data.hasUpdate) {
      sessionStorage.setItem('pwa_client_hash', data.serverHash)
      window.location.reload()
    } else {
      ElMessage.success('已是最新版本')
    }
  } catch (error: any) {
    console.error('检查更新失败:', error)
    ElMessage.error('检查更新失败')
  }
}

let networkListener: ((e: Event) => void) | null = null

// 动态菜单：从后端API获取
const menuItems = ref<{ path: string; label: string; icon: string }[]>([])
const menuLoading = ref(false)

const loadMenuItems = async () => {
  if (!authStore.isAuthenticated) return
  menuLoading.value = true
  try {
    const menus = await api.menuConfig.getMyMenus()
    const diaryLabel = authStore.diaryTypeName
    // 过滤掉日记菜单（日记功能已整合到日程页面中，不在左侧任务栏显示）
    // 同时将 work-log 菜单项的 label 替换为当前角色对应的日记名称
    menuItems.value = (menus || [])
      .filter(m => m.path !== '/diary' && m.icon !== 'diary')
      .map(m => m.path === '/work-log' ? { ...m, label: diaryLabel } : m)
  } catch (error) {
    console.error('加载菜单失败，使用默认菜单', error)
    // 降级：使用硬编码默认菜单
    menuItems.value = getDefaultMenuItems()
  } finally {
    menuLoading.value = false
  }
}

// 降级默认菜单（当API不可用时使用）
const getDefaultMenuItems = (): { path: string; label: string; icon: string }[] => {
  const role = authStore.userRole
  const diaryLabel = authStore.diaryTypeName
  // 与后端 DEFAULT_ROLE_MENUS 保持一致
  const defaultMenus: Record<string, { path: string; label: string; icon: string }[]> = {
    admin: [
      { path: '/', label: '工作台', icon: 'dashboard' },
      { path: '/publish-v2', label: '任务发布', icon: 'publish' },
      { path: '/work-log', label: diaryLabel, icon: 'calendar' },
      { path: '/tasks', label: '工作任务', icon: 'log' },
      { path: '/gantt', label: '甘特图', icon: 'gantt' },
      { path: '/crew-list', label: '船员管理', icon: 'crew' },
      { path: '/staff-assignments', label: '人员派任', icon: 'user' },
      { path: '/sop-flow', label: 'SOP流程', icon: 'flow' },
      { path: '/public-case', label: '案例库', icon: 'case' },
      { path: '/experiences', label: '经验分享', icon: 'ai' },
      { path: '/files', label: '共享文件', icon: 'files' },
      { path: '/ai-report', label: 'AI简报', icon: 'ai' },
      { path: '/toolbox', label: '工具箱', icon: 'toolbox' },
      { path: '/magazine', label: '杂志编排', icon: 'magazine' },
      { path: '/admin', label: '系统管理', icon: 'admin' },
    ],
    shore_crew_supervisor: [
      { path: '/', label: '工作台', icon: 'dashboard' },
      { path: '/publish-v2', label: '任务发布', icon: 'publish' },
      { path: '/dashboard', label: '船工看板', icon: 'data-board' },
      { path: '/work-log', label: diaryLabel, icon: 'calendar' },
      { path: '/tasks', label: '工作任务', icon: 'log' },
      { path: '/gantt', label: '甘特图', icon: 'gantt' },
      { path: '/crew-list', label: '船员管理', icon: 'crew' },
      { path: '/staff-assignments', label: '人员派任', icon: 'user' },
      { path: '/port-check', label: '抵港前检查', icon: 'ship' },
      { path: '/staff-history', label: '人员履历', icon: 'user' },
      { path: '/sop-flow', label: 'SOP流程', icon: 'flow' },
      { path: '/public-case', label: '案例库', icon: 'case' },
      { path: '/experiences', label: '经验分享', icon: 'ai' },
      { path: '/files', label: '共享文件', icon: 'files' },
      { path: '/toolbox', label: '工具箱', icon: 'toolbox' },
      { path: '/magazine', label: '杂志编排', icon: 'magazine' },
    ],
    ship_political_instructor: [
      { path: '/', label: '工作台', icon: 'dashboard' },
      { path: '/work-log', label: diaryLabel, icon: 'calendar' },
      { path: '/crew-list', label: '船员名单', icon: 'crew' },
      { path: '/tasks', label: '工作任务', icon: 'log' },
      { path: '/gantt', label: '甘特图', icon: 'gantt' },
      { path: '/staff-assignments', label: '人员派任', icon: 'user' },
      { path: '/party-activities', label: '党建活动', icon: 'calendar' },
      { path: '/thought-reports', label: '思想动态', icon: 'search' },
      { path: '/integrity-records', label: '廉洁监督', icon: 'case' },
      { path: '/officer-profiles', label: '政委履职档案', icon: 'user' },
      { path: '/staff-history', label: '人员履历', icon: 'user' },
      { path: '/experiences', label: '经验分享', icon: 'ai' },
      { path: '/files', label: '共享文件', icon: 'files' },
      { path: '/ai-report', label: 'AI简报', icon: 'ai' },
      { path: '/toolbox', label: '工具箱', icon: 'toolbox' },
      { path: '/magazine', label: '杂志编排', icon: 'magazine' },
    ],
  }
  return defaultMenus[role] || [
    { path: '/', label: '工作台', icon: 'dashboard' },
    { path: '/work-log', label: diaryLabel, icon: 'calendar' },
    { path: '/tasks', label: '工作任务', icon: 'log' },
    { path: '/files', label: '共享文件', icon: 'files' },
    { path: '/toolbox', label: '工具箱', icon: 'toolbox' },
  ]
}

// 欢迎引导状态
const showOnboarding = ref(false)

// 平板竖屏底部导航：滑块式拖动支持
const tabletBottomNavRef = ref<HTMLElement | null>(null)
const isNavDragging = ref(false)
const navDragState = ref({
  startX: 0,
  startScrollLeft: 0,
  hasMoved: false,
})

// 拖动开始
const onNavDragStart = (e: MouseEvent | TouchEvent) => {
  const nav = tabletBottomNavRef.value
  if (!nav) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  navDragState.value = {
    startX: clientX,
    startScrollLeft: nav.scrollLeft,
    hasMoved: false,
  }
  isNavDragging.value = true
}

// 拖动移动
const onNavDragMove = (e: MouseEvent | TouchEvent) => {
  const nav = tabletBottomNavRef.value
  if (!nav || !isNavDragging.value) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const delta = clientX - navDragState.value.startX
  if (Math.abs(delta) > 8) {
    navDragState.value.hasMoved = true
    nav.scrollLeft = navDragState.value.startScrollLeft - delta
  }
}

// 拖动结束
const onNavDragEnd = () => {
  isNavDragging.value = false
}

// 导航栏点击（拖动时不触发）
const onNavClick = (e: MouseEvent) => {
  if (navDragState.value.hasMoved) {
    navDragState.value.hasMoved = false
    e.preventDefault()
    e.stopPropagation()
  }
}

const handleOnboardingComplete = () => {
  showOnboarding.value = false
  ElMessage.success('欢迎使用熊猫笔记！如有需要，可在设置中重新查看引导。')
}

// 登录后检查是否需要显示欢迎引导（必须在客户端执行，使用localStorage）
const checkAndShowOnboarding = () => {
  if (process.server || !authStore.user?.id) return

  const localSkipped = localStorage.getItem(`guideSkipped_${authStore.user.id}`)
  const localCompleted = localStorage.getItem(`guideCompleted_${authStore.user.id}`)
  if (localSkipped === 'true' || localCompleted === 'true') return

  const firstVisitKey = `firstVisit_${authStore.user.id}`
  if (!localStorage.getItem(firstVisitKey)) {
    localStorage.setItem(firstVisitKey, 'true')
    showOnboarding.value = true
  }
}

// 页面挂载时检查（仅客户端）
onMounted(() => {
  if (authStore.isAuthenticated) {
    checkAndShowOnboarding()
    loadMenuItems()
    // 初始化日志收集器
    loadLogConfig()
  }
  networkListener = checkOnlineStatus
  window.addEventListener('online', networkListener)
  window.addEventListener('offline', networkListener)
})

// 监听登录状态变化
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    checkAndShowOnboarding()
    loadMenuItems()
    // 登录后初始化日志收集器
    loadLogConfig()
  } else {
    // 登出时停止日志收集器
    stopCollector()
  }
})

// 监听角色切换，重新加载菜单
watch(() => authStore.userRole, () => {
  if (authStore.isAuthenticated) {
    loadMenuItems()
  }
})

const handleSidebarHover = (enter: boolean) => {
  if (sidebarCollapsed.value && !isTabletMode.value) {
    sidebarHoverExpanded.value = enter
  }
}

// 设备自动检测
const { isPhone, isTablet, isDesktop, isPortrait, deviceType, updateDeviceInfo } = useDeviceDetection()

// WebSocket 通知
const wsState = useWebSocket()

// 实时数据同步
const realtimeSync = useRealtimeSync()

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 登录后自动连接 WebSocket
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    wsState.connect()
    realtimeSync.connect()
  } else {
    wsState.disconnect()
    realtimeSync.disconnect()
  }
}, { immediate: true })

// 退出时断开连接
onUnmounted(() => {
  wsState.disconnect()
  realtimeSync.disconnect()
  if (networkListener) {
    window.removeEventListener('online', networkListener)
    window.removeEventListener('offline', networkListener)
  }
})

// 平板模式状态（华为 MatePad Mini: 2560×1600）
const isTabletMode = ref(false)
// 平板方向：横屏/竖屏
const tabletOrientation = ref<'landscape' | 'portrait'>('landscape')

// 自动同步设备检测到平板模式（仅桌面端，平板设备不自动进入模拟模式）
watch([isTablet, isPortrait], ([tablet, portrait]) => {
  // 平板设备不自动进入模拟模式，直接使用完整屏幕
  // 只有桌面端管理员手动切换时才显示模拟边框
  if (tablet) {
    // 平板设备自动同步方向但不进入模拟模式
    tabletOrientation.value = portrait ? 'portrait' : 'landscape'
  }
}, { immediate: true })

// 管理员二级菜单：按角色分组的用户列表
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

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const toggleViewMode = () => {
  isTabletMode.value = !isTabletMode.value
}

const toggleOrientation = () => {
  tabletOrientation.value = tabletOrientation.value === 'landscape' ? 'portrait' : 'landscape'
}

// 平板模拟模式下，同步添加设备 class 到 <html> 元素
watch([isTabletMode, tabletOrientation], ([tabletMode, orient]) => {
  if (!process.client) return
  const root = document.documentElement
  if (tabletMode) {
    root.classList.remove('device-desktop', 'device-phone')
    root.classList.add('device-tablet')
    root.classList.remove('orientation-landscape', 'orientation-portrait')
    root.classList.add(`orientation-${orient}`)
  }
}, { immediate: true })

const isAdmin = computed(() => authStore.isAdmin)

// 加载用户列表（仅管理员）
const loadUsersByRole = async () => {
  if (!isAdmin.value || usersByRoleLoaded.value) return
  usersByRole.value = await authStore.fetchUsersByRole()
  usersByRoleLoaded.value = true
}

const isShore = computed(() => {
  const role = authStore.user?.role
  return role === 'shore_crew_supervisor' || role === 'company_admin' || role === 'general_manager'
})

const teamCodeLabel = computed(() => {
  const map: Record<string, string> = {
    'team1': 'Team 1',
    'team2': 'Team 2',
    'team3': 'Team 3',
  }
  return map[authStore.user?.teamCode || ''] || ''
})

// 角色显示名称映射
const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  company_admin: '油轮船管部',
  general_manager: '总管团队',
  shore_crew_supervisor: '岸基船工主管',
  shore_marine_supervisor: '岸基海务主管',
  shore_engineer_supervisor: '岸基机务主管',
  shore_electric_supervisor: '岸基电气主管',
  ship_political_instructor: '船舶政委',
}

const roleLabel = computed(() => {
  return roleLabels[authStore.userRole] || authStore.userRole || ''
})

const getRoleLabel = (role: string) => {
  return roleLabels[role] || role
}

const handleRoleSwitch = async (targetRole: string) => {
  if (targetRole === authStore.userRole) return
  const success = await authStore.switchRole(targetRole)
  if (!success) {
    ElMessage.error('切换角色失败')
  }
}

/**
 * 管理员切换到具体用户
 */
const handleUserSwitch = async (userId: number, role: string) => {
  const success = await authStore.switchRole(role, userId);
  if (!success) {
    ElMessage.error('切换用户失败');
  }
}

/**
 * 管理员切换回自己的管理员身份
 */
const switchBackToAdmin = () => {
  if (authStore.isImpersonating) {
    const success = authStore.stopImpersonating();
    if (!success) {
      ElMessage.error('切换失败');
    }
  } else {
    authStore.switchRole('admin').then((success: boolean) => {
      if (!success) {
        ElMessage.error('切换失败');
      }
    });
  }
}

/**
 * 管理员下拉菜单命令处理
 */
const handleAdminCommand = async (cmd: string) => {
  try {
    const parts = cmd.split(':');
    if (parts[0] === 'back') {
      await switchBackToAdmin();
    } else {
      const userId = Number(parts[0]);
      const role = parts[1];
      if (isNaN(userId) || !role) {
        ElMessage.error('无效的用户ID或角色');
        return;
      }
      await handleUserSwitch(userId, role);
    }
  } catch (error) {
    ElMessage.error('切换异常: ' + (error as Error).message);
  }
}

const handleUserMenuCommand = (cmd: string) => {
  if (cmd === 'logout') {
    authStore.logout()
  } else if (cmd === 'profile') {
    ElMessage.info('个人信息功能开发中')
  } else if (cmd === 'password') {
    ElMessage.info('修改密码功能开发中')
  } else if (cmd === 'offline') {
    showOfflineDialog.value = true
  } else if (cmd === 'shortcuts') {
    navigateTo('/settings/shortcuts')
  }
}

const showOfflineDialog = ref(false)

const handleOfflineDownloadSuccess = () => {
  console.log('[Layout] 离线数据下载成功')
}

/**
 * 管理员下拉菜单显示状态变化
 */
const onDropdownVisibleChange = (visible: boolean) => {
  if (visible) {
    loadUsersByRole();
  }
}

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 手机端ESC关闭抽屉
const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && mobileDrawerOpen.value) {
    mobileDrawerOpen.value = false
  }
}

// PWA 自动更新
const { isNewVersionAvailable, applyUpdate } = usePwaUpdate()

onMounted(() => {
  document.addEventListener('keydown', handleEscKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey)
})
</script>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg);
}

.layout-header {
  flex-shrink: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  height: 56px;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #1A1A1A;
  background: transparent;
  border: none;
}

.hamburger-btn:active {
  background-color: #f0f0f0;
}

.sidebar-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
  background: transparent;
  border: none;
}

.sidebar-toggle-btn:hover {
  background-color: #f0f0f0;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.logo-text h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
}

.logo-text p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.2;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-search {
  width: 260px;
}

.role-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-light);
  color: var(--color-accent);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--font-size-sm);
  user-select: none;
}

.role-switcher:hover {
  background-color: var(--color-accent);
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}

.user-info:hover {
  background-color: var(--color-primary-light);
}

.user-details {
  text-align: left;
}

.user-name {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.2;
}

.team-code {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.2;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  flex-shrink: 0;
  width: 200px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar.collapsed:hover {
  width: 200px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-sm);
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px var(--spacing-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: #f0f2f5;
  color: var(--color-text);
}

.nav-item.active {
  background-color: #e2e6ed;
  color: var(--color-accent);
  font-weight: 500;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
}

/* 平板模式样式 - 华为 MatePad Mini 2560×1600 (16:10) */
.tablet-mode-active {
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  background-color: var(--color-bg-alt);
  overflow-y: auto;
}

.tablet-frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* 横屏模式（默认）- 1280×720（2560×1600的一半） */
.tablet-device {
  width: 1280px;
  max-width: 95vw;
  border-radius: 20px;
  box-shadow:
    0 0 0 2px #2c2c2c,
    0 0 0 6px #555,
    0 20px 60px rgba(0, 0, 0, 0.3);
  background-color: #1a1a1a;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 竖屏模式 - 800×1280（1600×2560的一半） */
.tablet-device.portrait {
  width: 800px;
  max-width: 95vw;
}

.tablet-bezel-top {
  height: 12px;
  background: linear-gradient(180deg, #2c2c2c 0%, #1a1a1a 100%);
  position: relative;
}

.tablet-bezel-top::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #333;
  border: 1px solid #444;
}

/* 竖屏时摄像头移到侧边 */
.tablet-device.portrait .tablet-bezel-top::after {
  display: none;
}

/* 竖屏时在顶部左侧显示摄像头 */
.tablet-device.portrait .tablet-bezel-top::before {
  content: '';
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #333;
  border: 1px solid #444;
}

.tablet-screen {
  display: flex;
  background-color: #f5f7fa;
  height: 720px;
  max-height: calc(100vh - 180px);
  overflow: hidden;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 竖屏时屏幕更高 */
.tablet-screen.portrait {
  height: 1200px;
  max-height: calc(100vh - 140px);
}

.tablet-screen .sidebar {
  width: 160px;
  transition: width 0.3s ease;
}

.tablet-screen .sidebar.collapsed {
  width: 48px;
}

/* 平板侧边栏底部用户信息 */
.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.sidebar-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background-color: #f0f5f9;
  color: #5B7FA6;
  margin-bottom: 8px;
}

.sidebar-user-details {
  text-align: left;
  flex: 1;
  min-width: 0;
}

.sidebar-user-name {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  line-height: 1.2;
}

.sidebar-team-code {
  margin: 0;
  font-size: 11px;
  color: #808080;
  line-height: 1.2;
}

.sidebar-logout-btn {
  width: 100%;
}

/* 侧边栏折叠时隐藏底部详情 */
.tablet-screen .sidebar.collapsed .sidebar-user-details,
.tablet-screen .sidebar.collapsed .sidebar-logout-btn {
  display: none;
}

.tablet-screen .sidebar.collapsed .sidebar-user-info {
  justify-content: center;
  padding: 6px 4px;
}

.tablet-screen .sidebar.collapsed .sidebar-footer {
  padding: 8px 4px;
}

.tablet-screen .main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.tablet-bezel-bottom {
  height: 24px;
  background: linear-gradient(180deg, #1a1a1a 0%, #2c2c2c 100%);
  position: relative;
}

.tablet-bezel-bottom::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #444;
}

.tablet-info {
  margin-top: 16px;
  text-align: center;
}

.tablet-label {
  font-size: 12px;
  color: #666;
  background: white;
  padding: 4px 12px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 视图模式切换按钮 */
.view-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  border: none;
}

.view-mode-toggle:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

/* 方向切换按钮（平板模式下的高亮样式） */
.orientation-toggle {
  background-color: transparent;
  color: var(--color-text-secondary);
}

.orientation-toggle:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

/* 管理员级联角色菜单样式 */
.impersonate-label {
  font-size: 11px;
  color: #909399;
  margin-right: 2px;
}
.impersonate-role {
  font-size: 11px;
  color: #909399;
  margin-left: 2px;
}

:deep(.admin-role-menu) {
  min-width: 240px;
  max-height: 280px;
  overflow-y: auto;
}

:deep(.role-group-item) {
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.role-group-item:last-child) {
  border-bottom: none;
}

:deep(.role-group-header) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  background: #f8f9fa;
}

:deep(.role-group-header svg) {
  color: #909399;
}

:deep(.role-users-list) {
  padding: 2px 0;
}

:deep(.role-users-list .el-dropdown-menu__item) {
  padding: 6px 16px 6px 36px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

:deep(.role-users-list .el-dropdown-menu__item:hover) {
  background-color: #ecf5ff;
}

:deep(.role-users-list .el-dropdown-menu__item.is-current) {
  color: #409eff;
  font-weight: 600;
}

:deep(.user-team) {
  font-size: 11px;
  color: #909399;
  margin-left: 6px;
}

:deep(.el-dropdown-menu__item .el-icon) {
  margin-right: 4px;
}

/* =====================================================
 * 平板竖屏模式全局适配 (800×1280)
 * 华为 MatePad Mini 2560×1600 竖屏半尺寸
 * 对标飞书/Notion：隐藏侧栏+底部Tab+压缩头部
 * ===================================================== */

/* 平板竖屏时隐藏侧边栏 */
.device-tablet.orientation-portrait .sidebar,
.tablet-screen.portrait .sidebar {
  display: none !important;
}

/* 平板竖屏时压缩头部高度 */
.device-tablet.orientation-portrait .layout-header,
.tablet-screen.portrait .layout-header {
  height: 48px !important;
}

.device-tablet.orientation-portrait .header-content,
.tablet-screen.portrait .header-content {
  padding: 0 12px !important;
}

/* 平板竖屏时隐藏搜索框（节省空间） */
.device-tablet.orientation-portrait .header-search,
.tablet-screen.portrait .header-search {
  display: none !important;
}

/* 平板竖屏时隐藏视图切换按钮 */
.device-tablet.orientation-portrait .view-mode-toggle,
.device-tablet.orientation-portrait .orientation-toggle,
.tablet-screen.portrait .view-mode-toggle,
.tablet-screen.portrait .orientation-toggle {
  display: none !important;
}

/* 平板竖屏时显示顶部紧凑离线状态指示器 */
.device-tablet.orientation-portrait .header-offline-status,
.tablet-screen.portrait .header-offline-status {
  display: flex !important;
}

/* 平板竖屏时隐藏原来的离线状态栏 */
.device-tablet.orientation-portrait .offline-status-wrapper,
.tablet-screen.portrait .offline-status-wrapper {
  display: none !important;
}

/* 平板横屏时也显示顶部紧凑离线状态指示器 */
.device-tablet.orientation-landscape .header-offline-status,
.tablet-screen.landscape .header-offline-status {
  display: flex !important;
}

/* 平板横屏时隐藏原来的离线状态栏 */
.device-tablet.orientation-landscape .offline-status-wrapper,
.tablet-screen.landscape .offline-status-wrapper {
  display: none !important;
}

/* 平板竖屏时主内容区占满宽度 */
.device-tablet.orientation-portrait .main-content,
.tablet-screen.portrait .main-content {
  width: 100% !important;
  padding: 0 !important;
}

/* 平板竖屏时布局body为底部导航留空间 */
.device-tablet.orientation-portrait .layout-body,
.tablet-screen.portrait .layout-body {
  padding-bottom: 100px !important;
}

/* 平板竖屏时平板框架调整 */
.device-tablet.orientation-portrait .tablet-frame,
.tablet-screen.portrait .tablet-frame {
  padding: 0 !important;
}

.device-tablet.orientation-portrait .tablet-device,
.tablet-screen.portrait .tablet-device {
  border-radius: 0 !important;
  box-shadow: none !important;
  width: 100% !important;
  max-width: 100% !important;
}

.device-tablet.orientation-portrait .tablet-screen,
.tablet-screen.portrait .tablet-screen {
  height: calc(100vh - 138px) !important; /* 48px header + 90px bottom nav */
  max-height: none !important;
}

.device-tablet.orientation-portrait .tablet-bezel-top,
.device-tablet.orientation-portrait .tablet-bezel-bottom,
.tablet-screen.portrait .tablet-bezel-top,
.tablet-screen.portrait .tablet-bezel-bottom {
  display: none !important;
}

.device-tablet.orientation-portrait .tablet-info,
.tablet-screen.portrait .tablet-info {
  display: none !important;
}

/* =====================================================
 * 平板竖屏底部导航样式（对标飞书/钉钉）
 * ===================================================== */

.tablet-portrait-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 150;
  display: flex;
  align-items: flex-start;
  padding-top: 20px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0));
  min-height: 86px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 
    0 -4px 20px rgba(0, 0, 0, 0.06),
    0 -1px 0 rgba(0, 0, 0, 0.04);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.tablet-portrait-bottom-nav:active {
  cursor: grabbing;
}

.tablet-portrait-bottom-nav::-webkit-scrollbar {
  display: none;
}

.tablet-nav-tab {
  flex: 0 0 auto;
  min-width: 80px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 10px;
  color: #1f1f1f;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto;
}

.tablet-nav-tab:hover {
  color: #000000;
}

.tablet-nav-tab:active {
  transform: scale(0.96);
}

.tablet-nav-tab span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  transition: color 0.25s;
}

.tablet-nav-tab.active {
  color: #4A90D9;
  font-weight: 600;
}

.tablet-nav-tab.active::before {
  content: '';
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: linear-gradient(90deg, #4A90D9, #6BA3E0);
  border-radius: 3px;
  box-shadow: 0 1px 4px rgba(74, 144, 217, 0.3);
}

.tablet-nav-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  stroke-width: 1.5;
}

.tablet-nav-tab.active .tablet-nav-icon {
  transform: scale(1.1);
  stroke: #4A90D9;
  filter: drop-shadow(0 2px 8px rgba(74, 144, 217, 0.35));
}

.tablet-nav-tab:not(.active) .tablet-nav-icon {
  stroke: #1f1f1f;
  opacity: 1;
}

.tablet-nav-tab:hover:not(.active) .tablet-nav-icon {
  stroke: #000000;
  opacity: 1;
}

/* =====================================================
 * 手机端响应式布局 (< 768px)
 * ===================================================== */

/* 汉堡菜单显示 */
@media (max-width: 767px) {
  .hamburger-btn {
    display: flex;
  }

  .sidebar-toggle-btn {
    display: none;
  }

  .header-content {
    padding: 0 12px;
  }

  /* Header右侧简化：隐藏非管理员角色切换器、视图切换，只显示用户信息 */
  .header-right .role-switcher:not(.admin-dropdown .role-switcher),
  .header-right .view-mode-toggle {
    display: none !important;
  }

  .header-right .user-info .user-details {
    display: none;
  }

  .header-right .user-info {
    padding: 4px 8px;
  }

  .header-right .btn-secondary {
    display: none;
  }

  .logo-text p {
    display: none;
  }

  .logo-text h1 {
    font-size: 15px;
  }

  /* 布局body适配底部导航 */
  .layout-body {
    padding-bottom: 60px;
  }

  /* 侧边栏在桌面端隐藏（手机端使用抽屉） */
  .sidebar {
    display: none;
  }
}

/* =====================================================
 * 手机端抽屉侧边栏样式
 * ===================================================== */

.mobile-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.mobile-drawer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  max-width: 85vw;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.drawer-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
  background: transparent;
  border: none;
}

.drawer-close:active {
  background-color: #f0f0f0;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px;
}

.drawer-search {
  padding: 8px 8px 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.drawer-content .nav-item {
  padding: 12px 14px;
  font-size: 15px;
}

/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .mobile-drawer,
.drawer-leave-active .mobile-drawer {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .mobile-drawer,
.drawer-leave-to .mobile-drawer {
  transform: translateX(-100%);
}

/* =====================================================
 * 手机端底部导航样式
 * ===================================================== */

@media (min-width: 768px) {
  .mobile-bottom-nav {
    display: none !important;
  }
}

/* =====================================================
 * 通知铃铛样式
 * ===================================================== */

.header-offline-status {
  display: none;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
}

.header-offline-status.offline {
  background: #fef2f2;
}

.header-offline-status.syncing {
  background: #fffbeb;
}

.offline-indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

.offline-indicator-dot.offline {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.offline-divider {
  width: 1px;
  height: 16px;
  background: var(--color-border);
  margin: 0 2px;
  flex-shrink: 0;
}

.offline-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.offline-action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-accent);
}

.offline-download-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-secondary);
  font-size: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  flex-shrink: 0;
}

.offline-download-btn:hover {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.quiz-entry-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  background: rgba(56, 189, 248, 0.08);
  color: #0284c7;
  flex-shrink: 0;
  text-decoration: none;
}

.quiz-entry-btn:hover {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.5);
}

.quiz-emoji {
  font-size: 14px;
}

.notification-bell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-secondary);
  position: relative;
}

.notification-bell:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.notification-bell.has-unread {
  color: var(--color-warning);
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  font-size: var(--font-size-xs);
  color: white;
  background-color: var(--color-danger);
  border-radius: 8px;
  padding: 0 4px;
  box-shadow: var(--shadow-sm);
}

.notification-panel {
  max-height: 400px;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
}

.notification-header h3 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--color-text-muted);
}

.notification-empty svg {
  margin-bottom: 12px;
}

.notification-empty p {
  margin: 0;
  font-size: var(--font-size-sm);
}

.notification-list {
  max-height: 350px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid var(--color-border-light);
}

.notification-item:hover {
  background-color: var(--color-surface-hover);
}

.notification-item.is-unread {
  background-color: var(--color-primary-light);
}

.notification-item.is-unread:hover {
  background-color: #dce5f0;
}

.notification-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-icon.type-task_assigned {
  background-color: #e1f0ff;
  color: #409eff;
}

.notification-icon.type-task_updated {
  background-color: #f0f9eb;
  color: var(--color-success);
}

.notification-icon.type-comment_added {
  background-color: #fdf6ec;
  color: var(--color-warning);
}

.notification-icon.type-warning_triggered {
  background-color: #fef0f0;
  color: var(--color-danger);
}

.notification-icon.type-meeting_processed {
  background-color: #f4f4f5;
  color: var(--color-text-muted);
}

.notification-icon.type-system_message {
  background-color: var(--color-bg);
  color: var(--color-text-secondary);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.type-tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background-color: var(--color-bg);
  padding: 1px 6px;
  border-radius: var(--radius-xs, 3px);
  flex-shrink: 0;
}

.title-text {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-message {
  margin: 0 0 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>

<style>
/* 平板竖屏全局样式 - 用于跨组件/页面的样式调整 */
.device-tablet.orientation-portrait .schedule-page {
  height: 100% !important;
  min-height: 0 !important;
  display: flex;
  flex-direction: column;
  padding: 8px 12px !important;
}

.device-tablet.orientation-portrait .schedule-page .page-header {
  margin-bottom: 8px !important;
  padding: 8px 12px !important;
  flex-shrink: 0;
}

.device-tablet.orientation-portrait .schedule-page .page-title {
  font-size: 18px;
}

.device-tablet.orientation-portrait .schedule-page .content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px !important;
}

.device-tablet.orientation-portrait .schedule-page .calendar-section {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0 !important;
  padding: 12px !important;
  display: flex;
  flex-direction: column;
}

.device-tablet.orientation-portrait .schedule-page .resize-handle {
  display: none !important;
}

.device-tablet.orientation-portrait .schedule-page .schedule-list-section {
  flex: 1 1 auto !important;
  min-height: 80px !important;
  overflow: auto;
}

.device-tablet.orientation-portrait .schedule-page .el-calendar {
  flex: 0 0 auto;
  height: auto !important;
  min-height: 0 !important;
  display: flex;
  flex-direction: column;
}

.device-tablet.orientation-portrait .schedule-page .el-calendar__body {
  flex: 0 0 auto;
  height: auto !important;
  min-height: 0;
  overflow: visible;
}

.device-tablet.orientation-portrait .schedule-page .el-calendar-table tr.el-calendar-table__row {
  height: 48px !important;
}

.device-tablet.orientation-portrait .schedule-page .el-calendar-table td {
  height: 48px !important;
  padding: 2px !important;
  overflow: hidden !important;
  vertical-align: top;
}

.device-tablet.orientation-portrait .schedule-page .el-calendar-table th {
  height: 36px !important;
  padding: 4px !important;
}

.device-tablet.orientation-portrait .schedule-page .calendar-day {
  min-height: 44px !important;
  height: 44px !important;
  padding: 2px 4px !important;
  overflow: hidden !important;
}

.device-tablet.orientation-portrait .schedule-page .day-number {
  font-size: 13px !important;
  margin-bottom: 1px !important;
  line-height: 1.2 !important;
}

.device-tablet.orientation-portrait .schedule-page .lunar-holiday {
  display: none !important;
}

.device-tablet.orientation-portrait .schedule-page .day-schedules {
  gap: 1px !important;
  max-height: 28px !important;
  overflow: hidden !important;
}

.device-tablet.orientation-portrait .schedule-page .schedule-dot,
.device-tablet.orientation-portrait .schedule-page .birthday-dot {
  font-size: 10px !important;
  padding: 0 3px !important;
  height: 13px !important;
  line-height: 13px !important;
  margin: 0 !important;
}

.device-tablet.orientation-portrait .schedule-page .birthday-dot .birthday-icon {
  display: none !important;
}

.device-tablet.orientation-portrait .schedule-page .more-indicator {
  font-size: 9px !important;
  line-height: 1 !important;
  margin-top: 1px !important;
}

/* 平板竖屏模式下政委视图布局优化 - 统一"文本+输入框"布局 */
.device-tablet.orientation-portrait .schedule-page .page-header {
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 8px !important;
  padding: 10px 12px !important;
}

.device-tablet.orientation-portrait .schedule-page .header-left {
  flex-direction: row !important;
  align-items: center !important;
  gap: 8px !important;
}

.device-tablet.orientation-portrait .schedule-page .page-subtitle {
  display: none !important;
}

.device-tablet.orientation-portrait .schedule-page .page-title {
  font-size: 16px !important;
  margin: 0 !important;
}

.device-tablet.orientation-portrait .schedule-page .header-right {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 8px !important;
}

/* header-extra-fields 统一4列网格，包含所有表单元素 */
.device-tablet.orientation-portrait .schedule-page .header-extra-fields {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 6px !important;
  padding: 10px !important;
  border-right: none !important;
  align-items: center !important;
}

/* field-item 统一为水平布局：左文本右对齐 + 右输入框左对齐 */
.device-tablet.orientation-portrait .schedule-page .field-item {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 4px !important;
  min-width: 0 !important;
  height: 40px !important;
}

/* 所有标签统一宽度、右对齐 */
.device-tablet.orientation-portrait .schedule-page .field-label {
  flex: 0 0 56px !important;
  width: 56px !important;
  text-align: right !important;
  font-size: 11px !important;
  line-height: 12px !important;
  color: #606266 !important;
  margin: 0 !important;
  padding: 0 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
}

/* 所有输入框/选择器/开关统一宽度 */
.device-tablet.orientation-portrait .schedule-page .field-item .el-select,
.device-tablet.orientation-portrait .schedule-page .field-item .el-switch,
.device-tablet.orientation-portrait .schedule-page .field-item .el-input,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-editor,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-picker {
  flex: 1 !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  display: flex !important;
  align-items: center !important;
}

/* 强制所有输入组件内部填满宽度 */
.device-tablet.orientation-portrait .schedule-page .field-item .el-select .el-input,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-editor .el-input,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-picker .el-input {
  width: 100% !important;
  flex: 1 !important;
}

/* 所有输入框统一高度和字体 - el-input__wrapper (el-input 和 el-date-picker 使用) */
.device-tablet.orientation-portrait .schedule-page .field-item .el-input .el-input__wrapper,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-editor .el-input__wrapper,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-picker .el-input__wrapper {
  height: 32px !important;
  padding: 0 8px !important;
  margin: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

/* el-select__wrapper (el-select 使用) - 统一高度和样式 */
.device-tablet.orientation-portrait .schedule-page .field-item .el-select .el-select__wrapper {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 8px !important;
  margin: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
  font-size: 12px !important;
}

.device-tablet.orientation-portrait .schedule-page .field-item .el-input .el-input__inner,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-editor .el-input__inner,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-picker .el-input__inner {
  height: 32px !important;
  font-size: 12px !important;
  line-height: 32px !important;
  width: 100% !important;
}

/* el-select 内部选中文字样式 */
.device-tablet.orientation-portrait .schedule-page .field-item .el-select .el-select__placeholder,
.device-tablet.orientation-portrait .schedule-page .field-item .el-select .el-select__selected-item {
  font-size: 12px !important;
  line-height: 32px !important;
}

/* 开关组件也统一高度 */
.device-tablet.orientation-portrait .schedule-page .field-item .el-switch {
  height: 32px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
}

/* 按钮样式统一 */
.device-tablet.orientation-portrait .schedule-page .field-item.field-button .el-button {
  height: 32px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
}

/* 航行时间进度条跨整行 */
.device-tablet.orientation-portrait .schedule-page .header-extra-fields .voyage-progress-bar {
  grid-column: 1 / -1 !important;
  padding: 8px 10px !important;
  margin-bottom: 0 !important;
}

.device-tablet.orientation-portrait .schedule-page .header-extra-fields .progress-info {
  gap: 8px !important;
  margin-bottom: 8px !important;
}

.device-tablet.orientation-portrait .schedule-page .header-extra-fields .progress-title {
  font-size: 12px !important;
}

.device-tablet.orientation-portrait .schedule-page .header-extra-fields .progress-duration {
  font-size: 11px !important;
}

/* 视图切换、周起始日选择 */
.device-tablet.orientation-portrait .schedule-page .view-switcher {
  height: 32px !important;
  flex-shrink: 0 !important;
}

.device-tablet.orientation-portrait .schedule-page .view-switcher .el-button {
  height: 32px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
}

.device-tablet.orientation-portrait .schedule-page .week-start-select {
  flex: 1 !important;
  height: 32px !important;
}

.device-tablet.orientation-portrait .schedule-page .week-start-select .el-input__wrapper {
  height: 32px !important;
  padding: 0 8px !important;
}

.device-tablet.orientation-portrait .schedule-page .week-start-select .el-input__inner {
  height: 32px !important;
  font-size: 12px !important;
  line-height: 32px !important;
}
</style>
