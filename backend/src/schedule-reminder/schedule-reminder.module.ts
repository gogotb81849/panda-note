import { Module } from '@nestjs/common';
import { ScheduleReminderService } from './schedule-reminder.service';
import { ScheduleReminderController } from './schedule-reminder.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ScheduleReminderController],
  providers: [ScheduleReminderService],
  exports: [ScheduleReminderService],
})
export class ScheduleReminderModule {}
