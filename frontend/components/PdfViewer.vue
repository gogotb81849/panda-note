<template>
  <div class="pdf-viewer" ref="containerRef">
    <div v-if="loading" class="pdf-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在加载 PDF...</span>
    </div>

    <div v-else-if="error" class="pdf-error">
      <el-icon :size="48" color="#f56c6c"><WarningFilled /></el-icon>
      <p>{{ error }}</p>
    </div>

    <template v-else>
      <!-- 工具栏 -->
      <div class="pdf-toolbar">
        <div class="toolbar-left">
          <el-button-group>
            <el-button size="small" :disabled="currentPage <= 1" @click="goToPrevPage">
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <el-button size="small" :disabled="currentPage >= totalPages" @click="goToNextPage">
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </el-button-group>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        </div>

        <div class="toolbar-right">
          <el-button-group>
            <el-button size="small" :disabled="scale <= 0.5" @click="zoomOut">
              <el-icon><ZoomOut /></el-icon>
            </el-button>
            <el-button size="small" disabled>{{ Math.round(scale * 100) }}%</el-button>
            <el-button size="small" :disabled="scale >= 3" @click="zoomIn">
              <el-icon><ZoomIn /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- PDF页面容器 -->
      <div class="pdf-pages" ref="pagesContainerRef">
        <canvas
          v-for="pageNum in displayedPages"
          :key="pageNum"
          :ref="el => setCanvasRef(el, pageNum)"
          class="pdf-canvas"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { Loading, WarningFilled, ArrowLeft, ArrowRight, ZoomOut, ZoomIn } from '@element-plus/icons-vue';
import * as pdfjsLib from 'pdfjs-dist';
import { useAuthStore } from '~/stores/auth';

// 设置worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const props = defineProps<{
  url: string;
}>();

const loading = ref(true);
const error = ref('');
const pdfDoc = ref<any>(null);
const currentPage = ref(1);
const totalPages = ref(0);
const scale = ref(1.2);
const canvasRefs = ref<Record<number, HTMLCanvasElement | null>>({});
const pagesContainerRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

// 每侧预渲染的页面数
const PRELOAD_PAGES = 2;

const displayedPages = computed(() => {
  const pages: number[] = [];
  const start = Math.max(1, currentPage.value - PRELOAD_PAGES);
  const end = Math.min(totalPages.value, currentPage.value + PRELOAD_PAGES);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const setCanvasRef = (el: any, pageNum: number) => {
  canvasRefs.value[pageNum] = el as HTMLCanvasElement;
};

const loadPdf = async () => {
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
    pdfDoc.value = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages.value = pdfDoc.value.numPages;

    await renderPage(currentPage.value);
  } catch (e: any) {
    console.error('PDF加载失败:', e);
    error.value = e.message || 'PDF加载失败';
  } finally {
    loading.value = false;
  }
};

const renderPage = async (pageNum: number) => {
  if (!pdfDoc.value) return;

  try {
    const page = await pdfDoc.value.getPage(pageNum);
    const canvas = canvasRefs.value[pageNum];
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale: scale.value });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
  } catch (e) {
    console.error(`渲染页面 ${pageNum} 失败:`, e);
  }
};

const goToPrevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const zoomIn = () => {
  scale.value = Math.min(3, scale.value + 0.2);
};

const zoomOut = () => {
  scale.value = Math.max(0.5, scale.value - 0.2);
};

// 监听页面变化，重新渲染当前页面范围内的所有页面
watch(currentPage, async () => {
  await renderPage(currentPage.value);
  // 预渲染相邻页面
  for (let i = 1; i <= PRELOAD_PAGES; i++) {
    if (currentPage.value - i >= 1) {
      renderPage(currentPage.value - i);
    }
    if (currentPage.value + i <= totalPages.value) {
      renderPage(currentPage.value + i);
    }
  }
});

// 监听缩放变化，重新渲染所有显示的页面
watch(scale, async () => {
  for (const pageNum of displayedPages.value) {
    await renderPage(pageNum);
  }
});

watch(() => props.url, () => {
  loadPdf();
});

onMounted(() => {
  loadPdf();
});

onUnmounted(() => {
  if (pdfDoc.value) {
    pdfDoc.value.destroy();
    pdfDoc.value = null;
  }
});
</script>

<style scoped>
.pdf-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #525659;
  overflow: hidden;
}

.pdf-loading,
.pdf-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  gap: 16px;
}

.pdf-error p {
  margin: 0;
  color: #f56c6c;
}

.pdf-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #323639;
  border-bottom: 1px solid #525659;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  color: #fff;
  font-size: 14px;
}

.pdf-pages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  gap: 16px;
}

.pdf-canvas {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
