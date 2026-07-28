import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode, UserRole, ScheduleStatus } from '@prisma/client';

export type DataSource = 'diary' | 'schedule';

export interface DashboardStat {
  categoryFirst: string;
  categorySecond: string;
  shipCount: number;
  shipNames: string[];
  diaryCount: number;
  total?: number;
  completed?: number;
  inProgress?: number;
  pending?: number;
  completionRate?: number;
  involvedUserIds?: number[];
}

export interface ScheduleStat {
  categoryFirst: string;
  categorySecond: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
  shipCount: number;
  shipNames: string[];
  involvedUserIds: number[];
}

export interface DiarySupplement {
  scheduleId: number;
  scheduleTitle: string;
  diaryId: number;
  diaryContent: string;
  categoryFirst: string;
  categorySecond: string;
  diaryUserId: number;
  diaryUserName: string;
}

export interface ExportExcelRow {
  categoryFirst: string;
  categorySecond: string;
  shipName: string;
  assigneeName: string;
  title: string;
  eventDetail: string;
  finishStatus: string;
  completionRate: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * 获取指定日期的统计数据
   * 当 dataSource = 'schedule' 时，从 Schedule 表查询；
   * 当 dataSource = 'diary' 或未指定时，保持原有 Diary 逻辑（向后兼容）。
   */
  async getDashboardStats(
    teamCode: TeamCode,
    date: Date,
    dataSource: DataSource = 'diary',
  ) {
    if (dataSource === 'schedule') {
      this.logger.log(`[Schedule] 获取看板统计（团队: ${teamCode}, 日期: ${date.toISOString().slice(0, 10)}）`);
      return this.getStatsFromSchedule(teamCode, date);
    }

    this.logger.log(`[Diary] 获取看板统计（团队: ${teamCode}, 日期: ${date.toISOString().slice(0, 10)}）`);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 获取所有启用的标题
    const titles = await this.prisma.userTitle.findMany({
      where: { teamCode, role: 'shore_crew_supervisor' as UserRole, isActive: true },
      orderBy: [{ categoryFirst: 'asc' }, { categorySecond: 'asc' }],
    });

    // 获取该日期所有政委提交的日记
    const diaries = await this.prisma.diary.findMany({
      where: {
        teamCode,
        date: { gte: startOfDay, lte: endOfDay },
        categoryFirst: { not: null },
        categorySecond: { not: null },
      },
    });

    // 按标题统计
    const statsMap: Record<string, { shipNames: Set<string>; diaryCount: number }> = {};

    for (const title of titles) {
      const key = `${title.categoryFirst}|||${title.categorySecond}`;
      statsMap[key] = { shipNames: new Set(), diaryCount: 0 };
    }

    for (const diary of diaries) {
      if (diary.categoryFirst && diary.categorySecond) {
        const key = `${diary.categoryFirst}|||${diary.categorySecond}`;
        if (!statsMap[key]) {
          statsMap[key] = { shipNames: new Set(), diaryCount: 0 };
        }
        statsMap[key].diaryCount++;
        if (diary.shipName) {
          statsMap[key].shipNames.add(diary.shipName);
        }
      }
    }

    // 转换为数组格式
    const stats: DashboardStat[] = [];
    for (const [key, value] of Object.entries(statsMap)) {
      const [categoryFirst, categorySecond] = key.split('|||');
      stats.push({
        categoryFirst,
        categorySecond,
        shipCount: value.shipNames.size,
        shipNames: Array.from(value.shipNames),
        diaryCount: value.diaryCount,
      });
    }

    return stats;
  }

  /**
   * 从 Schedule 表按 firstType/secondType 分组统计
   */
  private async getStatsFromSchedule(teamCode: TeamCode, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        teamCode,
        recordDate: { gte: startOfDay, lte: endOfDay },
      },
      include: { ship: { select: { cnShipName: true } } },
    });

    const categoryMap = new Map<
      string,
      {
        categoryFirst: string;
        categorySecond: string;
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        shipNames: Set<string>;
        involvedUserIds: Set<number>;
      }
    >();

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
          shipNames: new Set(),
          involvedUserIds: new Set(),
        };
        categoryMap.set(key, entry);
      }
      entry.total += 1;
      if (s.finishStatus === ScheduleStatus.completed) entry.completed += 1;
      else if (s.finishStatus === ScheduleStatus.in_progress) entry.inProgress += 1;
      else if (s.finishStatus === ScheduleStatus.pending) entry.pending += 1;

      if (s.ship?.cnShipName) entry.shipNames.add(s.ship.cnShipName);
      if (s.createdById) entry.involvedUserIds.add(s.createdById);
      if (s.assignedToId) entry.involvedUserIds.add(s.assignedToId);
    }

    return Array.from(categoryMap.values()).map((e): DashboardStat => ({
      categoryFirst: e.categoryFirst,
      categorySecond: e.categorySecond,
      shipCount: e.shipNames.size,
      shipNames: Array.from(e.shipNames),
      diaryCount: 0,
      total: e.total,
      completed: e.completed,
      inProgress: e.inProgress,
      pending: e.pending,
      completionRate: e.total > 0 ? Number((e.completed / e.total).toFixed(4)) : 0,
      involvedUserIds: Array.from(e.involvedUserIds),
    }));
  }

  /**
   * 获取船舶列表（按标题分组）
   * 当 dataSource = 'schedule' 时，从 Schedule 表查询；
   * 当 dataSource = 'diary' 或未指定时，保持原有 Diary 逻辑。
   */
  async getShipsByCategory(
    teamCode: TeamCode,
    date: Date,
    dataSource: DataSource = 'diary',
  ) {
    if (dataSource === 'schedule') {
      this.logger.log(`[Schedule] 获取船舶按类别分组（团队: ${teamCode}, 日期: ${date.toISOString().slice(0, 10)}）`);
      return this.getShipsFromSchedule(teamCode, date);
    }

    this.logger.log(`[Diary] 获取船舶按类别分组（团队: ${teamCode}, 日期: ${date.toISOString().slice(0, 10)}）`);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const diaries = await this.prisma.diary.findMany({
      where: {
        teamCode,
        date: { gte: startOfDay, lte: endOfDay },
        categoryFirst: { not: null },
        categorySecond: { not: null },
      },
      orderBy: { date: 'desc' },
    });

    const grouped: Record<string, Record<string, { shipName: string; date: Date; diaryId: number }[]>> = {};

    for (const diary of diaries) {
      if (!diary.categoryFirst || !diary.categorySecond) continue;

      if (!grouped[diary.categoryFirst]) {
        grouped[diary.categoryFirst] = {};
      }
      if (!grouped[diary.categoryFirst][diary.categorySecond]) {
        grouped[diary.categoryFirst][diary.categorySecond] = [];
      }

      grouped[diary.categoryFirst][diary.categorySecond].push({
        shipName: diary.shipName || '未知船舶',
        date: diary.date,
        diaryId: diary.id,
      });
    }

    return grouped;
  }

  /**
   * 从 Schedule 表按 firstType/secondType 分组获取船舶列表
   */
  private async getShipsFromSchedule(teamCode: TeamCode, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        teamCode,
        recordDate: { gte: startOfDay, lte: endOfDay },
      },
      include: { ship: { select: { cnShipName: true } } },
      orderBy: { recordDate: 'desc' },
    });

    const grouped: Record<string, Record<string, { shipName: string; date: Date; scheduleId: number; finishStatus: string }[]>> = {};

    for (const s of schedules) {
      if (!grouped[s.firstType]) {
        grouped[s.firstType] = {};
      }
      if (!grouped[s.firstType][s.secondType]) {
        grouped[s.firstType][s.secondType] = [];
      }

      grouped[s.firstType][s.secondType].push({
        shipName: s.ship?.cnShipName || '未指定船舶',
        date: s.recordDate,
        scheduleId: s.id,
        finishStatus: s.finishStatus,
      });
    }

    return grouped;
  }

  /**
   * 获取日期范围内的统计趋势
   * 当 dataSource = 'schedule' 时，从 Schedule 表查询；
   * 当 dataSource = 'diary' 或未指定时，保持原有 Diary 逻辑。
   */
  async getTrendStats(
    teamCode: TeamCode,
    startDate: Date,
    endDate: Date,
    dataSource: DataSource = 'diary',
  ) {
    if (dataSource === 'schedule') {
      this.logger.log(`[Schedule] 获取趋势统计（团队: ${teamCode}, 范围: ${startDate.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}）`);
      return this.getTrendFromSchedule(teamCode, startDate, endDate);
    }

    this.logger.log(`[Diary] 获取趋势统计（团队: ${teamCode}, 范围: ${startDate.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}）`);
    const diaries = await this.prisma.diary.findMany({
      where: {
        teamCode,
        date: { gte: startDate, lte: endDate },
        categoryFirst: { not: null },
        categorySecond: { not: null },
      },
    });

    const dailyStats: Record<string, Record<string, number>> = {};

    for (const diary of diaries) {
      const dateKey = diary.date.toISOString().split('T')[0];
      const titleKey = `${diary.categoryFirst}|||${diary.categorySecond}`;

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {};
      }
      if (!dailyStats[dateKey][titleKey]) {
        dailyStats[dateKey][titleKey] = 0;
      }
      dailyStats[dateKey][titleKey]++;
    }

    return dailyStats;
  }

  /**
   * 从 Schedule 表按日期 / firstType/secondType 分组获取趋势
   */
  private async getTrendFromSchedule(teamCode: TeamCode, startDate: Date, endDate: Date) {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        teamCode,
        recordDate: { gte: startDate, lte: endDate },
      },
      orderBy: { recordDate: 'asc' },
    });

    const dailyStats: Record<
      string,
      { total: number; completed: number; byCategory: Record<string, number> }
    > = {};

    for (const s of schedules) {
      const dateKey = s.recordDate.toISOString().slice(0, 10);
      const categoryKey = `${s.firstType}||${s.secondType}`;

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { total: 0, completed: 0, byCategory: {} };
      }
      dailyStats[dateKey].total += 1;
      if (s.finishStatus === ScheduleStatus.completed) dailyStats[dateKey].completed += 1;

      if (!dailyStats[dateKey].byCategory[categoryKey]) {
        dailyStats[dateKey].byCategory[categoryKey] = 0;
      }
      dailyStats[dateKey].byCategory[categoryKey] += 1;
    }

    return dailyStats;
  }

  /**
   * 新增：获取当日 Schedule 口径的统计（类似 ScheduleService.getDailyStats）
   */
  async getScheduleStats(teamCode: TeamCode, date: Date): Promise<ScheduleStat[]> {
    try {
      this.logger.log(`[ScheduleStats] 获取日程统计（团队: ${teamCode}, 日期: ${date.toISOString().slice(0, 10)}）`);

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

      const categoryMap = new Map<
        string,
        {
          categoryFirst: string;
          categorySecond: string;
          total: number;
          completed: number;
          inProgress: number;
          pending: number;
          shipIds: Set<number | null>;
          shipNames: Set<string>;
          involvedUserIds: Set<number>;
        }
      >();

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

      const result = Array.from(categoryMap.values()).map((e): ScheduleStat => ({
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

      this.logger.log(`[ScheduleStats] 共 ${result.length} 个类别，总任务数: ${result.reduce((a, b) => a + b.total, 0)}`);
      return result;
    } catch (err: any) {
      this.logger.error(`获取日程统计失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 新增：返回当日有日记详情补充的日程列表（用于"哪些任务有复盘"显示）
   * 查询逻辑：Diary 表中该日期的所有记录 + 通过 DiaryScheduleRelation 关联查询对应的 Schedule
   */
  async getDiarySupplement(teamCode: TeamCode, date: Date): Promise<DiarySupplement[]> {
    try {
      this.logger.log(`[DiarySupplement] 获取日记补充日程（团队: ${teamCode}, 日期: ${date.toISOString().slice(0, 10)}）`);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Step 1: 查询当日的 Diary 及其关联的 Schedule（通过 Diary 模型的反向关系）
      const diariesWithSchedules = await this.prisma.diary.findMany({
        where: {
          teamCode,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (diariesWithSchedules.length === 0) {
        this.logger.log('[DiarySupplement] 当日无日记');
        return [];
      }

      // 单独查询关联关系（通过 Diary 的反向关系查询 schedule）
      const diaryIds = diariesWithSchedules.map((d) => d.id);
      const userIds = [...new Set(diariesWithSchedules.map((d) => d.userId))];
      const diaryMap = new Map(diariesWithSchedules.map((d) => [d.id, d]));

      // Step 2: 通过 $queryRaw 直接查询关联表（绕开 Prisma Client 生成的类型限制）
      const relations: { diary_id: number; schedule_id: number }[] =
        await this.prisma.$queryRawUnsafe(
          `SELECT diary_id, schedule_id FROM "DiaryScheduleRelation" WHERE diary_id = ANY($1::int[])`,
          [diaryIds],
        );

      const scheduleIdsSet = new Set<number>();
      const diaryToSchedules = new Map<number, number[]>();
      for (const rel of relations as any[]) {
        const dId = Number(rel.diary_id);
        const sId = Number(rel.schedule_id);
        scheduleIdsSet.add(sId);
        if (!diaryToSchedules.has(dId)) diaryToSchedules.set(dId, []);
        diaryToSchedules.get(dId)!.push(sId);
      }

      // Step 3: 查询关联的 Schedule
      let scheduleMap = new Map<number, { id: number; title: string | null; firstType: string; secondType: string }>();
      if (scheduleIdsSet.size > 0) {
        const schedules = await this.prisma.schedule.findMany({
          where: { id: { in: Array.from(scheduleIdsSet) } },
          select: { id: true, title: true, firstType: true, secondType: true },
        });
        scheduleMap = new Map(schedules.map((s) => [s.id, s]));
      }

      // Step 4: 查询 User 的 realName
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, realName: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.realName]));

      // Step 5: 组装结果
      const result: DiarySupplement[] = [];
      for (const [diaryId, scheduleIds] of diaryToSchedules.entries()) {
        const diary = diaryMap.get(diaryId);
        if (!diary) continue;

        for (const sId of scheduleIds) {
          const schedule = scheduleMap.get(sId);
          if (!schedule) continue;

          result.push({
            scheduleId: schedule.id,
            scheduleTitle: schedule.title || `${schedule.firstType} - ${schedule.secondType}`,
            diaryId: diary.id,
            diaryContent: diary.content,
            categoryFirst: schedule.firstType || diary.categoryFirst || '',
            categorySecond: schedule.secondType || diary.categorySecond || '',
            diaryUserId: diary.userId,
            diaryUserName: userMap.get(diary.userId) || `用户#${diary.userId}`,
          });
        }
      }

      this.logger.log(`[DiarySupplement] 共找到 ${result.length} 条有日记补充的日程`);
      return result;
    } catch (err: any) {
      this.logger.error(`获取日记补充失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 新增：按日程口径导出当日工作报表的扁平化数据（便于前端生成 Excel）
   */
  async exportExcelData(teamCode: TeamCode, date: Date): Promise<ExportExcelRow[]> {
    try {
      this.logger.log(`[ExportExcel] 导出日程数据（团队: ${teamCode}, 日期: ${date.toISOString().slice(0, 10)}）`);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const schedules = await this.prisma.schedule.findMany({
        where: {
          teamCode,
          recordDate: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          ship: { select: { cnShipName: true } },
          assignedTo: { select: { realName: true } },
        },
        orderBy: [{ firstType: 'asc' }, { secondType: 'asc' }],
      });

      // 为了计算每个类别的 completionRate，先统计每个类别的总数和已完成数
      const categoryTotal = new Map<string, number>();
      const categoryCompleted = new Map<string, number>();

      for (const s of schedules) {
        const key = `${s.firstType}||${s.secondType}`;
        categoryTotal.set(key, (categoryTotal.get(key) || 0) + 1);
        if (s.finishStatus === ScheduleStatus.completed) {
          categoryCompleted.set(key, (categoryCompleted.get(key) || 0) + 1);
        }
      }

      const result = schedules.map((s): ExportExcelRow => {
        const key = `${s.firstType}||${s.secondType}`;
        const total = categoryTotal.get(key) || 0;
        const completed = categoryCompleted.get(key) || 0;

        return {
          categoryFirst: s.firstType,
          categorySecond: s.secondType,
          shipName: s.ship?.cnShipName || '未指定船舶',
          assigneeName: s.assignedTo?.realName || '未指派',
          title: s.title || '',
          eventDetail: s.eventDetail || '',
          finishStatus: s.finishStatus,
          completionRate: total > 0 ? Number((completed / total).toFixed(4)) : 0,
        };
      });

      this.logger.log(`[ExportExcel] 共导出 ${result.length} 行数据`);
      return result;
    } catch (err: any) {
      this.logger.error(`导出日程数据失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * P2-7: 获取自定义看板指标（基于模板的 dashboardMetrics 配置）
   */
  async getCustomDashboard(teamCode: string, templateId?: number) {
    const where: any = { teamCode: teamCode as any, isActive: true, isPublished: true };
    if (templateId) where.id = templateId;

    const templates = await this.prisma.publishTemplate.findMany({
      where,
      select: {
        id: true,
        title: true,
        templateType: true,
        templateDesc: true,
        dashboardMetrics: true,
        aiEnabled: true,
      },
      orderBy: { usageCount: 'desc' },
    });

    const result = [];
    for (const template of templates) {
      const metrics = (template.dashboardMetrics as any[]) || [];
      if (metrics.length === 0) continue;

      const submissions = await this.prisma.shipTaskStatus.findMany({
        where: { teamCode: teamCode as any, templateId: template.id },
      });

      const totalSubmissions = submissions.length;
      const completedSubmissions = submissions.filter((s) => s.status === 'completed').length;

      const computedMetrics = [];
      for (const def of metrics) {
        const values = submissions
          .filter((s) => s.responseData)
          .map((s) => (s.responseData as any)?.[def.field])
          .filter((v) => v !== null && v !== undefined);

        if (values.length === 0) {
          computedMetrics.push({ code: def.code, label: def.label, value: 0, type: def.type, count: 0 });
          continue;
        }

        if (def.type === 'average' && typeof values[0] === 'number') {
          const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
          computedMetrics.push({
            code: def.code,
            label: def.label,
            value: Math.round(avg * 10) / 10,
            type: 'average',
            count: values.length,
          });
        } else if (def.type === 'sum' && typeof values[0] === 'number') {
          const sum = values.reduce((a: number, b: number) => a + b, 0);
          computedMetrics.push({ code: def.code, label: def.label, value: sum, type: 'sum', count: values.length });
        } else if (def.type === 'count') {
          const condition = def.condition;
          const count = condition
            ? values.filter((v: any) => v === condition || String(v).includes(condition)).length
            : values.length;
          computedMetrics.push({
            code: def.code,
            label: def.label,
            value: count,
            type: 'count',
            total: totalSubmissions,
          });
        } else if (def.type === 'rate') {
          const trueCount = values.filter((v: any) => v === true || v === 'true' || v === '是').length;
          const rate = values.length > 0 ? Math.round((trueCount / values.length) * 100) : 0;
          computedMetrics.push({
            code: def.code,
            label: def.label,
            value: rate,
            type: 'rate',
            unit: '%',
            total: values.length,
            trueCount,
          });
        } else if (def.type === 'line_chart') {
          const trend = values.map((v: any, i: number) => ({ index: i, value: v }));
          computedMetrics.push({
            code: def.code,
            label: def.label,
            value: trend,
            type: 'line_chart',
            count: values.length,
          });
        }
      }

      result.push({
        templateId: template.id,
        templateTitle: template.title,
        templateType: template.templateType,
        templateDesc: template.templateDesc,
        aiEnabled: template.aiEnabled,
        stats: { totalSubmissions, completedSubmissions },
        metrics: computedMetrics,
      });
    }

    return result;
  }
}
