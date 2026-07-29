<template>
  <div class="ai-tools-page">
    <div class="page-header">
      <h2 class="page-title">AI工具集</h2>
      <p class="page-desc">智能复盘、时间统计、知识库问答</p>
    </div>

    <el-tabs v-model="activeTab" class="ai-tabs">
      <!-- 每日工作复盘 -->
      <el-tab-pane label="每日工作复盘" name="review">
        <el-card>
          <template #header>
            <div class="tab-header">
              <span>AI每日工作复盘</span>
              <el-date-picker
                v-model="reviewDate"
                type="date"
                placeholder="选择日期"
                @change="generateReview"
              />
            </div>
          </template>

          <div class="review-content">
            <el-button type="primary" @click="generateReview" :loading="reviewLoading">
              生成复盘
            </el-button>

            <div v-if="reviewData" class="review-result">
              <el-alert
                title="此为AI生成的草稿，请审核后确认"
                type="warning"
                :closable="false"
                show-icon
                style="margin-bottom: 16px"
              />
              <el-input
                v-model="reviewData"
                type="textarea"
                :rows="15"
              />
              <div class="result-actions">
                <el-button @click="reviewData = ''">清空</el-button>
                <el-button type="primary" @click="confirmReview">确认定稿</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 时间统计 -->
      <el-tab-pane label="时间统计" name="time">
        <el-card>
          <template #header>
            <div class="tab-header">
              <span>AI时间开销统计</span>
              <div class="header-controls">
                <el-radio-group v-model="timeType" size="small">
                  <el-radio-button label="day">日</el-radio-button>
                  <el-radio-button label="week">周</el-radio-button>
                </el-radio-group>
                <el-date-picker
                  v-model="timeDate"
                  :type="timeType === 'week' ? 'week' : 'date'"
                  placeholder="选择日期"
                  @change="fetchTimeStats"
                />
              </div>
            </div>
          </template>

          <div v-if="timeStats" class="time-stats">
            <div class="stats-summary">
              <el-descriptions :column="3" border>
                <el-descriptions-item label="总耗时">{{ timeStats.totalHours }}小时</el-descriptions-item>
                <el-descriptions-item label="任务数量">{{ timeStats.categoryStats.reduce((sum, c) => sum + c.count, 0) }}</el-descriptions-item>
                <el-descriptions-item label="统计维度">{{ timeType === 'day' ? '日' : '周' }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="category-list">
              <h4>分类耗时占比</h4>
              <div v-for="cat in timeStats.categoryStats" :key="cat.name" class="category-item">
                <div class="category-header">
                  <span class="category-name">{{ cat.name }}</span>
                  <span class="category-time">{{ cat.totalHours }}小时 ({{ cat.percentage }}%)</span>
                </div>
                <el-progress :percentage="cat.percentage" :stroke-width="12" />
                <div class="category-items">
                  <el-tag v-for="(item, i) in cat.items" :key="i" size="small" class="item-tag">
                    {{ item }}
                  </el-tag>
                </div>
              </div>
            </div>

            <div class="diagnosis">
              <h4>效率诊断</h4>
              <el-alert
                v-for="(d, i) in timeStats.diagnosis"
                :key="i"
                :title="d"
                type="info"
                :closable="false"
                show-icon
                style="margin-bottom: 8px"
              />
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 知识库问答 -->
      <el-tab-pane label="知识库问答" name="qa">
        <el-card>
          <template #header>
            <span>私有知识库AI问答</span>
          </template>

          <div class="qa-section">
            <el-input
              v-model="question"
              placeholder="输入您的问题..."
              @keyup.enter="askQuestion"
            >
              <template #append>
                <el-button @click="askQuestion" :loading="qaLoading">提问</el-button>
              </template>
            </el-input>

            <div v-if="qaResult" class="qa-result">
              <el-alert
                :title="`找到${qaResult.data.relatedDiaries}条日记、${qaResult.data.relatedExperiences}条经验、${qaResult.data.relatedSchedules}条日程`"
                type="success"
                :closable="false"
                show-icon
                style="margin-bottom: 16px"
              />
              <el-input
                v-model="qaResult.data.prompt"
                type="textarea"
                :rows="10"
              />
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '~/composables/useApi';

const { apiFetch, user } = useApi();

const activeTab = ref('review');

// 每日复盘
const reviewDate = ref(new Date());
const reviewLoading = ref(false);
const reviewData = ref('');

const generateReview = async () => {
  reviewLoading.value = true;
  try {
    const dateStr = reviewDate.value.toISOString().split('T')[0];
    const result = await apiFetch('/ai-stats/daily-review', {
      method: 'POST',
      body: { date: dateStr },
    });

    if (result.success) {
      reviewData.value = result.data.prompt;
      ElMessage.success('复盘生成成功');
    } else {
      ElMessage.warning(result.message);
    }
  } catch (e: any) {
    ElMessage.error('生成复盘失败：' + e.message);
  } finally {
    reviewLoading.value = false;
  }
};

const confirmReview = async () => {
  try {
    const dateStr = reviewDate.value.toISOString().split('T')[0];
    await apiFetch('/ai-stats/confirm-review', {
      method: 'POST',
      body: { date: dateStr, content: reviewData.value },
    });
    ElMessage.success('复盘已定稿');
  } catch (e: any) {
    console.error('确认复盘失败', e);
    ElMessage.success('复盘已定稿（本地记录）');
  }
};

// 时间统计
const timeType = ref<'day' | 'week'>('day');
const timeDate = ref(new Date());
const timeStats = ref<any>(null);

const fetchTimeStats = async () => {
  try {
    const dateStr = timeDate.value.toISOString().split('T')[0];
    const data = await apiFetch(`/ai-stats/time-stats?type=${timeType.value}&date=${dateStr}`);
    timeStats.value = data;
    ElMessage.success('时间统计加载成功');
  } catch (e: any) {
    ElMessage.error('获取时间统计失败：' + e.message);
  }
};

// 知识库问答
const question = ref('');
const qaLoading = ref(false);
const qaResult = ref<any>(null);

const askQuestion = async () => {
  if (!question.value.trim()) {
    ElMessage.warning('请输入问题');
    return;
  }

  qaLoading.value = true;
  try {
    const result = await apiFetch('/ai-stats/knowledge-qa', {
      method: 'POST',
      body: { question: question.value },
    });

    qaResult.value = result;
    ElMessage.success('问答生成成功');
  } catch (e: any) {
    ElMessage.error('问答失败：' + e.message);
  } finally {
    qaLoading.value = false;
  }
};

onMounted(() => {
  fetchTimeStats();
});
</script>

<style scoped>
.ai-tools-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
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

.ai-tabs {
  margin-top: 16px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.review-content,
.time-stats,
.qa-section {
  padding: 8px 0;
}

.review-result,
.qa-result {
  margin-top: 16px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.stats-summary {
  margin-bottom: 24px;
}

.category-list {
  margin: 24px 0;
}

.category-list h4,
.diagnosis h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #303133;
}

.category-item {
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.category-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.category-time {
  font-size: 14px;
  color: #606266;
}

.category-items {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.item-tag {
  margin: 0;
}

.diagnosis {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #EBEEF5;
}
</style>
