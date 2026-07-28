import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile, Request, Headers } from '@nestjs/common';
import { ChunkUploadService } from './chunk-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserId, UserTeam } from '../auth/user.decorator';
import { TeamCode, UserRole } from '@prisma/client';
import { extname } from 'path';
import { randomUUID } from 'crypto';

const ALL_ROLES = [
  UserRole.ship_political_instructor,
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
] as const;

// Multer文件对象类型定义
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

/**
 * 分片上传控制器
 * 支持断点续传、秒传、分片合并、文件校验
 */
@Controller('files')
@UseGuards(JwtAuthGuard)
export class ChunkUploadController {
  constructor(private readonly chunkUploadService: ChunkUploadService) {}

  /**
   * 检查文件是否已上传（秒传/断点续传）
   */
  @Post('check-upload')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async checkUpload(
    @Body('fileHash') fileHash: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.chunkUploadService.checkUpload(fileHash, userId, teamCode);
  }

  /**
   * 上传分片
   */
  @Post('upload-chunk')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  @UseInterceptors(
    FileInterceptor('chunk', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 单片最大 10MB
    }),
  )
  async uploadChunk(
    @UploadedFile() chunkFile: MulterFile,
    @Body('fileHash') fileHash: string,
    @Body('fileName') fileName: string,
    @Body('chunkIndex') chunkIndex: string,
    @Body('totalChunks') totalChunks: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.chunkUploadService.saveChunk(
      chunkFile,
      {
        fileHash,
        fileName,
        chunkIndex: parseInt(chunkIndex, 10),
        totalChunks: parseInt(totalChunks, 10),
      },
      userId,
      teamCode,
    );
  }

  /**
   * 合并分片并创建文件记录
   */
  @Post('merge-chunks')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async mergeChunks(
    @Body() body: {
      fileHash: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      description?: string;
      category?: string;
      visibility?: 'public' | 'private';
    },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.chunkUploadService.mergeChunks(
      body,
      userId,
      teamCode,
      this.getClientIp(req),
      userAgent,
    );
  }

  private getClientIp(req: any): string {
    return req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';
  }
}
