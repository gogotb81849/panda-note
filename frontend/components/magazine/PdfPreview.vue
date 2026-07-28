<template>
  <div class="pdf-preview">
    <div class="preview-toolbar">
      <el-button-group>
        <el-button @click="prevPage" :disabled="currentPage <= 1">
          <el-icon><ArrowLeft /></el-icon>
          上一页
        </el-button>
        <el-button disabled class="page-indicator">
          {{ currentPage }} / {{ totalPages }}
        </el-button>
        <el-button @click="nextPage" :disabled="currentPage >= totalPages">
          下一页
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </el-button-group>
      
      <div class="toolbar-divider"></div>
      
      <el-button-group>
        <el-button @click="zoomOut" :disabled="scale <= 0.5">
          <el-icon><ZoomOut /></el-icon>
        </el-button>
        <el-button disabled class="zoom-indicator">
          {{ Math.round(scale * 100) }}%
        </el-button>
        <el-button @click="zoomIn" :disabled="scale >= 3">
          <el-icon><ZoomIn /></el-icon>
        </el-button>
      </el-button-group>
      
      <div class="toolbar-spacer"></div>
      
      <el-button type="primary" @click="downloadPdf">
        <el-icon><Download /></el-icon>
        下载PDF
      </el-button>
    </div>
    
    <div class="preview-container">
      <PdfViewer v-if="pdfUrl" :url="pdfUrl" ref="pdfViewerRef" />
      <div v-else class="no-pdf">
        <el-icon :size="64" color="#ccc"><Document /></el-icon>
        <p>暂无PDF预览</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ArrowLeft, ArrowRight, ZoomOut, ZoomIn, Download, Document } from '@element-plus/icons-vue';
import PdfViewer from '~/components/PdfViewer.vue';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  pdfUrl?: string;
  page?: number;
}>();

const emit = defineEmits<{
  (e: 'page-change', page: number): void;
  (e: 'download'): void;
}>();

const currentPage = ref(props.page || 1);
const totalPages = ref(0);
const scale = ref(1.2);
const pdfViewerRef = ref<InstanceType<typeof PdfViewer> | null>(null);

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    emit('page-change', currentPage.value);
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    emit('page-change', currentPage.value);
  }
};

const zoomIn = () => {
  scale.value = Math.min(3, scale.value + 0.2);
};

const zoomOut = () => {
  scale.value = Math.max(0.5, scale.value - 0.2);
};

const downloadPdf = () => {
  if (props.pdfUrl) {
    emit('download');
    window.open(props.pdfUrl, '_blank');
  }
};

watch(() => props.page, (newPage) => {
  if (newPage) {
    currentPage.value = newPage;
  }
});

watch(() => props.pdfUrl, (newUrl) => {
  if (newUrl) {
    currentPage.value = 1;
  }
});
</script>

<style scoped>
.pdf-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #525659;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #323639;
  border-bottom: 1px solid #525659;
  gap: 12px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #525659;
}

.toolbar-spacer {
  flex: 1;
}

.page-indicator,
.zoom-indicator {
  min-width: 80px;
  pointer-events: none;
}

.preview-container {
  flex: 1;
  overflow: hidden;
}

.no-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.no-pdf p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
