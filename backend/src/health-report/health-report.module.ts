import { Module } from '@nestjs/common';
import { HealthReportController } from './health-report.controller';
import { HealthReportService } from './health-report.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIBriefModule } from '../ai-brief/ai-brief.module';
import { NotificationsModule } from '../websocket/notifications.module';

@Module({
  imports: [PrismaModule, AIBriefModule, NotificationsModule],
  controllers: [HealthReportController],
  providers: [HealthReportService],
  exports: [HealthReportService],
})
export class HealthReportModule {}
