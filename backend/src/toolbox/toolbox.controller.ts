import { Controller, Post, Body, UseGuards, Request, Headers, Get, Query } from '@nestjs/common';
import { ToolboxService } from './toolbox.service';
import { ShipPlantSimpleEngineService, KnowledgeAnswer, PlanRotationResponse, SupplyDemandResponse } from './ship-plant-simple-engine.service';
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
    private readonly shipPlant: ShipPlantSimpleEngineService,
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

  // ========== 海上菜篮子（内嵌版 Node 简化引擎） ==========
  // 说明：为了让陈先生今天就看到实际效果、不用额外部署 Java/Docker/MySQL，
  // 轮作算法、产能供需、知识库问答都作为熊猫笔记后端的普通 endpoint 直接运行。
  // 将来如果要独立交付给客户部署，使用 POST /api/admin/ship-plant/export-standalone 一键导出。

  @Post('ship-plant/plan-rotation')
  async shipPlantPlanRotation(
    @Body() body: { horizonDays: number; crew: number; startDate: string; slotsSnapshot?: any[]; vegDefs?: any[] },
  ): Promise<{ success: boolean; data: PlanRotationResponse }> {
    const data = await this.shipPlant.planRotation({
      horizonDays: body.horizonDays ?? 90,
      crew: body.crew ?? 22,
      startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
      slotsSnapshot: body.slotsSnapshot,
      vegDefs: body.vegDefs,
    });
    return { success: true, data };
  }

  @Post('ship-plant/calc-supply-demand')
  async shipPlantSupplyDemand(
    @Body() body: { crew: number; today?: string; slotsSnapshot: any[] },
  ): Promise<{ success: boolean; data: SupplyDemandResponse }> {
    const data = await this.shipPlant.calcSupplyDemand({
      crew: body.crew ?? 22,
      today: body.today,
      slotsSnapshot: body.slotsSnapshot ?? [],
    });
    return { success: true, data };
  }

  @Get('ship-plant/knowledge')
  async shipPlantKnowledge(
    @Query('q') q: string,
  ): Promise<{ success: boolean; data: KnowledgeAnswer }> {
    const data = await this.shipPlant.answerKnowledge({ question: q ?? '' });
    return { success: true, data };
  }
}
