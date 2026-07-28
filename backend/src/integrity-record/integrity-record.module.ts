import { Module } from '@nestjs/common';
import { IntegrityRecordController } from './integrity-record.controller';
import { IntegrityRecordService } from './integrity-record.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [IntegrityRecordController],
  providers: [IntegrityRecordService],
  exports: [IntegrityRecordService],
})
export class IntegrityRecordModule {}
