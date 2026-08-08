<template>
  <div class="staff-gantt-chart">
    <div v-if="loading || safeShips.length === 0" class="staff-gantt-empty">
      <p>{{ loading ? '加载中...' : '暂无船舶数据' }}</p>
    </div>
    <div v-else>
      <!-- ★ v0807m 醒目代码版本条：红黄渐变+黑粗字体，陈先生一打开页面立刻判断是不是最新代码，
           不再需要反复问"我看不到版本号、页面没更新"——DOM上移到最前、scroll-box 外部，绝对不会被滚动遮住 -->
      <div style="margin:6px 0 8px;padding:8px 14px;border-radius:8px;
                 background:linear-gradient(135deg,#fff7ed,#fef2f2);
                 border:1px solid #fde68a;font-weight:700;font-size:13px;color:#7c2d12;
                 display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="font-size:16px;">🚢</span>
        <span>熊猫笔记 · 政委任职甘特图 <span style="color:#c2410c;">代码版本 {{ APP_VERSION_SHORT }}</span> · TAG <span style="color:#15803d;">{{ APP_VERSION }}</span></span>
        <span style="margin-left:auto;color:#9a3412;">构建时间：{{ buildTimeLabel }}</span>
        <span style="color:#6b7280;font-weight:500;font-size:12px;">（如果您看到的版本号低于 {{ APP_VERSION_SHORT }} → 请先点顶部工具栏【🔧 强制刷新服务端】按钮，15 秒后下拉刷新页面）</span>
      </div>

      <!-- v0807m echarts 初始化失败告警（非 debug，永久可见，确保陈先生能看到 init 失败原因） -->
      <div v-if="initFatalAlert" style="margin:0 0 8px;padding:10px 14px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-weight:600;font-size:13px;">
        ⚠️ 甘特图初始化告警：{{ initFatalAlert }}（请点顶部工具栏【🔧 强制刷新服务端】，或截图发 IT 协助排查）
      </div>

      <!-- 调试面板：默认隐藏，双击甘特图区域才显示（开发调试入口）
           正式上线默认隐藏，页面清爽；需要排查问题时双击 wrapper 可再显示所有诊断信息 -->
      <div class="debug-panel" v-show="debugVisible" style="display:flex;flex-wrap:wrap;gap:4px 16px;padding:10px 12px;">
        <div style="width:100%;font-weight:600;margin-bottom:2px;">调试面板 ({{ APP_VERSION_SHORT }}) · 双击下方色条区域可关闭</div>
        <div style="min-width:280px;">初始化状态: <span :style="{ color: debugInfo.init?.includes('✅') ? '#27ae60' : debugInfo.init?.includes('❌') ? '#c0392b' : '#3498db', fontWeight: 600 }">{{ debugInfo.init || '未知' }}</span></div>
        <div style="min-width:240px;font-size:12px;color:#555;">echarts 加载状态: <b>{{ echartsLoadState }}</b>{{ echartsLoadError ? '（' + echartsLoadError + '）' : '' }}</div>
        <div style="min-width:240px;">船舶数: {{ debugInfo.ships }} | 派任数: {{ debugInfo.assignments }} | 色条数: {{ debugInfo.bars }}</div>
        <div style="min-width:260px;">Y轴类目数: {{ debugInfo.yCats }} | 最长船名字符数: {{ debugInfo.maxNameLen }} | gridLeft(实际): {{ debugInfo.gridLeftRec }}</div>
        <div style="min-width:300px;">Y轴样例: {{ debugInfo.ySample }}</div>
        <div v-if="debugInfo.sample" style="min-width:320px;">色条样例: 船索引={{ debugInfo.sample.yIndex }}，船名={{ debugInfo.sample.shipName }}，{{ debugInfo.sample.start }} → {{ debugInfo.sample.end }}</div>
        <div v-else style="min-width:300px;color:#c0392b;font-weight:600;">⚠️ 没有生成任何色条（请检查派任记录的 shipId、startDate、endDate 是否合法）</div>
        <div v-if="debugInfo.yMapDebug" style="width:100%;font-size:12px;color:#2c3e50;white-space:pre-wrap;">Y轴映射自检（前6行）: {{ debugInfo.yMapDebug }}</div>
        <div v-if="debugInfo.barsDumpHtml" style="width:100%;overflow:auto;margin-top:6px;border:1px dashed #95a5a6;padding:4px;border-radius:4px;background:#fafafa;" v-html="debugInfo.barsDumpHtml"></div>
        <div v-else-if="debugInfo.barsDumpCount===0 && debugInfo.assignments > 0" style="width:100%;color:#c0392b;font-weight:600;">🔴 派任{{ debugInfo.assignments }}条但色条=0！检查 shipId 映射！</div>
        <!-- v0836 每船诊断摘要：每艘船的派任情况，一眼看出为什么 bar 不到今天 -->
        <div v-if="debugInfo.shipSummaryHtml" style="width:100%;margin-top:6px;border:1px solid #e67e22;padding:6px;border-radius:6px;background:#fffbe6;" v-html="debugInfo.shipSummaryHtml"></div>
        <div v-if="lastFatalWarn" style="min-width:320px;color:#e67e22;">永久 WARN: {{ lastFatalWarn }}</div>
        <div v-if="lastFatalError" style="width:100%;color:#c0392b;font-weight:600;white-space:pre-wrap;">永久 ERROR: {{ lastFatalError }}</div>
        <div v-if="lastInitSteps.length > 0" style="width:100%;font-size:12px;color:#34495e;white-space:pre-wrap;">初始化步骤追踪: {{ lastInitSteps.join(' → ') }}</div>
        <div v-if="debugInfo.warn && !lastFatalWarn" style="min-width:320px;color:#e67e22;">本次 WARN: {{ debugInfo.warn }}</div>
        <div v-if="debugInfo.error && !lastFatalError" style="width:100%;color:#c0392b;white-space:pre-wrap;">本次 ERROR: {{ debugInfo.error }}</div>
      </div>

      <!-- v0818 版本号/TAG 永远可见（缩放按钮已移到甘特图右侧悬浮） -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 10px;">
        <div style="font-size:11px;color:#909399;flex:1;min-width:200px;">💡 提示：单击政委色条查看详情/更换；上下拖动滚动船舶列表；右侧 +/- 按钮缩放时间轴；月份刻度固定在顶部</div>
        <!-- ★ v0845 调试面板切换改为按钮控制（原先双击切换会和"双击色条看卡片"冲突） -->
        <button class="gantt-debug-toggle" @click="onDblClickWrapper" :title="debugVisible ? '关闭调试面板' : '打开调试面板'">{{ debugVisible ? '🔍 调试(开)' : '🔍 调试(关)' }}</button>
        <!-- ★ v0812 版本号/TAG 永远可见，用户一眼就知道是不是最新部署（动态从 runtimeConfig 读，不再写死） -->
        <div style="font-size:12px;color:#606266;margin-left:auto;font-weight:600;">🏷️ 甘特图 <span style="color:#409eff;">{{ APP_VERSION_SHORT }}</span> · TAG <span style="color:#27ae60;">{{ APP_VERSION }}</span> · 构建 <span style="color:#e67e22;">{{ buildTimeLabel }}</span></div>
      </div>

      <!-- v0807j 结构重组：scroll-box = 可滚动容器(overflow auto)，内部 2 块 + 右侧悬浮缩放按钮 -->
      <div style="position:relative;">
      <div class="staff-gantt-scroll-box" :style="{ maxHeight: scrollMaxHeight + 'px' }" ref="scrollBoxRef">
        <!-- ★ 冻结表头：Excel 模式 sticky top 0 始终显示月份刻度
             ★ v0816 终极图层重构——4层 DOM 顺序（从下到上）：
               ① canvas 月份刻度 z1 < ② mask 白底遮(盖色条左端溢出，z6) < ③ 【新增 HTML 船名图层 z8】< ④ 分割竖线 z7(调到z9最高)
               为什么？陈先生两张截图里左侧大面积空白船名全没了——根因是原来 ECharts Y axisLabel 画在 canvas 的 0..grid.left 区域，
               而 .y-axis-mask 也是 width=gridLeftRec+白底 z=6，直接把 canvas 上的 axisLabel 全盖死了！(ECharts内部z=9在canvas像素级，z6的DOM层在上层当然能盖住所有canvas像素)
               彻底解法：所有「船名 + 空缺徽标」不用 ECharts 画在 canvas 上，改为**独立一层 HTML DOM**（position:absolute 叠在 mask 和 canvas 之上），
               永远不会被 mask 盖住，也不受 ECharts clip/grid 坐标影响，100% 可控！ -->
        <div class="staff-gantt-header-sticky" :style="{ height: HEADER_H + 'px' }">
          <!-- ① 最底层：canvas（月份刻度） -->
          <div :id="headerCanvasUniqueId" class="staff-gantt-header-canvas" style="position:absolute;top:0;left:0;right:0;bottom:0;z-index:1;"></div>
          <!-- ② 白底遮罩：盖住 canvas 左端色条溢出区 -->
          <div class="y-axis-mask" :style="{ width: gridLeftRec + 'px', height: HEADER_H + 'px', zIndex: 6 }"></div>
          <!-- ③ ★ v0816 新增：顶部船名表头图层（z8，叠在 mask 之上！永远不会被盖） -->
          <div class="y-axis-html-labels y-axis-html-labels-header" :style="{ width: gridLeftRec + 'px', height: HEADER_H + 'px', zIndex: 8 }">
            <span class="ship-col-title">船舶 / 政委</span>
          </div>
          <!-- ④ 分割竖线（最上层 z9） -->
          <div class="y-axis-mask-sep" :style="{ left: gridLeftRec + 'px', height: HEADER_H + 'px', zIndex: 9 }"></div>
        </div>

        <!-- 主甘特图：色条 canvas + mask + 【v0816 HTML 船名图层（独立z8，不被mask盖）】+ sep -->
        <div class="staff-gantt-wrapper" :style="{ height: chartHeight + 'px' }">
          <!-- ① 最底层：canvas（色条 / x轴 / dataZoom） -->
          <div :id="canvasUniqueId" class="staff-gantt-canvas" style="position:absolute;top:0;left:0;right:0;bottom:0;z-index:1;" />
          <!-- ② 白底遮罩（盖住canvas左端色条bar溢出，z6） -->
          <div class="y-axis-mask" :style="{ width: gridLeftRec + 'px', height: chartHeight + 'px', zIndex: 6 }"></div>
          <!-- ③ ★ v0816 新增：HTML船名图层（独立z8，在mask之上！绝对不会被盖住）
               每艘船对应一行，top 按 GRID_TOP + idx × ROW_H 像素级和 ECharts bar 对齐。 -->
          <div class="y-axis-html-labels y-axis-html-labels-body"
               :style="{ width: gridLeftRec + 'px', height: chartHeight + 'px', zIndex: 8 }">
            <div
              v-for="(ship, idx) in reversedShips"
              :key="ship.id || idx"
              class="ship-row-label"
              :style="{
                top: (GRID_TOP + idx * actualRowH) + 'px',
                height: actualRowH + 'px',
                lineHeight: actualRowH + 'px',
              }"
            >
              <span class="ship-cn-name" :title="ship.cnShipName">{{ ship.cnShipName }}</span>
              <span v-if="vacantIdSet.has(Number(ship.id))" class="vacant-badge">空缺</span>
            </div>
          </div>
          <!-- ④ 分割竖线（最上层 z9） -->
          <div class="y-axis-mask-sep" :style="{ left: gridLeftRec + 'px', height: chartHeight + 'px', zIndex: 9 }"></div>
        </div>
      </div>
      <!-- ★ v0818 右侧悬浮缩放按钮组（陈先生要求：加减号放右侧，不影响上下滑动） -->
      <div class="gantt-zoom-controls">
        <button class="gantt-zoom-btn" @click="zoomInRange" title="放大时间（范围缩小1/2）">＋</button>
        <button class="gantt-zoom-btn" @click="zoomOutRange" title="缩小时间（范围扩大×2）">－</button>
        <button class="gantt-zoom-btn gantt-zoom-reset" @click="resetRange" title="重置时间范围">↺</button>
        <button class="gantt-zoom-btn gantt-zoom-today" @click="goToToday" title="回到今天">📌</button>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== v0807i 按陈先生需求：图层/冻结表头/滚动布局 ===== */
.staff-gantt-scroll-box {
  position: relative;
  overflow: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #ffffff;
  -webkit-overflow-scrolling: touch;
}
/* ★ v0818 右侧悬浮缩放按钮组 */
.gantt-zoom-controls {
  position: absolute;
  right: 8px;
  top: 60px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 30;
}
.gantt-zoom-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.15s;
  user-select: none;
}
.gantt-zoom-btn:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
.gantt-zoom-btn:active {
  transform: scale(0.92);
}
.gantt-zoom-reset {
  font-size: 16px;
}
.gantt-zoom-today {
  font-size: 14px;
}
/* ★ v0845 调试面板切换按钮 */
.gantt-debug-toggle {
  padding: 4px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f4f4f5;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.gantt-debug-toggle:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
.staff-gantt-header-sticky {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
  isolation: isolate;
}
.y-axis-mask {
  position: absolute;
  top: 0;
  left: 0;
  background: #ffffff;
  pointer-events: none;
  box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.06);
}
.y-axis-mask-sep {
  position: absolute;
  top: 0;
  width: 1px;
  background: #e4e7ed;
  pointer-events: none;
}
.staff-gantt-header-canvas {
  z-index: 5;
}
.staff-gantt-wrapper {
  position: relative;
  overflow: visible;
}
.staff-gantt-canvas {
  width: 100%;
  height: 100%;
}
/* ===== v0816 ★ 终极修复：HTML 船名图层（独立于canvas+mask的第三层DOM，z8 > mask z6）
   船名永远不会被白底mask盖住，也不受ECharts axisLabel坐标/clip影响，100%可控。 */
.y-axis-html-labels {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
.y-axis-html-labels-header {
  display: flex;
  align-items: center;
  padding-left: 14px;
  padding-right: 14px;
  border-bottom: 1px solid #ebeef5;
}
.ship-col-title {
  color: #303133;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}
.ship-row-label {
  position: absolute;
  left: 0;
  right: 0;
  padding-left: 14px;
  padding-right: 10px;
  display: flex;
  align-items: center;
  /* ★ v0819 修复船名左对齐：justify-content:flex-end，让内部元素整体右靠到 padding-right 边缘 */
  justify-content: flex-end;
  gap: 6px;
  white-space: nowrap;
  /* 右侧加分割线：和色条起点竖线对齐（就是 sep 的 left = gridLeftRec） */
  border-bottom: 1px dashed #f0f2f5;
  box-sizing: border-box;
}
.ship-cn-name {
  color: #303133;
  font-size: 12px;
  font-weight: 500;
  /* ★ v0819 彻底右对齐：删除 margin-left/right、删除 order、删除 max-width 限制（justify-content:flex-end 已统一控制） */
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: right;
}
.vacant-badge {
  flex-shrink: 0;
  background: rgba(245, 108, 108, 0.15);
  border: 1px solid #f56c6c;
  color: #c0392b;
  font-size: 10px;
  line-height: 16px;
  padding: 1px 6px;
  border-radius: 8px;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
// ★ v0812 动态读取版本号/构建时间：彻底告别 template 写死 v0807m 的黑历史
const { public: cfg } = useRuntimeConfig()
const APP_VERSION = cfg.appVersion || '1.0.0'
const APP_VERSION_SHORT = cfg.appVersionShort || ('v' + (APP_VERSION.split('.').pop() || 'x'))
const APP_BUILD_TIME = cfg.appBuildTime || new Date().toISOString()
// ★ 重要！删除顶层 echarts import：
// 顶层 `import * as echarts from 'echarts'` 在 Nuxt SSR 阶段（Node 环境）就会被执行，
// zrender 内部访问 window/Canvas API 导致整个模块损坏，到客户端后 init 调用就报
// "s.setTimeout is not a function" 且 40 次重试全部失败。
// 解决方案：用 await import('echarts') 在 initChart 中**客户端懒加载**。
import type { StaffAssignment } from '~/types'

// ★ echarts 客户端懒加载：只在浏览器中、第一次 initChart 时才真正 import
type EChartsModule = typeof import('echarts')
let echartsModule: EChartsModule | null = null

// 调试面板显示/隐藏：v0836 默认显示，不再需要双击（陈先生看不到调试表格，无法定位根因）
const debugVisible = ref(true)
// 滚动容器 ref
const scrollBoxRef = ref<HTMLDivElement | null>(null)
function onDblClickWrapper() {
  debugVisible.value = !debugVisible.value
}

// 冻结表头 + 按钮 + 画布需要用到的常量/尺寸
const HEADER_H = 96 // ★ v0824 再增高度：顶部含月份label(56px)+dataZoom滑块(30px)+padding(10px) = 96px；滑块移到顶部方便左右滑动

// ★ v0819 HTML 船名图层和 ECharts bar 像素级对齐的两个关键常量：
//   主图 grid.top = 10，grid.bottom = 72，grid内实际像素 = chartHeight - 10 - 72 = N×44 + 38
//   每个 category 实际行高 = ((N×44 + 38) - 8*(N-1)) / N ？ 不对 —— ECharts splitArea 会均匀
//   地把 （grid内像素 - splitAreaSpacing） / N。我们直接算出实际行高，不再写死 44。
const GRID_TOP = 10
const GRID_BOTTOM_MAIN = 72
const GRID_TOP_HEADER = 10
const GRID_BOTTOM_HEADER = 16
// 精确的 HTML ROW_H = (chartHeight - 10 - 72) / N（= 每个 category 在 grid 内真实像素）
const actualRowH = computed(() => {
  const n = Math.max(1, safeShips.value.length)
  const innerH = chartHeight.value - GRID_TOP - GRID_BOTTOM_MAIN
  return Math.max(24, Math.round(innerH / n))
})
const ROW_H = 44 // 兜底常量，template 里改读 actualRowH
const DEFAULT_SCROLL_MAX_H = 560 // 甘特图滚动容器默认最大高度（手机端/PC 端体验均衡）
const scrollMaxHeight = ref<number>(DEFAULT_SCROLL_MAX_H)
// 冻结月份表头画布 id（独立 echarts 实例）
const headerCanvasUniqueId = 'staff-gantt-header-' + Math.random().toString(36).slice(2, 10)
// 主画布 id
const canvasUniqueId = 'staff-gantt-canvas-' + Math.random().toString(36).slice(2, 10)
// 主 echarts 实例 + 冻结表头 echarts 实例
let chartInstance: any = null
let headerChartInstance: any = null
// 当前生效的 dataZoom 范围（用户缩放后保持同步；新建/重置时使用默认）
const dzRange = ref<{ startValue: number; endValue: number } | null>(null)
// ★ v0812 永远可见的"构建时间戳"标签：真实从 runtimeConfig.public.appBuildTime 读（nuxt构建时注入，每次打包都是新时间）
//   之前写死 BUILD_TS=1786142400000 + 随机60秒，陈先生永远看到 06:40:04——这是大BUG！
const buildTimeLabel = computed(() => {
  const d = new Date(new Date(APP_BUILD_TIME).getTime() + 8 * 3600 * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')} ${hh}:${mm}:${ss}`
})
// v0807m 初始化永久可见告警（陈先生手机端能直接看到）
const initFatalAlert = ref<string | null>(null)
// 缩放按钮
// ★ v0824 缩放函数（滑块移到顶部冻结表头）：从 headerChartInstance.getOption().xAxis 读当前范围
//   主图没有 dataZoom，范围同步全靠 dzRange + syncHeaderZoom
function getCurrentRange() {
  if (dzRange.value && dzRange.value.startValue > 0 && dzRange.value.endValue > dzRange.value.startValue) {
    return [dzRange.value.startValue, dzRange.value.endValue] as [number, number]
  }
  // 回退：header 滑块当前值
  if (headerChartInstance) {
    try {
      const h = headerChartInstance.getOption()
      const dz = (h?.dataZoom || [])[0] || {}
      const s = Number(dz.startValue) || 0
      const e = Number(dz.endValue) || 0
      if (s > 0 && e > s) return [s, e] as [number, number]
    } catch (_) {}
  }
  // 再回退：主图 xAxis
  if (chartInstance) {
    try {
      const o = chartInstance.getOption()
      const ax = (o?.xAxis || [])[0] || {}
      const s = Number(ax.min) || 0
      const e = Number(ax.max) || 0
      if (s > 0 && e > s) return [s, e] as [number, number]
    } catch (_) {}
  }
  const nw = nowTs.value
  return [nw - 180 * DAY_MS, nw + 30 * DAY_MS] as [number, number]
}
function zoomInRange() {
  if (!chartInstance || !echartsModule) return
  const [s, e] = getCurrentRange()
  const mid = (s + e) / 2
  const half = Math.max(14 * DAY_MS, (e - s) / 4) // 最小14天半宽，防止缩到看不见
  const ns = mid - half
  const ne = mid + half
  dzRange.value = { startValue: ns, endValue: ne }
  syncHeaderZoom()
}
function zoomOutRange() {
  if (!chartInstance || !echartsModule) return
  const [s, e] = getCurrentRange()
  const half = (e - s) // 扩大1倍（当前范围×2）
  const tr = timeRange.value
  const ns = Math.max(tr.min, s - half)
  const ne = Math.min(tr.max, e + half)
  if (ne - ns < 14 * DAY_MS) return // 安全兜底
  dzRange.value = { startValue: ns, endValue: ne }
  syncHeaderZoom()
}
function resetRange() {
  const now = nowTs.value
  dzRange.value = { startValue: now - 540 * DAY_MS, endValue: now + 60 * DAY_MS }
  syncHeaderZoom()
}
// ★ v0818 回到今天：重置范围到以今天为中心的 6 个月窗口 + 滚动到今天位置
function goToToday() {
  const now = nowTs.value
  dzRange.value = { startValue: now - 90 * DAY_MS, endValue: now + 90 * DAY_MS }
  syncHeaderZoom()
}
function syncHeaderZoom() {
  if (!dzRange.value) return
  try {
    const sv = dzRange.value.startValue
    const ev = dzRange.value.endValue
    // ★ v0824 主图没有 dataZoom 了 → 直接 set xAxis min/max 同步时间范围
    if (chartInstance) {
      chartInstance.setOption({ xAxis: { min: sv, max: ev } }, false)
    }
    // Header：set xAxis min/max 让顶部滑块响应
    if (headerChartInstance) {
      headerChartInstance.setOption({
        xAxis: { min: sv, max: ev },
        dataZoom: { startValue: sv, endValue: ev },
      }, false)
    }
  } catch (_) { /* ignore */ }
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

// ★ v0819 「今天」统一时间戳 ref（解决 色条end / today markLine / today max 三个 Date.now() 毫秒差）
//   每次 applyOption() 执行时设置一次 nowTs.value = Date.now()，所有依赖都读它：
//   - ganttBars end = a.endDate? : nowTs
//   - buildOption xAxis max, markLine xAxis: nowTs
//   - buildHeaderOption markLine xAxis: nowTs / xAxis max
//   - timeRange computed max 也取 nowTs
const nowTs = ref<number>(Date.now())

const DAY_MS = 1000 * 60 * 60 * 24

function getDaysOnBoard(startDate: string, endDate?: string | null): number {
  const start = new Date(startDate).getTime()
  const end = endDate ? new Date(endDate).getTime() : Date.now()
  return Math.floor((end - start) / DAY_MS)
}

// ★ v0838 色条颜色：与 ganttBars 统一规则，只有 ended集合 才算历史；其他一律在任→到今天算天数
function getBarColor(a: AssignmentItem): string {
  const status = (a.status || '').toLowerCase()
  if (status === 'leave') return '#a8abb2'
  const ENDED_SET = new Set(['ended', 'offboard', '下船', '离职', '离船', '已下船', '已离船'])
  const hasEnded = ENDED_SET.has(status)
  const startTs = new Date(a.startDate).getTime()
  const endTs = hasEnded && a.endDate
    ? new Date(a.endDate).getTime()
    : Date.now() // 在任→今天
  const days = Math.max(1, Math.floor((endTs - startTs) / DAY_MS))
  if (hasEnded) return '#b8b8b8' // 历史派任灰色
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

// ★ v0807i 统一基准尺寸（template 模板也需要）：
//   gridLeftRec（船名 + 徽标 + padding 预留像素）+ chartHeight（主画布高度）
//   因为 computed 对 buildOption 里局部常量 gridLeftRec 不可见，这里单独再写一份 computed
//   —— 保证 公式 和 buildOption / buildHeaderOption 内部 完全一致
const gridLeftRec = computed(() => {
  const names = yCategories.value
  let maxLen = 0
  for (const n of names) maxLen = Math.max(maxLen, String(n || '').length)
  // ★ v0818 陈先生反馈"左侧船名区域宽度太大造成空间浪费"：
  //   缩小公式：每中文14px（原18px）+ 徽标40（原80）+ padding24（原40）
  //   下限120（原180），上限240（原340）—— 让右侧时间轴获得更多空间
  return Math.max(Math.min(maxLen * 14 + 40 + 24, 240), 120)
})

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
  const now = nowTs.value // ★ v0819 用统一 nowTs ref（避免和 buildOption/ganttBars 内 Date.now() 时间差）
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

    // ★ v0807l 纠正陈先生之前理解的偏差（之前是我理解错了）：
    //   「空缺船舶」只表示"今天这个时间点，船上没有在任政委"（所以 Y 轴船名右边显示红色「空缺」徽标），
    //   但是——历史上任政委（例如 1/1~4/1）、未来已登记上任政委（7/11~至今/或未来某段）的色条，
    //   也必须正常显示出来！这样船工主管才能看清"这艘船历史上过谁、中间空了多久、接下来又是谁来"。
    //   所以**旧逻辑"vacant 船整行 skip 所有色条"是错误的**。
    //   新规则：vacant 徽标只影响 Y 轴"空缺"徽标的显示，与色条完全解耦。

    // ★ 船舶视角需求（001 优化文档）：不要出现独立的「休假」色条
    //   同一艘船同一时段如果在任状态已被其他派任覆盖，休假（status=leave）派任不单独绘制
    //   如果派任同时是 ended(已下船) + leave，也按历史在任绘制（透明度不同），不画独立虚线休假条
    const status = (a.status || '').toLowerCase()
    if (status === 'leave') continue

    // ★ v0838 终极修复（陈先生原话：「所有的船舶都把上船日期当成了下船日期」）
    //   彻底删掉所有复杂判定、min/max 调换操作。就三条死规则：
    //   1. 左端 = 100% 原始 a.startDate 时间戳
    //   2. 右端：
    //      - 如果 status ∈ ended集合 → 原始 a.endDate（没有就start+1天）
    //      - 其他一切（空/active/脏）→ 今天中午 12 点 (nowTs + 6h)
    //   3. 最终保险：右端 < 左端 → 右端强制 = 左端 + 1天（保证不反向 / 不被 ECharts 自动丢弃）
    //   不再猜测「是不是 min 搞错了」「是不是 max 搞反了」——一切按最直觉的写。
    const ENDED_STATUSES = new Set(['ended', 'offboard', '下船', '离职', '离船', '已下船', '已离船'])
    const hasEnded = ENDED_STATUSES.has(status)
    const isActive = !hasEnded

    // 规则1：左端 = 原始 a.startDate，不要任何处理
    const __start = new Date(a.startDate).getTime()

    // 规则2：右端 = status 决定
    // ★ v0840 关键修复：ECharts time axis 画 bar 时，末端像素会被向下取整到网格刻度
    //   即使 endFinal=今天中午(nowTs+6h)，视觉上也会比 markLine(xAxis:now=今天0点)短2-3像素
    //   → 必须把 endFinal 推到 nowTs+12h（今天下午6点），让 bar 末端时间戳比 markLine 多12小时
    //   → 视觉上 bar 右端一定能覆盖住今天蓝色竖线！
    const BAR_END_BUFFER_MS = 12 * 3600 * 1000 // 12小时冗余（今天下午6点）
    let __end: number
    if (isActive) {
      // 非 ended → 一定在任 → 右端=今天下午6点（绝对覆盖 markLine）
      __end = nowTs.value + BAR_END_BUFFER_MS
    } else {
      // ended → 按原始 endDate
      if (a.endDate) {
        __end = new Date(a.endDate).getTime()
      } else {
        __end = __start + DAY_MS // 没有 endDate 的 ended 派任：至少显示1天
      }
    }

    // 规则3：右端必须大于左端（绝对保险，任何情况不反向）
    if (__end <= __start) {
      __end = __start + DAY_MS
    }

    const startFinal = __start
    const endFinal = __end

    // ★ v0838 色条 label 强制写「起始日期→结束日期」——陈先生不用猜，一眼就知道我用对了没有
    const officerName = a.user?.realName || a.ship?.politicalOfficerName || '未指派'
    const totalDays = Math.max(1, Math.round((endFinal - startFinal) / DAY_MS))
    const _sMM = String(new Date(startFinal).getMonth() + 1).padStart(2, '0')
    const _sDD = String(new Date(startFinal).getDate()).padStart(2, '0')
    const _eMM = String(new Date(endFinal).getMonth() + 1).padStart(2, '0')
    const _eDD = String(new Date(endFinal).getDate()).padStart(2, '0')
    // 在任：结束日期 =「至今」；历史派任：结束日期 = MM/DD
    const endLabel = isActive ? '至今' : `${_eMM}/${_eDD}`
    const labelText = `${officerName}·${totalDays}天 ${_sMM}/${_sDD}→${endLabel}`

    if (isNaN(startFinal) || isNaN(endFinal)) {
      console.warn('[gantt-bar-skip v0838] NaN:', { a, startFinal, endFinal })
      continue
    }

    out.push({
      value: [yIndex, startFinal, endFinal],  // ★ v0838：绝对不搞任何 min/max 调换，100% 按 [y, start, end]
      _assignmentId: a.id,
      _labelText: labelText,
      itemStyle: {
        color: getBarColor(a),
        opacity: hasEnded ? 0.65 : 1,
        borderRadius: [3, 3, 3, 3],
        borderColor: 'transparent',
        borderWidth: 0,
      },
    })
  }
  return out
})

// ★ v0832 完整派任判定 DUMP：每条派任原始数据 + 最终计算结果，陈先生打开页面就能看到我哪里判错
const debugBarsDump = ref<any[]>([])

// ★ v0832 ganttBars 计算出后立刻同步到 debugBarsDump，给调试面板用
watchEffect(() => {
  const bars = ganttBars.value
  const out: any[] = []
  for (const b of bars) {
    const id = Number(b._assignmentId)
    const a = id ? assignmentMap.value.get(id) : null
    out.push({
      id,
      officer: b._labelText?.split('（')?.[0] || '?',
      yIndex: Number(b.value[0]),
      shipName: yCategories.value[Number(b.value[0])] || '(未知船)',
      startFinal: new Date(Number(b.value[1])).toISOString().slice(0, 10),
      endFinal: new Date(Number(b.value[2])).toISOString().slice(0, 10),
      startFinalTs: Number(b.value[1]),
      endFinalTs: Number(b.value[2]),
      daysNum: Math.max(1, Math.round((Number(b.value[2]) - Number(b.value[1])) / DAY_MS)),
      opa: b.itemStyle?.opacity ?? 1,
      color: b.itemStyle?.color ?? '?',
      raw: a ? {
        startDateRaw: a.startDate || '(NULL)',
        endDateRaw: a.endDate || '(NULL)',
        statusRaw: a.status || '(NULL)',
        shipIdRaw: a.shipId ?? '?',
      } : null,
    })
  }
  debugBarsDump.value = out
})

// 调试信息（初始值非 null，让调试面板立即可见）
const debugInfo = ref<any>({
  init: '✅ StaffGanttChart 挂载中…等待 ECharts DOM 出现',
  ships: 0,
  assignments: 0,
  bars: 0,
  warn: null,
  error: null,
  barsDumpHtml: '',
})

// SSR 环境下没有 document，避免引用错误
const isBrowser = typeof document !== 'undefined'
// ★ 终极方案：用稳定的唯一 ID 直接 getElementById，不依赖 ref/ClientOnly
//    每次组件挂载都生成新 ID，避免同一页面多个甘特图 ID 冲突

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
  // ★ v0819 设置统一 nowTs（先于所有依赖 computed），保证 end/markLine/xAxis 三处毫秒完全相同
  nowTs.value = Date.now()
  const tr = timeRange.value
  const now = nowTs.value
  const defaultStart = now - 540 * DAY_MS
  const defaultEnd = now + 60 * DAY_MS
  const bars = ganttBars.value
  // ★ v0836 调试表格：直接从 bars 同步计算，不依赖 watchEffect timing（彻底解决时序问题）
  function buildBarDumpRows(limit: number) {
    const rows: any[] = []
    for (const b of bars) {
      const id = Number(b._assignmentId)
      const a = id ? assignmentMap.value.get(id) : null
      rows.push({
        id,
        officer: b._labelText?.split('（')?.[0] || '?',
        yIndex: Number(b.value[0]),
        shipName: yCategories.value[Number(b.value[0])] || '(未知船)',
        startFinal: new Date(Number(b.value[1])).toISOString().slice(0, 10),
        endFinal: new Date(Number(b.value[2])).toISOString().slice(0, 10),
        startFinalTs: Number(b.value[1]),
        endFinalTs: Number(b.value[2]),
        daysNum: Math.max(1, Math.round((Number(b.value[2]) - Number(b.value[1])) / DAY_MS)),
        opa: b.itemStyle?.opacity ?? 1,
        color: b.itemStyle?.color ?? '?',
        raw: a ? {
          startDateRaw: a.startDate || '(NULL)',
          endDateRaw: a.endDate || '(NULL)',
          statusRaw: a.status || '(NULL)',
          shipIdRaw: a.shipId ?? '?',
        } : null,
      })
    }
    return rows.slice(0, limit)
  }
  function renderBarDumpTable(limit: number): string {
    const rows = buildBarDumpRows(limit)
    const totalBars = bars.length
    const now = nowTs.value
    // ★ v0844 修复：endFinal 故意设为 nowTs+12h（今天下午6点），用来覆盖蓝色今天竖线
    //   所以不能再机械比较 `endFinal 日期字符串 === today 0点日期`，会全误报红色。
    //   → 改用时间戳范围判定：endFinal ∈ [今天 00:00, 今天+36小时] 都算「右端正确覆盖今天」
    const today0 = new Date(now); today0.setHours(0, 0, 0, 0); const today0Ts = today0.getTime()
    const todayPlus36h = today0Ts + 36 * 3600 * 1000
    const todayStr = new Date(now).toISOString().slice(0, 10)
    const barEndStr = new Date(todayPlus36h - 24 * 3600 * 1000 + 12 * 3600 * 1000).toISOString().slice(0, 10) // now+12h 对应日期
    let s = `<div style="margin-bottom:4px;font-weight:600;color:#2c3e50;">📅 today基准(今0点): ${todayStr} | 色条右端目标(今+12h覆盖今天线): ${barEndStr} | 共 ${totalBars} 条色条（显示前 ${limit} 条，仅 方向❌反向/在任右端<今天0点 才红色高亮）</div>`
    s += `<table style="border-collapse:collapse;font-size:11px;width:100%;min-width:900px;"><tr style="background:#34495e;color:#fff;">
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:left;">政委</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:left;">船名/Y行</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:left;">原始 startDate</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:left;">原始 endDate</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:left;">status</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:left;">startFinal(色条左端)</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:left;">endFinal(色条右端)</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:center;">天数</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:center;">方向</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:center;">opa</th>
      <th style="border:1px solid #ccc;padding:2px 4px;text-align:center;">颜色</th>
    </tr>`
    for (const r of rows) {
      const forward = r.endFinalTs > r.startFinalTs
      const endTs = r.endFinalTs
      // 在任（opa>=0.99）且 endFinal 在今天0点~今天+36h → 右端正确（含 now+12h 缓冲区）
      const activeOk = (r.opa >= 0.99) && (endTs >= today0Ts) && (endTs <= todayPlus36h)
      // 历史（ended）endFinal 不在这个范围 → 正常
      // 真错误：反向 或 (在任且右端早于今天0点 = 没到今天)
      const bad = !forward || ((r.opa >= 0.99) && (endTs < today0Ts))
      s += `<tr style="${bad ? 'background:#ffe0e0;color:#c0392b;font-weight:700;' : ''}">
        <td style="border:1px solid #ccc;padding:2px 4px;">${r.officer}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;">Y${r.yIndex}·${r.shipName}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;">${r.raw?.startDateRaw}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;">${r.raw?.endDateRaw}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;">${r.raw?.statusRaw}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;">${r.startFinal}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;">${r.endFinal}${(r.opa >= 0.99) ? (activeOk ? ' ✅' : (endTs < today0Ts ? ' ❌右端没到今天' : '')) : ''}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;">${r.daysNum}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;">${forward ? '✅正向' : '❌反向ERROR'}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;">${r.opa}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;"><span style="display:inline-block;width:16px;height:12px;background:${r.color};border:1px solid #aaa;"></span></td>
      </tr>`
    }
    s += `</table>`
    return s
  }

  // v0836 每船诊断摘要：按船分组显示所有派任
  function renderShipSummary(): string {
    if (!bars.length) return ''
    const now = nowTs.value
    const today0 = new Date(now); today0.setHours(0, 0, 0, 0); const today0Ts = today0.getTime()
    const todayPlus36h = today0Ts + 36 * 3600 * 1000
    const byShip = new Map<number, any[]>()
    for (const b of bars) {
      const yIdx = Number(b.value[0])
      if (!byShip.has(yIdx)) byShip.set(yIdx, [])
      const id = Number(b._assignmentId)
      const a = id ? assignmentMap.value.get(id) : null
      byShip.get(yIdx)!.push({ b, a })
    }
    const ENDED_SET = new Set(['ended', 'offboard', '下船', '离职', '离船', '已下船', '已离船'])
    let s = `<div style="font-weight:600;margin-bottom:4px;">🚢 每船派任诊断（共 ${byShip.size} 艘船，${bars.length} 条色条）</div>`
    s += `<div style="font-size:11px;margin-bottom:6px;color:#555;">图例: <b style="color:#27ae60;">✅</b>在任且右端覆盖今天(含+12h缓冲) | <b style="color:#c0392b;">❌</b>在任但右端＜今天(严重错误) | <b style="color:#e67e22;">⚠️</b>历史派任(正常) | 船名后数字=派任数</div>`
    for (const [yIdx, items] of byShip) {
      const shipName = yCategories.value[yIdx] || '(未知船)'
      const sorted = items.sort((a, b2) => Number(a.b.value[1]) - Number(b2.b.value[1]))
      let shipHtml = `<div style="border:1px solid #ccc;border-radius:4px;padding:4px 6px;margin-bottom:4px;background:#fff;">`
      shipHtml += `<b style="font-size:13px;">🚢 ${shipName} (Y${yIdx})</b> <span style="color:#888;font-size:11px;">派任${sorted.length}条</span>`
      for (const { b: bar, a: asg } of sorted) {
        const off = bar._labelText?.split('（')?.[0] || '?'
        const st = (asg?.status || '').toLowerCase()
        const isEnded = ENDED_SET.has(st)
        const endTs = Number(bar.value[2])
        const endDate = new Date(endTs).toISOString().slice(0, 10)
        // ★ v0844 同上：在任 endFinal 在 [今天0点, 今天+36h] → ✅ 正确
        let warnClass, mark, bg
        if (isEnded) {
          warnClass = '#e67e22'; mark = '⚠️历史'; bg = '#fff5e6'
        } else {
          const ok = (endTs >= today0Ts) && (endTs <= todayPlus36h)
          if (ok) { warnClass = '#27ae60'; mark = '✅在任→今天(覆盖)'; bg = '#e6ffe6' }
          else if (endTs < today0Ts) { warnClass = '#c0392b'; mark = '❌在任但右端＜今天(严重)'; bg = '#ffe6e6' }
          else { warnClass = '#7c3aed'; mark = '🔔在任右端超范围(' + endDate + ')'; bg = '#f5f3ff' }
        }
        const rawEnd = asg?.endDate || '(null)'
        shipHtml += `<div style="font-size:11px;margin:2px 0;padding:2px 4px;background:${bg};border-left:3px solid ${warnClass};">
          <span style="font-weight:600;">${off}</span>
          <span style="color:#888;margin:0 4px;">|</span>
          原始status=<code style="background:#f0f0f0;padding:0 2px;">${st || '(空)'}</code>
          <span style="color:#888;margin:0 4px;">|</span>
          原始endDate=<code style="background:#f0f0f0;padding:0 2px;">${rawEnd}</code>
          <span style="color:#888;margin:0 4px;">|</span>
          startFinal=${new Date(Number(bar.value[1])).toISOString().slice(0, 10)} → endFinal=${endDate}
          <span style="color:#888;margin:0 4px;">|</span>
          <b style="color:${warnClass};">${mark}</b>
        </div>`
      }
      shipHtml += `</div>`
      s += shipHtml
    }
    return s
  }

  // 更新调试面板（保留 init/warn/error 等字段，避免覆盖）
  const sample = bars[0]
  const names = yCategories.value
  let maxLen = 0
  for (const n of names) maxLen = Math.max(maxLen, String(n || '').length)
  // ★ v0819 统一 grid.left 计算公式，和 computed gridLeftRec 完全一致：14px/字+40+24，下限120，上限240
  const gridLeftRec = Math.max(Math.min(maxLen * 14 + 40 + 24, 240), 120)

  // v0807h 新增 Y 轴映射自检
  const yMapDebug: string[] = []
  const yIdxBarCount = new Map<number, number>()
  for (const b of bars) {
    const yIdx = Number(b.value[0])
    if (!isNaN(yIdx)) yIdxBarCount.set(yIdx, (yIdxBarCount.get(yIdx) || 0) + 1)
  }
  reversedShips.value.slice(0, 6).forEach((s, yIdx) => {
    const shipId = Number(s.id)
    const vacant = vacantIdSet.value.has(shipId) ? '🔴vacant' : '✅ok'
    const cnt = yIdxBarCount.get(yIdx) ?? 0
    yMapDebug.push(`Y${yIdx}=${String(s.cnShipName).slice(0, 6)}(id${shipId})${vacant}色条${cnt}`)
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
    barsDumpHtml: renderBarDumpTable(Math.min(30, bars.length)),
    barsDumpCount: bars.length,
    // v0836 每船诊断摘要：按船分组显示所有派任 + 是否延伸到今天
    shipSummaryHtml: renderShipSummary(),
    todayStr: new Date(nowTs.value).toISOString().slice(0, 10) + ' ' + new Date(nowTs.value).toISOString().slice(11, 16) + ' UTC',
    todayNoonStr: new Date(nowTs.value + 6 * 3600 * 1000).toISOString().slice(0, 10),
  }

  // 初始化 dataZoom 默认范围：如果有外部 dzRange 就沿用（用户缩放后/重置后）
  const curStartValue = dzRange.value?.startValue ?? defaultStart
  const curEndValue = dzRange.value?.endValue ?? defaultEnd

  // ★ 陈先生需求 #2：所有"至今"派任 → 100% 对齐蓝色「今天」竖线末端
  //   根因：没有 endDate 的派任 end=Date.now() 精确到毫秒，markLine 锚点也是 Date.now()
  //   但 ECharts time axis 的 encode bar 末端会自动被网格切 1 两像素（clip:false 仍然如此），
  //   所以这里 xAxis.max 主动给「max(原max, now) + 3 天」，保证 today 竖线位置 ≠ 画布右边缘，
  //   bar 末端就能完整、正确对齐到今天竖线，不会差一点点距离。
  // ★ v0840 关键修复：xAxis.max 给 +5天 冗余（之前+3天不够，bar endFinal=nowTs+12h 需要更多右侧空间）
  //   确保 bar 右端(今天下午6点) 100% 可见，不被 xAxis 边缘截断
  const xAxisMax = Math.max(tr.max, now) + 5 * DAY_MS
  const xAxisMin = tr.min

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const id = params?.data?._assignmentId
        const a = id ? assignmentMap.value.get(id) : null
        if (!a) return ''
        const shipName = a.ship?.cnShipName || safeShips.value.find((s) => s.id === a.shipId)?.cnShipName || '-'
        const officer = a.user?.realName || a.ship?.politicalOfficerName || '未指派'
        // ★ v0830 hover tooltip 状态判定：只有明确ended才算历史，其他一律在任
        const statusRaw = (a.status || '').toLowerCase()
        const ENDED_SET = new Set(['ended', 'offboard', '下船', '离职', '离船', '已下船', '已离船'])
        const hasEnded = ENDED_SET.has(statusRaw)
        const isOnBoard = !hasEnded && statusRaw !== 'leave'
        const days = hasEnded && a.endDate
          ? getDaysOnBoard(a.startDate, a.endDate)
          : getDaysOnBoard(a.startDate, null)
        const statusLabel = isOnBoard
          ? `<span style="color:#27ae60;font-weight:600;">🟢 在任（至今）</span>`
          : statusRaw === 'leave'
            ? `<span style="color:#909399;font-weight:600;">⚪ 休假中</span>`
            : `<span style="color:#909399;font-weight:600;">⚪ 已下船</span>`
        return `<div style="font-weight:600;margin-bottom:4px;">${officer}</div>
          <div>状态：${statusLabel}</div>
          <div>船舶：${shipName}</div>
          <div>上船日期：${formatDate(a.startDate)}</div>
          <div>下船日期：${a.endDate ? formatDate(a.endDate) : '至今'}</div>
          <div>在船天数：${days} 天</div>`
      },
    },
    grid: {
      // ★ v0807i containLabel=false（经验 935613：上下两图必须固定 grid.left/right，避免自适应差异造成错位）
      //   左侧 Y 轴 label 现在完全在 grid.left（=gridLeftRec）像素内绘制，gridLeftRec 已经
      //   预留了『最长船名 ×16 + 徽标 64 + padding 32』，足够所有 label+徽标。
      left: gridLeftRec,
      right: 40,
      top: 10,   // 主画布顶部不再画 xAxis（月份在冻结表头），只留 10px 小 padding
      bottom: 72, // 底部 xAxis（辅助刻度）+ dataZoom slider（20px）+ 间距
      containLabel: false,
    },
    // ★ 陈先生需求 #3：月份必须放在顶部 —— 但顶部月份刻度现在已经由「独立冻结表头 canvas」承担
    //   （经验 446971 冻结表头结构）。主画布 xAxis 只画底部的"辅助刻度"，方便上下对照。
    //   顶部 xAxis 画在 headerChartInstance 里（下方 buildHeaderOption 单独构造）
    xAxis: {
      type: 'time',
      min: xAxisMin,
      max: xAxisMax,
      position: 'bottom',
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { color: '#909399', hideOverlap: true, fontSize: 10 },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'category',
      data: yCategories.value,
      // ★ v0826 根因修复：船名与色条错位
      //   reversedShips = [船N, ..., 船1]（反转后的列表）
      //   HTML 图层 v-for idx=0=船N 在 top=GRID_TOP（顶部）
      //   ECharts inverse:false → data[0]=船N 在底部 → 和 HTML 完全相反！
      //   改为 inverse:true → data[0]=船N 也在顶部 → 和 HTML idx=0 完全一致
      inverse: true,
      // ★ v0816 船名+空缺徽标完全由独立HTML图层(z8>mask z6)绘制！彻底关闭canvas上的Y轴axisLabel/axisLine/axisTick
      //   - 关闭原因：之前 ECharts Y axisLabel 画在 canvas 的 0..grid.left 区域，
      //     但 DOM .y-axis-mask 也是宽 gridLeftRec 白底 z6 → 上层 DOM 直接盖死所有 canvas 像素
      //     → 陈先生就看到左侧大面积空白（船名被 mask 全部遮住）
      //   - splitArea / splitLine 保留（灰白交替行，方便横向扫色条对应船），interval=0每行都有
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false }, // 🔴 关键：Y 轴文字完全由 HTML 图层接管
      splitLine: { show: true, lineStyle: { color: '#f5f5f5' }, z: 0 },
      splitArea: {
        show: true,
        interval: 0,
        z: 0,
        areaStyle: { color: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)'] },
      },
      z: 1,
    },
    // ★ v0824 陈先生要求：滑块移到顶部冻结表头（所有船的上方），主图不再放 slider
    //   滑块只在 buildHeaderOption 里声明一个，通过 dataZoom 事件双向同步。
    dataZoom: [],
    // ★ v0842 终极根因修复（陈先生反复反馈「所有船的进度条到上船日就截止、右侧空荡」）
    //   真实根因：ECharts 5.5 的 type:'bar' 在 time axis + encode{x:[1,2]} 下
    //   不会渲染成「区间柱」（从 start 到 end），而是把 value[1] 当成 bar 的单值，
    //   从 xAxis.min 堆叠画到 value[1]（=startDate）。
    //   像素扫描铁证：bar 左端=xAxisMin(120px 时间轴起点)，右端≈startDate 像素，
    //   endFinal(今天)对应的像素根本没画到。调试面板 endFinal=08-09 是对的，
    //   纯粹是 ECharts bar 不支持区间渲染。
    //   → 改用 type:'custom' + renderItem，用 api.coord 显式画矩形从 startFinal 到 endFinal，
    //     100% 精确控制色条起止，彻底绕开 ECharts bar 的区间语义缺陷。
    series: [
      {
        name: '政委任职',
        type: 'custom',
        encode: { x: [1, 2], y: 0 },
        data: bars,
        clip: false,
        z: 2,
        renderItem: (params: any, api: any) => {
          const yIdx = api.value(0)
          const startTs = api.value(1)
          const endTs = api.value(2)
          if (startTs == null || endTs == null || isNaN(startTs) || isNaN(endTs)) return
          const sp = api.coord([startTs, yIdx])
          const ep = api.coord([endTs, yIdx])
          if (!sp || !ep) return
          const barH = 26
          const x0 = sp[0]
          const y0 = sp[1] - barH / 2
          const w = Math.max(2, ep[0] - sp[0])
          const d = params.data
          const color = d?.itemStyle?.color || '#67c23a'
          const opa = d?.itemStyle?.opacity ?? 1
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
          const children: any[] = [
            {
              type: 'rect',
              shape: { x: x0, y: y0, width: w, height: barH, r: [3, 3, 3, 3] },
              style: { fill: color, opacity: opa },
            },
          ]
          // label：色条内部左侧白色文字（复用原 _labelText + 手机端压缩逻辑）
          let txt = String(d?._labelText || '')
          if (txt) {
            if (isMobile) {
              txt = txt
                .replace(/（/g, '(').replace(/）/g, ')')
                .replace(/\d{4}-\d{2}-(\d{2})/g, '$1')
                .replace(/(\d{2})~(\d{2}-\d{2})/g, '$1→$2')
                .replace(/→至今/g, '至今')
            }
            children.push({
              type: 'text',
              style: {
                text: txt,
                x: x0 + (isMobile ? 6 : 10),
                y: sp[1],
                fill: '#ffffff',
                fontSize: isMobile ? 10 : 11,
                fontWeight: 500,
                textVerticalAlign: 'middle',
                textAlign: 'left',
                overflow: 'truncate',
                textWidth: Math.max(0, w - (isMobile ? 12 : 20)),
              },
            })
          }
          return { type: 'group', children }
        },
      },
      {
        // 独立的今天线 markLine：custom series 不支持 markLine，用空 line series 承载
        name: '今天线',
        type: 'line',
        data: [],
        z: 3,
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          label: { formatter: '今天', position: 'end', color: '#409eff', fontSize: 11 },
          lineStyle: { color: '#409eff', type: 'solid', width: 2.5 },
          data: [{ xAxis: now }],
        },
      },
    ],
  }
}

// v0807i 独立冻结表头的 option：与主 buildOption 共享 grid.left/right、xAxis min/max、dataZoom 范围
// 经验 935613：两图同轴同域同边距，才能像素级对齐月份刻度。
function buildHeaderOption() {
  const tr = timeRange.value
  // ★ v0819 冻结表头统一读 nowTs ref（和 buildOption、ganttBars 相同毫秒）
  const now = nowTs.value
  const defaultStart = now - 540 * DAY_MS
  const defaultEnd = now + 60 * DAY_MS
  const names = yCategories.value
  let maxLen = 0
  for (const n of names) maxLen = Math.max(maxLen, String(n || '').length)
  // ★ v0824 冻结表头 grid.left 和主图、computed 完全一致：14px/字+徽标40+padding24，下限120，上限240
  const gridLeftRec = Math.max(Math.min(maxLen * 14 + 40 + 24, 240), 120)
  // ★ v0840 冻结表头 xAxis.max 也 +5天 冗余（与主图一致）
  const xAxisMax = Math.max(tr.max, now) + 5 * DAY_MS
  const xAxisMin = tr.min
  const curStartValue = dzRange.value?.startValue ?? defaultStart
  const curEndValue = dzRange.value?.endValue ?? defaultEnd

  return {
    grid: {
      left: gridLeftRec,  // 必须和主 buildOption 完全一致
      right: 40,          // 同上
      top: 10,
      // ★ v0824 滑块移到顶部（bottom=16→50）：grid.bottom = 月份label底 + dataZoom滑块(30px)
      bottom: 50,
      containLabel: false,
    },
    xAxis: {
      type: 'time',
      min: xAxisMin,
      max: xAxisMax,
      position: 'top', // ★ 陈先生需求 #3：月份（年份-月份刻度）放在顶部
      axisLine: { show: true, lineStyle: { color: '#c0c4cc' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#303133',
        fontSize: 11,
        hideOverlap: true,
        // ★ 顶部月份格式 yyyy-MM，Excel 冻结标题行效果，滚动时顶部始终显示
        formatter: ((val: any) => {
          const d = new Date(val)
          if (isNaN(d.getTime())) return ''
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }) as any,
      },
      splitLine: { show: true, lineStyle: { color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'category',
      data: ['__header_placeholder__'], // 只有一个占位类别，yAxis 不显示任何东西
      show: false,
    },
    dataZoom: [
      // ★ v0824 陈先生要求：滑块移到顶部冻结表头（所有船的上方），放月份下面、日期上面。
      //   高度30px，位置 grid.bottom=50 → 视觉在月份label下面紧贴，可左右拖动。
      {
        type: 'slider',
        xAxisIndex: 0,
        startValue: curStartValue,
        endValue: curEndValue,
        height: 26,
        bottom: 10,
        borderColor: '#dcdfe6',
        brushSelect: false,
        handleIcon: 'M10.7,11.9H9.3c-0.2,0-0.4-0.1-0.5-0.2L4.7,7.5C4.6,7.3,4.6,7.1,4.7,7c0.1-0.1,0.2-0.2,0.4-0.2l4.1-4.1C8.9,2.6,9.1,2.5,9.3,2.5 h1.4c0.2,0,0.4,0.1,0.5,0.2l4.1,4.1c0.1,0.1,0.2,0.2,0.2,0.4s-0.1,0.3-0.2,0.4l-4.1,4.1C11.1,11.8,10.9,11.9,10.7,11.9z',
        handleStyle: { color: '#409eff' },
        textStyle: { color: '#606266', fontSize: 10 },
      },
    ],
    series: [
      // 不画任何数据，只画顶部时间轴 + 蓝色今天 markLine
      {
        type: 'bar',
        data: [],
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          label: { formatter: '今天', position: 'end', color: '#409eff', fontSize: 11 },
          lineStyle: { color: '#409eff', type: 'solid', width: 2.5 }, // ★ v0824 和主图 markLine 100%相同宽度/颜色
          data: [{ xAxis: now }], // 同一 nowTs → 和主图今天线像素级重叠
        },
      },
    ],
  }
}

function applyOption() {
  if (!chartInstance) return
  const opt = buildOption()
  chartInstance.setOption(opt, true)
  // v0807i：冻结表头也需要同步刷新（船名/派任变化 → min/max/grid.left 可能变）
  if (headerChartInstance) {
    headerChartInstance.setOption(buildHeaderOption(), true)
  }
}

function syncAll() {
  // 保证 resize 时两个 canvas 都 resize + option 重新对齐（经验 935613：不同尺寸不同刻度就会错位）
  if (chartInstance) {
    chartInstance.resize()
    chartInstance.setOption(buildOption(), false)
  }
  if (headerChartInstance) {
    headerChartInstance.resize()
    headerChartInstance.setOption(buildHeaderOption(), false)
  }
}

// 初始化冻结表头 echarts 实例（与主画布同生命周期）
function initHeaderChart() {
  if (typeof document === 'undefined' || !echartsModule || headerChartInstance) return
  const el = document.getElementById(headerCanvasUniqueId) as HTMLElement | null
  if (!el) return
  try {
    headerChartInstance = (echartsModule as any).init(el)
    headerChartInstance.setOption(buildHeaderOption(), true)
    debugInfo.value = { ...(debugInfo.value || {}), headerChart: '✅ OK' }
  } catch (e: any) {
    const errStr = (e && (e.stack || e.message)) || String(e)
    console.error('[StaffGanttChart] header echarts.init failed:', e)
    debugInfo.value = { ...(debugInfo.value || {}), headerChart: '❌ ' + errStr.slice(0, 120) }
  }
}

// ★ v0824 双向同步：滑块现在在顶部冻结表头（headerChartInstance）里！
//   用户拖动顶部滑块 → 监听 headerChartInstance 的 dataZoom 事件 → 同步 dzRange → 再同步主图 xAxis min/max
function bindChartEvents() {
  // 点击甘特图条：保持原有业务跳转
  if (chartInstance) {
    chartInstance.off('click')
    chartInstance.on('click', handleChartClick)
  }
  // 顶部滑块的 dataZoom 事件：拖动滑块时同步主图时间范围
  if (headerChartInstance) {
    headerChartInstance.off('dataZoom')
    headerChartInstance.on('dataZoom', () => {
      const hOpt = headerChartInstance.getOption()
      const dz = (hOpt?.dataZoom || [])[0] || {}
      const sv = Number(dz.startValue) || 0
      const ev = Number(dz.endValue) || 0
      if (!(sv > 0 && ev > sv)) return
      dzRange.value = { startValue: sv, endValue: ev }
      // 同步到主图 xAxis min/max（主图没有 dataZoom，直接 set xAxis）
      if (chartInstance) {
        chartInstance.setOption({ xAxis: { min: sv, max: ev } }, false)
      }
    })
  }
}

// ★ 已移除 chartDomRef 的 watch：现在不依赖 ref，用 getElementById 直接定位
//    元素渲染完成后，initChart 的定时重试一定能拿到真实 HTMLElement

watch([safeShips, safeAssignments], () => {
  nextTick(() => applyOption())
}, { deep: true })

watch(chartHeight, () => {
  nextTick(() => syncAll())
})

let barClickFlag = false

function handleChartClick(params: any) {
  // ★ v0845 排查 custom series 点击：custom series 的 click 事件 params.data
  //   应为 series.data[dataIndex]（含 _assignmentId）。加日志便于定位"卡片跳不出来"。
  console.log('[gantt-click v0845]', { componentType: params?.componentType, seriesType: params?.seriesType, dataIndex: params?.dataIndex, hasData: !!params?.data, hasId: !!params?.data?._assignmentId })
  // custom series：params.data 即原始数据项；兼容 data 可能在 params.data.value 的情况
  let id = params?.data?._assignmentId
  // 兜底：若 params.data 缺失，尝试用 dataIndex 从 ganttBars 取
  if (!id && typeof params?.dataIndex === 'number') {
    const bar = ganttBars.value[params.dataIndex]
    id = bar?._assignmentId
    console.log('[gantt-click v0845] fallback dataIndex→bar', { dataIndex: params.dataIndex, foundId: id })
  }
  if (!id) return
  const assignment = assignmentMap.value.get(id)
  if (!assignment) return
  barClickFlag = true
  // ★ v0822 健壮的 popover 定位：ECharts 5.x click 事件 params.event.event 是原生 MouseEvent
  //   但不同版本/平台可能没有 .event.event，兜底用 chart DOM 中心坐标
  const nativeEvent = params?.event?.event
  let realEvent: MouseEvent
  if (nativeEvent && typeof nativeEvent.clientX === 'number') {
    realEvent = nativeEvent
  } else {
    // 兜底：用 canvas DOM 的 bounding rect 中心
    const el = document.getElementById(canvasUniqueId)
    const rect = el?.getBoundingClientRect()
    realEvent = {
      clientX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      clientY: rect ? rect.top + 60 : window.innerHeight / 2,
    } as MouseEvent
  }
  emit('bar-click', { assignment: assignment as unknown as StaffAssignment, event: realEvent })
}

let retryTimer: any = null

onMounted(() => {
  // ★ 只保留一条稳定的重试路径：setInterval 每 300ms 串行尝试
  //    之前的多条 setTimeout（立即/200/600/1200/2000/3000）会和 setInterval 的
  //    触发时间重叠、再和 initRunning 锁交互，导致"都认为在执行中都跳过"的问题
  //    ——现在只在开头立即触发 1 次 initChart()，其余全部交给 setInterval 有序调度。
  initChart()
  // 主画布 init 成功之后，表头也同步初始化（可能延迟到下一轮 setInterval，没关系）
  initHeaderChart()
  window.addEventListener('resize', syncAll)

  // 持续重试兜底：每 300ms 重试一次，共 60 次 = 18 秒（比之前多给 6 秒时间余地）
  let retryCount = 0
  const MAX_RETRY = 60
  retryTimer = setInterval(() => {
    retryCount++
    const chartOk = !!(chartInstance && inited)
    const headerOk = !!headerChartInstance
    if (chartOk && headerOk) {
      // 两个画布都初始化成功 → 绑事件 + applyOption 保证第一次数据对齐
      bindChartEvents()
      applyOption()
      if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
      return
    }
    if (!chartOk) initChart()
    if (!headerOk) initHeaderChart()
    if (retryCount >= MAX_RETRY) {
      if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
      debugInfo.value = {
        ...debugInfo.value,
        init: `❌ 重试已耗尽（${MAX_RETRY} 次 × 300ms）` + (lastFatalError.value ? '' : '，请检查浏览器控制台是否有其他错误（按 F12 → Console）'),
        error: lastFatalError.value || debugInfo.value.error || '请检查浏览器控制台是否有其他错误（按 F12 → Console）',
      }
      // ★ v0807m 陈先生手机端必须看到：init 失败永久可见告警（红色条），不用再进 debug panel
      //   分情况写清楚：如果 header 也失败，用户一看就知道"月份冻结标题也没有了"
      const ok = !!(chartInstance && inited)
      const headerOk = !!headerChartInstance
      if (!ok || !headerOk) {
        initFatalAlert.value = [
          !ok ? '甘特图主图初始化失败' : null,
          !headerOk ? '顶部月份冻结标题初始化失败（请下拉刷新，若仍失败请点【🔧强制刷新服务端】+ 再刷新）' : null,
          lastFatalError.value ? ('原因：' + lastFatalError.value.slice(0, 60)) : null,
        ].filter(Boolean).join('；') || '初始化未完成，请下拉刷新页面再试'
      }
      return
    }
  }, 300)
})

onBeforeUnmount(() => {
  if (retryTimer) { clearInterval(retryTimer); retryTimer = null }
  window.removeEventListener('resize', syncAll)
  chartInstance?.dispose()
  chartInstance = null
  headerChartInstance?.dispose()
  headerChartInstance = null
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
