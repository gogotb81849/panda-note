import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole, IntegrityCategory, RiskLevel, InspectionType } from '@prisma/client';

const SHORE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

export interface CreateIntegrityRecordDto {
  shipId?: number;
  category: string;
  riskLevel: string;
  inspectionType: string;
  inspectionDate: string;
  title: string;
  findings: string;
  evidence?: any[];
  measures?: string;
  deadline?: string;
  responsible?: string;
  alertSent?: boolean;
  alertLevel?: string;
  remarks?: string;
}

export interface UpdateIntegrityRecordDto {
  shipId?: number | null;
  category?: string;
  riskLevel?: string;
  inspectionType?: string;
  inspectionDate?: string;
  title?: string;
  findings?: string;
  evidence?: any[];
  measures?: string;
  deadline?: string;
  responsible?: string;
  status?: string;
  alertSent?: boolean;
  alertLevel?: string;
  remarks?: string;
}

@Injectable()
export class IntegrityRecordService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  private hasShoreManagementRole(role: UserRole): boolean {
    return SHORE_MANAGEMENT_ROLES.includes(role);
  }

  async create(
    dto: CreateIntegrityRecordDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!Object.values(IntegrityCategory).includes(dto.category as IntegrityCategory)) {
      throw new BadRequestException(`非法的廉洁监督类别: ${dto.category}`);
    }
    if (!Object.values(RiskLevel).includes(dto.riskLevel as RiskLevel)) {
      throw new BadRequestException(`非法的风险等级: ${dto.riskLevel}`);
    }
    if (!Object.values(InspectionType).includes(dto.inspectionType as InspectionType)) {
      throw new BadRequestException(`非法的检查类型: ${dto.inspectionType}`);
    }

    if (dto.shipId !== undefined && dto.shipId !== null) {
      const ship = await this.prisma.ship.findUnique({ where: { id: dto.shipId } });
      if (!ship || ship.teamCode !== teamCode) {
        throw new NotFoundException('船舶不存在或不属于当前团队');
      }
    }

    const result = await this.prisma.integrityRecord.create({
      data: {
        teamCode,
        shipId: dto.shipId || null,
        userId,
        category: dto.category as IntegrityCategory,
        riskLevel: dto.riskLevel as RiskLevel,
        inspectionType: dto.inspectionType as InspectionType,
        inspectionDate: new Date(dto.inspectionDate),
        title: dto.title,
        findings: dto.findings,
        evidence: dto.evidence || null,
        measures: dto.measures || null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        responsible: dto.responsible || null,
        status: 'open',
        alertSent: dto.alertSent || false,
        alertLevel: dto.alertLevel || null,
        remarks: dto.remarks || null,
      },
      include: {
        user: { select: { id: true, realName: true } },
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建廉洁监督记录：${result.title}`,
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
      category?: string;
      riskLevel?: string;
      status?: string;
      shipId?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: any = { teamCode };

    if (filters?.category) where.category = filters.category;
    if (filters?.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters?.status) where.status = filters.status;
    if (filters?.shipId) where.shipId = filters.shipId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.inspectionDate = {};
      if (filters.dateFrom) where.inspectionDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.inspectionDate.lte = new Date(filters.dateTo);
    }

    const orderBy = { inspectionDate: 'desc' as const };
    const include = {
      user: { select: { id: true, realName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.integrityRecord.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.integrityRecord.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.integrityRecord.findMany({ where, orderBy, include });
  }

  async findById(id: number, userId: number, teamCode: TeamCode) {
    const record = await this.prisma.integrityRecord.findFirst({
      where: { id, teamCode },
      include: {
        user: { select: { id: true, realName: true } },
      },
    });
    if (!record) {
      throw new NotFoundException('廉洁监督记录不存在');
    }
    return record;
  }

  async update(
    id: number,
    dto: UpdateIntegrityRecordDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    const existing = await this.prisma.integrityRecord.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('廉洁监督记录不存在');

    const isCreator = existing.userId === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限编辑此记录');
    }

    const data: any = {};

    if (dto.category !== undefined) {
      if (!Object.values(IntegrityCategory).includes(dto.category as IntegrityCategory)) {
        throw new BadRequestException(`非法的廉洁监督类别: ${dto.category}`);
      }
      data.category = dto.category;
    }
    if (dto.riskLevel !== undefined) {
      if (!Object.values(RiskLevel).includes(dto.riskLevel as RiskLevel)) {
        throw new BadRequestException(`非法的风险等级: ${dto.riskLevel}`);
      }
      data.riskLevel = dto.riskLevel;
    }
    if (dto.inspectionType !== undefined) {
      if (!Object.values(InspectionType).includes(dto.inspectionType as InspectionType)) {
        throw new BadRequestException(`非法的检查类型: ${dto.inspectionType}`);
      }
      data.inspectionType = dto.inspectionType;
    }
    if (dto.status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(dto.status)) {
        throw new BadRequestException(`非法的状态值: ${dto.status}`);
      }
      data.status = dto.status;
      if (dto.status === 'resolved' || dto.status === 'closed') {
        data.resolvedAt = new Date();
        data.resolvedBy = userId;
      }
    }

    if (dto.shipId !== undefined) data.shipId = dto.shipId;
    if (dto.inspectionDate !== undefined) data.inspectionDate = new Date(dto.inspectionDate);
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.findings !== undefined) data.findings = dto.findings;
    if (dto.evidence !== undefined) data.evidence = dto.evidence;
    if (dto.measures !== undefined) data.measures = dto.measures;
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.responsible !== undefined) data.responsible = dto.responsible;
    if (dto.alertSent !== undefined) data.alertSent = dto.alertSent;
    if (dto.alertLevel !== undefined) data.alertLevel = dto.alertLevel;
    if (dto.remarks !== undefined) data.remarks = dto.remarks;

    const result = await this.prisma.integrityRecord.update({ where: { id }, data });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新廉洁监督记录：${result.title}`,
    });

    return result;
  }

  async remove(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    const existing = await this.prisma.integrityRecord.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('廉洁监督记录不存在');

    const isCreator = existing.userId === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限删除此记录');
    }

    await this.prisma.integrityRecord.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除廉洁监督记录：${existing.title}`,
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
      where.inspectionDate = {};
      if (filters.dateFrom) where.inspectionDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.inspectionDate.lte = new Date(filters.dateTo);
    }

    const total = await this.prisma.integrityRecord.count({ where });

    const byStatus = await this.prisma.integrityRecord.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const byCategory = await this.prisma.integrityRecord.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
    });

    const byRisk = await this.prisma.integrityRecord.groupBy({
      by: ['riskLevel'],
      where,
      _count: { id: true },
    });

    const highRiskCount = await this.prisma.integrityRecord.count({
      where: { ...where, riskLevel: { in: [RiskLevel.high, RiskLevel.critical] } },
    });

    return {
      total,
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count.id })),
      byCategory: byCategory.map((item) => ({ category: item.category, count: item._count.id })),
      byRisk: byRisk.map((item) => ({ riskLevel: item.riskLevel, count: item._count.id })),
      highRiskCount,
    };
  }

  async getHighRiskRecords(
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    page?: number,
    pageSize?: number,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限查看高风险记录');
    }

    const where: any = {
      teamCode,
      riskLevel: { in: [RiskLevel.high, RiskLevel.critical] },
      status: { in: ['open', 'in_progress'] },
    };

    const orderBy = { inspectionDate: 'desc' as const };
    const include = {
      user: { select: { id: true, realName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.integrityRecord.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.integrityRecord.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.integrityRecord.findMany({ where, orderBy, include });
  }
}
