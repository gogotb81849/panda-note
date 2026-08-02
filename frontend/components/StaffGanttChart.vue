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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
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

type ShipItem = { id: number; cnShipName: string; teamDisplayName?: string; politicalOfficerName?: string }
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
  ship?: { id: number; cnShipName: string; politicalOfficerName?: string }
}

interface Props {
  ships: ShipItem[]
  assignments: AssignmentItem[]
  vacantShipIds?: number[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  vacantShipIds: () => [],
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

// 根据状态与在船天数获取色条颜色（用于 tooltip / 兜底）
function getBarColor(assignment: AssignmentItem): string {
  if (assignment.status === 'ended' || assignment.endDate) return '#b8b8b8'
  if (assignment.status === 'leave') return '#e6a23c'
  const days = getDaysOnBoard(assignment.startDate, assignment.endDate)
  if (days > 330) return '#ad0606'
  if (days > 300) return '#f56c6c'
  if (days > 240) return '#f89a3c'
  if (days > 180) return '#e6a23c'
  return '#67c23a'
}

// === 渐变色条：6个月内纯绿，6个月后沿时间轴向红色渐变 ===
function getBarFill(assignment: AssignmentItem): string | object {
  // 已下船：整条灰色
  if (assignment.status === 'ended' || assignment.endDate) return '#b8b8b8'
  // 休假：斜线图案
  if (assignment.status === 'leave') return getLeavePattern()

  const days = getDaysOnBoard(assignment.startDate, assignment.endDate)
  // 6个月内：纯绿
  if (days <= 180) return '#67c23a'

  // 6个月后：沿色条时间轴渐变 绿→橙→红→深红
  const totalDays = Math.max(days, 1)
  const stops: { offset: number; color: string }[] = [
    { offset: 0, color: '#67c23a' },
    { offset: Math.min(180 / totalDays, 1), color: '#67c23a' },
  ]
  if (totalDays > 240) stops.push({ offset: Math.min(240 / totalDays, 1), color: '#f89a3c' })
  if (totalDays > 300) stops.push({ offset: Math.min(300 / totalDays, 1), color: '#f56c6c' })
  if (totalDays > 330) stops.push({ offset: Math.min(330 / totalDays, 1), color: '#ad0606' })

  const endColor = days > 330 ? '#ad0606' : days > 300 ? '#f56c6c' : days > 240 ? '#f89a3c' : '#e6a23c'
  stops.push({ offset: 1, color: endColor })

  return { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: stops }
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
// ⚠️ 必须用 cnShipName（具体船名），不能用 teamDisplayName（系列名），
// 否则同系列姊妹船会显示为同名（如"白鹿座系列"重复多次）
const yCategories = computed(() =>
  props.ships.slice().reverse().map((s) => s.cnShipName),
)

// shipId -> Y 轴类目索引
const shipIdToYIndex = computed(() => {
  const map = new Map<number, number>()
  props.ships.forEach((s, i) => {
    map.set(s.id, props.ships.length - 1 - i)
  })
  return map
})

// Y 轴类目索引 -> shipId（给 formatter / splitArea 用）
const yIndexToShipId = computed(() => {
  const arr: number[] = new Array(props.ships.length)
  props.ships.forEach((s, i) => {
    arr[props.ships.length - 1 - i] = s.id
  })
  return arr
})

const vacantIdSet = computed(() => new Set(props.vacantShipIds || []))

// splitArea 行背景色：空缺行高亮为淡红
const splitAreaStyles = computed(() => {
  const arr: any[] = []
  for (let i = 0; i < props.ships.length; i++) {
    const shipId = yIndexToShipId.value[i]
    if (vacantIdSet.value.has(shipId)) {
      arr.push({ color: 'rgba(245, 108, 108, 0.08)' })
    } else {
      arr.push({ color: i % 2 === 0 ? 'rgba(0,0,0,0.00)' : 'rgba(0,0,0,0.015)' })
    }
  }
  return arr
})

// assignmentId -> assignment，供 tooltip / 点击事件查找
const assignmentMap = computed(() => {
  const map = new Map<number, AssignmentItem>()
  for (const a of props.assignments) map.set(a.id, a)
  return map
})

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
    const color = getBarColor(a)
    // 政委名双数据源兜底：派任记录 user.realName → 船舶资料 politicalOfficerName → 未指派
    const officerName = a.user?.realName || a.ship?.politicalOfficerName || '未指派'
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
  const assignment = assignmentMap.value.get(assignmentId)

  // 从 assignment 计算渐变填充 + 文字颜色
  let fill: string | object = '#ccc'
  let textFill = '#fff'
  let opacity = 1
  if (assignment) {
    fill = getBarFill(assignment)
    if (assignment.status === 'ended' || assignment.endDate) {
      textFill = '#888'
      opacity = 0.65
    }
  }

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
      textFill: textFill,
      fontSize: 11,
      textPosition: 'insideLeft',
      textAlign: 'left',
      textVerticalAlign: 'middle',
      opacity: opacity,
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
        const officer = a.user?.realName || a.ship?.politicalOfficerName || '未指派'
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
      axisLabel: {
        color: '#303133',
        fontSize: 12,
        formatter: (val: string, idx: number) => {
          const shipId = yIndexToShipId.value[idx]
          if (vacantIdSet.value.has(shipId)) {
            return `{name|${val}}{vacant|空缺}`
          }
          return `{name|${val}}`
        },
        rich: {
          name: { color: '#303133', fontSize: 12, padding: [0, 6, 0, 0], lineHeight: 20 },
          vacant: {
            backgroundColor: 'rgba(245, 108, 108, 0.15)',
            borderColor: '#f56c6c',
            borderWidth: 1,
            color: '#c0392b',
            fontSize: 10,
            padding: [1, 5],
            borderRadius: 8,
            lineHeight: 20,
          },
        },
      },
      splitLine: { show: true, lineStyle: { color: '#f5f5f5' } },
      splitArea: {
        show: true,
        interval: 0,
        areaStyle: splitAreaStyles.value,
      },
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
        // 移动端友好：允许单指拖动 + 双指缩放
        moveOnMouseMove: true,
        zoomOnMouseWheel: true,
        // 移动端默认就支持 touch 拖动；pinch 缩放由下面的自定义 handler 增强
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

// ====== 移动端双指缩放（pinch-to-zoom）======
// ECharts inside dataZoom 在移动端默认只支持单指横向拖动，
// 双指缩放需要手动监听 touchstart/touchmove 并 dispatchAction。

let pinchInitialDistance = 0
let pinchInitialStartPct = 0
let pinchInitialEndPct = 0

function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 2) return
  e.preventDefault()
  pinchInitialDistance = getTouchDistance(e.touches[0], e.touches[1])
  // 读取当前 dataZoom 范围
  const chart = chartRef.value
  if (chart) {
    const opt = chart.getOption() as any
    const dz = opt?.dataZoom?.[1] // inside dataZoom
    if (dz && typeof dz.start === 'number' && typeof dz.end === 'number') {
      pinchInitialStartPct = dz.start
      pinchInitialEndPct = dz.end
    } else {
      // 兜底：默认显示范围
      pinchInitialStartPct = 0
      pinchInitialEndPct = 100
    }
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 2) return
  e.preventDefault()
  if (pinchInitialDistance <= 0) return
  const currentDistance = getTouchDistance(e.touches[0], e.touches[1])
  // 缩放比例：两指距离变大 → 缩小范围（放大）；距离变小 → 扩大范围（缩小）
  const scale = pinchInitialDistance / currentDistance
  const range = pinchInitialEndPct - pinchInitialStartPct
  let newRange = range * scale
  // 限制范围：最小 2%（最大放大），最大 100%（全览）
  newRange = Math.max(2, Math.min(100, newRange))
  const center = (pinchInitialStartPct + pinchInitialEndPct) / 2
  let newStart = center - newRange / 2
  let newEnd = center + newRange / 2
  if (newStart < 0) {
    newStart = 0
    newEnd = newRange
  }
  if (newEnd > 100) {
    newEnd = 100
    newStart = 100 - newRange
  }
  const chart = chartRef.value
  if (chart) {
    chart.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 1,
      start: newStart,
      end: newEnd,
    })
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    pinchInitialDistance = 0
  }
}

let chartDom: HTMLElement | null = null

onMounted(() => {
  // 等待 chart DOM 渲染完成后绑定 touch 事件
  nextTick(() => {
    const chart = chartRef.value as any
    if (chart) {
      // vue-echarts 的 ref 是组件实例，通过 $el 或 getDom 获取 DOM
      chartDom = chart.getDom ? chart.getDom() : (chart.$el as HTMLElement)
      if (chartDom) {
        chartDom.addEventListener('touchstart', onTouchStart, { passive: false })
        chartDom.addEventListener('touchmove', onTouchMove, { passive: false })
        chartDom.addEventListener('touchend', onTouchEnd, { passive: false })
      }
    }
  })
})

onBeforeUnmount(() => {
  if (chartDom) {
    chartDom.removeEventListener('touchstart', onTouchStart)
    chartDom.removeEventListener('touchmove', onTouchMove)
    chartDom.removeEventListener('touchend', onTouchEnd)
    chartDom = null
  }
})

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
