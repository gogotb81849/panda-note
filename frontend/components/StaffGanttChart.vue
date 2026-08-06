<template>
  <div class="staff-gantt-chart">
    <div v-if="loading || safeShips.length === 0" class="staff-gantt-empty">
      <p>{{ loading ? '加载中...' : '暂无船舶数据' }}</p>
    </div>
    <div v-else class="staff-gantt-wrapper" :style="{ height: chartHeight + 'px' }">
      <client-only>
        <v-chart
          ref="chartRef"
          class="staff-gantt-canvas"
          :option="chartOption"
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
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  GraphicComponent,
} from 'echarts/components'
import type { StaffAssignment } from '~/types'

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  GraphicComponent,
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
  user?: {
    id: number
    realName: string
    birthDate?: string
    idNumber?: string
    englishName?: string
    gender?: string
    nationality?: string
    hometown?: string
    politicalStatus?: string
    phoneNumber?: string
    employeeNo?: string
    dataSource?: string
  }
  ship?: { id: number; cnShipName: string; politicalOfficerName?: string }
}

interface Props {
  ships?: ShipItem[]
  assignments?: AssignmentItem[]
  vacantShipIds?: number[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  vacantShipIds: () => [],
  ships: () => [],
  assignments: () => [],
})

const emit = defineEmits<{
  'bar-click': [payload: { assignment: StaffAssignment; event: MouseEvent }]
  'empty-click': [payload: { shipId: number; date: string }]
}>()

const DAY_MS = 1000 * 60 * 60 * 24

function getDaysOnBoard(startDate: string, endDate?: string | null): number {
  const start = new Date(startDate).getTime()
  const end = endDate ? new Date(endDate).getTime() : Date.now()
  return Math.floor((end - start) / DAY_MS)
}

function getBarColor(a: AssignmentItem): string {
  if (a.status === 'leave') return '#a8abb2'
  if (a.status === 'ended' || a.endDate) return '#b8b8b8'
  const days = getDaysOnBoard(a.startDate, a.endDate)
  if (days > 330) return '#ad0606'
  if (days > 300) return '#f56c6c'
  if (days > 240) return '#f89a3c'
  if (days > 180) return '#e6a23c'
  return '#67c23a'
}

function getBarOpacity(a: AssignmentItem): number {
  if (a.status === 'leave') return 0.55
  if (a.status === 'ended' || a.endDate) return 0.65
  return 1
}

function getBarLabel(a: AssignmentItem): string {
  const name = a.user?.realName || a.ship?.politicalOfficerName || '未指派'
  if (a.status === 'leave') return name
  return name
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { active: '在船', leave: '休假', ended: '已结束' }
  return map[status] || status
}

function formatDate(date?: string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const safeShips = computed(() => props.ships || [])
const safeAssignments = computed(() => props.assignments || [])

const chartHeight = computed(() => Math.max(safeShips.value.length * 44 + 120, 260))

const gridLeft = computed(() => {
  const names = yCategories.value
  let maxLen = 0
  for (const n of names) maxLen = Math.max(maxLen, String(n || '').length)
  return Math.max(Math.min(maxLen * 14 + 20 + 50, 300), 150)
})

const chartRef = ref<any>(null)

watch(chartHeight, () => {
  nextTick(() => chartRef.value?.resize?.())
})

const yCategories = computed(() =>
  safeShips.value.slice().reverse().map((s) => s.cnShipName),
)

const shipIdToYIndex = computed(() => {
  const map = new Map<number, number>()
  safeShips.value.forEach((s, i) => {
    const id = Number(s.id)
    if (!isNaN(id)) map.set(id, safeShips.value.length - 1 - i)
  })
  return map
})

const yIndexToShipId = computed(() => {
  const arr: number[] = new Array(safeShips.value.length)
  safeShips.value.forEach((s, i) => {
    arr[safeShips.value.length - 1 - i] = Number(s.id)
  })
  return arr
})

const vacantIdSet = computed(() =>
  new Set((props.vacantShipIds || []).map((id: any) => Number(id))),
)

const splitAreaStyles = computed(() => {
  const arr: any[] = []
  for (let i = 0; i < safeShips.value.length; i++) {
    const shipId = yIndexToShipId.value[i]
    if (vacantIdSet.value.has(shipId)) {
      arr.push({ color: 'rgba(245, 108, 108, 0.12)' })
    } else {
      arr.push({ color: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.05)' })
    }
  }
  return arr
})

const assignmentMap = computed(() => {
  const map = new Map<number, AssignmentItem>()
  for (const a of safeAssignments.value) map.set(a.id, a)
  return map
})

const timeRange = computed(() => {
  let minT = Infinity
  let maxT = -Infinity
  const now = Date.now()
  for (const a of safeAssignments.value) {
    const s = new Date(a.startDate).getTime()
    if (!isNaN(s)) { minT = Math.min(minT, s); maxT = Math.max(maxT, s) }
    const eTs = a.endDate ? new Date(a.endDate).getTime() : now
    if (!isNaN(eTs)) maxT = Math.max(maxT, eTs)
  }
  if (minT === Infinity || maxT === -Infinity) {
    return { min: now - 365 * DAY_MS, max: now + 60 * DAY_MS }
  }
  return { min: Math.min(minT, now) - 15 * DAY_MS, max: Math.max(maxT, now) + 15 * DAY_MS }
})

// === 核心：用 ECharts 原生 bar 系列渲染甘特图色条 ===
// 数据格式：每个 bar = { value: [yIndex, startMs, endMs], itemStyle, label, _id }
// encode: { x: [1, 2], y: 0 } —— x 用 start/end 两个元素表示 bar 的时间跨度
const ganttBars = computed(() => {
  const out: any[] = []
  const shipsMap = shipIdToYIndex.value

  for (const a of safeAssignments.value) {
    const shipIdNum = Number(a.shipId)
    const shipRelIdNum = Number(a.ship?.id)
    const lookupId = !isNaN(shipIdNum) ? shipIdNum : shipRelIdNum
    const yIndex = shipsMap.get(lookupId)
    if (yIndex === undefined) continue

    const start = new Date(a.startDate).getTime()
    const end = a.endDate ? new Date(a.endDate).getTime() : Date.now()
    if (isNaN(start) || isNaN(end) || end <= start) continue

    const color = getBarColor(a)
    const opacity = getBarOpacity(a)
    const label = getBarLabel(a)

    out.push({
      value: [yIndex, start, end],
      _assignmentId: a.id,
      itemStyle: {
        color,
        opacity,
        borderRadius: [3, 3, 3, 3],
        borderColor: a.status === 'leave' ? '#a8abb2' : 'transparent',
        borderWidth: a.status === 'leave' ? 1.5 : 0,
        borderType: a.status === 'leave' ? 'dashed' : 'solid',
      },
      label: {
        show: true,
        formatter: label,
        position: 'insideLeft',
        color: a.status === 'leave' ? '#6e7278' : '#ffffff',
        fontSize: 11,
        fontWeight: 500,
        overflow: 'truncate',
        padding: [0, 6],
      },
      emphasis: {
        itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.3)' },
      },
    })
  }

  // 调试
  console.log('[StaffGanttChart] ganttBars:', {
    ships: safeShips.value.length,
    assignments: safeAssignments.value.length,
    bars: out.length,
    sample: out[0]
      ? { yIndex: out[0].value[0], start: new Date(out[0].value[1]).toISOString(), end: new Date(out[0].value[2]).toISOString(), id: out[0]._assignmentId }
      : null,
  })

  return out
})

const chartOption = computed(() => {
  const tr = timeRange.value
  const now = Date.now()
  const defaultStart = now - 540 * DAY_MS
  const defaultEnd = now + 60 * DAY_MS

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const id = params?.data?._assignmentId
        const a = id ? assignmentMap.value.get(id) : null
        if (!a) return ''
        const shipName = a.ship?.cnShipName || safeShips.value.find((s) => s.id === a.shipId)?.cnShipName || '-'
        const officer = a.user?.realName || a.ship?.politicalOfficerName || '未指派'
        const days = getDaysOnBoard(a.startDate, a.endDate)
        return `
          <div style="font-weight:600;margin-bottom:4px;">${officer}</div>
          <div>船舶：${shipName}</div>
          <div>上船日期：${formatDate(a.startDate)}</div>
          <div>下船日期：${a.endDate ? formatDate(a.endDate) : '至今'}</div>
          <div>在船天数：${days} 天</div>
          <div>状态：${statusLabel(a.status)}</div>
          ${a.sourceCompany ? `<div>来源公司：${a.sourceCompany}</div>` : ''}
          ${a.assignmentNo ? `<div>派任编号：${a.assignmentNo}</div>` : ''}
          ${a.remark ? `<div>备注：${a.remark}</div>` : ''}
        `
      },
    },
    grid: {
      left: gridLeft.value,
      right: 50,
      top: 20,
      bottom: 60,
      containLabel: false,
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
      inverse: false,
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
          name: { color: '#303133', fontSize: 12, padding: [0, 6, 0, 0], lineHeight: 22 },
          vacant: {
            backgroundColor: 'rgba(245, 108, 108, 0.15)',
            borderColor: '#f56c6c',
            borderWidth: 1,
            color: '#c0392b',
            fontSize: 10,
            padding: [1, 5],
            borderRadius: 8,
            lineHeight: 22,
          },
        },
      },
      splitLine: { show: true, lineStyle: { color: '#f5f5f5' } },
      splitArea: { show: true, interval: 0, areaStyle: splitAreaStyles.value },
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
      { type: 'inside', xAxisIndex: 0, moveOnMouseMove: true, zoomOnMouseWheel: true },
    ],
    series: [
      {
        name: '政委任职',
        type: 'bar',
        encode: { x: [1, 2], y: 0 },
        data: ganttBars.value,
        barMaxWidth: 28,
        barMinHeight: 2,
        large: false,
        clip: false,
        z: 10,
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          label: { formatter: '今天', position: 'end', color: '#409eff', fontSize: 11 },
          lineStyle: { color: '#409eff', type: 'solid', width: 1.5 },
          data: [{ xAxis: now }],
        },
      },
    ],
  }
})

let barClickFlag = false

function handleChartClick(params: any) {
  const id = params?.data?._assignmentId
  if (!id) return
  const assignment = assignmentMap.value.get(id)
  if (!assignment) return
  barClickFlag = true
  const nativeEvent = (params?.event && (params.event.event || params.event)) as MouseEvent
  emit('bar-click', { assignment: assignment as unknown as StaffAssignment, event: nativeEvent })
}

function handleDomClick(e: MouseEvent) {
  setTimeout(() => {
    if (barClickFlag) { barClickFlag = false; return }
    const chart = chartRef.value as any
    if (!chart || !chartDom) return
    const rect = chartDom.getBoundingClientRect()
    const pixelX = e.clientX - rect.left
    const pixelY = e.clientY - rect.top
    if (!chart.containPixel('grid', [pixelX, pixelY])) return
    const point = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX, pixelY])
    const timeValue = point[0]
    const yIndex = Math.round(point[1])
    const shipId = yIndexToShipId.value[yIndex]
    if (shipId === undefined) return
    const hasBar = safeAssignments.value.some((a) => {
      if (Number(a.shipId) !== shipId) return false
      const s = new Date(a.startDate).getTime()
      const ed = a.endDate ? new Date(a.endDate).getTime() : Date.now()
      return timeValue >= s && timeValue <= ed
    })
    if (hasBar) return
    const date = new Date(timeValue)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    emit('empty-click', { shipId, date: dateStr })
  }, 50)
}

let chartDom: HTMLElement | null = null

onMounted(() => {
  nextTick(() => {
    const chart = chartRef.value as any
    if (chart) {
      chartDom = chart.getDom ? chart.getDom() : (chart.$el as HTMLElement)
      if (chartDom) {
        chartDom.addEventListener('touchstart', (e: TouchEvent) => e.preventDefault(), { passive: false })
        chartDom.addEventListener('click', handleDomClick)
      }
    }
  })
})

onBeforeUnmount(() => {
  if (chartDom) {
    chartDom.removeEventListener('click', handleDomClick)
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
