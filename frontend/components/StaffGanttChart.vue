<template>
  <div class="staff-gantt-chart">
    <div v-if="loading || safeShips.length === 0" class="staff-gantt-empty">
      <p>{{ loading ? '加载中...' : '暂无船舶数据' }}</p>
    </div>
    <div v-else>
      <!-- 调试面板：直接显示数据状态（debugInfo 初始值非 null，所以一直显示） -->
      <div class="debug-panel">
        <div style="font-weight:600;margin-bottom:4px;">调试面板 (v0806p)</div>
        <div>初始化状态: <span :style="{ color: debugInfo.init?.includes('✅') ? '#27ae60' : debugInfo.init?.includes('❌') ? '#c0392b' : '#3498db', fontWeight: 600 }">{{ debugInfo.init || '未知' }}</span></div>
        <div>船舶数: {{ debugInfo.ships }} | 派任数: {{ debugInfo.assignments }} | 色条数: {{ debugInfo.bars }}</div>
        <div>Y轴类目数: {{ debugInfo.yCats }} | 最长船名字符数: {{ debugInfo.maxNameLen }} | gridLeft(建议): {{ debugInfo.gridLeftRec }}</div>
        <div>Y轴样例: {{ debugInfo.ySample }}</div>
        <div v-if="debugInfo.sample">色条样例: 船索引={{ debugInfo.sample.yIndex }}，船名={{ debugInfo.sample.shipName }}，{{ debugInfo.sample.start }} → {{ debugInfo.sample.end }}</div>
        <div v-else style="color:#c0392b;font-weight:600;">⚠️ 没有生成任何色条（请检查派任记录的 shipId、startDate、endDate 是否合法）</div>
        <div v-if="debugInfo.warn" style="color:#e67e22;margin-top:4px;">WARN: {{ debugInfo.warn }}</div>
        <div v-if="debugInfo.error" style="color:#c0392b;margin-top:4px;white-space:pre-wrap;">ERROR: {{ debugInfo.error }}</div>
      </div>

      <div class="staff-gantt-wrapper" :style="{ height: chartHeight + 'px' }">
        <client-only>
          <div ref="chartDomRef" class="staff-gantt-canvas" />
          <template #fallback>
            <div class="staff-gantt-fallback">图表加载中...</div>
          </template>
        </client-only>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import type { StaffAssignment } from '~/types'

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
    id: number; realName: string; birthDate?: string; idNumber?: string; englishName?: string
    gender?: string; nationality?: string; hometown?: string; politicalStatus?: string
    phoneNumber?: string; employeeNo?: string; dataSource?: string
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

function formatDate(date?: string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const safeShips = computed(() => props.ships || [])
const safeAssignments = computed(() => props.assignments || [])

const chartHeight = computed(() => Math.max(safeShips.value.length * 44 + 120, 260))

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
    arr.push(vacantIdSet.value.has(shipId)
      ? { color: 'rgba(245, 108, 108, 0.12)' }
      : { color: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.05)' })
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

// 生成甘特图数据
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

    out.push({
      value: [yIndex, start, end],
      _assignmentId: a.id,
      itemStyle: {
        color: getBarColor(a),
        opacity: a.status === 'leave' ? 0.55 : a.status === 'ended' || a.endDate ? 0.65 : 1,
        borderRadius: [3, 3, 3, 3],
        borderColor: a.status === 'leave' ? '#a8abb2' : 'transparent',
        borderWidth: a.status === 'leave' ? 1.5 : 0,
        borderType: a.status === 'leave' ? 'dashed' : 'solid',
      },
      label: {
        show: true,
        formatter: a.user?.realName || a.ship?.politicalOfficerName || '未指派',
        position: 'insideLeft',
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 500,
        overflow: 'truncate',
        padding: [0, 6],
      },
    })
  }
  return out
})

// 调试信息（初始值非 null，让调试面板立即可见）
const debugInfo = ref<any>({
  init: '✅ StaffGanttChart 挂载中…等待 ECharts DOM 出现',
  ships: 0,
  assignments: 0,
  bars: 0,
  warn: null,
  error: null,
})

// 图表实例
let chartInstance: echarts.ECharts | null = null
const chartDomRef = ref<HTMLElement | null>(null)

let inited = false
function resolveChartEl(): HTMLElement | null {
  // ClientOnly 下 ref 可能绑定到占位符（不是真正 HTMLElement），用双重兜底确保拿到真实 DOM
  // 方式1: 直接用 class 选择器获取真正的 DOM 元素
  const q = document.querySelector('.staff-gantt-canvas')
  if (q && q instanceof HTMLElement && q.tagName === 'DIV') {
    return q as HTMLElement
  }
  // 方式2: ref 直接绑定
  if (chartDomRef.value instanceof HTMLElement && chartDomRef.value.tagName === 'DIV') {
    return chartDomRef.value
  }
  return null
}

function initChart() {
  if (inited || chartInstance) return

  const el = resolveChartEl()
  if (!el) {
    const refInfo = chartDomRef.value
      const qInfo = document.querySelector('.staff-gantt-canvas')
      debugInfo.value = {
        ...debugInfo.value,
        warn: `DOM 仍未就绪（ref=NULL? ${refInfo === null}, refType=${refInfo?.constructor?.name || 'n/a'}, querySel=NULL? ${!qInfo}），将继续重试`,
      }
      return
  }

  // 尺寸检查：元素必须真正可见
  const rect = el.getBoundingClientRect()
  if (rect.width < 10 || rect.height < 10) {
    debugInfo.value = {
      ...debugInfo.value,
      warn: `DOM 找到但尺寸为 ${Math.round(rect.width)}×${Math.round(rect.height)}（< 10px），可能还没 layout，延时重试`,
    }
    return
  }

  try {
    inited = true
    chartInstance = echarts.init(el)
    chartInstance.on('click', handleChartClick)
    applyOption()
    window.addEventListener('resize', handleResize)
    debugInfo.value = {
      ...debugInfo.value,
      init: `✅ ECharts.init 成功（容器 ${Math.round(rect.width)}×${Math.round(rect.height)}px）`,
      error: null,
      warn: null,
    }
  } catch (e: any) {
    inited = false
    chartInstance = null
    const msg = String(e?.message || e || 'unknown')
    const stack = e?.stack ? '\n...STACK:' + String(e.stack).slice(0, 300) : ''
    debugInfo.value = {
      ...debugInfo.value,
      init: '❌ ECharts.init 抛出异常',
      error: `[${e?.constructor?.name || 'Err'}] ${msg}${stack}`,
      warn: `elType=${el.constructor.name} tag=${el.tagName} size=${Math.round(rect.width)}×${Math.round(rect.height)}`,
    }
    console.error('[StaffGanttChart] echarts.init failed:', e, 'element:', el)
  }
}

function buildOption() {
  const tr = timeRange.value
  const now = Date.now()
  const defaultStart = now - 540 * DAY_MS
  const defaultEnd = now + 60 * DAY_MS
  const bars = ganttBars.value

  // 更新调试面板（保留 init/warn/error 等字段，避免覆盖）
  const sample = bars[0]
  const names = yCategories.value
  let maxLen = 0
  for (const n of names) maxLen = Math.max(maxLen, String(n || '').length)
  const gridLeftRec = Math.max(Math.min(maxLen * 14 + 20 + 50, 300), 150)
  debugInfo.value = {
    ...(debugInfo.value || {}),
    ships: safeShips.value.length,
    assignments: safeAssignments.value.length,
    bars: bars.length,
    yCats: names.length,
    maxNameLen: maxLen,
    gridLeftRec,
    ySample: names.slice(0, 5).join(' / ') + (names.length > 5 ? ` ...(共${names.length}条)` : ''),
    sample: sample
      ? {
          yIndex: sample.value[0],
          shipName: names[sample.value[0]] || '(未知船)',
          start: new Date(sample.value[1]).toISOString().slice(0, 10),
          end: new Date(sample.value[2]).toISOString().slice(0, 10),
        }
      : null,
  }

  // grid left (debug info 里已算过 names/maxLen/gridLeftRec；为了代码清晰这里不再重复声明)
  const names2 = yCategories.value
  let maxLen2 = 0
  for (const n of names2) maxLen2 = Math.max(maxLen2, String(n || '').length)
  // 注意：因为 containLabel=true，实际 ECharts 会自动补足 label 宽度
  // 这里 grid.left 我们给一个起始小值 60 就够，ECharts 会扩展
  void maxLen2

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
        return `<div style="font-weight:600;margin-bottom:4px;">${officer}</div>
          <div>船舶：${shipName}</div>
          <div>上船日期：${formatDate(a.startDate)}</div>
          <div>下船日期：${a.endDate ? formatDate(a.endDate) : '至今'}</div>
          <div>在船天数：${days} 天</div>`
      },
    },
    grid: { left: 60, right: 40, top: 30, bottom: 70, containLabel: true },
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
          return vacantIdSet.value.has(shipId) ? `{name|${val}}{vacant|空缺}` : `{name|${val}}`
        },
        rich: {
          name: { color: '#303133', fontSize: 12, padding: [0, 6, 0, 0], lineHeight: 22 },
          vacant: {
            backgroundColor: 'rgba(245, 108, 108, 0.15)',
            borderColor: '#f56c6c', borderWidth: 1, color: '#c0392b',
            fontSize: 10, padding: [1, 5], borderRadius: 8, lineHeight: 22,
          },
        },
      },
      splitLine: { show: true, lineStyle: { color: '#f5f5f5' } },
      splitArea: { show: true, interval: 0, areaStyle: splitAreaStyles.value },
    },
    dataZoom: [
      { type: 'slider', xAxisIndex: 0, startValue: defaultStart, endValue: defaultEnd, height: 20, bottom: 10, borderColor: '#dcdfe6' },
      { type: 'inside', xAxisIndex: 0, moveOnMouseMove: true, zoomOnMouseWheel: true },
    ],
    series: [{
      name: '政委任职',
      type: 'bar',
      encode: { x: [1, 2], y: 0 },
      data: bars,
      barMaxWidth: 28,
      barMinHeight: 2,
      clip: false,
      z: 10,
      markLine: {
        silent: true,
        symbol: ['none', 'none'],
        label: { formatter: '今天', position: 'end', color: '#409eff', fontSize: 11 },
        lineStyle: { color: '#409eff', type: 'solid', width: 1.5 },
        data: [{ xAxis: now }],
      },
    }],
  }
}

function applyOption() {
  if (!chartInstance) return
  const opt = buildOption()
  chartInstance.setOption(opt, true)
}

// chartDomRef 变化时自动 init — 用 resolveChartEl 验证（ClientOnly 下 ref 可能是占位符）
watch(chartDomRef, (v) => {
  if (!chartInstance) {
    nextTick(() => nextTick(() => initChart()))
  }
})

watch([safeShips, safeAssignments], () => {
  nextTick(() => applyOption())
}, { deep: true })

watch(chartHeight, () => {
  nextTick(() => chartInstance?.resize())
})

let barClickFlag = false

function handleChartClick(params: any) {
  const id = params?.data?._assignmentId
  if (!id) return
  const assignment = assignmentMap.value.get(id)
  if (!assignment) return
  barClickFlag = true
  emit('bar-click', { assignment: assignment as unknown as StaffAssignment, event: {} as MouseEvent })
}

let chartDom: HTMLElement | null = null
let retryTimer: any = null

onMounted(() => {
  // 立即 + 多层 nextTick + 延时兜底，保证 ClientOnly 内部 DOM 真正挂载后再 init
  initChart()
  nextTick(() => initChart())
  nextTick(() => nextTick(() => initChart()))
  setTimeout(() => initChart(), 200)
  setTimeout(() => initChart(), 600)
  setTimeout(() => initChart(), 1200)

  // 持续重试兜底：如果上面几次都失败（DOM 延迟挂载/尺寸未就绪），每 300ms 重试一次
  let retryCount = 0
  const MAX_RETRY = 25 // 25 * 300ms = 7.5s
  retryTimer = setInterval(() => {
    retryCount++
    if (chartInstance) {
      // 成功了，清掉定时器
      if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
      return
    }
    if (retryCount >= MAX_RETRY) {
      if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
      debugInfo.value = {
        ...debugInfo.value,
        init: '❌ 重试已耗尽（25 次 × 300ms）',
        error: '请检查浏览器控制台是否有其他错误',
      }
      return
    }
    initChart()
  }, 300)
})

function handleResize() { chartInstance?.resize() }

onBeforeUnmount(() => {
  if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
  chartDom = null
})

defineExpose({ chartRef: null })
</script>

<style scoped>
.staff-gantt-chart {
  width: 100%;
  background: #fff;
  border-radius: 8px;
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
.debug-panel {
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  font-size: 12px;
  color: #0c4a6e;
  margin-bottom: 4px;
  display: flex;
  gap: 16px;
  align-items: center;
}
.debug-sample {
  font-family: monospace;
  color: #7c3aed;
}
</style>
