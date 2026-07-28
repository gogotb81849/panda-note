import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TeamCode } from '@prisma/client';

@Injectable()
export class RecurringScheduleService {
  private readonly logger = new Logger(RecurringScheduleService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 每小时检查一次需要执行的定期任务
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processRecurringSchedules() {
    this.logger.log('开始处理定期任务...');

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 查找所有激活的、下次执行时间已到的模板
    const templates = await this.prisma.recurringScheduleTemplate.findMany({
      where: {
        isActive: true,
        nextExecuteAt: {
          lte: now,
        },
      },
    });

    this.logger.log(`找到 ${templates.length} 个需要执行的定期任务模板`);

    for (const template of templates) {
      try {
        await this.executeTemplate(template, currentTime);
        await this.updateNextExecuteTime(template);
      } catch (error) {
        this.logger.error(`执行定期任务模板 ${template.id} 失败:`, error);
      }
    }

    this.logger.log('定期任务处理完成');
  }

  /**
   * 执行单个模板
   */
  private async executeTemplate(template: any, currentTime: string) {
    // 检查是否到了执行时间（允许5分钟误差）
    const [templateHour, templateMinute] = template.executeTime.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    
    const templateTotalMinutes = templateHour * 60 + templateMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    if (Math.abs(currentTotalMinutes - templateTotalMinutes) > 5) {
      this.logger.debug(`模板 ${template.id} 未到执行时间，跳过`);
      return;
    }

    // 确定要创建的船舶列表
    let shipIds: number[] = [];
    if (template.shipId) {
      shipIds = [template.shipId];
    } else {
      // 获取该团队的所有船舶
      const ships = await this.prisma.ship.findMany({
        where: { teamCode: template.teamCode },
        select: { id: true },
      });
      shipIds = ships.map(s => s.id);
    }

    // 为每艘船舶创建日程
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const shipId of shipIds) {
      // 检查今天是否已存在相同的日程（避免重复创建）
      const existingSchedule = await this.prisma.schedule.findFirst({
        where: {
          teamCode: template.teamCode,
          shipId,
          recordDate: today,
          firstType: template.firstType,
          secondType: template.secondType,
        },
      });

      if (!existingSchedule) {
        await this.prisma.schedule.create({
          data: {
            teamCode: template.teamCode,
            recordDate: today,
            shipId,
            firstType: template.firstType,
            secondType: template.secondType,
            eventDetail: template.eventDetail,
            priority: template.priority as any,
            finishStatus: 'pending',
            createdById: template.createdById || 1, // 使用模板创建者或系统用户
            assignedToId: template.assignedToId,
          },
        });
        this.logger.log(`为船舶 ${shipId} 创建定期任务：${template.templateName}`);
      }
    }

    // 更新上次执行时间
    await this.prisma.recurringScheduleTemplate.update({
      where: { id: template.id },
      data: { lastExecutedAt: new Date() },
    });
  }

  /**
   * 更新下次执行时间
   */
  private async updateNextExecuteTime(template: any) {
    const now = new Date();
    let nextTime = new Date(now);

    switch (template.frequency) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + 1);
        break;
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + 7);
        break;
      case 'monthly':
        nextTime.setMonth(nextTime.getMonth() + 1);
        break;
    }

    // 设置执行时间
    const [hour, minute] = template.executeTime.split(':').map(Number);
    nextTime.setHours(hour, minute, 0, 0);

    await this.prisma.recurringScheduleTemplate.update({
      where: { id: template.id },
      data: { nextExecuteAt: nextTime },
    });

    this.logger.log(`模板 ${template.id} 下次执行时间：${nextTime.toISOString()}`);
  }

  /**
   * 获取所有定期任务模板
   */
  async getAllTemplates(teamCode: TeamCode) {
    return this.prisma.recurringScheduleTemplate.findMany({
      where: { teamCode },
      include: {
        ship: true,
        assignedTo: {
          select: {
            id: true,
            realName: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            realName: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 创建定期任务模板
   */
  async createTemplate(data: any, userId: number) {
    const nextExecuteAt = this.calculateNextExecuteTime(data);

    return this.prisma.recurringScheduleTemplate.create({
      data: {
        teamCode: data.teamCode,
        templateName: data.templateName,
        firstType: data.firstType,
        secondType: data.secondType,
        eventDetail: data.eventDetail,
        priority: data.priority || 'normal',
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        executeTime: data.executeTime || '09:00',
        shipId: data.shipId,
        assignedToId: data.assignedToId,
        isActive: data.isActive !== false,
        nextExecuteAt,
        createdById: userId,
      },
    });
  }

  /**
   * 更新定期任务模板
   */
  async updateTemplate(id: number, data: any) {
    const updateData: any = { ...data };
    
    // 如果修改了执行相关字段，重新计算下次执行时间
    if (data.frequency || data.executeTime || data.dayOfWeek || data.dayOfMonth) {
      const template = await this.prisma.recurringScheduleTemplate.findUnique({
        where: { id },
      });
      if (template) {
        updateData.nextExecuteAt = this.calculateNextExecuteTime({
          ...template,
          ...data,
        });
      }
    }

    return this.prisma.recurringScheduleTemplate.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 删除定期任务模板
   */
  async deleteTemplate(id: number) {
    return this.prisma.recurringScheduleTemplate.delete({
      where: { id },
    });
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecuteTime(data: any): Date {
    const now = new Date();
    let nextTime = new Date(now);

    const [hour, minute] = (data.executeTime || '09:00').split(':').map(Number);
    nextTime.setHours(hour, minute, 0, 0);

    // 如果今天还没到执行时间，就设为今天
    if (nextTime <= now) {
      switch (data.frequency) {
        case 'daily':
          nextTime.setDate(nextTime.getDate() + 1);
          break;
        case 'weekly':
          // 找到下一个指定的星期几
          const currentDay = nextTime.getDay();
          const targetDay = data.dayOfWeek || 1; // 默认周一
          let daysUntil = targetDay - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          nextTime.setDate(nextTime.getDate() + daysUntil);
          break;
        case 'monthly':
          // 找到下一个指定的日期
          const targetDate = data.dayOfMonth || 1;
          nextTime.setDate(targetDate);
          if (nextTime <= now) {
            nextTime.setMonth(nextTime.getMonth() + 1);
          }
          break;
        default:
          nextTime.setDate(nextTime.getDate() + 1);
      }
    }

    return nextTime;
  }
}
