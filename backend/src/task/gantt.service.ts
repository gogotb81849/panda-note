import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

export interface GanttTaskItem {
  id: number;
  title: string;
  category?: string;
  category2?: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  ganttStartDate: Date | null;
  ganttEndDate: Date | null;
  targetCount: number | null;
  ganttMode: string | null;
  completedCount: number;
  progress: number;
  isOverdue: boolean;
  children: GanttTaskItem[];
  assignedTo?: { id: number; realName: string } | null;
}

export interface GanttShipStatus {
  shipId: number;
  shipName: string;
  status: 'completed' | 'overdue' | 'pending' | 'in_progress';
  completedAt: Date | null;
}

export interface GanttDataResponse {
  tasks: GanttTaskItem[];
  dateRange: { start: Date; end: Date };
}

@Injectable()
export class GanttService {
  constructor(private prisma: PrismaService) {}

  async getGanttData(
    teamCode: TeamCode,
    startDate: string,
    endDate: string,
  ): Promise<GanttDataResponse> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // 获取所有根任务和子任务
    const allTasks = await this.prisma.task.findMany({
      where: {
        teamCode,
        OR: [
          // 有甘特图日期范围的任务
          {
            AND: [
              { ganttStartDate: { lte: end } },
              { OR: [{ ganttEndDate: { gte: start } }, { dueDate: { gte: start } }] },
            ],
          },
          // 或者在日期范围内有截止日期的任务
          {
            dueDate: { gte: start, lte: end },
          },
        ],
      },
      include: {
        assignedTo: { select: { id: true, realName: true } },
        schedules: {
          select: { id: true, finishStatus: true, shipId: true, recordDate: true },
        },
        children: {
          include: {
            assignedTo: { select: { id: true, realName: true } },
            schedules: {
              select: { id: true, finishStatus: true, shipId: true, recordDate: true },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // 获取船舶信息
    const ships = await this.prisma.ship.findMany({
      where: { teamCode },
      select: { id: true, cnShipName: true },
    });

    const shipMap = new Map(ships.map((s) => [s.id, s.cnShipName]));

    // 构建树形结构并计算进度
    const rootTasks = allTasks.filter((t) => !t.parentId);

    const tasks: GanttTaskItem[] = rootTasks.map((task) =>
      this.buildGanttTask(task, allTasks, shipMap, now),
    );

    return {
      tasks,
      dateRange: { start, end },
    };
  }

  private buildGanttTask(
    task: any,
    allTasks: any[],
    shipMap: Map<number, string>,
    now: Date,
  ): GanttTaskItem {
    const children = allTasks
      .filter((t) => t.parentId === task.id)
      .map((child) => this.buildGanttTask(child, allTasks, shipMap, now));

    // 计算完成数量
    const schedules = task.schedules || [];
    const completedCount = schedules.filter(
      (s: any) => s.finishStatus === 'completed',
    ).length;

    // 确定目标数量：使用 targetCount 字段，如果没有则用 schedule 数量或 children 数量
    const targetCount =
      task.targetCount || schedules.length || children.length || 1;

    // 计算进度百分比
    const progress =
      targetCount > 0 ? Math.round((completedCount / targetCount) * 100) : 0;

    // 判断是否逾期
    const dueDate = task.dueDate || task.ganttEndDate;
    const isOverdue =
      dueDate !== null &&
      dueDate < now &&
      task.status !== 'completed' &&
      task.status !== 'cancelled';

    // 确定甘特图模式
    let ganttMode = task.ganttMode;
    if (!ganttMode) {
      if (targetCount > 1 && (task.ganttStartDate || task.ganttEndDate)) {
        ganttMode = 'multi-target';
      } else if (children.length > 0) {
        ganttMode = 'traditional';
      } else {
        ganttMode = 'simple';
      }
    }

    return {
      id: task.id,
      title: task.title,
      category: task.category,
      category2: task.category2,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      ganttStartDate: task.ganttStartDate,
      ganttEndDate: task.ganttEndDate,
      targetCount,
      ganttMode,
      completedCount,
      progress,
      isOverdue,
      children,
      assignedTo: task.assignedTo,
    };
  }

  async getTaskProgress(taskId: number): Promise<{
    progress: number;
    completedCount: number;
    targetCount: number;
    status: string;
    isOverdue: boolean;
    shipStatuses: GanttShipStatus[];
  }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        schedules: {
          select: {
            id: true,
            finishStatus: true,
            shipId: true,
            recordDate: true,
            updatedAt: true,
          },
        },
        children: {
          select: {
            id: true,
            status: true,
            schedules: {
              select: { finishStatus: true, shipId: true, updatedAt: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const now = new Date();
    const dueDate = task.dueDate || task.ganttEndDate;
    const isOverdue =
      dueDate !== null &&
      dueDate < now &&
      task.status !== 'completed' &&
      task.status !== 'cancelled';

    // 计算进度
    const allSchedules = [...task.schedules];
    const childSchedules = task.children.flatMap((c) => c.schedules);
    const combinedSchedules = [...allSchedules, ...childSchedules];

    const completedCount = combinedSchedules.filter(
      (s) => s.finishStatus === 'completed',
    ).length;

    const targetCount =
      task.targetCount || combinedSchedules.length || 1;
    const progress =
      targetCount > 0 ? Math.round((completedCount / targetCount) * 100) : 0;

    // 按船舶分组计算状态
    const shipStatusMap = new Map<
      number,
      { status: string; completedAt: Date | null }
    >();

    for (const schedule of combinedSchedules) {
      if (!schedule.shipId) continue;
      const existing = shipStatusMap.get(schedule.shipId);
      if (!existing) {
        shipStatusMap.set(schedule.shipId, {
          status: schedule.finishStatus,
          completedAt: schedule.finishStatus === 'completed' ? schedule.updatedAt : null,
        });
      } else if (schedule.finishStatus === 'completed') {
        existing.status = 'completed';
        existing.completedAt = schedule.updatedAt;
      }
    }

    const shipIds = await this.prisma.schedule.findMany({
      where: { taskId },
      select: { shipId: true },
      distinct: ['shipId'],
    });

    const shipStatuses: GanttShipStatus[] = shipIds
      .filter((s) => s.shipId)
      .map((s) => {
        const info = shipStatusMap.get(s.shipId!);
        const due = dueDate || now;
        const isShipOverdue =
          info?.status !== 'completed' && due < now;

        return {
          shipId: s.shipId!,
          shipName: '', // Will be filled by caller if needed
          status:
            info?.status === 'completed'
              ? 'completed'
              : isShipOverdue
                ? 'overdue'
                : (info?.status as any) || 'pending',
          completedAt: info?.completedAt || null,
        };
      });

    return {
      progress,
      completedCount,
      targetCount,
      status: task.status,
      isOverdue,
      shipStatuses,
    };
  }

  async getShipTaskStatus(taskId: number): Promise<GanttShipStatus[]> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        schedules: {
          select: {
            finishStatus: true,
            shipId: true,
            updatedAt: true,
          },
        },
        children: {
          select: {
            schedules: {
              select: { finishStatus: true, shipId: true, updatedAt: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const allSchedules = [
      ...task.schedules,
      ...task.children.flatMap((c) => c.schedules),
    ];

    const shipMap = new Map<
      number,
      { status: string; completedAt: Date | null }
    >();

    for (const schedule of allSchedules) {
      if (!schedule.shipId) continue;
      const existing = shipMap.get(schedule.shipId);
      if (!existing) {
        shipMap.set(schedule.shipId, {
          status: schedule.finishStatus,
          completedAt: schedule.finishStatus === 'completed' ? schedule.updatedAt : null,
        });
      } else if (schedule.finishStatus === 'completed') {
        existing.status = 'completed';
        existing.completedAt = schedule.updatedAt;
      }
    }

    const ships = await this.prisma.ship.findMany({
      where: {
        teamCode: task.teamCode,
        id: { in: Array.from(shipMap.keys()) },
      },
      select: { id: true, cnShipName: true },
    });

    const shipNameMap = new Map(ships.map((s) => [s.id, s.cnShipName]));
    const dueDate = task.dueDate || task.ganttEndDate;
    const now = new Date();

    return Array.from(shipMap.entries()).map(([shipId, info]) => ({
      shipId,
      shipName: shipNameMap.get(shipId) || `船舶${shipId}`,
      status:
        info.status === 'completed'
          ? 'completed'
          : dueDate && dueDate < now
            ? 'overdue'
            : (info.status as any),
      completedAt: info.completedAt,
    }));
  }
}
