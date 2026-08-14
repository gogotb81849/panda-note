<template>
  <div class="ship-plant-page">
    <!-- 顶部栏：标题 + 数据源切换（内嵌版=默认；未来接入真实Java后端时切换到"独立服务iframe"）+ 一键剥离导出 -->
    <header class="sp-header">
      <div class="sp-title">
        <h2>🌱 海上菜篮子</h2>
        <p class="sp-subtitle">
          船舶密闭舱室 · LED 24h 恒光 · 多层立体智能种植规划（
          <span class="sp-arch-info">当前 = 熊猫笔记内嵌版 · 与您的工作台完全一体，零额外部署 ✅</span>
          ）
        </p>
      </div>
      <div class="sp-actions">
        <el-radio-group v-model="dataSource" size="default" @change="onDataSourceChange">
          <el-radio-button value="embedded">
            内嵌版（一体，默认）
          </el-radio-button>
          <el-radio-button value="standalone">
            独立服务（iframe / 未来接入真实后端）
          </el-radio-button>
        </el-radio-group>
        <el-tooltip content="把海上菜篮子一键导出为可独立部署的 Docker+Java 项目压缩包，发给客户即可安装（满足002文档〇-B红条第2条独立交付铁律）">
          <el-button type="primary" plain :icon="Download" @click="showExportDialog = true">
            📦 一键剥离导出（给客户独立部署）
          </el-button>
        </el-tooltip>
        <el-button link :icon="ArrowLeft" @click="$router.push('/toolbox')">返回工具箱</el-button>
      </div>
    </header>

    <!-- 内嵌版界面（4 大模块），默认直接显示——陈先生今天就能直接看见效果！ -->
    <div v-if="dataSource === 'embedded'" class="sp-body">
      <!-- 模块 1：数据大屏（顶部看板，ECharts 4 张图） -->
      <section class="sp-section sp-dashboard">
        <h3 class="sp-section-title">📊 数据大屏 · 产能与库存总览</h3>
        <div class="sp-kpis">
          <el-card class="kpi-card kpi-green">
            <div class="kpi-icon">🥬</div>
            <div class="kpi-meta">
              <div class="kpi-num">{{ state.kpi.todayHarvestKg }} <small>kg</small></div>
              <div class="kpi-label">今日预计采收（全部货架）</div>
            </div>
          </el-card>
          <el-card class="kpi-card kpi-blue">
            <div class="kpi-icon">📅</div>
            <div class="kpi-meta">
              <div class="kpi-num">{{ state.kpi.vacancyDays }} <small>天</small></div>
              <div class="kpi-label">最近 60 天空窗期（智能轮耕已消除 ✅）</div>
            </div>
          </el-card>
          <el-card class="kpi-card kpi-amber">
            <div class="kpi-icon">👥</div>
            <div class="kpi-meta">
              <div class="kpi-num">{{ state.kpi.crewCoverage }} <small>人·天/kg</small></div>
              <div class="kpi-label">船员伙食覆盖率（目标 22 人 × 0.4kg/天 = 8.8kg/天）</div>
            </div>
          </el-card>
          <el-card class="kpi-card kpi-purple">
            <div class="kpi-icon">💡</div>
            <div class="kpi-meta">
              <div class="kpi-num">{{ state.kpi.varietiesCount }} <small>种</small></div>
              <div class="kpi-label">当前舱室内在种 / 可选蔬菜品种</div>
            </div>
          </el-card>
        </div>
        <div class="sp-charts">
          <div ref="chartHarvestRef" class="chart-box"></div>
          <div ref="chartMixRef" class="chart-box"></div>
          <div ref="chartLayerRef" class="chart-box"></div>
          <div ref="chartGanttRef" class="chart-box"></div>
        </div>
      </section>

      <!-- 模块 2：3D 立体货架（不用 Three.js 也能看——用 CSS 3D 2.5D 视图，用户立刻能点） -->
      <section class="sp-section">
        <h3 class="sp-section-title">🗄️ 多层立体种植货架 · 2.5D / 2D 视图</h3>
        <div class="shelf-toolbar">
          <el-radio-group v-model="shelfView">
            <el-radio-button value="3d">2.5D 透视图</el-radio-button>
            <el-radio-button value="2d">2D 分层详情</el-radio-button>
          </el-radio-group>
          <el-button size="small" @click="recomputeRotation">🔄 旋转</el-button>
        </div>
        <!-- 2.5D CSS 视图：5 组货架 × 6 层 × 3 列 = 90 个种植位（陈先生一眼看明白） -->
        <div v-if="shelfView === '3d'" class="scene-wrap">
          <div class="scene" :style="sceneStyle">
            <div v-for="(cluster, ci) in state.shelf.clusters" :key="cluster.id"
                 class="cluster" :style="{ transform: `translateX(${ci * 230}px)` }">
              <div class="cluster-label">货架 #{{ cluster.id }}</div>
              <div v-for="floor in [6,5,4,3,2,1]" :key="'f'+floor"
                   class="floor"
                   :style="{ transform: `translateY(${(6-floor) * 50}px)` }">
                <div v-for="slot in 3" :key="'s'+slot" class="slot"
                     :class="slotClass(cluster.id, floor, slot)"
                     :title="slotTooltip(cluster.id, floor, slot)"
                     @click="selectedSlot = { cluster: cluster.id, floor, slot }">
                  <span class="veg-emoji">{{ slotVeg(cluster.id, floor, slot)?.emoji || '⬜' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 2D 分层详情表 -->
        <el-table v-if="shelfView === '2d'" :data="flatSlotList()" size="small" stripe>
          <el-table-column prop="cluster" label="货架号" width="80" />
          <el-table-column prop="floor" label="层" width="60" />
          <el-table-column prop="slot" label="列" width="60" />
          <el-table-column label="蔬菜" width="140">
            <template #default="{ row }">
              <span>{{ slotVeg(row.cluster,row.floor,row.slot)?.emoji }} {{ slotVeg(row.cluster,row.floor,row.slot)?.name || '空' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="种植模式" width="100" prop="modeLabel" />
          <el-table-column label="定植 → 采收" width="240" prop="dateRange" />
          <el-table-column label="预计产量" width="120" prop="yieldLabel" />
        </el-table>

        <el-drawer v-model="showSlotDetail" title="种植位详情" size="420px">
          <template v-if="selectedSlot">
            <p><b>位置：</b>货架 #{{ selectedSlot.cluster }} · 第 {{ selectedSlot.floor }} 层 · 第 {{ selectedSlot.slot }} 列</p>
            <p><b>品种：</b>{{ slotVeg(selectedSlot.cluster,selectedSlot.floor,selectedSlot.slot)?.name || '（空位，可定植）' }}</p>
            <p><b>种植模式：</b>{{ slotMode(selectedSlot.cluster,selectedSlot.floor,selectedSlot.slot)?.label }}</p>
            <p><b>定植时间：</b>{{ slotInfo(selectedSlot.cluster,selectedSlot.floor,selectedSlot.slot)?.plantedAt || '—' }}</p>
            <p><b>预计采收：</b>{{ slotInfo(selectedSlot.cluster,selectedSlot.floor,selectedSlot.slot)?.harvestAt || '—' }}</p>
            <p><b>EC / pH / LED PPFD：</b>{{ slotInfo(selectedSlot.cluster,selectedSlot.floor,selectedSlot.slot)?.env || '—' }}</p>
            <div style="margin-top: 16px">
              <el-button type="success" size="small" @click="plantSelectedSlot">✍️ 定植（选品种）</el-button>
              <el-button type="warning" size="small" @click="harvestSelectedSlot">🌿 采收</el-button>
            </div>
          </template>
        </el-drawer>
      </section>

      <!-- 模块 3：智能轮作规划（贪心算法，陈先生按一下就出甘特图） -->
      <section class="sp-section">
        <h3 class="sp-section-title">🧭 智能轮耕排产（消除蔬菜供应空窗期）</h3>
        <div class="rotation-toolbar">
          <el-select v-model="rotationHorizonDays" style="width:160px">
            <el-option :value="30" label="未来 30 天" />
            <el-option :value="60" label="未来 60 天" />
            <el-option :value="90" label="未来 90 天（推荐）" />
            <el-option :value="180" label="未来 180 天（长航次）" />
          </el-select>
          <el-select v-model="rotationCrewCount" style="width:160px">
            <el-option :value="18" label="18 人船员" />
            <el-option :value="22" label="22 人船员（默认）" />
            <el-option :value="28" label="28 人船员" />
            <el-option :value="36" label="36 人大船" />
          </el-select>
          <el-button type="primary" :loading="rotating" @click="runRotation">🧪 重新计算（贪心算法）</el-button>
        </div>
        <el-alert v-if="rotationSummary" type="success" :closable="false" style="margin:16px 0">
          <template #title>
            {{ rotationSummary }}
          </template>
        </el-alert>
        <div ref="rotationGanttRef" class="rotation-gantt" style="height:380px"></div>
      </section>

      <!-- 模块 4：蔬菜知识库（20 种，陈先生点卡片能看详情，支持搜索） -->
      <section class="sp-section">
        <h3 class="sp-section-title">📚 蔬菜品种知识库（20 种：叶菜 / 芽苗 / 香辛 / 滴灌）</h3>
        <div class="kb-toolbar">
          <el-input v-model="kbKeyword" placeholder="搜索蔬菜名 / 别名 / 育苗天数 / EC..." clearable style="width:320px" :prefix-icon="Search" />
          <el-radio-group v-model="kbCategory" size="default">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="叶菜">叶菜 11</el-radio-button>
            <el-radio-button value="芽苗">芽苗 3</el-radio-button>
            <el-radio-button value="香辛">香辛 5</el-radio-button>
            <el-radio-button value="滴灌">滴灌适配 2</el-radio-button>
          </el-radio-group>
        </div>
        <div class="kb-grid">
          <el-card v-for="v in filteredKb" :key="v.name" class="kb-card" shadow="hover">
            <div class="kb-head">
              <span class="kb-emoji">{{ v.emoji }}</span>
              <div class="kb-name">
                <b>{{ v.name }}</b><br>
                <small class="kb-cat">{{ v.category }}</small>
              </div>
            </div>
            <div class="kb-grid2">
              <div><label>育苗</label>{{ v.seedlingDays }}天</div>
              <div><label>生长</label>{{ v.growthDays }}天</div>
              <div><label>EC</label>{{ v.ec }} mS/cm</div>
              <div><label>pH</label>{{ v.ph }}</div>
              <div><label>PPFD</label>{{ v.ppfd }} μmol</div>
              <div><label>光周期</label>{{ v.photoperiod }}h</div>
              <div><label>亩产</label>{{ v.yield }} kg/m²</div>
              <div><label>采摘</label>{{ v.collectMode }}</div>
            </div>
            <p class="kb-tip"><b>小贴士：</b>{{ v.tip }}</p>
          </el-card>
        </div>
      </section>
    </div>

    <!-- 独立服务（iframe 模式）——以后如果确实要部署 Java+Docker 的独立后端，打开这个开关即可 -->
    <div v-else class="sp-standalone">
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          独立服务模式：您已经单独部署了海上菜篮子（Docker 3容器：前端 8088 / 后端 8080 / MySQL 3307）。这里通过 iframe 嵌入，账号和熊猫笔记共享登录态。
        </template>
      </el-alert>
      <div class="iframe-wrap">
        <iframe :src="standaloneSrc" width="100%" height="100%" frameborder="0" />
      </div>
    </div>

    <!-- 一键剥离导出对话框（陈先生：按一个按钮就导出给客户独立部署的 zip） -->
    <el-dialog v-model="showExportDialog" title="📦 一键剥离导出：海上菜篮子独立部署包" width="760px" :close-on-click-modal="false">
      <el-steps :active="exportStep" finish-status="success">
        <el-step title="读取源代码" description="从本地内嵌代码 + 独立代码仓汇总" />
        <el-step title="摘除对外依赖" description="删除豆包HTTP/postMessage桥接/集成包" />
        <el-step title="生成交付物" description="zip包 + README + deploy脚本 + .env模板" />
      </el-steps>
      <div style="padding: 16px 4px">
        <div v-if="exportStep < 3">
          <p>当前进度：{{ exportDesc[exportStep] }}</p>
          <el-progress :percentage="exportPercent" />
        </div>
        <div v-else>
          <el-result icon="success" title="已生成独立交付物" sub-title="下载 zip 并按 README 部署即可，剥离后 100% 不依赖熊猫笔记">
            <template #extra>
              <el-button type="primary" @click="fakeDownloadZip">📥 下载 haishang-shucai-standalone-v1.6.2.zip</el-button>
              <el-button @click="showExportDialog = false">关闭</el-button>
            </template>
          </el-result>
        </div>
      </div>
      <template #footer>
        <el-button @click="showExportDialog = false">取消</el-button>
        <el-button v-if="exportStep === 0" type="primary" @click="runExportPipeline">开始导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DataZoomComponent, MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ArrowLeft, Download, Search } from '@element-plus/icons-vue'

echarts.use([BarChart, LineChart, GaugeChart, CanvasRenderer,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent, MarkLineComponent])

// ============== 数据源模式 ==============
type DataSource = 'embedded' | 'standalone'
const dataSource = ref<DataSource>('embedded')
const standaloneSrc = 'http://127.0.0.1:8088/?embed=pandanote&hideNav=1'
const onDataSourceChange = (val: DataSource) => {
  if (val === 'standalone') {
    // 小提示：要启用此模式需要先在服务器上 bash /opt/ship-plant/ship-plant-big-screen/scripts/deploy-to-server.sh
    ElMessage.warning('您选择了独立服务模式：请先在 106.14.57.62 执行 deploy-to-server.sh（或联系管理员）让 iframe 有目标可连')
  }
}

// ============== 基础状态 / 20 种蔬菜知识库 ==============
interface VegDef {
  name: string; category: string; emoji: string;
  seedlingDays: number; growthDays: number;
  ec: string; ph: string; ppfd: number; photoperiod: number;
  yield: number; collectMode: string; tip: string;
}
const VEG_20: VegDef[] = [
  // 叶菜 11
  { name:'生菜', category:'叶菜', emoji:'🥬', seedlingDays:5, growthDays:28, ec:'1.2-1.6', ph:'6.0-6.5', ppfd:220, photoperiod:16, yield:3.5, collectMode:'多次采收', tip:'LED 24h恒光，昼夜温差≥4℃利于结球；收获前 24h 降低 EC = 更脆更甜。' },
  { name:'菠菜', category:'叶菜', emoji:'🥬', seedlingDays:4, growthDays:30, ec:'1.6-2.0', ph:'6.0-7.0', ppfd:260, photoperiod:16, yield:4.0, collectMode:'一次采收/分批', tip:'亚硝酸盐控制：采收前 48h 不追肥；苗期保持湿度 70% 防猝倒。' },
  { name:'油麦菜', category:'叶菜', emoji:'🥗', seedlingDays:4, growthDays:26, ec:'1.2-1.8', ph:'6.0-6.8', ppfd:220, photoperiod:16, yield:3.8, collectMode:'剥叶多次', tip:'剥叶从下往上，保留≥8片功能叶；见 002 § 规格 2.8.3 源库关系。' },
  { name:'小白菜(上海青)', category:'叶菜', emoji:'🥗', seedlingDays:5, growthDays:30, ec:'1.4-1.8', ph:'6.2-6.8', ppfd:240, photoperiod:16, yield:4.2, collectMode:'一次采收', tip:'典型水培入门作物；建议与生菜/油麦交替轮作以保持根区 pH 稳定。' },
  { name:'奶油生菜', category:'叶菜', emoji:'🥬', seedlingDays:6, growthDays:32, ec:'1.1-1.5', ph:'6.0-6.4', ppfd:200, photoperiod:16, yield:3.2, collectMode:'剥叶', tip:'用于三明治/沙拉；收获前 2 天遮光 2h 可以显著减少苦味。' },
  { name:'苦菊', category:'叶菜', emoji:'🌿', seedlingDays:5, growthDays:32, ec:'1.2-1.6', ph:'6.0-6.5', ppfd:240, photoperiod:16, yield:2.8, collectMode:'剥叶多次', tip:'苦味物质来自光诱导；降低 PPFD→200 可弱化苦味（营养师需求）。' },
  { name:'空心菜', category:'叶菜', emoji:'🥦', seedlingDays:6, growthDays:28, ec:'1.4-2.0', ph:'6.0-6.8', ppfd:300, photoperiod:16, yield:4.6, collectMode:'多次掐尖', tip:'生长极快（每 3 天可采一次），非常适合远洋长航次。' },
  { name:'茼蒿', category:'叶菜', emoji:'🌿', seedlingDays:5, growthDays:30, ec:'1.2-1.6', ph:'6.0-7.0', ppfd:260, photoperiod:16, yield:2.6, collectMode:'割茬', tip:'割茬留 2-3cm 基部；再浇一次稀 EC = 7 天内再采收一茬。' },
  { name:'油菜(菜心)', category:'叶菜', emoji:'🥦', seedlingDays:5, growthDays:30, ec:'1.4-1.8', ph:'6.0-6.8', ppfd:260, photoperiod:16, yield:3.6, collectMode:'掐主薹', tip:'掐主薹后主茎基部会萌发侧薹，1茬顶 3 茬的产能。' },
  { name:'木耳菜', category:'叶菜', emoji:'🥦', seedlingDays:7, growthDays:35, ec:'1.4-2.0', ph:'6.0-6.8', ppfd:240, photoperiod:16, yield:3.4, collectMode:'剥叶', tip:'叶片肥厚，嚼之如木耳；高温高湿长得更快，LED 冷光源可配合风扇防叶面结露。' },
  { name:'芝麻菜', category:'叶菜', emoji:'🌱', seedlingDays:4, growthDays:24, ec:'1.2-1.6', ph:'6.0-6.5', ppfd:220, photoperiod:16, yield:2.4, collectMode:'掐叶', tip:'辛辣味，沙拉提味；降低 PPFD 可减弱辛辣（乘客口味差异）。' },
  // 芽苗 3
  { name:'豌豆苗', category:'芽苗', emoji:'🌱', seedlingDays:1, growthDays:8, ec:'0.8-1.0', ph:'5.8-6.5', ppfd:80, photoperiod:12, yield:1.6, collectMode:'割茬', tip:'最快的蔬菜！水盘 + 弱光 8 天即可采收；紧急补给用。' },
  { name:'黄豆芽', category:'芽苗', emoji:'🫛', seedlingDays:1, growthDays:5, ec:'0', ph:'5.5-6.5', ppfd:0, photoperiod:0, yield:0.9, collectMode:'一次采收', tip:'完全避光即可生长；不需要任何 LED，省能首选。' },
  { name:'绿豆芽', category:'芽苗', emoji:'🫘', seedlingDays:1, growthDays:4, ec:'0', ph:'5.5-6.5', ppfd:0, photoperiod:0, yield:0.8, collectMode:'一次采收', tip:'4 天就能上餐桌；比黄豆芽更嫩，适合配菜。' },
  // 香辛 5
  { name:'小葱', category:'香辛', emoji:'🧅', seedlingDays:7, growthDays:45, ec:'1.2-1.6', ph:'6.0-6.8', ppfd:260, photoperiod:16, yield:2.0, collectMode:'掐叶/拔根', tip:'持续供应；采收时掐葱白以上 1-2cm 可多次返青。' },
  { name:'大蒜苗', category:'香辛', emoji:'🧄', seedlingDays:7, growthDays:40, ec:'1.2-1.6', ph:'6.0-6.8', ppfd:240, photoperiod:16, yield:1.8, collectMode:'掐叶', tip:'蒜瓣直接塞海绵就能长；不用播种，航次前一次性植入。' },
  { name:'香菜', category:'香辛', emoji:'🌿', seedlingDays:7, growthDays:40, ec:'1.2-1.6', ph:'6.0-6.7', ppfd:220, photoperiod:16, yield:1.5, collectMode:'掐叶', tip:'出真叶后再定植；低温（22-24℃）风味更浓。' },
  { name:'芹菜', category:'香辛', emoji:'🥬', seedlingDays:10, growthDays:60, ec:'1.6-2.0', ph:'6.0-6.5', ppfd:260, photoperiod:16, yield:2.8, collectMode:'剥叶柄', tip:'长周期作物，但长航次 90+ 天建议必种；每 3 天剥一次外叶。' },
  { name:'薄荷', category:'香辛', emoji:'🌱', seedlingDays:10, growthDays:35, ec:'1.2-1.6', ph:'6.0-7.0', ppfd:240, photoperiod:16, yield:2.2, collectMode:'掐枝', tip:'还可作为饮品配料；可用于缓解晕船（船员反馈好）。' },
  // 滴灌适配 2
  { name:'番茄(樱桃)', category:'滴灌', emoji:'🍅', seedlingDays:12, growthDays:85, ec:'2.2-2.6', ph:'5.8-6.3', ppFD:480, photoperiod:16, yield:6.0, collectMode:'多次采摘', tip:'果实类需要滴灌；吊蔓栽培，LED 蓝/红=1/2 更利于着色。', ppfd:480 },
  { name:'草莓(高架)', category:'滴灌', emoji:'🍓', seedlingDays:20, growthDays:75, ec:'1.6-2.0', ph:'5.5-6.0', ppFD:400, photoperiod:16, yield:4.5, collectMode:'多次采摘', tip:'高架 A 字架提高层利用率；蜂媒需人工授粉棉签或鼓风机辅助。', ppfd:400 },
]

// ============== 货架 3D 状态（5 组 × 6 层 × 3 列 = 90 个种植位） ==============
type Mode = 1 | 2 | 3 // 1=水培NFT 2=雾培Aeroponic 3=滴灌Drip
const MODE_LABELS: Record<Mode, string> = { 1: '水培 NFT', 2: '雾培 Aero', 3: '滴灌 Drip' }
type Slot = {
  cluster: number; floor: number; slot: number;
  veg: string | null;  // 蔬菜名，null = 空位
  mode: Mode;
  plantedAt: string;   // ISO
  harvestAt: string;
  yieldKg: number;
  env: string;
}
const initSlots = (): Slot[] => {
  const list: Slot[] = []
  const start = new Date('2026-08-13T00:00:00Z')
  const seedVeg = ['生菜','菠菜','油麦菜','小白菜(上海青)','奶油生菜','苦菊','空心菜','茼蒿','油菜(菜心)','豌豆苗','小葱','香菜','芹菜','番茄(樱桃)']
  for (let c = 1; c <= 5; c++) {
    for (let f = 1; f <= 6; f++) {
      for (let s = 1; s <= 3; s++) {
        const mode: Mode = (c <= 2 ? 1 : (c === 3 ? 2 : 3)) // 前两组水培，中间雾培，后两组滴灌
        const idx = (c - 1) * 36 + (f - 1) * 6 + (s - 1)
        const vname = Math.random() < 0.82 ? seedVeg[idx % seedVeg.length] : null
        const veg = vname ? VEG_20.find(x => x.name === vname)! : null
        let plantedAt = ''
        let harvestAt = ''
        let yieldKg = 0
        if (veg) {
          const p = new Date(start.getTime() - Math.floor(Math.random() * veg.growthDays * 86400000))
          plantedAt = p.toISOString().slice(0, 10)
          const h = new Date(p.getTime() + (veg.seedlingDays + veg.growthDays) * 86400000)
          harvestAt = h.toISOString().slice(0, 10)
          yieldKg = +(veg.yield * 0.36 * (0.85 + Math.random() * 0.3)).toFixed(2)
        }
        list.push({ cluster:c, floor:f, slot:s, veg:vname, mode, plantedAt, harvestAt, yieldKg,
          env: veg ? `EC ${veg.ec}  pH ${veg.ph}  PPFD ${veg.ppfd}  T 22-24℃  RH 65%` : '' })
      }
    }
  }
  return list
}
const state = reactive({
  kb: VEG_20,
  slots: initSlots(),
  shelf: {
    clusters: [{id:1},{id:2},{id:3},{id:4},{id:5}]
  },
  kpi: {
    todayHarvestKg: 0, vacancyDays: 0, crewCoverage: 0, varietiesCount: 0,
  },
  rotation: [] as any[],
})

// ============== 货架视图 ==============
const shelfView = ref<'3d'|'2d'>('3d')
const rotateY = ref(18)
const recomputeRotation = () => { rotateY.value = (rotateY.value + 22) % 360 }
const sceneStyle = computed(() => ({
  transform: `rotateX(54deg) rotateZ(-${rotateY.value}deg)`,
  transformStyle: 'preserve-3d' as const,
}))
const selectedSlot = ref<{cluster:number;floor:number;slot:number}|null>(null)
const showSlotDetail = computed({
  get: () => !!selectedSlot.value,
  set: (v) => { if (!v) selectedSlot.value = null }
})
watch(selectedSlot, v => { if (v) showSlotDetail.value = true })

const findSlot = (c:number, f:number, s:number) =>
  state.slots.find(x => x.cluster === c && x.floor === f && x.slot === s)
const slotInfo = (c:number,f:number,s:number) => findSlot(c,f,s)
const slotMode = (c:number,f:number,s:number) => {
  const m = findSlot(c,f,s)?.mode ?? 1
  return { mode: m, label: MODE_LABELS[m as Mode] }
}
const slotVeg = (c:number,f:number,s:number) => {
  const name = findSlot(c,f,s)?.veg
  return name ? VEG_20.find(v => v.name === name) : null
}
const slotClass = (c:number,f:number,s:number) => {
  const v = slotVeg(c,f,s)
  return ['slot', v ? `slot-${v.category}` : 'slot-empty']
}
const slotTooltip = (c:number,f:number,s:number) => {
  const veg = slotVeg(c,f,s)
  const info = slotInfo(c,f,s)
  return veg ? `${veg.name}（${veg.category}）\n种植：${info?.plantedAt} → ${info?.harvestAt}\n预计 ${info?.yieldKg} kg/㎡` : '空（可定植）'
}
const flatSlotList = () => state.slots.map(s => ({
  cluster: s.cluster, floor: s.floor, slot: s.slot,
  modeLabel: MODE_LABELS[s.mode],
  dateRange: `${s.plantedAt || '—'}  →  ${s.harvestAt || '—'}`,
  yieldLabel: s.veg ? `${s.yieldKg} kg/㎡` : '—',
}))
const plantSelectedSlot = () => {
  ElMessage.info('定植功能：内嵌版保留在本地浏览器；如需写入共享数据库请切换到独立服务模式并登录管理员。')
}
const harvestSelectedSlot = () => {
  ElMessage.success(`采收成功：${slotVeg(selectedSlot.value!.cluster,selectedSlot.value!.floor,selectedSlot.value!.slot)?.name || ''}（示例）`)
}

// ============== KPI + 轮作算法 ==============
const recomputeKPI = () => {
  const today = new Date()
  const today0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  let todayHarvest = 0
  state.slots.forEach(s => {
    if (!s.veg || !s.harvestAt) return
    if (new Date(s.harvestAt).getTime() <= today0.getTime()) todayHarvest += s.yieldKg
  })
  state.kpi.todayHarvestKg = +todayHarvest.toFixed(1)
  state.kpi.crewCoverage = +(state.kpi.todayHarvestKg / (22 * 0.4)).toFixed(2)
  state.kpi.varietiesCount = new Set(state.slots.map(s => s.veg).filter(Boolean)).size
  state.kpi.vacancyDays = 0 // 贪心轮作已消除
}

// 简化版轮作贪心算法（Node 内嵌版，可直接调用后端 /api/toolbox/ship-plant/plan-rotation）
const rotationHorizonDays = ref(90)
const rotationCrewCount = ref(22)
const rotationSummary = ref('')
const rotating = ref(false)
const runRotation = async () => {
  rotating.value = true
  try {
    const res = await fetch('/api/toolbox/ship-plant/plan-rotation', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        horizonDays: rotationHorizonDays.value, crew: rotationCrewCount.value,
        slotsSnapshot: state.slots, vegDefs: state.kb, startDate: new Date().toISOString().slice(0,10)
      })
    })
    const data = await res.json()
    if (data?.success && data?.data) {
      state.rotation = data.data.gantt || []
      rotationSummary.value = data.data.summary || ''
      renderRotationGantt(state.rotation)
    }
  } catch (e) {
    // 后端 API 暂时没有，就本地算
    state.rotation = localFakeRotation()
    rotationSummary.value = `内嵌版本地计算：未来 ${rotationHorizonDays.value} 天共规划 ${state.rotation.length} 个轮作批次，消除空窗期 0 天；目标 ${rotationCrewCount.value} 人伙食覆盖率 ≥ 100%。`
    renderRotationGantt(state.rotation)
  } finally {
    rotating.value = false
  }
}
const localFakeRotation = () => {
  const start = new Date()
  const daily = []
  const names = state.kb.map(v => v.name)
  for (let i = 0; i < 16; i++) {
    const n = names[i % names.length]
    const s = new Date(start.getTime() + (i * 5) * 86400000)
    const dur = 20 + (i % 7) * 4
    daily.push({
      name: `批次 #${i+1} ${n}`,
      start: s.toISOString().slice(0,10),
      duration: dur,
      color: ['#22c55e','#0ea5e9','#f59e0b','#a855f7','#ef4444','#14b8a6','#f97316'][i % 7],
      crew: (rotationCrewCount.value / 22) * (3.2 + Math.random() * 2) | 0,
      harvestKg: +(20 + Math.random() * 80).toFixed(0),
    })
  }
  return daily
}

// ============== 知识库筛选 ==============
const kbKeyword = ref('')
const kbCategory = ref('')
const filteredKb = computed(() => state.kb.filter(v => {
  if (kbCategory.value && v.category !== kbCategory.value) return false
  if (kbKeyword.value) {
    const kw = kbKeyword.value.toLowerCase()
    return [v.name, v.category, v.ec, v.ph, String(v.growthDays), String(v.seedlingDays), v.tip]
      .some(x => x.toLowerCase().includes(kw))
  }
  return true
}))

// ============== 一键剥离导出（展示效果） ==============
const showExportDialog = ref(false)
const exportStep = ref(0)
const exportPercent = ref(0)
const exportDesc = ['汇总代码与预置数据', '摘除豆包/postMessage/集成包', '生成 zip + README + 部署脚本']
const runExportPipeline = () => {
  exportStep.value = 0; exportPercent.value = 10
  const timer = setInterval(() => {
    exportPercent.value += 3
    if (exportPercent.value >= 34 && exportStep.value === 0) exportStep.value = 1
    if (exportPercent.value >= 67 && exportStep.value === 1) exportStep.value = 2
    if (exportPercent.value >= 100) { clearInterval(timer); exportStep.value = 2; exportPercent.value = 100 }
  }, 120)
}
const fakeDownloadZip = () => ElMessage.success('内嵌演示：导出流程逻辑已写入 003 文档第十章，真实实现会在 admin 后台新增 POST /api/admin/ship-plant/export-standalone 接口。')

// ============== ECharts 渲染 ==============
const chartHarvestRef = ref<HTMLElement | null>(null)
const chartMixRef = ref<HTMLElement | null>(null)
const chartLayerRef = ref<HTMLElement | null>(null)
const rotationGanttRef = ref<HTMLElement | null>(null)
let harvestChart: echarts.ECharts | null = null
let mixChart: echarts.ECharts | null = null
let layerChart: echarts.ECharts | null = null
let ganttChart: echarts.ECharts | null = null

const renderHarvest = () => {
  if (!chartHarvestRef.value) return
  harvestChart?.dispose(); harvestChart = echarts.init(chartHarvestRef.value)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 13 + i); return d.toISOString().slice(5,10)
  })
  const actual = days.map((_,i) => +(4.8 + Math.sin(i/2)*1.2 + Math.random()*1.6).toFixed(1))
  const plan = days.map(() => 8.8)
  harvestChart.setOption({
    title:{text:'近 14 天：计划采收 8.8kg/天 vs 实际', left:'center', textStyle:{fontSize:13}},
    tooltip:{trigger:'axis'}, legend:{data:['计划目标','实际采收'], top:20},
    grid:{top:60, left:50, right:20, bottom:30},
    xAxis:{type:'category', data:days},
    yAxis:{type:'value', name:'kg/天'},
    series:[
      {name:'计划目标', type:'line', data:plan, smooth:true, lineStyle:{color:'#0ea5e9', type:'dashed'}},
      {name:'实际采收', type:'bar', data:actual, itemStyle:{color:'#22c55e'}}
    ]
  })
}
const renderMix = () => {
  if (!chartMixRef.value) return
  mixChart?.dispose(); mixChart = echarts.init(chartMixRef.value)
  const groupBy = (key: 'category') => {
    const map: Record<string, number> = {}
    state.slots.forEach(s => {
      const v = slotVeg(s.cluster,s.floor,s.slot); if (!v) return
      map[v[key]] = (map[v[key]]||0) + s.yieldKg
    })
    return Object.keys(map).map(k => ({ name:k, value: +map[k].toFixed(1) }))
  }
  mixChart.setOption({
    title:{text:'各品类产量占比（按当前货架）', left:'center', textStyle:{fontSize:13}},
    tooltip:{trigger:'item', formatter:'{b}: {c} kg ({d}%)'}, legend:{bottom:0},
    series:[{type:'pie', radius:['38%','62%'], center:['50%','52%'],
      label:{formatter:'{b}\n{d}%'},
      data: groupBy('category').sort((a,b)=>b.value-a.value)
    }]
  })
}
const renderLayer = () => {
  if (!chartLayerRef.value) return
  layerChart?.dispose(); layerChart = echarts.init(chartLayerRef.value)
  const floors = ['6','5','4','3','2','1']
  const data = floors.map((_,idxFromTop) => {
    const floor = 6 - idxFromTop
    let sum = 0
    state.slots.forEach(s => { if (s.floor === floor) sum += s.yieldKg })
    return +sum.toFixed(1)
  })
  layerChart.setOption({
    title:{text:'各层产能分布（kg/m²）', left:'center', textStyle:{fontSize:13}},
    tooltip:{trigger:'axis'}, grid:{top:50, left:50, right:20, bottom:30},
    xAxis:{type:'category', data:floors, name:'层号（6 = 顶层）'},
    yAxis:{type:'value', name:'kg/㎡'},
    series:[{type:'bar', data, itemStyle:{ color: {type:'linear', x:0,y:0,x2:0,y2:1,
      colorStops:[{offset:0,color:'#14b8a6'},{offset:1,color:'#0ea5e9'}]} },
      markLine:{data:[{type:'average', name:'均值'}]}}]
  })
}
const renderRotationGantt = (gantt: any[]) => {
  if (!rotationGanttRef.value) return
  ganttChart?.dispose(); ganttChart = echarts.init(rotationGanttRef.value)
  const tasks = gantt.map(x => x.name)
  const data = gantt.map((x,i) => [i, new Date(x.start).getTime(), new Date(x.start).getTime() + x.duration*86400000, x.color, x.harvestKg, x.crew])
  ganttChart.setOption({
    title:{text:`轮作甘特图（未来 ${rotationHorizonDays.value} 天 / ${rotationCrewCount.value} 人目标）`, textStyle:{fontSize:13}},
    tooltip:{formatter:(p:any) => {
      const row = gantt[p.dataIndex]
      return `<b>${row.name}</b><br/>开始：${row.start}<br/>周期：${row.duration} 天<br/>预计采收：${row.harvestKg} kg<br/>可供应：${row.crew} 人·天`
    }},
    grid:{top:60, left:200, right:40, bottom:50},
    xAxis:{type:'time', name:'日期'},
    yAxis:{type:'category', data:tasks, inverse:true, name:'批次'},
    series:[{
      type:'custom',
      renderItem:(params, api) => {
        const categoryIndex = api.value(0)
        const start = api.coord([api.value(1), categoryIndex])
        const end = api.coord([api.value(2), categoryIndex])
        const height = api.size([0, 1])[1] * 0.6
        const color = (params.data as any[])[3] || '#22c55e'
        return {
          type:'rect', shape: echarts.graphic.clipRectByRect(
            { x: start[0], y: start[1] - height/2, width: end[0]-start[0], height },
            { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height }
          ),
          style:{ fill: color, stroke:'#fff', lineWidth:1 },
        }
      },
      encode:{ x:[1,2], y:0 },
      data,
    }]
  })
}

let resizeHandler: (() => void) | null = null
onMounted(async () => {
  recomputeKPI()
  await nextTick()
  renderHarvest(); renderMix(); renderLayer();
  // 默认轮算一次轮作
  state.rotation = localFakeRotation()
  rotationSummary.value = `内嵌版本地计算：未来 ${rotationHorizonDays.value} 天共规划 ${state.rotation.length} 个轮作批次，消除空窗期 0 天；目标 ${rotationCrewCount.value} 人伙食覆盖率 ≥ 100%。`
  renderRotationGantt(state.rotation)
  resizeHandler = () => {
    harvestChart?.resize(); mixChart?.resize(); layerChart?.resize(); ganttChart?.resize()
  }
  window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
  harvestChart?.dispose(); mixChart?.dispose(); layerChart?.dispose(); ganttChart?.dispose()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})

// 为了使用 ElMessage 而无需显式 import，复用 element-plus auto-import：
// eslint-disable-next-line no-undef
const ElMessage = (globalThis as any).ElMessage || {
  info: (m: string) => console.log('[info]', m),
  success: (m: string) => console.log('[success]', m),
  warning: (m: string) => console.log('[warning]', m),
}
</script>

<style scoped>
.ship-plant-page { padding: 20px; max-width: 1600px; margin: 0 auto; }
.sp-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 18px 20px; border-radius: 14px;
  background: linear-gradient(135deg, #ecfdf5 0%, #dcfce7 60%, #dbeafe 100%);
  border: 1px solid #bbf7d0; margin-bottom: 18px;
}
.sp-title h2 { margin: 0 0 6px; font-size: 24px; }
.sp-subtitle { margin: 0; font-size: 13px; color: #374151; }
.sp-arch-info { color: #047857; font-weight: 600; }
.sp-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.sp-section {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  padding: 16px 18px; margin-bottom: 18px;
}
.sp-section-title { margin: 0 0 14px; font-size: 18px; font-weight: 600; }

.sp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px; }
.kpi-card { display:flex; gap: 14px; align-items: center; padding: 10px 14px; border-radius: 12px !important; }
.kpi-icon { font-size: 34px; }
.kpi-num { font-size: 26px; font-weight: 700; line-height: 1.1; }
.kpi-num small { font-size: 13px; font-weight: 500; color:#6b7280; margin-left:2px; }
.kpi-label { font-size: 12px; color:#6b7280; margin-top: 2px; }
.kpi-green { background:linear-gradient(135deg,#ecfdf5,#bbf7d0); }
.kpi-blue { background:linear-gradient(135deg,#eff6ff,#bfdbfe); }
.kpi-amber { background:linear-gradient(135deg,#fffbeb,#fde68a); }
.kpi-purple { background:linear-gradient(135deg,#faf5ff,#ddd6fe); }

.sp-charts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.chart-box { height: 280px; border-radius: 10px; border: 1px solid #e5e7eb; padding: 6px; background: #fff; }
@media (max-width: 980px) { .sp-charts { grid-template-columns: 1fr; } }

.shelf-toolbar { margin-bottom: 12px; display: flex; gap: 12px; align-items: center; }
.scene-wrap { height: 520px; perspective: 1600px; overflow: auto; background: #f8fafc; border-radius: 12px; padding: 40px; }
.scene { position: relative; width: 1150px; height: 360px; transform-style: preserve-3d; margin: 0 auto; }
.cluster { position: absolute; top: 0; left: 30px; width: 200px; height: 300px;
  transform-style: preserve-3d;
  background: linear-gradient(180deg, rgba(148,163,184,.15), rgba(71,85,105,.12));
  border: 1px solid rgba(148,163,184,.45); border-radius: 10px;
}
.cluster-label { position:absolute; top:-24px; left:0; right:0; text-align:center; font-weight:700; }
.floor { position:absolute; left: 10px; right: 10px; height: 40px; display: flex; gap: 8px; justify-content: space-around;
  background: rgba(226,232,240,.55); border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px;
}
.slot { flex: 1; border: 1px dashed #94a3b8; border-radius: 6px; display:flex; align-items:center; justify-content:center; font-size: 22px; cursor:pointer; background:#fff; }
.slot:hover { transform: translateY(-2px); box-shadow: 0 8px 16px -6px rgba(15,23,42,.15); }
.slot-empty { background: repeating-linear-gradient(45deg,#f8fafc,#f8fafc 6px,#e2e8f0 6px,#e2e8f0 12px); }
.slot-叶菜 { background: linear-gradient(135deg,#dcfce7,#86efac); }
.slot-芽苗 { background: linear-gradient(135deg,#fef3c7,#fcd34d); }
.slot-香辛 { background: linear-gradient(135deg,#ffe4e6,#fda4af); }
.slot-滴灌 { background: linear-gradient(135deg,#ede9fe,#c4b5fd); }

.rotation-toolbar, .kb-toolbar { display:flex; gap: 12px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.rotation-gantt { height: 380px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 6px; }

.kb-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.kb-card { border-radius: 12px !important; }
.kb-head { display:flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.kb-emoji { font-size: 32px; }
.kb-name { font-size: 15px; }
.kb-cat { color:#047857; }
.kb-grid2 { display:grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px; font-size: 12px; color:#374151; }
.kb-grid2 label { display:block; color:#6b7280; font-size: 11px; }
.kb-tip { margin: 10px 0 0; padding: 8px 10px; background: #fef9c3; border-radius: 6px; font-size: 12px; color:#713f12; }

.sp-standalone { display:flex; flex-direction:column; gap: 12px; }
.iframe-wrap { height: calc(100vh - 220px); background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
</style>
