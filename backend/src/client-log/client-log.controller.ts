import { Controller, Get, Post, Put, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ClientLogService } from './client-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamCode, UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('client-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientLogController {
  constructor(private readonly clientLogService: ClientLogService) {}

  /**
   * 获取日志收集配置
   */
  @Get('config')
  @Roles(UserRole.admin, UserRole.ship_political_instructor)
  async getConfig(@Request() req) {
    const teamCode = req.user.teamCode as TeamCode;
    return this.clientLogService.getConfig(teamCode);
  }

  /**
   * 更新日志收集配置（管理员）
   */
  @Put('config')
  @Roles(UserRole.admin)
  async updateConfig(@Request() req, @Body() body: {
    enabled?: boolean;
    collectErrors?: boolean;
    collectApiErrors?: boolean;
    collectPerformance?: boolean;
    collectUserActions?: boolean;
    uploadInterval?: number;
    maxBatchSize?: number;
    targetUserIds?: number[];
  }) {
    const teamCode = req.user.teamCode as TeamCode;
    return this.clientLogService.updateConfig(teamCode, body);
  }

  /**
   * 批量上传客户端日志
   */
  @Post('upload')
  @Roles(UserRole.admin, UserRole.ship_political_instructor, UserRole.shore_crew_supervisor)
  async uploadLogs(@Request() req, @Body() body: {
    logs: Array<{
      logType: string;
      level: string;
      message: string;
      details?: any;
      userAgent?: string;
      platform?: string;
      screenResolution?: string;
      networkType?: string;
      pageUrl?: string;
      pagePath?: string;
      clientTime: string;
    }>;
  }) {
    const userId = req.user.userId;
    const teamCode = req.user.teamCode as TeamCode;
    return this.clientLogService.uploadLogs(teamCode, userId, body.logs);
  }

  /**
   * 获取日志列表（管理员查看）
   */
  @Get('list')
  @Roles(UserRole.admin)
  async getLogs(@Request() req, @Query() query: {
    logType?: string;
    level?: string;
    analyzed?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    pageSize?: string;
  }) {
    const teamCode = req.user.teamCode as TeamCode;
    return this.clientLogService.getLogs(teamCode, {
      logType: query.logType,
      level: query.level,
      analyzed: query.analyzed ? query.analyzed === 'true' : undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page ? parseInt(query.page) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
    });
  }

  /**
   * 手动触发AI分析
   */
  @Post('analyze')
  @Roles(UserRole.admin)
  async triggerAnalysis(@Request() req) {
    const teamCode = req.user.teamCode as TeamCode;
    return this.clientLogService.triggerAIAnalysis(teamCode);
  }

  /**
   * 获取AI分析结果列表
   */
  @Get('analyses')
  @Roles(UserRole.admin)
  async getAnalyses(@Request() req, @Query() query: {
    severity?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }) {
    const teamCode = req.user.teamCode as TeamCode;
    return this.clientLogService.getAnalyses(teamCode, {
      severity: query.severity,
      status: query.status,
      page: query.page ? parseInt(query.page) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
    });
  }

  /**
   * 创建修复包并下发
   */
  @Post('fix-package')
  @Roles(UserRole.admin)
  async createFixPackage(@Request() req, @Body() body: {
    name: string;
    description?: string;
    analysisId?: number;
    fixType: string;
    fixContent: any;
    targetUserIds: number[];
  }) {
    const teamCode = req.user.teamCode as TeamCode;
    const sentBy = req.user.userId;
    return this.clientLogService.createFixPackage(teamCode, {
      ...body,
      sentBy,
    });
  }

  /**
   * 获取修复包列表
   */
  @Get('fix-packages')
  @Roles(UserRole.admin)
  async getFixPackages(@Request() req, @Query() query: {
    page?: string;
    pageSize?: string;
  }) {
    const teamCode = req.user.teamCode as TeamCode;
    const page = query.page ? parseInt(query.page) : undefined;
    const pageSize = query.pageSize ? parseInt(query.pageSize) : undefined;
    return this.clientLogService.getFixPackages(teamCode, page, pageSize);
  }

  /**
   * 用户获取待接收的修复包
   */
  @Get('pending-fixes')
  @Roles(UserRole.admin, UserRole.ship_political_instructor, UserRole.shore_crew_supervisor)
  async getPendingFixPackages(@Request() req) {
    const teamCode = req.user.teamCode as TeamCode;
    const userId = req.user.userId;
    return this.clientLogService.getPendingFixPackages(teamCode, userId);
  }

  /**
   * 用户确认接收修复包
   */
  @Post('fix-package/:id/receive')
  @Roles(UserRole.admin, UserRole.ship_political_instructor, UserRole.shore_crew_supervisor)
  async confirmReceipt(@Request() req) {
    const packageId = parseInt(req.params.id);
    const userId = req.user.userId;
    return this.clientLogService.confirmReceipt(packageId, userId);
  }

  /**
   * 用户确认应用修复包
   */
  @Post('fix-package/:id/apply')
  @Roles(UserRole.admin, UserRole.ship_political_instructor, UserRole.shore_crew_supervisor)
  async confirmApplied(@Request() req, @Body() body: { feedback?: string }) {
    const packageId = parseInt(req.params.id);
    const userId = req.user.userId;
    return this.clientLogService.confirmApplied(packageId, userId, body.feedback);
  }
}
