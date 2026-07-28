import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole, EmotionalState, ConcernLevel } from '@prisma/client';

const SHORE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

export interface CreateThoughtReportDto {
  shipId?: number;
  crewName: string;
  crewPosition?: string;
  reportDate: string;
  emotionalState: string;
  concernLevel: string;
  situation: string;
  trigger?: string;
  measures?: string;
  followUp?: string;
  relatedDiaryId?: number;
}

export interface UpdateThoughtReportDto {
  shipId?: number | null;
  crewName?: string;
  crewPosition?: string;
  reportDate?: string;
  emotionalState?: string;
  concernLevel?: string;
  situation?: string;
  trigger?: string;
  measures?: string;
  followUp?: string;
  status?: string;
  relatedDiaryId?: number | null;
}

@Injectable()
export class ThoughtReportService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  private hasShoreManagementRole(role: UserRole): boolean {
    return SHORE_MANAGEMENT_ROLES.includes(role);
  }

  async create(
    dto: CreateThoughtReportDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!Object.values(EmotionalState).includes(dto.emotionalState as EmotionalState)) {
      throw new BadRequestException(`非法的情绪状态: ${dto.emotionalState}`);
    }
    if (!Object.values(ConcernLevel).includes(dto.concernLevel as ConcernLevel)) {
      throw new BadRequestException(`非法的关注等级: ${dto.concernLevel}`);
    }

    if (dto.shipId !== undefined && dto.shipId !== null) {
      const ship = await this.prisma.ship.findUnique({ where: { id: dto.shipId } });
      if (!ship || ship.teamCode !== teamCode) {
        throw new NotFoundException('船舶不存在或不属于当前团队');
      }
    }

    const result = await this.prisma.thoughtReport.create({
      data: {
        teamCode,
        shipId: dto.shipId || null,
        userId,
        crewName: dto.crewName,
        crewPosition: dto.crewPosition || null,
        reportDate: new Date(dto.reportDate),
        emotionalState: dto.emotionalState as EmotionalState,
        concernLevel: dto.concernLevel as ConcernLevel,
        situation: dto.situation,
        trigger: dto.trigger || null,
        measures: dto.measures || null,
        followUp: dto.followUp || null,
        status: 'open',
        relatedDiaryId: dto.relatedDiaryId || null,
      },
      include: {
        user: { select: { id: true, realName: true } },
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建思想动态报告：${dto.crewName}`,
    });

    return result;
  }

  async findAll(
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    page?: number,
    pageSize?: number,
    filters?: {
      emotionalState?: string;
      concernLevel?: string;
      status?: string;
      shipId?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: any = { teamCode };

    if (filters?.emotionalState) where.emotionalState = filters.emotionalState;
    if (filters?.concernLevel) where.concernLevel = filters.concernLevel;
    if (filters?.status) where.status = filters.status;
    if (filters?.shipId) where.shipId = filters.shipId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.reportDate = {};
      if (filters.dateFrom) where.reportDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.reportDate.lte = new Date(filters.dateTo);
    }

    const orderBy = { reportDate: 'desc' as const };
    const include = {
      user: { select: { id: true, realName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.thoughtReport.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.thoughtReport.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.thoughtReport.findMany({ where, orderBy, include });
  }

  async findById(id: number, userId: number, teamCode: TeamCode) {
    const report = await this.prisma.thoughtReport.findFirst({
      where: { id, teamCode },
      include: {
        user: { select: { id: true, realName: true } },
      },
    });
    if (!report) {
      throw new NotFoundException('思想动态报告不存在');
    }
    return report;
  }

  async update(
    id: number,
    dto: UpdateThoughtReportDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    const existing = await this.prisma.thoughtReport.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('思想动态报告不存在');

    const isCreator = existing.userId === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限编辑此报告');
    }

    const data: any = {};

    if (dto.emotionalState !== undefined) {
      if (!Object.values(EmotionalState).includes(dto.emotionalState as EmotionalState)) {
        throw new BadRequestException(`非法的情绪状态: ${dto.emotionalState}`);
      }
      data.emotionalState = dto.emotionalState;
    }
    if (dto.concernLevel !== undefined) {
      if (!Object.values(ConcernLevel).includes(dto.concernLevel as ConcernLevel)) {
        throw new BadRequestException(`非法的关注等级: ${dto.concernLevel}`);
      }
      data.concernLevel = dto.concernLevel;
    }
    if (dto.status !== undefined) {
      const validStatuses = ['open', 'processing', 'closed'];
      if (!validStatuses.includes(dto.status)) {
        throw new BadRequestException(`非法的状态值: ${dto.status}`);
      }
      data.status = dto.status;
      if (dto.status === 'closed') {
        data.closedAt = new Date();
        data.closedBy = userId;
      }
    }

    if (dto.shipId !== undefined) data.shipId = dto.shipId;
    if (dto.crewName !== undefined) data.crewName = dto.crewName;
    if (dto.crewPosition !== undefined) data.crewPosition = dto.crewPosition;
    if (dto.reportDate !== undefined) data.reportDate = new Date(dto.reportDate);
    if (dto.situation !== undefined) data.situation = dto.situation;
    if (dto.trigger !== undefined) data.trigger = dto.trigger;
    if (dto.measures !== undefined) data.measures = dto.measures;
    if (dto.followUp !== undefined) data.followUp = dto.followUp;
    if (dto.relatedDiaryId !== undefined) data.relatedDiaryId = dto.relatedDiaryId;

    const result = await this.prisma.thoughtReport.update({ where: { id }, data });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新思想动态报告：${result.crewName}`,
    });

    return result;
  }

  async close(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    const existing = await this.prisma.thoughtReport.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('思想动态报告不存在');

    const isCreator = existing.userId === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限关闭此报告');
    }

    const result = await this.prisma.thoughtReport.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedBy: userId,
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'close',
      operationContent: `关闭思想动态报告：${result.crewName}`,
    });

    return result;
  }

  async remove(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    const existing = await this.prisma.thoughtReport.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('思想动态报告不存在');

    const isCreator = existing.userId === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限删除此报告');
    }

    await this.prisma.thoughtReport.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除思想动态报告：${existing.crewName}`,
    });

    return { success: true };
  }

  async getStatistics(
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    filters?: { dateFrom?: string; dateTo?: string },
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限查看统计信息');
    }

    const where: any = { teamCode };
    if (filters?.dateFrom || filters?.dateTo) {
      where.reportDate = {};
      if (filters.dateFrom) where.reportDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.reportDate.lte = new Date(filters.dateTo);
    }

    const total = await this.prisma.thoughtReport.count({ where });

    const byStatus = await this.prisma.thoughtReport.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const byEmotional = await this.prisma.thoughtReport.groupBy({
      by: ['emotionalState'],
      where,
      _count: { id: true },
    });

    const byConcern = await this.prisma.thoughtReport.groupBy({
      by: ['concernLevel'],
      where,
      _count: { id: true },
    });

    const warningCount = await this.prisma.thoughtReport.count({
      where: { ...where, concernLevel: { in: [ConcernLevel.warning, ConcernLevel.critical] } },
    });

    return {
      total,
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count.id })),
      byEmotional: byEmotional.map((item) => ({ state: item.emotionalState, count: item._count.id })),
      byConcern: byConcern.map((item) => ({ level: item.concernLevel, count: item._count.id })),
      warningCount,
    };
  }

  async getWarnings(
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    page?: number,
    pageSize?: number,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限查看预警信息');
    }

    const where: any = {
      teamCode,
      concernLevel: { in: [ConcernLevel.warning, ConcernLevel.critical] },
      status: { in: ['open', 'processing'] },
    };

    const orderBy = { reportDate: 'desc' as const };
    const include = {
      user: { select: { id: true, realName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.thoughtReport.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.thoughtReport.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.thoughtReport.findMany({ where, orderBy, include });
  }
}
