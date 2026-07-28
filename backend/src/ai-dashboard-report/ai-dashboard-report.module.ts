import { Module } from '@nestjs/common';
import { AIDashboardReportController } from './ai-dashboard-report.controller';
import { AIDashboardReportService } from './ai-dashboard-report.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, DashboardModule],
  controllers: [AIDashboardReportController],
  providers: [AIDashboardReportService],
  exports: [AIDashboardReportService],
})
export class AIDashboardReportModule {}
