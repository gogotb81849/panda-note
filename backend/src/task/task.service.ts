import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, Priority, ScheduleStatus, UserRole } from '@prisma/client';

export interface CreateTaskDto {
  title: string;
  parentId?: number | null;
  category?: string;
  category2?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  description?: string;
  assignedToId?: number;
}

export interface UpdateTaskDto {
  title?: string;
  parentId?: number | null;
  category?: string;
  category2?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  description?: string;
  assignedToId?: number;
}

const VALID_TASK_STATUSES = Object.values(ScheduleStatus) as string[];

/** 拥有管理权限的岸基角色 */
const SHORE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  /** 检查用户是否具有岸基管理权限 */
  private hasShoreManagementRole(role: UserRole): boolean {
    return SHORE_MANAGEMENT_ROLES.includes(role);
  }

  async create(dto: CreateTaskDto, userId: number, teamCode: TeamCode, _role: UserRole) {
    // assignedToId 权限校验
    if (dto.assignedToId !== undefined && dto.assignedToId !== null) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assignedToId } });
      if (!assignee || assignee.teamCode !== teamCode) {
        throw new NotFoundException('指派人不存在或不属于当前团队');
      }
    }

    // parentId 合法性校验
    if (dto.parentId !== undefined && dto.parentId !== null) {
      const parent = await this.prisma.task.findFirst({ where: { id: dto.parentId, teamCode } });
      if (!parent) {
        throw new NotFoundException('父任务不存在或不属于当前团队');
      }
    }

    const result = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        parentId: dto.parentId || null,
        category: dto.category || null,
        category2: dto.category2 || null,
        status: dto.status || 'pending',
        priority: (dto.priority as Priority) || Priority.normal,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignedToId: dto.assignedToId || null,
        createdById: userId,
        teamCode,
      },
      include: {
        createdBy: { select: { id: true, realName: true } },
        assignedTo: { select: { id: true, realName: true } },
      },
    });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建任务：${result.title}`,
    });

    return result;
  }

  async findAll(userId: number, teamCode: TeamCode, page?: number, pageSize?: number) {
    const where = { teamCode };
    const orderBy = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];
    const include = {
      createdBy: { select: { id: true, realName: true } },
      assignedTo: { select: { id: true, realName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          orderBy,
          include,
          skip,
          take: pageSize,
        }),
        this.prisma.task.count({ where }),
      ]);
      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    return this.prisma.task.findMany({
      where,
      orderBy,
      include,
    });
  }

  async findById(id: number, userId: number, teamCode: TeamCode) {
    const task = await this.prisma.task.findFirst({
      where: { id, teamCode },
      include: {
        createdBy: { select: { id: true, realName: true } },
        assignedTo: { select: { id: true, realName: true } },
        schedules: { take: 5, orderBy: { recordDate: 'desc' } },
        children: true,
      },
    });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  async update(id: number, dto: UpdateTaskDto, userId: number, teamCode: TeamCode, role: UserRole) {
    const existing = await this.prisma.task.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('任务不存在');

    // 权限校验：任务创建者、被指派人、或岸基管理角色
    const isCreator = existing.createdById === userId;
    const isAssignee = existing.assignedToId === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isAssignee && !isManager) {
      throw new ForbiddenException('无权限更新此任务');
    }

    // assignedToId 权限校验
    if (dto.assignedToId !== undefined && dto.assignedToId !== null) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assignedToId } });
      if (!assignee || assignee.teamCode !== teamCode) {
        throw new NotFoundException('指派人不存在或不属于当前团队');
      }
    }

    // parentId 合法性校验（含循环引用检测）
    if (dto.parentId !== undefined && dto.parentId !== null) {
      const parent = await this.prisma.task.findFirst({ where: { id: dto.parentId, teamCode } });
      if (!parent) {
        throw new NotFoundException('父任务不存在或不属于当前团队');
      }
      if (await this.isDescendant(dto.parentId, id)) {
        throw new BadRequestException('不能将任务设置为自身子任务的子任务（循环引用）');
      }
    } else if (dto.parentId === null) {
      // explicitly setting to root
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.category2 !== undefined) data.category2 = dto.category2;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;

    const result = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, realName: true } },
        assignedTo: { select: { id: true, realName: true } },
      },
    });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新任务：${result.title}`,
    });

    return result;
  }

  async remove(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    const existing = await this.prisma.task.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('任务不存在');

    // 权限校验：任务创建者或岸基管理角色
    const isCreator = existing.createdById === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限删除此任务');
    }
    await this.deleteRecursive(id, teamCode);

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除任务：${id}`,
    });

    return { success: true };
  }

  private async deleteRecursive(parentId: number, teamCode: TeamCode) {
    // 收集所有需要删除的任务ID
    const idsToDelete: number[] = [];
    await this.collectIds(parentId, teamCode, idsToDelete);

    // 使用事务确保删除原子性
    await this.prisma.$transaction(async (tx) => {
      // 先解除所有关联的 schedule 引用
      await tx.schedule.updateMany({ where: { taskId: { in: idsToDelete } }, data: { taskId: null } });
      // 删除所有任务
      await tx.task.deleteMany({ where: { id: { in: idsToDelete } } });
    });
  }

  private async collectIds(parentId: number, teamCode: TeamCode, ids: number[]) {
    ids.push(parentId);
    const children = await this.prisma.task.findMany({ where: { parentId, teamCode }, select: { id: true } });
    for (const child of children) {
      await this.collectIds(child.id, teamCode, ids);
    }
  }

  async reorder(id: number, newSortOrder: number, teamCode: TeamCode, role: UserRole) {
    const task = await this.prisma.task.findFirst({ where: { id, teamCode } });
    if (!task) {
      throw new NotFoundException('任务不存在或无权操作');
    }
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限调整任务排序');
    }
    return this.prisma.task.update({ where: { id }, data: { sortOrder: newSortOrder } });
  }

  async batchUpdateStatus(ids: number[], status: string, teamCode: TeamCode, role: UserRole, userId?: number) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限执行批量操作');
    }
    if (!VALID_TASK_STATUSES.includes(status)) {
      throw new BadRequestException(`非法的状态值: ${status}，合法值为: ${VALID_TASK_STATUSES.join(', ')}`);
    }
    await this.prisma.task.updateMany({ where: { id: { in: ids }, teamCode }, data: { status } });
    
    if (userId) {
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: 'batch_update',
        operationContent: `批量更新任务状态为 ${status}，共 ${ids.length} 条`,
      });
    }
    
    return { success: true, count: ids.length };
  }

  async getTree(userId: number, teamCode: TeamCode) {
    const allTasks = await this.prisma.task.findMany({
      where: { teamCode },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        createdBy: { select: { id: true, realName: true } },
        assignedTo: { select: { id: true, realName: true } },
      },
    });
    return this.buildTree(allTasks);
  }

  private buildTree(tasks: any[]): any[] {
    // O(n) 实现：使用 Map 避免 O(n²) 递归
    const taskMap = new Map<number, any>();
    const rootNodes: any[] = [];

    // 第一次遍历：将所有任务放入 Map
    for (const task of tasks) {
      taskMap.set(task.id, { ...task });
    }

    // 第二次遍历：构建树结构
    for (const task of tasks) {
      const node = taskMap.get(task.id);
      if (task.parentId === null || task.parentId === undefined) {
        rootNodes.push(node);
      } else {
        const parent = taskMap.get(task.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          // 父节点不存在（可能被删除），作为根节点
          rootNodes.push(node);
        }
      }
    }

    return rootNodes;
  }

  /** 检测 targetId 是否为 ancestorId 的后代（用于循环引用检测） */
  private async isDescendant(ancestorId: number, targetId: number): Promise<boolean> {
    let currentId: number | null = targetId;
    const visited = new Set<number>();
    while (currentId !== null) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) return false; // 已有循环，避免死循环
      visited.add(currentId);
      const task = await this.prisma.task.findUnique({ where: { id: currentId }, select: { parentId: true } });
      currentId = task?.parentId ?? null;
    }
    return false;
  }
}
