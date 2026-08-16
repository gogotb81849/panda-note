// ============================================================
// 政工笔 · AI 写作系统 - Controller
// Sprint 1: 接口骨架 + 复用 AiDashboardReport 的豆包 API 调用模式
// ============================================================
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UsePipes, ValidationPipe, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, UserPayload } from '../auth/user.decorator';
import { TeamCode } from '@prisma/client';
import { AiManuscriptService } from './ai-manuscript.service';
import { GenerateManuscriptDto, ScoreOnlyDto, DeaiOnlyDto, SaveRevisionRecordDto } from './dto/generate-manuscript.dto';
import { Logger } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('ai-manuscript')
export class AiManuscriptController {
  private readonly logger = new Logger(AiManuscriptController.name);

  constructor(private readonly service: AiManuscriptService) {}

  // ============================================================
  // 核心生成接口（Step 8 → 生成初稿 → 去 AI 化 → 评分）
  // ============================================================
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 1 分钟 5 次，防刷
  @Post('generate')
  async generate(
    @User() user: UserPayload,
    @Body() dto: GenerateManuscriptDto,
    @Req() req: any,
  ) {
    this.logger.log(`[user=${user.id}] 开始生成政工笔稿件 category=${dto.categoryId} wordCount=${dto.preference.wordCount}`);
    return this.service.generate(dto, user, req.teamCode as TeamCode);
  }

  // ============================================================
  // 子能力：单独跑去 AI 化（调滑杆后前端直接调用重算）
  // ============================================================
  @Post('deai')
  async deaiOnly(@User() user: UserPayload, @Body() dto: DeaiOnlyDto) {
    this.logger.debug(`[user=${user.id}] 单独去 AI 化 strength=${dto.deaiStrength} textLen=${dto.articleText.length}`);
    return this.service.runDeAiEngine(dto.articleText, dto.deaiStrength);
  }

  // ============================================================
  // 子能力：单独跑 100 分质量评分
  // ============================================================
  @Post('score')
  async scoreOnly(@User() user: UserPayload, @Body() dto: ScoreOnlyDto) {
    this.logger.debug(`[user=${user.id}] 单独评分 textLen=${dto.articleText.length}`);
    return this.service.runQualityScoring(dto.articleText, dto.deaiStrength);
  }

  // ============================================================
  // 范文库 CRUD（Sprint 1 骨架实现）
  // ============================================================
  @Get('templates')
  async listTemplates(
    @User() user: UserPayload,
    @Req() req: any,
    @Query('category') category?: string,
    @Query('topic') topic?: string,
    @Query('scope') scope: 'all' | 'global' | 'personal' = 'all',
  ) {
    return this.service.listTemplates(req.teamCode as TeamCode, user.id, scope, category, topic);
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string, @User() user: UserPayload, @Req() req: any) {
    return this.service.getTemplate(parseInt(id), req.teamCode as TeamCode, user.id);
  }

  @Patch('templates/:id/tags')
  async patchTemplateTags(
    @Param('id') id: string,
    @Body('tags') tags: Array<{ tagName: string; tagCategory: string }>,
    @User() user: UserPayload, @Req() req: any,
  ) {
    return this.service.patchTemplateTags(parseInt(id), tags, req.teamCode as TeamCode, user.id, req.user?.roles);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string, @User() user: UserPayload, @Req() req: any) {
    return this.service.deleteTemplate(parseInt(id), req.teamCode as TeamCode, user.id, req.user?.roles);
  }

  // ============================================================
  // 范文批量上传入口（触发异步 BullMQ job · Sprint 1 骨架）
  // ============================================================
  @Post('templates/upload')
  @UseInterceptors(/* Sprint 2 接文件上传：FileInterceptor('file', { limits: { fileSize: 20*1024*1024 } }) */)
  async uploadTemplate(
    @User() user: UserPayload,
    @Req() req: any,
    @UploadedFile() file: any,
  ) {
    // Sprint 1: 占位，返回 jobId (Sprint2 接入 mammoth/pdfjs + BullMQ)
    if (!file) throw new BadRequestException('请上传 .docx / .pdf 文件（Sprint 2 接入真实解析）');
    return {
      jobId: `mock-analyze-${Date.now()}`,
      message: 'Sprint 2 实现：mammoth/pdfjs 抽取 → AI 自动打 6 类标签 + 200 字摘要 + 集团匹配度评分 → tsvector 入库',
      user: user.id,
      teamCode: req.teamCode as TeamCode,
    };
  }

  @Get('templates/analyze-job/:jobId')
  async getAnalyzeJob(@Param('jobId') jobId: string) {
    return { jobId, status: 'pending', progress: 0, message: 'Sprint 2 实现 BullMQ 异步队列进度查询' };
  }

  // ============================================================
  // 历史稿件库（Sprint 2 实现）
  // ============================================================
  @SkipThrottle()
  @Get('history')
  async history(@User() user: UserPayload) {
    return { total: 0, items: [], message: 'Sprint 2 实现：保存用户每次生成的字段 + prompt + 结果，可复用/对比' };
  }

  // ============================================================
  // 🧩 自我优化闭环 ① 保存一次修改记录
  // 触发时机：前端点「导出 Word」「存草稿」「跳过引导直接下载」时都会调一次
  // ============================================================
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('revision-record/save')
  async saveRevisionRecord(
    @User() user: UserPayload,
    @Body() dto: SaveRevisionRecordDto,
    @Req() req: any,
  ) {
    this.logger.log(`[user=${user.id}] 保存修改记录 category=${dto.manuscriptCategory} frontValidEdits=${dto.frontendValidEditCount}`);
    return this.service.saveRevisionRecord(dto, user, req.teamCode as TeamCode);
  }

  // ============================================================
  // 🧩 自我优化闭环 ② 查询政委个人写作画像（画像看板直接消费）
  // ============================================================
  @SkipThrottle()
  @Get('user-profile')
  async getUserProfile(@User() user: UserPayload, @Req() req: any) {
    this.logger.debug(`[user=${user.id}] 查询个人写作画像`);
    return this.service.getUserProfile(user.id, req.teamCode as TeamCode);
  }
}
