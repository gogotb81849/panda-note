import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleReminderDto, UpdateScheduleReminderDto } from './dto/create-schedule-reminder.dto';
import { TeamCode, UserRole } from '@prisma/client';

@Injectable()
export class ScheduleReminderService {
  private readonly logger = new Logger(ScheduleReminderService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 查询某日程的所有提醒
   */
  async findByScheduleId(scheduleId: number, userId: number, teamCode: TeamCode) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, teamCode },
    });
    if (!schedule) {
      throw new Error('日程不存在或无权操作');
    }
    return this.prisma.scheduleReminder.findMany({
      where: { scheduleId, teamCode },
      orderBy: { remindBefore: 'asc' },
    });
  }

  /**
   * 查询用户在某时间段内待触发的提醒
   */
  async findPending(userId: number, teamCode: TeamCode, startDate?: string, endDate?: string) {
    const where: any = {
      teamCode,
      userId,
      firedAt: null,
    };
    if (startDate || endDate) {
      where.schedule = {};
      if (startDate) where.schedule.startTime = { gte: new Date(startDate) };
      if (endDate) where.schedule.startTime = { ...where.schedule.startTime, lte: new Date(endDate) };
    }
    return this.prisma.scheduleReminder.findMany({
      where,
      include: { schedule: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateScheduleReminderDto, userId: number, teamCode: TeamCode) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: dto.scheduleId, teamCode },
    });
    if (!schedule) {
      throw new Error('日程不存在或无权操作');
    }
    return this.prisma.scheduleReminder.create({
      data: {
        teamCode,
        scheduleId: dto.scheduleId,
        userId,
        remindBefore: dto.remindBefore,
        remindUnit: dto.remindUnit || 'minute',
        isImportant: dto.isImportant || false,
      },
    });
  }

  async update(id: number, dto: UpdateScheduleReminderDto, userId: number, teamCode: TeamCode, userRole: UserRole) {
    const record = await this.prisma.scheduleReminder.findFirst({
      where: { id, teamCode },
    });
    if (!record) {
      throw new Error('提醒不存在或无权操作');
    }
    if (record.userId !== userId && userRole !== 'admin') {
      throw new Error('只能修改自己创建的提醒');
    }

    const data: any = {};
    if (dto.remindBefore !== undefined) data.remindBefore = dto.remindBefore;
    if (dto.remindUnit !== undefined) data.remindUnit = dto.remindUnit;
    if (dto.isImportant !== undefined) data.isImportant = dto.isImportant;

    return this.prisma.scheduleReminder.update({ where: { id }, data });
  }

  async remove(id: number, userId: number, teamCode: TeamCode, userRole: UserRole) {
    const record = await this.prisma.scheduleReminder.findFirst({
      where: { id, teamCode },
    });
    if (!record) {
      throw new Error('提醒不存在或无权操作');
    }
    if (record.userId !== userId && userRole !== 'admin') {
      throw new Error('只能删除自己创建的提醒');
    }
    return this.prisma.scheduleReminder.delete({ where: { id } });
  }

  /**
   * 批量删除某日程的所有提醒（删除日程时级联已配置，这里是手动清理用）
   */
  async removeAllByScheduleId(scheduleId: number, userId: number, teamCode: TeamCode, userRole: UserRole) {
    const where: any = { scheduleId, teamCode };
    if (userRole !== 'admin') {
      where.userId = userId;
    }
    return this.prisma.scheduleReminder.deleteMany({ where });
  }
}
