import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { TeamCode, UserRole } from '@prisma/client';
import { StaffAssignmentService } from '../staff-assignment/staff-assignment.service';

/**
 * Extract client IP address from request
 */
function getClientIp(req: any): string {
  return req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}

/**
 * 安全地将字符串转换为 Date，避免 Invalid Date 写入 Prisma
 * 返回值：Date | null — 传入 undefined/null/空串/无效值均返回 null
 */
function safeDate(value: string | undefined | null): Date | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);

  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
    private staffAssignmentService: StaffAssignmentService,
  ) {}

  /**
   * 从文本内容中识别船名
   * @param content 文本内容
   * @param teamCode 团队编码
   * @returns 识别到的船舶列表
   */
  private async detectShipNames(content: string, teamCode: TeamCode) {
    if (!content) return [];

    const ships = await this.prisma.ship.findMany({
      where: { teamCode },
      select: {
        id: true,
        cnShipName: true,
        enShipName: true,
      },
    });

    const detected: Array<{ shipId: number; shipName: string; matchName: string }> = [];
    const detectedIds = new Set<number>();

    for (const ship of ships) {
      if (detectedIds.has(ship.id)) continue;

      let matched = false;
      let matchName = ship.cnShipName;

      if (ship.cnShipName && content.includes(ship.cnShipName)) {
        matched = true;
        matchName = ship.cnShipName;
      }

      if (!matched && ship.enShipName) {
        const enNameLower = ship.enShipName.toLowerCase();
        const contentLower = content.toLowerCase();
        if (contentLower.includes(enNameLower)) {
          matched = true;
          matchName = ship.enShipName;
        }
      }

      if (matched) {
        detected.push({
          shipId: ship.id,
          shipName: ship.cnShipName,
          matchName,
        });
        detectedIds.add(ship.id);
      }
    }

    return detected;
  }

  /**
   * 同步日记到船舶笔记（ShipNote）
   * 注意：只同步岸基主管日记，船舶政委日记不同步到船笔记
   */
  private async syncDiaryToShipNotes(
    diaryId: number,
    diaryContent: string,
    userId: number,
    teamCode: TeamCode,
  ) {
    // 检查日记作者角色，只有岸基主管（admin/海务/机务/电气/船工/总管/油轮船管部）的日记才同步
    // 船舶政委（ship_political_instructor）的日记不同步到船笔记
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (user) {
      const roles: UserRole[] = Array.isArray(user.roles) ? user.roles as UserRole[] : [user.roles as UserRole];
      const isShoreSupervisor = roles.some(r =>
        r === UserRole.admin ||
        r === UserRole.shore_marine_supervisor ||
        r === UserRole.shore_engineer_supervisor ||
        r === UserRole.shore_electric_supervisor ||
        r === UserRole.shore_crew_supervisor ||
        r === UserRole.general_manager ||
        r === UserRole.company_admin
      );
      // 船舶政委日记不同步
      if (!isShoreSupervisor) {
        this.logger.log(`日记 ${diaryId} 作者非岸基主管，不同步到船笔记`);
        return;
      }
    }

    const detectedShips = await this.detectShipNames(diaryContent, teamCode);

    if (detectedShips.length === 0) return;

    for (const ship of detectedShips) {
      const existing = await this.prisma.shipNote.findFirst({
        where: {
          teamCode,
          shipId: ship.shipId,
          source: 'diary',
          content: {
            contains: `diary_id:${diaryId}`,
          },
        },
      });

      if (!existing) {
        const noteContent = `【主管日记关联】diary_id:${diaryId}\n${diaryContent}`;
        await this.prisma.shipNote.create({
          data: {
            teamCode,
            shipId: ship.shipId,
            userId,
            content: noteContent,
            source: 'diary',
            tags: ['主管日记'],
          },
        });
      }
    }
  }

  /**
   * 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
   * 仅船舶政委（ship_political_instructor）的日记触发此同步
   * 船工主管通过粘贴船舶报告直接更新 Ship，此处为政委通道
   */
  private async syncDiaryToShipDynamic(
    diary: any,
    userId: number,
    teamCode: TeamCode,
  ) {
    if (!diary || !diary.shipId) return;

    // 判断作者角色：仅政委同步到 Ship 动态字段
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (user) {
      const roles: UserRole[] = Array.isArray(user.roles) ? user.roles as UserRole[] : [user.roles as UserRole];
      const isPoliticalInstructor = roles.includes(UserRole.ship_political_instructor);
      if (!isPoliticalInstructor) {
        return;
      }
    }

    try {
      const shipId = diary.shipId;
      const data: any = {
        dynamicSource: 'political',
        dynamicUpdatedAt: new Date(),
      };

      // 字段映射：Diary → Ship
      if (diary.voyageNumber) data.currentVoyage = diary.voyageNumber;
      if (diary.shipPosition) data.currentLocation = diary.shipPosition;
      if (diary.departurePort) data.departurePort = diary.departurePort;
      if (diary.arrivalPort) data.etaPort = diary.arrivalPort;
      if (diary.timezone) data.timezone = diary.timezone;

      // dynamicStatus 映射到 currentStatus
      if (diary.dynamicStatus) {
        const ds = String(diary.dynamicStatus);
        if (/航行|在航/.test(ds)) data.currentStatus = 'voyage';
        else if (/锚泊|抛锚/.test(ds)) data.currentStatus = 'anchored';
        else if (/靠泊|抵港|在港/.test(ds)) data.currentStatus = 'berthed';
      }

      // 天气/海况映射（Diary 的 weather/seaCondition 是描述性，写入对应字段）
      if (diary.weather) data.temperature = diary.weather;
      if (diary.seaCondition) data.waveLevel = diary.seaCondition;

      await this.prisma.ship.update({ where: { id: shipId }, data });
      this.logger.log(`政委日记 ${diary.id} 已同步船舶动态到 Ship ${shipId}`);
    } catch (error) {
      this.logger.error(`同步政委日记到船舶动态失败 diaryId=${diary.id}`, error);
    }
  }

  private async validateScheduleOwnership(scheduleIds: number[], userId: number, teamCode: TeamCode) {
    if (!scheduleIds || scheduleIds.length === 0) return [];

    const uniqueIds = Array.from(new Set(scheduleIds));
    const schedules = await this.prisma.schedule.findMany({
      where: {
        id: { in: uniqueIds },
        teamCode,
        createdById: userId,
        finishStatus: 'completed',
      },
      include: {
        ship: { select: { cnShipName: true } },
        createdBy: { select: { realName: true } },
      },
    });

    if (schedules.length !== uniqueIds.length) {
      const foundIds = new Set(schedules.map((s) => s.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `部分日程不存在、不属于当前用户或尚未完成: ${missing.join(', ')}`,
      );
    }

    return schedules;
  }

  private async syncRelations(
    diaryId: number,
    teamCode: TeamCode,
    scheduleIds: number[],
  ) {
    const uniqueIds = Array.from(new Set(scheduleIds));

    // 获取已有关联
    const existing = await this.prisma.diaryScheduleRelation.findMany({
      where: { diaryId, teamCode },
      select: { scheduleId: true },
    });
    const existingIds = new Set(existing.map((r) => r.scheduleId));

    const toAdd = uniqueIds.filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !uniqueIds.includes(id));

    if (toAdd.length > 0) {
      await this.prisma.diaryScheduleRelation.createMany({
        data: toAdd.map((scheduleId) => ({
          diaryId,
          scheduleId,
          teamCode,
        })),
        skipDuplicates: true,
      });
    }

    if (toRemove.length > 0) {
      await this.prisma.diaryScheduleRelation.deleteMany({
        where: {
          diaryId,
          teamCode,
          scheduleId: { in: toRemove },
        },
      });
    }
  }

  private async updateDiaryCategoryFromSchedules(
    diaryId: number,
    teamCode: TeamCode,
    forceFromSchedule: boolean,
  ) {
    // 取第一条关联日程
    const firstRelation = await this.prisma.diaryScheduleRelation.findFirst({
      where: { diaryId, teamCode },
      orderBy: { id: 'asc' },
      include: { schedule: { select: { firstType: true, secondType: true } } },
    });

    if (firstRelation?.schedule) {
      await this.prisma.diary.update({
        where: { id: diaryId },
        data: {
          categoryFirst: firstRelation.schedule.firstType,
          categorySecond: firstRelation.schedule.secondType,
          categorySource: 'auto',
        },
      });
      return;
    }

    // 没有关联日程，且原本是 auto 来源时，清空自动分类
    if (forceFromSchedule) {
      await this.prisma.diary.update({
        where: { id: diaryId },
        data: {
          categoryFirst: null,
          categorySecond: null,
          categorySource: 'manual',
        },
      });
    }
  }

  async create(createDiaryDto: CreateDiaryDto, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    // 日期必须有效：date 是 Diary 模型的必填 DateTime，不允许 Invalid Date
    const parsedDate = safeDate(createDiaryDto.date);
    if (!parsedDate) {
      throw new BadRequestException(`日记日期无效: ${createDiaryDto.date ?? '(空)'}`);
    }
    const date = parsedDate;
    date.setHours(0, 0, 0, 0);

    // 预先校验关联日程
    const relatedSchedules = createDiaryDto.relatedScheduleIds && createDiaryDto.relatedScheduleIds.length > 0
      ? await this.validateScheduleOwnership(createDiaryDto.relatedScheduleIds, userId, teamCode)
      : [];

    // 是否自动从日程继承分类（存在有效关联且未手动指定分类）
    const hasRelationOverride = relatedSchedules.length > 0
      && !createDiaryDto.categoryFirst
      && !createDiaryDto.categorySecond;

    const autoCategoryFirst = hasRelationOverride ? relatedSchedules[0].firstType : undefined;
    const autoCategorySecond = hasRelationOverride ? relatedSchedules[0].secondType : undefined;
    const autoSource = hasRelationOverride ? 'auto' : undefined;

    // 检查是否已存在该日期的日记
    const existing = await this.prisma.diary.findUnique({
      where: {
        teamCode_userId_date: {
          teamCode,
          userId,
          date,
        },
      },
    });

    let diary;

    if (existing) {
      diary = await this.prisma.diary.update({
        where: { id: existing.id },
        data: {
          content: createDiaryDto.content,
          shipId: createDiaryDto.shipId,
          weather: createDiaryDto.weather,
          seaCondition: createDiaryDto.seaCondition,
          dynamicStatus: createDiaryDto.dynamicStatus,
          departurePort: createDiaryDto.departurePort,
          arrivalPort: createDiaryDto.arrivalPort,
          departureDate: safeDate(createDiaryDto.departureDate),
          arrivalDate: safeDate(createDiaryDto.arrivalDate),
          departureTime: safeDate(createDiaryDto.departureTime),
          pirateStatus: createDiaryDto.pirateStatus,
          pirateTime: createDiaryDto.pirateTime,
          shipName: createDiaryDto.shipName,
          timezone: createDiaryDto.timezone,
          shipPosition: createDiaryDto.shipPosition,
          isFreePortZone: createDiaryDto.isFreePortZone,
          isWarZone: createDiaryDto.isWarZone,
          leadSealOperation: createDiaryDto.leadSealOperation,
          categoryFirst: hasRelationOverride ? autoCategoryFirst : createDiaryDto.categoryFirst,
          categorySecond: hasRelationOverride ? autoCategorySecond : createDiaryDto.categorySecond,
          categorySource: autoSource ?? (createDiaryDto.categoryFirst ? 'manual' : undefined),
          politicalInstructorName: createDiaryDto.politicalInstructorName,
          politicalInstructorOnBoardDate: safeDate(createDiaryDto.politicalInstructorOnBoardDate),
        },
      });

      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: '修改',
        operationContent: `更新日记（ID:${diary.id}）`,
        ipAddress,
        userAgent,
      });
    } else {
      diary = await this.prisma.diary.create({
        data: {
          userId,
          teamCode,
          date,
          content: createDiaryDto.content,
          shipId: createDiaryDto.shipId,
          weather: createDiaryDto.weather,
          seaCondition: createDiaryDto.seaCondition,
          dynamicStatus: createDiaryDto.dynamicStatus,
          departurePort: createDiaryDto.departurePort,
          arrivalPort: createDiaryDto.arrivalPort,
          departureDate: safeDate(createDiaryDto.departureDate),
          arrivalDate: safeDate(createDiaryDto.arrivalDate),
          departureTime: safeDate(createDiaryDto.departureTime),
          pirateStatus: createDiaryDto.pirateStatus,
          pirateTime: createDiaryDto.pirateTime,
          shipName: createDiaryDto.shipName,
          timezone: createDiaryDto.timezone,
          shipPosition: createDiaryDto.shipPosition,
          isFreePortZone: createDiaryDto.isFreePortZone ?? false,
          isWarZone: createDiaryDto.isWarZone ?? false,
          leadSealOperation: createDiaryDto.leadSealOperation ?? false,
          categoryFirst: hasRelationOverride ? autoCategoryFirst : (createDiaryDto.categoryFirst ?? null),
          categorySecond: hasRelationOverride ? autoCategorySecond : (createDiaryDto.categorySecond ?? null),
          categorySource: autoSource ?? (createDiaryDto.categoryFirst ? 'manual' : 'manual'),
          politicalInstructorName: createDiaryDto.politicalInstructorName,
          politicalInstructorOnBoardDate: safeDate(createDiaryDto.politicalInstructorOnBoardDate),
        },
      });

      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: '新增',
        operationContent: `创建日记（ID:${diary.id}）`,
        ipAddress,
        userAgent,
      });
    }

    // 建立日程关联
    if (createDiaryDto.relatedScheduleIds && createDiaryDto.relatedScheduleIds.length > 0) {
      await this.syncRelations(diary.id, teamCode, createDiaryDto.relatedScheduleIds);
    }

    // 自动识别船名并关联船舶 + 同步到船舶笔记
    try {
      const detectedShips = await this.detectShipNames(createDiaryDto.content, teamCode);
      if (detectedShips.length > 0) {
        const primaryShip = detectedShips[0];
        if (!diary.shipId) {
          diary = await this.prisma.diary.update({
            where: { id: diary.id },
            data: {
              shipId: primaryShip.shipId,
              shipName: primaryShip.shipName,
            },
          });
        }
        await this.syncDiaryToShipNotes(diary.id, createDiaryDto.content, userId, teamCode);
      }
    } catch (error) {
      this.logger.error('自动识别船名失败', error);
    }

    // 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
    await this.syncDiaryToShipDynamic(diary, userId, teamCode);

    return diary;
  }

  async findById(id: number, userId: number, teamCode: TeamCode) {
    const diary = await this.prisma.diary.findFirst({
      where: { id, userId, teamCode },
    });

    if (!diary) {
      throw new NotFoundException('日记不存在');
    }

    return diary;
  }

  async findByDate(userId: number, teamCode: TeamCode, date: string) {
    const parsedDate = safeDate(date);
    if (!parsedDate) {
      return null;
    }
    const targetDate = parsedDate;
    targetDate.setHours(0, 0, 0, 0);

    const diary = await this.prisma.diary.findUnique({
      where: {
        teamCode_userId_date: {
          teamCode,
          userId,
          date: targetDate,
        },
      },
    });

    if (!diary) {
      return null;
    }

    return diary;
  }

  async findAll(userId: number, teamCode: TeamCode, startDate?: string, endDate?: string) {
    const where: any = { userId, teamCode };

    const s = safeDate(startDate);
    const e = safeDate(endDate);
    if (s && e) {
      where.date = { gte: s, lte: e };
    } else if (s) {
      where.date = { gte: s };
    } else if (e) {
      where.date = { lte: e };
    }

    return this.prisma.diary.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  /**
   * 根据用户权限获取日记列表（支持跨团队流动场景）
   * 规则：
   * - 在船：当前船舶所有日记 + 自己在所有船舶上的日记
   * - 休假：只有自己在所有船舶上的日记
   * - 历史船舶：只能看到自己任上的日记
   */
  async getDiariesByPermission(userId: number, teamCode: TeamCode, startDate?: string, endDate?: string) {
    const currentAssignment = await this.staffAssignmentService.getCurrentAssignment(userId);
    const historyAssignments = await this.staffAssignmentService.getHistoryAssignments(userId, teamCode);
    const isOnLeave = await this.staffAssignmentService.isUserOnLeave(userId);

    const s = safeDate(startDate);
    const e = safeDate(endDate);

    if (isOnLeave) {
      const where: any = { userId };
      if (s && e) where.date = { gte: s, lte: e };
      else if (s) where.date = { gte: s };
      else if (e) where.date = { lte: e };
      return this.prisma.diary.findMany({ where, orderBy: { date: 'desc' } });
    }

    const whereConditions: any[] = [];
    
    if (currentAssignment?.shipId) {
      whereConditions.push({ shipId: currentAssignment.shipId });
    }
    
    whereConditions.push({ userId });
    
    for (const assignment of historyAssignments) {
      if (assignment.shipId !== currentAssignment?.shipId) {
        whereConditions.push({ shipId: assignment.shipId, userId });
      }
    }

    const where: any = {
      teamCode,
      OR: whereConditions,
    };

    if (s && e) where.date = { gte: s, lte: e };
    else if (s) where.date = { gte: s };
    else if (e) where.date = { lte: e };

    return this.prisma.diary.findMany({ where, orderBy: { date: 'desc' } });
  }

  /**
   * 船舶视角查询日记
   * - 在船期间：该船舶所有历史日记（历任政委）
   * - 下船后：该船舶中自己任职期间的日记
   */
  async getDiariesByShipView(userId: number, teamCode: TeamCode, shipId: number) {
    const currentAssignment = await this.staffAssignmentService.getCurrentAssignment(userId);
    const isOnBoard = await this.staffAssignmentService.isUserOnBoard(userId);

    const where: any = { shipId };

    if (isOnBoard && currentAssignment?.shipId === shipId) {
      where.teamCode = teamCode;
    } else {
      const userAssignments = await this.prisma.staffAssignment.findMany({
        where: { userId, shipId },
        orderBy: { startDate: 'desc' },
      });

      if (userAssignments.length === 0) {
        return [];
      }

      const dateConditions: any[] = [];
      for (const assignment of userAssignments) {
        dateConditions.push({
          date: {
            gte: assignment.startDate,
            ...(assignment.endDate ? { lte: assignment.endDate } : {}),
          },
        });
      }

      where.userId = userId;
      where.teamCode = teamCode;
      where.OR = dateConditions;
    }

    return this.prisma.diary.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { relatedSchedules: true } },
      },
    });
  }

  /**
   * 个人视角查询日记（跨船汇总）
   * - 始终只能看到自己任职期间的日记
   */
  async getDiariesByPersonalView(userId: number, teamCode: TeamCode, startDate?: string, endDate?: string) {
    const userAssignments = await this.prisma.staffAssignment.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    if (userAssignments.length === 0) {
      return [];
    }

    const dateConditions: any[] = [];
    for (const assignment of userAssignments) {
      dateConditions.push({
        shipId: assignment.shipId,
        date: {
          gte: assignment.startDate,
          ...(assignment.endDate ? { lte: assignment.endDate } : {}),
        },
      });
    }

    const where: any = {
      userId,
      teamCode,
      OR: dateConditions,
    };

    const s = safeDate(startDate);
    const e = safeDate(endDate);
    if (s && e) where.date = { gte: s, lte: e };
    else if (s) where.date = { gte: s };
    else if (e) where.date = { lte: e };

    return this.prisma.diary.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { relatedSchedules: true } },
      },
    });
  }

  /**
   * 获取用户权限信息（用于前端显示）
   */
  async getUserDiaryPermission(userId: number) {
    return this.staffAssignmentService.getUserDiaryPermission(userId);
  }

  async update(id: number, updateDiaryDto: UpdateDiaryDto, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const diary = await this.prisma.diary.findFirst({
      where: { id, userId, teamCode },
    });

    if (!diary) {
      throw new NotFoundException('日记不存在');
    }

    // 校验关联日程（若提供）
    let hasRelations = false;
    if (updateDiaryDto.relatedScheduleIds && updateDiaryDto.relatedScheduleIds.length > 0) {
      await this.validateScheduleOwnership(updateDiaryDto.relatedScheduleIds, userId, teamCode);
      hasRelations = true;
    } else if (updateDiaryDto.relatedScheduleIds && updateDiaryDto.relatedScheduleIds.length === 0) {
      hasRelations = true; // 允许清空
    }

    const hasCategoryOverride = hasRelations
      && (updateDiaryDto.relatedScheduleIds?.length ?? 0) > 0
      && !updateDiaryDto.categoryFirst
      && !updateDiaryDto.categorySecond;

    let autoCategoryFirst: string | undefined;
    let autoCategorySecond: string | undefined;
    let autoSource: string | undefined;

    if (hasCategoryOverride) {
      const firstSchedule = await this.prisma.schedule.findFirst({
        where: {
          id: { in: updateDiaryDto.relatedScheduleIds },
          teamCode,
          createdById: userId,
          finishStatus: 'completed',
        },
        orderBy: { id: 'asc' },
      });
      if (firstSchedule) {
        autoCategoryFirst = firstSchedule.firstType;
        autoCategorySecond = firstSchedule.secondType;
        autoSource = 'auto';
      }
    }

    let updated = await this.prisma.diary.update({
      where: { id },
      data: {
        content: updateDiaryDto.content,
        shipId: updateDiaryDto.shipId,
        weather: updateDiaryDto.weather,
        seaCondition: updateDiaryDto.seaCondition,
        dynamicStatus: updateDiaryDto.dynamicStatus,
        departurePort: updateDiaryDto.departurePort,
        arrivalPort: updateDiaryDto.arrivalPort,
        departureDate: safeDate(updateDiaryDto.departureDate),
        arrivalDate: safeDate(updateDiaryDto.arrivalDate),
        departureTime: safeDate(updateDiaryDto.departureTime),
        pirateStatus: updateDiaryDto.pirateStatus,
        pirateTime: updateDiaryDto.pirateTime,
        shipName: updateDiaryDto.shipName,
        timezone: updateDiaryDto.timezone,
        shipPosition: updateDiaryDto.shipPosition,
        isFreePortZone: updateDiaryDto.isFreePortZone,
        isWarZone: updateDiaryDto.isWarZone,
        leadSealOperation: updateDiaryDto.leadSealOperation,
        categoryFirst: hasCategoryOverride ? autoCategoryFirst : updateDiaryDto.categoryFirst,
        categorySecond: hasCategoryOverride ? autoCategorySecond : updateDiaryDto.categorySecond,
        categorySource: hasCategoryOverride
          ? 'auto'
          : (updateDiaryDto.categoryFirst !== undefined ? 'manual' : undefined),
        politicalInstructorName: updateDiaryDto.politicalInstructorName,
        politicalInstructorOnBoardDate: safeDate(updateDiaryDto.politicalInstructorOnBoardDate),
      },
    });

    // 同步日程关联
    if (hasRelations) {
      await this.syncRelations(id, teamCode, updateDiaryDto.relatedScheduleIds!);
      // 若清空所有关联，将 categorySource 重置为 manual
      if ((updateDiaryDto.relatedScheduleIds?.length ?? 0) === 0) {
        await this.prisma.diary.update({
          where: { id },
          data: { categorySource: 'manual' },
        });
      }
    }

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `更新日记（ID:${id}）`,
      ipAddress,
      userAgent,
    });

    // 自动识别船名并关联船舶 + 同步到船舶笔记
    if (updateDiaryDto.content !== undefined) {
      try {
        const detectedShips = await this.detectShipNames(updateDiaryDto.content, teamCode);
        if (detectedShips.length > 0) {
          const primaryShip = detectedShips[0];
          if (!updated.shipId) {
            updated = await this.prisma.diary.update({
              where: { id },
              data: {
                shipId: primaryShip.shipId,
                shipName: primaryShip.shipName,
              },
            });
          }
          await this.syncDiaryToShipNotes(id, updateDiaryDto.content, userId, teamCode);
        }
      } catch (error) {
        this.logger.error('自动识别船名失败', error);
      }
    }

    // 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
    await this.syncDiaryToShipDynamic(updated, userId, teamCode);

    return updated;
  }

  async remove(id: number, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const diary = await this.prisma.diary.findFirst({
      where: { id, userId, teamCode },
    });

    if (!diary) {
      throw new NotFoundException('日记不存在');
    }

    await this.prisma.diary.delete({
      where: { id },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '删除',
      operationContent: `删除日记（ID:${id}）`,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  // ======= 日记与日程关联相关方法 =======

  async getRelatedSchedules(diaryId: number, userId: number, teamCode: TeamCode) {
    const diary = await this.prisma.diary.findFirst({
      where: { id: diaryId, userId, teamCode },
    });
    if (!diary) {
      throw new NotFoundException('日记不存在');
    }

    const relations = await this.prisma.diaryScheduleRelation.findMany({
      where: { diaryId, teamCode },
      orderBy: { id: 'asc' },
      include: {
        schedule: {
          include: {
            ship: { select: { cnShipName: true } },
            createdBy: { select: { realName: true } },
          },
        },
      },
    });

    return relations.map((r) => ({
      scheduleId: r.schedule.id,
      firstType: r.schedule.firstType,
      secondType: r.schedule.secondType,
      title: r.schedule.title,
      eventDetail: r.schedule.eventDetail,
      shipName: r.schedule.ship?.cnShipName ?? null,
      finishStatus: r.schedule.finishStatus,
      recordDate: r.schedule.recordDate,
      createdByRealName: r.schedule.createdBy?.realName ?? null,
    }));
  }

  async addRelatedSchedules(
    diaryId: number,
    userId: number,
    teamCode: TeamCode,
    scheduleIds: number[],
  ) {
    const diary = await this.prisma.diary.findFirst({
      where: { id: diaryId, userId, teamCode },
    });
    if (!diary) {
      throw new NotFoundException('日记不存在');
    }

    if (!scheduleIds || scheduleIds.length === 0) {
      throw new BadRequestException('scheduleIds 不能为空');
    }

    // 校验所有日程归属及完成状态
    const validSchedules = await this.validateScheduleOwnership(scheduleIds, userId, teamCode);

    const uniqueIds = Array.from(new Set(scheduleIds));

    await this.prisma.diaryScheduleRelation.createMany({
      data: uniqueIds.map((scheduleId) => ({
        diaryId,
        scheduleId,
        teamCode,
      })),
      skipDuplicates: true,
    });

    // 自动从第一条关联日程继承分类
    await this.updateDiaryCategoryFromSchedules(diaryId, teamCode, false);

    return { success: true, addedCount: uniqueIds.length };
  }

  async removeRelatedSchedule(
    diaryId: number,
    scheduleId: number,
    userId: number,
    teamCode: TeamCode,
  ) {
    const diary = await this.prisma.diary.findFirst({
      where: { id: diaryId, userId, teamCode },
    });
    if (!diary) {
      throw new NotFoundException('日记不存在');
    }

    const relation = await this.prisma.diaryScheduleRelation.findFirst({
      where: { diaryId, scheduleId, teamCode },
    });
    if (!relation) {
      throw new NotFoundException('该日程未关联此日记');
    }

    await this.prisma.diaryScheduleRelation.delete({
      where: { id: relation.id },
    });

    // 更新分类（若无剩余关联则回到 manual）
    await this.updateDiaryCategoryFromSchedules(diaryId, teamCode, true);

    return { success: true };
  }

  async getTodaySchedulesAvailable(
    userId: number,
    teamCode: TeamCode,
    date?: string,
  ) {
    // 解析目标日期（今日或指定日期），也包含昨日已完成的日程
    let targetDate: Date;
    if (date) {
      const parsed = safeDate(date);
      targetDate = parsed ? parsed : new Date();
      targetDate.setHours(0, 0, 0, 0);
    } else {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
    }

    const dayStart = new Date(targetDate);
    const dayEnd = new Date(targetDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // 同时包含昨天（最近一天）的已完成日程
    const yesterdayStart = new Date(targetDate);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const startOfRange = yesterdayStart;
    const endOfRange = dayEnd;

    // 获取用户已关联的日程ID（避免重复关联）
    const userDiaries = await this.prisma.diary.findMany({
      where: { userId, teamCode },
      select: { id: true },
    });
    const diaryIds = userDiaries.map((d) => d.id);

    const existingRelations = diaryIds.length > 0
      ? await this.prisma.diaryScheduleRelation.findMany({
          where: {
            teamCode,
            diaryId: { in: diaryIds },
          },
          select: { scheduleId: true },
        })
      : [];

    const alreadyRelatedScheduleIds = new Set(existingRelations.map((r) => r.scheduleId));

    // 查询用户在最近两天内已完成且未关联任何日记的日程
    const schedules = await this.prisma.schedule.findMany({
      where: {
        teamCode,
        createdById: userId,
        finishStatus: 'completed',
        recordDate: {
          gte: startOfRange,
          lt: endOfRange,
        },
        id: { notIn: [...alreadyRelatedScheduleIds] },
      },
      include: {
        ship: { select: { cnShipName: true } },
        createdBy: { select: { realName: true } },
      },
      orderBy: { recordDate: 'asc' },
    });

    return schedules.map((s) => ({
      scheduleId: s.id,
      firstType: s.firstType,
      secondType: s.secondType,
      title: s.title,
      eventDetail: s.eventDetail,
      shipName: s.ship?.cnShipName ?? null,
      finishStatus: s.finishStatus,
      recordDate: s.recordDate,
      createdByRealName: s.createdBy?.realName ?? null,
    }));
  }
}
