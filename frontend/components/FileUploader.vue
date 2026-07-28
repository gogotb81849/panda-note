<template>
  <div class="file-uploader">
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :limit="limit"
      :multiple="multiple"
      :accept="accept"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :file-list="fileList"
      drag
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
    </el-upload>

    <!-- 压缩选项对话框 -->
    <CompressOptionDialog
      v-model="showCompressDialog"
      :file-name="pendingFile?.name || ''"
      :original-size="pendingFile?.size || 0"
      @confirm="handleCompressConfirm"
      @cancel="handleCompressCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { UploadFilled } from '@element-plus/icons-vue';
import CompressOptionDialog from './CompressOptionDialog.vue';
import type { CompressOptions } from '~/composables/useImageCompressor';
import { useImageCompressor } from '~/composables/useImageCompressor';

export interface UploadFile {
  file: File;
  compressed?: boolean;
}

const props = withDefaults(defineProps<{
  limit?: number;
  multiple?: boolean;
  accept?: string;
  compressByDefault?: boolean;
}>(), {
  limit: 10,
  multiple: true,
  accept: '.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf',
  compressByDefault: false,
});

const emit = defineEmits<{
  'update:fileList': [files: UploadFile[]];
  'file-ready': [file: File, compressedFile?: Blob];
}>();

const uploadRef = ref();
const fileList = ref<any[]>([]);
const selectedFiles = ref<UploadFile[]>([]);

const showCompressDialog = ref(false);
const pendingFile = ref<File | null>(null);
const pendingFileIndex = ref(-1);

const { compress, isImage, isPdf } = useImageCompressor();

// 是否需要显示压缩对话框（图片或PDF）
const needsCompression = (file: File): boolean => {
  return isImage(file) || isPdf(file);
};

const handleFileChange = async (uploadFile: any, uploadFiles: any[]) => {
  const rawFile = uploadFile.raw as File;
  
  // 检查是否需要显示压缩选项
  if (needsCompression(rawFile)) {
    pendingFile.value = rawFile;
    pendingFileIndex.value = fileList.value.length;
    
    // 显示压缩对话框
    showCompressDialog.value = true;
  } else {
    // 不需要压缩，直接添加文件
    addFile(rawFile, false);
  }
};

const handleFileRemove = (uploadFile: any, uploadFiles: any[]) => {
  const index = selectedFiles.value.findIndex(f => f.file.name === uploadFile.name);
  if (index > -1) {
    selectedFiles.value.splice(index, 1);
  }
  emit('update:fileList', selectedFiles.value);
};

const addFile = (file: File, compressed: boolean, compressedBlob?: Blob) => {
  const uploadFile: UploadFile = { file, compressed };
  selectedFiles.value.push(uploadFile);
  emit('update:fileList', selectedFiles.value);
  emit('file-ready', file, compressedBlob);
};

const handleCompressConfirm = async (options: CompressOptions) => {
  if (!pendingFile.value) return;

  const file = pendingFile.value;

  if (options.compressEnabled && isImage(file)) {
    try {
      const compressedBlob = await compress(file, {
        quality: options.quality,
        maxSize: options.maxSize,
      });

      // 创建新的File对象
      const compressedFile = new File(
        [compressedBlob],
        file.name,
        { type: compressedBlob.type || file.type }
      );

      addFile(compressedFile, true, compressedBlob);
    } catch (e) {
      console.error('压缩失败，使用原文件:', e);
      addFile(file, false);
    }
  } else {
    // 不压缩或PDF不压缩（PDF压缩复杂，暂时不做）
    addFile(file, false);
  }

  pendingFile.value = null;
  pendingFileIndex.value = -1;
};

const handleCompressCancel = () => {
  // 取消时移除刚添加的文件
  if (pendingFileIndex.value > -1) {
    const lastFile = fileList.value[fileList.value.length - 1];
    if (lastFile) {
      uploadRef.value?.handleRemove(lastFile);
    }
  }
  pendingFile.value = null;
  pendingFileIndex.value = -1;
};

// 暴露方法供外部调用
const clearFiles = () => {
  selectedFiles.value = [];
  fileList.value = [];
  uploadRef.value?.clearFiles();
};

defineExpose({
  clearFiles,
  uploadRef,
});
</script>

<style scoped>
.file-uploader {
  width: 100%;
}
</style>
