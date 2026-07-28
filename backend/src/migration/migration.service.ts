import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MigrationStats {
  teamCode: string;
  totalDiaries: number;
  totalSchedules: number;
  existingRelations: number;
  matchedDiaries: number;
  unmatchedDiaries: number;
  newRelations: number;
}

export interface UnmatchedDiary {
  id: number;
  date: string;
  shipName: string | null;
  categoryFirst: string | null;
  categorySecond: string | null;
  reason: string;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 预览迁移数据（不执行实际迁移）
   */
  async previewMigration(teamCode: string): Promise<{
    stats: MigrationStats;
    unmatchedDiaries: UnmatchedDiary[];
  }> {
    this.logger.log(`预览迁移: ${teamCode}`);

    // 1. 加载船舶映射
    const ships = await this.prisma.ship.findMany({
      where: { teamCode: teamCode as any },
      select: { id: true, cnShipName: true },
    });
    const shipNameToId = new Map<string, number>();
    for (const s of ships) {
      if (s.cnShipName) shipNameToId.set(s.cnShipName, s.id);
    }

    // 2. 加载日记
    const diaries = await this.prisma.diary.findMany({
      where: { teamCode: teamCode as any },
      select: {
        id: true,
        date: true,
        shipName: true,
        categoryFirst: true,
        categorySecond: true,
      },
      orderBy: { date: 'desc' },
    });

    // 3. 加载日程
    const schedules = await this.prisma.schedule.findMany({
      where: {
        teamCode: teamCode as any,
        OR: [
          { finishStatus: 'completed' },
          { finishStatus: 'in_progress' },
        ],
      },
      select: {
        id: true,
        recordDate: true,
        shipId: true,
        firstType: true,
        secondType: true,
      },
    });

    // 4. 建立索引
    const scheduleIndex = new Map<string, number[]>();
    for (const s of schedules) {
      if (!s.recordDate) continue;
      const dateStr = new Date(s.recordDate).toISOString().split('T')[0];
      const key = `${dateStr}||${s.shipId || 'null'}||${s.firstType || ''}||${s.secondType || ''}`;
      if (!scheduleIndex.has(key)) {
        scheduleIndex.set(key, []);
      }
      scheduleIndex.get(key)!.push(s.id);
    }

    // 5. 已有关联
    const existingRelations = await this.prisma.diaryScheduleRelation.findMany({
      where: { teamCode: teamCode as any },
      select: { diaryId: true, scheduleId: true },
    });
    const existingRelationSet = new Set<string>();
    for (const r of existingRelations) {
      existingRelationSet.add(`${r.diaryId}-${r.scheduleId}`);
    }

    // 6. 匹配
    let matchedDiaries = 0;
    const unmatchedDiaries: UnmatchedDiary[] = [];

    for (const diary of diaries) {
      if (!diary.date) {
        unmatchedDiaries.push({
          id: diary.id,
          date: '',
          shipName: diary.shipName,
          categoryFirst: diary.categoryFirst,
          categorySecond: diary.categorySecond,
          reason: '日记无日期字段',
        });
        continue;
      }

      const dateStr = typeof diary.date === 'string'
        ? diary.date
        : new Date(diary.date as any).toISOString().split('T')[0];

      const shipId = diary.shipName ? shipNameToId.get(diary.shipName) : null;

      const matchKeys = [
        `${dateStr}||${shipId || 'null'}||${diary.categoryFirst || ''}||${diary.categorySecond || ''}`,
      ];

      if (shipId !== null) {
        matchKeys.push(`${dateStr}||null||${diary.categoryFirst || ''}||${diary.categorySecond || ''}`);
      }
      if (diary.categoryFirst) {
        matchKeys.push(`${dateStr}||${shipId || 'null'}||${diary.categoryFirst}||`);
        if (shipId !== null) {
          matchKeys.push(`${dateStr}||null||${diary.categoryFirst}||`);
        }
      }

      let foundMatches = false;
      for (const key of matchKeys) {
        const matches = scheduleIndex.get(key);
        if (matches && matches.length > 0) {
          foundMatches = true;
          break;
        }
      }

      if (foundMatches) {
        matchedDiaries++;
      } else {
        const reasons: string[] = [];
        if (!diary.categoryFirst && !diary.categorySecond) {
          reasons.push('无分类信息');
        }
        if (!diary.shipName) {
          reasons.push('无船舶信息');
        }
        if (reasons.length === 0) {
          reasons.push('无匹配日程');
        }

        unmatchedDiaries.push({
          id: diary.id,
          date: dateStr,
          shipName: diary.shipName,
          categoryFirst: diary.categoryFirst,
          categorySecond: diary.categorySecond,
          reason: reasons.join('; '),
        });
      }
    }

    return {
      stats: {
        teamCode,
        totalDiaries: diaries.length,
        totalSchedules: schedules.length,
        existingRelations: existingRelations.length,
        matchedDiaries,
        unmatchedDiaries: unmatchedDiaries.length,
        newRelations: 0, // 预览时不计算
      },
      unmatchedDiaries: unmatchedDiaries.slice(0, 50), // 最多返回 50 条
    };
  }

  /**
   * 执行迁移
   */
  async executeMigration(teamCode: string): Promise<MigrationStats> {
    this.logger.log(`执行迁移: ${teamCode}`);

    // 1. 加载船舶映射
    const ships = await this.prisma.ship.findMany({
      where: { teamCode: teamCode as any },
      select: { id: true, cnShipName: true },
    });
    const shipNameToId = new Map<string, number>();
    for (const s of ships) {
      if (s.cnShipName) shipNameToId.set(s.cnShipName, s.id);
    }

    // 2. 加载日记
    const diaries = await this.prisma.diary.findMany({
      where: { teamCode: teamCode as any },
      select: {
        id: true,
        date: true,
        shipName: true,
        categoryFirst: true,
        categorySecond: true,
      },
      orderBy: { date: 'desc' },
    });

    // 3. 加载日程
    const schedules = await this.prisma.schedule.findMany({
      where: {
        teamCode: teamCode as any,
        OR: [
          { finishStatus: 'completed' },
          { finishStatus: 'in_progress' },
        ],
      },
      select: {
        id: true,
        recordDate: true,
        shipId: true,
        firstType: true,
        secondType: true,
      },
    });

    // 4. 建立索引
    const scheduleIndex = new Map<string, number[]>();
    for (const s of schedules) {
      if (!s.recordDate) continue;
      const dateStr = new Date(s.recordDate).toISOString().split('T')[0];
      const key = `${dateStr}||${s.shipId || 'null'}||${s.firstType || ''}||${s.secondType || ''}`;
      if (!scheduleIndex.has(key)) {
        scheduleIndex.set(key, []);
      }
      scheduleIndex.get(key)!.push(s.id);
    }

    // 5. 已有关联
    const existingRelations = await this.prisma.diaryScheduleRelation.findMany({
      where: { teamCode: teamCode as any },
      select: { diaryId: true, scheduleId: true },
    });
    const existingRelationSet = new Set<string>();
    for (const r of existingRelations) {
      existingRelationSet.add(`${r.diaryId}-${r.scheduleId}`);
    }

    // 6. 执行迁移
    let matchedDiaries = 0;
    let newRelations = 0;

    for (const diary of diaries) {
      if (!diary.date) continue;

      const dateStr = typeof diary.date === 'string'
        ? diary.date
        : new Date(diary.date as any).toISOString().split('T')[0];

      const shipId = diary.shipName ? shipNameToId.get(diary.shipName) : null;

      const matchKeys = [
        `${dateStr}||${shipId || 'null'}||${diary.categoryFirst || ''}||${diary.categorySecond || ''}`,
      ];

      if (shipId !== null) {
        matchKeys.push(`${dateStr}||null||${diary.categoryFirst || ''}||${diary.categorySecond || ''}`);
      }
      if (diary.categoryFirst) {
        matchKeys.push(`${dateStr}||${shipId || 'null'}||${diary.categoryFirst}||`);
        if (shipId !== null) {
          matchKeys.push(`${dateStr}||null||${diary.categoryFirst}||`);
        }
      }

      let foundMatches: number[] = [];
      for (const key of matchKeys) {
        const matches = scheduleIndex.get(key);
        if (matches && matches.length > 0) {
          foundMatches = [...foundMatches, ...matches];
        }
      }

      foundMatches = [...new Set(foundMatches)];

      if (foundMatches.length > 0) {
        matchedDiaries++;
        for (const scheduleId of foundMatches) {
          const relationKey = `${diary.id}-${scheduleId}`;
          if (!existingRelationSet.has(relationKey)) {
            try {
              await this.prisma.diaryScheduleRelation.create({
                data: {
                  teamCode: teamCode as any,
                  diaryId: diary.id,
                  scheduleId,
                },
              });
              existingRelationSet.add(relationKey);
              newRelations++;
            } catch (err: any) {
              if (!String(err.message).includes('Unique constraint')) {
                this.logger.warn(`创建关联失败: ${err.message}`);
              }
            }
          }
        }
      }
    }

    return {
      teamCode,
      totalDiaries: diaries.length,
      totalSchedules: schedules.length,
      existingRelations: existingRelations.length,
      matchedDiaries,
      unmatchedDiaries: diaries.length - matchedDiaries,
      newRelations,
    };
  }
}
