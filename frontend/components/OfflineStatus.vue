<template>
  <div
    v-if="showStatus"
    class="offline-status-bar"
    :class="{
      'is-offline': !isOnline,
      'is-syncing': isSyncing,
      'has-pending': pendingCount > 0,
      'has-failed': failedCount > 0,
    }"
  >
    <div class="status-content">
      <!-- 网络状态图标 -->
      <div class="status-icon">
        <template v-if="!isOnline">
          <el-icon><Disconnected /></el-icon>
        </template>
        <template v-else-if="isSyncing">
          <el-icon class="is-loading"><Loading /></el-icon>
        </template>
        <template v-else-if="failedCount > 0">
          <el-icon><Warning /></el-icon>
        </template>
        <template v-else-if="pendingCount > 0">
          <el-icon><Upload /></el-icon>
        </template>
        <template v-else>
          <el-icon><Connection /></el-icon>
        </template>
      </div>

      <!-- 状态文本 -->
      <div class="status-text">
        <span v-if="!isOnline" class="text-offline">离线模式</span>
        <span v-else-if="isSyncing" class="text-syncing">正在同步 {{ syncProgress }}%</span>
        <span v-else-if="failedCount > 0" class="text-failed">{{ failedCount }} 项同步失败</span>
        <span v-else-if="pendingCount > 0" class="text-pending">{{ pendingCount }} 项待同步</span>
        <span v-else class="text-online">已同步 {{ formattedLastSync }}</span>
      </div>

      <!-- 操作按钮 -->
      <div class="status-actions">
        <el-button
          v-if="failedCount > 0 && isOnline"
          size="small"
          type="warning"
          @click="retryFailed"
        >
          重试
        </el-button>
        <el-button
          v-if="pendingCount > 0 && isOnline && !isSyncing"
          size="small"
          type="primary"
          @click="triggerSync"
        >
          立即同步
        </el-button>
        <el-button
          v-if="!isOnline"
          size="small"
          @click="showOfflineTip"
        >
          详情
        </el-button>
      </div>

      <!-- 关闭按钮 -->
      <el-icon class="close-btn" @click="showStatus = false"><Close /></el-icon>
    </div>

    <!-- 同步进度条 -->
    <div v-if="isSyncing" class="sync-progress-bar">
      <div class="progress-fill" :style="{ width: syncProgress + '%' }"></div>
    </div>

    <!-- 离线详情弹窗 -->
    <el-dialog
      v-model="offlineDialogVisible"
      title="离线状态详情"
      width="500px"
    >
      <div class="offline-detail">
        <div class="detail-item">
          <span class="label">网络状态：</span>
          <el-tag :type="isOnline ? 'success' : 'danger'">
            {{ isOnline ? '在线' : '离线' }}
          </el-tag>
        </div>
        <div class="detail-item">
          <span class="label">本地数据状态：</span>
          <span>{{ offlineAvailable ? '数据可用' : '未下载数据' }}</span>
        </div>
        <div class="detail-item">
          <span class="label">最后同步时间：</span>
          <span>{{ formattedLastSync }}</span>
        </div>
        <div class="detail-item">
          <span class="label">待同步操作：</span>
          <span>{{ pendingCount }} 项</span>
        </div>
        <div class="detail-item">
          <span class="label">失败操作：</span>
          <span>{{ failedCount }} 项</span>
        </div>
        <div class="detail-item">
          <span class="label">本地记录总数：</span>
          <span>{{ totalLocalRecords }} 条</span>
        </div>
        <div v-if="cacheStats" class="detail-item">
          <span class="label">缓存命中率：</span>
          <span>{{ cacheStats.hitRate }}%</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="offlineDialogVisible = false">关闭</el-button>
        <el-button
          v-if="!isOnline && offlineAvailable"
          type="primary"
          @click="exportLocalData"
        >
          导出本地数据
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Disconnected,
  Loading,
  Warning,
  Upload,
  Connection,
  Close,
} from '@element-plus/icons-vue';
import { useSyncQueue } from '~/composables/useSyncQueue';
import { useOfflineData } from '~/composables/useOfflineData';
import { getCacheStats } from '~/composables/useApi';

const syncQueue = useSyncQueue();
const offlineData = useOfflineData();

const showStatus = ref(true);
const isOnline = ref(true);
const offlineDialogVisible = ref(false);
const totalLocalRecords = ref(0);
const cacheStats = ref<any>(null);

const isSyncing = computed(() => syncQueue.isSyncing.value);
const pendingCount = computed(() => syncQueue.pendingCount.value);
const failedCount = computed(() => syncQueue.failedCount.value);
const lastSyncTime = computed(() => offlineData.lastSyncTime.value);
const offlineAvailable = computed(() => offlineData.isOfflineAvailable.value);

const formattedLastSync = computed(() => {
  if (!lastSyncTime.value) return '从未同步';
  const date = new Date(lastSyncTime.value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
});

const syncProgress = computed(() => {
  if (!isSyncing.value) return 0;
  const total = pendingCount.value + failedCount.value;
  if (total === 0) return 100;
  // 简化计算，实际可根据处理进度精确计算
  return Math.min(90, Math.round(((total - pendingCount.value) / total) * 100));
});

let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;
let statsTimer: any = null;

function updateOnlineStatus() {
  isOnline.value = navigator.onLine;
}

function showOfflineTip() {
  offlineDialogVisible.value = true;
  loadLocalStats();
}

async function loadLocalStats() {
  try {
    const stats = await offlineData.getStats();
    totalLocalRecords.value = stats.totalRecords;
    cacheStats.value = getCacheStats();
  } catch {
    totalLocalRecords.value = 0;
  }
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

function exportLocalData() {
  offlineData.exportBackup().then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panda-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('本地数据已导出');
  }).catch(() => {
    ElMessage.error('导出失败');
  });
}

onMounted(() => {
  updateOnlineStatus();
  onlineHandler = () => {
    isOnline.value = true;
    ElMessage.success('网络已恢复，正在同步数据...');
    syncQueue.processQueue();
  };
  offlineHandler = () => {
    isOnline.value = false;
    ElMessage.warning('网络已断开，已进入离线模式');
  };
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  // 定期更新缓存统计
  statsTimer = setInterval(() => {
    if (showStatus.value) {
      cacheStats.value = getCacheStats();
    }
  }, 30000);
});

onUnmounted(() => {
  if (onlineHandler) window.removeEventListener('online', onlineHandler);
  if (offlineHandler) window.removeEventListener('offline', offlineHandler);
  if (statsTimer) clearInterval(statsTimer);
});
</script>

<style scoped>
.offline-status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  background: #f0f9ff;
  border-top: 1px solid #bae6fd;
  transition: all 0.3s ease;
}

.offline-status-bar.is-offline {
  background: #fef2f2;
  border-top-color: #fecaca;
}

.offline-status-bar.is-syncing {
  background: #f0fdf4;
  border-top-color: #bbf7d0;
}

.offline-status-bar.has-failed {
  background: #fffbeb;
  border-top-color: #fde68a;
}

.status-content {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 12px;
}

.status-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
}

.is-loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-text {
  flex: 1;
  font-size: 14px;
}

.text-offline {
  color: #dc2626;
  font-weight: 500;
}

.text-syncing {
  color: #16a34a;
  font-weight: 500;
}

.text-failed {
  color: #d97706;
  font-weight: 500;
}

.text-pending {
  color: #2563eb;
  font-weight: 500;
}

.text-online {
  color: #6b7280;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.close-btn {
  cursor: pointer;
  color: #9ca3af;
  font-size: 16px;
  margin-left: 8px;
}

.close-btn:hover {
  color: #6b7280;
}

.sync-progress-bar {
  height: 2px;
  background: #e5e7eb;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #16a34a;
  transition: width 0.3s ease;
}

.offline-detail {
  padding: 8px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  color: #6b7280;
}
</style>
