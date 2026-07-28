import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIDashboardReportService } from './ai-dashboard-report.service';
import { User } from '../auth/user.decorator';
import { UserPayload } from '../auth/user.decorator';

@Controller('ai-dashboard')
@UseGuards(JwtAuthGuard)
export class AIDashboardReportController {
  constructor(private aiService: AIDashboardReportService) {}

  @Post('report')
  async generateReport(
    @User() user: UserPayload,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.aiService.generateDashboardReport(user.teamCode, date);
  }
}
