import { ref } from 'vue';
import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  quality?: number;
  maxSize?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

export function useImageCompressor() {
  const compressing = ref(false);
  const progress = ref(0);

  async function compress(
    file: File,
    options: CompressOptions = {}
  ): Promise<Blob> {
    compressing.value = true;
    progress.value = 0;

    try {
      const compressOptions: any = {
        maxSizeMB: 10, // 默认10MB上限
        maxWidthOrHeight: options.maxSize || 1920,
        useWebWorker: true,
        initialQuality: (options.quality || 80) / 100,
        onProgress: (p: number) => {
          progress.value = Math.round(p);
        },
      };

      // 如果设置了最大尺寸限制
      if (options.maxSize && options.maxSize > 0) {
        compressOptions.maxWidthOrHeight = options.maxSize;
      }

      const compressed = await imageCompression(file, compressOptions);
      return compressed;
    } finally {
      compressing.value = false;
      progress.value = 100;
    }
  }

  // 检查文件是否为图片
  function isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // 检查文件是否为PDF
  function isPdf(file: File): boolean {
    return file.type === 'application/pdf';
  }

  return {
    compressing,
    progress,
    compress,
    isImage,
    isPdf,
  };
}
