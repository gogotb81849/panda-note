import { Module } from '@nestjs/common';
import { ScheduleSettingsService } from './schedule-settings.service';
import { ScheduleSettingsController } from './schedule-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ScheduleSettingsController],
  providers: [ScheduleSettingsService],
  exports: [ScheduleSettingsService],
})
export class ScheduleSettingsModule {}
