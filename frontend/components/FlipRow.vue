<template>
  <div
    class="flip-row"
    :class="{ 'flip-row--watched': ship.isWatched, 'flip-row--clickable': true }"
    @click="$emit('click', ship)"
    @contextmenu.prevent="$emit('contextmenu', $event, ship)"
  >
    <!-- Watch indicator -->
    <div v-if="ship.isWatched" class="flip-row__watch-badge">
      <el-icon><Star /></el-icon>
    </div>

    <!-- Ship Name -->
    <div class="flip-row__cell flip-row__cell--ship-name">
      <FlipText :value="ship.shipName" :max-length="12" />
    </div>

    <!-- Status -->
    <div class="flip-row__cell flip-row__cell--status">
      <FlipText
        :value="statusText"
        :bg-color="statusColor"
        :text-color="'#fff'"
        :font-size="'11px'"
      />
    </div>

    <!-- Location -->
    <div class="flip-row__cell flip-row__cell--location">
      <FlipText :value="ship.location || '-'" :max-length="16" />
    </div>

    <!-- ETA -->
    <div class="flip-row__cell flip-row__cell--eta">
      <FlipText :value="formatETA" :max-length="14" />
    </div>

    <!-- Check Items (crew change, safety, provisions) -->
    <div class="flip-row__cell flip-row__cell--checks">
      <div class="check-badges">
        <span class="check-badge" :class="{ 'check-badge--active': ship.crewChange }" title="换班">换</span>
        <span class="check-badge" :class="{ 'check-badge--active': ship.safety }" title="安全">安</span>
        <span class="check-badge" :class="{ 'check-badge--active': ship.provisions }" title="补给">补</span>
      </div>
    </div>

    <!-- Progress -->
    <div class="flip-row__cell flip-row__cell--progress">
      <div class="progress-container">
        <FlipText :value="progressText" :font-size="'11px'" />
        <div class="progress-bar">
          <div
            class="progress-bar__fill"
            :style="{ width: `${ship.checkProgress}%`, backgroundColor: progressColor }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Star } from '@element-plus/icons-vue'
import FlipText from './FlipText.vue'
import type { ShipDynamicStatus } from '~/types'

const props = defineProps<{
  ship: ShipDynamicStatus
}>()

defineEmits<{
  'click': [ship: ShipDynamicStatus]
  'contextmenu': [event: MouseEvent, ship: ShipDynamicStatus]
}>()

const statusText = computed(() => {
  const map: Record<string, string> = {
    berthed: '已靠泊',
    sailing: '航行中',
    anchored: '锚泊中',
  }
  return map[props.ship.status] || props.ship.status
})

const statusColor = computed(() => {
  const map: Record<string, string> = {
    berthed: '#67c23a',
    sailing: '#409eff',
    anchored: '#e6a23c',
  }
  return map[props.ship.status] || '#909399'
})

const formatETA = computed(() => {
  if (!props.ship.eta) return '-'
  const date = new Date(props.ship.eta)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
})

const progressText = computed(() => {
  if (props.ship.checkProgress === 0) return '未开始'
  return `${props.ship.checkProgress}%`
})

const progressColor = computed(() => {
  if (props.ship.checkProgress === 0) return '#f56c6c'
  if (props.ship.checkProgress === 100) return '#67c23a'
  return '#e6a23c'
})
</script>

<style scoped>
.flip-row {
  position: relative;
  display: flex;
  align-items: center;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 8px 30px 8px 12px;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
}

.flip-row:hover {
  background: linear-gradient(180deg, #1f1f3a 0%, #1a2744 100%);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.flip-row--watched {
  border-left: 3px solid #e6a23c;
}

.flip-row__watch-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #e6a23c;
  font-size: 12px;
}

.flip-row__cell {
  display: flex;
  align-items: center;
  min-height: 28px;
}

.flip-row__cell--ship-name {
  flex: 1.5;
  min-width: 0;
}

.flip-row__cell--status {
  width: 70px;
  flex-shrink: 0;
  justify-content: center;
}

.flip-row__cell--location {
  flex: 1.2;
  min-width: 0;
}

.flip-row__cell--eta {
  width: 110px;
  flex-shrink: 0;
  justify-content: center;
}

.flip-row__cell--checks {
  width: 90px;
  flex-shrink: 0;
  justify-content: center;
}

.flip-row__cell--progress {
  width: 130px;
  flex-shrink: 0;
}

.check-badges {
  display: flex;
  gap: 4px;
}

.check-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
}

.check-badge--active {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease, background-color 0.5s ease;
}
</style>
