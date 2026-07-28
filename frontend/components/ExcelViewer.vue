<template>
  <div class="excel-viewer">
    <div v-if="loading" class="excel-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在加载 Excel 文件...</span>
    </div>

    <div v-else-if="error" class="excel-error">
      <el-icon :size="48" color="#f56c6c"><WarningFilled /></el-icon>
      <p>{{ error }}</p>
    </div>

    <template v-else>
      <div class="excel-toolbar">
        <div class="toolbar-left">
          <span class="sheet-tabs">
            <el-tabs v-model="activeSheet" @tab-change="handleSheetChange">
              <el-tab-pane
                v-for="sheet in sheetNames"
                :key="sheet"
                :label="sheet"
                :name="sheet"
              />
            </el-tabs>
          </span>
        </div>
        <div class="toolbar-right">
          <el-button size="small" @click="zoomOut" :disabled="scale <= 0.5">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <span class="zoom-info">{{ Math.round(scale * 100) }}%</span>
          <el-button size="small" @click="zoomIn" :disabled="scale >= 2">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </div>
      </div>
      <div class="excel-container" ref="excelContainerRef">
        <div class="excel-wrapper" :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }">
          <div v-html="tableHtml"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Loading, WarningFilled, ZoomOut, ZoomIn } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  url: string;
}>();

const loading = ref(true);
const error = ref('');
const scale = ref(1.0);
const tableHtml = ref('');
const sheetNames = ref<string[]>([]);
const activeSheet = ref('');
const workbook = ref<any>(null);

const loadExcel = async () => {
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
    workbook.value = XLSX.read(arrayBuffer, { type: 'array' });
    sheetNames.value = workbook.value.SheetNames;
    
    if (sheetNames.value.length > 0) {
      activeSheet.value = sheetNames.value[0];
      renderSheet(activeSheet.value);
    }
  } catch (e: any) {
    console.error('Excel加载失败:', e);
    error.value = e.message || 'Excel文件加载失败';
  } finally {
    loading.value = false;
  }
};

const renderSheet = (sheetName: string) => {
  if (!workbook.value) return;
  
  const worksheet = workbook.value.Sheets[sheetName];
  if (!worksheet) return;

  // 将 sheet 转换为 HTML 表格
  tableHtml.value = XLSX.utils.sheet_to_html(worksheet, {
    editable: false,
    header: '',
    footer: '',
  });
};

const handleSheetChange = (sheetName: string) => {
  renderSheet(sheetName);
};

const zoomIn = () => {
  scale.value = Math.min(2, scale.value + 0.1);
};

const zoomOut = () => {
  scale.value = Math.max(0.5, scale.value - 0.1);
};

watch(() => props.url, () => {
  loadExcel();
});

onMounted(() => {
  loadExcel();
});
</script>

<style scoped>
.excel-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow: hidden;
}

.excel-loading,
.excel-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #606266;
  gap: 16px;
}

.excel-error p {
  margin: 0;
  color: #f56c6c;
}

.excel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #e8e8e8;
}

.toolbar-left {
  flex: 1;
  overflow-x: auto;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 16px;
}

.zoom-info {
  font-size: 14px;
  color: #606266;
  min-width: 50px;
  text-align: center;
}

.sheet-tabs {
  display: flex;
  align-items: center;
}

.excel-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.excel-wrapper {
  background-color: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: inline-block;
  min-width: 100%;
}

.excel-wrapper :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 14px;
}

.excel-wrapper :deep(td),
.excel-wrapper :deep(th) {
  border: 1px solid #d9d9d9;
  padding: 8px 12px;
  text-align: left;
  vertical-align: middle;
  min-width: 60px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.excel-wrapper :deep(th) {
  background-color: #f5f7fa;
  font-weight: 600;
  color: #1a1a1a;
}

.excel-wrapper :deep(td) {
  color: #333;
}

.excel-wrapper :deep(tr:hover td) {
  background-color: #f5f7fa;
}

.excel-wrapper :deep(.excel-header-row th) {
  background-color: #e8ecf1;
  font-weight: bold;
}
</style>
