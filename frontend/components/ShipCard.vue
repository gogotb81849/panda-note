<template>
  <div
    class="ship-card"
    :class="[shipAgeClass, { 'is-expanded': isExpanded }]"
    @click="toggleExpand"
  >
    <div class="card-header">
      <div class="ship-photo-section" @click.stop>
        <div class="ship-photo-wrapper">
          <img
            v-if="shipPhotoUrl"
            :src="shipPhotoUrl"
            :alt="ship.cnShipName"
            class="ship-photo"
            @click.stop="showPhotoViewer = true"
          />
          <div v-else class="ship-photo-placeholder" @click.stop="triggerPhotoUpload">
            <el-icon><Picture /></el-icon>
            <span>上传照片</span>
          </div>
          <div class="photo-actions" v-if="shipPhotoUrl">
            <el-button size="small" circle @click.stop="triggerPhotoUpload" title="更换照片">
              <el-icon><Refresh /></el-icon>
            </el-button>
            <el-button size="small" circle type="danger" @click.stop="deletePhoto" title="删除照片">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <input
            ref="photoInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handlePhotoUpload"
          />
        </div>
      </div>
      <div class="ship-name-section">
        <div class="ship-flags">
          <span class="flag-emoji">{{ flagEmoji }}</span>
          <span v-if="ship.tradeType" class="trade-circle" :class="tradeTypeClass" :title="ship.tradeType">贸</span>
          <span
            v-if="sendCompanyAbbr"
            class="company-circle"
            :class="sendCompanyClass"
            :title="ship.sendCompany"
          >{{ sendCompanyAbbr }}</span>
          <!-- 区域标记：海盗区 / 五眼联盟 / 欧洲 -->
          <span
            v-if="ship.piracyZone"
            class="region-badge region-piracy"
            title="海盗区 - 高风险"
          >🏴‍☠️</span>
          <span
            v-else-if="ship.etaPortRegion === 'fiveEyes'"
            class="region-badge region-five-eyes"
            title="五眼联盟国家"
          >👁️</span>
          <span
            v-else-if="ship.etaPortRegion === 'europe'"
            class="region-badge region-europe"
            title="欧洲"
          >🇪🇺</span>
          <span v-if="analysis?.alerts?.length" class="alert-badge" :title="analysis.alerts.join('\n')">
            🔔 {{ analysis.alerts.length }}
          </span>
        </div>
        <h3 class="ship-name">{{ ship.cnShipName }}</h3>
        <p class="ship-name-en">{{ ship.enShipName || '-' }}</p>
      </div>
      <div class="ship-meta">
        <div class="age-badge" :class="shipAgeClass">
          {{ shipAge }}年
        </div>
        <div class="expand-icon">
          <el-icon><ArrowDown v-if="!isExpanded" /><ArrowUp v-else /></el-icon>
        </div>
      </div>
    </div>

    <div class="card-body">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">系列</span>
          <span class="info-value">{{ ship.teamDisplayName || '未分类' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">载重吨</span>
          <span class="info-value">{{ ship.deadweightTonnage || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">出厂日期</span>
          <span class="info-value">{{ ship.factoryDate || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">派员公司</span>
          <span v-if="sendCompanyAbbr" class="company-badge" :class="sendCompanyClass" :title="ship.sendCompany">
            {{ sendCompanyAbbr }}
          </span>
          <span v-else class="info-value">-</span>
        </div>
      </div>

      <!-- 船舶动态概览（自动抓取） -->
      <div class="dynamic-summary" v-if="dynamicSummary">
        <div class="dynamic-status-pill" :class="dynamicStatusClass">
          <span class="status-dot"></span>
          {{ dynamicSummary.status }}
        </div>
        <span class="dynamic-detail">{{ dynamicSummary.detail }}</span>
      </div>

      <!-- 任务完成概览（自动抓取） -->
      <div class="task-summary" v-if="analysis?.tasks?.summary">
        <div class="task-progress-bar">
          <div class="task-progress-fill" :style="{ width: analysis.tasks.summary.avgProgress + '%' }"></div>
        </div>
        <div class="task-progress-text">
          <span>任务进度 {{ analysis.tasks.summary.avgProgress }}%</span>
          <span class="task-counts">
            完成 {{ analysis.tasks.summary.completed }}/{{ analysis.tasks.summary.total }}
          </span>
        </div>
      </div>

      <div class="supervisors-section">
        <div class="supervisor-item marine">
          <span class="supervisor-icon">🌊</span>
          <span class="supervisor-label">海务</span>
          <span class="supervisor-name">{{ ship.marineSupervisor || '-' }}</span>
        </div>
        <div class="supervisor-item engineer">
          <span class="supervisor-icon">⚙️</span>
          <span class="supervisor-label">机务</span>
          <span class="supervisor-name">{{ ship.engineerSupervisor || '-' }}</span>
        </div>
      </div>

      <div class="instructor-section">
        <span class="instructor-icon">🎖️</span>
        <span class="instructor-label">政委</span>
        <span class="instructor-name">{{ ship.politicalInstructor || ship.politicalOfficerName || '未填写' }}</span>
        <el-button size="small" link type="primary" @click.stop="showHistory" class="history-btn">
          历史
        </el-button>
      </div>
    </div>

    <div v-if="isExpanded" class="card-expanded">
      <!-- 关键提醒 -->
      <div v-if="analysis?.alerts?.length" class="expanded-section alerts-section">
        <h4 class="expanded-title">🔔 关键提醒</h4>
        <div class="alerts-list">
          <div v-for="(alert, idx) in analysis.alerts" :key="idx" class="alert-item">
            {{ alert }}
          </div>
        </div>
      </div>

      <!-- 船舶动态详情 -->
      <div class="expanded-section">
        <h4 class="expanded-title">船舶动态</h4>
        <div class="dynamic-grid">
          <div class="dynamic-item">
            <span class="dynamic-label">当前状态</span>
            <span class="dynamic-value">{{ dynamicSummary?.status || currentStatusText }}</span>
          </div>
          <div class="dynamic-item">
            <span class="dynamic-label">当前航次</span>
            <span class="dynamic-value">{{ ship.currentVoyage || '-' }}</span>
          </div>
          <div class="dynamic-item">
            <span class="dynamic-label">当前位置</span>
            <span class="dynamic-value">{{ ship.currentLocation || '-' }}</span>
          </div>
          <div class="dynamic-item">
            <span class="dynamic-label">预计抵港</span>
            <span class="dynamic-value">{{ etaText }}</span>
          </div>
          <div class="dynamic-item" v-if="ship.etaPort">
            <span class="dynamic-label">目的港</span>
            <span class="dynamic-value">{{ ship.etaPort }}</span>
          </div>
          <div class="dynamic-item" v-if="analysis?.dynamic?.etdDisplay">
            <span class="dynamic-label">预计离港</span>
            <span class="dynamic-value">{{ analysis.dynamic.etdDisplay }}</span>
          </div>
        </div>
      </div>

      <!-- 最近抵港记录（自动从主管日记提取） -->
      <div v-if="analysis?.portCalls?.length" class="expanded-section">
        <h4 class="expanded-title">🚢 最近抵港记录</h4>
        <div class="port-call-list">
          <div v-for="(call, idx) in analysis.portCalls" :key="idx" class="port-call-item">
            <span class="port-call-date">{{ formatDate(call.date) }}</span>
            <span class="port-call-route">
              {{ call.departurePort || '?' }} → {{ call.arrivalPort }}
            </span>
            <span class="port-call-status" v-if="call.dynamicStatus">{{ call.dynamicStatus }}</span>
          </div>
        </div>
      </div>

      <!-- 任务完成情况详情 -->
      <div v-if="analysis?.tasks?.recentTasks?.length" class="expanded-section">
        <h4 class="expanded-title">📋 任务完成情况</h4>
        <div class="task-list">
          <div v-for="task in analysis.tasks.recentTasks" :key="task.id" class="task-item-row">
            <span class="task-type">{{ getTaskTypeLabel(task.type) }}</span>
            <div class="task-mini-progress">
              <div class="task-mini-fill" :style="{ width: task.progress + '%' }"></div>
            </div>
            <span class="task-progress">{{ task.progress }}%</span>
            <span class="task-status-badge" :class="'status-' + task.status">
              {{ getTaskStatusLabel(task.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div v-if="analysis?.activity" class="expanded-section">
        <h4 class="expanded-title">📝 最近活动</h4>
        <div class="activity-list">
          <div v-if="analysis.activity.latestDiaryDate" class="activity-item">
            <span class="activity-label">最近日记：</span>
            <span class="activity-value">{{ formatDate(analysis.activity.latestDiaryDate) }}</span>
            <span class="activity-summary" v-if="analysis.activity.latestDiarySummary">
              {{ analysis.activity.latestDiarySummary }}
            </span>
          </div>
          <div v-if="analysis.activity.noteCount > 0" class="activity-item">
            <span class="activity-label">船笔记：</span>
            <span class="activity-value">{{ analysis.activity.noteCount }} 条</span>
          </div>
          <div v-for="note in analysis.activity.recentNotes" :key="note.id" class="activity-note">
            <span class="activity-note-source">{{ note.source === 'diary' ? '📖' : '✍️' }}</span>
            <span class="activity-note-summary">{{ note.summary }}</span>
            <span class="activity-note-time">{{ formatDate(note.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="expanded-section">
        <h4 class="expanded-title">主管信息</h4>
        <div class="supervisors-full">
          <div class="supervisor-full-item">
            <span class="supervisor-full-icon">🔧</span>
            <span class="supervisor-full-label">电气主管</span>
            <span class="supervisor-full-name">{{ ship.electricSupervisor || '-' }}</span>
          </div>
          <div class="supervisor-full-item">
            <span class="supervisor-full-icon">👥</span>
            <span class="supervisor-full-label">船工主管</span>
            <span class="supervisor-full-name">{{ ship.crewSupervisor || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="expanded-section">
        <h4 class="expanded-title">政委信息</h4>
        <div class="instructor-detail">
          <div class="instructor-detail-item">
            <span class="detail-label">上船时间</span>
            <span class="detail-value">{{ ship.onBoardDate || '-' }}</span>
          </div>
          <div class="instructor-detail-item">
            <span class="detail-label">在船天数</span>
            <span class="detail-value">{{ daysOnBoard }}</span>
          </div>
          <div class="instructor-detail-item">
            <span class="detail-label">船长</span>
            <span class="detail-value">{{ ship.captainName || '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="historyVisible" :title="`${ship.cnShipName} - 政委任职历史`" width="500px">
      <el-table :data="historyList" border stripe class="history-table">
        <el-table-column prop="staffName" label="政委姓名" min-width="100" />
        <el-table-column prop="startDate" label="上船时间" min-width="120">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="endDate" label="下船时间" min-width="120">
          <template #default="{ row }">
            {{ row.endDate ? formatDate(row.endDate) : '至今' }}
          </template>
        </el-table-column>
        <el-table-column label="在船天数" min-width="80">
          <template #default="{ row }">
            {{ calculateStaffDays(row.startDate, row.endDate) }}天
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="historyVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 照片预览 -->
    <el-dialog v-model="showPhotoViewer" :title="ship.cnShipName" width="600px">
      <img :src="shipPhotoUrl" :alt="ship.cnShipName" style="width: 100%; display: block" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ArrowDown, ArrowUp, Picture, Refresh, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useApi } from '~/composables/useApi';
import { useAuthStore } from '~/stores/auth';
import type { Ship } from '~/types';

const props = defineProps<{
  ship: Ship;
}>();

const api = useApi();
const authStore = useAuthStore();
const isExpanded = ref(false);
const historyVisible = ref(false);
const historyList = ref<any[]>([]);
const analysis = ref<any>(null);
const loadingAnalysis = ref(false);
const showPhotoViewer = ref(false);
const photoInputRef = ref<HTMLInputElement | null>(null);
const uploadingPhoto = ref(false);

// 船舶照片URL（拼接API基址）
const shipPhotoUrl = computed(() => {
  if (!props.ship.shipPhoto) return '';
  const photo = props.ship.shipPhoto;
  if (photo.startsWith('http')) return photo;
  return `/api${photo}`;
});

const shipAge = computed(() => {
  try {
    const year = parseInt(props.ship.factoryDate?.substring(0, 4) || '');
    if (!isNaN(year)) {
      return new Date().getFullYear() - year;
    }
  } catch {}
  return 0;
});

const shipAgeClass = computed(() => {
  if (shipAge.value >= 15) return 'age-old';
  if (shipAge.value >= 10) return 'age-mid';
  return 'age-new';
});

const flagEmoji = computed(() => {
  const flag = (props.ship.flagCountry || '').toUpperCase();
  if (flag.includes('PANAMA') || flag.includes('巴拿马')) return '🇵🇦';
  if (flag.includes('SINGAPORE') || flag.includes('新加坡')) return '🇸🇬';
  if (flag.includes('HONG KONG') || flag.includes('香港')) return '🇭🇰';
  if (flag.includes('LIBERIA') || flag.includes('利比里亚')) return '🇱🇷';
  if (flag.includes('MARSHALL') || flag.includes('马绍尔')) return '🇲🇭';
  if (flag.includes('MALTA') || flag.includes('马耳他')) return '🇲🇹';
  if (flag.includes('BAHAMAS') || flag.includes('巴哈马')) return '🇧🇸';
  if (flag.includes('SHANGHAI') || flag.includes('上海') || flag.includes('中国') || flag.includes('CHINA')) return '🇨🇳';
  return '🚢';
});

const tradeTypeText = computed(() => {
  const type = props.ship.tradeType;
  if (type === '外贸') return '外贸';
  if (type === '内外贸兼营') return '兼营';
  return type || '-';
});

const tradeTypeClass = computed(() => {
  const type = props.ship.tradeType;
  if (type === '外贸') return 'trade-foreign';
  if (type === '内贸') return 'trade-domestic';
  if (type === '内外贸兼营' || (type && type.includes('兼'))) return 'trade-both';
  return '';
});

// 派员公司简称与配色
const sendCompanyAbbr = computed(() => {
  const name = (props.ship.sendCompany || '').trim();
  if (!name) return '';
  if (name.includes('广州')) return '广';
  if (name.includes('大连')) return '连';
  if (name.includes('上海')) return '沪';
  if (name.includes('青岛')) return '青';
  if (name.includes('天津')) return '津';
  if (name.includes('厦门')) return '厦';
  return name.charAt(0);
});

const sendCompanyClass = computed(() => {
  const name = (props.ship.sendCompany || '').trim();
  if (!name) return 'company-default';
  if (name.includes('广州')) return 'company-gz';
  if (name.includes('大连')) return 'company-dl';
  if (name.includes('上海')) return 'company-sh';
  if (name.includes('青岛')) return 'company-qd';
  if (name.includes('天津')) return 'company-tj';
  return 'company-default';
});

const daysOnBoard = computed(() => {
  if (!props.ship.onBoardDate) return '-';
  try {
    const start = new Date(props.ship.onBoardDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? `${diff}天` : '-';
  } catch {
    return '-';
  }
});

const currentStatusText = computed(() => {
  const status = (props.ship.currentStatus || '').toLowerCase();
  if (status.includes('repair') || status.includes('修理') || status.includes('维修')) return '🔧 修理中';
  if (status.includes('berth') || status.includes('alongside') || /靠泊/.test(status)) return '🛳️ 靠泊中';
  if (status.includes('arriv') || status.includes('抵港') || status.includes('到港') || status.includes('抵达') || status.includes('到达')) return '🚢 抵港中';
  if (status.includes('anchor') || status.includes('锚泊') || status.includes('抛锚')) return '⚓ 锚泊中';
  if (status.includes('sail') || status.includes('voyage') || status.includes('航行') || status.includes('在航')) return '⛵ 航行中';
  return '📋 未知状态';
});

const etaText = computed(() => {
  if (!props.ship.eta) return '-';
  try {
    const date = new Date(props.ship.eta);
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
});

// 动态摘要（从分析数据或船舶字段推导）
const dynamicSummary = computed(() => {
  if (analysis.value?.dynamic) {
    return analysis.value.dynamic;
  }
  // 降级：从船舶字段推导
  if (!props.ship.eta && !props.ship.currentStatus && !props.ship.currentLocation) return null;
  return {
    status: currentStatusText.value.replace(/^[^\u4e00-\u9fa5]+/, '').trim(),
    detail: props.ship.currentLocation || '',
  };
});

const dynamicStatusClass = computed(() => {
  const s = dynamicSummary.value?.status || '';
  if (s.includes('靠泊') || s.includes('berth')) return 'status-berthed';
  if (s.includes('抵港') || s.includes('到港') || s.includes('抵达') || s.includes('到达') || s.includes('arriv')) return 'status-arrived';
  if (s.includes('锚泊') || s.includes('anchor')) return 'status-anchored';
  if (s.includes('航行') || s.includes('sail') || s.includes('voyage')) return 'status-sailing';
  if (s.includes('修理') || s.includes('repair')) return 'status-repair';
  if (s.includes('离港')) return 'status-departed';
  return 'status-unknown';
});

const toggleExpand = async () => {
  isExpanded.value = !isExpanded.value;
  // 展开时加载分析数据
  if (isExpanded.value && !analysis.value && !loadingAnalysis.value) {
    await loadAnalysis();
  }
};

async function loadAnalysis() {
  loadingAnalysis.value = true;
  try {
    analysis.value = await api.ships.getAnalysis(props.ship.id);
  } catch (e: any) {
    console.error('加载船舶分析数据失败', e);
  } finally {
    loadingAnalysis.value = false;
  }
}

const showHistory = async () => {
  historyVisible.value = true;
  try {
    const history = await api.staffHistory.getByShipId(props.ship.id);
    historyList.value = (history as any[])
      .filter((h: any) => h.postName === '政委')
      .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  } catch {}
};

// 船舶照片上传/删除
function triggerPhotoUpload() {
  // 权限校验：仅管理员和岸基船工主管可上传
  const roles = authStore.user?.roles || [];
  const canUpload = roles.some((r: string) =>
    r === 'admin' || r === 'shore_crew_supervisor'
  );
  if (!canUpload) {
    ElMessage.warning('仅管理员和岸基船工主管可上传船舶照片');
    return;
  }
  photoInputRef.value?.click();
}

async function handlePhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // 校验文件大小（10MB）
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 10MB');
    input.value = '';
    return;
  }

  uploadingPhoto.value = true;
  try {
    const result: any = await api.ships.uploadPhoto(props.ship.id, file);
    if (result.success) {
      ElMessage.success('船舶照片上传成功');
      // 更新本地数据
      props.ship.shipPhoto = result.photoUrl;
    } else {
      ElMessage.error(result.message || '上传失败');
    }
  } catch (e: any) {
    ElMessage.error('上传失败：' + (e.message || ''));
  } finally {
    uploadingPhoto.value = false;
    input.value = '';
  }
}

async function deletePhoto() {
  try {
    await ElMessageBox.confirm('确定删除该船舶照片吗？', '确认删除', { type: 'warning' });
    await api.ships.deletePhoto(props.ship.id);
    props.ship.shipPhoto = undefined;
    ElMessage.success('已删除');
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dateStr;
  }
};

const calculateStaffDays = (startDate: string, endDate: string) => {
  if (!startDate) return '-';
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return '-';
  }
};

function getTaskTypeLabel(type: string): string {
  const map: Record<string, string> = {
    port_call_check: '到港检查',
    ship_dynamic: '船舶动态',
    form_collect: '表单收集',
    file_collection: '文件收集',
    photo_checkin: '拍照打卡',
    ai_survey: 'AI调研',
  };
  return map[type] || type;
}

function getTaskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    expired: '已过期',
  };
  return map[status] || status;
}
</script>

<style scoped>
.ship-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.ship-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.ship-card.age-new {
  border-left-color: #52c41a;
}

.ship-card.age-mid {
  border-left-color: #faad14;
}

.ship-card.age-old {
  border-left-color: #f5222d;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.ship-name-section {
  flex: 1;
}

.ship-flags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.flag-emoji {
  font-size: 16px;
}

.trade-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: white;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  overflow: hidden;
}

.trade-foreign {
  background: #1890ff;
}

.trade-domestic {
  background: #52c41a;
}

.trade-both {
  background: linear-gradient(to right, #52c41a 50%, #1890ff 50%);
}

.ship-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  margin: 0;
}

.ship-name-en {
  font-size: 12px;
  color: #8f959e;
  margin: 2px 0 0;
}

.ship-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.age-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
}

.age-new .age-badge {
  background: #f6ffed;
  color: #52c41a;
}

.age-mid .age-badge {
  background: #fffbe6;
  color: #faad14;
}

.age-old .age-badge {
  background: #fff1f0;
  color: #f5222d;
}

.expand-icon {
  color: #8f959e;
  font-size: 14px;
  transition: transform 0.3s ease;
}

.card-body {
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 11px;
  color: #8f959e;
}

.info-value {
  font-size: 13px;
  color: #4e5969;
  font-weight: 500;
}

.company-value {
  color: #1890ff;
}

/* 派员公司圆形标识（头部） */
.company-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: white;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

/* 派员公司标签（信息网格里） */
.company-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: white;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.company-gz { background: #1890ff; }   /* 广州 - 蓝 */
.company-dl { background: #52c41a; }   /* 大连 - 绿 */
.company-sh { background: #fa8c16; }   /* 上海 - 橙 */
.company-qd { background: #722ed1; }   /* 青岛 - 紫 */
.company-tj { background: #13c2c2; }   /* 天津 - 青 */
.company-default { background: #8c8c8c; } /* 默认 - 灰 */

.supervisors-section {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.supervisor-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  flex: 1;
}

.supervisor-icon {
  font-size: 14px;
}

.supervisor-label {
  font-size: 11px;
  color: #8f959e;
}

.supervisor-name {
  font-size: 13px;
  color: #4e5969;
  font-weight: 500;
}

.instructor-section {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
}

.instructor-icon {
  font-size: 16px;
}

.instructor-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.instructor-name {
  font-size: 14px;
  color: white;
  font-weight: 600;
  flex: 1;
}

.history-btn {
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 12px;
  padding: 0 !important;
}

.card-expanded {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e5e6eb;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.expanded-section {
  margin-bottom: 16px;
}

.expanded-section:last-child {
  margin-bottom: 0;
}

.expanded-title {
  font-size: 13px;
  font-weight: 600;
  color: #8f959e;
  margin: 0 0 10px;
}

.dynamic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.dynamic-item {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 6px;
}

.dynamic-label {
  font-size: 11px;
  color: #8f959e;
}

.dynamic-value {
  font-size: 13px;
  color: #4e5969;
}

.supervisors-full {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.supervisor-full-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 6px;
}

.supervisor-full-icon {
  font-size: 14px;
}

.supervisor-full-label {
  font-size: 12px;
  color: #8f959e;
}

.supervisor-full-name {
  font-size: 13px;
  color: #4e5969;
  font-weight: 500;
}

.instructor-detail {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.instructor-detail-item {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  background: #f9f0ff;
  border-radius: 6px;
}

.detail-label {
  font-size: 11px;
  color: #8f959e;
}

.detail-value {
  font-size: 13px;
  color: #722ed1;
  font-weight: 500;
}

.history-table {
  font-size: 13px;
}

/* === 船舶照片 === */
.ship-photo-section {
  flex-shrink: 0;
  margin-right: 12px;
}

.ship-photo-wrapper {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7fa;
  border: 1px solid #e5e6eb;
}

.ship-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s;
}

.ship-photo:hover {
  transform: scale(1.05);
}

.ship-photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #8f959e;
  font-size: 10px;
  cursor: pointer;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  transition: all 0.2s;
}

.ship-photo-placeholder:hover {
  color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
}

.ship-photo-placeholder .el-icon {
  font-size: 20px;
}

.photo-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.ship-photo-wrapper:hover .photo-actions {
  opacity: 1;
}

.photo-actions .el-button {
  width: 22px;
  height: 22px;
  min-height: 22px;
  padding: 0;
}

/* === 提醒徽章 === */
.alert-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #fff1f0;
  color: #f5222d;
  font-weight: 600;
  cursor: help;
}

/* === 区域标识（海盗区/五眼联盟/欧洲） === */
.region-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  cursor: help;
  flex-shrink: 0;
}
.region-piracy {
  animation: piracy-pulse 1.2s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(245, 34, 45, 0.6));
}
.region-five-eyes {
  animation: region-pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 0 2px rgba(64, 158, 255, 0.5));
}
.region-europe {
  animation: region-pulse 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 2px rgba(91, 140, 255, 0.5));
}
@keyframes piracy-pulse {
  0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 3px rgba(245, 34, 45, 0.6)); }
  50% { opacity: 0.7; transform: scale(1.15); filter: drop-shadow(0 0 6px rgba(245, 34, 45, 0.9)); }
}
@keyframes region-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(1.08); }
}

/* === 动态摘要 === */
.dynamic-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.dynamic-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-berthed {
  background: #f6ffed;
  color: #52c41a;
}

.status-arrived {
  background: #fff0f6;
  color: #eb2f96;
}

.status-anchored {
  background: #fffbe6;
  color: #faad14;
}

.status-sailing {
  background: #e6f7ff;
  color: #1890ff;
}

.status-departed {
  background: #f5f5f5;
  color: #8f959e;
}

.status-unknown {
  background: #f5f5f5;
  color: #8f959e;
}

.dynamic-detail {
  font-size: 12px;
  color: #4e5969;
  flex: 1;
  min-width: 0;
}

/* === 任务进度 === */
.task-summary {
  margin-bottom: 10px;
}

.task-progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.task-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff 0%, #52c41a 100%);
  transition: width 0.3s;
}

.task-progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8f959e;
}

.task-counts {
  color: #4e5969;
}

/* === 展开区域新模块 === */
.alerts-section {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 10px 12px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alert-item {
  font-size: 12px;
  color: #d48806;
  line-height: 1.5;
}

/* 抵港记录 */
.port-call-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.port-call-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 12px;
}

.port-call-date {
  color: #8f959e;
  font-size: 11px;
  min-width: 70px;
}

.port-call-route {
  color: #4e5969;
  font-weight: 500;
  flex: 1;
}

.port-call-status {
  font-size: 11px;
  color: #1890ff;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 12px;
}

.task-type {
  min-width: 70px;
  color: #4e5969;
  font-weight: 500;
}

.task-mini-progress {
  flex: 1;
  height: 6px;
  background: #e5e6eb;
  border-radius: 3px;
  overflow: hidden;
}

.task-mini-fill {
  height: 100%;
  background: #1890ff;
  transition: width 0.3s;
}

.task-progress {
  min-width: 36px;
  text-align: right;
  color: #8f959e;
}

.task-status-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
}

.status-pending {
  background: #fff1f0;
  color: #f5222d;
}

.status-in_progress {
  background: #fffbe6;
  color: #faad14;
}

.status-completed {
  background: #f6ffed;
  color: #52c41a;
}

.status-expired {
  background: #f5f5f5;
  color: #8f959e;
}

/* 最近活动 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 12px;
  flex-wrap: wrap;
}

.activity-label {
  color: #8f959e;
}

.activity-value {
  color: #4e5969;
  font-weight: 500;
}

.activity-summary {
  color: #8f959e;
  font-size: 11px;
  width: 100%;
  margin-top: 2px;
  padding-left: 8px;
  border-left: 2px solid #e5e6eb;
}

.activity-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 10px;
  background: #fafafa;
  border-radius: 6px;
  font-size: 11px;
}

.activity-note-source {
  flex-shrink: 0;
}

.activity-note-summary {
  flex: 1;
  color: #4e5969;
  line-height: 1.5;
}

.activity-note-time {
  color: #8f959e;
  font-size: 10px;
  flex-shrink: 0;
}
</style>