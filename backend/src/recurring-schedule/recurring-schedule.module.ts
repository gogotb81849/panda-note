import { Module } from '@nestjs/common';
import { RecurringScheduleService } from './recurring-schedule.service';
import { RecurringScheduleController } from './recurring-schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringScheduleController],
  providers: [RecurringScheduleService],
  exports: [RecurringScheduleService],
})
export class RecurringScheduleModule {}
