import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole, PartyActivityType } from '@prisma/client';

const SHORE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

export interface CreatePartyActivityDto {
  activityType: string;
  title: string;
  activityDate: string;
  shipId?: number;
  location?: string;
  hostName?: string;
  recorderName?: string;
  attendees: any[];
  agenda: string;
  discussion?: string;
  resolution?: string;
  summary?: string;
  attachments?: any[];
  relatedTaskId?: number;
  remarks?: string;
}

export interface UpdatePartyActivityDto {
  activityType?: string;
  title?: string;
  activityDate?: string;
  shipId?: number | null;
  location?: string;
  hostName?: string;
  recorderName?: string;
  attendees?: any[];
  agenda?: string;
  discussion?: string;
  resolution?: string;
  summary?: string;
  attachments?: any[];
  relatedTaskId?: number | null;
  remarks?: string;
}

@Injectable()
export class PartyActivityService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  private hasShoreManagementRole(role: UserRole): boolean {
    return SHORE_MANAGEMENT_ROLES.includes(role);
  }

  async create(
    dto: CreatePartyActivityDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    // 验证活动类型
    if (!Object.values(PartyActivityType).includes(dto.activityType as PartyActivityType)) {
      throw new BadRequestException(`非法的活动类型: ${dto.activityType}`);
    }

    // 验证shipId是否存在
    if (dto.shipId !== undefined && dto.shipId !== null) {
      const ship = await this.prisma.ship.findUnique({ where: { id: dto.shipId } });
      if (!ship || ship.teamCode !== teamCode) {
        throw new NotFoundException('船舶不存在或不属于当前团队');
      }
    }

    const result = await this.prisma.partyActivity.create({
      data: {
        teamCode,
        activityType: dto.activityType as PartyActivityType,
        title: dto.title,
        activityDate: new Date(dto.activityDate),
        shipId: dto.shipId || null,
        location: dto.location || null,
        hostName: dto.hostName || null,
        recorderName: dto.recorderName || null,
        attendees: dto.attendees,
        attendeeCount: dto.attendees.length,
        agenda: dto.agenda,
        discussion: dto.discussion || null,
        resolution: dto.resolution || null,
        summary: dto.summary || null,
        attachments: dto.attachments || null,
        relatedTaskId: dto.relatedTaskId || null,
        remarks: dto.remarks || null,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, realName: true } },
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建党建活动：${result.title}`,
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
      activityType?: string;
      shipId?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: any = { teamCode };

    if (filters?.activityType) {
      where.activityType = filters.activityType;
    }
    if (filters?.shipId) {
      where.shipId = filters.shipId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.activityDate = {};
      if (filters.dateFrom) where.activityDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.activityDate.lte = new Date(filters.dateTo);
    }

    const orderBy = { activityDate: 'desc' as const };
    const include = {
      createdBy: { select: { id: true, realName: true } },
      ship: { select: { id: true, cnShipName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.partyActivity.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.partyActivity.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.partyActivity.findMany({ where, orderBy, include });
  }

  async findById(id: number, userId: number, teamCode: TeamCode) {
    const activity = await this.prisma.partyActivity.findFirst({
      where: { id, teamCode },
      include: {
        createdBy: { select: { id: true, realName: true } },
        ship: { select: { id: true, cnShipName: true } },
        comments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, realName: true } },
          },
        },
      },
    });
    if (!activity) {
      throw new NotFoundException('党建活动不存在');
    }
    return activity;
  }

  async update(
    id: number,
    dto: UpdatePartyActivityDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    const existing = await this.prisma.partyActivity.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('党建活动不存在');

    // 权限校验
    const isCreator = existing.createdById === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限编辑此活动');
    }

    const data: any = {};
    if (dto.activityType !== undefined) {
      if (!Object.values(PartyActivityType).includes(dto.activityType as PartyActivityType)) {
        throw new BadRequestException(`非法的活动类型: ${dto.activityType}`);
      }
      data.activityType = dto.activityType;
    }
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.activityDate !== undefined) data.activityDate = new Date(dto.activityDate);
    if (dto.shipId !== undefined) data.shipId = dto.shipId;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.hostName !== undefined) data.hostName = dto.hostName;
    if (dto.recorderName !== undefined) data.recorderName = dto.recorderName;
    if (dto.attendees !== undefined) {
      data.attendees = dto.attendees;
      data.attendeeCount = dto.attendees.length;
    }
    if (dto.agenda !== undefined) data.agenda = dto.agenda;
    if (dto.discussion !== undefined) data.discussion = dto.discussion;
    if (dto.resolution !== undefined) data.resolution = dto.resolution;
    if (dto.summary !== undefined) data.summary = dto.summary;
    if (dto.attachments !== undefined) data.attachments = dto.attachments;
    if (dto.relatedTaskId !== undefined) data.relatedTaskId = dto.relatedTaskId;
    if (dto.remarks !== undefined) data.remarks = dto.remarks;

    const result = await this.prisma.partyActivity.update({ where: { id }, data });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新党建活动：${result.title}`,
    });

    return result;
  }

  async remove(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    const existing = await this.prisma.partyActivity.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('党建活动不存在');

    const isCreator = existing.createdById === userId;
    const isManager = this.hasShoreManagementRole(role);
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权限删除此活动');
    }

    await this.prisma.partyActivity.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除党建活动：${existing.title}`,
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
      where.activityDate = {};
      if (filters.dateFrom) where.activityDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.activityDate.lte = new Date(filters.dateTo);
    }

    const total = await this.prisma.partyActivity.count({ where });
    const byType = await this.prisma.partyActivity.groupBy({
      by: ['activityType'],
      where,
      _count: { id: true },
    });

    const byShip = await this.prisma.partyActivity.groupBy({
      by: ['shipId'],
      where: { ...where, shipId: { not: null } },
      _count: { id: true },
    });

    return {
      total,
      byType: byType.map((item) => ({ type: item.activityType, count: item._count.id })),
      byShip: byShip.map((item) => ({ shipId: item.shipId, count: item._count.id })),
    };
  }
}
