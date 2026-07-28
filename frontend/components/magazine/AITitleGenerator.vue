<template>
  <div class="ai-title-generator">
    <div class="generator-header">
      <el-button 
        type="primary" 
        @click="generateTitles" 
        :loading="generating"
        :disabled="!content"
      >
        🤖 AI生成标题
      </el-button>
      <span v-if="!content" class="hint">请先输入文章内容</span>
    </div>
    
    <div v-if="generatedTitles.length > 0" class="title-options">
      <div class="options-label">候选标题：</div>
      <div 
        v-for="(title, index) in generatedTitles" 
        :key="index"
        class="title-option"
        :class="{ selected: selectedTitle === title }"
        @click="selectTitle(title)"
      >
        <span class="title-text">{{ title }}</span>
        <el-icon v-if="selectedTitle === title" class="check-icon"><Check /></el-icon>
      </div>
    </div>
    
    <div v-if="reason" class="reason-box">
      <div class="reason-label">推荐理由：</div>
      <div class="reason-text">{{ reason }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Check } from '@element-plus/icons-vue';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  content: string;
}>();

const emit = defineEmits<{
  (e: 'select', title: string): void;
}>();

const generating = ref(false);
const generatedTitles = ref<string[]>([]);
const selectedTitle = ref<string>('');
const reason = ref<string>('');

const generateTitles = async () => {
  if (!props.content) return;
  
  generating.value = true;
  try {
    const response = await fetch('/api/magazine/generate-titles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${useAuthStore().token}`,
      },
      body: JSON.stringify({
        content: props.content,
        count: 3,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      generatedTitles.value = data.titles;
      reason.value = data.reason;
      if (data.titles.length > 0) {
        selectedTitle.value = data.titles[0];
        emit('select', selectedTitle.value);
      }
    } else {
      console.error('AI标题生成失败:', data.message);
    }
  } catch (error) {
    console.error('AI标题生成失败:', error);
  } finally {
    generating.value = false;
  }
};

const selectTitle = (title: string) => {
  selectedTitle.value = title;
  emit('select', title);
};
</script>

<style scoped>
.ai-title-generator {
  padding: 16px;
  background-color: #fafafa;
  border-radius: 8px;
}

.generator-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hint {
  font-size: 12px;
  color: #999;
}

.title-options {
  margin-top: 16px;
}

.options-label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.title-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  background-color: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.title-option:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.title-option.selected {
  border-color: #409eff;
  background-color: #e6f0ff;
}

.title-text {
  font-size: 14px;
  color: #333;
}

.check-icon {
  color: #409eff;
  font-weight: bold;
}

.reason-box {
  margin-top: 16px;
  padding: 12px;
  background-color: #fff;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.reason-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.reason-text {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}
</style>
