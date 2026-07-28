<template>
  <div class="ai-classification-panel">
    <div class="panel-header">
      <span>🤖 AI智能分类</span>
      <el-button size="small" @click="classifyAll" :loading="classifying" type="primary">
        一键智能分类
      </el-button>
    </div>
    
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>AI正在分析文章，请稍候...</span>
    </div>
    
    <div v-else-if="classificationResults.length === 0" class="empty-state">
      <el-empty description="暂无待分类的文章" />
    </div>
    
    <div v-else class="classification-results">
      <div 
        v-for="result in classificationResults" 
        :key="result.articleId"
        class="classification-item"
      >
        <div class="article-info">
          <div class="article-title">{{ result.title }}</div>
          <div class="article-preview">{{ result.summary || '无摘要' }}</div>
          <div class="confidence-badge" :class="getConfidenceClass(result.confidence)">
            {{ (result.confidence * 100).toFixed(0) }}%
          </div>
        </div>
        
        <div class="classification-result">
          <div class="section-select">
            <el-select 
              v-model="result.sectionId" 
              @change="handleSectionChange(result)"
              placeholder="选择版块"
            >
              <el-option 
                v-for="section in sections" 
                :key="section.id" 
                :label="section.name"
                :value="section.id"
              />
            </el-select>
          </div>
          
          <div v-if="result.reason" class="reason-text">
            <span class="reason-label">AI分析：</span>
            {{ result.reason }}
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="hasChanges" class="panel-footer">
      <el-button @click="resetChanges">重置</el-button>
      <el-button type="primary" @click="applyAll" :loading="applying">
        应用更改 ({{ changedCount }}项)
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

interface Section {
  id: string;
  name: string;
}

interface ClassificationResult {
  articleId: string;
  title: string;
  summary?: string;
  sectionId: string;
  suggestedSectionId: string;
  suggestedSectionName?: string;
  confidence: number;
  reason: string;
  alternatives?: { sectionId: string; sectionName: string; score: number }[];
}

interface Props {
  magazineId: {
    type: string;
    required: true;
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update'): void;
}>();

const sections = ref<Section[]>([]);
const classificationResults = ref<ClassificationResult[]>([]);
const originalResults = ref<ClassificationResult[]>([]);
const loading = ref(false);
const classifying = ref(false);
const applying = ref(false);

const hasChanges = computed(() => {
  return JSON.stringify(classificationResults.value) !== JSON.stringify(originalResults.value);
});

const changedCount = computed(() => {
  return classificationResults.value.filter((result, index) => {
    return result.sectionId !== originalResults.value[index].sectionId;
  }).length;
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    // 加载杂志信息获取版块列表
    const magazineResponse = await fetch(`/api/magazine/${props.magazineId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const magazine = await magazineResponse.json();
    sections.value = magazine.sections || [];
    
    // 加载已有的分类建议
    await loadSuggestions();
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

async function loadSuggestions() {
  try {
    const response = await fetch(`/api/magazine/${props.magazineId}/articles/suggestions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const suggestions = await response.json();
    
    classificationResults.value = suggestions.map((s: ClassificationResult) => ({
      ...s,
      sectionId: s.suggestedSectionId,
    }));
    originalResults.value = JSON.parse(JSON.stringify(classificationResults.value));
  } catch (error) {
    console.error('加载分类建议失败:', error);
  }
}

async function classifyAll() {
  classifying.value = true;
  try {
    // 调用AI分类接口（不带缓存）
    const response = await fetch(`/api/magazine/${props.magazineId}/articles/classify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('AI分类失败');
    }
    
    const suggestions = await response.json();
    
    classificationResults.value = suggestions.map((s: ClassificationResult) => ({
      ...s,
      sectionId: s.suggestedSectionId,
    }));
    originalResults.value = JSON.parse(JSON.stringify(classificationResults.value));
    
    ElMessage.success('AI分类完成');
  } catch (error) {
    console.error('AI分类失败:', error);
    ElMessage.error('AI分类失败，请重试');
  } finally {
    classifying.value = false;
  }
}

function handleSectionChange(result: ClassificationResult) {
  // 用户手动调整了版块
  console.log('版块变更:', result.articleId, result.sectionId);
}

function resetChanges() {
  classificationResults.value = JSON.parse(JSON.stringify(originalResults.value));
  ElMessage.info('已重置更改');
}

async function applyAll() {
  applying.value = true;
  try {
    // 获取所有变更
    const changes = classificationResults.value
      .filter((result, index) => result.sectionId !== originalResults.value[index].sectionId)
      .map(result => ({
        articleId: result.articleId,
        sectionId: result.sectionId,
      }));
    
    // 逐个更新文章版块归属
    for (const change of changes) {
      await fetch(`/api/magazine/articles/${change.articleId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sectionId: change.sectionId }),
      });
    }
    
    originalResults.value = JSON.parse(JSON.stringify(classificationResults.value));
    ElMessage.success(`成功应用 ${changes.length} 项更改`);
    emit('update');
  } catch (error) {
    console.error('应用更改失败:', error);
    ElMessage.error('应用更改失败，请重试');
  } finally {
    applying.value = false;
  }
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

defineExpose({
  refresh: loadData,
});
</script>

<style scoped>
.ai-classification-panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
  font-size: 16px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
}

.loading-state .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.classification-results {
  max-height: 500px;
  overflow-y: auto;
}

.classification-item {
  display: flex;
  gap: 16px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.classification-item:hover {
  background: #f5f7fa;
  border-color: #409eff;
}

.article-info {
  flex: 1;
  position: relative;
}

.article-title {
  font-weight: 600;
  margin-bottom: 4px;
  padding-right: 60px;
}

.article-preview {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confidence-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.confidence-badge.high {
  background: #e7f7e7;
  color: #67c23a;
}

.confidence-badge.medium {
  background: #fff7e6;
  color: #e6a23c;
}

.confidence-badge.low {
  background: #fef0f0;
  color: #f56c6c;
}

.classification-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.section-select {
  width: 100%;
}

.reason-text {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
  background: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
}

.reason-label {
  color: #409eff;
  font-weight: 600;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}
</style>
