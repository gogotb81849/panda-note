<template>
  <div class="health-report-page">
    <div class="page-header">
      <h2 class="page-title">健康排查表上传</h2>
      <p class="page-desc">每月上报本船船员健康排查数据</p>
    </div>

    <el-card class="upload-card">
      <template #header>
        <div class="card-header">
          <span>上传健康排查表</span>
          <el-button type="primary" link @click="downloadTemplate">
            <el-icon><Download /></el-icon> 下载标准模板
          </el-button>
        </div>
      </template>

      <el-form :model="form" label-width="100px">
        <el-form-item label="报送月份">
          <el-date-picker
            v-model="form.month"
            type="month"
            placeholder="选择月份"
            format="YYYY-MM"
            value-format="YYYY-MM"
          />
        </el-form-item>

        <el-form-item label="所属船舶">
          <el-select v-model="form.shipId" placeholder="选择船舶" style="width: 100%">
            <el-option
              v-for="ship in ships"
              :key="ship.id"
              :label="ship.cnShipName"
              :value="ship.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="上传文件">
          <el-upload
            ref="uploadRef"
            drag
            :auto-upload="false"
            :limit="10"
            multiple
            accept=".xlsx,.xls"
            :file-list="fileList"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :on-exceed="handleExceed"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .xlsx 和 .xls 格式，最多上传 10 个文件，单个文件不超过 10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button @click="resetForm">重置</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="fileList.length === 0 || !form.shipId || !form.month"
          @click="handleUpload"
        >
          提交上报
        </el-button>
      </div>
    </el-card>

    <!-- 上传进度弹窗 -->
    <el-dialog
      v-model="progressDialogVisible"
      title="上传进度"
      width="500px"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="progress-content">
        <div v-for="(item, index) in uploadProgress" :key="index" class="progress-item">
          <div class="progress-header">
            <span class="progress-filename">{{ item.fileName }}</span>
            <span class="progress-status" :class="item.status">
              {{ item.status === 'success' ? '✓ 成功' : item.status === 'error' ? '✗ 失败' : '上传中' }}
            </span>
          </div>
          <el-progress
            v-if="item.status !== 'success' && item.status !== 'error'"
            :percentage="item.percentage"
            :stroke-width="12"
          />
          <p v-if="item.status === 'error'" class="progress-error">{{ item.error }}</p>
        </div>
      </div>
      <template #footer>
        <el-button
          v-if="!uploading && uploadProgress.some(p => p.status !== 'success')"
          type="primary"
          @click="retryFailed"
        >
          重新上传失败文件
        </el-button>
        <el-button @click="progressDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 校验结果弹窗 -->
    <el-dialog
      v-model="validationDialogVisible"
      :title="validationResult?.pass ? '上传成功' : '格式校验失败'"
      width="600px"
    >
      <div v-if="validationResult?.pass" class="success-content">
        <el-icon class="success-icon" :size="64" color="#67C23A"><CircleCheck /></el-icon>
        <p class="success-text">文件上传成功，已提交审核！</p>
      </div>
      <div v-else class="error-content">
        <el-icon class="error-icon" :size="64" color="#F56C6C"><CircleClose /></el-icon>
        <p class="error-text">表格格式不符合要求，请检查以下问题：</p>
        <ul class="error-list">
          <li v-for="(err, index) in validationResult?.errors" :key="index">
            {{ err.message }}
          </li>
        </ul>
        <el-alert
          v-if="validationResult?.aiFixable"
          title="AI将尝试容错解析"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>

      <template #footer>
        <el-button @click="validationDialogVisible = false">关闭</el-button>
        <el-button
          v-if="!validationResult?.pass"
          type="primary"
          @click="downloadTemplate"
        >
          下载标准模板
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled, Download, CircleCheck, CircleClose } from '@element-plus/icons-vue';
import type { UploadFile } from 'element-plus';
import { useApi } from '~/composables/useApi';

const { apiFetch, user } = useApi();

interface Ship {
  id: number;
  cnShipName: string;
}

const ships = ref<Ship[]>([]);
const uploading = ref(false);
const fileList = ref<UploadFile[]>([]);
const validationDialogVisible = ref(false);
const progressDialogVisible = ref(false);
const validationResult = ref<{
  pass: boolean;
  errors: Array<{ field: string; message: string }>;
  aiFixable: boolean;
} | null>(null);

interface UploadProgressItem {
  fileName: string;
  percentage: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const uploadProgress = ref<UploadProgressItem[]>([]);

const form = reactive({
  month: new Date().toISOString().slice(0, 7),
  shipId: null as number | null,
});

const uploadRef = ref();

onMounted(async () => {
  await fetchShips();
});

const fetchShips = async () => {
  try {
    const data = await apiFetch('/ship');
    ships.value = data || [];
    if (ships.value.length > 0 && !form.shipId) {
      form.shipId = ships.value[0].id;
    }
  } catch (e: any) {
    ElMessage.error('获取船舶列表失败：' + e.message);
  }
};

const handleFileChange = (uploadFile: UploadFile, files: UploadFile[]) => {
  fileList.value = files;
};

const handleFileRemove = (uploadFile: UploadFile, files: UploadFile[]) => {
  fileList.value = files;
};

const handleExceed = (files: UploadFile[], uploadFiles: UploadFile[]) => {
  ElMessage.warning(`最多只能上传 ${uploadFiles.length} 个文件`);
};

const handleUpload = async () => {
  if (fileList.value.length === 0 || !form.shipId || !form.month) {
    ElMessage.warning('请填写完整信息并选择文件');
    return;
  }

  uploading.value = true;
  progressDialogVisible.value = true;
  
  uploadProgress.value = fileList.value.map(file => ({
    fileName: file.name,
    percentage: 0,
    status: 'uploading' as const,
  }));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < fileList.value.length; i++) {
    const file = fileList.value[i];
    const rawFile = file.raw;
    
    if (!rawFile) {
      uploadProgress.value[i].status = 'error';
      uploadProgress.value[i].error = '文件无效';
      failCount++;
      continue;
    }

    uploadProgress.value[i].percentage = 20;
    
    try {
      const formData = new FormData();
      formData.append('file', rawFile);
      formData.append('shipId', String(form.shipId));
      formData.append('month', form.month);

      uploadProgress.value[i].percentage = 50;
      
      const result = await apiFetch('/health-report/upload', {
        method: 'POST',
        body: formData,
      });

      uploadProgress.value[i].percentage = 100;
      uploadProgress.value[i].status = 'success';
      
      validationResult.value = result.validation;
      successCount++;

      if (!result.validation.pass && !result.validation.aiFixable) {
        uploadProgress.value[i].status = 'error';
        uploadProgress.value[i].error = '格式校验失败';
        failCount++;
      }

    } catch (e: any) {
      uploadProgress.value[i].status = 'error';
      uploadProgress.value[i].error = e.message || '上传失败';
      failCount++;
      
      if (e.data?.errors) {
        validationResult.value = {
          pass: false,
          errors: e.data.errors,
          aiFixable: false,
        };
        validationDialogVisible.value = true;
      }
    }
  }

  uploading.value = false;
  
  if (successCount > 0) {
    ElMessage.success(`成功上传 ${successCount} 个文件！`);
  }
  if (failCount > 0) {
    ElMessage.error(`有 ${failCount} 个文件上传失败`);
  }
  
  if (successCount === fileList.value.length && failCount === 0) {
    resetForm();
  }
};

const retryFailed = () => {
  const failedIndices = uploadProgress.value
    .map((item, index) => item.status === 'error' ? index : -1)
    .filter(index => index !== -1);

  if (failedIndices.length === 0) {
    ElMessage.info('没有失败的文件需要重新上传');
    return;
  }

  uploading.value = true;
  
  failedIndices.forEach(async (index) => {
    const file = fileList.value[index];
    const rawFile = file.raw;
    
    if (!rawFile) return;

    uploadProgress.value[index].status = 'uploading';
    uploadProgress.value[index].percentage = 0;
    uploadProgress.value[index].error = undefined;

    try {
      const formData = new FormData();
      formData.append('file', rawFile);
      formData.append('shipId', String(form.shipId));
      formData.append('month', form.month);

      uploadProgress.value[index].percentage = 50;
      
      const result = await apiFetch('/health-report/upload', {
        method: 'POST',
        body: formData,
      });

      uploadProgress.value[index].percentage = 100;
      uploadProgress.value[index].status = 'success';
      
      if (!result.validation.pass && !result.validation.aiFixable) {
        uploadProgress.value[index].status = 'error';
        uploadProgress.value[index].error = '格式校验失败';
      }

    } catch (e: any) {
      uploadProgress.value[index].status = 'error';
      uploadProgress.value[index].error = e.message || '上传失败';
    }
  });

  uploading.value = false;
};

const resetForm = () => {
  form.month = new Date().toISOString().slice(0, 7);
  fileList.value = [];
  uploadRef.value?.clearFiles();
};

const downloadTemplate = () => {
  ElMessage.info('请联系管理员获取标准模板文件');
};
</script>

<style scoped>
.health-report-page {
  padding: 24px;
  max-width: 800px;
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

.upload-card {
  margin-top: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.progress-content {
  padding: 16px 0;
}

.progress-item {
  margin-bottom: 20px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-filename {
  font-size: 14px;
  color: #303133;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-status {
  font-size: 14px;
  font-weight: 500;
}

.progress-status.success {
  color: #67C23A;
}

.progress-status.error {
  color: #F56C6C;
}

.progress-status.uploading {
  color: #409EFF;
}

.progress-error {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #F56C6C;
}

.success-content,
.error-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon,
.error-icon {
  margin-bottom: 16px;
}

.success-text,
.error-text {
  font-size: 16px;
  color: #303133;
  margin: 0 0 16px 0;
}

.error-list {
  text-align: left;
  background: #fef0f0;
  border-radius: 8px;
  padding: 16px 20px;
  margin: 16px 0;
}

.error-list li {
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.8;
}
</style>
