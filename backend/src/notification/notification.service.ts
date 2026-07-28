import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookType, ReminderLevel } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';
import type { Prisma } from '@prisma/client';

interface TaskInfo {
  id: number;
  title: string;
  dueDate: Date;
  status: string;
  priority: string;
  category?: string;
  category2?: string;
  createdBy?: { id: number; realName: string };
  assignedTo?: { id: number; realName: string };
}

interface WebhookPayload {
  msgtype: string;
  text?: {
    content: string;
  };
  markdown?: {
    title: string;
    text: string;
  };
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有启用的Webhook配置
   */
  async getEnabledWebhooks(teamCode: string) {
    return this.prisma.webhookConfig.findMany({
      where: { teamCode: teamCode as any, enabled: true },
    });
  }

  /**
   * 创建Webhook配置
   */
  async createWebhookConfig(data: {
    teamCode: string;
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
    return this.prisma.webhookConfig.create({
      data: {
        teamCode: data.teamCode as any,
        name: data.name,
        type: data.type,
        url: data.url,
        secret: data.secret,
        reminderDays: data.reminderDays || [7, 3, 1],
        reminderLevels: data.reminderLevels,
        templateConfig: data.templateConfig,
        taskCategories: data.taskCategories,
        priorityFilter: data.priorityFilter,
        notifyCreator: data.notifyCreator ?? true,
        notifyAssignee: data.notifyAssignee ?? true,
        notifyAdmins: data.notifyAdmins ?? false,
      },
    });
  }

  /**
   * 更新Webhook配置
   */
  async updateWebhookConfig(id: number, data: Partial<{
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
  }>) {
    return this.prisma.webhookConfig.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除Webhook配置
   */
  async deleteWebhookConfig(id: number) {
    // 先删除关联的发送记录
    await this.prisma.webhookSentLog.deleteMany({
      where: { webhookConfigId: id },
    });
    return this.prisma.webhookConfig.delete({
      where: { id },
    });
  }

  /**
   * 获取Webhook配置列表
   */
  async getWebhookConfigs(teamCode: string) {
    return this.prisma.webhookConfig.findMany({
      where: { teamCode: teamCode as any },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个Webhook配置
   */
  async getWebhookConfig(id: number) {
    return this.prisma.webhookConfig.findUnique({
      where: { id },
    });
  }

  /**
   * 获取Webhook发送日志
   */
  async getWebhookSentLogs(webhookConfigId: number, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.webhookSentLog.findMany({
        where: { webhookConfigId },
        orderBy: { sentAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.webhookSentLog.count({ where: { webhookConfigId } }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * 发送测试消息
   */
  async sendTestMessage(id: number) {
    const config = await this.prisma.webhookConfig.findUnique({ where: { id } });
    if (!config) {
      throw new NotFoundException('Webhook配置不存在');
    }

    const testPayload = this.buildMessage(
      {
        id: 0,
        title: '【测试消息】任务到期提醒Webhook配置成功',
        dueDate: new Date(),
        status: 'pending',
        priority: 'normal',
      },
      config,
      7,
    );

    return this.sendToWebhook(config, testPayload, null, ReminderLevel.low, 7);
  }

  /**
   * 检查到期任务并发送提醒
   * 由定时任务调用
   */
  async checkAndSendReminders() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 获取所有团队
    const teams = await this.prisma.user.findMany({
      select: { teamCode: true },
      distinct: ['teamCode'],
    });

    for (const team of teams) {
      const teamCode = team.teamCode;
      
      // 获取该团队所有启用的Webhook配置
      const webhooks = await this.getEnabledWebhooks(teamCode);
      if (webhooks.length === 0) continue;

      // 获取该团队所有有截止日期且未完成的任务
      const tasks = await this.prisma.task.findMany({
        where: {
          teamCode,
          dueDate: { not: null },
          status: { notIn: ['completed', 'cancelled'] },
        },
        include: {
          createdBy: { select: { id: true, realName: true } },
          assignedTo: { select: { id: true, realName: true } },
        },
      });

      for (const task of tasks) {
        if (!task.dueDate) continue;

        const dueDate = new Date(task.dueDate);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const daysDiff = Math.ceil((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        for (const webhook of webhooks) {
          const reminderDays: number[] = webhook.reminderDays as any || [7, 3, 1];

          // 检查是否应该发送提醒
          if (!reminderDays.includes(daysDiff)) continue;

          // 检查是否已发送过该级别的提醒
          const existingRecord = await this.prisma.taskReminderRecord.findFirst({
            where: {
              taskId: task.id,
              webhookConfigId: webhook.id,
              daysBefore: daysDiff,
            },
          });

          if (existingRecord?.sent) {
            this.logger.debug(`任务 ${task.id} 的 ${daysDiff} 天提醒已发送过，跳过`);
            continue;
          }

          // 检查过滤条件
          if (!this.shouldNotifyTask(task, webhook)) continue;

          // 确定提醒级别
          const level = this.getReminderLevel(daysDiff);

          // 构建消息
          const payload = this.buildMessage(task, webhook, daysDiff);

          // 获取通知目标用户
          const targetUsers = await this.getNotificationTargets(task, webhook, teamCode);

          // 发送Webhook
          const result = await this.sendToWebhook(webhook, payload, task, level, daysDiff, targetUsers);

          // 使用事务确保数据一致性
          await this.prisma.$transaction(async (tx) => {
            // 记录发送结果
            await tx.webhookSentLog.create({
              data: {
                teamCode: teamCode as any,
                webhookConfigId: webhook.id,
                taskId: task.id,
                taskTitle: task.title,
                reminderLevel: level,
                daysBefore: daysDiff,
                success: result.success,
                responseCode: result.responseCode,
                responseBody: result.responseBody,
                errorMessage: result.errorMessage,
                targetUsers: targetUsers,
              },
            });

            // 更新提醒记录
            await tx.taskReminderRecord.upsert({
              where: {
                taskId_webhookConfigId_daysBefore: {
                  taskId: task.id,
                  webhookConfigId: webhook.id,
                  daysBefore: daysDiff,
                },
              },
              create: {
                teamCode: teamCode as any,
                taskId: task.id,
                webhookConfigId: webhook.id,
                reminderLevel: level,
                daysBefore: daysDiff,
                dueDate: task.dueDate,
                sent: result.success,
                sentAt: result.success ? new Date() : null,
              },
              update: {
                sent: result.success,
                sentAt: result.success ? new Date() : null,
              },
            });
          });
        }
      }
    }

    return { success: true, timestamp: new Date() };
  }

  /**
   * 检查任务是否符合通知条件
   */
  private shouldNotifyTask(task: TaskInfo, webhook: any): boolean {
    // 检查分类过滤
    if (webhook.taskCategories && webhook.taskCategories.length > 0) {
      const taskCategory = task.category || '';
      if (!webhook.taskCategories.includes(taskCategory)) {
        return false;
      }
    }

    // 检查优先级过滤
    if (webhook.priorityFilter && webhook.priorityFilter.length > 0) {
      if (!webhook.priorityFilter.includes(task.priority)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取提醒级别
   */
  private getReminderLevel(daysDiff: number): ReminderLevel {
    if (daysDiff === 0) return ReminderLevel.urgent;
    if (daysDiff === 1) return ReminderLevel.high;
    if (daysDiff <= 3) return ReminderLevel.medium;
    return ReminderLevel.low;
  }

  /**
   * 获取通知目标用户列表
   */
  private async getNotificationTargets(task: TaskInfo, webhook: any, teamCode: string): Promise<{ userId: number; name: string }[]> {
    const targets: { userId: number; name: string }[] = [];

    // 通知创建者
    if (webhook.notifyCreator && task.createdBy) {
      targets.push({ userId: task.createdBy.id, name: task.createdBy.realName });
    }

    // 通知负责人
    if (webhook.notifyAssignee && task.assignedTo) {
      if (!targets.find(t => t.userId === task.assignedTo!.id)) {
        targets.push({ userId: task.assignedTo.id, name: task.assignedTo.realName });
      }
    }

    // 通知管理员
    if (webhook.notifyAdmins) {
      const admins = await this.prisma.user.findMany({
        where: {
          teamCode: teamCode as any,
          role: { in: ['admin', 'general_manager', 'company_admin'] },
        },
        select: { id: true, realName: true },
      });
      for (const admin of admins) {
        if (!targets.find(t => t.userId === admin.id)) {
          targets.push({ userId: admin.id, name: admin.realName });
        }
      }
    }

    return targets;
  }

  /**
   * 构建消息内容
   */
  private buildMessage(task: TaskInfo, webhook: any, daysDiff: number): WebhookPayload {
    const templateConfig = webhook.templateConfig as any || {};
    
    // 默认消息模板
    const defaultTitle = templateConfig.title || '任务到期提醒';
    const defaultContent = templateConfig.content || 
      '【{{taskTitle}}】任务{{statusText}}。\n截止时间：{{dueDate}}\n{{if assignee}}负责人：{{assignee}}{{/if}}\n{{if creator}}创建人：{{creator}}{{/if}}\n{{if daysDiff > 0}}剩余{{daysDiff}}天{{else if daysDiff == 0}}今天到期{{else}}已超时{{/if}}';

    // 格式化截止时间
    const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) : '未设置';

    // 状态文字
    const statusMap: Record<string, string> = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    const statusText = statusMap[task.status] || task.status;

    // 替换模板变量
    let content = defaultContent
      .replace(/\{\{taskTitle\}\}/g, task.title)
      .replace(/\{\{dueDate\}\}/g, dueDateStr)
      .replace(/\{\{statusText\}\}/g, statusText)
      .replace(/\{\{daysDiff\}\}/g, String(daysDiff))
      .replace(/\{\{if assignee\}\}(.*?)\{\{:assignee\}\}/g, task.assignedTo ? `$1 负责人：${task.assignedTo.realName}` : '')
      .replace(/\{\{if creator\}\}(.*?)\{\{:creator\}\}/g, task.createdBy ? `$1 创建人：${task.createdBy.realName}` : '')
      .replace(/\{\{priority\}\}/g, this.getPriorityText(task.priority))
      .replace(/\{\{category\}\}/g, task.category || '');

    // 根据Webhook类型构建不同格式的消息
    switch (webhook.type) {
      case WebhookType.dingtalk:
      case WebhookType.feishu:
      case WebhookType.wechat:
        return {
          msgtype: 'markdown',
          markdown: {
            title: defaultTitle,
            text: `# ${defaultTitle}\n\n${content}\n\n> 点击查看详情`,
          },
        };
      default:
        return {
          msgtype: 'text',
          text: {
            content: `${defaultTitle}\n\n${content}`,
          },
        };
    }
  }

  /**
   * 获取优先级文字
   */
  private getPriorityText(priority: string): string {
    const map: Record<string, string> = {
      urgent_important: '重要紧急',
      important: '重要不紧急',
      urgent: '紧急不重要',
      normal: '常规',
      low: '低',
    };
    return map[priority] || priority;
  }

  /**
   * 发送Webhook请求
   */
  private async sendToWebhook(
    webhook: any,
    payload: WebhookPayload,
    task: TaskInfo | null,
    level: ReminderLevel,
    daysBefore: number,
    targetUsers?: { userId: number; name: string }[],
  ): Promise<{
    success: boolean;
    responseCode?: number;
    responseBody?: string;
    errorMessage?: string;
  }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 根据不同类型添加签名
      let finalPayload = payload;

      if (webhook.type === WebhookType.dingtalk && webhook.secret) {
        // 钉钉签名
        const timestamp = Date.now();
        const sign = this.generateDingTalkSign(webhook.secret, timestamp);
        const urlWithSign = `${webhook.url}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
        
        const response = await axios.post(urlWithSign, payload, { headers, timeout: 10000 });
        return {
          success: response.status === 200,
          responseCode: response.status,
          responseBody: JSON.stringify(response.data),
        };
      }

      if (webhook.type === WebhookType.feishu && webhook.secret) {
        // 飞书签名
        headers['Authorization'] = `Bearer ${webhook.secret}`;
        const response = await axios.post(webhook.url, payload, { headers, timeout: 10000 });
        return {
          success: response.status === 200,
          responseCode: response.status,
          responseBody: JSON.stringify(response.data),
        };
      }

      // 默认发送
      const response = await axios.post(webhook.url, payload, { headers, timeout: 10000 });
      return {
        success: response.status === 200,
        responseCode: response.status,
        responseBody: JSON.stringify(response.data),
      };
    } catch (error: any) {
      this.logger.error(`Webhook发送失败: ${error.message}`);
      return {
        success: false,
        responseCode: error.response?.status,
        responseBody: error.response?.data ? JSON.stringify(error.response.data) : undefined,
        errorMessage: error.message,
      };
    }
  }

  /**
   * 生成钉钉签名
   */
  private generateDingTalkSign(secret: string, timestamp: number): string {
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }
}
