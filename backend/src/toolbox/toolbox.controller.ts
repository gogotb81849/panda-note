import { Controller, Post, Body, UseGuards, Request, Headers, Get, Query } from '@nestjs/common';
import { ToolboxService } from './toolbox.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId, UserTeam } from '../auth/user.decorator';
import { TeamCode } from '@prisma/client';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync, writeFileSync } from 'fs';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

interface CompressionResult {
  result: string; // base64 encoded PDF buffer
  method: 'image' | 'adobe' | 'original';
  compressionRate: string;
  originalSize: number;
  compressedSize: number;
}

interface ImageCompressionResult {
  result: string; // base64 encoded image buffer
  method: string;
  compressionRate: string;
  originalSize: number;
  compressedSize: number;
}

@Controller('toolbox')
@UseGuards(JwtAuthGuard)
export class ToolboxController {
  constructor(
    private readonly toolboxService: ToolboxService,
  ) {}

  /**
   * PDF智能双轨压缩
   * 自动选择最优压缩方式
   */
  @Post('compress/pdf')
  async compressPdf(
    @Body() body: { fileName: string; pdfBase64: string },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ): Promise<CompressionResult> {
    const { fileName, pdfBase64 } = body;
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const result = await this.toolboxService.smartDualCompress(pdfBuffer);

    // 记录压缩日志
    await this.toolboxService.logCompression({
      userId,
      fileName,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      method: result.method,
      compressionRate: result.compressionRate,
      teamCode,
    });

    return result;
  }

  /**
   * 图片压缩
   */
  @Post('compress/image')
  async compressImage(
    @Body() body: { fileName: string; imageBase64: string; quality?: number; maxWidth?: number },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ): Promise<ImageCompressionResult> {
    const { fileName, imageBase64, quality = 80, maxWidth = 1920 } = body;
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const result = await this.toolboxService.compressImage(imageBuffer, { quality, maxWidth });

    // 记录压缩日志
    await this.toolboxService.logCompression({
      userId,
      fileName,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      method: result.method,
      compressionRate: result.compressionRate,
      teamCode,
    });

    return result;
  }
}
