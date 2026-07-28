import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationSchedulerService } from './notification.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../websocket/notifications.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), NotificationsModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationSchedulerService],
  exports: [NotificationService],
})
export class NotificationModule {}
