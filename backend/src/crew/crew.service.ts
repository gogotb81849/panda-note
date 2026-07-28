import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCrewDto } from './dto/create-crew.dto';
import { UpdateCrewDto } from './dto/update-crew.dto';
import { TeamCode } from '@prisma/client';

// 农历数据（1900-2100年）- 与前端保持一致
const LUNAR_INFO: number[] = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x0a576,0x0a4d0,
  0x0e250,0x1d4b6,0x0d250,0x0d520,0x0dd40,0x0b5a0,0x05b60,0x055d0,0x049a0,0x0a5d0,
  0x15175,0x052b0,0x0a930,0x07935,0x06aa0,0x0ad50,0x05b54,0x04b60,0x0a6e0,0x0a4e0,
  0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,
  0x0d250,0x0d520,0x0dd40,0x0b5a0,0x05b60,0x055d0,0x049a0,0x0a5d0,0x15175,0x052b0,
  0x0a930,0x07935,0x06aa0,0x0ad50,0x05b54,0x04b60,0x0a6e0,0x0a4e0,0x0d260,0x0ea65,
  0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,
  0x0dd40,0x0b5a0,0x05b60,0x055d0,0x049a0,0x0a5d0,0x15175,0x052b0,0x0a930,0x07935,
  0x06aa0,0x0ad50,0x05b54,0x04b60,0x0a6e0,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,
  0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd40,0x0b5a0,
];

function lYearDays(y: number): number {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    if ((LUNAR_INFO[y - 1900] & i) !== 0) sum += 1;
  }
  return sum + leapDays(y);
}

function leapMonth(y: number): number {
  return LUNAR_INFO[y - 1900] & 0xf;
}

function leapDays(y: number): number {
  if (leapMonth(y) !== 0) {
    return (LUNAR_INFO[y - 1900] & 0x10000) !== 0 ? 30 : 29;
  }
  return 0;
}

function monthDays(y: number, m: number): number {
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) === 0 ? 29 : 30;
}

/**
 * 农历转公历
 * @param lunarYear 农历年
 * @param lunarMonth 农历月 (1-12)
 * @param lunarDay 农历日
 * @param isLeap 是否闰月
 * @returns Date 公历日期
 */
function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number, isLeap = false): Date | null {
  const baseDate = new Date(1900, 0, 31);
  let offset = 0;

  // 计算从1900年到目标农历年的总天数
  for (let y = 1900; y < lunarYear; y++) {
    offset += lYearDays(y);
  }

  // 计算到目标农历月的天数
  let leap = leapMonth(lunarYear);
  for (let m = 1; m < lunarMonth; m++) {
    offset += monthDays(lunarYear, m);
    if (leap > 0 && m === leap) {
      offset += leapDays(lunarYear);
    }
  }

  // 如果是闰月，加上当月天数
  if (isLeap && lunarMonth === leap) {
    offset += monthDays(lunarYear, lunarMonth);
  }

  // 加上日
  offset += lunarDay - 1;

  const result = new Date(baseDate.getTime() + offset * 86400000);
  return result;
}

/**
 * 将农历月日转换为指定年份的公历日期
 * @param year 目标公历年份
 * @param lunarMonth 农历月
 * @param lunarDay 农历日
 * @returns 公历日期 YYYY-MM-DD 或 null
 */
function lunarMonthDayToSolar(year: number, lunarMonth: number, lunarDay: number): string | null {
  // 找到农历年对应的公历年
  // 农历新年通常在公历1月下旬到2月中旬之间
  // 所以对于给定的公历年year，我们需要检查农历年year和year-1
  for (const lunarYear of [year, year - 1]) {
    if (lunarYear < 1900 || lunarYear > 2100) continue;

    const leap = leapMonth(lunarYear);

    // 尝试非闰月
    const solarDate = lunarToSolar(lunarYear, lunarMonth, lunarDay, false);
    if (solarDate && solarDate.getFullYear() === year) {
      const m = String(solarDate.getMonth() + 1).padStart(2, '0');
      const d = String(solarDate.getDate()).padStart(2, '0');
      return `${solarDate.getFullYear()}-${m}-${d}`;
    }

    // 如果有闰月且目标月是闰月
    if (leap === lunarMonth) {
      const solarDateLeap = lunarToSolar(lunarYear, lunarMonth, lunarDay, true);
      if (solarDateLeap && solarDateLeap.getFullYear() === year) {
        const m = String(solarDateLeap.getMonth() + 1).padStart(2, '0');
        const d = String(solarDateLeap.getDate()).padStart(2, '0');
        return `${solarDateLeap.getFullYear()}-${m}-${d}`;
      }
    }
  }
  return null;
}

@Injectable()
export class CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(private prisma: PrismaService) {}

  async create(createCrewDto: CreateCrewDto, teamCode: TeamCode) {
    return this.prisma.crewMember.create({
      data: {
        teamCode,
        ...createCrewDto,
        onBoardDate: createCrewDto.onBoardDate ? new Date(createCrewDto.onBoardDate) : undefined,
        expectedOffDate: createCrewDto.expectedOffDate ? new Date(createCrewDto.expectedOffDate) : undefined,
        solarReminderDays: createCrewDto.solarReminderDays ?? 7,
        lunarReminderDays: createCrewDto.lunarReminderDays ?? 3,
        solarGiftAmount: createCrewDto.solarGiftAmount ?? 300,
        status: createCrewDto.status ?? 'active',
      },
    });
  }

  async findAll(teamCode: TeamCode, search?: string, status?: string, shipId?: number) {
    const where: any = { teamCode };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { idNumber: { contains: search } },
        { position: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (shipId) {
      where.shipId = shipId;
    }

    return this.prisma.crewMember.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, teamCode: TeamCode) {
    const crewMember = await this.prisma.crewMember.findFirst({
      where: { id, teamCode },
    });

    if (!crewMember) {
      throw new NotFoundException('船员不存在');
    }

    return crewMember;
  }

  async update(id: number, updateCrewDto: UpdateCrewDto, teamCode: TeamCode) {
    await this.findOne(id, teamCode);

    const data: any = { ...updateCrewDto };
    if (updateCrewDto.onBoardDate) {
      data.onBoardDate = new Date(updateCrewDto.onBoardDate);
    }
    if (updateCrewDto.expectedOffDate) {
      data.expectedOffDate = new Date(updateCrewDto.expectedOffDate);
    }

    return this.prisma.crewMember.update({
      where: { id },
      data,
    });
  }

  async remove(id: number, teamCode: TeamCode) {
    await this.findOne(id, teamCode);

    await this.prisma.crewMember.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * 获取即将到来的生日（未来 N 天内）- 包含公历和农历
   */
  async getUpcomingBirthdays(teamCode: TeamCode, days: number) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const future = new Date(now);
    future.setDate(future.getDate() + days);

    const crewMembers = await this.prisma.crewMember.findMany({
      where: {
        teamCode,
        status: 'active',
      },
    });

    const upcoming: any[] = [];

    for (const crew of crewMembers) {
      // 公历生日
      if (crew.birthdaySolar) {
        const solarParts = crew.birthdaySolar.split('-');
        const solarMonth = parseInt(solarParts[1]);
        const solarDay = parseInt(solarParts[2]);

        let solarBirthday = new Date(currentYear, solarMonth - 1, solarDay);
        if (solarBirthday < now) {
          solarBirthday = new Date(currentYear + 1, solarMonth - 1, solarDay);
        }

        if (solarBirthday <= future) {
          const daysUntil = Math.ceil((solarBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          upcoming.push({
            ...crew,
            birthdayType: 'solar',
            birthdayDate: `${currentYear}-${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`,
            nextBirthday: solarBirthday,
            daysUntilBirthday: daysUntil,
            actionLabel: `发放礼金${crew.solarGiftAmount}元`,
            actionType: 'gift',
          });
        }
      }

      // 农历生日
      if (crew.birthdayLunar) {
        const lunarParts = crew.birthdayLunar.split('-');
        const lunarMonth = parseInt(lunarParts[0]);
        const lunarDay = parseInt(lunarParts[1]);

        // 计算今年的农历生日对应的公历日期
        let lunarSolarDate = lunarMonthDayToSolar(currentYear, lunarMonth, lunarDay);
        
        if (lunarSolarDate) {
          let lunarBirthday = new Date(lunarSolarDate);
          if (lunarBirthday < now) {
            lunarSolarDate = lunarMonthDayToSolar(currentYear + 1, lunarMonth, lunarDay);
            if (lunarSolarDate) {
              lunarBirthday = new Date(lunarSolarDate);
            }
          }

          if (lunarBirthday && lunarBirthday <= future) {
            const daysUntil = Math.ceil((lunarBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            upcoming.push({
              ...crew,
              birthdayType: 'lunar',
              birthdayDate: lunarSolarDate,
              nextBirthday: lunarBirthday,
              daysUntilBirthday: daysUntil,
              actionLabel: '政委慰问安排一碗面',
              actionType: 'comfort',
            });
          }
        }
      }
    }

    // 按生日时间排序
    return upcoming.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
  }

  /**
   * 获取指定年月的生日日历数据（用于日历展示）
   */
  async getBirthdaysCalendar(teamCode: TeamCode, year: number, month: number) {
    const crewMembers = await this.prisma.crewMember.findMany({
      where: {
        teamCode,
        status: 'active',
      },
    });

    const calendarData: Record<string, any[]> = {};

    for (const crew of crewMembers) {
      // 公历生日
      if (crew.birthdaySolar) {
        const solarParts = crew.birthdaySolar.split('-');
        const solarMonth = parseInt(solarParts[1]);
        const solarDay = parseInt(solarParts[2]);

        if (solarMonth === month) {
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`;
          if (!calendarData[dateKey]) calendarData[dateKey] = [];
          calendarData[dateKey].push({
            crewMemberId: crew.id,
            crewName: crew.name,
            birthdayDate: dateKey,
            birthdayType: 'solar' as const,
            birthdayLabel: '公历生日',
            daysUntil: 0, // 前端计算
            isToday: false, // 前端计算
            actionLabel: `发放礼金${crew.solarGiftAmount}元`,
            actionType: 'gift' as const,
            solarGiftAmount: crew.solarGiftAmount,
            shipName: crew.shipName,
            position: crew.position,
          });
        }
      }

      // 农历生日 - 转换为公历
      if (crew.birthdayLunar) {
        const lunarParts = crew.birthdayLunar.split('-');
        const lunarMonth = parseInt(lunarParts[0]);
        const lunarDay = parseInt(lunarParts[1]);

        const solarDate = lunarMonthDayToSolar(year, lunarMonth, lunarDay);
        if (solarDate) {
          const solarDateObj = new Date(solarDate);
          if (solarDateObj.getMonth() + 1 === month) {
            const dateKey = solarDate;
            if (!calendarData[dateKey]) calendarData[dateKey] = [];
            calendarData[dateKey].push({
              crewMemberId: crew.id,
              crewName: crew.name,
              birthdayDate: dateKey,
              birthdayType: 'lunar' as const,
              birthdayLabel: '农历生日',
              daysUntil: 0,
              isToday: false,
              actionLabel: '政委慰问安排一碗面',
              actionType: 'comfort' as const,
              shipName: crew.shipName,
              position: crew.position,
            });
          }
        }
      }
    }

    return calendarData;
  }

  /**
   * 获取今日过生日的船员
   */
  async getTodayBirthdays(teamCode: TeamCode) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const crewMembers = await this.prisma.crewMember.findMany({
      where: {
        teamCode,
        status: 'active',
      },
    });

    const todayBirthdays: any[] = [];

    for (const crew of crewMembers) {
      // 公历生日
      if (crew.birthdaySolar) {
        const solarParts = crew.birthdaySolar.split('-');
        const solarMonth = parseInt(solarParts[1]);
        const solarDay = parseInt(solarParts[2]);

        if (now.getMonth() + 1 === solarMonth && now.getDate() === solarDay) {
          todayBirthdays.push({
            ...crew,
            birthdayType: 'solar',
            birthdayLabel: '公历生日',
            actionLabel: `发放礼金${crew.solarGiftAmount}元`,
            actionType: 'gift',
          });
        }
      }

      // 农历生日
      if (crew.birthdayLunar) {
        const lunarParts = crew.birthdayLunar.split('-');
        const lunarMonth = parseInt(lunarParts[0]);
        const lunarDay = parseInt(lunarParts[1]);

        const solarDate = lunarMonthDayToSolar(now.getFullYear(), lunarMonth, lunarDay);
        if (solarDate === today) {
          todayBirthdays.push({
            ...crew,
            birthdayType: 'lunar',
            birthdayLabel: '农历生日',
            actionLabel: '政委慰问安排一碗面',
            actionType: 'comfort',
          });
        }
      }
    }

    return todayBirthdays;
  }
}
