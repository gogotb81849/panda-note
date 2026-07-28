import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole } from '@prisma/client';

const SHORE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

export interface UpdateShipTaskStatusDto {
  responseData?: Record<string, any>;
  completedItems?: number[];
  status?: string;
}

@Injectable()
export class PortCheckService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  private hasShoreManagementRole(role: UserRole): boolean {
    return SHORE_MANAGEMENT_ROLES.includes(role);
  }

  async createTemplate(
    dto: { title: string; items: any[]; targetShips?: any[]; triggerDays?: number; isPublished?: boolean; isDraft?: boolean },
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限创建检查模板');
    }

    const result = await this.prisma.publishTemplate.create({
      data: {
        teamCode,
        templateType: 'port_call_check',
        title: dto.title,
        items: dto.items,
        targetShips: dto.targetShips || null,
        triggerDays: dto.triggerDays || null,
        isDraft: dto.isDraft !== undefined ? dto.isDraft : true,
        isPublished: dto.isPublished !== undefined ? dto.isPublished : false,
        publishedBy: userId,
        sortOrder: 0,
        isActive: true,
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建抵港前检查模板：${result.title}`,
    });

    return result;
  }

  async findAllTemplates(userId: number, teamCode: TeamCode, role: UserRole, page?: number, pageSize?: number) {
    const where: any = { teamCode, templateType: 'port_call_check' };

    if (!this.hasShoreManagementRole(role)) {
      where.isActive = true;
    }

    const orderBy = [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }];

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.publishTemplate.findMany({ where, orderBy, skip, take: pageSize }),
        this.prisma.publishTemplate.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.publishTemplate.findMany({ where, orderBy });
  }

  async findTemplateById(id: number, userId: number, teamCode: TeamCode) {
    const template = await this.prisma.publishTemplate.findFirst({
      where: { id, teamCode, templateType: 'port_call_check' },
    });
    if (!template) {
      throw new NotFoundException('检查模板不存在');
    }
    return template;
  }

  async publishTemplate(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限发布检查模板');
    }

    const template = await this.prisma.publishTemplate.findFirst({
      where: { id, teamCode, templateType: 'port_call_check' },
    });
    if (!template) {
      throw new NotFoundException('检查模板不存在');
    }

    const result = await this.prisma.publishTemplate.update({
      where: { id },
      data: {
        isDraft: false,
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: userId,
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'publish',
      operationContent: `发布抵港前检查模板：${template.title}`,
    });

    return result;
  }

  async getShipTasks(userId: number, teamCode: TeamCode, role: UserRole, page?: number, pageSize?: number) {
    const where: any = { teamCode, templateType: 'port_call_check' };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.shipTaskStatus.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
        this.prisma.shipTaskStatus.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.shipTaskStatus.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findShipTaskById(id: number, userId: number, teamCode: TeamCode) {
    const task = await this.prisma.shipTaskStatus.findFirst({
      where: { id, teamCode, templateType: 'port_call_check' },
    });
    if (!task) {
      throw new NotFoundException('船舶任务不存在');
    }

    // 同时获取模板信息
    const template = await this.prisma.publishTemplate.findUnique({
      where: { id: task.templateId },
    });

    return { ...task, template };
  }

  async updateShipTaskStatus(
    id: number,
    dto: UpdateShipTaskStatusDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    const existing = await this.prisma.shipTaskStatus.findFirst({
      where: { id, teamCode, templateType: 'port_call_check' },
    });
    if (!existing) {
      throw new NotFoundException('船舶任务不存在');
    }

    // 获取模板以计算进度
    const template = await this.prisma.publishTemplate.findUnique({
      where: { id: existing.templateId },
    });

    const data: any = {};

    if (dto.responseData !== undefined) {
      data.responseData = dto.responseData;
    }

    if (dto.completedItems !== undefined) {
      const items = template ? (template.items as any[]) : [];
      const totalItems = items.length;
      const completedItems = dto.completedItems.length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      data.completedItems = completedItems;
      data.progress = progress;

      if (progress === 100) {
        data.status = 'completed';
      } else if (progress > 0) {
        data.status = 'in_progress';
      }
    }

    if (dto.status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(dto.status)) {
        throw new BadRequestException(`非法的状态值: ${dto.status}`);
      }
      data.status = dto.status;
    }

    data.respondedBy = userId;
    data.respondedAt = new Date();

    const result = await this.prisma.shipTaskStatus.update({
      where: { id },
      data,
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新抵港前检查状态：${id}`,
    });

    return result;
  }

  async getProgressSummary(userId: number, teamCode: TeamCode, role: UserRole) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限查看统计汇总');
    }

    const [total, pending, inProgress, completed] = await Promise.all([
      this.prisma.shipTaskStatus.count({ where: { teamCode, templateType: 'port_call_check' } }),
      this.prisma.shipTaskStatus.count({ where: { teamCode, templateType: 'port_call_check', status: 'pending' } }),
      this.prisma.shipTaskStatus.count({ where: { teamCode, templateType: 'port_call_check', status: 'in_progress' } }),
      this.prisma.shipTaskStatus.count({ where: { teamCode, templateType: 'port_call_check', status: 'completed' } }),
    ]);

    const avgProgress = total > 0 ? await this.prisma.shipTaskStatus.aggregate({
      where: { teamCode, templateType: 'port_call_check' },
      _avg: { progress: true },
    }) : { _avg: { progress: 0 } };

    return {
      total,
      pending,
      inProgress,
      completed,
      avgProgress: Math.round(avgProgress._avg.progress || 0),
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async removeTemplate(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限删除检查模板');
    }

    const template = await this.prisma.publishTemplate.findFirst({
      where: { id, teamCode, templateType: 'port_call_check' },
    });
    if (!template) {
      throw new NotFoundException('检查模板不存在');
    }

    await this.prisma.publishTemplate.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除抵港前检查模板：${template.title}`,
    });

    return { success: true };
  }

  async updateTemplate(
    id: number,
    dto: { title?: string; items?: any[]; targetShips?: any[]; triggerDays?: number },
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限更新检查模板');
    }

    const template = await this.prisma.publishTemplate.findFirst({
      where: { id, teamCode, templateType: 'port_call_check' },
    });
    if (!template) {
      throw new NotFoundException('检查模板不存在');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.items !== undefined) updateData.items = dto.items;
    if (dto.targetShips !== undefined) updateData.targetShips = dto.targetShips;
    if (dto.triggerDays !== undefined) updateData.triggerDays = dto.triggerDays;

    const result = await this.prisma.publishTemplate.update({
      where: { id },
      data: updateData,
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新抵港前检查模板：${result.title}`,
    });

    return result;
  }
}
