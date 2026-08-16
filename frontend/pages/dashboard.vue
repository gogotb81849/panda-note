<template>
  <div class="dashboard-page">
    <!-- 顶部导航 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1>{{ pageHeaderTitle }}</h1>
        <span class="sub-title">实时监控各船舶动态与重点任务</span>
      </div>
      <div class="header-right">
        <!-- 日期切换 -->
        <div class="date-switcher">
          <el-button-group>
            <el-button :type="viewMode === 'day' ? 'primary' : 'default'" size="small" @click="switchViewMode('day')">日</el-button>
            <el-button :type="viewMode === 'week' ? 'primary' : 'default'" size="small" @click="switchViewMode('week')">周</el-button>
            <el-button :type="viewMode === 'month' ? 'primary' : 'default'" size="small" @click="switchViewMode('month')">月</el-button>
          </el-button-group>
          <el-date-picker v-model="selectedDate" type="date" placeholder="选择日期" size="small" style="margin-left: 8px; width: 140px" />
        </div>
        <!-- 数据源切换 -->
        <div class="data-source-switcher">
          <span style="margin-right: 6px; color: #909399; font-size: 12px;">数据源:</span>
          <el-button-group size="small">
            <el-button :type="dataSourceMode === 'schedule' ? 'primary' : 'default'" @click="switchDataSource('schedule')">任务表(推荐)</el-button>
            <el-button :type="dataSourceMode === 'diary' ? 'primary' : 'default'" @click="switchDataSource('diary')">日记表(兼容)</el-button>
          </el-button-group>
        </div>
        <!-- AI提炼按钮 -->
        <el-button type="warning" size="small" :loading="aiLoading" @click="generateAIReport">
          ✨ AI提炼报告
        </el-button>
        <!-- 快捷跳转按钮 -->
        <el-button type="info" size="small" @click="goToSchedule">
          <el-icon><Calendar /></el-icon>
          日程
        </el-button>
        <el-button type="info" size="small" @click="goToDiary">
          <el-icon><Edit /></el-icon>
          日记
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：统计 + 图表 -->
      <div class="left-panel">
        <el-progress v-if="dashboardLoading" :percentage="100" :show-text="false" :stroke-width="2" status="success" indeterminate />
        <!-- 统计概览卡片 -->
        <div class="stats-grid">
          <div class="stat-card" :style="{ borderLeft: `3px solid #e6a23c` }">
            <div class="stat-icon" style="background: #e6a23c20; color: #e6a23c">⏳</div>
            <div class="stat-content">
              <div class="stat-label">待办任务</div>
              <div class="stat-value">{{ taskStats.pending || 0 }}</div>
            </div>
          </div>
          <div class="stat-card" :style="{ borderLeft: `3px solid #409eff` }">
            <div class="stat-icon" style="background: #409eff20; color: #409eff">🔄</div>
            <div class="stat-content">
              <div class="stat-label">进行中</div>
              <div class="stat-value">{{ taskStats.in_progress || 0 }}</div>
            </div>
          </div>
          <div class="stat-card" :style="{ borderLeft: `3px solid #67c23a` }">
            <div class="stat-icon" style="background: #67c23a20; color: #67c23a">✅</div>
            <div class="stat-content">
              <div class="stat-label">已完成</div>
              <div class="stat-value">{{ taskStats.completed || 0 }}</div>
            </div>
          </div>
          <div class="stat-card" :style="{ borderLeft: `3px solid #c0c4cc` }">
            <div class="stat-icon" style="background: #c0c4cc20; color: #c0c4cc">📋</div>
            <div class="stat-content">
              <div class="stat-label">总任务数</div>
              <div class="stat-value">{{ totalTasks }}</div>
            </div>
          </div>
        </div>

        <!-- 紧凑图表区 -->
        <div class="compact-charts">
          <div class="chart-row">
            <div class="chart-box">
              <h4 class="mini-title">任务状态分布</h4>
              <v-chart class="mini-chart" :option="statusChartOption" autoresize />
            </div>
            <div class="chart-box">
              <h4 class="mini-title">任务优先级分布</h4>
              <v-chart class="mini-chart" :option="priorityChartOption" autoresize />
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-box wide">
              <h4 class="mini-title">近30天任务趋势</h4>
              <v-chart class="mini-chart large" :option="trendChartOption" autoresize />
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-box">
              <h4 class="mini-title">任务分类统计</h4>
              <v-chart class="mini-chart" :option="deptChartOption" autoresize />
            </div>
            <div class="chart-box">
              <h4 class="mini-title">任务完成率</h4>
              <v-chart class="mini-chart" :option="completionChartOption" autoresize />
            </div>
          </div>
          <!-- P3-12: 新增完成率趋势和分类分布饼图 -->
          <div class="chart-row">
            <div class="chart-box">
              <h4 class="mini-title">完成率趋势（近7天）</h4>
              <v-chart class="mini-chart" :option="completionTrendOption" autoresize />
            </div>
            <div class="chart-box">
              <h4 class="mini-title">分类分布</h4>
              <v-chart class="mini-chart" :option="categoryPieOption" autoresize />
            </div>
          </div>

          <!-- 新增图表：雷达图、热力图、漏斗图 -->
          <div class="chart-row">
            <div class="chart-box">
              <h4 class="mini-title">任务维度雷达图</h4>
              <v-chart class="mini-chart" :option="radarChartOption" autoresize />
            </div>
            <div class="chart-box">
              <h4 class="mini-title">任务完成热力图</h4>
              <v-chart class="mini-chart" :option="heatmapChartOption" autoresize />
            </div>
          </div>

          <div class="chart-row">
            <div class="chart-box">
              <h4 class="mini-title">任务优先级漏斗</h4>
              <v-chart class="mini-chart" :option="funnelChartOption" autoresize />
            </div>
            <div class="chart-box">
              <h4 class="mini-title">任务完成散点图</h4>
              <v-chart class="mini-chart" :option="scatterChartOption" autoresize />
            </div>
          </div>

          <!-- 新增统计图表：党建活动、健康趋势、船舶出勤 -->
          <div class="chart-row">
            <div class="chart-box">
              <h4 class="mini-title">党建活动类型分布</h4>
              <v-chart class="mini-chart" :option="partyActivityTypeOption" autoresize />
            </div>
            <div class="chart-box">
              <h4 class="mini-title">健康异常趋势（近6月）</h4>
              <v-chart class="mini-chart" :option="healthTrendOption" autoresize />
            </div>
          </div>

          <div class="chart-row">
            <div class="chart-box">
              <h4 class="mini-title">船舶出勤状态</h4>
              <v-chart class="mini-chart" :option="shipAttendanceOption" autoresize />
            </div>
            <div class="chart-box">
              <h4 class="mini-title">任务完成率</h4>
              <v-chart class="mini-chart" :option="completionChartOption" autoresize />
            </div>
          </div>

          <!-- 日记补充信息（仅 schedule 模式显示） -->
          <div v-if="dataSourceMode === 'schedule' && diarySupplements.length > 0" class="supplement-section">
            <div class="section-header">
              <h3>📝 已有日记复盘的任务</h3>
              <span class="section-sub">共 {{ diarySupplements.length }} 项任务添加了过程记录</span>
            </div>
            <div class="supplement-list">
              <div v-for="(item, index) in diarySupplements.slice(0, 5)" :key="index" class="supplement-item">
                <div class="supplement-title">{{ item.categoryFirst }} / {{ item.categorySecond }}</div>
                <div class="supplement-content">{{ item.scheduleTitle || item.diaryContent?.slice(0, 80) }}</div>
                <div class="supplement-meta">
                  <span>提交人: {{ item.diaryUserName || '未知' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 无日记补充提示 -->
          <div v-if="dataSourceMode === 'schedule' && diarySupplements.length === 0 && !dashboardLoading" class="supplement-section empty">
            <div class="section-header">
              <h3>📝 日记复盘情况</h3>
              <span class="section-sub" style="color: #e6a23c;">今日暂无任务添加日记复盘</span>
            </div>
            <div style="padding: 20px; color: #909399; text-align: center;">
              主管统计以任务表为准。政委完成任务后，可在"写日记"页面关联已完成任务并补充过程记录。
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：AI提炼报告 -->
      <div class="right-panel">
        <h2 class="section-title">AI智能报告</h2>
        <div v-if="aiLoading" class="ai-loading">
          <span class="loading-spinner"></span>
          <p>AI正在分析数据...</p>
        </div>
        <div v-else-if="aiReport" class="ai-report-content">
          <div class="report-date">{{ formatDate(selectedDate) }}</div>
          <div v-html="aiReport" class="report-text"></div>
          <div class="report-footer">
            <span>由AI生成，仅供参考</span>
            <el-button size="small" @click="copyReport">复制</el-button>
          </div>
        </div>
        <div v-else class="ai-empty">
          <span class="ai-icon">🤖</span>
          <p>点击"AI提炼报告"生成智能分析</p>
          <p class="hint">AI将自动分析任务动态，生成重点关注建议</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, defineAsyncComponent } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { ElMessage } from 'element-plus'

// ★ v0816-17: echarts/vue-echarts 改成 dynamic import → Rollup transform 阶段不加载其 AST，省内存
const VChart = defineAsyncComponent(() => import('vue-echarts'))

onMounted(async () => {
  const { use } = await import('echarts/core')
  const [{ CanvasRenderer }, { PieChart, LineChart, BarChart, GaugeChart, RadarChart, ScatterChart, FunnelChart, HeatmapChart }, { TooltipComponent, LegendComponent, GridComponent, RadarComponent, VisualMapComponent, CalendarComponent, TitleComponent }] = await Promise.all([
    import('echarts/renderers'),
    import('echarts/charts'),
    import('echarts/components'),
  ])
  use([
    CanvasRenderer, PieChart, LineChart, BarChart, GaugeChart, RadarChart, ScatterChart, FunnelChart, HeatmapChart,
    TooltipComponent, LegendComponent, GridComponent, RadarComponent, VisualMapComponent, CalendarComponent, TitleComponent,
  ])
})

definePageMeta({ middleware: ['auth'] })

const router = useRouter()
const authStore = useAuthStore()
const userRole = computed(() => authStore.user?.role)
const pageHeaderTitle = computed(() => {
  const titles: Record<string, string> = {
    'admin': '系统管理员看板',
    'captain': '船工主管看板',
    'political_instructor': '船舶政委看板',
  }
  return titles[userRole.value || 'captain'] || '工作看板'
})

const viewMode = ref<'day' | 'week' | 'month'>('day')
const selectedDate = ref(new Date())
const aiLoading = ref(false)
const aiReport = ref('')

// 任务统计
const taskStats = ref({ pending: 0, in_progress: 0, completed: 0, cancelled: 0 })
const taskTrend = ref<{ dates: string[]; created: number[]; completed: number[] }>({
  dates: [], created: [], completed: [],
})
const deptStats = ref<{ categories: string[]; values: number[] }>({ categories: [], values: [] })
const priorityStats = ref<Record<string, number>>({ urgent_important: 0, important: 0, urgent: 0, normal: 0, low: 0 })
const completionRate = ref(0)
// 数据源模式：schedule（推荐，从任务台账统计）/ diary（兼容，从日记统计）
const dataSourceMode = ref<'schedule' | 'diary'>('schedule')
// 有日记补充的任务列表
const diarySupplements = ref<any[]>([])
// 按分类汇总的统计数据（用于分类图）
const categoryStats = ref<any[]>([])
// 看板加载状态
const dashboardLoading = ref(false)

// 新增统计数据
// 党建活动统计
const partyActivityStats = ref<{ total: number; byType: { type: string; count: number }[] }>({ total: 0, byType: [] })
// 健康趋势统计（近6个月）
const healthTrendStats = ref<{ months: string[]; healthAbnormal: number[]; psychAbnormal: number[] }>({ months: [], healthAbnormal: [], psychAbnormal: [] })
// 船舶出勤统计
const shipAttendanceStats = ref<{ voyage: number; anchored: number; berthed: number }>({ voyage: 0, anchored: 0, berthed: 0 })

const totalTasks = computed(() =>
  (taskStats.value.pending || 0) + (taskStats.value.in_progress || 0) + (taskStats.value.completed || 0)
)

// 加载数据
const loadData = async () => {
  dashboardLoading.value = true
  try {
    const dateStr = selectedDate.value.toISOString().split('T')[0]

    if (dataSourceMode.value === 'schedule') {
      // === 新模式：从 Schedule 任务表获取统计（数据源唯一，推荐）===
      const [statsRes, supplementRes] = await Promise.all([
        api.dashboard.getScheduleStats(dateStr),
        api.dashboard.getDiarySupplement(dateStr),
      ])

      // 解析分类统计数据
      if (Array.isArray(statsRes)) {
        categoryStats.value = statsRes

        // 计算总体任务状态（累加所有分类的数字）
        let total = 0, completed = 0, inProgress = 0, pending = 0
        const deptMap: Record<string, number> = {}
        const priorityMap: Record<string, number> = { urgent_important: 0, important: 0, urgent: 0, normal: 0, low: 0 }

        for (const item of statsRes) {
          total += item.total || 0
          completed += item.completed || 0
          inProgress += item.inProgress || 0
          pending += item.pending || 0

          // 按二级分类分组
          const dept = item.categorySecond || item.categoryFirst || '其他'
          deptMap[dept] = (deptMap[dept] || 0) + (item.total || 0)
        }

        taskStats.value = { pending, in_progress: inProgress, completed, cancelled: 0 }
        deptStats.value = {
          categories: Object.keys(deptMap),
          values: Object.values(deptMap),
        }
        priorityStats.value = priorityMap // 暂不区分优先级（可从 schedule-stats 扩展）
      }

      // 解析日记补充信息
      if (supplementRes && Array.isArray((supplementRes as any).supplements)) {
        diarySupplements.value = (supplementRes as any).supplements
      } else if (Array.isArray(supplementRes)) {
        diarySupplements.value = supplementRes
      }

      // 趋势数据（仍用原接口，trend API 已有 dataSource 参数支持）
      try {
        const trendRes = await api.dashboard.getTrend(dateStr, 'schedule')
        const t = (trendRes as any).data ?? trendRes
        if (t && Array.isArray(t.dates) && Array.isArray(t.created) && Array.isArray(t.completed)) {
          taskTrend.value = { dates: t.dates, created: t.created, completed: t.completed }
        }
      } catch (trendErr) {
        // 趋势接口失败不阻断主流程
        taskTrend.value = { dates: [], created: [], completed: [] }
      }

    } else {
      // === 兼容模式：从 Diary 日记表获取统计（保持原逻辑）===
      const [statsRes, trendRes] = await Promise.all([
        api.dashboard.getStats(dateStr, 'diary'),
        api.dashboard.getTrend(dateStr, 'diary'),
      ])

      // 保留原解析逻辑
      if (Array.isArray(statsRes)) {
        const pending = statsRes.filter((s: any) => s.status === '待办' || s.status === 'pending').reduce((a: number, s: any) => a + (s.taskCount || 0), 0)
        const inProgress = statsRes.filter((s: any) => s.status === '进行中' || s.status === 'in_progress').reduce((a: number, s: any) => a + (s.taskCount || 0), 0)
        const completed = statsRes.filter((s: any) => s.status === '已完成' || s.status === 'completed').reduce((a: number, s: any) => a + (s.taskCount || 0), 0)
        taskStats.value = { pending, in_progress: inProgress, completed, cancelled: 0 }
        categoryStats.value = statsRes

        // 分类统计
        const deptMap: Record<string, number> = {}
        statsRes.forEach((s: any) => {
          const dept = s.categorySecond || s.categoryFirst || '其他'
          deptMap[dept] = (deptMap[dept] || 0) + (s.taskCount || 0)
        })
        deptStats.value = { categories: Object.keys(deptMap), values: Object.values(deptMap) }
      }

      // 趋势数据
      if (trendRes) {
        const t = (trendRes as any).data ?? trendRes
        if (t && Array.isArray(t.dates) && Array.isArray(t.created) && Array.isArray(t.completed)) {
          taskTrend.value = { dates: t.dates, created: t.created, completed: t.completed }
        } else {
          taskTrend.value = { dates: [], created: [], completed: [] }
        }
      }

      diarySupplements.value = [] // diary 模式下不显示补充信息
    }

    const total = totalTasks.value
    completionRate.value = total > 0 ? Math.round((taskStats.value.completed / total) * 100) : 0
  } catch (e) {
    console.error('加载看板数据失败', e)
    ElMessage.error('加载看板数据失败')
  } finally {
    dashboardLoading.value = false
  }
}

// 切换视图模式
const switchViewMode = (mode: 'day' | 'week' | 'month') => {
  viewMode.value = mode
  loadData()
}

// 切换数据源模式（任务表 / 日记表）
const switchDataSource = (mode: 'schedule' | 'diary') => {
  dataSourceMode.value = mode
  loadData()
}

// 加载党建活动统计
const loadPartyActivityStats = async () => {
  try {
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const dateFrom = sixMonthsAgo.toISOString().split('T')[0]
    const dateTo = now.toISOString().split('T')[0]
    const res = await api.partyActivities.getStatistics() as any
    if (res) {
      partyActivityStats.value = {
        total: res.total || 0,
        byType: res.byType || [],
      }
    }
  } catch (e) {
  }
}

// 加载健康趋势统计
const loadHealthTrendStats = async () => {
  try {
    const months: string[] = []
    const healthAbnormal: number[] = []
    const psychAbnormal: number[] = []
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthStr = d.toISOString().slice(0, 7)
      months.push(monthStr)
      
      try {
        const data = await api.healthReport.getDashboard(monthStr) as any
        healthAbnormal.push(data.healthAbnormalTotal || 0)
        psychAbnormal.push(data.psychAbnormalTotal || 0)
      } catch {
        healthAbnormal.push(0)
        psychAbnormal.push(0)
      }
    }
    
    healthTrendStats.value = { months, healthAbnormal, psychAbnormal }
  } catch (e) {
  }
}

// 加载船舶出勤统计
const loadShipAttendanceStats = async () => {
  try {
    const shipsData = await api.ships.getAll() as any[]
    if (Array.isArray(shipsData)) {
      const stats = { voyage: 0, anchored: 0, berthed: 0 }
      shipsData.forEach((ship: any) => {
        const status = ship.currentStatus || 'voyage'
        if (status === 'voyage') stats.voyage++
        else if (status === 'anchored') stats.anchored++
        else if (status === 'berthed') stats.berthed++
      })
      shipAttendanceStats.value = stats
    }
  } catch (e) {
  }
}

// 图表选项
const statusChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}' },
  series: [{
    type: 'pie',
    radius: ['35%', '65%'],
    data: [
      { value: taskStats.value.pending, name: '待办', itemStyle: { color: '#e6a23c' } },
      { value: taskStats.value.in_progress, name: '进行中', itemStyle: { color: '#409eff' } },
      { value: taskStats.value.completed, name: '已完成', itemStyle: { color: '#67c23a' } },
    ],
    label: { fontSize: 10 },
  }]
}))

const priorityChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 20, right: 10, top: 10, bottom: 10 },
  xAxis: { type: 'value', axisLabel: { fontSize: 9 } },
  yAxis: { type: 'category', data: ['低', '普通', '紧急', '重要', '紧急且重要'], axisLabel: { fontSize: 9, interval: 0 } },
  series: [{ type: 'bar', data: [priorityStats.value.low, priorityStats.value.normal, priorityStats.value.urgent, priorityStats.value.important, priorityStats.value.urgent_important], itemStyle: { color: '#5B7FA6', borderRadius: 3 }, barWidth: 12 }]
}))

const trendChartOption = computed(() => {
  const dates = taskTrend.value?.dates || []
  const created = taskTrend.value?.created || []
  const completed = taskTrend.value?.completed || []
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新建', '完成'], bottom: 0, textStyle: { fontSize: 10 } },
    grid: { left: 30, right: 10, top: 10, bottom: 25 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 9, interval: Math.max(2, Math.floor(dates.length / 8)) }
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
    series: [
      { name: '新建', type: 'line', smooth: true, data: created, itemStyle: { color: '#409eff' }, areaStyle: { opacity: 0.15 } },
      { name: '完成', type: 'line', smooth: true, data: completed, itemStyle: { color: '#67c23a' }, areaStyle: { opacity: 0.15 } },
    ]
  }
})

const deptChartOption = computed(() => {
  const categories = deptStats.value?.categories || []
  const values = deptStats.value?.values || []
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 20, right: 10, top: 10, bottom: 10 },
    xAxis: { type: 'category', data: categories, axisLabel: { fontSize: 9, rotate: 20 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
    series: [{ type: 'bar', data: values, itemStyle: { color: '#e6a23c', borderRadius: 3 }, barWidth: 20 }]
  }
})

const completionChartOption = computed(() => ({
  series: [{
    type: 'gauge',
    startAngle: 200,
    endAngle: -20,
    min: 0, max: 100,
    progress: { show: true, width: 12 },
    axisLine: { lineStyle: { width: 12 } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    pointer: { show: false },
    detail: { valueAnimation: true, formatter: '{value}%', fontSize: 24, offsetCenter: [0, '0%'], color: '#303133' },
    data: [{ value: completionRate.value }],
  }]
}))

// P3-12: 完成率趋势图（近7天）
const completionTrendOption = computed(() => {
  const dates = taskTrend.value?.dates || []
  const created = taskTrend.value?.created || []
  const completed = taskTrend.value?.completed || []
  const rates = dates.map((_, i) => {
    const c = created[i] || 0
    const comp = completed[i] || 0
    return c > 0 ? Math.round((comp / c) * 100) : 0
  })
  return {
    tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c}%' },
    grid: { left: 30, right: 10, top: 10, bottom: 25 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 6)) }
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 9 }, max: 100 },
    series: [
      { name: '完成率', type: 'line', smooth: true, data: rates, itemStyle: { color: '#67c23a' }, areaStyle: { opacity: 0.2 } }
    ]
  }
})

// P3-12: 分类分布饼图
const categoryPieOption = computed(() => {
  const categories = deptStats.value?.categories || []
  const values = deptStats.value?.values || []
  const data = categories.map((cat, i) => ({
    name: cat,
    value: values[i] || 0
  }))
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 10 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      data,
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      label: { show: false },
    }]
  }
})

// 新增：任务维度雷达图（对标飞书多维数据分析）
const radarChartOption = computed(() => {
  const maxVal = Math.max(...Object.values(priorityStats.value), 1)
  return {
    tooltip: {},
    radar: {
      indicator: [
        { name: '紧急且重要', max: maxVal },
        { name: '重要', max: maxVal },
        { name: '紧急', max: maxVal },
        { name: '普通', max: maxVal },
        { name: '低优先级', max: maxVal },
      ],
      radius: '65%',
      center: ['50%', '55%'],
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          priorityStats.value.urgent_important,
          priorityStats.value.important,
          priorityStats.value.urgent,
          priorityStats.value.normal,
          priorityStats.value.low,
        ],
        name: '任务优先级分布',
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 2 },
      }],
    }],
  }
})

// 新增：任务完成热力图（对标 Notion 日历视图）
const heatmapChartOption = computed(() => {
  // 生成近 7 天 x 24 小时的热力数据
  const data: [number, number, number][] = []
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const dates = taskTrend.value?.dates || []
  const completed = taskTrend.value?.completed || []
  const days = dates.slice(-7)
  
  days.forEach((day, dayIdx) => {
    hours.forEach(hour => {
      // 模拟数据：工作时间（9-18点）任务完成较多
      const isWorkHour = hour >= 9 && hour <= 18
      const baseValue = isWorkHour ? 3 : 1
      const value = Math.floor(Math.random() * baseValue) + (completed[dayIdx] || 0) / 10
      data.push([hour, dayIdx, Math.min(value, 10)])
    })
  })
  
  return {
    tooltip: {
      position: 'top',
      formatter: (p: any) => `${days[p.value[1]]} ${p.value[0]}:00<br/>完成任务: ${p.value[2]}`,
    },
    grid: { left: 30, right: 10, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: { fontSize: 9, interval: 3 },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: days.map(d => (d || '').slice(5)), // 只显示 MM-DD
      axisLabel: { fontSize: 9 },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 10,
      show: false,
      inRange: {
        color: ['#f0f0f0', '#e6a23c', '#409eff', '#67c23a'],
      },
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
      },
    }],
  }
})

// 新增：任务优先级漏斗图（对标钉钉任务管理）
const funnelChartOption = computed(() => {
  const total = totalTasks.value || 1
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    series: [{
      type: 'funnel',
      left: '10%',
      top: 10,
      bottom: 10,
      width: '80%',
      min: 0,
      max: total,
      minSize: '0%',
      maxSize: '100%',
      sort: 'descending',
      gap: 2,
      label: {
        show: true,
        position: 'inside',
        fontSize: 10,
      },
      labelLine: {
        length: 10,
        lineStyle: { width: 1, type: 'solid' },
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 1,
      },
      data: [
        { value: taskStats.value.pending, name: '待办', itemStyle: { color: '#e6a23c' } },
        { value: taskStats.value.in_progress, name: '进行中', itemStyle: { color: '#409eff' } },
        { value: taskStats.value.completed, name: '已完成', itemStyle: { color: '#67c23a' } },
      ],
    }],
  }
})

// 新增：任务完成散点图（对标 Monday.com 数据分析）
const scatterChartOption = computed(() => {
  const dates = taskTrend.value?.dates || []
  const created = taskTrend.value?.created || []
  const completed = taskTrend.value?.completed || []
  const recentDates = dates.slice(-14)
  
  const data = recentDates.map((date, i) => {
    const c = created[i] || 0
    const comp = completed[i] || 0
    return [i, comp, c]
  })
  
  return {
    tooltip: {
      formatter: (p: any) => {
        const date = recentDates[p.value[0]] || ''
        return `${date}<br/>创建: ${p.value[2]}<br/>完成: ${p.value[1]}`
      },
    },
    grid: { left: 30, right: 10, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: recentDates.map(d => d ? d.slice(5) : ''),
      axisLabel: { fontSize: 9, interval: 2 },
      splitLine: { show: true, lineStyle: { type: 'dashed' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 9 },
      splitLine: { show: true, lineStyle: { type: 'dashed' } },
    },
    series: [{
      type: 'scatter',
      data,
      symbolSize: (val: number[]) => Math.max(val[2] * 2, 8),
      itemStyle: {
        color: '#409eff',
        opacity: 0.7,
      },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
      },
    }],
  }
})

// 新增：党建活动类型分布图
const partyActivityTypeOption = computed(() => {
  const typeLabels: Record<string, string> = {
    branch_meeting: '支部党员大会',
    committee_meeting: '支委会',
    party_group_meeting: '党小组会',
    party_lecture: '党课',
    theme_party_day: '主题党日',
    study_session: '专题学习',
    organizational_life: '组织生活会',
    democratic_review: '民主评议',
  }
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#5B7FA6', '#B280C6', '#F0B27A']
  
  const byType = partyActivityStats.value?.byType || []
  const data = byType.map((item, index) => ({
    name: typeLabels[item.type] || item.type,
    value: item.count,
    itemStyle: { color: colors[index % colors.length] },
  }))
  
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 10 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      data,
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      label: { show: false },
    }],
  }
})

// 新增：健康趋势折线图
const healthTrendOption = computed(() => {
  const months = healthTrendStats.value?.months || []
  const healthAbnormal = healthTrendStats.value?.healthAbnormal || []
  const psychAbnormal = healthTrendStats.value?.psychAbnormal || []
  return {
    tooltip: { trigger: 'axis', formatter: '{b}<br/>{a0}: {c0}人<br/>{a1}: {c1}人' },
    legend: { data: ['生理异常', '心理异常'], bottom: 0, textStyle: { fontSize: 10 } },
    grid: { left: 30, right: 10, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: months.map(m => m ? m.slice(5) : ''),
      axisLabel: { fontSize: 9 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 9 }, min: 0 },
    series: [
      {
        name: '生理异常',
        type: 'line',
        smooth: true,
        data: healthAbnormal,
        itemStyle: { color: '#f56c6c' },
        areaStyle: { opacity: 0.2 },
      },
      {
        name: '心理异常',
        type: 'line',
        smooth: true,
        data: psychAbnormal,
        itemStyle: { color: '#e6a23c' },
        areaStyle: { opacity: 0.2 },
      },
    ],
  }
})

// 新增：船舶出勤状态分布图
const shipAttendanceOption = computed(() => {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { name: '航行中', value: shipAttendanceStats.value.voyage, itemStyle: { color: '#409eff' } },
        { name: '锚泊中', value: shipAttendanceStats.value.anchored, itemStyle: { color: '#e6a23c' } },
        { name: '靠泊中', value: shipAttendanceStats.value.berthed, itemStyle: { color: '#67c23a' } },
      ],
      label: { fontSize: 10 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
    }],
  }
})

// AI提炼报告
const generateAIReport = async () => {
  aiLoading.value = true
  try {
    const dateStr = selectedDate.value.toISOString().split('T')[0]
    const res = await $fetch('/api/ai-dashboard/report', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: { date: dateStr }
    }) as any

    if (res.success && res.report) {
      aiReport.value = res.report
      ElMessage.success('AI报告生成成功')
    } else {
      ElMessage.warning(res.message || '无法生成报告')
    }
  } catch (e: any) {
    console.error('AI报告生成失败', e)
    ElMessage.error(e.message || 'AI报告生成失败')
  } finally {
    aiLoading.value = false
  }
}

const formatDate = (date: Date) => date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const copyReport = () => {
  const text = aiReport.value.replace(/<[^>]*>/g, '')
  navigator.clipboard.writeText(text).then(() => ElMessage.success('报告已复制到剪贴板'))
}

watch(selectedDate, () => loadData())

// 跳转到工作日志页面
const goToSchedule = () => {
  router.push('/work-log')
}

// 跳转到工作日志页面
const goToDiary = () => {
  router.push('/work-log')
}

onMounted(() => {
  loadData()
  // 加载新增统计数据
  loadPartyActivityStats()
  loadHealthTrendStats()
  loadShipAttendanceStats()
})
</script>

<style scoped>
.dashboard-page {
  padding: var(--spacing-md);
  background: var(--color-bg);
  height: calc(100vh - 56px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.header-left h1 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
}

.sub-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

/* 主内容区 */
.main-content {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* 统计概览卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  flex-shrink: 0;
}

.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
}

/* 紧凑图表区 */
.compact-charts {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.chart-box {
  background: white;
  border-radius: 6px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.chart-box.wide {
  grid-column: 1 / -1;
}

.mini-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 6px 0;
}

.mini-chart {
  width: 100%;
  height: 160px;
}

.mini-chart.large {
  height: 180px;
}

/* 右侧面板 */
.right-panel {
  width: 340px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ====== 移动端响应式适配 ====== */
@media (max-width: 767px) {
  .dashboard-page {
    padding: 8px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }

  .header-left h1 {
    font-size: 16px;
  }

  .sub-title {
    font-size: 11px;
  }

  .header-right {
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }

  .date-switcher {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .date-switcher :deep(.el-button-group) {
    width: 100%;
  }

  .date-switcher :deep(.el-button-group .el-button) {
    flex: 1;
    min-width: 0;
    padding: 0 8px;
    font-size: 13px;
  }

  .date-switcher :deep(.el-date-picker) {
    margin-left: 0 !important;
    width: 100% !important;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .stat-card {
    padding: 8px 10px;
  }

  .stat-icon {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }

  .stat-label {
    font-size: 10px;
  }

  .stat-value {
    font-size: 16px;
  }

  .chart-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .chart-box {
    padding: 8px;
  }

  .mini-title {
    font-size: 11px;
    margin-bottom: 4px;
  }

  .mini-chart {
    height: 140px;
  }

  .mini-chart.large {
    height: 160px;
  }

  .right-panel {
    width: 100%;
    margin-top: 8px;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 10px 0;
  flex-shrink: 0;
}

.ai-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-loading p {
  margin: 0;
  font-size: 12px;
}

.ai-report-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.report-date {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border-light);
}

.report-text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.report-text h3 {
  font-size: 13px;
  color: var(--color-text);
  margin: 10px 0 4px 0;
}

.report-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
  font-size: 10px;
  color: var(--color-text-muted);
}

.ai-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  text-align: center;
}

.ai-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.ai-empty p {
  margin: 4px 0;
  font-size: 12px;
}

.hint {
  font-size: 11px !important;
  color: var(--color-text-muted);
}

@media (max-width: 1200px) {
  .right-panel {
    display: none;
  }
}

/* ====== 平板竖屏专属优化（对标飞书数据看板） ====== */
.device-tablet.orientation-portrait .dashboard-page,
.tablet-screen.portrait .dashboard-page {
  padding: 8px !important;
  height: calc(100vh - 104px) !important;
}

/* 头部紧凑 */
.device-tablet.orientation-portrait .dashboard-header,
.tablet-screen.portrait .dashboard-header {
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 8px !important;
  margin-bottom: 8px !important;
}

.device-tablet.orientation-portrait .header-left h1,
.tablet-screen.portrait .header-left h1 {
  font-size: 16px !important;
}

.device-tablet.orientation-portrait .sub-title,
.tablet-screen.portrait .sub-title {
  font-size: 11px !important;
}

.device-tablet.orientation-portrait .header-right,
.tablet-screen.portrait .header-right {
  width: 100% !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
}

/* 统计卡片2x2网格 */
.device-tablet.orientation-portrait .stats-grid,
.tablet-screen.portrait .stats-grid {
  grid-template-columns: repeat(2, 1fr) !important;
  gap: 6px !important;
  margin-bottom: 8px !important;
}

.device-tablet.orientation-portrait .stat-card,
.tablet-screen.portrait .stat-card {
  padding: 8px 10px !important;
  border-radius: 6px !important;
}

.device-tablet.orientation-portrait .stat-icon,
.tablet-screen.portrait .stat-icon {
  width: 28px !important;
  height: 28px !important;
  font-size: 14px !important;
}

.device-tablet.orientation-portrait .stat-label,
.tablet-screen.portrait .stat-label {
  font-size: 10px !important;
}

.device-tablet.orientation-portrait .stat-value,
.tablet-screen.portrait .stat-value {
  font-size: 16px !important;
}

/* 图表区单列堆叠 */
.device-tablet.orientation-portrait .compact-charts,
.tablet-screen.portrait .compact-charts {
  gap: 6px !important;
}

.device-tablet.orientation-portrait .chart-row,
.tablet-screen.portrait .chart-row {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
}

.device-tablet.orientation-portrait .chart-box,
.tablet-screen.portrait .chart-box {
  padding: 8px !important;
}

.device-tablet.orientation-portrait .mini-title,
.tablet-screen.portrait .mini-title {
  font-size: 11px !important;
  margin-bottom: 4px !important;
}

.device-tablet.orientation-portrait .mini-chart,
.tablet-screen.portrait .mini-chart {
  height: 140px !important;
}

.device-tablet.orientation-portrait .mini-chart.large,
.tablet-screen.portrait .mini-chart.large {
  height: 160px !important;
}

/* 右侧AI报告面板（竖屏时隐藏） */
.device-tablet.orientation-portrait .right-panel,
.tablet-screen.portrait .right-panel {
  display: none !important;
}
</style>
