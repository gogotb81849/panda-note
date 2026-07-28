<template>
  <div class="party-config-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">📋 差异化党建配置（一船一策）</h2>
        <p class="page-subtitle">为每艘船舶配置专属的党建活动策略，实现精准化、差异化管理</p>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchText"
          placeholder="搜索船舶名称..."
          size="default"
          clearable
          style="width: 240px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <span class="stat-label">总船舶数</span>
            <span class="stat-value">{{ filteredShips.length }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <span class="stat-label">已配置</span>
            <span class="stat-value configed">{{ configuredCount }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <span class="stat-label">未配置</span>
            <span class="stat-value unconfigured">{{ unconfiguredCount }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <span class="stat-label">配置率</span>
            <span class="stat-value">{{ configRate }}%</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 船舶配置卡片列表 -->
    <div v-loading="loading" class="ships-grid">
      <el-card
        v-for="ship in filteredShips"
        :key="ship.shipId"
        shadow="hover"
        :class="['ship-card', { editing: editingShipId === ship.shipId }]"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="ship-info">
            <span class="ship-name">{{ ship.shipName }}</span>
            <el-tag v-if="ship.politicalInstructor" size="small" type="info" class="ml-2">
              {{ ship.politicalInstructor }}
            </el-tag>
            <el-tag
              :type="ship.hasOverride ? 'success' : 'warning'"
              size="small"
              class="ml-2"
            >
              {{ ship.hasOverride ? '已配置' : '未配置' }}
            </el-tag>
          </div>
          <el-button
            v-if="editingShipId !== ship.shipId"
            type="primary"
            size="small"
            @click="startEdit(ship)"
          >
            <el-icon><Edit /></el-icon>
            {{ ship.hasOverride ? '编辑' : '配置' }}
          </el-button>
        </div>

        <!-- 查看模式 -->
        <div v-if="editingShipId !== ship.shipId" class="card-body">
          <div class="config-item">
            <span class="config-label">活动频率：</span>
            <el-tag size="small" :type="getFreqTagType(ship.config.activityFrequency)">
              {{ getFrequencyLabel(ship.config.activityFrequency) || '未设置' }}
            </el-tag>
          </div>
          <div class="config-item">
            <span class="config-label">学习主题：</span>
            <span v-if="ship.config.studyTopics?.length" class="config-value">
              <el-tag
                v-for="topic in ship.config.studyTopics"
                :key="topic"
                size="small"
                class="topic-tag"
              >
                {{ topic }}
              </el-tag>
            </span>
            <span v-else class="config-empty">未设置</span>
          </div>
          <div class="config-item">
            <span class="config-label">报告模板：</span>
            <span class="config-value">
              {{ getTemplateName(ship.config.reportTemplateId) || '未设置' }}
            </span>
          </div>
          <div class="config-item" v-if="ship.config.specialRequirements">
            <span class="config-label">特殊要求：</span>
            <span class="config-value special">{{ ship.config.specialRequirements }}</span>
          </div>
          <div class="config-item" v-if="ship.hasOverride">
            <span class="config-label">最后更新：</span>
            <span class="config-value text-gray-400 text-sm">{{ formatDate(ship.updatedAt) }}</span>
          </div>
        </div>

        <!-- 编辑模式 -->
        <div v-else class="card-body edit-mode">
          <el-form :model="editForm" label-width="90px" label-position="left" size="default">
            <el-form-item label="活动频率">
              <el-select v-model="editForm.activityFrequency" style="width: 100%">
                <el-option label="每周" value="weekly" />
                <el-option label="双周" value="biweekly" />
                <el-option label="每月" value="monthly" />
              </el-select>
            </el-form-item>

            <el-form-item label="学习主题">
              <el-select
                v-model="editForm.studyTopics"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入学习主题"
                style="width: 100%"
              >
                <el-option
                  v-for="topic in presetTopics"
                  :key="topic"
                  :label="topic"
                  :value="topic"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="报告模板">
              <el-select
                v-model="editForm.reportTemplateId"
                placeholder="选择报告模板"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="tpl in templates"
                  :key="tpl.id"
                  :label="tpl.title"
                  :value="tpl.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="特殊要求">
              <el-input
                v-model="editForm.specialRequirements"
                type="textarea"
                :rows="3"
                placeholder="输入该船舶的特殊党建要求..."
              />
            </el-form-item>
          </el-form>

          <div class="edit-actions">
            <el-button @click="cancelEdit">取消</el-button>
            <el-button type="primary" :loading="saving" @click="saveConfig(ship.shipId)">
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
          </div>
        </div>
      </el-card>

      <el-empty v-if="!loading && filteredShips.length === 0" description="暂无船舶数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Edit, Check } from '@element-plus/icons-vue';
import { useApi } from '~/composables/useApi';

const api = useApi();

// 船舶列表
interface ShipConfig {
  shipId: number;
  shipName: string;
  teamCode: string;
  politicalInstructor: string | null;
  config: {
    activityFrequency?: 'weekly' | 'biweekly' | 'monthly';
    studyTopics?: string[];
    reportTemplateId?: number;
    specialRequirements?: string;
  };
  hasOverride: boolean;
  updatedAt: string | null;
  updatedBy: number | null;
}

const ships = ref<ShipConfig[]>([]);
const loading = ref(false);
const searchText = ref('');

// 编辑状态
const editingShipId = ref<number | null>(null);
const saving = ref(false);
const editForm = ref({
  activityFrequency: '' as string,
  studyTopics: [] as string[],
  reportTemplateId: undefined as number | undefined,
  specialRequirements: '' as string,
});

// 模板列表
const templates = ref<{ id: number; title: string }[]>([]);

// 预设学习主题
const presetTopics = [
  '习近平新时代中国特色社会主义思想',
  '党的二十大精神',
  '党章党规',
  '党史学习教育',
  '党风廉政建设',
  '船舶安全管理',
  '船员思想教育',
  '组织生活会',
  '民主评议',
  '形势政策教育',
];

// 过滤后的船舶列表
const filteredShips = computed(() => {
  if (!searchText.value) return ships.value;
  const keyword = searchText.value.toLowerCase();
  return ships.value.filter(
    (s) =>
      s.shipName.toLowerCase().includes(keyword) ||
      (s.politicalInstructor && s.politicalInstructor.toLowerCase().includes(keyword)),
  );
});

// 统计
const configuredCount = computed(() => ships.value.filter((s) => s.hasOverride).length);
const unconfiguredCount = computed(() => ships.value.filter((s) => !s.hasOverride).length);
const configRate = computed(() => {
  if (ships.value.length === 0) return 0;
  return Math.round((configuredCount.value / ships.value.length) * 100);
});

// 频率标签
const frequencyLabels: Record<string, string> = {
  weekly: '每周',
  biweekly: '双周',
  monthly: '每月',
};

function getFrequencyLabel(freq?: string) {
  return freq ? frequencyLabels[freq] || freq : '';
}

function getFreqTagType(freq?: string) {
  if (freq === 'weekly') return 'danger';
  if (freq === 'biweekly') return 'warning';
  if (freq === 'monthly') return 'info';
  return '';
}

function getTemplateName(id?: number) {
  if (!id) return '';
  const tpl = templates.value.find((t) => t.id === id);
  return tpl?.title || '';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 加载数据
async function loadShips() {
  loading.value = true;
  try {
    const data = await api.apiFetch('/party-config/ships');
    ships.value = data;
  } catch (error) {
    ElMessage.error('加载船舶配置失败');
  } finally {
    loading.value = false;
  }
}

async function loadTemplates() {
  try {
    const data = await api.apiFetch('/publish-templates');
    templates.value = data;
  } catch (error) {
    // 模板加载失败不影响主流程
  }
}

// 编辑操作
function startEdit(ship: ShipConfig) {
  editingShipId.value = ship.shipId;
  editForm.value = {
    activityFrequency: ship.config.activityFrequency || '',
    studyTopics: [...(ship.config.studyTopics || [])],
    reportTemplateId: ship.config.reportTemplateId,
    specialRequirements: ship.config.specialRequirements || '',
  };
}

function cancelEdit() {
  editingShipId.value = null;
}

async function saveConfig(shipId: number) {
  saving.value = true;
  try {
    await api.apiFetch(`/party-config/ship/${shipId}`, {
      method: 'PUT',
      body: {
        activityFrequency: editForm.value.activityFrequency || undefined,
        studyTopics: editForm.value.studyTopics,
        reportTemplateId: editForm.value.reportTemplateId || undefined,
        specialRequirements: editForm.value.specialRequirements || undefined,
      },
    });
    ElMessage.success('配置保存成功');
    cancelEdit();
    await loadShips();
  } catch (error) {
    ElMessage.error('保存配置失败');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadShips();
  loadTemplates();
});
</script>

<style scoped>
.party-config-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 6px 0;
}

.page-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.stat-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.stat-value.configed {
  color: #67c23a;
}

.stat-value.unconfigured {
  color: #e6a23c;
}

.ships-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.ship-card {
  border-radius: 10px;
  border: 1px solid #ebeef5;
  transition: all 0.3s ease;
}

.ship-card:hover {
  border-color: #c0c4cc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.ship-card.editing {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
}

.ship-card :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
  border-radius: 10px 10px 0 0;
}

.ship-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ship-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.card-body {
  padding: 16px 18px;
}

.config-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
  line-height: 1.6;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  min-width: 75px;
  flex-shrink: 0;
}

.config-value {
  font-size: 13px;
  color: #303133;
}

.config-empty {
  font-size: 13px;
  color: #c0c4cc;
}

.config-value.special {
  color: #e6a23c;
  font-style: italic;
}

.topic-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.edit-mode {
  background: #fafbfc;
}

.edit-mode :deep(.el-form-item) {
  margin-bottom: 14px;
}

.edit-mode :deep(.el-form-item__label) {
  font-size: 13px;
  color: #606266;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  margin-top: 4px;
}

.ml-2 {
  margin-left: 8px;
}

.text-gray-400 {
  color: #c0c4cc;
}

.text-sm {
  font-size: 12px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  .ships-grid {
    grid-template-columns: 1fr;
  }

  .stats-row .el-col {
    margin-bottom: 8px;
  }
}
</style>