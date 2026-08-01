<template>
  <div class="view-switcher">
    <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
      <el-tab-pane label="🚢 船舶视角" name="ship">
        <div class="ship-selector">
          <el-select v-model="selectedShipId" placeholder="选择船舶" filterable size="small" @change="handleShipChange">
            <el-option v-for="ship in shipOptions" :key="ship.id" :label="ship.cnShipName" :value="ship.id" />
          </el-select>
          <span v-if="selectedShipName" class="ship-label">{{ selectedShipName }}</span>
        </div>
        <div v-if="currentShipInfo" class="current-ship-info">
          <div class="info-badge" :style="{ backgroundColor: currentShipInfo.statusColor }">
            {{ currentShipInfo.statusText }}
          </div>
          <span v-if="currentShipInfo.isOnBoard" class="onboard-tag">当前在船</span>
        </div>
      </el-tab-pane>
      <el-tab-pane label="👤 个人视角" name="personal">
        <div class="personal-info">
          <span>{{ (currentUserInfo && currentUserInfo.realName) || '我的' }} 的历史日记</span>
          <span class="hint">跨船汇总显示</span>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  availableShips: any[]
  currentShipId?: number | null
  currentUserId?: number
}>()

const emit = defineEmits(['view-change', 'ship-change'])

const activeTab = ref('ship')
const selectedShipId = ref<number | null>(null)

const shipOptions = computed(() => {
  return props.availableShips || []
})

const selectedShipName = computed(() => {
  const ship = shipOptions.value.find(s => s.id === selectedShipId.value)
  return (ship && ship.cnShipName) || ''
})

const currentShipInfo = computed(() => {
  if (!selectedShipId.value) return null
  const ship = shipOptions.value.find(s => s.id === selectedShipId.value)
  if (!ship) return null
  
  const statusMap: Record<string, { text: string; color: string }> = {
    voyage: { text: '航行中', color: '#409eff' },
    anchored: { text: '锚泊中', color: '#e6a23c' },
    berthed: { text: '靠泊中', color: '#67c23a' },
  }
  
  const statusEntry = statusMap[ship.currentStatus]
  return {
    statusText: (statusEntry && statusEntry.text) || ship.currentStatus,
    statusColor: (statusEntry && statusEntry.color) || '#909399',
    isOnBoard: false,
  }
})

const currentUserInfo = ref(null)

watch(() => props.currentShipId, (newId) => {
  if (newId) {
    selectedShipId.value = newId
  }
})

watch(activeTab, (newTab) => {
  emit('view-change', { view: newTab, shipId: selectedShipId.value })
})

function handleShipChange(shipId: number) {
  emit('ship-change', shipId)
  emit('view-change', { view: 'ship', shipId })
}

function handleTabChange(tab: string) {
  emit('view-change', { view: tab, shipId: tab === 'ship' ? selectedShipId.value : null })
}

function setSelectedShip(shipId: number) {
  selectedShipId.value = shipId
}

function setView(view: 'ship' | 'personal') {
  activeTab.value = view
}

defineExpose({
  setSelectedShip,
  setView,
  selectedShipId,
  activeTab,
})
</script>

<style scoped>
.view-switcher {
  width: 100%;
}

.ship-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.ship-selector :deep(.el-select) {
  width: 200px;
}

.ship-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.current-ship-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
}

.info-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
}

.onboard-tag {
  font-size: 12px;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
}

.personal-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: #303133;
}

.hint {
  font-size: 12px;
  color: #909399;
}
</style>
