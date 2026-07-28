<template>
  <transition name="slide-down">
    <div v-if="showBanner" class="offline-banner" :class="{ offline: !isOnline, syncing: isSyncing }">
      <div class="banner-content">
        <div class="banner-left">
          <div class="status-dot" :class="{ offline: !isOnline, online: isOnline }"></div>
          <span class="status-text">
            <template v-if="!isOnline">
              离线模式 - 数据来自本地缓存，部分功能受限
            </template>
            <template v-else-if="isSyncing">
              正在同步数据...
            </template>
            <template v-else-if="hasPending">
              有 {{ pendingCount }} 项待同步
            </template>
            <template v-else-if="hasFailed">
              {{ failedCount }} 项同步失败，点击查看
            </template>
            <template v-else>
              已连接 - 数据实时同步
            </template>
          </span>
        </div>
        <div class="banner-right">
          <el-button v-if="hasFailed" size="small" type="warning" @click="retryFailed">
            重试
          </el-button>
          <el-button size="small" @click="openOfflinePanel">
            <el-icon><Setting /></el-icon>
            管理
          </el-button>
        </div>
      </div>
    </div>
  </transition>

  <el-dialog v-model="panelVisible" title="离线同步管理" width="560px">
    <div class="offline-panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="同步状态" name="status">
          <div class="status-summary">
            <div class="summary-item">
              <div class="summary-icon online">✓</div>
              <div class="summary-info">
                <div class="summary-label">网络状态</div>
                <div class="summary-value">{{ isOnline ? '已连接' : '已断开' }}</div>
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-icon pending">⟳</div>
              <div class="summary-info">
                <div class="summary-label">待同步</div>
                <div class="summary-value">{{ pendingCount }} 项</div>
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-icon failed">✕</div>
              <div class="summary-info">
                <div class="summary-label">同步失败</div>
                <div class="summary-value">{{ failedCount }} 项</div>
              </div>
            </div>
          </div>

          <div v-if="failedItems.length > 0" class="failed-section">
            <div class="section-header">
              <span>失败项</span>
              <el-button size="small" type="warning" @click="retryAllFailed">全部重试</el-button>
            </div>
            <div class="failed-list">
              <div v-for="item in failedItems" :key="item.id" class="failed-item">
                <div class="failed-info">
                  <span class="failed-op">{{ getOpLabel(item.operation) }}</span>
                  <span class="failed-store">{{ item.storeName }}</span>
                  <span class="failed-id">ID: {{ item.recordId }}</span>
                </div>
                <div class="failed-error">{{ item.errorMsg }}</div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">🎉</div>
            <p>暂无同步失败项</p>
          </div>
        </el-tab-pane>

        <el-tab-pane label="本地数据" name="local">
          <div class="local-data-section">
            <div class="section-header">
              <span>本地数据统计</span>
              <el-button size="small" @click="downloadData">
                <el-icon><Download /></el-icon>
                导出备份
              </el-button>
            </div>
            <div class="data-stats">
              <div class="stat-row">
                <span>上次同步时间</span>
                <span class="stat-value">{{ formattedLastSync }}</span>
              </div>
              <div class="stat-row">
                <span>数据总记录数</span>
                <span class="stat-value">{{ totalRecords }}</span>
              </div>
            </div>
            <div class="data-actions">
              <el-button size="small" @click="syncNow" :loading="isSyncing">
                <el-icon><Refresh /></el-icon>
                立即同步
              </el-button>
              <el-button size="small" type="danger" @click="clearLocalData">
                <el-icon><Delete /></el-icon>
                清除本地数据
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="调试日志" name="debug">
          <div class="debug-section">
            <div class="section-header">
              <span>调试日志 ({{ debugLogCount }})</span>
              <div>
                <el-switch v-model="debugEnabled" active-text="启用调试" style="margin-right: 12px;" />
                <el-button size="small" @click="downloadDebugLogs">
                  <el-icon><Download /></el-icon>
                  导出
                </el-button>
                <el-button size="small" type="danger" @click="clearDebugLogs">
                  清空
                </el-button>
              </div>
            </div>
            <div class="debug-log-list">
              <div
                v-for="log in recentLogs"
                :key="log.id"
                class="debug-log-item"
                :class="log.level"
              >
                <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                <span class="log-level">{{ log.level.toUpperCase() }}</span>
                <span class="log-module">[{{ log.module }}]</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
            <div v-if="recentLogs.length === 0" class="empty-state">
              <p>暂无日志记录</p>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Setting, Download, Refresh, Delete } from '@element-plus/icons-vue';
import { useSyncQueue } from '~/composables/useSyncQueue';
import { useOfflineData } from '~/composables/useOfflineData';
import { useDebugLogger } from '~/composables/useDebugLogger';

const syncQueue = useSyncQueue();
const offlineData = useOfflineData();
const debugLogger = useDebugLogger();

const panelVisible = ref(false);
const activeTab = ref('status');
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const totalRecords = ref(0);

const isSyncing = computed(() => syncQueue.isSyncing.value);
const pendingCount = computed(() => syncQueue.pendingCount.value);
const failedCount = computed(() => syncQueue.failedCount.value);
const hasPending = computed(() => pendingCount.value > 0);
const hasFailed = computed(() => failedCount.value > 0);
const failedItems = computed(() => syncQueue.failedItems.value);

const showBanner = computed(() => {
  return !isOnline.value || hasPending.value || hasFailed.value || isSyncing.value;
});

const formattedLastSync = computed(() => {
  if (!offlineData.lastSyncTime.value) return '从未同步';
  return new Date(offlineData.lastSyncTime.value).toLocaleString('zh-CN');
});

const debugEnabled = computed({
  get: () => debugLogger.enabled.value,
  set: (val) => debugLogger.setEnabled(val),
});

const debugLogCount = computed(() => debugLogger.totalCount.value);
const recentLogs = computed(() => debugLogger.logs.value.slice(-50).reverse());

onMounted(() => {
  if (process.client) {
    window.addEventListener('online', () => {
      isOnline.value = true;
    });
    window.addEventListener('offline', () => {
      isOnline.value = false;
    });
  }
  loadStats();
});

async function loadStats() {
  try {
    const stats = await offlineData.getStats();
    totalRecords.value = stats.totalRecords;
  } catch (e) {
    // 忽略
  }
}

function getOpLabel(op: string) {
  const map: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
  };
  return map[op] || op;
}

async function retryFailed() {
  await syncQueue.retryAllFailed();
  ElMessage.info('正在重试失败项');
}

async function retryAllFailed() {
  await syncQueue.retryAllFailed();
  ElMessage.info('正在重试所有失败项');
}

function openOfflinePanel() {
  panelVisible.value = true;
  loadStats();
}

async function downloadData() {
  try {
    const blob = await offlineData.exportBackup();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `熊猫笔记_备份_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success('备份导出成功');
  } catch (error: any) {
    ElMessage.error('导出失败: ' + error.message);
  }
}

async function syncNow() {
  await syncQueue.processQueue();
  ElMessage.success('同步完成');
  loadStats();
}

async function clearLocalData() {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有本地数据吗？清除后需要重新下载才能离线使用。',
      '清除本地数据',
      {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    await offlineData.clearAllData();
    ElMessage.success('本地数据已清除');
    loadStats();
  } catch {
    // 取消
  }
}

function downloadDebugLogs() {
  debugLogger.downloadLogs();
}

function clearDebugLogs() {
  debugLogger.clearLogs();
  ElMessage.success('日志已清空');
}

function formatLogTime(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}
</script>

<style scoped>
.offline-banner {
  background: #ecf5ff;
  border-bottom: 1px solid #d9ecff;
  padding: 8px 20px;
  transition: all 0.3s;
}

.offline-banner.offline {
  background: #fef0f0;
  border-bottom-color: #fde2e2;
}

.offline-banner.syncing {
  background: #fdf6ec;
  border-bottom-color: #faecd8;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67c23a;
}

.status-dot.offline {
  background: #f56c6c;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 13px;
  color: #606266;
}

.offline-banner.offline .status-text {
  color: #f56c6c;
}

.banner-right {
  display: flex;
  gap: 8px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.offline-panel {
  min-height: 300px;
}

.status-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.summary-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
}

.summary-icon.online {
  background: #f0f9eb;
  color: #67c23a;
}

.summary-icon.pending {
  background: #ecf5ff;
  color: #409eff;
}

.summary-icon.failed {
  background: #fef0f0;
  color: #f56c6c;
}

.summary-label {
  font-size: 12px;
  color: #909399;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #303133;
}

.failed-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.failed-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f2f6fc;
}

.failed-item:last-child {
  border-bottom: none;
}

.failed-info {
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 4px;
}

.failed-op {
  padding: 1px 6px;
  background: #fef0f0;
  color: #f56c6c;
  border-radius: 3px;
  font-size: 11px;
}

.failed-store {
  color: #606266;
}

.failed-id {
  color: #909399;
  font-size: 12px;
}

.failed-error {
  font-size: 12px;
  color: #f56c6c;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.local-data-section,
.debug-section {
  padding: 8px 0;
}

.data-stats {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e4e7ed;
  font-size: 14px;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-value {
  font-weight: 600;
  color: #303133;
}

.data-actions {
  display: flex;
  gap: 12px;
}

.debug-log-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.debug-log-item {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid #f2f6fc;
}

.debug-log-item:last-child {
  border-bottom: none;
}

.debug-log-item.error {
  background: #fef0f0;
}

.debug-log-item.warn {
  background: #fdf6ec;
}

.log-time {
  color: #909399;
  flex-shrink: 0;
}

.log-level {
  font-weight: bold;
  flex-shrink: 0;
  min-width: 50px;
}

.debug-log-item.error .log-level {
  color: #f56c6c;
}

.debug-log-item.warn .log-level {
  color: #e6a23c;
}

.debug-log-item.info .log-level {
  color: #409eff;
}

.debug-log-item.debug .log-level {
  color: #909399;
}

.log-module {
  color: #67c23a;
  flex-shrink: 0;
}

.log-message {
  color: #606266;
  flex: 1;
  word-break: break-all;
}
</style>
