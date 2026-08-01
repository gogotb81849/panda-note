<template>
  <div class="staff-gantt-chart">
    <!-- 空状态 -->
    <div v-if="!loading && ships.length === 0" class="staff-gantt-empty">
      <p>暂无船舶数据</p>
    </div>

    <!-- 甘特图主体 -->
    <div v-else class="staff-gantt-wrapper" :style="{ height: chartHeight + 'px' }">
      <client-only>
        <v-chart
          ref="chartRef"
          class="staff-gantt-canvas"
          :option="chartOption"
          :loading="loading"
          autoresize
          @click="handleChartClick"
        />
        <template #fallback>
          <div class="staff-gantt-fallback">图表加载中...</div>
        </template>
      </client-only>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import VChart from 'vue-echarts'
import { use, graphic } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CustomChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
} from 'echarts/components'
import type { StaffAssignment } from '~/types'

use([
  CanvasRenderer,
  CustomChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
])

type ShipItem = { id: number; cnShipName: string; teamDisplayName?: string }
type AssignmentItem = {
  id: number
  userId: number
  shipId: number
  startDate: string
  endDate?: string | null
  status: string
  sourceCompany?: string
  assignmentNo?: string
  remark?: string
  user?: { id: number; realName: string }
  ship?: { id: number; cnShipName: string }
}

interface Props {
  ships: ShipItem[]
  assignments: AssignmentItem[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'bar-click': [payload: { assignment: StaffAssignment; event: MouseEvent }]
}>()

const DAY_MS = 1000 * 60 * 60 * 24

// 计算在船天数
function getDaysOnBoard(startDate: string, endDate?: string | null): number {
  const start = new Date(startDate).getTime()
  const end = endDate ? new Date(endDate).getTime() : Date.now()
  return Math.floor((end - start) / DAY_MS)
}

// 根据状态与在船天数获取色条颜色
function getBarColor(assignment: AssignmentItem): string {
  if (assignment.status === 'ended' || assignment.endDate) return '#b0b0b0'
  if (assignment.status === 'leave') return '#e6a23c'
  const days = getDaysOnBoard(assignment.startDate, assignment.endDate)
  if (days > 330) return '#ad0606'
  if (days > 300) return '#f56c6c'
  if (days > 240) return '#f89a3c'
  if (days > 180) return '#e6a23c'
  return '#67c23a'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: '在船',
    leave: '休假',
    ended: '已结束',
  }
  return map[status] || status
}

function formatDate(date?: string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 休假斜线图案（仅在客户端生成，避免 SSR 报错）
let leavePattern: any = null
function getLeavePattern() {
  if (leavePattern) return leavePattern
  if (typeof document === 'undefined') return '#e6a23c'
  const canvas = document.createElement('canvas')
  canvas.width = 10
  canvas.height = 10
  const ctx = canvas.getContext('2d')
  if (!ctx) return '#e6a23c'
  ctx.fillStyle = '#e6a23c'
  ctx.fillRect(0, 0, 10, 10)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-2, 12)
  ctx.lineTo(12, -2)
  ctx.stroke()
  leavePattern = new graphic.Pattern({ image: canvas, repeat: 'repeat' })
  return leavePattern
}

// 容器高度根据船舶数量动态计算
const chartHeight = computed(() => Math.max(props.ships.length * 40 + 100, 220))

const chartRef = ref<any>(null)

// 高度变化时主动 resize 一次，避免柱条错位
watch(chartHeight, () => {
  nextTick(() => {
    chartRef.value?.resize?.()
  })
})

// Y 轴类目：倒序排列，使第一艘船显示在最上面（ECharts 默认第一个类目在底部）
const yCategories = computed(() =>
  props.ships.slice().reverse().map((s) => s.teamDisplayName || s.cnShipName),
)

// shipId -> Y 轴类目索引
const shipIdToYIndex = computed(() => {
  const map = new Map<number, number>()
  props.ships.forEach((s, i) => {
    map.set(s.id, props.ships.length - 1 - i)
  })
  return map
})

// assignmentId -> assignment，供 tooltip / 点击事件查找
const assignmentMap = computed(() => {
  const map = new Map<number, AssignmentItem>()
  for (const a of props.assignments) map.set(a.id, a)
  return map
})

// 休假中的派任 id 集合，renderItem 用以判断是否使用斜线图案
const leaveIds = computed(() => {
  const set = new Set<number>()
  for (const a of props.assignments) {
    if (a.status === 'leave') set.add(a.id)
  }
  return set
})

// 是否存在在船 >330 天的派任（用于启用深红闪烁）
function isOverdueBlinkItem(a: AssignmentItem): boolean {
  return (
    a.status !== 'ended' &&
    !a.endDate &&
    a.status !== 'leave' &&
    getDaysOnBoard(a.startDate, a.endDate) > 330
  )
}

const hasOverdueBlink = computed(() => props.assignments.some(isOverdueBlinkItem))

// 闪烁状态
const blink = ref(true)
let blinkTimer: ReturnType<typeof setInterval> | null = null

function startBlink() {
  if (blinkTimer) return
  blinkTimer = setInterval(() => {
    blink.value = !blink.value
  }, 800)
}

function stopBlink() {
  if (blinkTimer) {
    clearInterval(blinkTimer)
    blinkTimer = null
  }
}

watch(
  hasOverdueBlink,
  (v) => {
    if (v) startBlink()
    else stopBlink()
  },
  { immediate: true },
)

onBeforeUnmount(() => stopBlink())

// 时间轴范围：覆盖所有派任数据 + 今天，并预留缓冲
const timeRange = computed(() => {
  let minT = Infinity
  let maxT = -Infinity
  const now = Date.now()
  for (const a of props.assignments) {
    const s = new Date(a.startDate).getTime()
    if (!isNaN(s)) {
      minT = Math.min(minT, s)
      maxT = Math.max(maxT, s)
    }
    const eTs = a.endDate ? new Date(a.endDate).getTime() : now
    if (!isNaN(eTs)) maxT = Math.max(maxT, eTs)
  }
  minT = Math.min(minT, now)
  maxT = Math.max(maxT, now)
  if (!isFinite(minT) || !isFinite(maxT)) {
    minT = now - 365 * DAY_MS
    maxT = now + 60 * DAY_MS
  }
  return {
    min: minT - 15 * DAY_MS,
    max: maxT + 15 * DAY_MS,
  }
})

// custom series 数据：[shipIndex, startDate, endDate, color, officerName, assignmentId]
const seriesData = computed(() => {
  return props.assignments.map((a) => {
    const shipIndex = shipIdToYIndex.value.get(a.shipId) ?? 0
    const start = new Date(a.startDate).getTime()
    const end = a.endDate ? new Date(a.endDate).getTime() : Date.now()
    let color = getBarColor(a)
    // 在船 >330 天：深红闪烁
    if (isOverdueBlinkItem(a)) {
      color = blink.value ? '#ad0606' : '#ff0000'
    }
    const officerName = a.user?.realName || '未指派'
    return [shipIndex, start, end, color, officerName, a.id]
  })
})

// renderItem：根据 startDate / endDate 在对应行画矩形条
function renderItem(_params: any, api: any) {
  const categoryIndex = api.value(0)
  const start = api.coord([api.value(1), categoryIndex])
  const end = api.coord([api.value(2), categoryIndex])
  const height = api.size([0, 1])[1] * 0.6

  const assignmentId = api.value(5)
  const isLeave = leaveIds.value.has(assignmentId)
  const fill = isLeave ? getLeavePattern() : api.value(3)

  const barWidth = Math.max(end[0] - start[0], 3)

  return {
    type: 'rect',
    transition: ['shape'],
    shape: {
      x: start[0],
      y: start[1] - height / 2,
      width: barWidth,
      height: height,
      r: 3,
    },
    style: {
      fill: fill,
      text: api.value(4),
      textFill: '#fff',
      fontSize: 11,
      textPosition: 'insideLeft',
      textAlign: 'left',
      textVerticalAlign: 'middle',
    },
  }
}

// ECharts 配置
const chartOption = computed(() => {
  const tr = timeRange.value
  const now = Date.now()
  const defaultStart = now - 540 * DAY_MS
  const defaultEnd = now + 60 * DAY_MS

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params?.data
        if (!data) return ''
        const id = data[5]
        const a = assignmentMap.value.get(id)
        if (!a) return ''
        const shipName =
          a.ship?.cnShipName ||
          props.ships.find((s) => s.id === a.shipId)?.cnShipName ||
          '-'
        const officer = a.user?.realName || '未指派'
        const days = getDaysOnBoard(a.startDate, a.endDate)
        const startStr = formatDate(a.startDate)
        const endStr = a.endDate ? formatDate(a.endDate) : '至今'
        const status = statusLabel(a.status)
        return `
          <div style="font-weight:600;margin-bottom:4px;">${officer}</div>
          <div>船舶：${shipName}</div>
          <div>上船日期：${startStr}</div>
          <div>下船日期：${endStr}</div>
          <div>在船天数：${days} 天</div>
          <div>状态：${status}</div>
          ${a.sourceCompany ? `<div>来源公司：${a.sourceCompany}</div>` : ''}
          ${a.assignmentNo ? `<div>派任编号：${a.assignmentNo}</div>` : ''}
          ${a.remark ? `<div>备注：${a.remark}</div>` : ''}
        `
      },
    },
    grid: {
      left: 140,
      right: 40,
      top: 30,
      bottom: 70,
    },
    xAxis: {
      type: 'time',
      min: tr.min,
      max: tr.max,
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { color: '#606266', hideOverlap: true },
      splitLine: { show: true, lineStyle: { color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'category',
      data: yCategories.value,
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisTick: { show: false },
      axisLabel: { color: '#303133', fontSize: 12 },
      splitLine: { show: true, lineStyle: { color: '#f5f5f5' } },
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        startValue: defaultStart,
        endValue: defaultEnd,
        height: 20,
        bottom: 10,
        borderColor: '#dcdfe6',
      },
      {
        type: 'inside',
        xAxisIndex: 0,
      },
    ],
    series: [
      {
        type: 'custom',
        renderItem,
        encode: {
          x: [1, 2],
          y: 0,
        },
        clip: true,
        data: seriesData.value,
        markLine: {
          symbol: ['none', 'none'],
          label: {
            formatter: '今天',
            position: 'end',
            color: '#409eff',
            fontSize: 11,
          },
          lineStyle: {
            color: '#409eff',
            type: 'solid',
            width: 1.5,
          },
          data: [{ xAxis: now }],
        },
      },
    ],
  }
})

// 点击色条触发事件
function handleChartClick(params: any) {
  const data = params?.data
  if (!data) return
  const id = data[5]
  const assignment = assignmentMap.value.get(id)
  if (!assignment) return
  const nativeEvent =
    (params?.event && (params.event.event || params.event)) as MouseEvent
  emit('bar-click', {
    assignment: assignment as unknown as StaffAssignment,
    event: nativeEvent,
  })
}

defineExpose({ chartRef })
</script>

<style scoped>
.staff-gantt-chart {
  width: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.staff-gantt-wrapper {
  width: 100%;
  position: relative;
}

.staff-gantt-canvas {
  width: 100%;
  height: 100%;
}

.staff-gantt-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  font-size: 14px;
}

.staff-gantt-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: #909399;
  font-size: 14px;
}
</style>
