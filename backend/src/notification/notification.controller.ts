import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTeam } from '../auth/user.decorator';
import { NotificationsGateway } from '../websocket/notifications.gateway';
import { WebhookType } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * 获取Webhook配置列表
   */
  @Get('webhooks')
  async getWebhookConfigs(@Request() req) {
    return this.notificationService.getWebhookConfigs(req.user.teamCode);
  }

  /**
   * 获取单个Webhook配置
   */
  @Get('webhooks/:id')
  async getWebhookConfig(@Param('id') id: number) {
    return this.notificationService.getWebhookConfig(id);
  }

  /**
   * 创建Webhook配置
   */
  @Post('webhooks')
  async createWebhookConfig(@Request() req, @Body() body: {
    name: string;
    type: WebhookType;
    url: string;
    secret?: string;
    reminderDays?: number[];
    reminderLevels?: Record<string, number>;
    templateConfig?: Record<string, string>;
    taskCategories?: string[];
    priorityFilter?: string[];
    notifyCreator?: boolean;
    notifyAssignee?: boolean;
    notifyAdmins?: boolean;
  }) {
    return this.notificationService.createWebhookConfig({
      teamCode: req.user.teamCode,
      ...body,
    });
  }

  /**
   * 更新Webhook配置
   */
  @Put('webhooks/:id')
  async updateWebhookConfig(
    @Param('id') id: number,
    @Body() body: Partial<{
      name: string;
      type: WebhookType;
      url: string;
      secret: string;
      enabled: boolean;
      reminderDays: number[];
      reminderLevels: Record<string, number>;
      templateConfig: Record<string, string>;
      taskCategories: string[];
      priorityFilter: string[];
      notifyCreator: boolean;
      notifyAssignee: boolean;
      notifyAdmins: boolean;
    }>,
  ) {
    return this.notificationService.updateWebhookConfig(id, body);
  }

  /**
   * 删除Webhook配置
   */
  @Delete('webhooks/:id')
  async deleteWebhookConfig(@Param('id') id: number) {
    return this.notificationService.deleteWebhookConfig(id);
  }

  /**
   * 获取Webhook发送日志
   */
  @Get('webhooks/:id/logs')
  async getWebhookSentLogs(
    @Param('id') id: number,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.notificationService.getWebhookSentLogs(id, parseInt(page), parseInt(pageSize));
  }

  /**
   * 发送测试消息
   */
  @Post('webhooks/:id/test')
  async sendTestMessage(@Param('id') id: number) {
    return this.notificationService.sendTestMessage(id);
  }

  /**
   * 手动触发检查到期任务
   */
  @Post('check-reminders')
  async checkAndSendReminders() {
    return this.notificationService.checkAndSendReminders();
  }

  /**
   * 催填通知：向指定船舶发送任务填写提醒
   */
  @Post('remind')
  async sendTaskReminder(
    @UserTeam() teamCode: string,
    @Body() body: {
      type: string;
      templateId: number;
      shipIds: number[];
      message?: string;
    },
  ) {
    const { templateId, shipIds, message } = body;

    // 获取模板信息
    const template = await this.notificationService['prisma'].publishTemplate.findUnique({
      where: { id: templateId },
      select: { title: true, templateType: true, deadline: true },
    });

    const taskTitle = template?.title || '任务';
    const deadlineStr = template?.deadline
      ? `，截止时间：${new Date(template.deadline).toLocaleString('zh-CN')}`
      : '';

    // 通过WebSocket发送通知给相关船舶的用户
    for (const shipId of shipIds) {
      // 查找该船舶关联的用户（政委等）
      const ship = await this.notificationService['prisma'].ship.findUnique({
        where: { id: shipId },
        select: { cnShipName: true },
      });

      this.notificationsGateway.sendToTeam(teamCode, {
        type: 'task_assigned',
        title: '催填提醒',
        message: message || `请尽快完成「${taskTitle}」的填写${deadlineStr}`,
        data: {
          templateId,
          shipId,
          shipName: ship?.cnShipName || '',
          action: 'remind',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      remindedCount: shipIds.length,
      message: `已向 ${shipIds.length} 艘船舶发送催填提醒`,
    };
  }
}
