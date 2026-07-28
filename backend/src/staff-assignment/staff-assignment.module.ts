import { Module } from '@nestjs/common';
import { StaffAssignmentService } from './staff-assignment.service';
import { StaffAssignmentController } from './staff-assignment.controller';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [OperationLogModule],
  controllers: [StaffAssignmentController],
  providers: [StaffAssignmentService],
  exports: [StaffAssignmentService],
})
export class StaffAssignmentModule {}
