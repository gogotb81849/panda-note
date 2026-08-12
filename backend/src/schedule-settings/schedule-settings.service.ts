import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import { TeamCode } from '@prisma/client';

@Injectable()
export class ScheduleSettingsService {
  private readonly logger = new Logger(ScheduleSettingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户设置（不存在则创建默认）
   */
  async getOrCreate(userId: number, teamCode: TeamCode) {
    let settings = await this.prisma.scheduleSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      settings = await this.prisma.scheduleSettings.create({
        data: {
          teamCode,
          userId,
          showLunar: true,
          showWeekNumber: false,
          showHolidayRest: true,
          showHistoricalEvents: true,
          weekStartDay: 0,
          syncTodo: false,
          showImportantDate: true,
          recommendSubscribe: true,
          otherCalendar: 'chinese_lunar',
        },
      });
    }
    return settings;
  }

  async update(userId: number, teamCode: TeamCode, dto: UpdateScheduleSettingsDto) {
    // 先确保存在
    await this.getOrCreate(userId, teamCode);

    const data: any = {};
    if (dto.showLunar !== undefined) data.showLunar = dto.showLunar;
    if (dto.showWeekNumber !== undefined) data.showWeekNumber = dto.showWeekNumber;
    if (dto.showHolidayRest !== undefined) data.showHolidayRest = dto.showHolidayRest;
    if (dto.showHistoricalEvents !== undefined) data.showHistoricalEvents = dto.showHistoricalEvents;
    if (dto.weekStartDay !== undefined) data.weekStartDay = dto.weekStartDay;
    if (dto.syncTodo !== undefined) data.syncTodo = dto.syncTodo;
    if (dto.showImportantDate !== undefined) data.showImportantDate = dto.showImportantDate;
    if (dto.recommendSubscribe !== undefined) data.recommendSubscribe = dto.recommendSubscribe;
    if (dto.otherCalendar !== undefined) data.otherCalendar = dto.otherCalendar;

    return this.prisma.scheduleSettings.update({
      where: { userId },
      data,
    });
  }
}
