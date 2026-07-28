<template>
  <el-dialog
    v-model="dialogVisible"
    title="版本历史"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="version-history-dialog">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <el-empty v-else-if="versions.length === 0" description="暂无版本记录" />

      <template v-else>
        <!-- 版本对比模式 -->
        <div v-if="diffMode" class="diff-view">
          <div class="diff-header">
            <el-button @click="exitDiffMode">返回版本列表</el-button>
            <span class="diff-title">版本对比：v{{ diffResult?.versionA }} vs v{{ diffResult?.versionB }}</span>
          </div>

          <div class="diff-content">
            <h4>新增字段</h4>
            <div v-if="Object.keys(diffResult?.additions || {}).length === 0" class="diff-empty">无新增</div>
            <div v-else class="diff-list">
              <div v-for="(val, key) in diffResult?.additions" :key="key" class="diff-item diff-addition">
                <span class="diff-key">{{ key }}</span>
                <span class="diff-value">+ {{ formatValue(val) }}</span>
              </div>
            </div>

            <h4>删除字段</h4>
            <div v-if="Object.keys(diffResult?.deletions || {}).length === 0" class="diff-empty">无删除</div>
            <div v-else class="diff-list">
              <div v-for="(val, key) in diffResult?.deletions" :key="key" class="diff-item diff-deletion">
                <span class="diff-key">{{ key }}</span>
                <span class="diff-value">- {{ formatValue(val) }}</span>
              </div>
            </div>

            <h4>修改字段</h4>
            <div v-if="Object.keys(diffResult?.modifications || {}).length === 0" class="diff-empty">无修改</div>
            <div v-else class="diff-list">
              <div v-for="(change, key) in diffResult?.modifications" :key="key" class="diff-item diff-modification">
                <span class="diff-key">{{ key }}</span>
                <span class="diff-value diff-old">- {{ formatValue(change.old) }}</span>
                <span class="diff-value diff-new">+ {{ formatValue(change.new) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 版本快照查看模式 -->
        <el-dialog
          v-model="snapshotVisible"
          :title="`版本 v${currentViewVersion} 快照`"
          width="700px"
          append-to-body
        >
          <pre class="snapshot-json">{{ formatJSON(currentSnapshot) }}</pre>
        </el-dialog>

        <!-- 版本列表 -->
        <el-timeline class="version-timeline">
          <el-timeline-item
            v-for="v in versions"
            :key="v.id"
            :timestamp="formatDate(v.createdAt)"
            placement="top"
          >
            <el-card class="version-card">
              <template #header>
                <div class="version-header">
                  <el-tag type="primary" size="small">v{{ v.version }}</el-tag>
                  <span class="version-user">{{ v.userName }}</span>
                </div>
              </template>

              <div class="version-body">
                <p class="version-summary">{{ v.changeSummary || '无变更说明' }}</p>
              </div>

              <div class="version-actions">
                <el-button size="small" @click="viewSnapshot(v)">查看快照</el-button>
                <el-button size="small" type="info" @click="selectForDiff(v)">对比</el-button>
                <el-button size="small" type="warning" @click="handleRestore(v)">恢复至此版本</el-button>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <!-- 对比选择提示 -->
        <div v-if="diffSelectA || diffSelectB" class="diff-select-hint">
          <el-alert
            :title="diffHint"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <div v-if="diffSelectA && diffSelectB" class="diff-actions">
                <el-button type="primary" size="small" @click="doDiff">执行对比</el-button>
                <el-button size="small" @click="clearDiffSelection">取消</el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </template>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { VersionRecord, VersionDiffResult } from '~/composables/useVersionHistory';

const props = defineProps<{
  entityType: string;
  entityId: number;
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'restored': [version: VersionRecord];
}>();

const { getVersions, getVersion, restoreVersion, diffVersions } = useVersionHistory();

const dialogVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val),
});

const versions = ref<VersionRecord[]>([]);
const loading = ref(false);

// 快照查看
const snapshotVisible = ref(false);
const currentViewVersion = ref(0);
const currentSnapshot = ref<Record<string, any>>({});

// 版本对比
const diffMode = ref(false);
const diffResult = ref<VersionDiffResult | null>(null);
const diffSelectA = ref<VersionRecord | null>(null);
const diffSelectB = ref<VersionRecord | null>(null);

const diffHint = computed(() => {
  if (diffSelectA.value && diffSelectB.value) {
    return `已选择 v${diffSelectA.value.version} 和 v${diffSelectB.value.version} 进行对比`;
  }
  if (diffSelectA.value) {
    return `已选择基准版本 v${diffSelectA.value.version}，请选择对比版本`;
  }
  return '';
});

watch(dialogVisible, async (val) => {
  if (val) {
    await loadVersions();
  }
});

async function loadVersions() {
  loading.value = true;
  try {
    versions.value = await getVersions(props.entityType, props.entityId);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function formatJSON(obj: Record<string, any>): string {
  return JSON.stringify(obj, null, 2);
}

async function viewSnapshot(v: VersionRecord) {
  const record = await getVersion(props.entityType, props.entityId, v.version);
  if (record) {
    currentViewVersion.value = record.version;
    currentSnapshot.value = record.snapshot;
    snapshotVisible.value = true;
  }
}

function selectForDiff(v: VersionRecord) {
  if (!diffSelectA.value) {
    diffSelectA.value = v;
  } else if (!diffSelectB.value) {
    if (v.id === diffSelectA.value.id) {
      diffSelectA.value = null;
    } else {
      diffSelectB.value = v;
    }
  } else {
    diffSelectA.value = v;
    diffSelectB.value = null;
  }
}

function clearDiffSelection() {
  diffSelectA.value = null;
  diffSelectB.value = null;
}

async function doDiff() {
  if (!diffSelectA.value || !diffSelectB.value) return;

  const result = await diffVersions(
    props.entityType,
    props.entityId,
    diffSelectA.value.version,
    diffSelectB.value.version,
  );

  if (result) {
    diffResult.value = result;
    diffMode.value = true;
    diffSelectA.value = null;
    diffSelectB.value = null;
  }
}

function exitDiffMode() {
  diffMode.value = false;
  diffResult.value = null;
}

async function handleRestore(v: VersionRecord) {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 v${v.version} 吗？这将创建一个包含该版本快照的新版本。`,
      '确认恢复',
      { type: 'warning' },
    );

    const result = await restoreVersion(props.entityType, props.entityId, v.version);
    if (result) {
      ElMessage.success(`已恢复至版本 v${v.version}`);
      emit('restored', result);
      await loadVersions();
    }
  } catch {
    // 用户取消
  }
}

function handleClose() {
  diffMode.value = false;
  diffResult.value = null;
  diffSelectA.value = null;
  diffSelectB.value = null;
}
</script>

<style scoped>
.version-history-dialog {
  max-height: 600px;
  overflow-y: auto;
}

.loading-container {
  padding: 20px;
}

.version-timeline {
  padding: 10px 0;
}

.version-card {
  margin-bottom: 8px;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-user {
  font-size: 13px;
  color: #606266;
}

.version-body {
  margin-bottom: 10px;
}

.version-summary {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.version-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.snapshot-json {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  max-height: 500px;
  overflow: auto;
}

.diff-view {
  padding: 10px 0;
}

.diff-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.diff-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.diff-content h4 {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #606266;
}

.diff-empty {
  color: #c0c4cc;
  font-size: 13px;
  padding: 4px 0;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diff-item {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.diff-addition {
  background: #f0f9eb;
  border-left: 3px solid #67c23a;
}

.diff-deletion {
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
}

.diff-modification {
  background: #fdf6ec;
  border-left: 3px solid #e6a23c;
}

.diff-key {
  font-weight: 600;
  color: #303133;
  margin-right: 8px;
}

.diff-value {
  display: block;
  margin-top: 4px;
}

.diff-old {
  color: #f56c6c;
}

.diff-new {
  color: #67c23a;
}

.diff-select-hint {
  margin-top: 16px;
}

.diff-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
