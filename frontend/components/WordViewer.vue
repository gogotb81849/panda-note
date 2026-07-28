<template>
  <div class="word-viewer" ref="containerRef">
    <div v-if="loading" class="word-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在加载 Word 文档...</span>
    </div>

    <div v-else-if="error" class="word-error">
      <el-icon :size="48" color="#f56c6c"><WarningFilled /></el-icon>
      <p>{{ error }}</p>
    </div>

    <template v-else>
      <div class="word-toolbar">
        <div class="toolbar-left">
          <el-button size="small" @click="zoomOut" :disabled="scale <= 0.5">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <span class="zoom-info">{{ Math.round(scale * 100) }}%</span>
          <el-button size="small" @click="zoomIn" :disabled="scale >= 2">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </div>
      </div>
      <div class="word-container" ref="wordContainerRef"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Loading, WarningFilled, ZoomOut, ZoomIn } from '@element-plus/icons-vue';
import { renderAsync } from 'docx-preview';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  url: string;
}>();

const loading = ref(true);
const error = ref('');
const scale = ref(1.0);
const wordContainerRef = ref<HTMLElement | null>(null);

const loadWord = async () => {
  if (!props.url) return;

  loading.value = true;
  error.value = '';

  try {
    const response = await fetch(props.url, {
      headers: {
        Authorization: useAuthStore().token ? `Bearer ${useAuthStore().token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`加载失败: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    if (wordContainerRef.value) {
      wordContainerRef.value.innerHTML = '';
      await renderAsync(arrayBuffer, wordContainerRef.value, undefined, {
        baseUrl: '',
        className: 'docx-preview-content',
        inlined: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: false,
        useBase64URL: true,
        useMathMLPolyfill: false,
        renderChanges: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });
    }
  } catch (e: any) {
    console.error('Word加载失败:', e);
    error.value = e.message || 'Word文档加载失败';
  } finally {
    loading.value = false;
  }
};

const zoomIn = () => {
  scale.value = Math.min(2, scale.value + 0.1);
};

const zoomOut = () => {
  scale.value = Math.max(0.5, scale.value - 0.1);
};

watch(scale, () => {
  if (wordContainerRef.value) {
    wordContainerRef.value.style.transform = `scale(${scale.value})`;
    wordContainerRef.value.style.transformOrigin = 'top left';
  }
});

watch(() => props.url, () => {
  loadWord();
});

onMounted(() => {
  loadWord();
});
</script>

<style scoped>
.word-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow: hidden;
}

.word-loading,
.word-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #606266;
  gap: 16px;
}

.word-error p {
  margin: 0;
  color: #f56c6c;
}

.word-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #e8e8e8;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-info {
  font-size: 14px;
  color: #606266;
  min-width: 50px;
  text-align: center;
}

.word-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  justify-content: center;
}

.word-container :deep(.docx-preview-content) {
  background-color: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 40px;
  max-width: 900px;
  width: 100%;
}

.word-container :deep(.docx-preview-content p) {
  margin: 0 0 10px 0;
}

.word-container :deep(.docx-preview-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
}

.word-container :deep(.docx-preview-content td),
.word-container :deep(.docx-preview-content th) {
  border: 1px solid #ddd;
  padding: 8px;
}

.word-container :deep(.docx-preview-content th) {
  background-color: #f5f7fa;
}
</style>
