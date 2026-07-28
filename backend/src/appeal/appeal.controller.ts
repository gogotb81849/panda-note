import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('appeal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppealController {
  constructor(private readonly appealService: AppealService) {}

  /**
   * 创建诉求（船舶端提交）
   */
  @Post()
  async create(
    @Body() body: {
      crewId: number;
      crewName: string;
      shipId: number;
      shipName: string;
      title: string;
      content: string;
      category: string;
      priority?: string;
      sourceTaskId?: number;
      sourceTemplateId?: number;
    },
    @Request() req,
  ) {
    return this.appealService.create({
      ...body,
      teamCode: req.user.teamCode,
    });
  }

  /**
   * 获取诉求列表
   */
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('shipId') shipId?: string,
    @Query('search') search?: string,
    @Query('sourceTaskId') sourceTaskId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.appealService.findAll(req.user.teamCode, {
      status,
      priority,
      category,
      shipId: shipId ? parseInt(shipId, 10) : undefined,
      search,
      sourceTaskId: sourceTaskId ? parseInt(sourceTaskId, 10) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  /**
   * 获取统计数据
   */
  @Get('stats')
  async getStats(@Request() req) {
    return this.appealService.getStats(req.user.teamCode);
  }

  /**
   * 获取单个诉求详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.appealService.findOne(+id, req.user.teamCode);
  }

  /**
   * 获取诉求的状态流转历史
   */
  @Get(':id/transitions')
  async getTransitions(@Param('id') id: string, @Request() req) {
    return this.appealService.getTransitionHistory(+id, req.user.teamCode);
  }

  /**
   * 获取需要主管处理的诉求列表
   */
  @Get('supervisor/pending')
  async getSupervisorPending(
    @Request() req,
    @Query('includeProcessing') includeProcessing?: string,
    @Query('includeResolved') includeResolved?: string,
  ) {
    return this.appealService.getAppealsForSupervisor(req.user.teamCode, {
      includeProcessing: includeProcessing === 'true',
      includeResolved: includeResolved === 'true',
    });
  }

  /**
   * 获取船舶待确认的诉求
   */
  @Get('ship/pending-confirmation/:shipId')
  async getPendingConfirmation(
    @Request() req,
    @Param('shipId') shipId: string,
  ) {
    return this.appealService.getPendingConfirmation(req.user.teamCode, +shipId);
  }

  /**
   * 更新诉求基础信息
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      content?: string;
      category?: string;
      priority?: string;
    },
    @Request() req,
  ) {
    return this.appealService.update(+id, req.user.teamCode, body);
  }

  /**
   * 主管受理诉求
   */
  @Put(':id/accept')
  async accept(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @Request() req,
  ) {
    return this.appealService.acceptAppeal(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.comment);
  }

  /**
   * 主管开始处理
   */
  @Put(':id/start-processing')
  async startProcessing(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @Request() req,
  ) {
    return this.appealService.startProcessing(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.comment);
  }

  /**
   * 主管解决诉求
   */
  @Put(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() body: { response: string; comment?: string },
    @Request() req,
  ) {
    return this.appealService.resolveAppeal(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.response, body.comment);
  }

  /**
   * 船舶确认诉求已解决
   */
  @Put(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() body: {
      satisfaction?: number;
      feedback?: string;
      comment?: string;
    },
    @Request() req,
  ) {
    return this.appealService.confirmAppeal(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.satisfaction, body.feedback, body.comment);
  }

  /**
   * 主管关闭诉求
   */
  @Put(':id/close')
  async close(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @Request() req,
  ) {
    return this.appealService.closeAppeal(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.comment);
  }

  /**
   * 主管驳回诉求
   */
  @Put(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    return this.appealService.rejectAppeal(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.reason);
  }

  /**
   * 升级诉求
   */
  @Put(':id/escalate')
  async escalate(
    @Param('id') id: string,
    @Body() body: { escalatedTo: string; comment?: string },
    @Request() req,
  ) {
    return this.appealService.escalateAppeal(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.escalatedTo, body.comment);
  }

  /**
   * 船舶退回处理（不满意，要求重新处理）
   */
  @Put(':id/return')
  async returnToProcessing(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    return this.appealService.returnToProcessing(+id, req.user.teamCode, {
      operatorId: req.user.id,
      operatorName: req.user.realName,
    }, body.reason);
  }

  /**
   * 删除诉求
   */
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string, @Request() req) {
    return this.appealService.remove(+id, req.user.teamCode);
  }
}
