import { Module } from '@nestjs/common';
import { SanlvReportController } from './sanlv-report.controller';
import { SanlvReportService } from './sanlv-report.service';

@Module({
  controllers: [SanlvReportController],
  providers: [SanlvReportService],
})
export class SanlvReportModule {}
