<template>
  <div class="dashboard-page">
    <div class="space-y-6">
      <!-- 顶部：欢迎信息 + 今日日期 -->
      <div class="welcome-banner">
        <div class="welcome-left">
          <h2 class="welcome-title">早上好，{{ authStore.user?.realName || '用户' }}！</h2>
          <p class="welcome-subtitle">今天是 {{ currentDateStr }}，{{ roleSubtitle }}</p>
        </div>
        <div class="welcome-right">
          <!-- P3-14: 根据角色显示不同的主操作按钮 -->
          <el-button v-if="isShoreCrewSupervisor" type="primary" size="large" @click="$router.push('/work-log')">
            <el-icon><Calendar /></el-icon>
            {{ diaryLabel }}
          </el-button>
          <el-button v-else-if="isShipRole" type="primary" size="large" @click="$router.push('/work-log')">
            <el-icon><EditPen /></el-icon>
            {{ diaryLabel }}
          </el-button>
          <el-button v-else type="primary" size="large" @click="$router.push('/dashboard')">
            <el-icon><PieChart /></el-icon>
            查看看板
          </el-button>
        </div>
      </div>

      <!-- 数据卡片区域 -->
      <div class="stats-cards">
        <div class="glass-card p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-500">今日待办</p>
              <p class="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-1">{{ todaySchedulesCount }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="glass-card p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-500">本周已完成</p>
              <p class="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-1">{{ weekCompletedCount }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div class="glass-card p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-500">本月进度</p>
              <p class="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-1">{{ monthProgress }}%</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div class="glass-card p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-500">{{ diaryLabel }}</p>
              <p class="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-1">{{ diaryCount }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 船舶动态看板（FlipBoardView）- 仅岸基角色可见 -->
      <div v-if="!isShipRole" class="glass-card p-6">
        <div class="workspace-header">
          <el-tabs v-model="activeWorkspaceTab" class="workspace-tabs" @touchstart="onTouchStart" @touchend="onTouchEnd">
            <el-tab-pane label="船舶动态看板" name="flipboard" />
            <el-tab-pane v-if="isShoreCrewSupervisor" label="发布模板管理" name="publish" />
          </el-tabs>
          <el-button
            v-if="isShoreCrewSupervisor"
            type="primary"
            @click="batchReportVisible = true"
            class="batch-report-btn"
          >
            <el-icon><DocumentCopy /></el-icon> 粘贴船舶动态
          </el-button>
        </div>
        <div v-show="activeWorkspaceTab === 'flipboard'">
          <FlipBoardView ref="flipBoardRef" @ship-click="handleShipClick" />
        </div>
        <div v-show="activeWorkspaceTab === 'publish' && isShoreCrewSupervisor">
          <PublishManager />
        </div>
      </div>

      <!-- 批量粘贴船舶报告弹窗（仅船工主管） -->
      <BatchShipReportDialog
        v-if="isShoreCrewSupervisor"
        :visible="batchReportVisible"
        @update:visible="batchReportVisible = $event"
        @success="onBatchReportSuccess"
      />

      <!-- 今日待办 + 日记 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 今日待办 -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-[#1A1A1A]">今日待办</h3>
            <el-button type="primary" size="small" @click="$router.push('/schedule')">
              <el-icon><Plus /></el-icon>新建
            </el-button>
          </div>
          <div v-if="todaySchedules.length > 0" class="space-y-3">
            <div v-for="schedule in todaySchedules" :key="schedule.id" class="p-3 rounded-lg border border-gray-200 bg-white">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" :class="getStatusColor(schedule.finishStatus)"></span>
                    <h4 class="font-medium">{{ `${schedule.firstType} - ${schedule.secondType}` }}</h4>
                    <el-tag :type="getFinishStatusType(schedule.finishStatus)" size="small">
                      {{ getFinishStatusText(schedule.finishStatus) }}
                    </el-tag>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">{{ schedule.eventDetail || '暂无内容' }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            <p>今日暂无待办事项</p>
          </div>
        </div>

        <!-- 最近日记 -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-[#1A1A1A]">最近日记</h3>
            <div class="flex items-center gap-2">
              <el-button type="primary" size="small" @click="$router.push('/work-log')">
                <el-icon><Plus /></el-icon>写日记
              </el-button>
              <NuxtLink to="/work-log" class="text-sm text-blue-500 hover:text-blue-600">查看全部 →</NuxtLink>
            </div>
          </div>
          <div v-if="recentDiaries.length > 0" class="space-y-3">
            <div v-for="diary in recentDiaries" :key="diary.id" 
                 class="p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 cursor-pointer transition-all"
                 @click="goToDiary(diary)">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">📝</span>
                    <h4 class="font-medium">{{ formatDate(diary.date) }}</h4>
                    <el-tag v-if="diary.weather" size="small" type="info">{{ diary.weather }}</el-tag>
                  </div>
                  <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ getDiaryPreview(diary.content) }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            <p>还没有日记，快去写一篇吧 ✍️</p>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-[#1A1A1A] mb-4">快捷操作</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <NuxtLink to="/work-log" class="p-4 border rounded-lg hover:bg-blue-50 text-center bg-white hover:border-blue-300 transition-all">
            <div class="text-2xl mb-2">📝</div>
            <p class="text-sm font-medium">{{ diaryLabel }}</p>
          </NuxtLink>
          <NuxtLink to="/ships" class="p-4 border rounded-lg hover:bg-gray-50 text-center bg-white">
            <div class="text-2xl mb-2">🚢</div>
            <p class="text-sm">船舶资料</p>
          </NuxtLink>
          <NuxtLink to="/dashboard" v-if="isShoreCrewSupervisor" class="p-4 border rounded-lg hover:bg-red-50 text-center bg-white hover:border-red-300 transition-all">
            <div class="text-2xl mb-2">📊</div>
            <p class="text-sm font-medium">船工看板</p>
          </NuxtLink>
          <NuxtLink to="/ai-report" class="p-4 border rounded-lg hover:bg-gray-50 text-center bg-white">
            <div class="text-2xl mb-2">🤖</div>
            <p class="text-sm">AI简报</p>
          </NuxtLink>
          <NuxtLink to="/schedule-search" class="p-4 border rounded-lg hover:bg-gray-50 text-center bg-white">
            <div class="text-2xl mb-2">🔍</div>
            <p class="text-sm">高级查询</p>
          </NuxtLink>
          <div class="p-4 border rounded-lg hover:bg-yellow-50 text-center bg-white hover:border-yellow-300 transition-all cursor-pointer" @click="openStickyList">
            <div class="text-2xl mb-2">📌</div>
            <p class="text-sm">便利贴</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { Schedule } from '~/types'
import FlipBoardView from '~/components/FlipBoardView.vue'
import PublishManager from '~/components/PublishManager.vue'
import BatchShipReportDialog from '~/components/BatchShipReportDialog.vue'
import { DocumentCopy } from '@element-plus/icons-vue'

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()
const api = useApi()
const router = useRouter()

// 角色判断
const isShoreCrewSupervisor = computed(() => authStore.user?.role === 'shore_crew_supervisor')
const isShipRole = computed(() => authStore.user?.role === 'ship_political_instructor')
const diaryLabel = computed(() => authStore.diaryTypeName)

// P3-14: 角色引导文案
const roleSubtitle = computed(() => {
  if (isShoreCrewSupervisor.value) return '管理船舶日程，统筹工作安排'
  if (isShipRole.value) return '记录航行日志，跟踪任务进展'
  return '查看数据看板，掌握工作动态'
})

// 工作区标签切换
const activeWorkspaceTab = ref('flipboard')

// 看板视图模式
const flipBoardRef = ref<InstanceType<typeof FlipBoardView> | null>(null)

// 批量粘贴船舶报告弹窗
const batchReportVisible = ref(false)

// 粘贴船舶报告成功后刷新看板
function onBatchReportSuccess() {
  flipBoardRef.value?.fetchShipStatus?.()
}

// 触摸滑动相关
const touchStartX = ref(0)
const touchEndX = ref(0)
const minSwipeDistance = 50 // 最小滑动距离阈值

const onTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX
}

const onTouchEnd = (e: TouchEvent) => {
  touchEndX.value = e.changedTouches[0].clientX
  handleSwipe()
}

const handleSwipe = () => {
  const distance = touchEndX.value - touchStartX.value
  if (Math.abs(distance) < minSwipeDistance) return

  // 获取可用的标签页名称列表
  const tabNames = isShipRole.value ? [] : (isShoreCrewSupervisor.value ? ['flipboard', 'publish'] : ['flipboard'])
  const currentIndex = tabNames.indexOf(activeWorkspaceTab.value)

  if (distance > 0) {
    // 向右滑动，切换到上一个标签
    if (currentIndex > 0) {
      activeWorkspaceTab.value = tabNames[currentIndex - 1]
    }
  } else {
    // 向左滑动，切换到下一个标签
    if (currentIndex < tabNames.length - 1) {
      activeWorkspaceTab.value = tabNames[currentIndex + 1]
    }
  }
}

const schedules = ref<Schedule[]>([])
const diaries = ref<any[]>([])

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const startOfWeek = new Date(today)
startOfWeek.setDate(today.getDate() - today.getDay())
const endOfWeek = new Date(today)
endOfWeek.setDate(today.getDate() + (6 - today.getDay()))
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

// 当前日期字符串
const currentDateStr = computed(() => {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${y}年${m}月${d}日 星期${weekDays[today.getDay()]}`
})

const todaySchedules = computed(() => {
  return schedules.value.filter(s => {
    return s.recordDate.startsWith(todayStr) && s.finishStatus !== 'cancelled'
  })
})

const todaySchedulesCount = computed(() => todaySchedules.value.length)

const weekCompletedCount = computed(() => {
  return schedules.value.filter(s => {
    const sDate = new Date(s.recordDate)
    return sDate >= startOfWeek && sDate <= endOfWeek && s.finishStatus === 'completed'
  }).length
})

const monthProgress = computed(() => {
  const monthTotal = schedules.value.filter(s => {
    const sDate = new Date(s.recordDate)
    return sDate >= startOfMonth && sDate <= endOfMonth
  }).length
  const monthCompleted = schedules.value.filter(s => {
    const sDate = new Date(s.recordDate)
    return sDate >= startOfMonth && sDate <= endOfMonth && s.finishStatus === 'completed'
  }).length
  return monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0
})

const diaryCount = computed(() => diaries.value.length)

const recentDiaries = computed(() => {
  return [...diaries.value]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
})

const getStatusColor = (status: string) => {
  if (status === 'completed') return 'bg-green-500'
  if (status === 'in_progress') return 'bg-yellow-500'
  if (status === 'pending') return 'bg-blue-500'
  return 'bg-gray-500'
}

const getFinishStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || ''
}

const getFinishStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const getDiaryPreview = (content: string) => {
  if (!content) return '暂无内容'
  // 去除HTML标签，取前50个字符
  const plain = content.replace(/<[^>]*>/g, '')
  return plain.length > 50 ? plain.substring(0, 50) + '...' : plain
}

const goToDiary = (diary: any) => {
  const dateVal = diary.date
  const dateStr = dateVal instanceof Date ? dateVal.toISOString().split('T')[0] : String(dateVal).split('T')[0]
  router.push(`/work-log?date=${dateStr}`)
}

const handleShipClick = (ship: any) => {
  // Navigate to port-check page with ship context
  router.push(`/port-check?shipId=${ship.shipId}`)
}

// 打开便利贴列表
const openStickyList = () => {
  window.open(
    '/sticky-list',
    '便利贴管理',
    'width=800,height=600,resizable=yes,menubar=no'
  )
}

const loadData = async () => {
  try {
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 7)
    const endDateStr = endDate.toISOString().split('T')[0]
    schedules.value = await api.schedules.getAll(todayStr, endDateStr)
  } catch (error) {
    console.error('加载数据失败', error)
  }
}

const loadDiaries = async () => {
  try {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 7)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 7)
    const endDateStr = endDate.toISOString().split('T')[0]
    diaries.value = await api.diaries.getAll(startDateStr, endDateStr)
  } catch (error) {
    console.error('加载日记失败', error)
  }
}

onMounted(() => {
  loadData()
  loadDiaries()
})
</script>

<style scoped>
.dashboard-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
  overflow-y: auto;
}

.welcome-banner {
  background: linear-gradient(135deg, #00508E 0%, #003d6e 100%);
  border-radius: 12px;
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 80, 142, 0.3);
}

.welcome-title {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 700;
}

.welcome-subtitle {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 工作区头部布局：tabs + 批量按钮 */
.workspace-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.workspace-header .workspace-tabs {
  flex: 1;
}
.batch-report-btn {
  flex-shrink: 0;
  font-weight: 600;
}

/* 平板模式滑动动画 */
.workspace-tabs {
  transition: transform 0.3s ease;
  -webkit-user-select: none;
  user-select: none;
  touch-action: pan-y; /* 允许垂直滚动，拦截水平滑动 */
}

.workspace-tabs:active {
  transform: translateX(var(--swipe-offset, 0));
}

/* 标签页切换动画增强 */
:deep(.el-tabs__content) {
  overflow: hidden;
  padding: 0 !important;
}

:deep(.el-tab-pane) {
  animation: tabFadeIn 0.3s ease;
  padding: 0 !important;
}

/* 确保FlipBoardView无额外padding */
:deep(.flip-board-view) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 统计卡片 - 一行四个 */
.stats-cards {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 12px !important;
}

.stats-cards > div {
  width: 100% !important;
  max-width: none !important;
}

/* 平板模式优化 */
@media (min-width: 768px) and (max-width: 1024px) {
  .workspace-tabs {
    touch-action: pan-y;
  }
}

/* 统一看板标签文字大小 */
:deep(.workspace-tabs .el-tabs__item) {
  font-size: 18px;
  font-weight: 700;
  height: 32px;
  line-height: 32px;
}
</style>
