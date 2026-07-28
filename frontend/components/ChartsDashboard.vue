<template>
  <div class="charts-dashboard">
    <!-- 统计概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card" v-for="card in overviewCards" :key="card.title">
        <div class="card-icon" :style="{ background: card.color + '20', color: card.color }">
          <span>{{ card.icon }}</span>
        </div>
        <div class="card-content">
          <div class="card-title">{{ card.title }}</div>
          <div class="card-value">{{ card.value }}</div>
          <div class="card-trend" :class="card.trend > 0 ? 'up' : card.trend < 0 ? 'down' : ''">
            {{ card.trend > 0 ? '↑' : card.trend < 0 ? '↓' : '-' }} {{ Math.abs(card.trend) }}%
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <!-- 任务状态分布饼图 -->
      <div class="chart-card">
        <h3 class="chart-title">任务状态分布</h3>
        <v-chart class="chart" :option="taskStatusOption" autoresize />
      </div>

      <!-- 任务优先级分布 -->
      <div class="chart-card">
        <h3 class="chart-title">任务优先级分布</h3>
        <v-chart class="chart" :option="priorityOption" autoresize />
      </div>

      <!-- 任务趋势折线图 -->
      <div class="chart-card full-width">
        <h3 class="chart-title">近30天任务趋势</h3>
        <v-chart class="chart large" :option="trendOption" autoresize />
      </div>

      <!-- 各部门任务对比 -->
      <div class="chart-card">
        <h3 class="chart-title">各部门任务统计</h3>
        <v-chart class="chart" :option="departmentOption" autoresize />
      </div>

      <!-- 完成率仪表盘 -->
      <div class="chart-card">
        <h3 class="chart-title">任务完成率</h3>
        <v-chart class="chart" :option="completionOption" autoresize />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, LineChart, BarChart, GaugeChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'

use([
  CanvasRenderer,
  PieChart,
  LineChart,
  BarChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const props = defineProps<{
  taskStats?: any
}>()

// 模拟数据（实际应从API获取）
const mockTaskData = computed(() => ({
  status: {
    pending: 12,
    in_progress: 8,
    completed: 25,
    cancelled: 3,
  },
  priority: {
    urgent_important: 5,
    important: 8,
    urgent: 3,
    normal: 15,
    low: 17,
  },
  trend: {
    dates: Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - 29 + i)
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }),
    created: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 2),
    completed: Array.from({ length: 30 }, () => Math.floor(Math.random() * 8) + 1),
  },
  departments: {
    categories: ['航行安全', '人员管理', '公司检查', '设备维护', '安全管理'],
    values: [18, 12, 8, 15, 22],
  },
  completionRate: 72.5,
}))

// 概览卡片
const overviewCards = computed(() => {
  const data = mockTaskData.value
  const total = Object.values(data.status).reduce((a, b) => a + b, 0)
  return [
    {
      title: '总任务数',
      value: total,
      icon: '📋',
      color: '#409eff',
      trend: 12,
    },
    {
      title: '待办任务',
      value: data.status.pending,
      icon: '⏳',
      color: '#e6a23c',
      trend: -5,
    },
    {
      title: '进行中',
      value: data.status.in_progress,
      icon: '🔄',
      color: '#67c23a',
      trend: 8,
    },
    {
      title: '已完成',
      value: data.status.completed,
      icon: '✅',
      color: '#909399',
      trend: 15,
    },
  ]
})

// 任务状态分布饼图
const taskStatusOption = computed(() => {
  const data = mockTaskData.value
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '0%', left: 'center' },
    series: [
      {
        name: '任务状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        data: [
          { value: data.status.pending, name: '待办', itemStyle: { color: '#e6a23c' } },
          { value: data.status.in_progress, name: '进行中', itemStyle: { color: '#67c23a' } },
          { value: data.status.completed, name: '已完成', itemStyle: { color: '#409eff' } },
          { value: data.status.cancelled, name: '已取消', itemStyle: { color: '#c0c4cc' } },
        ],
      },
    ],
  }
})

// 优先级分布柱状图
const priorityOption = computed(() => {
  const data = mockTaskData.value
  const labels = {
    urgent_important: '重要紧急',
    important: '重要不紧急',
    urgent: '紧急不重要',
    normal: '普通',
    low: '低',
  }
  const colors = ['#f56c6c', '#e6a23c', '#409eff', '#909399', '#c0c4cc']

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Object.keys(data.priority).map(k => labels[k]),
      axisLabel: { interval: 0, rotate: 30 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '任务数',
        type: 'bar',
        data: Object.values(data.priority).map((value, index) => ({
          value,
          itemStyle: { color: colors[index] },
        })),
        barWidth: '60%',
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
})

// 趋势折线图
const trendOption = computed(() => {
  const data = mockTaskData.value
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新创建', '已完成'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.trend.dates,
      axisLabel: {
        interval: 4,
        rotate: 30,
      },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '新创建',
        type: 'line',
        smooth: true,
        data: data.trend.created,
        itemStyle: { color: '#409eff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
            ],
          },
        },
      },
      {
        name: '已完成',
        type: 'line',
        smooth: true,
        data: data.trend.completed,
        itemStyle: { color: '#67c23a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.05)' },
            ],
          },
        },
      },
    ],
  }
})

// 部门统计
const departmentOption = computed(() => {
  const data = mockTaskData.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: data.departments.categories,
    },
    series: [
      {
        name: '任务数',
        type: 'bar',
        data: data.departments.values,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#409eff' },
              { offset: 1, color: '#67c23a' },
            ],
          },
        },
        barWidth: '50%',
        label: { show: true, position: 'right' },
      },
    ],
  }
})

// 完成率仪表盘
const completionOption = computed(() => {
  const rate = mockTaskData.value.completionRate
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: { color: '#409eff' },
        progress: {
          show: true,
          width: 18,
        },
        pointer: { show: false },
        axisLine: {
          lineStyle: { width: 18 },
        },
        axisTick: { show: false },
        splitLine: {
          length: 15,
          lineStyle: { width: 2, color: '#999' },
        },
        axisLabel: {
          distance: 25,
          color: '#999',
          fontSize: 12,
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          fontSize: 30,
          offsetCenter: [0, '0%'],
          color: '#303133',
        },
        data: [{ value: rate }],
      },
    ],
  }
})
</script>

<style scoped>
.charts-dashboard {
  background: #f5f7fa;
}

/* 概览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.overview-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.card-value {
  font-size: 22px;
  font-weight: bold;
  color: var(--color-text);
}

.card-trend {
  font-size: 11px;
  margin-top: 2px;
}

.card-trend.up {
  color: var(--color-success);
}

.card-trend.down {
  color: var(--color-danger);
}

/* 图表网格 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-title {
  font-size: 14px;
  color: var(--color-text);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.chart {
  width: 100%;
  height: 200px;
}

.chart.large {
  height: 220px;
}

/* 响应式 */
@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
