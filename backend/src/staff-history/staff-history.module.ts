import { Module } from '@nestjs/common';
import { StaffHistoryController } from './staff-history.controller';
import { StaffHistoryService } from './staff-history.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [StaffHistoryController],
  providers: [StaffHistoryService],
  exports: [StaffHistoryService],
})
export class StaffHistoryModule {}
