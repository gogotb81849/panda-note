import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService, DataSource } from './dashboard.service';
import { User } from '../auth/user.decorator';
import { UserPayload } from '../auth/user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  /**
   * 获取当日统计数据
   * @param dataSource - 可选数据源：schedule | diary（默认 diary，向后兼容）
   */
  @Get('stats')
  async getStats(
    @User() user: UserPayload,
    @Query('date') dateStr?: string,
    @Query('dataSource') dataSource?: DataSource,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const source: DataSource = dataSource === 'schedule' ? 'schedule' : 'diary';
    return this.dashboardService.getDashboardStats(user.teamCode, date, source);
  }

  /**
   * 获取船舶列表（按类别分组）
   * @param dataSource - 可选数据源：schedule | diary（默认 diary，向后兼容）
   */
  @Get('ships')
  async getShipsByCategory(
    @User() user: UserPayload,
    @Query('date') dateStr?: string,
    @Query('dataSource') dataSource?: DataSource,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const source: DataSource = dataSource === 'schedule' ? 'schedule' : 'diary';
    return this.dashboardService.getShipsByCategory(user.teamCode, date, source);
  }

  /**
   * 获取日期范围的趋势统计
   * @param dataSource - 可选数据源：schedule | diary（默认 diary，向后兼容）
   */
  @Get('trend')
  async getTrend(
    @User() user: UserPayload,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
    @Query('dataSource') dataSource?: DataSource,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const source: DataSource = dataSource === 'schedule' ? 'schedule' : 'diary';
    return this.dashboardService.getTrendStats(user.teamCode, startDate, endDate, source);
  }

  /**
   * 新增：按 Schedule 口径获取当日统计（与 ScheduleService.getDailyStats 类似）
   */
  @Get('schedule-stats')
  async getScheduleStats(
    @User() user: UserPayload,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.dashboardService.getScheduleStats(user.teamCode, date);
  }

  /**
   * 新增：当日有日记详情补充的日程列表（用于"哪些任务有复盘"显示）
   */
  @Get('diary-supplement')
  async getDiarySupplement(
    @User() user: UserPayload,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.dashboardService.getDiarySupplement(user.teamCode, date);
  }

  /**
   * 新增：按日程口径导出当日工作报表的扁平化数据（便于前端生成 Excel）
   */
  @Get('export-excel')
  async exportExcel(
    @User() user: UserPayload,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.dashboardService.exportExcelData(user.teamCode, date);
  }

  /**
   * P2-7: 自定义看板指标
   */
  @Get('custom-metrics')
  async getCustomMetrics(
    @User() user: UserPayload,
    @Query('templateId') templateId?: string,
  ) {
    return this.dashboardService.getCustomDashboard(
      user.teamCode,
      templateId ? parseInt(templateId, 10) : undefined,
    );
  }
}
