import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, createReadStream, createWriteStream, statSync, unlinkSync, renameSync } from 'fs';
import * as crypto from 'crypto';

// 分片临时存储目录
const CHUNK_UPLOADS_DIR = join(process.cwd(), 'uploads', 'chunks');
const FINAL_UPLOADS_DIR = join(process.cwd(), 'uploads');

// 缓存过期时间（7天）
const CACHE_EXPIRY_DAYS = 7;

interface ChunkUploadMeta {
  fileHash: string;
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
}

interface MergeChunkBody {
  fileHash: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  description?: string;
  category?: string;
  visibility?: 'public' | 'private';
}

@Injectable()
export class ChunkUploadService {
  private readonly logger = new Logger(ChunkUploadService.name);

  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {
    // 确保分片目录存在
    if (!existsSync(CHUNK_UPLOADS_DIR)) {
      mkdirSync(CHUNK_UPLOADS_DIR, { recursive: true });
    }
  }

  /**
   * 获取分片存储配置
   */
  getChunkStorage() {
    return diskStorage({
      destination: CHUNK_UPLOADS_DIR,
      filename: (req, file, cb) => {
        const uniqueName = `${randomUUID()}.chunk`;
        cb(null, uniqueName);
      },
    });
  }

  /**
   * 检查文件是否已上传
   * 返回秒传信息或已上传的分片列表（断点续传）
   */
  async checkUpload(fileHash: string, userId: number, teamCode: TeamCode) {
    // 1. 查找是否有已完成的相同文件（秒传）
    const completedCache = await this.prisma.chunkUploadCache.findFirst({
      where: {
        fileHash,
        teamCode,
        status: 'completed',
        expiresAt: { gt: new Date() },
      },
    });

    if (completedCache) {
      return {
        uploaded: true,
        uploadedChunks: [], // 空数组表示完整上传，可以直接使用
        cacheId: completedCache.id,
        message: '文件秒传',
      };
    }

    // 2. 查找上传中的缓存（断点续传）
    const uploadingCache = await this.prisma.chunkUploadCache.findFirst({
      where: {
        fileHash,
        teamCode,
        userId,
        status: 'uploading',
        expiresAt: { gt: new Date() },
      },
    });

    if (uploadingCache) {
      return {
        uploaded: false,
        uploadedChunks: uploadingCache.uploadedChunks as number[],
        cacheId: uploadingCache.id,
        totalChunks: uploadingCache.totalChunks,
        message: '找到未完成上传，支持断点续传',
      };
    }

    return {
      uploaded: false,
      uploadedChunks: [],
      message: '文件未上传',
    };
  }

  /**
   * 保存上传的分片
   */
  async saveChunk(
    chunkFile: any,
    meta: ChunkUploadMeta,
    userId: number,
    teamCode: TeamCode,
  ) {
    const { fileHash, fileName, chunkIndex, totalChunks } = meta;

    try {
      // 查找或创建缓存记录
      let cache = await this.prisma.chunkUploadCache.findFirst({
        where: {
          fileHash,
          teamCode,
          userId,
          status: 'uploading',
          expiresAt: { gt: new Date() },
        },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + CACHE_EXPIRY_DAYS);

      if (!cache) {
        // 创建新的缓存记录
        const tempDir = join(CHUNK_UPLOADS_DIR, fileHash);
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }

        cache = await this.prisma.chunkUploadCache.create({
          data: {
            fileHash,
            fileName,
            fileSize: 0, // 将在合并时更新
            totalChunks,
            uploadedChunks: [],
            tempPath: tempDir,
            userId,
            teamCode,
            status: 'uploading',
            expiresAt,
          },
        });
      }

      // 将分片移动到对应目录
      const chunkDir = join(CHUNK_UPLOADS_DIR, fileHash);
      if (!existsSync(chunkDir)) {
        mkdirSync(chunkDir, { recursive: true });
      }

      const chunkPath = join(chunkDir, `chunk_${chunkIndex}`);
      renameSync(chunkFile.path, chunkPath);

      // 更新已上传分片列表
      const uploadedChunks = (cache.uploadedChunks as number[]) || [];
      if (!uploadedChunks.includes(chunkIndex)) {
        uploadedChunks.push(chunkIndex);
      }

      await this.prisma.chunkUploadCache.update({
        where: { id: cache.id },
        data: {
          uploadedChunks,
          expiresAt,
        },
      });

      return {
        success: true,
        chunkIndex,
        uploadedCount: uploadedChunks.length,
        totalChunks,
      };
    } catch (error) {
      // 清理临时文件
      if (chunkFile.path && existsSync(chunkFile.path)) {
        try { unlinkSync(chunkFile.path); } catch (_) {}
      }
      this.logger.error('保存分片失败', error);
      throw new InternalServerErrorException('保存分片失败');
    }
  }

  /**
   * 合并分片并创建文件记录
   */
  async mergeChunks(
    body: MergeChunkBody,
    userId: number,
    teamCode: TeamCode,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { fileHash, fileName, fileSize, fileType, description, category, visibility } = body;

    // 查找缓存记录
    const cache = await this.prisma.chunkUploadCache.findFirst({
      where: {
        fileHash,
        teamCode,
        userId,
        status: 'uploading',
        expiresAt: { gt: new Date() },
      },
    });

    if (!cache) {
      throw new BadRequestException('未找到上传缓存，请重新上传');
    }

    const uploadedChunks = (cache.uploadedChunks as number[]) || [];
    if (uploadedChunks.length < cache.totalChunks) {
      throw new BadRequestException(`分片未全部上传，已上传 ${uploadedChunks.length}/${cache.totalChunks}`);
    }

    // 更新状态为合并中
    await this.prisma.chunkUploadCache.update({
      where: { id: cache.id },
      data: { status: 'merging' },
    });

    try {
      // 合并分片
      const finalFileName = `${randomUUID()}${extname(fileName)}`;
      const finalPath = join(FINAL_UPLOADS_DIR, finalFileName);
      const chunkDir = join(CHUNK_UPLOADS_DIR, fileHash);

      // 按顺序合并分片
      const writeStream = createWriteStream(finalPath);

      for (let i = 0; i < cache.totalChunks; i++) {
        const chunkPath = join(chunkDir, `chunk_${i}`);
        if (!existsSync(chunkPath)) {
          throw new BadRequestException(`分片 ${i} 不存在`);
        }

        await this.pipeChunk(chunkPath, writeStream);
      }

      writeStream.end();

      // 验证合并后的文件大小
      const stats = statSync(finalPath);
      if (stats.size !== fileSize) {
        // 清理合并文件
        if (existsSync(finalPath)) {
          unlinkSync(finalPath);
        }
        throw new BadRequestException('文件合并校验失败，大小不匹配');
      }

      // 计算合并文件的 MD5（校验）
      const mergedHash = await this.calculateFileHash(finalPath);
      if (mergedHash !== fileHash) {
        if (existsSync(finalPath)) {
          unlinkSync(finalPath);
        }
        throw new BadRequestException('文件校验失败，请重新上传');
      }

      // 创建文件记录
      const relativePath = `uploads/${finalFileName}`;
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

      const fileRecord = await this.prisma.sharedFile.create({
        data: {
          fileName,
          originalName: fileName,
          filePath: relativePath,
          fileSize,
          fileType: `.${fileExtension}`,
          description: description || null,
          category: category || null,
          uploadedBy: userId,
          teamCode,
          isPublic: visibility !== 'private',
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      });

      // 更新缓存状态为已完成
      await this.prisma.chunkUploadCache.update({
        where: { id: cache.id },
        data: {
          status: 'completed',
          fileSize,
        },
      });

      // 清理分片目录
      this.cleanupChunkDir(chunkDir);

      // 记录操作日志
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: 'upload',
        operationContent: `上传文件（分片）：${fileName}`,
        ipAddress,
        userAgent,
      });

      return {
        success: true,
        filePath: relativePath,
        recordId: fileRecord.id,
        fileName: fileRecord.fileName,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('合并分片失败', error);
      throw new InternalServerErrorException('合并分片失败');
    }
  }

  /**
   * 将分片内容写入输出流
   */
  private pipeChunk(chunkPath: string, writeStream: ReturnType<typeof createWriteStream>): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(chunkPath);
      readStream.pipe(writeStream, { end: false });
      readStream.on('end', () => resolve());
      readStream.on('error', reject);
      writeStream.on('error', reject);
    });
  }

  /**
   * 计算文件 MD5
   */
  private calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 清理分片目录
   */
  private cleanupChunkDir(dirPath: string) {
    if (!existsSync(dirPath)) return;

    try {
      const files = require('fs').readdirSync(dirPath);
      for (const file of files) {
        const filePath = join(dirPath, file);
        unlinkSync(filePath);
      }
      require('fs').rmdirSync(dirPath);
    } catch (error) {
      this.logger.warn('清理分片目录失败', error);
    }
  }
}
