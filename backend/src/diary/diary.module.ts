import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryController } from './diary.controller';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { StaffAssignmentModule } from '../staff-assignment/staff-assignment.module';

@Module({
  imports: [OperationLogModule, StaffAssignmentModule],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
