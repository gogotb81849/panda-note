import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private isProcessing = false;

  constructor(private notificationService: NotificationService) {}

  onModuleInit() {
    this.logger.log('NotificationSchedulerService 已初始化');
  }

  /**
   * 每小时执行一次到期任务检查
   * 使用 @Cron(EVERY_HOUR) 来设置定时任务
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    if (this.isProcessing) {
      this.logger.warn('上次任务检查尚未完成，跳过本次执行');
      return;
    }

    this.isProcessing = true;
    this.logger.log('开始执行任务到期提醒检查...');

    try {
      const result = await this.notificationService.checkAndSendReminders();
      this.logger.log(`任务到期提醒检查完成: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('任务到期提醒检查失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 每天早上9点执行一次到期任务检查（额外检查）
   */
  @Cron('0 9 * * *')  // 每天9:00执行
  async handleDailyCron() {
    this.logger.log('执行每日任务到期提醒检查...');
    try {
      const result = await this.notificationService.checkAndSendReminders();
      this.logger.log(`每日任务到期提醒检查完成: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('每日任务到期提醒检查失败:', error);
    }
  }

  /**
   * 每15分钟执行一次（针对当天到期的任务）
   */
  @Cron('*/15 * * * *')  // 每15分钟执行
  async handleQuarterHourlyCron() {
    this.logger.log('执行15分钟间隔的任务到期检查...');
    try {
      const result = await this.notificationService.checkAndSendReminders();
      this.logger.log(`15分钟间隔检查完成: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('15分钟间隔检查失败:', error);
    }
  }
}
