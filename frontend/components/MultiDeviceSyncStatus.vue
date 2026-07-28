<template>
  <div class="multi-device-sync-status">
    <el-popover
      placement="bottom-end"
      :width="320"
      trigger="click"
      popper-class="device-sync-popover"
    >
      <template #reference>
        <div class="sync-status-trigger" :class="{ 'is-syncing': isSyncing }">
          <el-icon :class="{ 'is-loading': isSyncing }">
            <Connection v-if="isOnline && !hasFailed" />
            <Warning v-else-if="hasFailed" />
            <Disconnected v-else />
          </el-icon>
          <span class="status-label">{{ statusLabel }}</span>
        </div>
      </template>

      <div class="device-sync-panel">
        <div class="panel-header">
          <span class="panel-title">同步状态</span>
          <el-tag :type="isOnline ? 'success' : 'danger'" size="small">
            {{ isOnline ? '在线' : '离线' }}
          </el-tag>
        </div>

        <!-- 当前设备 -->
        <div class="device-section current-device">
          <div class="section-title">
            <el-icon><Monitor /></el-icon>
            当前设备
          </div>
          <div class="device-card">
            <div class="device-info">
              <div class="device-name">{{ currentDevice.deviceName }}</div>
              <div class="device-meta">
                <el-tag size="small" effect="plain">{{ deviceTypeText }}</el-tag>
                <span class="sync-time">同步于 {{ currentDevice.lastSyncAt }}</span>
              </div>
            </div>
            <div class="device-stats">
              <div class="stat-item">
                <span class="stat-value">{{ currentDevice.syncSuccessRate }}</span>
                <span class="stat-label">成功率</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 同步详情 -->
        <div class="sync-detail-section">
          <div class="section-title">
            <el-icon><InfoFilled /></el-icon>
            同步详情
          </div>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">设备ID</span>
              <span class="value id-text">{{ currentDeviceId }}</span>
            </div>
            <div class="detail-item">
              <span class="label">待同步</span>
              <span class="value" :class="{ 'has-pending': pendingCount > 0 }">
                {{ pendingCount }} 项
              </span>
            </div>
            <div class="detail-item">
              <span class="label">同步失败</span>
              <span class="value" :class="{ 'has-failed': failedCount > 0 }">
                {{ failedCount }} 项
              </span>
            </div>
            <div class="detail-item">
              <span class="label">最后同步</span>
              <span class="value">{{ currentDevice.lastSyncAt }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="sync-actions">
          <el-button
            v-if="pendingCount > 0 && isOnline && !isSyncing"
            type="primary"
            size="small"
            @click="triggerSync"
          >
            <el-icon><Refresh /></el-icon>
            立即同步
          </el-button>
          <el-button
            v-if="failedCount > 0 && isOnline"
            type="warning"
            size="small"
            @click="retryFailed"
          >
            <el-icon><RefreshLeft /></el-icon>
            重试失败
          </el-button>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Connection,
  Disconnected,
  Warning,
  Monitor,
  InfoFilled,
  Refresh,
  RefreshLeft,
} from '@element-plus/icons-vue';
import { useSyncQueue } from '~/composables/useSyncQueue';
import { useMultiDeviceSync } from '~/composables/useMultiDeviceSync';
import { ElMessage } from 'element-plus';

const syncQueue = useSyncQueue();
const multiDeviceSync = useMultiDeviceSync();

const isOnline = ref(true);

const isSyncing = computed(() => syncQueue.isSyncing.value);
const pendingCount = computed(() => syncQueue.pendingCount.value);
const failedCount = computed(() => syncQueue.failedCount.value);
const hasFailed = computed(() => failedCount.value > 0);

const currentDevice = computed(() => multiDeviceSync.getCurrentDeviceSummary());
const currentDeviceId = computed(() => multiDeviceSync.getCurrentDeviceId());

const deviceTypeText = computed(() => {
  const map: Record<string, string> = {
    desktop: '电脑',
    tablet: '平板',
    mobile: '手机',
    unknown: '未知',
  };
  return map[currentDevice.value.deviceType] || '未知';
});

const statusLabel = computed(() => {
  if (!isOnline.value) return '离线';
  if (isSyncing.value) return '同步中';
  if (hasFailed.value) return '失败';
  if (pendingCount.value > 0) return `${pendingCount.value} 项待同步`;
  return '已同步';
});

function updateOnlineStatus() {
  isOnline.value = navigator.onLine;
}

function triggerSync() {
  if (!navigator.onLine) {
    ElMessage.warning('当前处于离线状态，无法同步');
    return;
  }
  syncQueue.processQueue();
  ElMessage.info('已开始同步');
}

function retryFailed() {
  if (!navigator.onLine) {
    ElMessage.warning('当前处于离线状态，无法重试');
    return;
  }
  syncQueue.retryAllFailed();
  ElMessage.info('已开始重试失败项');
}

onMounted(() => {
  updateOnlineStatus();
  multiDeviceSync.ensureInitialized();
  window.addEventListener('online', () => { isOnline.value = true; });
  window.addEventListener('offline', () => { isOnline.value = false; });
});
</script>

<style scoped>
.multi-device-sync-status {
  display: inline-flex;
}

.sync-status-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #606266;
}

.sync-status-trigger:hover {
  background: #f5f7fa;
}

.sync-status-trigger.is-syncing {
  color: #409eff;
}

.status-label {
  font-size: 12px;
}

.is-loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

<style>
.device-sync-popover {
  padding: 0 !important;
}

.device-sync-panel {
  padding: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  margin-top: 12px;
}

.device-card {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-name {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 4px;
}

.device-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #606266;
}

.sync-time {
  font-size: 11px;
}

.device-stats {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #67c23a;
}

.stat-label {
  font-size: 11px;
  color: #909399;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.detail-item .label {
  color: #909399;
}

.detail-item .value {
  color: #606266;
  font-weight: 500;
}

.detail-item .value.has-pending {
  color: #409eff;
}

.detail-item .value.has-failed {
  color: #e6a23c;
}

.id-text {
  font-family: monospace;
  font-size: 11px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}
</style>
