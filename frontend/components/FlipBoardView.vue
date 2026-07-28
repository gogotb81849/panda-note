<template>
  <div class="flip-board-view">
    <div class="flip-board-container" v-loading="loading">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="statusFilter" class="status-filter" placeholder="全部船舶" @change="handleFilterChange">
            <el-option label="全部船舶" value="all" />
            <el-option label="已靠泊" value="berthed" />
            <el-option label="近期ETA" value="eta_near" />
            <el-option label="航行中" value="sailing" />
          </el-select>
          <el-select v-model="groupByFilter" class="group-filter" placeholder="四岗主管" @change="handleFilterChange">
            <el-option label="四岗主管" value="all" />
            <el-option label="海务" value="marine" />
            <el-option label="机务" value="engineer" />
            <el-option label="电气" value="electric" />
            <el-option label="船工" value="crew" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <div class="card-size-control">
            <el-icon class="size-icon-left"><Grid /></el-icon>
            <el-slider
              v-model="cardSize"
              :min="0"
              :max="5"
              :step="1"
              :show-tooltip="false"
              class="card-size-slider"
              style="width: 100px"
            />
            <el-icon class="size-icon-right"><List /></el-icon>
          </div>
          <div class="timeline-switcher">
            <button
              v-for="item in timelineOptions"
              :key="item.value"
              class="timeline-btn"
              :class="{ active: dayOffset === item.value }"
              @click="switchTimeline(item.value)"
            >
              <span class="timeline-day">{{ item.label }}</span>
            </button>
          </div>
          <button class="refresh-btn" @click="refreshData">
            <Refresh class="refresh-icon" />
          </button>
        </div>
      </div>

      <template v-if="cardSize < 5">
        <div v-for="group in groupedShips" :key="group.name" class="group-section">
          <div class="group-header">
            <el-tag :type="group.tagType" size="small">{{ group.name }}</el-tag>
            <span class="group-count">{{ group.ships.length }}艘</span>
          </div>
          <div class="card-grid" :class="`card-grid-${cardSize}`">
            <div
              v-for="ship in group.ships"
              :key="ship.shipId"
              class="ship-card"
              :class="{ 'ship-card--watched': ship.isWatched }"
              @click="openShipDetail(ship)"
              @contextmenu.prevent="showContextMenu($event, ship)"
            >
              <div class="card-header">
                <span class="card-ship-name">{{ ship.shipName }}</span>
                <span
                  v-if="getFlagEmoji(ship.flagCountry)"
                  class="card-flag-emoji"
                  :title="ship.flagCountry"
                >{{ getFlagEmoji(ship.flagCountry) }}</span>
                <span
                  v-if="ship.tradeType"
                  class="trade-circle"
                  :class="getTradeTypeClass(ship.tradeType)"
                  :title="ship.tradeType"
                >贸</span>
                <span
                  v-if="getSendCompanyAbbr(ship.sendCompany)"
                  class="company-circle"
                  :class="getSendCompanyClass(ship.sendCompany)"
                  :title="ship.sendCompany"
                >{{ getSendCompanyAbbr(ship.sendCompany) }}</span>
                <!-- 区域标记 -->
                <span v-if="ship.piracyZone" class="region-badge region-piracy" title="海盗区">🏴‍☠️</span>
                <span v-else-if="ship.etaPortRegion === 'fiveEyes'" class="region-badge region-five-eyes" title="五眼联盟">👁️</span>
                <span v-else-if="ship.etaPortRegion === 'europe'" class="region-badge region-europe" title="欧洲">🇪🇺</span>
                <span class="card-status" :style="{ backgroundColor: getStatusBgColor(ship.status) }">{{ getStatusText(ship.status) }}</span>
              </div>
              
              <div v-if="cardSize <= 1" class="card-info">
                <div class="info-item">
                  <span class="info-icon">⏱️</span>
                  <span class="info-text">{{ formatETA(ship.eta) }}</span>
                </div>
                <div v-if="cardSize === 0" class="info-item">
                  <span class="info-icon">🌤️</span>
                  <span class="info-text">{{ ship.weather || '-' }}</span>
                </div>
              </div>

              <!-- 4列布局也显示ETA和航次 -->
              <div v-if="cardSize === 2" class="card-info card-info-compact">
                <div v-if="ship.etaDisplay || ship.eta" class="info-item">
                  <span class="info-icon">⏱️</span>
                  <span class="info-text">{{ ship.etaDisplay || formatETA(ship.eta) }}</span>
                </div>
                <div v-if="ship.voyage" class="info-item">
                  <span class="info-icon">🚢</span>
                  <span class="info-text">{{ ship.voyage }}</span>
                </div>
              </div>

              <!-- 航程时间进度条 -->
              <div v-if="ship.hasVoyageProgress" class="card-progress voyage-progress">
                <div class="progress-bar-bg">
                  <div
                    class="progress-bar-fill voyage-progress-fill"
                    :style="{ width: `${ship.voyageProgress}%`, backgroundColor: getVoyageProgressColor(ship.voyageDaysLeft) }"
                  ></div>
                </div>
                <div class="progress-text">
                  <span class="progress-label">航程 {{ ship.voyageProgress }}%</span>
                  <span v-if="ship.voyageDaysLeft > 0" class="progress-days">
                    剩{{ ship.voyageDaysLeft }}天
                  </span>
                  <span v-else class="progress-days progress-days--arrived">已抵达</span>
                </div>
              </div>

              <div v-if="cardSize <= 1" class="card-supervisors">
                <div v-if="groupByFilter !== 'marine'" class="supervisors-row">
                  <span class="sv-label">海务</span>
                  <span class="sv-name">{{ ship.fourSupervisors.marine || '-' }}</span>
                </div>
                <div v-if="groupByFilter !== 'engineer'" class="supervisors-row">
                  <span class="sv-label">机务</span>
                  <span class="sv-name">{{ ship.fourSupervisors.engineer || '-' }}</span>
                  <span v-if="ship.politicalInstructor" class="sv-divider">|</span>
                  <span v-if="ship.politicalInstructor" class="sv-label">政</span>
                  <span v-if="ship.politicalInstructor" class="sv-name">{{ ship.politicalInstructor }}</span>
                </div>
                <div v-if="cardSize === 0 && groupByFilter !== 'electric'" class="supervisors-row">
                  <span class="sv-label">电气</span>
                  <span class="sv-name">{{ ship.fourSupervisors.electric || '-' }}</span>
                </div>
                <div v-if="cardSize === 0 && groupByFilter !== 'crew'" class="supervisors-row">
                  <span class="sv-label">船工</span>
                  <span class="sv-name">{{ ship.fourSupervisors.crew || '-' }}</span>
                </div>
              </div>

              <div v-if="cardSize === 2" class="card-supervisors">
                <div v-if="groupByFilter !== 'marine'" class="supervisors-row">
                  <span class="sv-label">海务</span>
                  <span class="sv-name">{{ ship.fourSupervisors.marine || '-' }}</span>
                </div>
                <div v-if="groupByFilter !== 'engineer'" class="supervisors-row">
                  <span class="sv-label">机务</span>
                  <span class="sv-name">{{ ship.fourSupervisors.engineer || '-' }}</span>
                  <span v-if="ship.politicalInstructor" class="sv-divider">|</span>
                  <span v-if="ship.politicalInstructor" class="sv-label">政</span>
                  <span v-if="ship.politicalInstructor" class="sv-name">{{ ship.politicalInstructor }}</span>
                </div>
              </div>

              <div v-if="cardSize === 3" class="card-mini-supervisors">
                <span v-if="groupByFilter !== 'marine'" class="mini-sv">海:{{ ship.fourSupervisors.marine || '-' }}</span>
                <span v-if="groupByFilter !== 'engineer'" class="mini-sv">机:{{ ship.fourSupervisors.engineer || '-' }} | 政:{{ ship.politicalInstructor || '-' }}</span>
              </div>

              <div v-if="cardSize === 4" class="card-tiny-supervisors">
                <span v-if="groupByFilter !== 'marine'" class="tiny-sv">{{ ship.fourSupervisors.marine || '-' }}</span>
                <span v-else-if="groupByFilter !== 'engineer'" class="tiny-sv">{{ ship.fourSupervisors.engineer || '-' }} | 政:{{ ship.politicalInstructor || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-for="group in groupedShips" :key="group.name" class="group-section">
          <div class="group-header">
            <el-tag :type="group.tagType" size="small">{{ group.name }}</el-tag>
            <span class="group-count">{{ group.ships.length }}艘</span>
          </div>
          <el-table :data="group.ships" stripe style="width: 100%" size="small">
            <el-table-column label="关注" width="50">
              <template #default="{ row }">
                <el-icon v-if="row.isWatched" color="#e6a23c"><Star /></el-icon>
              </template>
            </el-table-column>
            <el-table-column prop="shipName" label="船名" min-width="120">
              <template #default="{ row }">
                <span class="table-company-cell">
                  {{ row.shipName }}
                  <span
                    v-if="getSendCompanyAbbr(row.sendCompany)"
                    class="company-circle company-sm"
                    :class="getSendCompanyClass(row.sendCompany)"
                    :title="row.sendCompany"
                  >{{ getSendCompanyAbbr(row.sendCompany) }}</span>
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="ETA" width="100">
              <template #default="{ row }">{{ formatETA(row.eta) }}</template>
            </el-table-column>
            <el-table-column label="航程进度" width="150">
              <template #default="{ row }">
                <div v-if="row.hasVoyageProgress" class="table-voyage-progress">
                  <el-progress :percentage="row.voyageProgress" :color="getVoyageProgressColor(row.voyageDaysLeft)" :stroke-width="6" />
                  <span class="table-progress-days" :style="{ color: getVoyageProgressColor(row.voyageDaysLeft) }">
                    {{ row.voyageDaysLeft > 0 ? `剩${row.voyageDaysLeft}天` : '已抵达' }}
                  </span>
                </div>
                <span v-else class="text-gray-400 text-xs">-</span>
              </template>
            </el-table-column>
            <el-table-column label="海务" width="80">
              <template #default="{ row }">{{ row.fourSupervisors.marine || '-' }}</template>
            </el-table-column>
            <el-table-column label="机务" width="80">
              <template #default="{ row }">{{ row.fourSupervisors.engineer || '-' }}</template>
            </el-table-column>
            <el-table-column label="电气" width="80">
              <template #default="{ row }">{{ row.fourSupervisors.electric || '-' }}</template>
            </el-table-column>
            <el-table-column label="船工" width="80">
              <template #default="{ row }">{{ row.fourSupervisors.crew || '-' }}</template>
            </el-table-column>
            <el-table-column label="政委" width="80">
              <template #default="{ row }">{{ row.politicalInstructor || '-' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>

      <div v-if="filteredShips.length === 0" class="empty-state">
        暂无船舶数据
      </div>
    </div>

    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="toggleWatch(true)">
        <el-icon><Star /></el-icon>关注此船
      </div>
      <div class="menu-item" @click="toggleWatch(false)">
        <el-icon><StarFilled /></el-icon>取消关注
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="setShipStatus('berthed')">
        <el-icon color="#67c23a"><CircleCheck /></el-icon>标记为已靠泊
      </div>
      <div class="menu-item" @click="setShipStatus('arrived')">
        <el-icon color="#eb2f96"><CircleCheck /></el-icon>标记为已抵港
      </div>
      <div class="menu-item" @click="setShipStatus('sailing')">
        <el-icon color="#409eff"><CircleCheck /></el-icon>标记为航行中
      </div>
      <div class="menu-item" @click="setShipStatus('anchored')">
        <el-icon color="#e6a23c"><CircleCheck /></el-icon>标记为锚泊中
      </div>
      <div class="menu-item" @click="setShipStatus('repair')">
        <el-icon color="#f56c6c"><CircleCheck /></el-icon>标记为修理中
      </div>
    </div>

    <div v-if="contextMenu.visible" class="menu-overlay" @click="closeContextMenu" />

    <ShipDetailDialog :visible="detailVisible" :ship="selectedShip" @update:visible="detailVisible = $event" @refresh="fetchShipStatus" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Grid, List, Refresh, Star, StarFilled, CircleCheck
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ShipDynamicStatus } from '~/types'
import ShipDetailDialog from './ShipDetailDialog.vue'

const api = useApi()
const loading = ref(false)
const statusFilter = ref('all')
const groupByFilter = ref('all')
const cardSize = ref(2)
const ships = ref<ShipDynamicStatus[]>([])
const dayOffset = ref(0)
const timelineOptions = [
  { label: '今天', value: 0 },
  { label: '明天', value: 1 },
  { label: '后天', value: 2 },
]
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  currentShip: null as ShipDynamicStatus | null,
})

const detailVisible = ref(false)
const selectedShip = ref<ShipDynamicStatus | null>(null)

defineExpose({ refreshData })

onMounted(() => {
  fetchShipStatus()
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

async function switchTimeline(offset: number) {
  dayOffset.value = offset
  await fetchShipStatus()
}

async function fetchShipStatus() {
  loading.value = true
  try {
    const result = await api.ships.getDynamicStatusByDate(dayOffset.value)
    ships.value = result.ships || []
  } catch (e: any) {
  } finally {
    loading.value = false
  }
}

function refreshData() {
  fetchShipStatus()
}

function handleFilterChange() {
}

function isEtaNear(ship: ShipDynamicStatus): boolean {
  if (!ship.eta || ship.status === 'berthed') return false
  const etaDate = new Date(ship.eta)
  const now = new Date()
  const diffDays = (etaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 4
}

const filteredShips = computed(() => {
  let result = [...ships.value]
  if (statusFilter.value === 'berthed') {
    result = result.filter(s => s.status === 'berthed')
  } else if (statusFilter.value === 'eta_near') {
    result = result.filter(s => isEtaNear(s))
  } else if (statusFilter.value === 'sailing') {
    result = result.filter(s => s.status === 'sailing')
  }
  if (groupByFilter.value !== 'all') {
    const key = groupByFilter.value as string
    result = result.filter(s => s.fourSupervisors[key as keyof typeof s.fourSupervisors])
  }
  return result
})

const groupedShips = computed(() => {
  const shipsData = filteredShips.value
  
  if (groupByFilter.value !== 'all') {
    const key = groupByFilter.value as string
    const labelMap: Record<string, string> = {
      marine: '海务',
      engineer: '机务',
      electric: '电气',
      crew: '船工',
    }
    
    const groups: Record<string, ShipDynamicStatus[]> = {}
    
    shipsData.forEach(ship => {
      const supervisor = ship.fourSupervisors[key as keyof typeof ship.fourSupervisors]
      const groupName = supervisor || '未分配'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(ship)
    })
    
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      if (a === '未分配') return 1
      if (b === '未分配') return -1
      return a.localeCompare(b, 'zh-CN')
    })
    
    return sortedGroups.map(name => ({
      name: name === '未分配' ? '未分配' : `${labelMap[key]}: ${name}`,
      tagType: name === '未分配' ? 'info' : 'primary' as const,
      ships: groups[name].sort((a, b) => a.shipName.localeCompare(b.shipName, 'zh-CN'))
    }))
  }
  
  const berthed = shipsData.filter(s => s.status === 'berthed')
  const arrived = shipsData.filter(s => s.status === 'arrived')
  const etaNear = shipsData.filter(s => isEtaNear(s) && s.status !== 'berthed' && s.status !== 'arrived')
  const sailing = shipsData.filter(s => s.status === 'sailing' && !isEtaNear(s))
  const anchored = shipsData.filter(s => s.status === 'anchored')
  const repair = shipsData.filter(s => s.status === 'repair')
  const other = shipsData.filter(s => s.status !== 'berthed' && s.status !== 'arrived' && s.status !== 'sailing' && s.status !== 'anchored' && s.status !== 'repair' && !isEtaNear(s))

  return [
    { name: '已靠泊', tagType: 'success' as const, ships: berthed.sort((a, b) => a.shipName.localeCompare(b.shipName, 'zh-CN')) },
    { name: '已抵港', tagType: 'danger' as const, ships: arrived.sort((a, b) => a.shipName.localeCompare(b.shipName, 'zh-CN')) },
    { name: '三天内计划抵港', tagType: 'warning' as const, ships: etaNear.sort((a, b) => 
      a.eta && b.eta ? new Date(a.eta).getTime() - new Date(b.eta).getTime() : a.shipName.localeCompare(b.shipName, 'zh-CN')
    )},
    { name: '航行中', tagType: 'primary' as const, ships: sailing.sort((a, b) => a.shipName.localeCompare(b.shipName, 'zh-CN')) },
    { name: '锚泊中', tagType: 'warning' as const, ships: anchored.sort((a, b) => a.shipName.localeCompare(b.shipName, 'zh-CN')) },
    { name: '修理中', tagType: 'danger' as const, ships: repair.sort((a, b) => a.shipName.localeCompare(b.shipName, 'zh-CN')) },
    { name: '其他', tagType: 'info' as const, ships: other.sort((a, b) => a.shipName.localeCompare(b.shipName, 'zh-CN')) },
  ].filter(g => g.ships.length > 0)
})

function getStatusTagType(status: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' {
  const map: Record<string, any> = {
    berthed: 'success',
    arrived: 'danger',
    sailing: 'primary',
    anchored: 'warning',
    repair: 'danger',
  }
  return map[status] || 'info'
}

function getStatusBgColor(status: string): string {
  const map: Record<string, string> = {
    berthed: '#67c23a',
    sailing: '#409eff',
    anchored: '#e6a23c',
    repair: '#f56c6c',
  }
  return map[status] || '#909399'
}

// 派员公司简称
function getSendCompanyAbbr(name?: string): string {
  if (!name) return ''
  if (name.includes('广州')) return '广'
  if (name.includes('大连')) return '连'
  if (name.includes('上海')) return '沪'
  if (name.includes('青岛')) return '青'
  if (name.includes('天津')) return '津'
  if (name.includes('厦门')) return '厦'
  return name.charAt(0)
}

// 派员公司配色 class
function getSendCompanyClass(name?: string): string {
  if (!name) return 'company-default'
  if (name.includes('广州')) return 'company-gz'
  if (name.includes('大连')) return 'company-dl'
  if (name.includes('上海')) return 'company-sh'
  if (name.includes('青岛')) return 'company-qd'
  if (name.includes('天津')) return 'company-tj'
  return 'company-default'
}

// 船旗国 → 国旗 emoji
function getFlagEmoji(flagCountry?: string): string {
  if (!flagCountry) return ''
  const flag = flagCountry.toUpperCase()
  if (flag.includes('PANAMA') || flag.includes('巴拿马')) return '🇵🇦'
  if (flag.includes('SINGAPORE') || flag.includes('新加坡')) return '🇸🇬'
  if (flag.includes('HONG KONG') || flag.includes('香港')) return '🇭🇰'
  if (flag.includes('CHINA') || flag.includes('中国') || flag.includes('上海')) return '🇨🇳'
  if (flag.includes('LIBERIA') || flag.includes('利比里亚')) return '🇱🇷'
  if (flag.includes('MARSHALL') || flag.includes('马绍尔')) return '🇲🇭'
  if (flag.includes('MALTA') || flag.includes('马耳他')) return '🇲🇹'
  if (flag.includes('BAHAMAS') || flag.includes('巴哈马')) return '🇧🇸'
  return ''
}

// 贸易类型圆圈样式 class
function getTradeTypeClass(tradeType?: string): string {
  if (!tradeType) return ''
  if (tradeType === '外贸') return 'trade-foreign'
  if (tradeType === '内贸') return 'trade-domestic'
  if (tradeType.includes('内外') || tradeType.includes('兼营')) return 'trade-both'
  return ''
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    berthed: '已靠泊',
    arrived: '已抵港',
    sailing: '航行中',
    anchored: '锚泊中',
    repair: '修理中',
  }
  return map[status] || status
}

function formatETA(eta: string): string {
  if (!eta) return '-'
  const date = new Date(eta)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

function getProgressColor(progress: number): string {
  if (progress === 0) return '#f56c6c'
  if (progress >= 1 && progress < 100) return '#e6a23c'
  if (progress === 100) return '#67c23a'
  return '#909399'
}

function getVoyageProgressColor(daysLeft: number): string {
  if (daysLeft <= 0) return '#67c23a'
  if (daysLeft <= 3) return '#f56c6c'
  if (daysLeft <= 7) return '#e6a23c'
  return '#409eff'
}

function showContextMenu(event: MouseEvent, ship: ShipDynamicStatus) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    currentShip: ship,
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

async function toggleWatch(watch: boolean) {
  if (!contextMenu.value.currentShip) return
  const ship = contextMenu.value.currentShip
  try {
    ship.isWatched = watch
    ElMessage.success(watch ? '已关注' : '已取消关注')
    closeContextMenu()
  } catch (e: any) {
    ElMessage.error('操作失败')
  }
}

async function setShipStatus(status: 'berthed' | 'arrived' | 'sailing' | 'anchored' | 'repair') {
  if (!contextMenu.value.currentShip) return
  const ship = contextMenu.value.currentShip
  try {
    ship.status = status
    ElMessage.success(`已标记为${getStatusText(status)}`)
    closeContextMenu()
  } catch (e: any) {
    ElMessage.error('操作失败')
  }
}

function openShipDetail(ship: ShipDynamicStatus) {
  selectedShip.value = ship
  detailVisible.value = true
}
</script>

<style scoped>
.flip-board-view {
  padding: 12px 0;
}

.flip-board-container {
  border-radius: 8px;
  background: #f5f7fa;
  padding: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  background: transparent;
  padding: 4px 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 0;
  margin-left: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 0;
  margin-right: 0;
}

.status-filter {
  width: 120px;
}

.group-filter {
  width: 120px;
}

.card-size-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-icon-left,
.size-icon-right {
  font-size: 14px;
  color: #909399;
}

.card-size-slider :deep(.el-slider__runway) {
  height: 4px;
  margin: 8px 0;
}

.card-size-slider :deep(.el-slider__bar) {
  height: 4px;
  background-color: #409eff;
}

.card-size-slider :deep(.el-slider__button-wrapper) {
  width: 18px;
  height: 18px;
  top: -7px;
}

.card-size-slider :deep(.el-slider__button) {
  width: 14px;
  height: 14px;
  border: 2px solid #409eff;
  background-color: #fff;
}

.refresh-btn {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.refresh-btn:hover {
  background: rgba(64, 158, 255, 0.08);
}

.refresh-icon {
  font-size: 16px;
  color: #606266;
}

.timeline-switcher {
  display: flex;
  gap: 3px;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 3px;
}

.timeline-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
}

.timeline-btn:hover {
  background: rgba(64, 158, 255, 0.08);
}

.timeline-btn.active {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.timeline-day {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.timeline-btn.active .timeline-day {
  color: #409eff;
}

.group-section {
  margin-bottom: 16px;
}

.group-section:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.group-count {
  font-size: 12px;
  color: #909399;
}

.card-grid {
  display: grid;
}

.card-grid-0 {
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.card-grid-1 {
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.card-grid-2 {
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.card-grid-3 {
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.card-grid-4 {
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.ship-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
}

.ship-card:hover {
  border-color: rgba(64, 158, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.ship-card--watched {
  border-left: 3px solid #e6a23c;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.company-circle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: white;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.company-sm {
  width: 18px;
  height: 18px;
  font-size: 10px;
}

.company-gz { background: #1890ff; }
.company-dl { background: #52c41a; }
.company-sh { background: #fa8c16; }
.company-qd { background: #722ed1; }
.company-tj { background: #13c2c2; }
.company-default { background: #8c8c8c; }

/* 国旗 emoji */
.card-flag-emoji {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

/* 贸易类型圆圈 */
.trade-circle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: white;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  overflow: hidden;
}

/* 外贸：蓝色 */
.trade-foreign {
  background: #1890ff;
}

/* 内贸：绿色 */
.trade-domestic {
  background: #52c41a;
}

/* 内外贸兼营：左绿右蓝 */
.trade-both {
  background: linear-gradient(to right, #52c41a 50%, #1890ff 50%);
}

/* 区域标记 */
.region-badge {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  animation: pulse 2s infinite;
}

.region-piracy {
  animation-duration: 1s;
}

.region-five-eyes {
  animation-duration: 2s;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.table-company-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.table-voyage-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.table-voyage-progress .el-progress {
  flex: 1;
}

.table-progress-days {
  font-size: 12px;
  white-space: nowrap;
  font-weight: 500;
}

.card-ship-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.card-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  color: #fff;
}

.card-info {
  margin-bottom: 6px;
}

/* 4列布局的紧凑信息行 */
.card-info-compact {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.card-info-compact .info-item {
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #606266;
  margin-bottom: 2px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-icon {
  font-size: 11px;
}

.info-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-progress {
  margin-bottom: 6px;
}

.voyage-progress .progress-bar-bg {
  height: 5px;
}

.voyage-progress-fill {
  transition: width 0.4s ease;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #606266;
  margin-top: 3px;
}

.progress-label {
  font-weight: 500;
}

.progress-days {
  color: #909399;
}

.progress-days--arrived {
  color: #67c23a;
  font-weight: 500;
}

.progress-bar-bg {
  height: 4px;
  background: #ebeef5;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 2px;
}

.card-supervisors {
  border-top: 1px solid #ebeef5;
  padding-top: 6px;
}

.supervisors-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 2px;
}

.supervisors-row:last-child {
  margin-bottom: 0;
}

.sv-label {
  color: #909399;
}

.sv-divider {
  margin: 0 4px;
  color: #dcdfe6;
}

.sv-name {
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-mini-supervisors {
  border-top: 1px solid #ebeef5;
  padding-top: 4px;
  font-size: 9px;
  color: #606266;
}

.mini-sv {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 1px;
}

.mini-sv:last-child {
  margin-bottom: 0;
}

.card-tiny-supervisors {
  border-top: 1px solid #ebeef5;
  padding-top: 4px;
}

.tiny-sv {
  font-size: 9px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #909399;
}

.context-menu {
  position: fixed;
  z-index: 50;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #ebeef5;
  padding: 4px;
  min-width: 150px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-divider {
  height: 1px;
  background: #ebeef5;
  margin: 4px 0;
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
}

@media (max-width: 768px) {
  .flip-board-view {
    padding: 8px 0;
  }
  
  .toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }
  
  .card-grid-1 {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .card-grid-2 {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  
  .card-grid-3 {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
  
  .card-grid-4 {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  
  .ship-card {
    padding: 8px;
  }
  
  .card-ship-name {
    font-size: 13px;
  }
  
  .card-status {
    font-size: 9px;
    padding: 2px 4px;
  }
  
  .info-item {
    font-size: 10px;
  }
  
  .progress-bar-bg {
    height: 3px;
  }
  
  .supervisors-row {
    font-size: 9px;
  }
  
  .card-mini-supervisors {
    font-size: 8px;
  }
  
  .tiny-sv {
    font-size: 8px;
  }
}
</style>
