import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { GanttService } from './gantt.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [TaskController],
  providers: [TaskService, GanttService],
  exports: [TaskService, GanttService],
})
export class TaskModule {}
