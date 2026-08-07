<template>
  <div class="staff-gantt-chart">
    <div v-if="loading || safeShips.length === 0" class="staff-gantt-empty">
      <p>{{ loading ? '加载中...' : '暂无船舶数据' }}</p>
    </div>
    <div v-else>
      <!-- 调试面板：默认隐藏，双击甘特图区域才显示（开发调试入口）
           正式上线默认隐藏，页面清爽；需要排查问题时双击 wrapper 可再显示所有诊断信息 -->
      <div class="debug-panel" v-show="debugVisible" style="display:flex;flex-wrap:wrap;gap:4px 16px;padding:10px 12px;">
        <div style="width:100%;font-weight:600;margin-bottom:2px;">调试面板 (v0807h) · 双击下方色条区域可关闭</div>
        <div style="min-width:280px;">初始化状态: <span :style="{ color: debugInfo.init?.includes('✅') ? '#27ae60' : debugInfo.init?.includes('❌') ? '#c0392b' : '#3498db', fontWeight: 600 }">{{ debugInfo.init || '未知' }}</span></div>
        <div style="min-width:240px;font-size:12px;color:#555;">echarts 加载状态: <b>{{ echartsLoadState }}</b>{{ echartsLoadError ? '（' + echartsLoadError + '）' : '' }}</div>
        <div style="min-width:240px;">船舶数: {{ debugInfo.ships }} | 派任数: {{ debugInfo.assignments }} | 色条数: {{ debugInfo.bars }}</div>
        <div style="min-width:260px;">Y轴类目数: {{ debugInfo.yCats }} | 最长船名字符数: {{ debugInfo.maxNameLen }} | gridLeft(实际): {{ debugInfo.gridLeftRec }}</div>
        <div style="min-width:300px;">Y轴样例: {{ debugInfo.ySample }}</div>
        <div v-if="debugInfo.sample" style="min-width:320px;">色条样例: 船索引={{ debugInfo.sample.yIndex }}，船名={{ debugInfo.sample.shipName }}，{{ debugInfo.sample.start }} → {{ debugInfo.sample.end }}</div>
        <div v-else style="min-width:300px;color:#c0392b;font-weight:600;">⚠️ 没有生成任何色条（请检查派任记录的 shipId、startDate、endDate 是否合法）</div>
        <div v-if="debugInfo.yMapDebug" style="width:100%;font-size:12px;color:#2c3e50;white-space:pre-wrap;">Y轴映射自检（前6行）: {{ debugInfo.yMapDebug }}</div>
        <div v-if="lastFatalWarn" style="min-width:320px;color:#e67e22;">永久 WARN: {{ lastFatalWarn }}</div>
        <div v-if="lastFatalError" style="width:100%;color:#c0392b;font-weight:600;white-space:pre-wrap;">永久 ERROR: {{ lastFatalError }}</div>
        <div v-if="lastInitSteps.length > 0" style="width:100%;font-size:12px;color:#34495e;white-space:pre-wrap;">初始化步骤追踪: {{ lastInitSteps.join(' → ') }}</div>
        <div v-if="debugInfo.warn && !lastFatalWarn" style="min-width:320px;color:#e67e22;">本次 WARN: {{ debugInfo.warn }}</div>
        <div v-if="debugInfo.error && !lastFatalError" style="width:100%;color:#c0392b;white-space:pre-wrap;">本次 ERROR: {{ debugInfo.error }}</div>
      </div>

      <div class="staff-gantt-wrapper" :style="{ height: chartHeight + 'px' }" @dblclick="onDblClickWrapper">
        <!-- ★ 终极兜底：彻底绕开 ClientOnly/ref 绑定问题
             - 用稳定的 ID 直接定位元素
             - 不使用 <ClientOnly> 包裹（Nuxt 3 SSR 时用 document 判断自动跳过，不报错）
             - 不依赖 ref（SSR hydration 时 ref 常绑定到 Comment 占位符）
        -->
        <div :id="canvasUniqueId" class="staff-gantt-canvas" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
// ★ 重要！删除顶层 echarts import：
// 顶层 `import * as echarts from 'echarts'` 在 Nuxt SSR 阶段（Node 环境）就会被执行，
// zrender 内部访问 window/Canvas API 导致整个模块损坏，到客户端后 init 调用就报
// "s.setTimeout is not a function" 且 40 次重试全部失败。
// 解决方案：用 await import('echarts') 在 initChart 中**客户端懒加载**。
import type { StaffAssignment } from '~/types'

// ★ echarts 客户端懒加载：只在浏览器中、第一次 initChart 时才真正 import
type EChartsModule = typeof import('echarts')
let echartsModule: EChartsModule | null = null

// 调试面板显示/隐藏：默认隐藏，双击甘特图区域才显示（开发调试入口）
const debugVisible = ref(false)
function onDblClickWrapper() {
  debugVisible.value = !debugVisible.value
}

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

// ★ v0807h 终极修复：彻底消灭 Y 轴索引错位（经验 904365 教训：单一数据模型驱动所有渲染）
//   1) reversedShips 唯一派生 yCategories (String[])
//   2) 新增 cnShipNameToYIndex Map<cnShipName, number> —— 只有这一个源可以"船名→Y 索引"
//   3) 新增 cnShipNameToShipId Map<cnShipName, number> —— axisLabel 从 val(船名) 直接反查 shipId，不再用 yIndexToShipId[idx] 二次猜测（二次猜会造成错位链）
//   4) series.data.value[0] 仍然是 number（yIndex），但 yIndex 仅从 cnShipNameToYIndex 里拿
const reversedShips = computed(() => safeShips.value.slice().reverse())
const yCategories = computed(() => reversedShips.value.map((s) => s.cnShipName))
const cnShipNameToYIndex = computed(() => {
  const map = new Map<string, number>()
  reversedShips.value.forEach((s, yIdx) => { map.set(String(s.cnShipName), yIdx) })
  return map
})
const cnShipNameToShipId = computed(() => {
  const map = new Map<string, number>()
  reversedShips.value.forEach((s) => {
    const id = Number(s.id)
    if (!isNaN(id)) map.set(String(s.cnShipName), id)
  })
  return map
})
const shipIdToYIndex = computed(() => {
  const map = new Map<number, number>()
  reversedShips.value.forEach((s, yIdx) => {
    const id = Number(s.id)
    if (!isNaN(id)) map.set(id, yIdx)
  })
  return map
})
const yIndexToShipId = computed(() => reversedShips.value.map((s) => Number(s.id)))

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
    if (isNaN(lookupId)) continue
    const yIndex = shipsMap.get(lookupId)
    if (yIndex === undefined) continue

    // ★ 船舶视角需求（001 优化文档）：空缺船舶当前无任何在任政委，
    //   该行不绘制任何派任色条——完全空着 + 红色「空缺」徽标在 Y 轴上就够了
    //   防止把"历史上任/休假/已下船"的派任错画到空缺船行上
    if (vacantIdSet.value.has(lookupId)) continue

    // ★ 船舶视角需求（001 优化文档）：不要出现独立的「休假」色条
    //   同一艘船同一时段如果在任状态已被其他派任覆盖，休假（status=leave）派任不单独绘制
    //   如果派任同时是 ended(已下船) + leave，也按历史在任绘制（透明度不同），不画独立虚线休假条
    const status = (a.status || '').toLowerCase()
    if (status === 'leave') continue

    const start = new Date(a.startDate).getTime()
    const end = a.endDate ? new Date(a.endDate).getTime() : Date.now()
    if (isNaN(start) || isNaN(end) || end <= start) continue

    const days = Math.max(1, Math.round((end - start) / DAY_MS))
    const startStr = new Date(start).toISOString().slice(0, 10)
    const endStr = a.endDate ? new Date(end).toISOString().slice(0, 10) : '至今'
    const name = a.user?.realName || a.ship?.politicalOfficerName || '未指派'
    const ended = status === 'ended' || !!a.endDate
    const labelText = `${name}（${days}天）${startStr}${a.endDate ? '~' + endStr.slice(5) : '→至今'}`

    out.push({
      value: [yIndex, start, end],
      _assignmentId: a.id,
      _labelText: labelText, // series.label.formatter 统一读取
      itemStyle: {
        color: getBarColor(a),
        opacity: ended ? 0.65 : 1,
        borderRadius: [3, 3, 3, 3],
        borderColor: 'transparent',
        borderWidth: 0,
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

// 图表实例（用 EChartsModule 类型代替顶层 import 引用）
let chartInstance: any = null
// SSR 环境下没有 document，避免引用错误
const isBrowser = typeof document !== 'undefined'
// ★ 终极方案：用稳定的唯一 ID 直接 getElementById，不依赖 ref/ClientOnly
//    每次组件挂载都生成新 ID，避免同一页面多个甘特图 ID 冲突
const canvasUniqueId = 'staff-gantt-canvas-' + Math.random().toString(36).slice(2, 10)

// echarts 加载状态（调试面板显示用，必须 ref，不然 UI 不更新）
const echartsLoadState = ref<'未加载' | '加载中' | '已加载' | '加载失败'>('未加载')
const echartsLoadError = ref<string | null>(null)

// ★ 永久错误存储（独立 ref，绝不让 buildOption / retry 耗尽赋值覆盖掉真正的错误内容）
const lastFatalError = ref<string | null>(null)
const lastFatalWarn = ref<string | null>(null)
const lastInitSteps = ref<string[]>([])
function pushInitStep(step: string) {
  lastInitSteps.value = [...lastInitSteps.value.slice(-5), step]
}

let inited = false
// ★ 并发锁：initChart 是 async，setInterval 每 300ms 不 await 就触发，
//    必须保证同一时刻只有一个 initChart 执行链路在跑，否则多个 async
//    都会调用 echarts.init(el) 同一个 div，第二次 init 会 dispose 第一次，
//    然后第一次后续代码就会报 "Cannot read properties of undefined (reading '__ec_inner_xx')"
let initRunning = false
function resolveChartEl(): HTMLElement | null {
  if (!isBrowser) return null // SSR 直接跳过
  // ★ 优先级 1（最可靠）：直接通过我们自己的稳定 ID 获取
  //    getElementById 返回的一定是真实挂载到 DOM 树的 HTMLElement，
  //    100% 不会拿到 Comment/Text/VNode 占位符
  const byId = document.getElementById(canvasUniqueId)
  if (byId && byId instanceof HTMLElement && byId.tagName === 'DIV') {
    return byId as HTMLElement
  }
  // 兜底 2：class 选择器
  const q = document.querySelector('.staff-gantt-canvas')
  if (q && q instanceof HTMLElement && q.tagName === 'DIV') {
    return q as HTMLElement
  }
  return null
}

// ★ 客户端懒加载 echarts：保证绝对不会在 SSR 阶段 import
async function loadECharts(): Promise<EChartsModule | null> {
  if (!isBrowser) return null
  if (echartsModule) return echartsModule
  if (echartsLoadState.value === '加载中') return null // 正在加载，等待下一轮
  try {
    echartsLoadState.value = '加载中'
    debugInfo.value = { ...debugInfo.value, init: '⏳ 正在客户端加载 echarts 5.5.0...' }
    echartsModule = await import(/* webpackChunkName: "echarts" */ 'echarts')
    echartsLoadState.value = '已加载'
    debugInfo.value = { ...debugInfo.value, init: '✅ echarts 加载完成（客户端动态 import）' }
    return echartsModule
  } catch (e: any) {
    echartsLoadState.value = '加载失败'
    echartsLoadError.value = String(e?.message || e || 'unknown')
    debugInfo.value = {
      ...debugInfo.value,
      init: '❌ echarts import 失败',
      error: `import('echarts') 抛错: ${echartsLoadError.value}`,
    }
    console.error('[StaffGanttChart] dynamic import(echarts) failed:', e)
    return null
  }
}

async function initChart() {
  if (inited || chartInstance) return
  if (!isBrowser) return // SSR 直接跳过
  // 并发锁：同一时刻只允许一个 initChart 链路执行
  if (initRunning) return
  initRunning = true
  try {
    await doInitChart()
  } finally {
    initRunning = false
  }
}

async function doInitChart() {
  if (inited || chartInstance) return
  if (!isBrowser) return
  pushInitStep('doInitChart[start]')

  // ★ 第一步：懒加载 echarts（客户端动态 import，SSR 阶段永远不会执行）
  pushInitStep('doInitChart[await loadECharts…]')
  const echarts = await loadECharts()
  if (!echarts) {
    pushInitStep(`doInitChart[echarts 未就绪，状态=${echartsLoadState.value}]`)
    return // 还在加载中 or 加载失败，下一轮重试
  }
  pushInitStep('doInitChart[echarts 已加载]')

  const el = resolveChartEl()
  if (!el) {
    const byIdInfo = document.getElementById(canvasUniqueId)
    const qInfo = document.querySelector('.staff-gantt-canvas')
    const w = `DOM 未就绪（echarts已${echartsLoadState.value}，id=…${canvasUniqueId.slice(-6)}:null?${!byIdInfo}, .class:null?${!qInfo}），继续重试`
    debugInfo.value = { ...debugInfo.value, warn: w }
    lastFatalWarn.value = w
    pushInitStep('doInitChart[DOM缺失]')
    return
  }

  // 尺寸检查：元素必须真正可见
  const rect = el.getBoundingClientRect()
  if (rect.width < 10 || rect.height < 10) {
    const w = `DOM 找到但尺寸 ${Math.round(rect.width)}×${Math.round(rect.height)} < 10px，layout 未完成，延时重试`
    debugInfo.value = { ...debugInfo.value, warn: w }
    lastFatalWarn.value = w
    pushInitStep(`doInitChart[尺寸不足 ${Math.round(rect.width)}×${Math.round(rect.height)}]`)
    return
  }
  pushInitStep(`doInitChart[DOM OK ${Math.round(rect.width)}×${Math.round(rect.height)}]`)

  try {
    // ★ 正确防重复 init：直接用 ECharts 官方 API getInstanceByDom(el)
    //    ECharts 用 WeakMap 存 DOM→实例，不一定挂 __ec_inner_* 属性名到 el 上
    //    之前用 Object.keys(el) 找属性名的方法是猜测，非常不可靠
    let localInstance: any = null
    let reused = false
    try {
      if ((echarts as any).getInstanceByDom) {
        localInstance = (echarts as any).getInstanceByDom(el)
        if (localInstance) reused = true
      }
    } catch (_) { localInstance = null }
    pushInitStep(`doInitChart[getInstanceByDom → reused=${reused}]`)

    if (!localInstance) {
      try {
        pushInitStep('doInitChart[call echarts.init(el)…]')
        localInstance = echarts.init(el)
        pushInitStep('doInitChart[echarts.init OK]')
      } catch (e0: any) {
        const m0 = `echarts.init(el) 直接抛：[${e0?.constructor?.name||'Err'}] ${String(e0?.message||e0||'unknown')}`
        lastFatalError.value = m0
        pushInitStep(`doInitChart[echarts.init FAIL → ${m0.slice(0,60)}]`)
        throw e0
      }
    }

    // 关键：只有 echarts.init / getInstanceByDom 成功后，才赋值给 chartInstance
    chartInstance = localInstance
    try {
      chartInstance.off && chartInstance.off('click')
      pushInitStep('doInitChart[off(click) OK]')
    } catch (_) { /* ignore */ }
    try {
      chartInstance.on('click', handleChartClick)
      pushInitStep('doInitChart[on(click) OK]')
    } catch (e1: any) {
      const m1 = `on(click) 抛：${String(e1?.message||e1||'unknown')}`
      lastFatalError.value = m1
      pushInitStep(`doInitChart[on(click) FAIL → ${m1.slice(0,60)}]`)
      throw e1
    }
    try {
      pushInitStep('doInitChart[applyOption(buildOption→setOption)…]')
      applyOption()
      pushInitStep('doInitChart[applyOption OK]')
    } catch (e2: any) {
      const m2 = `applyOption 抛：[${e2?.constructor?.name||'Err'}] ${String(e2?.message||e2||'unknown')}${e2?.stack ? '\n'+String(e2.stack).slice(0,500) : ''}`
      lastFatalError.value = m2
      pushInitStep(`doInitChart[applyOption FAIL → ${m2.slice(0,70)}]`)
      throw e2
    }
    try {
      window.removeEventListener('resize', handleResize)
      window.addEventListener('resize', handleResize)
      pushInitStep('doInitChart[resize 监听 OK]')
    } catch (_) { /* ignore */ }
    inited = true
    debugInfo.value = {
      ...debugInfo.value,
      init: `✅ ECharts.init 成功（容器 ${Math.round(rect.width)}×${Math.round(rect.height)}px，echarts=动态import,${reused?'复用实例':'全新init'},方法=getElementById）`,
      error: null,
      warn: null,
    }
    lastFatalError.value = null
    lastFatalWarn.value = null
    pushInitStep('doInitChart[全部步骤完成 ✅]')
  } catch (e: any) {
    // ★ 失败兜底：如果任何步骤抛错，立刻 dispose 可能半初始化的实例，
    //    并且把 chartInstance 置空，保证下一轮 retry 可以继续尝试
    pushInitStep(`doInitChart[进入 catch 分支 → dispose 半坏实例]`)
    if (chartInstance) {
      try { chartInstance.dispose() } catch (_) { /* ignore */ }
      chartInstance = null
    }
    inited = false
    const msg = String(e?.message || e || 'unknown')
    const stack = e?.stack ? '\n...STACK:' + String(e.stack).slice(0, 500) : ''
    const errStr = `[${e?.constructor?.name || 'Err'}] ${msg}${stack}`
    debugInfo.value = {
      ...debugInfo.value,
      init: '❌ ECharts.init 抛出异常',
      error: errStr,
      warn: `echarts加载=${echartsLoadState.value}，elType=${el.constructor.name} tag=${el.tagName} size=${Math.round(rect.width)}×${Math.round(rect.height)}`,
    }
    // ★ 永久保存：不管后面 buildOption / retry耗尽怎么覆盖 debugInfo，lastFatalError 永远保留
    if (!lastFatalError.value) lastFatalError.value = errStr
    lastFatalWarn.value = debugInfo.value.warn
    console.error('[StaffGanttChart] echarts.init full step failed:', e, 'element:', el, 'lastFatal:', lastFatalError.value)
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
  // ★ v0807h 统一 grid.left 计算公式：maxLen × 16px + 徽标 64px + padding 32px，上限 320，下限 150
  const gridLeftRec = Math.max(Math.min(maxLen * 16 + 64 + 32, 320), 150)

  // v0807h 新增 Y 轴映射自检：最近 6 行=船名/Y索引/shipId/vacant/色条数，方便定位错位问题
  const yMapDebug: string[] = []
  // 统计每条船有多少条色条
  const yIdxBarCount = new Map<number, number>()
  for (const b of bars) {
    const yIdx = Number(b.value[0])
    if (!isNaN(yIdx)) yIdxBarCount.set(yIdx, (yIdxBarCount.get(yIdx) || 0) + 1)
  }
  reversedShips.value.slice(0, 6).forEach((s, yIdx) => {
    const shipId = Number(s.id)
    const vacant = vacantIdSet.value.has(shipId) ? '🔴vacant' : '✅ok'
    const cnt = yIdxBarCount.get(yIdx) ?? 0
    yMapDebug.push(`Y${yIdx}=${String(s.cnShipName).slice(0,6)}(id${shipId})${vacant}色条${cnt}`)
  })
  debugInfo.value = {
    ...(debugInfo.value || {}),
    ships: safeShips.value.length,
    assignments: safeAssignments.value.length,
    bars: bars.length,
    yCats: names.length,
    maxNameLen: maxLen,
    gridLeftRec,
    ySample: names.slice(0, 5).join(' / ') + (names.length > 5 ? ` ...(共${names.length}条)` : ''),
    yMapDebug: yMapDebug.join(' | '),
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
    grid: {
      // ★ v0807h 修复左侧船名被遮：
      //   containLabel=true 时 grid.left 作为"起始小值"，ECharts 会自动扩展到 label 实际宽度。
      //   但为了彻底避免出现「空缺徽标 + 长船名」超出被裁，这里我们自己算出最小需要的像素值：
      //   最长船名 maxLen × 16px（中文字号 12 实际宽度约 14+2padding）+ 徽标 64px + 左右 padding 32px
      //   再取 "计算值 vs 150" 两者较大的，上限 320。
      left: Math.max(Math.min(maxLen * 16 + 64 + 32, 320), 150),
      right: 40,
      top: 30,
      bottom: 70,
      containLabel: true,
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
        padding: [0, 10, 0, 4], // ★ v0807h 左侧留白，避免船名最左端紧挨画布边缘被裁
        formatter: (val: string, idx: number) => {
          // ★ v0807h 修复：直接用"船名→shipId"唯一映射 cnShipNameToShipId 查，
          //   绝对不要再用 yIndexToShipId.value[idx] 猜测（yIndex 和 ECharts 内部 idx 可能不同步
          //   特别是 containLabel=true 动态扩展后，ECharts 可能微调索引）
          const shipId = cnShipNameToShipId.value.get(String(val))
          if (shipId !== undefined && vacantIdSet.value.has(shipId)) {
            return `{name|${val}}{vacant|空缺}`
          }
          return `{name|${val}}`
        },
        rich: {
          name: { color: '#303133', fontSize: 12, padding: [0, 8, 0, 6], lineHeight: 22 },
          vacant: {
            backgroundColor: 'rgba(245, 108, 108, 0.15)',
            borderColor: '#f56c6c', borderWidth: 1, color: '#c0392b',
            fontSize: 10, padding: [1, 5], borderRadius: 8, lineHeight: 22,
          },
        },
      },
      splitLine: { show: true, lineStyle: { color: '#f5f5f5' } },
      // ★ 修复 v0807d 致命错误：yAxis.splitArea.areaStyle 在 ECharts 5.x 只接受单个 Object，
      //   传数组的话 ECharts 内部会按 index 去 areaStyle[idx]，当行数超过数组长度时
      //   返回 null，再访问 .length → "Cannot read properties of null (reading 'length')"
      //   直接炸整个 applyOption → dispose
      //   这里改成单 Object 间隔色，空缺船舶仍靠 axisLabel.rich「空缺」徽标 + 色条样式区分，
      //   完全不影响需求显示
      splitArea: {
        show: true,
        interval: 0,
        areaStyle: {
          color: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)'],
        },
      },
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
      // ★ ECharts 5.x 对 encode:{x:[1,2]} 时间跨度 bar，
      //   data[i].label 子对象配置有时不生效，必须在 series.label 上配 show + formatter
      label: {
        show: true,
        position: 'insideLeft',
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 500,
        overflow: 'truncate',
        padding: [0, 6],
        formatter: (params: any) => String(params?.data?._labelText || params?.data?.label?.formatter || ''),
      },
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

// ★ 已移除 chartDomRef 的 watch：现在不依赖 ref，用 getElementById 直接定位
//    元素渲染完成后，initChart 的定时重试一定能拿到真实 HTMLElement

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

let retryTimer: any = null

onMounted(() => {
  // ★ 只保留一条稳定的重试路径：setInterval 每 300ms 串行尝试
  //    之前的多条 setTimeout（立即/200/600/1200/2000/3000）会和 setInterval 的
  //    触发时间重叠、再和 initRunning 锁交互，导致"都认为在执行中都跳过"的问题
  //    ——现在只在开头立即触发 1 次 initChart()，其余全部交给 setInterval 有序调度。
  initChart()

  // 持续重试兜底：每 300ms 重试一次，共 60 次 = 18 秒（比之前多给 6 秒时间余地）
  let retryCount = 0
  const MAX_RETRY = 60
  retryTimer = setInterval(() => {
    retryCount++
    if (chartInstance && inited) {
      if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
      return
    }
    if (retryCount >= MAX_RETRY) {
      if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
      debugInfo.value = {
        ...debugInfo.value,
        init: `❌ 重试已耗尽（${MAX_RETRY} 次 × 300ms）` + (lastFatalError.value ? '' : '，请检查浏览器控制台是否有其他错误（按 F12 → Console）'),
        error: lastFatalError.value || debugInfo.value.error || '请检查浏览器控制台是否有其他错误（按 F12 → Console）',
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
