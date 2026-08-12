import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { TeamCode, UserRole, ScheduleStatus } from '@prisma/client';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  async create(createScheduleDto: CreateScheduleDto, userId: number, teamCode: TeamCode, userRole: UserRole, ipAddress?: string, userAgent?: string) {
    const result = await this.prisma.schedule.create({
      data: {
        teamCode,
        recordDate: new Date(createScheduleDto.recordDate),
        shipId: createScheduleDto.shipId,
        firstType: createScheduleDto.firstType,
        secondType: createScheduleDto.secondType,
        standardFlowId: createScheduleDto.standardFlowId,
        eventDetail: createScheduleDto.eventDetail,
        title: createScheduleDto.title,
        description: createScheduleDto.description,
        startTime: createScheduleDto.startTime ? new Date(createScheduleDto.startTime) : null,
        endTime: createScheduleDto.endTime ? new Date(createScheduleDto.endTime) : null,
        finishStatus: createScheduleDto.finishStatus || ScheduleStatus.pending,
        priority: createScheduleDto.priority,
        createdById: userId,
        assignedToId: createScheduleDto.assignedToId,
      },
      include: {
        ship: true,
        createdBy: { select: { id: true, username: true, realName: true } },
        assignedTo: { select: { id: true, username: true, realName: true } },
      },
    });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '新增',
      operationContent: `新增日程：${result.firstType}-${result.secondType}（ID:${result.id}）`,
      ipAddress,
      userAgent,
    });

    return result;
  }

  async findAll(teamCode: TeamCode, userRole: UserRole, startDate?: string, endDate?: string, page?: number, pageSize?: number) {
    const where: any = { teamCode };
    
    if (startDate && endDate) {
      where.recordDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const include = {
      ship: true,
      createdBy: { select: { id: true, username: true, realName: true } },
      assignedTo: { select: { id: true, username: true, realName: true } },
    };

    // 分页查询
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.schedule.findMany({
          where,
          include,
          orderBy: { recordDate: 'desc' },
          skip,
          take: pageSize,
        }),
        this.prisma.schedule.count({ where }),
      ]);
      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // 不分页时返回全部数据（向后兼容）
    return this.prisma.schedule.findMany({
      where,
      include,
      orderBy: { recordDate: 'desc' },
    });
  }

  async findOne(id: number, teamCode: TeamCode) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id, teamCode },
      include: {
        ship: true,
        createdBy: { select: { id: true, username: true, realName: true } },
        assignedTo: { select: { id: true, username: true, realName: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException('日程不存在');
    }

    return schedule;
  }

  async update(id: number, updateScheduleDto: UpdateScheduleDto, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const schedule = await this.findOne(id, teamCode);

    const updatedSchedule = await this.prisma.schedule.update({
      where: { id },
      data: {
        recordDate: updateScheduleDto.recordDate ? new Date(updateScheduleDto.recordDate) : undefined,
        shipId: updateScheduleDto.shipId,
        firstType: updateScheduleDto.firstType,
        secondType: updateScheduleDto.secondType,
        standardFlowId: updateScheduleDto.standardFlowId,
        eventDetail: updateScheduleDto.eventDetail,
        title: updateScheduleDto.title,
        description: updateScheduleDto.description,
        startTime: updateScheduleDto.startTime ? new Date(updateScheduleDto.startTime) : null,
        endTime: updateScheduleDto.endTime ? new Date(updateScheduleDto.endTime) : null,
        finishStatus: updateScheduleDto.finishStatus,
        priority: updateScheduleDto.priority,
        assignedToId: updateScheduleDto.assignedToId,
      },
      include: {
        ship: true,
        createdBy: { select: { id: true, username: true, realName: true } },
        assignedTo: { select: { id: true, username: true, realName: true } },
      },
    });

    // 工单办结时，自动脱敏生成公共案例
    const wasCompleted = schedule.finishStatus === ScheduleStatus.completed;
    const nowCompleted = updatedSchedule.finishStatus === ScheduleStatus.completed;
    if (!wasCompleted && nowCompleted) {
      try {
        await this.generatePublicCase(updatedSchedule);
        this.logger.log(`工单 ${id} 已办结，自动生成脱敏公共案例`);
      } catch (err) {
        this.logger.error(`工单 ${id} 自动生成公共案例失败: ${err.message}`);
      }
    }

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `修改日程：${updatedSchedule.firstType}-${updatedSchedule.secondType}（ID:${id}）`,
      ipAddress,
      userAgent,
    });

    return updatedSchedule;
  }

  /**
   * 工单办结后自动脱敏，生成公共案例入库
   * 脱敏规则：屏蔽船名、人名、团队标识、精确日期，保留事件分类、处置思路、处理步骤
   */
  private async generatePublicCase(schedule: any) {
    // 检查是否已为该工单生成过案例，避免重复
    const existingCase = await this.prisma.publicCase.findFirst({
      where: { fromRecordId: schedule.id },
    });
    if (existingCase) return;

    // 构建脱敏内容
    const shipName = schedule.ship?.cnShipName || '某船';
    const assigneeName = schedule.assignedTo?.realName || '相关人员';
    const creatorName = schedule.createdBy?.realName || '记录人';

    let content = '';
    content += `【事项分类】${schedule.firstType} - ${schedule.secondType}\n`;
    content += `【优先级】${this.getPriorityLabel(schedule.priority)}\n`;
    if (schedule.eventDetail) {
      // 脱敏：将具体船名替换为"某船"，人名替换为"相关人员"
      let detail = schedule.eventDetail;
      detail = detail.replace(new RegExp(shipName, 'g'), '某船');
      detail = detail.replace(new RegExp(assigneeName, 'g'), '相关人员');
      detail = detail.replace(new RegExp(creatorName, 'g'), '记录人');
      // 脱敏精确日期（YYYY-MM-DD格式）
      detail = detail.replace(/\d{4}-\d{2}-\d{2}/g, '某日');
      content += `【事件详情】${detail}\n`;
    }
    content += `【处置状态】已办结\n`;

    await this.prisma.publicCase.create({
      data: {
        fromRecordId: schedule.id,
        caseType: schedule.firstType,
        caseContent: content,
      },
    });
  }

  private getPriorityLabel(priority: string): string {
    const map: Record<string, string> = {
      urgent_important: '重要紧急',
      important: '重要不紧急',
      urgent: '紧急不重要',
      normal: '常规',
      low: '低',
    };
    return map[priority] || '常规';
  }

  /**
   * 获取指定日期的分类统计（按 firstType/secondType 分组）
   */
  async getDailyStats(teamCode: TeamCode, date: string) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const schedules = await this.prisma.schedule.findMany({
        where: {
          teamCode,
          recordDate: { gte: startOfDay, lte: endOfDay },
        },
        include: { ship: { select: { id: true, cnShipName: true } } },
      });

      const categoryMap = new Map<string, {
        categoryFirst: string;
        categorySecond: string;
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        shipIds: Set<number | null>;
        shipNames: Set<string>;
        involvedUserIds: Set<number>;
      }>();

      for (const s of schedules) {
        const key = `${s.firstType}||${s.secondType}`;
        let entry = categoryMap.get(key);
        if (!entry) {
          entry = {
            categoryFirst: s.firstType,
            categorySecond: s.secondType,
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            shipIds: new Set(),
            shipNames: new Set(),
            involvedUserIds: new Set(),
          };
          categoryMap.set(key, entry);
        }
        entry.total += 1;
        if (s.finishStatus === ScheduleStatus.completed) entry.completed += 1;
        else if (s.finishStatus === ScheduleStatus.in_progress) entry.inProgress += 1;
        else if (s.finishStatus === ScheduleStatus.pending) entry.pending += 1;

        if (s.shipId !== null && s.shipId !== undefined) entry.shipIds.add(s.shipId);
        if (s.ship?.cnShipName) entry.shipNames.add(s.ship.cnShipName);
        if (s.createdById) entry.involvedUserIds.add(s.createdById);
        if (s.assignedToId) entry.involvedUserIds.add(s.assignedToId);
      }

      return Array.from(categoryMap.values()).map((e) => ({
        categoryFirst: e.categoryFirst,
        categorySecond: e.categorySecond,
        total: e.total,
        completed: e.completed,
        inProgress: e.inProgress,
        pending: e.pending,
        completionRate: e.total > 0 ? Number((e.completed / e.total).toFixed(4)) : 0,
        shipCount: e.shipIds.size,
        shipNames: Array.from(e.shipNames),
        involvedUserIds: Array.from(e.involvedUserIds),
      }));
    } catch (err: any) {
      this.logger.error(`获取每日统计失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 按船舶维度统计任务执行情况
   */
  async getStatsByShip(teamCode: TeamCode, startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const schedules = await this.prisma.schedule.findMany({
        where: {
          teamCode,
          recordDate: { gte: start, lte: end },
        },
        include: { ship: { select: { id: true, cnShipName: true } } },
      });

      const shipMap = new Map<number | null, {
        shipId: number | null;
        shipName: string;
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        categoryBreakdown: Map<string, { categoryFirst: string; categorySecond: string; count: number }>;
      }>();

      for (const s of schedules) {
        const shipId = s.shipId ?? null;
        const shipName = s.ship?.cnShipName || '未指定船舶';
        let entry = shipMap.get(shipId);
        if (!entry) {
          entry = {
            shipId,
            shipName,
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            categoryBreakdown: new Map(),
          };
          shipMap.set(shipId, entry);
        }
        entry.total += 1;
        if (s.finishStatus === ScheduleStatus.completed) entry.completed += 1;
        else if (s.finishStatus === ScheduleStatus.in_progress) entry.inProgress += 1;
        else if (s.finishStatus === ScheduleStatus.pending) entry.pending += 1;

        const catKey = `${s.firstType}||${s.secondType}`;
        let catEntry = entry.categoryBreakdown.get(catKey);
        if (!catEntry) {
          catEntry = { categoryFirst: s.firstType, categorySecond: s.secondType, count: 0 };
          entry.categoryBreakdown.set(catKey, catEntry);
        }
        catEntry.count += 1;
      }

      return Array.from(shipMap.values()).map((e) => ({
        shipId: e.shipId,
        shipName: e.shipName,
        total: e.total,
        completed: e.completed,
        inProgress: e.inProgress,
        pending: e.pending,
        completionRate: e.total > 0 ? Number((e.completed / e.total).toFixed(4)) : 0,
        categoryBreakdown: Array.from(e.categoryBreakdown.values()),
      }));
    } catch (err: any) {
      this.logger.error(`按船舶统计失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 获取一段时间内的每日趋势统计
   */
  async getTrendStats(teamCode: TeamCode, startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const schedules = await this.prisma.schedule.findMany({
        where: {
          teamCode,
          recordDate: { gte: start, lte: end },
        },
        orderBy: { recordDate: 'asc' },
      });

      const dateMap = new Map<string, {
        date: string;
        total: number;
        completed: number;
        byCategory: Map<string, { categoryFirst: string; categorySecond: string; count: number }>;
      }>();

      for (const s of schedules) {
        const dateKey = s.recordDate.toISOString().slice(0, 10);
        let entry = dateMap.get(dateKey);
        if (!entry) {
          entry = {
            date: dateKey,
            total: 0,
            completed: 0,
            byCategory: new Map(),
          };
          dateMap.set(dateKey, entry);
        }
        entry.total += 1;
        if (s.finishStatus === ScheduleStatus.completed) entry.completed += 1;

        const catKey = `${s.firstType}||${s.secondType}`;
        let catEntry = entry.byCategory.get(catKey);
        if (!catEntry) {
          catEntry = { categoryFirst: s.firstType, categorySecond: s.secondType, count: 0 };
          entry.byCategory.set(catKey, catEntry);
        }
        catEntry.count += 1;
      }

      return Array.from(dateMap.values()).map((e) => ({
        date: e.date,
        total: e.total,
        completed: e.completed,
        completionRate: e.total > 0 ? Number((e.completed / e.total).toFixed(4)) : 0,
        byCategory: Array.from(e.byCategory.values()),
      }));
    } catch (err: any) {
      this.logger.error(`获取趋势统计失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 某政委的工作完成率统计（按日期统计该用户的任务完成情况）
   */
  async getStatsByUser(teamCode: TeamCode, userId: number, startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const schedules = await this.prisma.schedule.findMany({
        where: {
          teamCode,
          recordDate: { gte: start, lte: end },
          OR: [{ createdById: userId }, { assignedToId: userId }],
        },
      });

      let total = 0;
      let completed = 0;
      let inProgress = 0;
      let pending = 0;
      const categoryMap = new Map<string, { categoryFirst: string; categorySecond: string; count: number }>();

      for (const s of schedules) {
        total += 1;
        if (s.finishStatus === ScheduleStatus.completed) completed += 1;
        else if (s.finishStatus === ScheduleStatus.in_progress) inProgress += 1;
        else if (s.finishStatus === ScheduleStatus.pending) pending += 1;

        const catKey = `${s.firstType}||${s.secondType}`;
        let catEntry = categoryMap.get(catKey);
        if (!catEntry) {
          catEntry = { categoryFirst: s.firstType, categorySecond: s.secondType, count: 0 };
          categoryMap.set(catKey, catEntry);
        }
        catEntry.count += 1;
      }

      return {
        userId,
        total,
        completed,
        inProgress,
        pending,
        completionRate: total > 0 ? Number((completed / total).toFixed(4)) : 0,
        byCategory: Array.from(categoryMap.values()),
      };
    } catch (err: any) {
      this.logger.error(`按用户统计失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 从 DictCategory 获取分类字典（用于下拉选择）
   */
  async getDictCategories(teamCode: TeamCode, categoryType: 'first_type' | 'second_type', parentId?: number) {
    try {
      const where: any = {
        OR: [{ teamCode: null }, { teamCode }],
        categoryType,
      };

      if (categoryType === 'second_type' && parentId !== undefined && parentId !== null) {
        where.parentId = parentId;
      }

      return this.prisma.dictCategory.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
    } catch (err: any) {
      this.logger.error(`获取分类字典失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 批量创建日程（从标准任务库勾选多项一次性创建），每条记录均写入操作日志
   */
  async bulkCreate(items: CreateScheduleDto[], userId: number, teamCode: TeamCode, userRole: UserRole, ipAddress?: string, userAgent?: string) {
    try {
      if (!items || items.length === 0) {
        return { created: 0, data: [] };
      }

      const created = [];
      for (const dto of items) {
        const schedule = await this.prisma.schedule.create({
          data: {
            teamCode,
            recordDate: new Date(dto.recordDate),
            shipId: dto.shipId,
            firstType: dto.firstType,
            secondType: dto.secondType,
            standardFlowId: dto.standardFlowId,
            eventDetail: dto.eventDetail,
            title: dto.title,
            description: dto.description,
            startTime: dto.startTime ? new Date(dto.startTime) : null,
            endTime: dto.endTime ? new Date(dto.endTime) : null,
            finishStatus: dto.finishStatus || ScheduleStatus.pending,
            priority: dto.priority,
            createdById: userId,
            assignedToId: dto.assignedToId,
          },
          include: { ship: true },
        });

        await this.operationLogService.create({
          userId,
          teamCode,
          operationType: '新增',
          operationContent: `批量新增日程：${schedule.firstType}-${schedule.secondType}（ID:${schedule.id}）`,
          ipAddress,
          userAgent,
        });

        created.push(schedule);
      }

      this.logger.log(`批量创建 ${created.length} 条日程（用户ID: ${userId}, 团队: ${teamCode}）`);
      return { created: created.length, data: created };
    } catch (err: any) {
      this.logger.error(`批量创建日程失败: ${err.message}`);
      throw err;
    }
  }

  async remove(id: number, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const schedule = await this.findOne(id, teamCode);

    // 删除日程前，先清理关联的 DiaryScheduleRelation 记录
    await this.prisma.diaryScheduleRelation.deleteMany({
      where: { scheduleId: id },
    });

    await this.prisma.schedule.delete({
      where: { id },
    });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '删除',
      operationContent: `删除日程：${schedule.firstType}-${schedule.secondType}（ID:${id}）`,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  /**
   * 一句话智能解析（对标华为日历"一句话智能创建日程"）
   * 输入："明天下午3点开会" → 输出 { recordDate, startTime, endTime, eventDetail }
   * 纯规则解析，无AI调用，稳定快速。前端拿到后预填到新建弹窗。
   */
  smartParse(text: string): {
    recordDate: string;
    startTime: string | null;
    endTime: string | null;
    eventDetail: string;
    matched: boolean;
  } {
    const now = new Date();
    const result = {
      recordDate: '',
      startTime: null as string | null,
      endTime: null as string | null,
      eventDetail: text,
      matched: false,
    };

    if (!text || !text.trim()) return result;

    // === 1. 解析日期关键词 ===
    let targetDate = new Date(now);
    let dateMatched = false;

    if (/今天|今日/.test(text)) {
      dateMatched = true;
    } else if (/明天|明日/.test(text)) {
      targetDate.setDate(targetDate.getDate() + 1);
      dateMatched = true;
    } else if (/后天/.test(text)) {
      targetDate.setDate(targetDate.getDate() + 2);
      dateMatched = true;
    } else if (/大后天/.test(text)) {
      targetDate.setDate(targetDate.getDate() + 3);
      dateMatched = true;
    } else if (/下周[一二三四五六日天]/.test(text)) {
      const m = text.match(/下周([一二三四五六日天])/);
      if (m) {
        const map: Record<string, number> = { '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
        const targetDow = map[m[1]];
        const curDow = now.getDay();
        let diff = (targetDow - curDow + 7) % 7;
        diff = diff === 0 ? 7 : diff; // "下周一"如果今天是周一，则指下下周一
        targetDate.setDate(targetDate.getDate() + diff);
        dateMatched = true;
      }
    } else if (/本周[一二三四五六日天]/.test(text) || /这周[一二三四五六日天]/.test(text)) {
      const m = text.match(/[本这]周([一二三四五六日天])/);
      if (m) {
        const map: Record<string, number> = { '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
        const targetDow = map[m[1]];
        const curDow = now.getDay();
        let diff = (targetDow - curDow + 7) % 7;
        targetDate.setDate(targetDate.getDate() + diff);
        dateMatched = true;
      }
    } else if (/周[一二三四五六日天]/.test(text)) {
      const m = text.match(/周([一二三四五六日天])/);
      if (m) {
        const map: Record<string, number> = { '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
        const targetDow = map[m[1]];
        const curDow = now.getDay();
        let diff = (targetDow - curDow + 7) % 7;
        targetDate.setDate(targetDate.getDate() + diff);
        dateMatched = true;
      }
    } else if (/\d{1,2}月\d{1,2}日?/.test(text)) {
      const m = text.match(/(\d{1,2})月(\d{1,2})日?/);
      if (m) {
        targetDate.setMonth(Number(m[1]) - 1);
        targetDate.setDate(Number(m[2]));
        dateMatched = true;
      }
    } else if (/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(text)) {
      const m = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      if (m) {
        targetDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        dateMatched = true;
      }
    }

    result.recordDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    // === 2. 解析时间关键词 ===
    let startHour: number | null = null;
    let startMinute: number | null = null;

    // "下午3点" "下午15点" "下午3点半" "15:30" "下午三点"
    const timePatterns = [
      { re: /(上午|早上|早晨)?(\d{1,2})[点时:：](\d{1,2})?分?/, handler: (m: RegExpMatchArray) => {
        let h = Number(m[2]);
        const min = m[3] ? Number(m[3]) : 0;
        if (m[1] && /上午|早上|早晨/.test(m[1]) && h <= 12) {
          // 上午保持
        }
        return { hour: h, minute: min };
      }},
      { re: /(下午|中午|傍晚|晚上|晚)(\d{1,2})[点时:：](\d{1,2})?分?/, handler: (m: RegExpMatchArray) => {
        let h = Number(m[2]);
        const min = m[3] ? Number(m[3]) : 0;
        if (h < 12) h += 12;
        return { hour: h, minute: min };
      }},
      { re: /(\d{1,2}):(\d{1,2})/, handler: (m: RegExpMatchArray) => {
        return { hour: Number(m[1]), minute: Number(m[2]) };
      }},
      { re: /(上午|早上|早晨)(\d{1,2})[点时]/, handler: (m: RegExpMatchArray) => {
        return { hour: Number(m[2]), minute: 0 };
      }},
      { re: /(下午|中午|傍晚|晚上|晚)(\d{1,2})[点时]/, handler: (m: RegExpMatchArray) => {
        let h = Number(m[2]);
        if (h < 12) h += 12;
        return { hour: h, minute: 0 };
      }},
      { re: /(\d{1,2})[点时]半/, handler: (m: RegExpMatchArray) => {
        return { hour: Number(m[1]), minute: 30 };
      }},
      { re: /(下午|中午|傍晚|晚上|晚)(\d{1,2})半/, handler: (m: RegExpMatchArray) => {
        let h = Number(m[2]);
        if (h < 12) h += 12;
        return { hour: h, minute: 30 };
      }},
    ];

    for (const tp of timePatterns) {
      const m = text.match(tp.re);
      if (m) {
        const r = tp.handler(m);
        if (r.hour !== null && r.hour >= 0 && r.hour <= 23 && r.minute >= 0 && r.minute <= 59) {
          startHour = r.hour;
          startMinute = r.minute;
          break;
        }
      }
    }

    // 中文数字转换
    if (startHour === null) {
      const cnMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12 };
      const m1 = text.match(/下午([一二三四五六七八九十]+)点/);
      if (m1) {
        const h = cnMap[m1[1]];
        if (h) { startHour = h < 12 ? h + 12 : h; startMinute = 0; }
      }
      if (startHour === null) {
        const m2 = text.match(/上午([一二三四五六七八九十]+)点/);
        if (m2) {
          const h = cnMap[m2[1]];
          if (h) { startHour = h; startMinute = 0; }
        }
      }
    }

    if (startHour !== null && startMinute !== null) {
      const startTime = new Date(targetDate);
      startTime.setHours(startHour, startMinute, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1); // 默认1小时
      result.startTime = `${result.recordDate} ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
      result.endTime = `${result.recordDate} ${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:00`;
    }

    // === 3. 解析事件详情（去掉日期时间关键词后剩下的文本） ===
    let detail = text
      .replace(/今天|今日|明天|明日|后天|大后天/g, '')
      .replace(/下周[一二三四五六日天]/g, '')
      .replace(/[本这]周[一二三四五六日天]/g, '')
      .replace(/周[一二三四五六日天]/g, '')
      .replace(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g, '')
      .replace(/\d{1,2}月\d{1,2}日?/g, '')
      .replace(/(上午|早上|早晨|下午|中午|傍晚|晚上|晚)/g, '')
      .replace(/\d{1,2}[点时:：]\d{1,2}分?/g, '')
      .replace(/\d{1,2}:\d{1,2}/g, '')
      .replace(/\d{1,2}[点时]半/g, '')
      .replace(/\d{1,2}[点时]/g, '')
      .replace(/(下午|中午|傍晚|晚上|晚)([一二三四五六七八九十]+)半/g, '')
      .replace(/下午([一二三四五六七八九十]+)点/g, '')
      .replace(/上午([一二三四五六七八九十]+)点/g, '')
      .replace(/[，,。、\s]+/g, ' ')
      .trim();
    result.eventDetail = detail || text;

    result.matched = dateMatched || startHour !== null;
    return result;
  }
}
