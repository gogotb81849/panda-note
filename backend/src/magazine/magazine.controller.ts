import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { UserPayload } from '../auth/user.decorator';
import { MagazineService } from './magazine.service';
import { MagazineVersionService } from './version.service';
import { ArticleParserService } from './article-parser.service';
import { ClassificationResult } from './ai-magazine.service';
import { AITextService, CheckResult, PolishResult, ExpandResult, CondenseResult, RewriteResult, TitleSuggestionResult } from './ai-text.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

@Controller('magazine')
@UseGuards(JwtAuthGuard)
export class MagazineController {
  constructor(
    private magazineService: MagazineService,
    private versionService: MagazineVersionService,
    private parser: ArticleParserService,
    private aiTextService: AITextService,
  ) {}

  /**
   * 获取杂志模板列表
   */
  @Get('templates')
  async getTemplates() {
    return this.magazineService.getTemplates();
  }

  /**
   * 获取杂志列表
   */
  @Get()
  async getMagazines(@User() user: UserPayload) {
    return this.magazineService.getMagazines(user.teamCode);
  }

  /**
   * 获取杂志详情
   */
  @Get(':id')
  async getMagazine(@Param('id') id: string) {
    return this.magazineService.getMagazine(id);
  }

  /**
   * 创建杂志
   */
  @Post()
  async createMagazine(
    @User() user: UserPayload,
    @Body() body: {
      title: string;
      description?: string;
      templateId?: string;
      totalPages?: number;
      sections?: { name: string; description?: string }[];
    },
  ) {
    return this.magazineService.createMagazine({
      name: body.title,
      templateId: body.templateId || 'business-classic',
      totalPages: body.totalPages || 8,
      teamCode: user.teamCode,
    });
  }

  /**
   * 更新杂志
   */
  @Put(':id')
  async updateMagazine(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; templateId?: string; totalPages?: number },
  ) {
    return this.magazineService.updateMagazine(id, {
      name: body.title,
      templateId: body.templateId,
      totalPages: body.totalPages,
    });
  }

  /**
   * 删除杂志
   */
  @Delete(':id')
  async deleteMagazine(@Param('id') id: string) {
    return this.magazineService.deleteMagazine(id);
  }

  // ==================== 版块管理 ====================

  /**
   * 创建版块
   */
  @Post(':id/sections')
  async createSection(
    @Param('id') id: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.magazineService.createSection(id, body);
  }

  /**
   * 更新版块
   */
  @Put(':id/sections/:sectionId')
  async updateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { name?: string; description?: string; order?: number; layout?: 'single-column' | 'two-column' | 'three-column' },
  ) {
    return this.magazineService.updateSection(id, sectionId, body);
  }

  /**
   * 删除版块
   */
  @Delete(':id/sections/:sectionId')
  async deleteSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.magazineService.deleteSection(id, sectionId);
  }

  /**
   * 生成PDF
   */
  @Post(':id/generate-pdf')
  async generatePdf(@Param('id') id: string) {
    const buffer = await this.magazineService.generatePdf(id);
    return buffer.toString('base64');
  }

  // ==================== 文章管理 ====================

  /**
   * 创建文章
   */
  @Post('sections/:sectionId/articles')
  async createArticle(
    @Param('sectionId') sectionId: string,
    @Body() body: {
      title: string;
      content: string;
      summary?: string;
      author?: string;
    },
  ) {
    return this.magazineService.createArticle({
      ...body,
      sectionId,
    });
  }

  /**
   * 更新文章
   */
  @Put(':id/articles/:articleId')
  async updateArticle(
    @Param('id') id: string,
    @Param('articleId') articleId: string,
    @Body() body: {
      title?: string;
      content?: string;
      summary?: string;
      author?: string;
      sectionId?: string;
    },
  ) {
    return this.magazineService.updateArticle(id, articleId, body);
  }

  /**
   * 删除文章
   */
  @Delete(':id/articles/:articleId')
  async deleteArticle(@Param('id') id: string, @Param('articleId') articleId: string) {
    return this.magazineService.deleteArticle(id, articleId);
  }

  /**
   * 将文章分配到版块
   */
  @Post('articles/:articleId/assign')
  async assignArticleToSection(
    @Param('articleId') articleId: string,
    @Body() body: { sectionId: string },
  ) {
    return this.magazineService.assignArticleToSection(articleId, body.sectionId);
  }

  // ==================== AI分类功能 ====================

  /**
   * AI分类建议（不带缓存）
   */
  @Post(':id/articles/classify')
  async classifyArticles(@Param('id') id: string): Promise<ClassificationResult[]> {
    return this.magazineService.classifyArticles(id);
  }

  /**
   * 获取分类建议（带缓存，5分钟）
   */
  @Get(':id/articles/suggestions')
  async getSuggestions(@Param('id') id: string): Promise<ClassificationResult[]> {
    return this.magazineService.getClassificationSuggestions(id);
  }

  /**
   * AI自动分配
   */
  @Post(':id/articles/auto-allocate')
  async autoAllocateArticles(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    await this.magazineService.autoAllocateArticles(id);
    return { success: true, message: 'AI自动分配完成' };
  }

  /**
   * 获取单篇文章的AI分类建议
   */
  @Get('articles/:articleId/suggestion')
  async getArticleSuggestion(@Param('articleId') articleId: string) {
    return this.magazineService.getArticleSuggestion(articleId);
  }

  /**
   * 批量导入文章
   */
  @Post('sections/:sectionId/articles/import')
  async importArticles(
    @Param('sectionId') sectionId: string,
    @Body() body: {
      articles: { title: string; content: string; summary?: string; author?: string }[];
    },
  ) {
    return this.magazineService.importArticles(sectionId, body.articles);
  }

  // ==================== 文件导入功能 ====================

  /**
   * 导入文章（支持多种格式）
   */
  @Post(':id/articles/import')
  @UseInterceptors(FileInterceptor('file'))
  async importArticle(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    let result;
    if (ext === '.docx' || ext === '.doc') {
      result = await this.parser.parseWord(file.buffer);
    } else if (ext === '.md' || ext === '.markdown') {
      result = await this.parser.parseMarkdown(file.buffer.toString('utf-8'));
    } else if (ext === '.txt') {
      result = await this.parser.parseTxt(file.buffer.toString('utf-8'));
    } else {
      throw new BadRequestException('不支持的文件格式');
    }
    
    // 获取杂志的第一个版块或默认版块
    const magazine = await this.magazineService.getMagazine(id);
    const sectionId = magazine.sections?.[0]?.id;
    
    if (!sectionId) {
      throw new BadRequestException('杂志没有可用的版块');
    }
    
    // 创建文章
    return this.magazineService.createArticle({
      sectionId,
      title: result.title,
      content: result.content,
      summary: result.plainText.substring(0, 200),
      images: result.images,
      author: result.author,
    });
  }

  /**
   * 批量导入文章
   */
  @Post(':id/articles/batch-import')
  @UseInterceptors(FilesInterceptor('files'))
  async batchImportArticles(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // 获取杂志的第一个版块或默认版块
    const magazine = await this.magazineService.getMagazine(id);
    const sectionId = magazine.sections?.[0]?.id;
    
    if (!sectionId) {
      throw new BadRequestException('杂志没有可用的版块');
    }
    
    const results = [];
    for (const file of files) {
      try {
        const ext = path.extname(file.originalname).toLowerCase();
        
        let result;
        if (ext === '.docx' || ext === '.doc') {
          result = await this.parser.parseWord(file.buffer);
        } else if (ext === '.md' || ext === '.markdown') {
          result = await this.parser.parseMarkdown(file.buffer.toString('utf-8'));
        } else if (ext === '.txt') {
          result = await this.parser.parseTxt(file.buffer.toString('utf-8'));
        } else {
          results.push({ success: false, file: file.originalname, error: '不支持的文件格式' });
          continue;
        }
        
        const article = await this.magazineService.createArticle({
          sectionId,
          title: result.title,
          content: result.content,
          summary: result.plainText.substring(0, 200),
          images: result.images,
          author: result.author,
        });
        
        results.push({ success: true, file: file.originalname, article });
      } catch (e) {
        results.push({ success: false, file: file.originalname, error: e.message });
      }
    }
    return results;
  }

  // ==================== 版本历史管理 ====================

  /**
   * 创建版本快照
   */
  @Post(':id/versions')
  async createVersion(
    @Param('id') id: string,
    @User() user: UserPayload,
    @Body() body: { description?: string },
  ) {
    return this.versionService.createVersion(id, user.id, body.description);
  }

  /**
   * 获取版本列表
   */
  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    return this.versionService.getVersionList(id);
  }

  /**
   * 获取版本详情
   */
  @Get(':id/versions/:versionId')
  async getVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionService.getVersion(versionId);
  }

  /**
   * 恢复版本
   */
  @Post(':id/versions/:versionId/restore')
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @User() user: UserPayload,
  ) {
    return this.versionService.restoreVersion(versionId, user.id);
  }

  /**
   * 对比两个版本
   */
  @Get(':id/versions/compare')
  async compareVersions(
    @Param('id') id: string,
    @Query('v1') v1: string,
    @Query('v2') v2: string,
  ) {
    return this.versionService.compareVersions(v1, v2);
  }

  /**
   * 自动保存
   */
  @Post(':id/autosave')
  async autoSave(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.versionService.autoSave(id, data);
  }

  /**
   * 获取自动保存
   */
  @Get(':id/autosave')
  async getAutoSave(@Param('id') id: string) {
    return this.versionService.getAutoSave(id);
  }

  /**
   * 删除自动保存
   */
  @Delete(':id/autosave')
  async deleteAutoSave(@Param('id') id: string) {
    return this.versionService.deleteAutoSave(id);
  }

  // ==================== AI文字处理功能 ====================

  /**
   * AI文字纠错
   */
  @Post('ai/check')
  async checkText(@Body() dto: { text: string }): Promise<CheckResult> {
    return this.aiTextService.checkText(dto.text);
  }

  /**
   * AI文字润色
   */
  @Post('ai/polish')
  async polishText(@Body() dto: { text: string }): Promise<PolishResult> {
    return this.aiTextService.polishText(dto.text);
  }

  /**
   * AI文字扩写
   */
  @Post('ai/expand')
  async expandText(@Body() dto: { text: string; targetLength?: number }): Promise<ExpandResult> {
    return this.aiTextService.expandText(dto.text, dto.targetLength);
  }

  /**
   * AI文字缩写
   */
  @Post('ai/condense')
  async condenseText(@Body() dto: { text: string; targetLength?: number }): Promise<CondenseResult> {
    return this.aiTextService.condenseText(dto.text, dto.targetLength);
  }

  /**
   * AI文字改写
   */
  @Post('ai/rewrite')
  async rewriteText(@Body() dto: { text: string; style?: string }): Promise<RewriteResult> {
    return this.aiTextService.rewriteText(dto.text, dto.style as any);
  }

  /**
   * AI标题建议
   */
  @Post('ai/suggest-titles')
  async suggestTitles(@Body() dto: { text: string }): Promise<TitleSuggestionResult> {
    return this.aiTextService.suggestTitles(dto.text);
  }
}
