<template>
  <el-dialog
    v-model="visible"
    title="下载到本地"
    width="520px"
    :close-on-click-modal="false"
    :show-close="true"
  >
    <div class="offline-dialog">
      <div v-if="!hasDownloaded" class="intro-section">
        <div class="intro-icon">📥</div>
        <div class="intro-title">下载数据到本地</div>
        <div class="intro-desc">
          将您的所有数据下载到本地存储，即使没有网络也可以正常浏览和使用。<br />
          数据保存在浏览器本地，安全可靠。
        </div>
        <div class="intro-hint">
          <el-icon><InfoFilled /></el-icon>
          <span>首次使用需要联网下载，后续可离线使用</span>
        </div>
      </div>

      <div v-if="isDownloading" class="download-section">
        <div class="progress-header">
          <span class="progress-label">{{ currentStep }}</span>
          <span class="progress-percent">{{ downloadProgress }}%</span>
        </div>
        <el-progress
          :percentage="downloadProgress"
          :stroke-width="8"
          :show-text="false"
          color="#409eff"
        />

        <div class="step-list">
          <div
            v-for="(step, idx) in downloadSteps"
            :key="step.key"
            class="step-item"
            :class="step.status"
          >
            <div class="step-icon">
              <el-icon v-if="step.status === 'pending'"><Clock /></el-icon>
              <el-icon v-else-if="step.status === 'loading'" class="spin-icon"><Loading /></el-icon>
              <el-icon v-else-if="step.status === 'success'" class="success-icon"><CircleCheckFilled /></el-icon>
              <el-icon v-else class="error-icon"><CircleCloseFilled /></el-icon>
            </div>
            <div class="step-info">
              <span class="step-name">{{ step.label }}</span>
              <span class="step-count" v-if="step.status === 'success'">{{ step.count }} 条</span>
              <span class="step-error" v-else-if="step.status === 'error'">{{ step.errorMsg }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasDownloaded && !isDownloading" class="result-section">
        <div class="result-icon success">✅</div>
        <div class="result-title">下载完成</div>
        <div class="result-desc">
          所有数据已下载到本地，现在可以离线使用了。
        </div>
        <div class="result-stats">
          <div class="stat-item">
            <div class="stat-value">{{ totalRecords }}</div>
            <div class="stat-label">数据总数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formattedLastSync }}</div>
            <div class="stat-label">同步时间</div>
          </div>
        </div>
      </div>

      <div v-if="downloadError && !isDownloading" class="error-section">
        <el-alert :title="downloadError" type="error" :closable="false" show-icon />
      </div>

      <div class="action-section">
        <template v-if="!hasDownloaded && !isDownloading">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="startDownload" :loading="isDownloading">
            开始下载
          </el-button>
        </template>
        <template v-else-if="isDownloading">
          <el-button disabled>下载中...</el-button>
        </template>
        <template v-else>
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon>
            导出备份
          </el-button>
          <el-button @click="startDownload" :loading="isDownloading">
            <el-icon><Refresh /></el-icon>
            重新下载
          </el-button>
          <el-button type="primary" @click="handleClose">
            完成
          </el-button>
        </template>
      </div>
    </div>

    <input
      ref="importInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFile"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { InfoFilled, Clock, Loading, CircleCheckFilled, CircleCloseFilled, Download, Refresh } from '@element-plus/icons-vue';
import { useOfflineData } from '~/composables/useOfflineData';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const offlineData = useOfflineData();
const importInputRef = ref<HTMLInputElement | null>(null);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const isDownloading = computed(() => offlineData.isDownloading.value);
const downloadProgress = computed(() => offlineData.downloadProgress.value);
const currentStep = computed(() => offlineData.currentStep.value);
const downloadSteps = computed(() => offlineData.downloadSteps.value);
const downloadError = computed(() => offlineData.downloadError.value);

const hasDownloaded = computed(() => offlineData.lastSyncTime.value > 0);
const totalRecords = ref(0);

const formattedLastSync = computed(() => {
  if (!offlineData.lastSyncTime.value) return '从未';
  return new Date(offlineData.lastSyncTime.value).toLocaleString('zh-CN');
});

watch(visible, async (val) => {
  if (val && hasDownloaded.value) {
    loadStats();
  }
});

async function loadStats() {
  const stats = await offlineData.getStats();
  totalRecords.value = stats.totalRecords;
}

async function startDownload() {
  console.log('[OfflineDownloadDialog] 开始下载');
  const success = await offlineData.downloadAllData();
  if (success) {
    console.log('[OfflineDownloadDialog] 下载成功');
    await loadStats();
    ElMessage.success('数据下载完成');
    emit('success');
  } else {
    console.error('[OfflineDownloadDialog] 下载失败');
    ElMessage.error(downloadError.value || '下载失败');
  }
}

async function handleExport() {
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
    console.error('[OfflineDownloadDialog] 导出失败:', error);
    ElMessage.error('导出失败: ' + (error.message || '未知错误'));
  }
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  ElMessageBox.confirm(
    `确定要从备份文件 "${file.name}" 导入数据吗？\n这将覆盖当前本地数据。`,
    '导入备份',
    {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      const success = await offlineData.importBackup(file);
      if (success) {
        ElMessage.success('备份导入成功');
        await loadStats();
      } else {
        ElMessage.error('导入失败');
      }
    })
    .catch(() => {})
    .finally(() => {
      input.value = '';
    });
}

function handleClose() {
  visible.value = false;
}
</script>

<style scoped>
.offline-dialog {
  padding: 8px 0;
}

.intro-section {
  text-align: center;
  padding: 16px 0 24px;
}

.intro-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.intro-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.intro-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 16px;
}

.intro-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.download-section {
  padding: 8px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.progress-percent {
  font-weight: 600;
  color: #409eff;
}

.step-list {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #f2f6fc;
  transition: background 0.2s;
}

.step-item:last-child {
  border-bottom: none;
}

.step-item.loading {
  background: #ecf5ff;
}

.step-item.success {
  background: #f0f9eb;
}

.step-item.error {
  background: #fef0f0;
}

.step-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.spin-icon {
  animation: spin 1s linear infinite;
  color: #409eff;
}

.success-icon {
  color: #67c23a;
}

.error-icon {
  color: #f56c6c;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  font-size: 13px;
}

.step-name {
  color: #303133;
}

.step-count {
  color: #67c23a;
  font-size: 12px;
}

.step-error {
  color: #f56c6c;
  font-size: 12px;
}

.result-section {
  text-align: center;
  padding: 16px 0 24px;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.result-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.result-desc {
  font-size: 14px;
  color: #606266;
  margin-bottom: 20px;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.error-section {
  margin-bottom: 16px;
}

.action-section {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f2f6fc;
}
</style>
