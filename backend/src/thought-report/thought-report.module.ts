import { Module } from '@nestjs/common';
import { ThoughtReportController } from './thought-report.controller';
import { ThoughtReportService } from './thought-report.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [ThoughtReportController],
  providers: [ThoughtReportService],
  exports: [ThoughtReportService],
})
export class ThoughtReportModule {}
