<template>
  <div class="files-page">
    <div class="toolbar">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <el-select
            v-model="selectedCategory"
            placeholder="按分类筛选"
            clearable
            class="w-48"
            @change="loadData"
          >
            <el-option label="全部分类" value="" />
            <el-option
              v-for="cat in firstTypes"
              :key="cat.categoryName"
              :label="cat.categoryName"
              :value="cat.categoryName"
            />
          </el-select>
          <el-select
            v-model="selectedVisibility"
            placeholder="按可见性筛选"
            clearable
            class="w-40"
            @change="loadData"
          >
            <el-option label="全部" value="" />
            <el-option label="公开" value="public" />
            <el-option label="私有" value="private" />
          </el-select>
        </div>
        <el-button type="primary" @click="showUploadDialog = true">
          <el-icon class="mr-1"><Upload /></el-icon>
          上传文件
        </el-button>
      </div>
    </div>

    <div class="content-container" v-loading="loading">
      <el-table :data="fileList" style="width: 100%" :empty-text="'暂无文件'">
        <el-table-column label="文件" min-width="250">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-icon :size="24" :class="getFileIconClass(row.fileType)">
                <component :is="getFileIcon(row.fileType)" />
              </el-icon>
              <div>
                <p class="font-medium text-[#1A1A1A] truncate max-w-xs" :title="row.fileName">{{ row.fileName }}</p>
                <p class="text-xs text-[#808080]" v-if="row.description" :title="row.description">{{ row.description }}</p>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.category" size="small">{{ row.category }}</el-tag>
            <span v-else class="text-[#808080]">-</span>
          </template>
        </el-table-column>

        <el-table-column label="可见性" width="100">
          <template #default="{ row }">
            <el-tag :type="row.visibility === 'public' ? 'success' : 'warning'" size="small">
              {{ row.visibility === 'public' ? '公开' : '私有' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="fileSize" label="大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>

        <el-table-column label="上传者" width="120">
          <template #default="{ row }">
            {{ row.uploader?.realName || row.uploader?.username || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="下载次数" width="100">
          <template #default="{ row }">
            <span class="flex items-center gap-1">
              <el-icon><Download /></el-icon>
              {{ row.downloadCount }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="上传时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handlePreview(row)">预览</el-button>
            <el-button size="small" type="primary" link @click="handleDownload(row)">下载</el-button>
            <el-button size="small" type="primary" link @click="handleEdit(row)" v-if="canEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)" v-if="canDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 上传文件对话框（支持断点续传） -->
    <el-dialog
      v-model="showUploadDialog"
      title="上传文件"
      width="600px"
      :close-on-click-modal="false"
      :before-close="handleCloseUploadDialog"
    >
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="20"
            multiple
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="uploadFileList"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                支持多文件上传，最多 20 个文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
        
        <!-- 压缩选项提示 -->
        <el-form-item v-if="hasCompressibleFiles(selectedFiles)" label="文件处理">
          <div class="compress-hint">
            <el-icon><InfoFilled /></el-icon>
            <span>检测到可压缩文件（图片/PDF），可选择压缩处理</span>
            <el-button type="primary" link size="small" @click="showCompressDialog = true">
              设置压缩选项
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="uploadForm.category" placeholder="选择分类" clearable class="w-full">
            <el-option
              v-for="cat in firstTypes"
              :key="cat.categoryName"
              :label="cat.categoryName"
              :value="cat.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="可见性">
          <el-select v-model="uploadForm.visibility" class="w-full">
            <el-option label="公开" value="public" />
            <el-option label="私有" value="private" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入文件描述"
          />
        </el-form-item>

        <!-- 弱网环境设置 -->
        <el-divider content-position="left">弱网环境设置</el-divider>
        <el-form-item label="分片大小">
          <el-select v-model="uploadSettings.chunkSize" class="w-full">
            <el-option label="1 MB（极弱网）" :value="1 * 1024 * 1024" />
            <el-option label="2 MB（弱网推荐）" :value="2 * 1024 * 1024" />
            <el-option label="5 MB（中等网络）" :value="5 * 1024 * 1024" />
            <el-option label="10 MB（良好网络）" :value="10 * 1024 * 1024" />
          </el-select>
        </el-form-item>
        <el-form-item label="重试间隔">
          <el-select v-model="uploadSettings.retryInterval" class="w-full">
            <el-option label="2 秒（快速重试）" :value="2000" />
            <el-option label="5 秒（推荐）" :value="5000" />
            <el-option label="10 秒（弱网）" :value="10000" />
            <el-option label="30 秒（极弱网）" :value="30000" />
          </el-select>
        </el-form-item>
        <el-form-item label="最大重试">
          <el-select v-model="uploadSettings.maxRetries" class="w-full">
            <el-option label="3 次" :value="3" />
            <el-option label="5 次（推荐）" :value="5" />
            <el-option label="10 次" :value="10" />
            <el-option label="20 次（极弱网）" :value="20" />
          </el-select>
        </el-form-item>

        <!-- 上传进度 -->
        <el-form-item v-if="uploadProgressList.length > 0" label="上传进度">
          <div class="w-full upload-progress-list">
            <div v-for="(item, index) in uploadProgressList" :key="index" class="progress-item">
              <div class="progress-header">
                <span class="progress-filename">{{ item.fileName }}</span>
                <span class="progress-status" :class="item.status">
                  {{ item.status === 'done' ? '✓ 成功' : item.status === 'error' ? '✗ 失败' : '上传中' }}
                </span>
              </div>
              <el-progress
                :percentage="item.percentage"
                :status="item.status === 'done' ? 'success' : item.status === 'error' ? 'exception' : ''"
                :stroke-width="12"
              />
              <div v-if="item.status === 'calculating'" class="mt-1 text-sm text-gray-500">
                正在计算文件校验值...
              </div>
              <div v-else-if="item.status === 'uploading'" class="mt-1 text-sm text-gray-500">
                正在上传分片：{{ item.uploadedChunks }}/{{ item.totalChunks }}
              </div>
              <div v-else-if="item.status === 'merging'" class="mt-1 text-sm text-gray-500">
                正在合并文件...
              </div>
              <p v-if="item.status === 'error'" class="progress-error">{{ item.error }}</p>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseUploadDialog" :disabled="uploading">取消</el-button>
        <el-button
            type="primary"
            @click="handleUpload"
            :loading="uploading"
            :disabled="selectedFiles.length === 0 || uploadProgressList.some(p => p.status !== 'done' && p.status !== 'error')"
          >
            {{ uploading ? '上传中...' : '上传' }}
          </el-button>
      </template>
    </el-dialog>

    <!-- 编辑文件描述对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑文件信息"
      width="500px"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="文件名">
          <el-input v-model="editForm.fileName" disabled />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.category" placeholder="选择分类" clearable class="w-full">
            <el-option
              v-for="cat in firstTypes"
              :key="cat.categoryName"
              :label="cat.categoryName"
              :value="cat.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="可见性">
          <el-select v-model="editForm.visibility" class="w-full">
            <el-option label="公开" value="public" />
            <el-option label="私有" value="private" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入文件描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="previewFile?.fileName || '文件预览'"
      width="80%"
      :close-on-click-modal="false"
      class="file-preview-dialog"
    >
      <div class="preview-container">
        <!-- 图片预览 -->
        <div v-if="isImage(previewFile?.fileType)" class="image-preview">
          <img :src="getFileUrl(previewFile)" alt="Preview" class="preview-image" />
        </div>

        <!-- PDF预览 -->
        <div v-else-if="isPdf(previewFile?.fileType)" class="pdf-preview">
          <PdfViewer :url="getPdfPreviewUrl(previewFile)" />
        </div>

        <!-- Word预览 -->
        <div v-else-if="isWord(previewFile?.fileType)" class="word-preview">
          <WordViewer :url="getWordPreviewUrl(previewFile)" />
        </div>

        <!-- Excel预览 -->
        <div v-else-if="isExcel(previewFile?.fileType)" class="excel-preview">
          <ExcelViewer :url="getExcelPreviewUrl(previewFile)" />
        </div>

        <!-- 文本文件预览 -->
        <div v-else-if="isText(previewFile?.fileType)" class="text-preview">
          <pre class="text-content">{{ textContent }}</pre>
        </div>

        <!-- 其他文件：下载提示 -->
        <div v-else class="unsupported-preview">
          <el-icon :size="64" color="#c0c4cc"><Document /></el-icon>
          <p class="mt-4 text-gray-500">该文件类型暂不支持在线预览</p>
          <el-button type="primary" class="mt-4" @click="handleDownload(previewFile)">
            下载文件
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 压缩选项对话框 -->
    <CompressOptionDialog
      v-model="showCompressDialog"
      :file-name="selectedFiles.length > 0 ? `${selectedFiles.length} 个文件` : ''"
      :original-size="selectedFiles.reduce((sum, f) => sum + f.size, 0)"
      @confirm="handleCompressConfirm"
      @cancel="handleCompressCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, UploadFilled, Download, Document, Picture, VideoPlay, Notebook, FolderOpened, InfoFilled } from '@element-plus/icons-vue';
import type { UploadFile } from 'element-plus';
import { useApi } from '~/composables/useApi';
import { useAuthStore } from '~/stores/auth';
import { useResumableUpload } from '~/composables/useResumableUpload';
import { useImageCompressor } from '~/composables/useImageCompressor';
import type { FileRecord, DictCategory, CreateFileRecordRequest, UpdateFileRecordRequest } from '~/types';
import PdfViewer from '~/components/PdfViewer.vue';
import WordViewer from '~/components/WordViewer.vue';
import ExcelViewer from '~/components/ExcelViewer.vue';
import CompressOptionDialog from '~/components/CompressOptionDialog.vue';
import type { CompressOptions } from '~/composables/useImageCompressor';

definePageMeta({
  middleware: ['auth'],
})

const api = useApi();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const loading = ref(false);
const uploading = ref(false);
const saving = ref(false);

const fileList = ref<FileRecord[]>([]);
const firstTypes = ref<DictCategory[]>([]);

const selectedCategory = ref<string>('');
const selectedVisibility = ref<string>('');

const showUploadDialog = ref(false);
const showEditDialog = ref(false);

const uploadRef = ref();
const uploadFileList = ref<UploadFile[]>([]);
const selectedFiles = ref<File[]>([]);
const processedFiles = ref<File[]>([]);
const showCompressDialog = ref(false);
const compressOptions = ref<CompressOptions>({
  compressEnabled: false,
  quality: 80,
  maxSize: 1920,
});

// 图片压缩
const { compress, isImage: checkIsImage, isPdf: checkIsPdf } = useImageCompressor();

const needsCompression = (file: File): boolean => {
  return checkIsImage(file) || checkIsPdf(file);
};

const hasCompressibleFiles = (files: File[]): boolean => {
  return files.some(f => needsCompression(f));
};

const uploadForm = ref({
  category: '',
  visibility: 'public' as 'public' | 'private',
  description: '',
});

// 弱网环境上传设置
const uploadSettings = ref({
  chunkSize: 2 * 1024 * 1024, // 默认 2MB
  retryInterval: 5000, // 默认 5秒
  maxRetries: 5, // 默认 5次
});

interface FileUploadProgress {
  fileName: string;
  percentage: number;
  uploadedChunks: number;
  totalChunks: number;
  status: 'calculating' | 'uploading' | 'merging' | 'done' | 'error';
  error?: string;
}

const uploadProgressList = ref<FileUploadProgress[]>([]);

// 断点续传上传
const { progress: uploadProgress } = useResumableUpload();

const editForm = ref<{
  id?: number;
  fileName: string;
  category: string;
  visibility: 'public' | 'private';
  description: string;
}>({
  fileName: '',
  category: '',
  visibility: 'public',
  description: '',
});

// 文件预览
const showPreviewDialog = ref(false);
const previewFile = ref<FileRecord | null>(null);
const textContent = ref('');

const formatFileSize = (bytes: number): string => {
  if (bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN');
};

const getFileExtension = (fileName: string): string => {
  if (!fileName) return '';
  const parts = fileName.split('.');
  if (parts.length <= 1) return '';
  const ext = parts.pop();
  return ext ? ext.toLowerCase() : '';
};

const getFileIcon = (fileType: string) => {
  const ext = fileType.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return Picture;
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) return VideoPlay;
  if (['doc', 'docx', 'txt', 'pdf', 'md', 'xlsx', 'xls', 'ppt', 'pptx'].includes(ext)) return Notebook;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FolderOpened;
  return Document;
};

const getFileIconClass = (fileType: string): string => {
  const ext = fileType.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'text-green-500';
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) return 'text-purple-500';
  if (['doc', 'docx', 'txt', 'pdf', 'md'].includes(ext)) return 'text-blue-500';
  if (['xlsx', 'xls'].includes(ext)) return 'text-emerald-500';
  if (['ppt', 'pptx'].includes(ext)) return 'text-orange-500';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'text-yellow-500';
  return 'text-gray-400';
};

const canEdit = (file: FileRecord): boolean => {
  return file.uploadedBy === authStore.user?.id;
};

const canDelete = (file: FileRecord): boolean => {
  return file.uploadedBy === authStore.user?.id;
};

const loadData = async () => {
  loading.value = true;
  try {
    firstTypes.value = await api.dict.getFirstTypes() as DictCategory[];
    const category = selectedCategory.value || undefined;
    const visibility = selectedVisibility.value || undefined;
    fileList.value = await api.files.getAll(category, visibility) as FileRecord[];
  } catch (e) {
    console.error('加载数据失败', e);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const handleFileChange = (file: UploadFile, files: UploadFile[]) => {
  uploadFileList.value = files;
  const rawFiles = files.map(f => f.raw).filter((f): f is File => f !== undefined);
  selectedFiles.value = rawFiles;
  processedFiles.value = [...rawFiles];
};

const handleFileRemove = (file: UploadFile, files: UploadFile[]) => {
  uploadFileList.value = files;
  const rawFiles = files.map(f => f.raw).filter((f): f is File => f !== undefined);
  selectedFiles.value = rawFiles;
  processedFiles.value = [...rawFiles];
};

// 压缩确认处理
const handleCompressConfirm = async (options: CompressOptions) => {
  compressOptions.value = options;
  
  if (options.compressEnabled) {
    try {
      const compressed: File[] = [];
      for (const file of selectedFiles.value) {
        if (checkIsImage(file)) {
          const compressedBlob = await compress(file, {
            quality: options.quality,
            maxSize: options.maxSize,
          });
          compressed.push(new File(
            [compressedBlob],
            file.name,
            { type: compressedBlob.type || file.type }
          ));
        } else {
          compressed.push(file);
        }
      }
      processedFiles.value = compressed;
      ElMessage.success('文件处理完成');
    } catch (e) {
      console.error('压缩失败，使用原文件:', e);
      processedFiles.value = [...selectedFiles.value];
      ElMessage.warning('部分文件压缩失败，已使用原文件');
    }
  } else {
    processedFiles.value = [...selectedFiles.value];
  }
  
  showCompressDialog.value = false;
};

// 压缩取消处理
const handleCompressCancel = () => {
  showCompressDialog.value = false;
};

// 处理断点续传上传（支持多文件）
const handleUpload = async () => {
  if (processedFiles.value.length === 0) {
    ElMessage.warning('请选择文件');
    return;
  }

  uploading.value = true;
  
  // 初始化上传进度列表
  uploadProgressList.value = processedFiles.value.map(file => ({
    fileName: file.name,
    percentage: 0,
    uploadedChunks: 0,
    totalChunks: 0,
    status: 'calculating' as const,
  }));

  try {
    let successCount = 0;
    let failCount = 0;

    // 逐个上传文件
    for (let i = 0; i < processedFiles.value.length; i++) {
      const file = processedFiles.value[i];
      
      try {
        // 为每个文件创建独立的上传实例
        const { progress, upload } = useResumableUpload();
        
        // 监听进度变化
        const stopWatch = watch(progress, (p) => {
          if (uploadProgressList.value[i]) {
            uploadProgressList.value[i] = {
              ...uploadProgressList.value[i],
              ...p,
            };
          }
        }, { deep: true });
        
        const result = await upload(
          file,
          config.public.apiBase,
          authStore.token || '',
          {
            description: uploadForm.value.description || undefined,
            category: uploadForm.value.category || undefined,
            visibility: uploadForm.value.visibility,
          },
          {
            chunkSize: uploadSettings.value.chunkSize,
            retryInterval: uploadSettings.value.retryInterval,
            maxRetries: uploadSettings.value.maxRetries,
          },
        );

        stopWatch();
        
        if (result.recordId || result.fileHash) {
          uploadProgressList.value[i].status = 'done';
          uploadProgressList.value[i].percentage = 100;
          successCount++;
        }
      } catch (e: any) {
        console.error(`文件 ${file.name} 上传失败`, e);
        uploadProgressList.value[i].status = 'error';
        uploadProgressList.value[i].error = e?.message || '上传失败';
        failCount++;
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功上传 ${successCount} 个文件${failCount > 0 ? `，${failCount} 个失败` : ''}`);
      showUploadDialog.value = false;
      uploadForm.value = {
        category: '',
        visibility: 'public',
        description: '',
      };
      uploadFileList.value = [];
      selectedFiles.value = [];
      processedFiles.value = [];
      uploadProgressList.value = [];
      await loadData();
    } else {
      ElMessage.error('所有文件上传失败');
    }
  } catch (e: any) {
    console.error('上传失败', e);
    ElMessage.error(e?.message || '上传失败');
  } finally {
    uploading.value = false;
  }
};

// 关闭上传对话框
const handleCloseUploadDialog = async () => {
  if (uploading.value) {
    try {
      await ElMessageBox.confirm('文件正在上传中，确定要取消吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
      showUploadDialog.value = false;
    } catch {
      // 用户取消关闭
    }
  } else {
    showUploadDialog.value = false;
  }
};

const handleDownload = async (file: FileRecord) => {
  try {
    // 记录下载次数
    await api.files.download(file.id);

    // 触发实际下载（使用断点续传下载）
    const downloadUrl = `${config.public.apiBase}/files/${file.id}/stream`;
    
    // 使用 fetch 进行下载，支持断点续传
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error('下载失败');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    ElMessage.success('开始下载');
    await loadData();
  } catch (e: any) {
    console.error('下载失败', e);
    ElMessage.error(e?.message || '下载失败');
  }
};

// 文件预览相关函数
const handlePreview = async (file: FileRecord) => {
  previewFile.value = file;
  textContent.value = '';
  showPreviewDialog.value = true;

  // 如果是文本文件，加载内容
  if (isText(file.fileType)) {
    try {
      const fileUrl = `${config.public.apiBase}/files/${file.id}/stream`;
      const response = await fetch(fileUrl, {
        headers: {
          Authorization: authStore.token ? `Bearer ${authStore.token}` : '',
        },
      });
      if (response.ok) {
        textContent.value = await response.text();
      }
    } catch (e) {
      console.error('加载文本文件失败', e);
      textContent.value = '加载失败，请下载文件查看';
    }
  }
};

const isImage = (fileType?: string): boolean => {
  if (!fileType) return false;
  const ext = fileType.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext);
};

const isPdf = (fileType?: string): boolean => {
  if (!fileType) return false;
  return fileType.toLowerCase() === 'pdf';
};

const isWord = (fileType?: string): boolean => {
  if (!fileType) return false;
  const ext = fileType.toLowerCase();
  return ['doc', 'docx'].includes(ext);
};

const isExcel = (fileType?: string): boolean => {
  if (!fileType) return false;
  const ext = fileType.toLowerCase();
  return ['xls', 'xlsx'].includes(ext);
};

const isText = (fileType?: string): boolean => {
  if (!fileType) return false;
  const ext = fileType.toLowerCase();
  return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'js', 'ts', 'css', 'log', 'yaml', 'yml', 'sql', 'sh', 'bat'].includes(ext);
};

const getFileUrl = (file: FileRecord | null): string => {
  if (!file) return '';
  return `${config.public.apiBase}/files/${file.id}/stream`;
};

const getPdfPreviewUrl = (file: FileRecord | null): string => {
  if (!file) return '';
  // PDF预览使用stream接口，PdfViewer组件会添加Authorization头
  return `${config.public.apiBase}/files/${file.id}/stream`;
};

const getWordPreviewUrl = (file: FileRecord | null): string => {
  if (!file) return '';
  return `${config.public.apiBase}/files/${file.id}/stream`;
};

const getExcelPreviewUrl = (file: FileRecord | null): string => {
  if (!file) return '';
  return `${config.public.apiBase}/files/${file.id}/stream`;
};

const handleEdit = (file: FileRecord) => {
  editForm.value = {
    id: file.id,
    fileName: file.fileName,
    category: file.category || '',
    visibility: file.visibility,
    description: file.description || '',
  };
  showEditDialog.value = true;
};

const handleSaveEdit = async () => {
  if (!editForm.value.id) return;

  saving.value = true;
  try {
    const updateData: UpdateFileRecordRequest = {
      description: editForm.value.description || undefined,
      category: editForm.value.category || undefined,
      visibility: editForm.value.visibility,
    };
    await api.files.update(editForm.value.id, updateData);
    ElMessage.success('保存成功');
    showEditDialog.value = false;
    await loadData();
  } catch (e: any) {
    console.error('保存失败', e);
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (file: FileRecord) => {
  try {
    await ElMessageBox.confirm(`确定要删除文件 "${file.fileName}" 吗？此操作不可撤销。`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await api.files.delete(file.id);
    ElMessage.success('删除成功');
    await loadData();
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error('删除失败', e);
      ElMessage.error(e?.message || '删除失败');
    }
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.files-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
}

.toolbar {
  margin-bottom: 16px;
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.content-container {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

/* 文件预览对话框样式 */
:deep(.file-preview-dialog .el-dialog__body) {
  padding: 0;
  max-height: 70vh;
  overflow: auto;
}

.preview-container {
  width: 100%;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 16px;
}

.preview-image {
  max-width: 100%;
  max-height: 65vh;
  object-fit: contain;
  border-radius: 4px;
}

.pdf-preview {
  width: 100%;
  height: 70vh;
}

.word-preview {
  width: 100%;
  height: 70vh;
}

.excel-preview {
  width: 100%;
  height: 70vh;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.text-preview {
  width: 100%;
  padding: 16px;
}

.text-content {
  background: #fafbfc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 60vh;
  overflow-y: auto;
  margin: 0;
}

.unsupported-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.unsupported-preview p {
  margin: 0;
  font-size: 14px;
}

.compress-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 13px;
}

.compress-hint .el-icon {
  color: #409eff;
}
</style>