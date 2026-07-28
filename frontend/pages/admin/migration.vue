<template>
  <div class="migration-page">
    <div class="migration-header">
      <h1>📊 数据迁移工具</h1>
      <p class="sub-title">将历史日记与日程任务建立关联关系</p>
    </div>

    <div class="migration-content">
      <!-- 团队选择 -->
      <div class="team-selector">
        <h3>选择团队</h3>
        <el-radio-group v-model="selectedTeam" @change="onTeamChange">
          <el-radio-button value="team1">团队 1</el-radio-button>
          <el-radio-button value="team2">团队 2</el-radio-button>
          <el-radio-button value="team3">团队 3</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 预览结果 -->
      <div v-if="previewData" class="preview-section">
        <h3>📋 迁移预览</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">日记总数</div>
            <div class="stat-value">{{ previewData.stats.totalDiaries }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">日程总数</div>
            <div class="stat-value">{{ previewData.stats.totalSchedules }}</div>
          </div>
          <div class="stat-card success">
            <div class="stat-label">可匹配日记</div>
            <div class="stat-value">{{ previewData.stats.matchedDiaries }}</div>
            <div class="stat-percent">{{ matchRate }}%</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-label">无法匹配日记</div>
            <div class="stat-value">{{ previewData.stats.unmatchedDiaries }}</div>
          </div>
          <div class="stat-card info">
            <div class="stat-label">已有关联</div>
            <div class="stat-value">{{ previewData.stats.existingRelations }}</div>
          </div>
        </div>

        <!-- 未匹配日记详情 -->
        <div v-if="previewData.unmatchedDiaries.length > 0" class="unmatched-section">
          <h4>⚠️ 无法匹配的日记（前 50 条）</h4>
          <el-table :data="previewData.unmatchedDiaries" stripe border max-height="400">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="shipName" label="船舶" width="150" />
            <el-table-column label="分类" width="200">
              <template #default="{ row }">
                {{ row.categoryFirst }} / {{ row.categorySecond }}
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="未匹配原因" />
          </el-table>
        </div>

        <!-- 执行按钮 -->
        <div class="action-buttons">
          <el-button type="primary" size="large" @click="executeMigration" :loading="executing">
            🚀 执行迁移
          </el-button>
          <el-button size="large" @click="previewMigration">🔄 刷新预览</el-button>
        </div>
      </div>

      <!-- 执行结果 -->
      <div v-if="executionResult" class="execution-result">
        <h3>✅ 迁移完成</h3>
        <el-result icon="success" :title="executionResult.message">
          <template #sub-title>
            <div class="result-details">
              <p>总日记数: {{ executionResult.data.totalDiaries }}</p>
              <p>成功匹配: {{ executionResult.data.matchedDiaries }}</p>
              <p>新建关联: {{ executionResult.data.newRelations }}</p>
              <p>未匹配: {{ executionResult.data.unmatchedDiaries }}</p>
            </div>
          </template>
        </el-result>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <el-skeleton :rows="5" animated />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

definePageMeta({ middleware: ['auth'] });

const api = useApi();

const selectedTeam = ref('team1');
const loading = ref(false);
const executing = ref(false);
const previewData = ref<any>(null);
const executionResult = ref<any>(null);

const matchRate = computed(() => {
  if (!previewData.value) return 0;
  const total = previewData.value.stats.totalDiaries;
  const matched = previewData.value.stats.matchedDiaries;
  return total > 0 ? Math.round((matched / total) * 100) : 0;
});

const onTeamChange = () => {
  previewData.value = null;
  executionResult.value = null;
  previewMigration();
};

const previewMigration = async () => {
  loading.value = true;
  try {
    const res = await api.migration.preview(selectedTeam.value);
    if (res.success) {
      previewData.value = res.data;
    } else {
      ElMessage.error(res.message || '预览失败');
    }
  } catch (error: any) {
    ElMessage.error('预览失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const executeMigration = async () => {
  if (!previewData.value) {
    ElMessage.warning('请先预览迁移数据');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要执行迁移吗？这将创建约 ${previewData.value.stats.matchedDiaries} 条关联关系。`,
      '确认执行',
      {
        confirmButtonText: '确定执行',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    return;
  }

  executing.value = true;
  try {
    const res = await api.migration.execute(selectedTeam.value);
    if (res.success) {
      executionResult.value = res;
      ElMessage.success(res.message);
      // 刷新预览
      await previewMigration();
    } else {
      ElMessage.error(res.message || '执行失败');
    }
  } catch (error: any) {
    ElMessage.error('执行失败: ' + error.message);
  } finally {
    executing.value = false;
  }
};

// 初始加载
previewMigration();
</script>

<style scoped>
.migration-page {
  padding: var(--spacing-lg);
  background: var(--color-bg);
  min-height: calc(100vh - 56px);
}

.migration-header {
  margin-bottom: var(--spacing-lg);
}

.migration-header h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text);
}

.sub-title {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.migration-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.team-selector {
  margin-bottom: var(--spacing-lg);
}

.team-selector h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

.preview-section {
  margin-top: var(--spacing-lg);
}

.preview-section h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-card.success {
  border-color: var(--color-success);
  background: #f0f9ff;
}

.stat-card.warning {
  border-color: var(--color-warning);
  background: #fff7e6;
}

.stat-card.info {
  border-color: var(--color-info);
  background: #e6f7ff;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.stat-percent {
  font-size: var(--font-size-sm);
  color: var(--color-success);
  font-weight: 600;
}

.unmatched-section {
  margin-top: var(--spacing-lg);
}

.unmatched-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.action-buttons {
  margin-top: var(--spacing-lg);
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.execution-result {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: #f6ffed;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-success);
}

.execution-result h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-success);
}

.result-details {
  text-align: left;
  margin-top: var(--spacing-md);
}

.result-details p {
  margin: var(--spacing-xs) 0;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.loading-section {
  margin-top: var(--spacing-lg);
}
</style>
