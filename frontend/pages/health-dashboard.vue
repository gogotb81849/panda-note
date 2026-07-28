<template>
  <div class="health-dashboard">
    <div class="page-header">
      <div>
        <h2 class="page-title">船员健康排查看板</h2>
        <p class="page-desc">月度船舶船员健康数据总览</p>
      </div>
      <div class="header-actions">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          placeholder="选择月份"
          format="YYYY-MM"
          value-format="YYYY-MM"
          @change="fetchDashboard"
        />
        <el-button-group class="export-btns">
          <el-button @click="exportSummary" :icon="Download" :loading="exporting">导出汇总</el-button>
          <el-button @click="exportAbnormal" :icon="Download" :loading="exporting">导出异常清单</el-button>
        </el-button-group>
        <el-button type="warning" @click="urgeBatch" :loading="urgingBatch" :disabled="dashboard.unsubmittedShips === 0">
          批量催报 ({{ dashboard.unsubmittedShips }})
        </el-button>
      </div>
    </div>

    <!-- 环比分析提示 -->
    <el-alert v-if="dashboard.comparisonText" :title="dashboard.comparisonText" type="info" :closable="false" show-icon class="comparison-alert" />

    <!-- 顶部数据总览卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card stat-clickable" @click="onStatClick('total')">
        <div class="stat-value">{{ dashboard.totalShips }}</div>
        <div class="stat-label">应报送船舶</div>
      </el-card>
      <el-card class="stat-card stat-green stat-clickable" @click="onStatClick('normal')">
        <div class="stat-value">{{ dashboard.normalShips }}</div>
        <div class="stat-label">正常提交</div>
      </el-card>
      <el-card class="stat-card stat-yellow stat-clickable" @click="onStatClick('abnormal')">
        <div class="stat-value">{{ dashboard.abnormalShips }}</div>
        <div class="stat-label">格式异常</div>
      </el-card>
      <el-card class="stat-card stat-gray stat-clickable" @click="onStatClick('unsubmitted')">
        <div class="stat-value">{{ dashboard.unsubmittedShips }}</div>
        <div class="stat-label">未报送</div>
        <div v-if="dashboard.unsubmittedShipNames?.length" class="stat-detail">{{ dashboard.unsubmittedShipNames.join('、') }}</div>
      </el-card>
      <el-card class="stat-card stat-clickable" @click="onStatClick('crew')">
        <div class="stat-value">{{ dashboard.totalCrew }}</div>
        <div class="stat-label">排查船员总数</div>
      </el-card>
      <el-card class="stat-card stat-red stat-clickable" @click="onStatClick('health')">
        <div class="stat-value">{{ dashboard.healthAbnormalTotal }}</div>
        <div class="stat-label">生理异常</div>
      </el-card>
      <el-card class="stat-card stat-orange stat-clickable" @click="onStatClick('psych')">
        <div class="stat-value">{{ dashboard.psychAbnormalTotal }}</div>
        <div class="stat-label">心理异常</div>
      </el-card>
      <el-card class="stat-card stat-blue">
        <div class="stat-value">{{ dashboard.submissionRate }}%</div>
        <div class="stat-label">报送完成率</div>
      </el-card>
    </div>

    <!-- 筛选和排序 -->
    <div class="filter-bar">
      <el-radio-group v-model="filterStatus" @change="filterShips">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="unsubmitted">未上报</el-radio-button>
        <el-radio-button label="abnormal">格式异常</el-radio-button>
        <el-radio-button label="health">生理异常</el-radio-button>
        <el-radio-button label="psych">心理异常</el-radio-button>
      </el-radio-group>
      <el-select v-model="sortBy" placeholder="排序方式" style="width: 180px" @change="filterShips">
        <el-option label="按风险高低" value="risk" />
        <el-option label="按未上报优先" value="unsubmitted" />
        <el-option label="按船名排序" value="name" />
      </el-select>
    </div>

    <!-- 船舶卡片矩阵 -->
    <div class="ship-grid">
      <el-card
        v-for="ship in filteredShips"
        :key="ship.shipId"
        class="ship-card"
        :class="`ship-${ship.riskLevel}`"
        @click="showShipDetail(ship)"
      >
        <div class="ship-header">
          <h3 class="ship-name">{{ ship.shipName }}</h3>
          <el-tag
            :type="ship.riskLevel === 'green' ? 'success' : 
                    ship.riskLevel === 'yellow' ? 'warning' : 
                    ship.riskLevel === 'red' ? 'danger' : 'info'"
            size="small"
          >
            {{ getStatusText(ship) }}
          </el-tag>
        </div>
        <div class="ship-status-text">{{ getSubmissionText(ship) }}</div>
        <div class="ship-stats">
          <div class="stat-item">
            <span class="stat-num">{{ ship.crewCount }}</span>
            <span class="stat-text">排查人数</span>
          </div>
          <div v-if="ship.healthAbnormalCount > 0" class="stat-item stat-red">
            <span class="stat-num">{{ ship.healthAbnormalCount }}</span>
            <span class="stat-text">生理异常</span>
          </div>
          <div v-if="ship.psychAbnormalCount > 0" class="stat-item stat-orange">
            <span class="stat-num">{{ ship.psychAbnormalCount }}</span>
            <span class="stat-text">心理异常</span>
          </div>
        </div>
        <div class="ship-actions">
          <el-button size="small" type="primary" link @click.stop="showShipDetail(ship)">
            查看详情
          </el-button>
          <el-button v-if="ship.riskLevel !== 'gray'" size="small" type="info" link @click.stop="downloadRawExcel(ship)">
            下载Excel
          </el-button>
          <el-button v-if="ship.riskLevel === 'gray'" size="small" type="warning" link @click.stop="urgeSubmit(ship)">
            催报提醒
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 单船详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`${selectedShip?.shipName} - 健康排查详情`"
      width="900px"
    >
      <div v-if="shipDetail" class="ship-detail">
        <!-- 合规状态 -->
        <el-alert
          :title="shipDetail.validationResult === 'pass' ? '✅ 表格格式完全合规' : 
                    shipDetail.validationResult === 'ai_fixed' ? '⚠️ 表格经AI容错修复' : '❌ 表格格式异常'"
          :type="shipDetail.validationResult === 'pass' ? 'success' : 
                  shipDetail.validationResult === 'ai_fixed' ? 'warning' : 'error'"
          :closable="false"
        />
        <p v-if="shipDetail.aiFixNotes" class="ai-note">{{ shipDetail.aiFixNotes }}</p>

        <!-- AI建议 -->
        <el-alert v-if="aiSuggestion" :title="aiSuggestion" type="warning" :closable="false" show-icon class="ai-suggestion" />

        <!-- 异常船员列表（置顶展开） -->
        <div v-if="shipDetail.abnormalDetails?.length > 0" class="abnormal-section">
          <h4 class="section-title">🔴 异常船员（{{ shipDetail.abnormalDetails.length }}人）</h4>
          <el-table :data="shipDetail.abnormalDetails" border stripe>
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column label="异常类型" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="getAbnormalType(row)"
                  size="small"
                >
                  {{ getAbnormalText(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="issue" label="问题说明" />
            <el-table-column label="连续追踪" width="100">
              <template #default="{ row }">
                <el-tag v-if="prevMonthAbnormalNames.includes(row.name)" type="warning" size="small">上月已有</el-tag>
                <span v-else class="text-muted">首次</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 正常船员折叠 -->
        <el-collapse v-model="activeCollapse">
          <el-collapse-item :title="`正常船员数据（共${shipDetail.crewCount}人，正常${shipDetail.crewCount - (shipDetail.abnormalDetails?.length || 0)}人）`" name="normal">
            <p class="normal-count">
              本船共排查 <strong>{{ shipDetail.crewCount }}</strong> 人，
              其中正常 <strong>{{ shipDetail.crewCount - (shipDetail.abnormalDetails?.length || 0) }}</strong> 人
            </p>
          </el-collapse-item>
        </el-collapse>

        <!-- 主管批注 -->
        <div class="notes-section">
          <h4 class="section-title">主管批注</h4>
          <el-input
            v-model="supervisorNote"
            type="textarea"
            :rows="3"
            placeholder="输入批注内容..."
          />
          <el-button type="primary" size="small" style="margin-top: 8px" @click="saveNote" :loading="savingNote">
            保存批注
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- AI月度报告 -->
    <el-card class="report-card">
      <template #header>
        <div class="report-header">
          <span>AI月度健康分析报告</span>
          <el-button type="primary" @click="generateReport" :loading="generating">
            生成报告
          </el-button>
        </div>
      </template>

      <div v-if="reportContent" class="report-content">
        <el-alert
          v-if="isDraft"
          title="此为AI生成的草稿，请审核后确认"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />
        <el-input
          v-model="reportContent"
          type="textarea"
          :rows="20"
          placeholder="报告内容将在此显示..."
        />
        <div class="report-actions">
          <el-button @click="reportContent = ''">清空</el-button>
          <el-button type="primary" @click="finalizeReport">确认定稿</el-button>
        </div>
      </div>
      <el-empty v-else description="暂无报告，点击生成" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import { useApi } from '~/composables/useApi';

const api = useApi();
const authStore = useAuthStore();

const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const dashboard = ref({
  totalShips: 0,
  normalShips: 0,
  abnormalShips: 0,
  unsubmittedShips: 0,
  unsubmittedShipNames: [] as string[],
  unsubmittedShipIds: [] as number[],
  totalCrew: 0,
  healthAbnormalTotal: 0,
  psychAbnormalTotal: 0,
  submissionRate: 0,
  comparisonText: '',
  comparisonData: null as any,
  shipCards: [] as Array<{
    shipId: number;
    shipName: string;
    status: string;
    crewCount: number;
    healthAbnormalCount: number;
    psychAbnormalCount: number;
    riskLevel: 'green' | 'yellow' | 'red' | 'gray';
    validationResult?: string;
    uploadId?: number;
  }>,
});

const filterStatus = ref('all');
const sortBy = ref('risk');
const filteredShips = ref([...dashboard.value.shipCards]);

const detailDialogVisible = ref(false);
const selectedShip = ref<any>(null);
const shipDetail = ref<any>(null);
const supervisorNote = ref('');
const activeCollapse = ref([]);
const prevMonthAbnormalNames = ref<string[]>([]);
const aiSuggestion = ref('');
const savingNote = ref(false);

const generating = ref(false);
const reportContent = ref('');
const isDraft = ref(true);
const exporting = ref(false);
const urgingBatch = ref(false);

onMounted(() => {
  fetchDashboard();
});

const fetchDashboard = async () => {
  try {
    const data = await api.healthReport.getDashboard(selectedMonth.value);
    dashboard.value = data;
    filterShips();
  } catch (e: any) {
    ElMessage.error('获取看板数据失败：' + (e.message || '网络错误'));
  }
};

const onStatClick = (type: string) => {
  switch (type) {
    case 'normal':
      filterStatus.value = 'all';
      break;
    case 'abnormal':
      filterStatus.value = 'abnormal';
      break;
    case 'unsubmitted':
      filterStatus.value = 'unsubmitted';
      break;
    case 'health':
      filterStatus.value = 'health';
      break;
    case 'psych':
      filterStatus.value = 'psych';
      break;
    default:
      filterStatus.value = 'all';
  }
  filterShips();
};

const getStatusText = (ship: any) => {
  if (ship.riskLevel === 'gray') return '未上报';
  if (ship.validationResult === 'ai_fixed') return '格式异常';
  if (ship.healthAbnormalCount > 0 || ship.psychAbnormalCount > 0) return '关注';
  return '正常';
};

const getSubmissionText = (ship: any) => {
  if (ship.riskLevel === 'gray') return '本月尚未提交报表';
  if (ship.validationResult === 'ai_fixed') return '已提交，表格格式经AI修复';
  if (ship.healthAbnormalCount > 0 || ship.psychAbnormalCount > 0) return '已提交，存在健康异常人员';
  return '已提交，人员全部正常';
};

const filterShips = () => {
  let ships = [...dashboard.value.shipCards];

  if (filterStatus.value !== 'all') {
    ships = ships.filter(s => {
      switch (filterStatus.value) {
        case 'unsubmitted': return s.riskLevel === 'gray';
        case 'abnormal': return s.validationResult === 'ai_fixed';
        case 'health': return s.healthAbnormalCount > 0;
        case 'psych': return s.psychAbnormalCount > 0;
        default: return true;
      }
    });
  }

  const riskOrder = { red: 0, yellow: 1, gray: 2, green: 3 };
  switch (sortBy.value) {
    case 'risk':
      ships.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
      break;
    case 'unsubmitted':
      ships.sort((a, b) => (a.riskLevel === 'gray' ? -1 : 1));
      break;
    case 'name':
      ships.sort((a, b) => a.shipName.localeCompare(b.shipName));
      break;
  }

  filteredShips.value = ships;
};

const showShipDetail = async (ship: any) => {
  selectedShip.value = ship;
  detailDialogVisible.value = true;
  aiSuggestion.value = '';
  prevMonthAbnormalNames.value = [];
  
  if (!ship.uploadId) return;
  
  try {
    const data = await api.healthReport.getShipDetail(ship.uploadId);
    shipDetail.value = data;
    supervisorNote.value = data.supervisorNote || '';

    // 获取上月异常船员
    try {
      const prevData = await api.healthReport.getPrevMonthAbnormal(ship.shipId, selectedMonth.value);
      prevMonthAbnormalNames.value = prevData || [];
    } catch {}

    // 生成AI建议
    generateAISuggestion(data);
  } catch (e: any) {
    ElMessage.error('获取船舶详情失败：' + (e.message || '网络错误'));
  }
};

const generateAISuggestion = (detail: any) => {
  const suggestions: string[] = [];
  const abnormal = detail.abnormalDetails || [];
  
  // 连续异常检测
  if (prevMonthAbnormalNames.value.length > 0) {
    const continuousNames = abnormal.filter((d: any) => prevMonthAbnormalNames.value.includes(d.name));
    if (continuousNames.length > 0) {
      suggestions.push(`⚠️ ${continuousNames.map((d: any) => d.name).join('、')}已连续两个月体检异常，建议船舶重点观察`);
    }
  }

  // 多人异常
  if (abnormal.length >= 3) {
    suggestions.push(`🔴 本船有${abnormal.length}名船员存在健康异常，数量较多，建议加强排查频次`);
  }

  // 心理问题
  const psychCount = abnormal.filter((d: any) => {
    const type = getAbnormalText(d);
    return type.includes('心理') || type.includes('精神');
  }).length;
  if (psychCount > 0) {
    suggestions.push(`💡 建议关注${psychCount}名心理异常船员，必要时提供心理疏导支持`);
  }

  aiSuggestion.value = suggestions.join('；');
};

const getAbnormalType = (row: any) => {
  const fields = row.abnormalFields || [];
  if (fields.includes('精神')) return 'warning';
  if (fields.includes('身体状况')) return 'danger';
  return 'danger';
};

const getAbnormalText = (row: any) => {
  const fields = row.abnormalFields || [];
  const parts: string[] = [];
  if (fields.includes('身体状况')) parts.push('生理');
  if (fields.includes('精神')) parts.push('心理');
  if (fields.includes('工作态度')) parts.push('态度');
  if (fields.includes('家庭情况')) parts.push('家庭');
  return parts.length > 0 ? parts.join('+') : '异常';
};

const urgeSubmit = async (ship: any) => {
  try {
    await ElMessageBox.confirm(`确认向 ${ship.shipName} 发送催报提醒？`, '催报确认');
    await api.healthReport.urgeSubmit(ship.shipId, selectedMonth.value);
    ElMessage.success('催报提醒已发送，已记录催报时间');
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('催报失败：' + (e.message || '网络错误'));
    }
  }
};

const urgeBatch = async () => {
  if (dashboard.value.unsubmittedShips === 0) {
    ElMessage.info('本月所有船舶均已提交');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认向 ${dashboard.value.unsubmittedShips} 艘未提交船舶发送催报提醒？`,
      '批量催报确认',
    );
    urgingBatch.value = true;
    const result = await api.healthReport.urgeBatch(selectedMonth.value);
    ElMessage.success(result.message);
    await fetchDashboard();
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('批量催报失败：' + (e.message || '网络错误'));
    }
  } finally {
    urgingBatch.value = false;
  }
};

const exportSummary = async () => {
  exporting.value = true;
  try {
    const url = api.healthReport.getExportSummaryUrl(selectedMonth.value);
    // 使用带认证的文件下载
    const response = await fetch(url, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : '',
      },
    });
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `健康排查汇总表_${selectedMonth.value}.xlsx`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    ElMessage.success('汇总报表已导出');
  } catch (e: any) {
    ElMessage.error('导出失败：' + (e.message || '网络错误'));
  } finally {
    exporting.value = false;
  }
};

const exportAbnormal = async () => {
  exporting.value = true;
  try {
    const url = api.healthReport.getExportAbnormalUrl(selectedMonth.value);
    const response = await fetch(url, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : '',
      },
    });
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `健康排查异常人员_${selectedMonth.value}.xlsx`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    ElMessage.success('异常人员清单已导出');
  } catch (e: any) {
    ElMessage.error('导出失败：' + (e.message || '网络错误'));
  } finally {
    exporting.value = false;
  }
};

const downloadRawExcel = (ship: any) => {
  // TODO: 实现下载原始Excel
  ElMessage.info('下载原始Excel功能开发中');
};

const downloadExcel = (data: any[][], filename: string) => {
  // 简单的CSV下载
  const csv = data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

const generateReport = async () => {
  generating.value = true;
  try {
    const data = await api.healthReport.generateReport(selectedMonth.value);
    reportContent.value = data.report || '';
    isDraft.value = data.isDraft !== false;
    const modelName = data.model === 'fallback-template' ? '（模板生成）' : `（AI模型: ${data.model}）`;
    ElMessage.success(`报告生成成功 ${modelName}`);
  } catch (e: any) {
    ElMessage.error('生成报告失败：' + (e.message || '网络错误'));
  } finally {
    generating.value = false;
  }
};

const finalizeReport = async () => {
  try {
    await ElMessageBox.confirm('确认定稿此报告？定稿后将不可修改。', '确认定稿');
    isDraft.value = false;
    ElMessage.success('报告已定稿');
  } catch {}
};

const saveNote = async () => {
  if (!selectedShip.value?.uploadId) {
    ElMessage.error('无法保存批注');
    return;
  }
  savingNote.value = true;
  try {
    const response = await api.healthReport.saveNote(selectedShip.value.uploadId, supervisorNote.value);
    if (response.success) {
      ElMessage.success('批注已保存');
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (e: any) {
    console.error('保存批注失败', e);
    ElMessage.error('保存批注失败：' + (e.message || '未知错误'));
  } finally {
    savingNote.value = false;
  }
};
</script>

<style scoped>
.health-dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
}

.page-desc {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.export-btns {
  display: flex;
}

.comparison-alert {
  margin-bottom: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  padding: 20px 16px;
}

.stat-clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.stat-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-detail {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 4px;
  word-break: break-all;
}

.stat-green .stat-value { color: #67C23A; }
.stat-yellow .stat-value { color: #E6A23C; }
.stat-gray .stat-value { color: #909399; }
.stat-red .stat-value { color: #F56C6C; }
.stat-orange .stat-value { color: #E6A23C; }
.stat-blue .stat-value { color: #409EFF; }

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.ship-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.ship-card {
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid transparent;
}

.ship-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.ship-card.ship-green { border-left-color: #67C23A; background: #f0f9ff; }
.ship-card.ship-yellow { border-left-color: #E6A23C; background: #fffbe6; }
.ship-card.ship-red { border-left-color: #F56C6C; background: #fff1f0; }
.ship-card.ship-gray { border-left-color: #909399; background: #fafafa; }

.ship-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ship-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.ship-status-text {
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
  line-height: 1.4;
}

.ship-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.stat-text {
  font-size: 12px;
  color: #909399;
}

.stat-item.stat-red .stat-num { color: #F56C6C; }
.stat-item.stat-orange .stat-num { color: #E6A23C; }

.ship-actions {
  display: flex;
  gap: 8px;
  border-top: 1px solid #EBEEF5;
  padding-top: 12px;
}

.ship-detail {
  padding: 8px 0;
}

.ai-note {
  margin-top: 12px;
  padding: 12px;
  background: #fdf6ec;
  border-radius: 4px;
  color: #e6a23c;
  font-size: 14px;
}

.ai-suggestion {
  margin-top: 16px;
}

.abnormal-section {
  margin: 20px 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #303133;
}

.normal-count {
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
}

.text-muted {
  color: #c0c4cc;
  font-size: 12px;
}

.notes-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #EBEEF5;
}

.report-card {
  margin-top: 24px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-content {
  padding: 8px 0;
}

.report-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
</style>
