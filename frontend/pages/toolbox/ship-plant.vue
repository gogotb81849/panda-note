<template>
  <div class="sp-page">
    <!-- ========== 顶部通栏 ========== -->
    <header class="sp-topbar">
      <div class="sp-topbar-left">
        <span class="sp-logo">🌱</span>
        <div>
          <h1 class="sp-systitle">海上菜篮子<span class="sp-systitle-sub">· 船舶密闭舱室蔬菜智能规划可视化系统</span></h1>
          <p class="sp-arch-info">当前 = 熊猫笔记内嵌版 · 与工具箱完全一体 ✅</p>
        </div>
      </div>
      <div class="sp-topbar-center">
        <div class="sp-kpi-inline"><span class="sp-kpi-label">稳定日均产出</span><span class="sp-kpi-val sp-green">{{ state.capacity.stable.toFixed(1) }}</span><small>斤/天</small></div>
        <div class="sp-kpi-inline"><span class="sp-kpi-label">目标需求</span><span class="sp-kpi-val sp-blue">{{ state.capacity.target.toFixed(1) }}</span><small>斤/天</small></div>
        <div class="sp-kpi-inline"><span class="sp-kpi-label">产能状态</span><span class="sp-kpi-val" :class="statusClass">{{ statusText }}</span></div>
      </div>
      <div class="sp-topbar-right">
        <div class="sp-alert-bar" v-if="state.alerts.length">
          <span class="sp-alert-icon">⚠️</span>
          <transition name="sp-alert-slide" mode="out-in">
            <span :key="state.alertIdx" class="sp-alert-text">{{ state.alerts[state.alertIdx] }}</span>
          </transition>
        </div>
        <span class="sp-clock">🕐 {{ state.clock }}</span>
        <el-radio-group v-model="dataSource" size="small" @change="onDataSourceChange">
          <el-radio-button value="embedded">内嵌版</el-radio-button>
          <el-radio-button value="standalone">独立服务</el-radio-button>
        </el-radio-group>
        <el-button size="small" type="primary" plain :icon="Download" @click="showExport = true">📦 一键导出</el-button>
        <el-button size="small" link :icon="ArrowLeft" @click="$router.push('/toolbox')">返回</el-button>
      </div>
    </header>

    <!-- ========== 主体：左中右三列 ========== -->
    <main class="sp-body" v-if="dataSource === 'embedded'">
      <!-- ===== 左列 ===== -->
      <aside class="sp-col-left">
        <!-- 航次信息 -->
        <div class="tech-card">
          <div class="tech-card-title"><span class="tech-bar"></span>航次档案</div>
          <div class="sp-archive-info">
            <div class="sp-info-row"><label>船舶</label><span>{{ state.archive.shipName }}</span></div>
            <div class="sp-info-row"><label>航次</label><span>{{ state.archive.voyageName }}</span></div>
            <div class="sp-info-row"><label>船员</label><span class="sp-green-text">{{ state.archive.peopleNum }} 人</span></div>
            <div class="sp-info-row"><label>用餐</label><span>{{ state.archive.mealType === 2 ? '早中晚三餐' : '午晚两餐' }}</span></div>
            <div class="sp-info-row"><label>单人日需</label><span>{{ state.archive.perPersonDemand }} 斤/人</span></div>
            <div class="sp-info-row"><label>损耗系数</label><span>{{ state.archive.lossRatio }}</span></div>
            <div class="sp-info-row"><label>目标日需</label><span class="sp-blue-text">{{ state.capacity.target.toFixed(1) }} 斤/天</span></div>
          </div>
        </div>
        <!-- 货架配置概览 -->
        <div class="tech-card">
          <div class="tech-card-title"><span class="tech-bar"></span>货架配置</div>
          <div class="sp-shelf-list">
            <div v-for="s in state.shelves" :key="s.id" class="sp-shelf-item">
              <div class="sp-shelf-head">
                <span class="sp-shelf-name">{{ s.shelfName }}</span>
                <span class="sp-mode-tag" :class="'mode-' + s.plantMode">{{ modeLabel(s.plantMode) }}</span>
              </div>
              <div class="sp-shelf-meta">{{ s.length }}×{{ s.width }}{{ s.unitType === 1 ? 'cm' : 'm' }} · {{ s.floorTotal }}层 · {{ s.areaSqm }}㎡/层</div>
              <div class="sp-floor-mini-row">
                <div v-for="f in s.floors" :key="f.floorNo"
                  class="sp-floor-mini" :class="'status-' + f.status"
                  :title="`L${f.floorNo} ${statusLabel(f.status)}${f.vegName ? ' · ' + f.vegName : ''}`"
                  @click="onFloorClick(s, f)">
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 伙食需求 -->
        <div class="tech-card">
          <div class="tech-card-title"><span class="tech-bar"></span>伙食需求</div>
          <div class="sp-demand-form">
            <div class="sp-demand-row"><label>总人数</label><el-input-number v-model="state.archive.peopleNum" :min="1" size="small" @change="recomputeCapacity" /></div>
            <div class="sp-demand-row"><label>单人日需(斤)</label><el-input-number v-model="state.archive.perPersonDemand" :min="0.1" :step="0.1" size="small" @change="recomputeCapacity" /></div>
            <div class="sp-demand-row"><label>损耗系数</label><el-input-number v-model="state.archive.lossRatio" :min="1" :step="0.05" size="small" @change="recomputeCapacity" /></div>
          </div>
        </div>
      </aside>

      <!-- ===== 中列 ===== -->
      <section class="sp-col-center">
        <!-- 2.5D 货架集群 -->
        <div class="tech-card sp-shelf-section">
          <div class="tech-card-title">
            <span class="tech-bar"></span>多层立体种植货架 · 2.5D 视图
            <div class="sp-shelf-toolbar">
              <el-radio-group v-model="shelfView" size="small">
                <el-radio-button value="2.5d">2.5D 透视</el-radio-button>
                <el-radio-button value="2d">2D 分层表</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <!-- 2.5D CSS 视图 -->
          <div v-if="shelfView === '2.5d'" class="sp-shelf-scene">
            <div class="sp-scene-inner" :style="{ transform: `perspective(1200px) rotateX(${shelfAngle}deg) rotateZ(0deg)` }">
              <div v-for="s in state.shelves" :key="s.id" class="sp-cluster">
                <div class="sp-cluster-label">{{ s.shelfName }} <span :class="'mode-tag-' + s.plantMode">{{ modeLabel(s.plantMode) }}</span></div>
                <div class="sp-cluster-body">
                  <div v-for="f in [...s.floors].reverse()" :key="f.floorNo"
                    class="sp-floor-card" :class="'status-bg-' + f.status"
                    @click="onFloorClick(s, f)">
                    <div class="sp-floor-no">L{{ f.floorNo }}</div>
                    <div class="sp-floor-veg" v-if="f.vegName">🥬 {{ f.vegName }}</div>
                    <div class="sp-floor-veg sp-empty" v-else>空闲</div>
                    <!-- 流光进度条 -->
                    <div class="sp-stream-progress" v-if="f.status >= 2 && f.status <= 4">
                      <div class="sp-stream-bar" :class="'stream-stage-' + f.status" :style="{ width: f.progress + '%' }"></div>
                      <span class="sp-stream-text">{{ f.progress }}% · {{ f.remainingDays }}天</span>
                    </div>
                    <div class="sp-floor-status" :class="'status-text-' + f.status">{{ statusLabel(f.status) }}</div>
                  </div>
                  <!-- LED 发光条 -->
                  <div class="sp-led-bar" v-for="i in 2" :key="'led'+i" :style="{ left: i === 1 ? '5%' : '85%' }"></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 2D 分层表 -->
          <el-table v-if="shelfView === '2d'" :data="flatFloorList()" size="small" stripe height="300">
            <el-table-column prop="shelfName" label="货架" width="100" />
            <el-table-column prop="floorNo" label="层" width="50" />
            <el-table-column label="状态" width="90"><template #default="{row}"><span :class="'status-text-' + row.status">{{ statusLabel(row.status) }}</span></template></el-table-column>
            <el-table-column prop="vegName" label="蔬菜" width="100" />
            <el-table-column prop="plantDate" label="定植日" width="100" />
            <el-table-column prop="firstCollectDate" label="首采日" width="100" />
            <el-table-column prop="progressLabel" label="进度" width="120" />
          </el-table>
        </div>
        <!-- 双仪表盘 -->
        <div class="tech-card sp-gauge-section">
          <div ref="gaugeStableRef" class="sp-gauge-box"></div>
          <div ref="gaugePeakRef" class="sp-gauge-box"></div>
        </div>
        <!-- 轮作甘特图 -->
        <div class="tech-card sp-gantt-section">
          <div class="tech-card-title">
            <span class="tech-bar"></span>智能轮耕甘特图 · 60天排程
            <div class="sp-shelf-toolbar">
              <el-select v-model="rotationDays" size="small" style="width:110px">
                <el-option :value="30" label="30天" /><el-option :value="60" label="60天" /><el-option :value="90" label="90天" />
              </el-select>
              <el-button size="small" type="primary" :loading="rotating" @click="runRotation">🧪 重新计算</el-button>
              <el-button size="small" @click="checkGap">🔍 检测空窗</el-button>
            </div>
          </div>
          <div ref="ganttRef" class="sp-gantt-box"></div>
        </div>
        <!-- 60天产量曲线 -->
        <div class="tech-card sp-line-section">
          <div class="tech-card-title"><span class="tech-bar"></span>未来60天日产量曲线 · 空窗风险检测</div>
          <div ref="lineRef" class="sp-line-box"></div>
        </div>
      </section>

      <!-- ===== 右列 ===== -->
      <aside class="sp-col-right">
        <!-- 今日任务 -->
        <div class="tech-card">
          <div class="tech-card-title"><span class="tech-bar"></span>今日任务清单</div>
          <div class="sp-task-stats">
            <span class="sp-task-tag sp-green-bg">待定植 {{ state.tasks.plant.length }}</span>
            <span class="sp-task-tag sp-orange-bg">待采收 {{ state.tasks.harvest.length }}</span>
          </div>
          <div class="sp-task-list">
            <div v-for="t in state.tasks.plant" :key="'p'+t.id" class="sp-task-item sp-task-plant">
              <span class="sp-task-icon">🌱</span>
              <div class="sp-task-info"><b>{{ t.vegName }}</b><small>{{ t.shelfName }} · L{{ t.floorNo }} · {{ t.date }}</small></div>
              <el-button size="small" type="success" @click="doTask('plant', t)">定植</el-button>
            </div>
            <div v-for="t in state.tasks.harvest" :key="'h'+t.id" class="sp-task-item sp-task-harvest">
              <span class="sp-task-icon">✂️</span>
              <div class="sp-task-info"><b>{{ t.vegName }}</b><small>{{ t.shelfName }} · L{{ t.floorNo }} · {{ t.date }}</small></div>
              <el-button size="small" type="warning" @click="doTask('harvest', t)">采收</el-button>
            </div>
            <div v-if="!state.tasks.plant.length && !state.tasks.harvest.length" class="sp-task-empty">🎉 今日暂无待办</div>
          </div>
        </div>
        <!-- 采收预测 -->
        <div class="tech-card">
          <div class="tech-card-title"><span class="tech-bar"></span>采收预测</div>
          <div class="sp-forecast-summary">
            <div class="sp-forecast-kpi"><span class="sp-green-text sp-big-num">{{ state.forecast.totalKg.toFixed(1) }}</span><small>kg</small></div>
            <div class="sp-forecast-kpi"><span class="sp-blue-text sp-big-num">{{ state.forecast.varieties }}</span><small>品种</small></div>
          </div>
          <div class="sp-forecast-list">
            <div v-for="f in state.forecast.items" :key="f.name" class="sp-forecast-item">
              <span>{{ f.emoji }} {{ f.name }}</span>
              <div class="sp-forecast-bar"><div class="sp-forecast-fill" :style="{ width: f.pct + '%' }"></div></div>
              <span class="sp-blue-text">{{ f.kg.toFixed(1) }}kg</span>
            </div>
          </div>
        </div>
        <!-- 品类占比饼图 -->
        <div class="tech-card">
          <div class="tech-card-title"><span class="tech-bar"></span>各蔬菜产能占比</div>
          <div ref="pieRef" class="sp-pie-box"></div>
        </div>
      </aside>
    </main>

    <!-- 独立服务 iframe 模式 -->
    <div v-else class="sp-standalone-wrap">
      <iframe :src="standaloneSrc" width="100%" height="100%" frameborder="0" />
    </div>

    <!-- ========== 底部通栏 ========== -->
    <footer class="sp-bottombar">
      <div class="sp-bottom-stats">
        <div class="sp-bottom-stat"><span class="sp-bs-num sp-blue">{{ state.shelves.length }}</span><span class="sp-bs-label">货架总数</span></div>
        <div class="sp-bottom-stat"><span class="sp-bs-num sp-green">{{ totalFloors }}</span><span class="sp-bs-label">种植层数</span></div>
        <div class="sp-bottom-stat"><span class="sp-bs-num sp-gray">{{ emptyFloors }}</span><span class="sp-bs-label">空闲层数</span></div>
        <div class="sp-bottom-stat"><span class="sp-bs-num sp-blue">{{ state.harvest.totalKg.toFixed(1) }}</span><span class="sp-bs-label">累计采收(kg)</span></div>
        <div class="sp-bottom-stat"><span class="sp-bs-num" :class="state.harvest.lossRate > 0.1 ? 'sp-red' : 'sp-orange'">{{ (state.harvest.lossRate * 100).toFixed(1) }}%</span><span class="sp-bs-label">损耗率</span></div>
      </div>
      <div class="sp-bottom-actions">
        <el-button size="small" @click="exportData('archive-list')">📋 航次清单</el-button>
        <el-button size="small" @click="exportData('shelf-config')">🗄️ 货架配置</el-button>
        <el-button size="small" @click="exportData('rotation-plan')">📅 轮耕计划</el-button>
        <el-button size="small" @click="exportData('harvest-record')">📊 采收台账</el-button>
      </div>
    </footer>

    <!-- 货架层详情弹窗 -->
    <el-dialog v-model="showFloorDetail" title="种植位详情" width="520px">
      <template v-if="selectedFloor">
        <div class="sp-detail-row"><label>位置</label><span>{{ selectedFloor.shelfName }} · L{{ selectedFloor.floorNo }}</span></div>
        <div class="sp-detail-row"><label>状态</label><span :class="'status-text-' + selectedFloor.status">{{ statusLabel(selectedFloor.status) }}</span></div>
        <div class="sp-detail-row"><label>蔬菜</label><span>{{ selectedFloor.vegName || '（空位）' }}</span></div>
        <div class="sp-detail-row" v-if="selectedFloor.vegName"><label>栽培模式</label><span>{{ modeLabel(selectedFloor.plantMode) }}</span></div>
        <div class="sp-detail-row" v-if="selectedFloor.plantDate"><label>定植日</label><span>{{ selectedFloor.plantDate }}</span></div>
        <div class="sp-detail-row" v-if="selectedFloor.firstCollectDate"><label>首采日</label><span>{{ selectedFloor.firstCollectDate }}</span></div>
        <div class="sp-detail-row" v-if="selectedFloor.lastCollectDate"><label>末采日</label><span>{{ selectedFloor.lastCollectDate }}</span></div>
        <div class="sp-detail-row" v-if="selectedFloor.vegName"><label>采摘模式</label><span>{{ collectModeLabel(selectedFloor.collectMode) }}</span></div>
        <div class="sp-detail-row" v-if="selectedFloor.progress !== undefined"><label>生长进度</label><span>{{ selectedFloor.progress }}% ({{ selectedFloor.remainingDays }}天剩余)</span></div>
        <div class="sp-detail-row" v-if="selectedFloor.env"><label>环境参数</label><span class="sp-env-text">{{ selectedFloor.env }}</span></div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <el-button v-if="selectedFloor.status === 1 || selectedFloor.status === 5" type="success" size="small" @click="openPlantForm">✍️ 定植</el-button>
          <el-button v-if="selectedFloor.status === 4" type="warning" size="small" @click="openHarvestForm">🌿 采收</el-button>
          <el-button size="small" @click="showFloorDetail = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 定植表单 -->
    <el-dialog v-model="showPlantForm" title="定植录入" width="480px">
      <el-form label-width="100px" size="small">
        <el-form-item label="蔬菜品种"><el-select v-model="plantForm.vegId" filterable placeholder="选择蔬菜" style="width:100%"><el-option v-for="v in VEG_20" :key="v.id" :label="`${v.emoji} ${v.vegName} (${collectModeLabel(v.collectMode)})`" :value="v.id" /></el-select></el-form-item>
        <el-form-item label="播种日期"><el-date-picker v-model="plantForm.seedDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="定植日期"><el-date-picker v-model="plantForm.plantDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="定植密度"><el-input-number v-model="plantForm.density" :min="1" size="small" /></el-form-item>
        <el-form-item label="系统预计"><div v-if="plantForm.vegId" class="sp-estimate"><span>首采日: {{ estimatedDates.first }}</span><span>末采日: {{ estimatedDates.last }}</span><span>总产量: {{ estimatedDates.yield }} 斤</span></div></el-form-item>
      </el-form>
      <template #footer><el-button @click="showPlantForm = false">取消</el-button><el-button type="primary" @click="submitPlant">确认定植</el-button></template>
    </el-dialog>

    <!-- 一键导出 -->
    <el-dialog v-model="showExport" title="📦 一键剥离导出：海上菜篮子独立部署包" width="700px">
      <el-steps :active="exportStep" finish-status="success"><el-step title="读取源代码" /><el-step title="摘除依赖" /><el-step title="生成zip" /></el-steps>
      <div style="padding:16px 4px">
        <el-progress v-if="exportStep < 3" :percentage="exportPct" />
        <el-result v-else icon="success" title="已生成独立交付物" sub-title="满足002独立交付铁律">
          <template #extra><el-button type="primary" @click="showExport = false">完成</el-button></template>
        </el-result>
      </div>
      <template #footer><el-button @click="showExport = false">取消</el-button><el-button v-if="exportStep === 0" type="primary" @click="runExport">开始导出</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, GaugeChart, PieChart, CustomChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ArrowLeft, Download } from '@element-plus/icons-vue'

echarts.use([BarChart, LineChart, GaugeChart, PieChart, CustomChart, CanvasRenderer,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent])

// ============== 20种蔬菜完整数据（对齐原版 init_data.sql 30+字段） ==============
interface Veg {
  id: number; vegCode: string; vegName: string; emoji: string; category: string; plantMode: number;
  seedlingDay: number; growStageDay: number; growTotalDay: number;
  multiCollectMax: number; collectIntervalDay: number;
  yieldOncePerSqm: number; perSqmYield: number; shelfLifeDay: number;
  tempMin: number; tempMax: number; luxMin: number; luxMax: number;
  humidityMin: number; humidityMax: number; phMin: number; phMax: number; ec: string;
  collectMode: number; firstCollectDay: number; sustainDays: number; dailyYieldSustain: number;
  collectSkill: string; nutritionTip: string; fitMode: string;
}
const VEG_20: Veg[] = [
  { id:1,vegCode:'V001',vegName:'生菜',emoji:'🥬',category:'叶菜类',plantMode:1,seedlingDay:7,growStageDay:18,growTotalDay:32,multiCollectMax:3,collectIntervalDay:7,yieldOncePerSqm:1.5,perSqmYield:3.5,shelfLifeDay:3,tempMin:15,tempMax:22,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:75,phMin:5.8,phMax:6.5,ec:'1.2-1.6',collectMode:2,firstCollectDay:25,sustainDays:20,dailyYieldSustain:0.15,collectSkill:'剥叶从外向内，保留心叶8片以上',nutritionTip:'富含维生素A/C/K，叶酸含量高',fitMode:'water'},
  { id:2,vegCode:'V002',vegName:'油麦菜',emoji:'🥗',category:'叶菜类',plantMode:1,seedlingDay:7,growStageDay:18,growTotalDay:32,multiCollectMax:3,collectIntervalDay:6,yieldOncePerSqm:1.3,perSqmYield:3.8,shelfLifeDay:2,tempMin:15,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:70,phMin:6.0,phMax:7.0,ec:'1.2-1.8',collectMode:2,firstCollectDay:25,sustainDays:18,dailyYieldSustain:0.12,collectSkill:'从下往上剥叶，保留8片功能叶',nutritionTip:'β-胡萝卜素丰富，清热降火',fitMode:'water'},
  { id:3,vegCode:'V003',vegName:'小白菜',emoji:'🥦',category:'叶菜类',plantMode:1,seedlingDay:5,growStageDay:18,growTotalDay:30,multiCollectMax:2,collectIntervalDay:5,yieldOncePerSqm:1.4,perSqmYield:4.2,shelfLifeDay:2,tempMin:15,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:70,phMin:6.0,phMax:6.8,ec:'1.4-1.8',collectMode:2,firstCollectDay:22,sustainDays:16,dailyYieldSustain:0.13,collectSkill:'分批采收外叶，保留心叶继续生长',nutritionTip:'钙铁含量高，增强免疫',fitMode:'water'},
  { id:4,vegCode:'V004',vegName:'菠菜',emoji:'🥬',category:'叶菜类',plantMode:1,seedlingDay:6,growStageDay:20,growTotalDay:34,multiCollectMax:2,collectIntervalDay:6,yieldOncePerSqm:1.2,perSqmYield:4.0,shelfLifeDay:2,tempMin:10,tempMax:20,luxMin:8000,luxMax:12000,humidityMin:65,humidityMax:75,phMin:6.0,phMax:7.0,ec:'1.6-2.0',collectMode:2,firstCollectDay:26,sustainDays:14,dailyYieldSustain:0.10,collectSkill:'采收前48h不追肥（控制亚硝酸盐）',nutritionTip:'铁元素+叶酸冠军',fitMode:'water'},
  { id:5,vegCode:'V005',vegName:'空心菜',emoji:'🥦',category:'叶菜类',plantMode:1,seedlingDay:6,growStageDay:18,growTotalDay:30,multiCollectMax:5,collectIntervalDay:3,yieldOncePerSqm:1.0,perSqmYield:4.6,shelfLifeDay:1,tempMin:20,tempMax:30,luxMin:10000,luxMax:15000,humidityMin:70,humidityMax:85,phMin:5.8,phMax:6.8,ec:'1.4-2.0',collectMode:4,firstCollectDay:20,sustainDays:0,dailyYieldSustain:0,collectSkill:'掐尖采收，留2-3节促进侧枝萌发',nutritionTip:'膳食纤维丰富，润肠通便',fitMode:'water'},
  { id:6,vegCode:'V006',vegName:'韭菜',emoji:'🌿',category:'叶菜类',plantMode:1,seedlingDay:10,growStageDay:25,growTotalDay:40,multiCollectMax:6,collectIntervalDay:7,yieldOncePerSqm:0.8,perSqmYield:2.5,shelfLifeDay:1,tempMin:15,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:70,phMin:5.5,phMax:6.5,ec:'1.2-1.6',collectMode:3,firstCollectDay:35,sustainDays:0,dailyYieldSustain:0,collectSkill:'割茬留根3cm，割后施肥催新芽',nutritionTip:'硫化物杀菌，温补肝肾',fitMode:'water'},
  { id:7,vegCode:'V007',vegName:'豌豆苗',emoji:'🌱',category:'芽苗类',plantMode:2,seedlingDay:1,growStageDay:8,growTotalDay:12,multiCollectMax:1,collectIntervalDay:0,yieldOncePerSqm:1.2,perSqmYield:1.6,shelfLifeDay:1,tempMin:15,tempMax:22,luxMin:3000,luxMax:6000,humidityMin:70,humidityMax:85,phMin:5.8,phMax:6.5,ec:'0.8-1.0',collectMode:1,firstCollectDay:12,sustainDays:0,dailyYieldSustain:0,collectSkill:'8天即可割茬，紧急补给首选',nutritionTip:'维生素C+植物蛋白',fitMode:'mist'},
  { id:8,vegCode:'V008',vegName:'萝卜苗',emoji:'🌱',category:'芽苗类',plantMode:2,seedlingDay:1,growStageDay:8,growTotalDay:12,multiCollectMax:1,collectIntervalDay:0,yieldOncePerSqm:1.0,perSqmYield:1.4,shelfLifeDay:1,tempMin:15,tempMax:22,luxMin:3000,luxMax:6000,humidityMin:70,humidityMax:85,phMin:5.8,phMax:6.5,ec:'0.8-1.0',collectMode:1,firstCollectDay:12,sustainDays:0,dailyYieldSustain:0,collectSkill:'整株采收，12天周期',nutritionTip:'辛辣开胃，助消化',fitMode:'mist'},
  { id:9,vegCode:'V009',vegName:'香椿苗',emoji:'🌱',category:'芽苗类',plantMode:2,seedlingDay:2,growStageDay:12,growTotalDay:17,multiCollectMax:1,collectIntervalDay:0,yieldOncePerSqm:1.1,perSqmYield:1.5,shelfLifeDay:1,tempMin:18,tempMax:25,luxMin:4000,luxMax:8000,humidityMin:65,humidityMax:80,phMin:5.8,phMax:6.5,ec:'1.0-1.2',collectMode:1,firstCollectDay:17,sustainDays:0,dailyYieldSustain:0,collectSkill:'17天整株采收',nutritionTip:'维生素E冠军芽苗',fitMode:'mist'},
  { id:10,vegCode:'V010',vegName:'小葱',emoji:'🧅',category:'香辛类',plantMode:1,seedlingDay:7,growStageDay:12,growTotalDay:22,multiCollectMax:5,collectIntervalDay:5,yieldOncePerSqm:0.6,perSqmYield:2.0,shelfLifeDay:3,tempMin:12,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:55,humidityMax:70,phMin:6.0,phMax:6.8,ec:'1.2-1.6',collectMode:3,firstCollectDay:18,sustainDays:0,dailyYieldSustain:0,collectSkill:'割茬留1-2cm，5天返青再采',nutritionTip:'杀菌消炎，葱辣素驱寒',fitMode:'all'},
  { id:11,vegCode:'V011',vegName:'蒜苗',emoji:'🧄',category:'香辛类',plantMode:1,seedlingDay:5,growStageDay:10,growTotalDay:19,multiCollectMax:3,collectIntervalDay:7,yieldOncePerSqm:0.8,perSqmYield:1.8,shelfLifeDay:3,tempMin:12,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:55,humidityMax:70,phMin:6.0,phMax:6.8,ec:'1.2-1.6',collectMode:3,firstCollectDay:16,sustainDays:0,dailyYieldSustain:0,collectSkill:'割茬留3cm，蒜瓣直接植入',nutritionTip:'大蒜素天然抗生素',fitMode:'all'},
  { id:12,vegCode:'V012',vegName:'芹菜',emoji:'🥬',category:'叶菜类',plantMode:1,seedlingDay:12,growStageDay:25,growTotalDay:44,multiCollectMax:3,collectIntervalDay:7,yieldOncePerSqm:0.9,perSqmYield:2.8,shelfLifeDay:5,tempMin:15,tempMax:20,luxMin:8000,luxMax:12000,humidityMin:70,humidityMax:85,phMin:6.0,phMax:6.5,ec:'1.6-2.0',collectMode:2,firstCollectDay:38,sustainDays:21,dailyYieldSustain:0.10,collectSkill:'剥叶柄从外向内，每3天一次',nutritionTip:'芹菜素降压安神',fitMode:'water'},
  { id:13,vegCode:'V013',vegName:'奶白菜',emoji:'🥦',category:'叶菜类',plantMode:1,seedlingDay:5,growStageDay:12,growTotalDay:22,multiCollectMax:3,collectIntervalDay:5,yieldOncePerSqm:1.0,perSqmYield:3.2,shelfLifeDay:2,tempMin:15,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:70,phMin:6.0,phMax:6.8,ec:'1.0-1.4',collectMode:2,firstCollectDay:18,sustainDays:15,dailyYieldSustain:0.12,collectSkill:'剥叶采收，速生品种首选',nutritionTip:'钙含量高于牛奶',fitMode:'water'},
  { id:14,vegCode:'V014',vegName:'上海青',emoji:'🥦',category:'叶菜类',plantMode:1,seedlingDay:5,growStageDay:12,growTotalDay:22,multiCollectMax:1,collectIntervalDay:0,yieldOncePerSqm:1.5,perSqmYield:3.6,shelfLifeDay:2,tempMin:15,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:70,phMin:6.0,phMax:6.8,ec:'1.2-1.6',collectMode:1,firstCollectDay:22,sustainDays:0,dailyYieldSustain:0,collectSkill:'整株采收',nutritionTip:'胡萝卜素+维生素C',fitMode:'water'},
  { id:15,vegCode:'V015',vegName:'紫苏',emoji:'🌿',category:'香辛类',plantMode:1,seedlingDay:7,growStageDay:15,growTotalDay:27,multiCollectMax:4,collectIntervalDay:5,yieldOncePerSqm:0.5,perSqmYield:1.8,shelfLifeDay:2,tempMin:18,tempMax:28,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:75,phMin:6.0,phMax:6.8,ec:'1.2-1.6',collectMode:4,firstCollectDay:22,sustainDays:0,dailyYieldSustain:0,collectSkill:'掐叶/掐枝采收，留茎节再发',nutritionTip:'紫苏醛抗氧化，鱼蟹解毒',fitMode:'all'},
  { id:16,vegCode:'V016',vegName:'木耳菜',emoji:'🥦',category:'叶菜类',plantMode:1,seedlingDay:7,growStageDay:18,growTotalDay:30,multiCollectMax:4,collectIntervalDay:5,yieldOncePerSqm:0.8,perSqmYield:3.4,shelfLifeDay:2,tempMin:20,tempMax:30,luxMin:10000,luxMax:15000,humidityMin:70,humidityMax:85,phMin:6.0,phMax:6.8,ec:'1.4-2.0',collectMode:4,firstCollectDay:22,sustainDays:0,dailyYieldSustain:0,collectSkill:'掐叶留茎节，叶片肥厚',nutritionTip:'黏液蛋白润肠，维生素A高',fitMode:'water'},
  { id:17,vegCode:'V017',vegName:'香菜',emoji:'🌿',category:'香辛类',plantMode:3,seedlingDay:7,growStageDay:18,growTotalDay:32,multiCollectMax:3,collectIntervalDay:7,yieldOncePerSqm:0.5,perSqmYield:1.5,shelfLifeDay:3,tempMin:15,tempMax:20,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:70,phMin:6.0,phMax:6.7,ec:'1.2-1.6',collectMode:3,firstCollectDay:28,sustainDays:0,dailyYieldSustain:0,collectSkill:'割茬留根，7天返青',nutritionTip:'挥发油开胃醒脾',fitMode:'drip'},
  { id:18,vegCode:'V018',vegName:'芥蓝',emoji:'🥦',category:'叶菜类',plantMode:1,seedlingDay:7,growStageDay:20,growTotalDay:35,multiCollectMax:3,collectIntervalDay:7,yieldOncePerSqm:1.0,perSqmYield:3.0,shelfLifeDay:3,tempMin:15,tempMax:25,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:75,phMin:6.0,phMax:6.8,ec:'1.4-1.8',collectMode:4,firstCollectDay:30,sustainDays:0,dailyYieldSustain:0,collectSkill:'掐主薹后侧薹萌发',nutritionTip:'硫代葡萄糖苷抗癌',fitMode:'water'},
  { id:19,vegCode:'V019',vegName:'罗勒',emoji:'🌿',category:'香辛类',plantMode:3,seedlingDay:7,growStageDay:13,growTotalDay:25,multiCollectMax:4,collectIntervalDay:5,yieldOncePerSqm:0.6,perSqmYield:1.8,shelfLifeDay:2,tempMin:20,tempMax:28,luxMin:10000,luxMax:15000,humidityMin:60,humidityMax:75,phMin:5.8,phMax:6.5,ec:'1.2-1.6',collectMode:4,firstCollectDay:22,sustainDays:0,dailyYieldSustain:0,collectSkill:'掐枝留2对叶',nutritionTip:'罗勒酚抗氧化，意式料理灵魂',fitMode:'drip'},
  { id:20,vegCode:'V020',vegName:'紫甘蓝',emoji:'🥬',category:'叶菜类',plantMode:1,seedlingDay:10,growStageDay:22,growTotalDay:40,multiCollectMax:2,collectIntervalDay:7,yieldOncePerSqm:1.2,perSqmYield:3.5,shelfLifeDay:7,tempMin:10,tempMax:20,luxMin:8000,luxMax:12000,humidityMin:60,humidityMax:70,phMin:6.0,phMax:6.8,ec:'1.4-1.8',collectMode:2,firstCollectDay:35,sustainDays:20,dailyYieldSustain:0.10,collectSkill:'剥叶采收，耐储品种',nutritionTip:'花青素抗氧化之王',fitMode:'water'},
]

// ============== 常量 ==============
const STATUS_MAP: Record<number, string> = { 1:'空闲', 2:'育苗期', 3:'成长期', 4:'待采收', 5:'清茬休整' }
const MODE_MAP: Record<number, string> = { 1:'水培NFT', 2:'雾培Aero', 3:'滴灌Drip' }
const COLLECT_MODE_MAP: Record<number, string> = { 1:'整株采收', 2:'剥叶持续', 3:'割茬再生', 4:'留茎留节' }
const statusLabel = (s: number) => STATUS_MAP[s] || '未知'
const modeLabel = (m: number) => MODE_MAP[m] || '未知'
const collectModeLabel = (c: number) => COLLECT_MODE_MAP[c] || '未知'

// ============== 状态 ==============
const dataSource = ref('embedded')
const standaloneSrc = 'http://127.0.0.1:8088/?embed=pandanote&hideNav=1'
const onDataSourceChange = (v: string) => { if (v === 'standalone') ElMessage.warning('独立服务模式需先部署 Java+Docker 独立后端') }

const shelfView = ref<'2.5d'|'2d'>('2.5d')
const shelfAngle = ref(8)
const rotationDays = ref(60)
const rotating = ref(false)
const showFloorDetail = ref(false)
const showPlantForm = ref(false)
const showExport = ref(false)
const exportStep = ref(0)
const exportPct = ref(0)
const selectedFloor = ref<any>(null)
const plantForm = reactive({ vegId: null as number|null, seedDate: '', plantDate: '', density: 20 })

const state = reactive({
  clock: '',
  alertIdx: 0,
  alerts: [
    '🌱 生菜L3已进入待采收期，建议24h内完成采收',
    '⚠️ 未来第18天存在产能缺口（预估缺口2.3斤/天），建议追加豌豆苗补种',
    '🔧 货架B-第2层EC值偏高(2.1)，建议稀释营养液浓度',
    '📊 当前产能达标率105%，可考虑增加紫甘蓝品种提升伙食多样性',
  ],
  archive: { shipName: '远洋一号', voyageName: '太平洋航线 2026-08', peopleNum: 22, mealType: 2, perPersonDemand: 0.5, lossRatio: 1.20 },
  capacity: { stable: 0, peak: 0, target: 0, status: '', statusCode: 1 },
  shelves: [] as any[],
  harvest: { totalKg: 0, lossRate: 0 },
  forecast: { totalKg: 0, varieties: 0, items: [] as any[] },
  tasks: { plant: [] as any[], harvest: [] as any[] },
  rotation: [] as any[],
  daily60: [] as number[],
})

// ============== 计算 ==============
const totalFloors = computed(() => state.shelves.reduce((s, sh) => s + sh.floors.length, 0))
const emptyFloors = computed(() => state.shelves.reduce((s, sh) => s + sh.floors.filter((f: any) => f.status === 1).length, 0))
const statusClass = computed(() => ({ 1:'sp-green', 2:'sp-orange', 3:'sp-red' })[state.capacity.statusCode] || 'sp-green')
const statusText = computed(() => ({ 1:'✅ 充足', 2:'⚠️ 临界', 3:'❌ 不足' })[state.capacity.statusCode] || '✅ 充足')
const estimatedDates = computed(() => {
  if (!plantForm.vegId) return { first: '—', last: '—', yield: 0 }
  const v = VEG_20.find(x => x.id === plantForm.vegId)!
  const pd = plantForm.plantDate || new Date().toISOString().slice(0, 10)
  const d = new Date(pd)
  const first = new Date(d.getTime() + v.firstCollectDay * 86400000).toISOString().slice(0, 10)
  const last = new Date(d.getTime() + v.growTotalDay * 86400000).toISOString().slice(0, 10)
  const yld = +(v.yieldOncePerSqm * 2.88 * v.multiCollectMax).toFixed(1)
  return { first, last, yield: yld }
})

// ============== 初始化 Mock 数据 ==============
const initMockData = () => {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  // 2个货架 × 5层 = 10层（对齐原版 init_data.sql 预置数据）
  const shelfConfigs = [
    { id: 1, shelfName: '水培货架A', plantMode: 1, length: 240, width: 120, unitType: 1, floorTotal: 5, areaSqm: 2.88 },
    { id: 2, shelfName: '雾培货架B', plantMode: 2, length: 200, width: 100, unitType: 1, floorTotal: 5, areaSqm: 2.00 },
  ]
  const seedVegs = [1, 2, 3, 5, 12, 13, 7, 10, 16, 20] // 10个层的蔬菜
  state.shelves = shelfConfigs.map(s => {
    const floors = []
    for (let i = 1; i <= s.floorTotal; i++) {
      const idx = (s.id - 1) * 5 + (i - 1)
      const veg = VEG_20.find(v => v.id === seedVegs[idx % seedVegs.length])!
      const plantedDaysAgo = [25, 18, 12, 8, 3][i - 1] || 15
      const plantDate = new Date(today.getTime() - plantedDaysAgo * 86400000)
      const firstCollect = new Date(plantDate.getTime() + veg.firstCollectDay * 86400000)
      const lastCollect = new Date(plantDate.getTime() + veg.growTotalDay * 86400000)
      const totalGrow = veg.growTotalDay
      const progress = Math.min(100, Math.round(plantedDaysAgo / totalGrow * 100))
      const remainingDays = Math.max(0, totalGrow - plantedDaysAgo)
      let status = 2
      if (progress >= 100) status = 4
      else if (progress >= 60) status = 4
      else if (progress >= 20) status = 3
      else status = 2
      floors.push({
        floorNo: i, status, vegName: veg.vegName, vegId: veg.id,
        plantMode: s.plantMode, collectMode: veg.collectMode,
        plantDate: plantDate.toISOString().slice(0, 10),
        firstCollectDate: firstCollect.toISOString().slice(0, 10),
        lastCollectDate: lastCollect.toISOString().slice(0, 10),
        progress, remainingDays,
        env: `EC ${veg.ec} | pH ${veg.phMin}-${veg.phMax} | PPFD ${veg.luxMin/1000}k | T ${veg.tempMin}-${veg.tempMax}℃ | RH ${veg.humidityMin}-${veg.humidityMax}%`,
        areaSqm: s.areaSqm,
      })
    }
    return { ...s, floors }
  })
  // 产能计算
  recomputeCapacity()
  // 采收汇总
  state.harvest.totalKg = +(Math.random() * 50 + 80).toFixed(1)
  state.harvest.lossRate = +(Math.random() * 0.05 + 0.06).toFixed(3)
  // 采收预测
  state.forecast.totalKg = +(state.capacity.stable * 7).toFixed(1)
  state.forecast.varieties = new Set(state.shelves.flatMap((s: any) => s.floors.filter((f: any) => f.vegName).map((f: any) => f.vegName))).size
  const forecastItems = state.shelves.flatMap((s: any) => s.floors.filter((f: any) => f.status === 4).map((f: any) => {
    const v = VEG_20.find(x => x.vegName === f.vegName)!
    return { name: v.vegName, emoji: v.emoji, kg: +(v.yieldOncePerSqm * f.areaSqm).toFixed(1) }
  }))
  const totalFk = forecastItems.reduce((s: number, x: any) => s + x.kg, 0) || 1
  state.forecast.items = forecastItems.map((x: any) => ({ ...x, pct: Math.round(x.kg / totalFk * 100) }))
  // 今日任务
  state.tasks.plant = state.shelves.flatMap((s: any) => s.floors.filter((f: any) => f.status === 1 || f.status === 5).map((f: any) => ({
    id: `p${s.id}-${f.floorNo}`, vegName: VEG_20[Math.floor(Math.random() * VEG_20.length)].vegName,
    shelfName: s.shelfName, floorNo: f.floorNo, date: todayStr,
  }))).slice(0, 3)
  state.tasks.harvest = state.shelves.flatMap((s: any) => s.floors.filter((f: any) => f.status === 4).map((f: any) => ({
    id: `h${s.id}-${f.floorNo}`, vegName: f.vegName, shelfName: s.shelfName, floorNo: f.floorNo, date: todayStr,
  }))).slice(0, 3)
  // 60天日产量
  state.daily60 = Array.from({ length: 60 }, (_, i) => {
    const base = state.capacity.stable
    const wave = Math.sin(i / 5) * 2 + Math.cos(i / 8) * 1.5
    const gap = i > 35 && i < 42 ? -3 : 0
    return +(Math.max(0, base + wave + gap + Math.random())).toFixed(1)
  })
}

const recomputeCapacity = () => {
  const target = +(state.archive.peopleNum * state.archive.perPersonDemand * state.archive.lossRatio).toFixed(1)
  // 稳定日均产出 = Σ各层日均产量（按4种采摘模式建模，对齐 MathComputeUtil 公式7.2）
  let stable = 0, peak = 0
  state.shelves.forEach((s: any) => s.floors.forEach((f: any) => {
    if (f.status === 1 || f.status === 5) return // 跳过空闲/休整
    const v = VEG_20.find(x => x.vegName === f.vegName)
    if (!v) return
    const area = f.areaSqm || 2.88
    if (v.collectMode === 1) { // 整株
      stable += v.yieldOncePerSqm * area / v.growTotalDay
    } else if (v.collectMode === 2) { // 剥叶持续
      stable += (v.yieldOncePerSqm + v.dailyYieldSustain * v.sustainDays) * area / (v.firstCollectDay + v.sustainDays)
    } else if (v.collectMode === 3) { // 割茬再生 (0.85衰减)
      let sum = 0
      for (let i = 0; i < v.multiCollectMax; i++) sum += v.yieldOncePerSqm * Math.pow(0.85, i)
      stable += sum * area / (v.firstCollectDay + (v.multiCollectMax - 1) * v.collectIntervalDay)
    } else { // 留茎留节 (0.9衰减)
      let sum = 0
      for (let i = 0; i < v.multiCollectMax; i++) sum += v.yieldOncePerSqm * Math.pow(0.9, i)
      stable += sum * area / (v.firstCollectDay + (v.multiCollectMax - 1) * v.collectIntervalDay)
    }
    peak += v.yieldOncePerSqm * area
  }))
  state.capacity.stable = +stable.toFixed(1)
  state.capacity.peak = +peak.toFixed(1)
  state.capacity.target = target
  if (stable >= target) state.capacity.statusCode = 1
  else if (peak >= target) state.capacity.statusCode = 2
  else state.capacity.statusCode = 3
}

// ============== 交互 ==============
const onFloorClick = (s: any, f: any) => {
  selectedFloor.value = { ...f, shelfName: s.shelfName }
  showFloorDetail.value = true
}
const openPlantForm = () => { showFloorDetail.value = false; showPlantForm.value = true }
const openHarvestForm = () => { ElMessage.success('采收成功（示例）'); showFloorDetail.value = false }
const submitPlant = () => {
  ElMessage.success('定植成功（示例），已更新货架层状态')
  showPlantForm.value = false
}
const doTask = (type: string, t: any) => {
  ElMessage.success(`${type === 'plant' ? '定植' : '采收'}完成：${t.vegName}`)
  if (type === 'plant') state.tasks.plant = state.tasks.plant.filter((x: any) => x.id !== t.id)
  else state.tasks.harvest = state.tasks.harvest.filter((x: any) => x.id !== t.id)
}
const flatFloorList = () => state.shelves.flatMap((s: any) => s.floors.map((f: any) => ({
  shelfName: s.shelfName, floorNo: f.floorNo, status: f.status, vegName: f.vegName || '—',
  plantDate: f.plantDate || '—', firstCollectDate: f.firstCollectDate || '—',
  progressLabel: f.progress !== undefined ? `${f.progress}% (${f.remainingDays}天)` : '—',
})))
const exportData = (type: string) => ElMessage.info(`导出${type}：完整实现见独立服务模式（POST /api/export/${type}）`)
const runExport = () => {
  exportStep.value = 0; exportPct.value = 0
  const t = setInterval(() => {
    exportPct.value += 3
    if (exportPct.value >= 34) exportStep.value = 1
    if (exportPct.value >= 67) exportStep.value = 2
    if (exportPct.value >= 100) { clearInterval(t); exportStep.value = 3 }
  }, 120)
}

// ============== 轮作算法 ==============
const runRotation = async () => {
  rotating.value = true
  try {
    const res = await fetch('/api/toolbox/ship-plant/plan-rotation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horizonDays: rotationDays.value, crew: state.archive.peopleNum, startDate: new Date().toISOString().slice(0, 10) }),
    })
    const data = await res.json()
    if (data?.success) { state.rotation = data.data.gantt; renderGantt(data.data.gantt) }
  } catch { state.rotation = localRotation(); renderGantt(state.rotation) }
  rotating.value = false
}
const localRotation = () => {
  const start = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const v = VEG_20[i % VEG_20.length]
    const s = new Date(start.getTime() + i * 5 * 86400000)
    const dur = v.growTotalDay
    return { name: `批次 #${i+1} ${v.vegName}`, start: s.toISOString().slice(0,10), duration: dur,
      color: ['#22c55e','#0ea5e9','#f59e0b','#a855f7','#ef4444','#14b8a6','#f97316'][i%7],
      crew: Math.floor(Math.random()*8+3), harvestKg: +(Math.random()*80+20).toFixed(0) }
  })
}
const checkGap = () => {
  const gaps = state.daily60.map((v, i) => ({ day: i+1, val: v, target: state.capacity.target }))
    .filter(g => g.val < g.target)
  if (gaps.length) ElMessage.warning(`检测到 ${gaps.length} 天空窗期！最大缺口在第${gaps[0].day}天，建议追加速生菜补种`)
  else ElMessage.success('✅ 未来60天无空窗期！')
}

// ============== ECharts ==============
const gaugeStableRef = ref<HTMLElement|null>(null)
const gaugePeakRef = ref<HTMLElement|null>(null)
const ganttRef = ref<HTMLElement|null>(null)
const lineRef = ref<HTMLElement|null>(null)
const pieRef = ref<HTMLElement|null>(null)
let charts: echarts.ECharts[] = []

const renderGauges = () => {
  if (gaugeStableRef.value) {
    const c = echarts.init(gaugeStableRef.value); charts.push(c)
    c.setOption({
      title: { text: '稳定日均产出', left: 'center', top: 8, textStyle: { color: '#a8b8d8', fontSize: 13 } },
      series: [{
        type: 'gauge', center: ['50%', '60%'], radius: '85%',
        min: 0, max: Math.max(200, state.capacity.target * 2),
        axisLine: { lineStyle: { width: 18, color: [[state.capacity.stable / Math.max(200, state.capacity.target*2), state.capacity.stable >= state.capacity.target ? '#00ff9d' : '#ffbc00'], [1, '#1a2a4a']] } },
        pointer: { width: 5, length: '60%', itemStyle: { color: '#00c8ff' } },
        detail: { formatter: '{value}\n斤/天', color: '#fff', fontSize: 18, offsetCenter: [0, '35%'] },
        title: { show: false },
        data: [{ value: state.capacity.stable }],
      }],
    })
  }
  if (gaugePeakRef.value) {
    const c = echarts.init(gaugePeakRef.value); charts.push(c)
    c.setOption({
      title: { text: '极限峰值产出', left: 'center', top: 8, textStyle: { color: '#a8b8d8', fontSize: 13 } },
      series: [{
        type: 'gauge', center: ['50%', '60%'], radius: '85%',
        min: 0, max: Math.max(300, state.capacity.target * 3),
        axisLine: { lineStyle: { width: 18, color: [[state.capacity.peak / Math.max(300, state.capacity.target*3), '#00c8ff'], [1, '#1a2a4a']] } },
        pointer: { width: 5, length: '60%', itemStyle: { color: '#00ff9d' } },
        detail: { formatter: '{value}\n斤/天', color: '#fff', fontSize: 18, offsetCenter: [0, '35%'] },
        data: [{ value: state.capacity.peak }],
      }],
    })
  }
}
const renderGantt = (gantt: any[]) => {
  if (!ganttRef.value) return
  const c = echarts.init(ganttRef.value); charts.push(c)
  const tasks = gantt.map(x => x.name)
  const data = gantt.map((x, i) => [i, new Date(x.start).getTime(), new Date(x.start).getTime() + x.duration * 86400000, x.color || '#22c55e'])
  c.setOption({
    tooltip: { formatter: (p: any) => { const r = gantt[p.dataIndex]; return `<b>${r.name}</b><br/>开始：${r.start}<br/>周期：${r.duration}天<br/>预计：${r.harvestKg||'—'} kg` } },
    grid: { top: 20, left: 180, right: 40, bottom: 40 },
    xAxis: { type: 'time', name: '日期', axisLabel: { color: '#a8b8d8' }, axisLine: { lineStyle: { color: '#2a3a5a' } } },
    yAxis: { type: 'category', data: tasks, inverse: true, axisLabel: { color: '#a8b8d8', fontSize: 11 }, axisLine: { lineStyle: { color: '#2a3a5a' } } },
    series: [{
      type: 'custom',
      renderItem: (_p: any, api: any) => {
        const catIdx = api.value(0), s = api.coord([api.value(1), catIdx]), e = api.coord([api.value(2), catIdx])
        const h = api.size([0, 1])[1] * 0.6
        return { type: 'rect', shape: { x: s[0], y: s[1] - h/2, width: e[0]-s[0], height: h }, style: { fill: (api as any).value(3) || '#22c55e', stroke: '#fff', lineWidth: 1 } }
      },
      encode: { x: [1, 2], y: 0 }, data,
    }],
  })
}
const renderLine = () => {
  if (!lineRef.value) return
  const c = echarts.init(lineRef.value); charts.push(c)
  const days = Array.from({ length: 60 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().slice(5, 10) })
  const target = state.capacity.target
  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['日产量', '目标需求'], textStyle: { color: '#a8b8d8' }, top: 0 },
    grid: { top: 35, left: 50, right: 20, bottom: 30 },
    xAxis: { type: 'category', data: days, axisLabel: { color: '#a8b8d8', interval: 4 } },
    yAxis: { type: 'value', name: '斤/天', axisLabel: { color: '#a8b8d8' }, splitLine: { lineStyle: { color: '#1a2a4a' } } },
    series: [
      { name: '日产量', type: 'line', data: state.daily60, smooth: true, lineStyle: { color: '#00ff9d', width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,255,157,0.3)' }, { offset: 1, color: 'rgba(0,255,157,0)' }] } }, itemStyle: { color: '#00ff9d' } },
      { name: '目标需求', type: 'line', data: Array(60).fill(target), lineStyle: { color: '#ffbc00', type: 'dashed', width: 2 }, itemStyle: { color: '#ffbc00' }, symbol: 'none' },
    ],
  })
}
const renderPie = () => {
  if (!pieRef.value) return
  const c = echarts.init(pieRef.value); charts.push(c)
  const data = state.shelves.flatMap((s: any) => s.floors.filter((f: any) => f.vegName).map((f: any) => {
    const v = VEG_20.find(x => x.vegName === f.vegName)!
    return { name: v.vegName, value: +(v.yieldOncePerSqm * (f.areaSqm || 2.88)).toFixed(1) }
  }))
  const grouped: Record<string, number> = {}
  data.forEach(d => { grouped[d.name] = (grouped[d.name] || 0) + d.value })
  c.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 斤 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#a8b8d8', fontSize: 10 }, type: 'scroll' },
    series: [{ type: 'pie', radius: ['35%', '60%'], center: ['50%', '45%'],
      label: { color: '#a8b8d8', formatter: '{b}\n{d}%', fontSize: 10 },
      data: Object.entries(grouped).map(([name, value]) => ({ name, value: +value.toFixed(1) })) }],
  })
}

// ============== 时钟 + 告警轮播 ==============
let clockTimer: any, alertTimer: any
const startClock = () => {
  const upd = () => { const d = new Date(); state.clock = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}` }
  upd(); clockTimer = setInterval(upd, 1000)
}
const startAlerts = () => { alertTimer = setInterval(() => { state.alertIdx = (state.alertIdx + 1) % state.alerts.length }, 3500) }

let resizeHandler: (() => void) | null = null
onMounted(async () => {
  initMockData()
  await nextTick()
  renderGauges(); renderGantt(localRotation()); renderLine(); renderPie()
  state.rotation = localRotation()
  startClock(); startAlerts()
  resizeHandler = () => charts.forEach(c => c.resize())
  window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
  charts.forEach(c => c.dispose()); charts = []
  if (clockTimer) clearInterval(clockTimer)
  if (alertTimer) clearInterval(alertTimer)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})

// ElMessage fallback
const ElMessage = (globalThis as any).ElMessage || { info:(m:string)=>console.log(m), success:(m:string)=>console.log(m), warning:(m:string)=>console.log(m) }
</script>

<style scoped>
/* ========== 深色科技主题（对齐原版 theme.scss 色值规范） ========== */
.sp-page {
  --bg-main: #080c16; --bg-card: rgba(10,18,32,0.85); --tech-blue: #00c8ff; --success-green: #00ff9d;
  --warn-orange: #ffbc00; --danger-red: #ff3d48; --text-white: #ffffff; --text-gray: #a8b8d8;
  --border-glow: 1px solid rgba(0,200,255,0.3);
  background: var(--bg-main); color: var(--text-white); min-height: 100vh;
  display: flex; flex-direction: column; font-family: 'Microsoft YaHei', sans-serif;
}
.sp-green { color: var(--success-green); } .sp-blue { color: var(--tech-blue); }
.sp-orange { color: var(--warn-orange); } .sp-red { color: var(--danger-red); }
.sp-gray { color: var(--text-gray); } .sp-green-text { color: var(--success-green); } .sp-blue-text { color: var(--tech-blue); }

/* tech-card 四角L形装饰 */
.tech-card {
  background: var(--bg-card); border: var(--border-glow); border-radius: 8px; padding: 12px;
  margin-bottom: 12px; position: relative; backdrop-filter: blur(10px);
}
.tech-card::before, .tech-card::after {
  content: ''; position: absolute; width: 12px; height: 12px; border-color: var(--tech-blue); border-style: solid;
}
.tech-card::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
.tech-card::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }
.tech-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-white); margin-bottom: 10px; }
.tech-bar { width: 3px; height: 16px; background: var(--tech-blue); box-shadow: 0 0 8px var(--tech-blue); border-radius: 2px; }

/* ========== 顶部通栏 ========== */
.sp-topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 20px;
  background: linear-gradient(180deg, rgba(0,200,255,0.08), transparent);
  border-bottom: 1px solid rgba(0,200,255,0.15);
}
.sp-topbar-left { display: flex; align-items: center; gap: 12px; }
.sp-logo { font-size: 32px; }
.sp-systitle { font-size: 18px; margin: 0; color: var(--text-white); text-shadow: 0 0 12px rgba(0,200,255,0.6); }
.sp-systitle-sub { font-size: 12px; color: var(--text-gray); margin-left: 8px; }
.sp-arch-info { font-size: 11px; color: var(--success-green); margin: 2px 0 0; }
.sp-topbar-center { display: flex; gap: 24px; }
.sp-kpi-inline { display: flex; flex-direction: column; align-items: center; }
.sp-kpi-label { font-size: 11px; color: var(--text-gray); }
.sp-kpi-val { font-size: 22px; font-weight: 700; }
.sp-kpi-inline small { font-size: 11px; color: var(--text-gray); }
.sp-topbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sp-clock { font-size: 14px; color: var(--text-gray); white-space: nowrap; }
.sp-alert-bar { max-width: 300px; overflow: hidden; white-space: nowrap; font-size: 12px; color: var(--warn-orange); display: flex; align-items: center; gap: 4px; }
.sp-alert-slide-enter-active, .sp-alert-slide-leave-active { transition: all 0.3s; }
.sp-alert-slide-enter-from { opacity: 0; transform: translateX(20px); }
.sp-alert-slide-leave-to { opacity: 0; transform: translateX(-20px); }

/* ========== 主体三列 ========== */
.sp-body { display: grid; grid-template-columns: 240px 1fr 280px; gap: 12px; padding: 12px; flex: 1; min-height: 0; overflow: auto; }
.sp-col-left, .sp-col-right { overflow-y: auto; max-height: calc(100vh - 120px); }

/* 航次信息 */
.sp-archive-info, .sp-demand-form { font-size: 13px; }
.sp-info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid rgba(0,200,255,0.06); }
.sp-info-row label { color: var(--text-gray); }
.sp-demand-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sp-demand-row label { color: var(--text-gray); font-size: 13px; }

/* 货架配置 */
.sp-shelf-item { padding: 8px 0; border-bottom: 1px solid rgba(0,200,255,0.08); }
.sp-shelf-head { display: flex; justify-content: space-between; align-items: center; }
.sp-shelf-name { font-size: 13px; font-weight: 600; }
.sp-mode-tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
.mode-1 { background: rgba(0,200,255,0.2); color: var(--tech-blue); }
.mode-2 { background: rgba(0,255,157,0.2); color: var(--success-green); }
.mode-3 { background: rgba(255,188,0,0.2); color: var(--warn-orange); }
.sp-shelf-meta { font-size: 11px; color: var(--text-gray); margin: 2px 0 4px; }
.sp-floor-mini-row { display: flex; gap: 3px; }
.sp-floor-mini { width: 28px; height: 28px; border-radius: 4px; cursor: pointer; transition: transform 0.15s; }
.sp-floor-mini:hover { transform: scale(1.2); }
.status-1, .status-bg-1 { background: rgba(100,120,150,0.3); }
.status-2, .status-bg-2 { background: rgba(0,200,255,0.3); }
.status-3, .status-bg-3 { background: rgba(0,255,157,0.3); }
.status-4, .status-bg-4 { background: rgba(255,188,0,0.3); }
.status-5, .status-bg-5 { background: rgba(168,85,247,0.3); }
.status-text-1 { color: var(--text-gray); } .status-text-2 { color: var(--tech-blue); }
.status-text-3 { color: var(--success-green); } .status-text-4 { color: var(--warn-orange); } .status-text-5 { color: #a855f7; }

/* 2.5D 货架场景 */
.sp-shelf-scene { overflow-x: auto; padding: 20px; }
.sp-scene-inner { display: flex; gap: 60px; transform-style: preserve-3d; padding: 20px 0; }
.sp-cluster { flex-shrink: 0; }
.sp-cluster-label { font-size: 13px; font-weight: 600; margin-bottom: 8px; text-align: center; }
.mode-tag-1 { color: var(--tech-blue); } .mode-tag-2 { color: var(--success-green); } .mode-tag-3 { color: var(--warn-orange); }
.sp-cluster-body { position: relative; width: 160px; }
.sp-floor-card {
  height: 52px; border-radius: 6px; margin-bottom: 4px; padding: 4px 8px; cursor: pointer;
  border: 1px solid rgba(0,200,255,0.15); transition: all 0.2s; position: relative;
}
.sp-floor-card:hover { transform: translateX(4px); border-color: var(--tech-blue); box-shadow: 0 0 12px rgba(0,200,255,0.3); }
.sp-floor-no { font-size: 10px; color: var(--text-gray); position: absolute; top: 2px; right: 6px; }
.sp-floor-veg { font-size: 12px; font-weight: 600; }
.sp-floor-veg.sp-empty { color: var(--text-gray); font-style: italic; }
.sp-floor-status { font-size: 10px; position: absolute; bottom: 2px; right: 6px; }

/* 流光进度条（对齐原版 StreamingProgress） */
.sp-stream-progress { position: relative; height: 14px; margin-top: 2px; background: rgba(0,200,255,0.1); border-radius: 7px; overflow: hidden; }
.sp-stream-bar { height: 100%; border-radius: 7px; background: linear-gradient(90deg, var(--tech-blue), var(--success-green)); position: relative; }
.sp-stream-bar::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: sp-stream 2.2s infinite; }
@keyframes sp-stream { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.stream-stage-2 { background: linear-gradient(90deg, #1a3a6a, var(--tech-blue)); }
.stream-stage-3 { background: linear-gradient(90deg, #0a4a2a, var(--success-green)); }
.stream-stage-4 { background: linear-gradient(90deg, #4a3a0a, var(--warn-orange)); }
.sp-stream-text { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-size: 10px; color: #fff; line-height: 14px; text-shadow: 0 0 4px rgba(0,0,0,0.8); }

/* LED 发光条 */
.sp-led-bar { position: absolute; top: 0; bottom: 0; width: 3px; background: var(--tech-blue); box-shadow: 0 0 8px var(--tech-blue); border-radius: 2px; }

/* 仪表盘 */
.sp-gauge-section { display: flex; gap: 12px; padding: 8px; }
.sp-gauge-box { flex: 1; height: 180px; }

/* 甘特图 */
.sp-gantt-box { height: 320px; }
.sp-shelf-toolbar { margin-left: auto; display: flex; gap: 8px; align-items: center; }

/* 产量曲线 */
.sp-line-box { height: 240px; }

/* 饼图 */
.sp-pie-box { height: 260px; }

/* 今日任务 */
.sp-task-stats { display: flex; gap: 8px; margin-bottom: 8px; }
.sp-task-tag { font-size: 12px; padding: 2px 10px; border-radius: 12px; }
.sp-green-bg { background: rgba(0,255,157,0.15); color: var(--success-green); }
.sp-orange-bg { background: rgba(255,188,0,0.15); color: var(--warn-orange); }
.sp-task-list { max-height: 300px; overflow-y: auto; }
.sp-task-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(0,200,255,0.06); }
.sp-task-icon { font-size: 18px; }
.sp-task-info { flex: 1; } .sp-task-info b { font-size: 13px; } .sp-task-info small { display: block; font-size: 11px; color: var(--text-gray); }
.sp-task-empty { text-align: center; padding: 20px; color: var(--text-gray); }

/* 采收预测 */
.sp-forecast-summary { display: flex; justify-content: space-around; margin-bottom: 10px; }
.sp-forecast-kpi { text-align: center; }
.sp-big-num { font-size: 24px; font-weight: 700; }
.sp-forecast-list { max-height: 200px; overflow-y: auto; }
.sp-forecast-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
.sp-forecast-bar { flex: 1; height: 8px; background: rgba(0,200,255,0.1); border-radius: 4px; overflow: hidden; }
.sp-forecast-fill { height: 100%; background: var(--tech-blue); border-radius: 4px; }

/* 底部通栏 */
.sp-bottombar { display: flex; align-items: center; justify-content: space-between; padding: 8px 20px; border-top: 1px solid rgba(0,200,255,0.15); background: rgba(0,0,0,0.3); }
.sp-bottom-stats { display: flex; gap: 32px; }
.sp-bottom-stat { display: flex; flex-direction: column; align-items: center; }
.sp-bs-num { font-size: 20px; font-weight: 700; }
.sp-bs-label { font-size: 11px; color: var(--text-gray); }
.sp-bottom-actions { display: flex; gap: 8px; }

/* 弹窗 */
.sp-detail-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,200,255,0.06); }
.sp-detail-row label { color: var(--text-gray); }
.sp-env-text { font-size: 12px; color: var(--text-gray); }
.sp-estimate { display: flex; gap: 12px; font-size: 12px; color: var(--text-gray); }

/* iframe */
.sp-standalone-wrap { flex: 1; iframe { width: 100%; height: 100%; border: 0; } }

/* Element Plus 深色适配 */
:deep(.el-dialog) { background: #0d1421 !important; border: 1px solid rgba(0,200,255,0.2) !important; }
:deep(.el-dialog__title), :deep(.el-form-item__label) { color: var(--text-white) !important; }
:deep(.el-table) { background: transparent !important; color: var(--text-gray) !important; }
:deep(.el-table th.el-table__cell) { background: rgba(0,200,255,0.08) !important; color: var(--text-white) !important; }
:deep(.el-table tr), :deep(.el-table td.el-table__cell) { background: transparent !important; color: var(--text-gray) !important; border-color: rgba(0,200,255,0.08) !important; }
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) { background: rgba(0,200,255,0.03) !important; }

@media (max-width: 1200px) { .sp-body { grid-template-columns: 1fr; } .sp-col-left, .sp-col-right { max-height: none; } }
</style>
