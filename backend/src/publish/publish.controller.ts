import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserId } from '../auth/user.decorator';
import { UserTeam } from '../auth/user.decorator';
import { PublishService } from './publish.service';
import { FileSummaryService } from './file-summary.service';
import { CreatePublishTemplateDto } from './dto/create-publish-template.dto';
import { UpdatePublishTemplateDto } from './dto/update-publish-template.dto';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublishController {
  constructor(
    private readonly publishService: PublishService,
    private readonly fileSummaryService: FileSummaryService,
  ) {}

  private normalizeTemplateItems(items: any[]): any[] {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item: any, index: number) => {
      let optionsArr: string[] = [];
      if (Array.isArray(item.options)) {
        optionsArr = item.options;
      } else if (Array.isArray(item.fieldOptions)) {
        optionsArr = item.fieldOptions;
      } else if (typeof item.options === 'string' && item.options) {
        try {
          const parsed = JSON.parse(item.options);
          if (Array.isArray(parsed)) optionsArr = parsed;
        } catch {
          optionsArr = item.options.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } else if (typeof item.fieldOptions === 'string' && item.fieldOptions) {
        try {
          const parsed = JSON.parse(item.fieldOptions);
          if (Array.isArray(parsed)) optionsArr = parsed;
        } catch {
          optionsArr = item.fieldOptions.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      return {
        fieldName: item.name || item.fieldName || `field_${index}`,
        fieldLabel: item.label || item.fieldLabel || '',
        fieldType: item.type || item.fieldType || 'text',
        fieldOptions: JSON.stringify(optionsArr),
        options: optionsArr,
        isRequired: item.required ?? item.isRequired ?? false,
        helpText: item.helpText || '',
        showWhen: item.showWhen || null,
        validation: item.validation || null,
        maxCount: item.maxCount || null,
        sortOrder: index,
      };
    });
  }

  private normalizeTemplate(template: any): any {
    return {
      ...template,
      templateName: template.title || '',
      description: template.templateDesc || '',
      items: this.normalizeTemplateItems(template.items),
    };
  }

  // ===== 任务类型定义 =====

  @Get('publish-task-modules')
  getTaskModules() {
    return this.publishService.getTaskModules();
  }

  @Get('publish-categories')
  getCategories(@UserTeam() teamCode: string) {
    return this.publishService.getCategories(teamCode);
  }

  // ===== Publish Template APIs =====

  @Post('publish-templates')
  create(@Body() createDto: CreatePublishTemplateDto, @UserId() userId: number) {
    return this.publishService.create(createDto, userId);
  }

  @Get('publish-templates')
  async findAll(
    @UserTeam() teamCode: string,
    @Query('templateType') templateType?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isDraft') isDraft?: string,
    @Query('isPublished') isPublished?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (templateType) filters.templateType = templateType;
    if (categoryId) filters.categoryId = parseInt(categoryId, 10);
    if (isDraft !== undefined) filters.isDraft = isDraft === 'true';
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
    if (search) filters.search = search;
    const templates = await this.publishService.findAll(teamCode, filters);
    return templates.map((template: any) => this.normalizeTemplate(template));
  }

  @Get('publish-templates/:id')
  async findOne(@Param('id', ParseIntPipe) id: number, @UserTeam() teamCode: string) {
    const template = await this.publishService.findOne(id, teamCode);
    return this.normalizeTemplate(template);
  }

  @Put('publish-templates/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @UserTeam() teamCode: string,
    @Body() updateDto: UpdatePublishTemplateDto,
  ) {
    return this.publishService.update(id, teamCode, updateDto);
  }

  @Delete('publish-templates/:id')
  remove(@Param('id', ParseIntPipe) id: number, @UserTeam() teamCode: string) {
    return this.publishService.remove(id, teamCode);
  }

  @Post('publish-templates/:id/draft')
  saveAsDraft(@Param('id', ParseIntPipe) id: number, @UserTeam() teamCode: string) {
    return this.publishService.saveAsDraft(id, teamCode);
  }

  @Post('publish-templates/:id/publish')
  publish(@Param('id', ParseIntPipe) id: number, @UserTeam() teamCode: string, @UserId() userId: number) {
    return this.publishService.publishTemplate(id, teamCode, userId);
  }

  // ===== AI 问卷生成 =====

  @Post('publish/ai-survey-fields')
  generateAiSurveyFields(@Body('prompt') prompt: string) {
    return this.publishService.generateAiSurveyFields(prompt);
  }

  // ===== Ship Task Status APIs =====

  @Get('ship-tasks')
  findShipTasks(
    @UserTeam() teamCode: string,
    @Query('shipId') shipId?: string,
    @Query('templateType') templateType?: string,
    @Query('status') status?: string,
  ) {
    const filters: any = {};
    if (shipId) filters.shipId = parseInt(shipId, 10);
    if (templateType) filters.templateType = templateType;
    if (status) filters.status = status;
    return this.publishService.findShipTasks(teamCode, filters);
  }

  @Put('ship-tasks/:id')
  updateShipTask(
    @Param('id', ParseIntPipe) id: number,
    @UserTeam() teamCode: string,
    @Body() updateData: {
      responseData?: any;
      completedItems?: number;
      status?: string;
      respondedBy?: number;
      geoLat?: number;
      geoLng?: number;
      geoAddress?: string;
      deviceInfo?: any;
    },
  ) {
    return this.publishService.updateShipTask(id, teamCode, updateData);
  }

  @Post('ship-tasks/trigger')
  triggerTasks(@UserTeam() teamCode: string) {
    return this.publishService.triggerTasks(teamCode);
  }

  @Get('publish-templates/category/:categoryId')
  getTemplatesByCategory(
    @UserTeam() teamCode: string,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.publishService.getTemplatesByCategory(teamCode, categoryId);
  }

  // ===== 文件汇总与统计 APIs =====

  @Get('publish-templates/:id/summary-excel')
  async downloadSummaryExcel(
    @Param('id', ParseIntPipe) id: number,
    @UserTeam() teamCode: string,
    @Res() res: Response,
  ) {
    const filePath = await this.fileSummaryService.generateExcelSummary(id, teamCode);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get('publish-templates/:id/merge-excel')
  async downloadMergedExcel(
    @Param('id', ParseIntPipe) id: number,
    @UserTeam() teamCode: string,
    @Res() res: Response,
  ) {
    const filePath = await this.fileSummaryService.mergeExcelFiles(id, teamCode);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get('publish-templates/:id/summary-report')
  async downloadSummaryReport(
    @Param('id', ParseIntPipe) id: number,
    @UserTeam() teamCode: string,
    @Res() res: Response,
  ) {
    const filePath = await this.fileSummaryService.generateSummaryReport(id, teamCode);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    res.send(fileContent);
  }

  @Get('publish-templates/:id/file-list')
  async getFileList(
    @Param('id', ParseIntPipe) id: number,
    @UserTeam() teamCode: string,
  ) {
    return this.fileSummaryService.getFileListForDownload(id, teamCode);
  }

  @Get('publish-templates/:id/stats')
  async getTemplateStats(
    @Param('id', ParseIntPipe) id: number,
    @UserTeam() teamCode: string,
  ) {
    const shipTasks = await this.publishService.findShipTasks(teamCode, {
      templateType: '',
    });

    const filteredTasks = shipTasks.filter((t) => {
      const templateIdMatch = t.template?.id === id;
      return templateIdMatch;
    });

    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.status === 'completed').length;
    const pending = filteredTasks.filter((t) => t.status === 'pending').length;
    const draft = filteredTasks.filter((t) => t.status === 'draft').length;

    return {
      total,
      completed,
      pending,
      draft,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}
