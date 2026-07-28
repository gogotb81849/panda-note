import { ref } from 'vue';
import SparkMD5 from 'spark-md5';

/**
 * 分片上传配置
 */
export interface ResumableUploadOptions {
  /** 分片大小（字节），默认 2MB */
  chunkSize?: number;
  /** 并发上传分片数，默认 3 */
  concurrency?: number;
  /** 失败重试次数，默认 5 */
  maxRetries?: number;
  /** 重试间隔（毫秒），默认 2000 */
  retryInterval?: number;
  /** 进度回调 */
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * 上传进度信息
 */
export interface UploadProgress {
  /** 已上传分片数 */
  uploadedChunks: number;
  /** 总分片数 */
  totalChunks: number;
  /** 上传百分比 (0-100) */
  percentage: number;
  /** 当前状态：calculating | uploading | merging | done | error */
  status: 'calculating' | 'uploading' | 'merging' | 'done' | 'error';
  /** 错误信息 */
  error?: string;
}

/**
 * 上传结果
 */
export interface UploadResult {
  /** 文件唯一标识（MD5） */
  fileHash: string;
  /** 文件路径（后端返回） */
  filePath?: string;
  /** 数据库记录ID */
  recordId?: number;
}

/**
 * 断点续传上传管理器
 * 适用于弱网环境下的文件上传
 */
export class ResumableUploader {
  private chunkSize: number;
  private concurrency: number;
  private maxRetries: number;
  private retryInterval: number;
  private onProgress?: (progress: UploadProgress) => void;

  constructor(options: ResumableUploadOptions = {}) {
    this.chunkSize = options.chunkSize ?? 2 * 1024 * 1024; // 2MB
    this.concurrency = options.concurrency ?? 3;
    this.maxRetries = options.maxRetries ?? 5;
    this.retryInterval = options.retryInterval ?? 2000;
    this.onProgress = options.onProgress;
  }

  /**
   * 计算文件 MD5
   * 使用异步分块计算，避免阻塞主线程
   */
  private async calculateMD5(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer();
      const reader = new FileReader();
      let currentChunk = 0;
      const chunks = Math.ceil(file.size / this.chunkSize);

      this.reportProgress({
        uploadedChunks: 0,
        totalChunks: chunks,
        percentage: 0,
        status: 'calculating',
      });

      const loadNext = (start: number) => {
        const end = Math.min(start + this.chunkSize, file.size);
        reader.readAsArrayBuffer(file.slice(start, end));
      };

      reader.onload = (e) => {
        const result = e.target?.result;
        if (result instanceof ArrayBuffer) {
          spark.append(result);
        }
        currentChunk++;

        // 更新计算进度
        this.reportProgress({
          uploadedChunks: currentChunk,
          totalChunks: chunks,
          percentage: Math.round((currentChunk / chunks) * 30),
          status: 'calculating',
        });

        if (currentChunk < chunks) {
          // 使用 setTimeout 让主线程有机会更新UI，避免卡顿
          // 延迟 10ms 确保 UI 有足够时间渲染
          setTimeout(() => {
            loadNext(currentChunk * this.chunkSize);
          }, 10);
        } else {
          resolve(spark.end());
        }
      };

      reader.onerror = () => reject(new Error('文件读取失败'));
      
      // 延迟启动，让UI先渲染
      setTimeout(() => {
        loadNext(0);
      }, 100);
    });
  }

  /**
   * 将文件分割为分片
   */
  private splitFile(file: File): Blob[] {
    const chunks: Blob[] = [];
    let start = 0;
    while (start < file.size) {
      const end = Math.min(start + this.chunkSize, file.size);
      chunks.push(file.slice(start, end));
      start = end;
    }
    return chunks;
  }

  /**
   * 上传单个分片（带重试）
   */
  private async uploadChunk(
    apiBase: string,
    token: string,
    fileHash: string,
    fileName: string,
    chunkIndex: number,
    totalChunks: number,
    chunk: Blob,
  ): Promise<void> {
    let retries = 0;

    while (retries <= this.maxRetries) {
      try {
        const formData = new FormData();
        formData.append('fileHash', fileHash);
        formData.append('fileName', fileName);
        formData.append('chunkIndex', String(chunkIndex));
        formData.append('totalChunks', String(totalChunks));
        formData.append('chunk', chunk);

        await $fetch(`${apiBase}/files/upload-chunk`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 60000, // 60秒超时
        });

        return; // 成功
      } catch (error: any) {
        retries++;
        if (retries > this.maxRetries) {
          throw new Error(`分片 ${chunkIndex} 上传失败，已重试 ${this.maxRetries} 次`);
        }

        // 指数退避重试
        const delay = this.retryInterval * Math.pow(2, retries - 1);
        await this.sleep(delay);
      }
    }
  }

  /**
   * 上传所有分片（并发控制）
   */
  private async uploadAllChunks(
    apiBase: string,
    token: string,
    fileHash: string,
    fileName: string,
    chunks: Blob[],
  ): Promise<void> {
    const totalChunks = chunks.length;
    let uploadedCount = 0;

    // 并发上传分片
    const uploadQueue = async () => {
      while (uploadedCount < totalChunks) {
        const currentIndex = uploadedCount;
        uploadedCount++;

        this.reportProgress({
          uploadedChunks: currentIndex + 1,
          totalChunks,
          percentage: 30 + Math.round(((currentIndex + 1) / totalChunks) * 60), // 上传阶段占 60%
          status: 'uploading',
        });

        await this.uploadChunk(
          apiBase,
          token,
          fileHash,
          fileName,
          currentIndex,
          totalChunks,
          chunks[currentIndex],
        );
      }
    };

    // 创建并发任务
    const tasks = Array.from({ length: Math.min(this.concurrency, totalChunks) }, () => uploadQueue());
    await Promise.all(tasks);
  }

  /**
   * 通知后端合并分片
   */
  private async mergeChunks(
    apiBase: string,
    token: string,
    fileHash: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    description?: string,
    category?: string,
    visibility?: 'public' | 'private',
  ): Promise<{ filePath: string; recordId: number }> {
    this.reportProgress({
      uploadedChunks: 0,
      totalChunks: 0,
      percentage: 95,
      status: 'merging',
    });

    const result = await $fetch(`${apiBase}/files/merge-chunks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: {
        fileHash,
        fileName,
        fileSize,
        fileType,
        description,
        category,
        visibility,
      },
      timeout: 30000,
    }) as any;

    return {
      filePath: result.filePath,
      recordId: result.recordId,
    };
  }

  /**
   * 检查是否已上传（断点续传）
   */
  private async checkUploaded(
    apiBase: string,
    token: string,
    fileHash: string,
  ): Promise<{ uploaded: boolean; uploadedChunks?: number[] }> {
    try {
      const result = await $fetch(`${apiBase}/files/check-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: { fileHash },
      }) as any;

      return {
        uploaded: result.uploaded,
        uploadedChunks: result.uploadedChunks || [],
      };
    } catch {
      return { uploaded: false, uploadedChunks: [] };
    }
  }

  /**
   * 执行上传
   */
  async upload(
    file: File,
    apiBase: string,
    token: string,
    metadata: {
      description?: string;
      category?: string;
      visibility?: 'public' | 'private';
    } = {},
  ): Promise<UploadResult> {
    // 1. 计算文件 MD5
    const fileHash = await this.calculateMD5(file);

    // 2. 检查是否已上传（秒传/断点续传）
    const checkResult = await this.checkUploaded(apiBase, token, fileHash);

    if (checkResult.uploaded && (!checkResult.uploadedChunks || checkResult.uploadedChunks.length === 0)) {
      // 文件已完整上传，直接返回
      this.reportProgress({
        uploadedChunks: 0,
        totalChunks: 0,
        percentage: 100,
        status: 'done',
      });

      return { fileHash };
    }

    // 3. 分割文件
    const chunks = this.splitFile(file);

    // 4. 过滤已上传的分片（断点续传）
    let chunksToUpload = chunks;
    if (checkResult.uploadedChunks && checkResult.uploadedChunks.length > 0) {
      chunksToUpload = chunks.filter((_, index) => !checkResult.uploadedChunks!.includes(index));
    }

    // 5. 上传分片
    let uploadedCount = checkResult.uploadedChunks?.length || 0;
    const totalChunks = chunks.length;

    for (let i = 0; i < chunksToUpload.length; i++) {
      const actualIndex = chunks.indexOf(chunksToUpload[i]);
      await this.uploadChunk(
        apiBase,
        token,
        fileHash,
        file.name,
        actualIndex,
        totalChunks,
        chunksToUpload[i],
      );

      uploadedCount++;
      this.reportProgress({
        uploadedChunks: uploadedCount,
        totalChunks,
        percentage: 30 + Math.round((uploadedCount / totalChunks) * 60),
        status: 'uploading',
      });
    }

    // 6. 合并分片
    const mergeResult = await this.mergeChunks(
      apiBase,
      token,
      fileHash,
      file.name,
      file.size,
      file.name.split('.').pop()?.toLowerCase() || '',
      metadata.description,
      metadata.category,
      metadata.visibility,
    );

    this.reportProgress({
      uploadedChunks: totalChunks,
      totalChunks,
      percentage: 100,
      status: 'done',
    });

    return {
      fileHash,
      filePath: mergeResult.filePath,
      recordId: mergeResult.recordId,
    };
  }

  /**
   * 报告进度
   */
  private reportProgress(progress: UploadProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * 休眠辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建断点续传上传实例
 * 注意：options 在每次 upload 调用时生效，不是创建时固定
 */
export function useResumableUpload(options?: ResumableUploadOptions) {
  const progress = ref<UploadProgress>({
    uploadedChunks: 0,
    totalChunks: 0,
    percentage: 0,
    status: 'calculating',
  });

  const upload = async (
    file: File,
    apiBase: string,
    token: string,
    metadata?: { description?: string; category?: string; visibility?: 'public' | 'private' },
    uploadOptions?: ResumableUploadOptions,
  ): Promise<UploadResult> => {
    progress.value = {
      uploadedChunks: 0,
      totalChunks: 0,
      percentage: 0,
      status: 'calculating',
    };

    // 合并默认 options 和每次上传的 options
    const finalOptions = {
      ...options,
      ...uploadOptions,
      onProgress: (p: UploadProgress) => {
        progress.value = p;
      },
    };

    const uploader = new ResumableUploader(finalOptions);
    return uploader.upload(file, apiBase, token, metadata);
  };

  return {
    progress,
    upload,
  };
}
