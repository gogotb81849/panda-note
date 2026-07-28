import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateStaffAssignmentDto, UpdateStaffAssignmentDto } from './dto';

@Injectable()
export class StaffAssignmentService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  /**
   * 创建派任记录（上船）
   */
  async create(teamCode: string, createDto: CreateStaffAssignmentDto, userId: number = 0) {
    // 检查用户是否已有活跃的派任记录
    const activeAssignment = await this.prisma.staffAssignment.findFirst({
      where: {
        userId: createDto.userId,
        status: 'active',
        endDate: null,
      },
    });

    if (activeAssignment) {
      throw new BadRequestException('该政委当前已有在船记录，请先下船登记');
    }

    // 验证船舶是否存在
    const ship = await this.prisma.ship.findFirst({
      where: { id: createDto.shipId, teamCode: teamCode as any },
    });
    if (!ship) {
      throw new NotFoundException('船舶不存在');
    }

    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: createDto.userId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.staffAssignment.create({
        data: {
          userId: createDto.userId,
          shipId: createDto.shipId,
          teamCode: teamCode as any,
          startDate: new Date(createDto.startDate),
          endDate: createDto.endDate ? new Date(createDto.endDate) : null,
          status: createDto.status || 'active',
          sourceCompany: createDto.sourceCompany,
          assignmentNo: createDto.assignmentNo,
          remark: createDto.remark,
        },
        include: {
          user: { select: { id: true, realName: true, username: true } },
          ship: { select: { id: true, cnShipName: true } },
        },
      });

      await tx.ship.update({
        where: { id: createDto.shipId },
        data: {
          politicalInstructor: user.realName,
        },
      });

      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: '新增',
        operationContent: `新增派任记录：${user.realName} → ${ship.cnShipName}`,
      });

      return result;
    });
  }

  /**
   * 更新派任记录（下船/休假）
   */
  async update(teamCode: string, id: number, updateDto: UpdateStaffAssignmentDto, userId: number = 0) {
    const existing = await this.prisma.staffAssignment.findFirst({
      where: { id, teamCode: teamCode as any },
    });
    if (!existing) {
      throw new NotFoundException('派任记录不存在');
    }

    const data: any = {};

    if (updateDto.endDate !== undefined) {
      data.endDate = updateDto.endDate ? new Date(updateDto.endDate) : null;
    }
    if (updateDto.status !== undefined) {
      data.status = updateDto.status;
    }
    if (updateDto.remark !== undefined) {
      data.remark = updateDto.remark;
    }
    if (updateDto.sourceCompany !== undefined) {
      data.sourceCompany = updateDto.sourceCompany;
    }
    if (updateDto.assignmentNo !== undefined) {
      data.assignmentNo = updateDto.assignmentNo;
    }

    const result = await this.prisma.staffAssignment.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, realName: true, username: true } },
        ship: { select: { id: true, cnShipName: true } },
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `修改派任记录（ID:${id}）`,
    });

    return result;
  }

  /**
   * 获取用户当前派任状态
   */
  async getCurrentAssignment(userId: number) {
    const now = new Date();
    return this.prisma.staffAssignment.findFirst({
      where: {
        userId,
        status: 'active',
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: {
        ship: true,
        user: { select: { id: true, realName: true, username: true, role: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 获取用户历史派任记录
   */
  async getHistoryAssignments(userId: number, teamCode?: string) {
    const where: any = { userId };
    if (teamCode) {
      where.teamCode = teamCode as any;
    }

    return this.prisma.staffAssignment.findMany({
      where,
      include: {
        ship: true,
        user: { select: { id: true, realName: true, username: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 检查用户是否在船
   */
  async isUserOnBoard(userId: number): Promise<boolean> {
    const assignment = await this.getCurrentAssignment(userId);
    return assignment !== null && assignment.status === 'active' && assignment.endDate === null;
  }

  /**
   * 检查用户是否休假中
   */
  async isUserOnLeave(userId: number): Promise<boolean> {
    const now = new Date();
    const assignment = await this.prisma.staffAssignment.findFirst({
      where: {
        userId,
        status: 'leave',
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
    });
    return assignment !== null;
  }

  /**
   * 获取用户派任记录（按用户）
   */
  async getByUserId(userId: number, teamCode?: string) {
    const where: any = { userId };
    if (teamCode) {
      where.teamCode = teamCode as any;
    }

    return this.prisma.staffAssignment.findMany({
      where,
      include: {
        ship: true,
        user: { select: { id: true, realName: true, username: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 获取船舶派任记录
   */
  async getByShipId(shipId: number, teamCode?: string) {
    const where: any = { shipId };
    if (teamCode) {
      where.teamCode = teamCode as any;
    }

    return this.prisma.staffAssignment.findMany({
      where,
      include: {
        user: { select: { id: true, realName: true, username: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 获取船舶当前在船人员
   */
  async getCurrentShipStaff(shipId: number, teamCode: string) {
    const now = new Date();
    return this.prisma.staffAssignment.findMany({
      where: {
        shipId,
        teamCode: teamCode as any,
        status: 'active',
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: {
        user: { select: { id: true, realName: true, username: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 下船登记
   */
  async checkOutShip(id: number, endDate: string, reason: string, userId: number, teamCode: string) {
    const existing = await this.prisma.staffAssignment.findFirst({
      where: { id, teamCode: teamCode as any },
      include: { ship: true, user: { select: { id: true, realName: true, username: true } } },
    });
    if (!existing) {
      throw new NotFoundException('派任记录不存在');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.staffAssignment.update({
        where: { id },
        data: {
          endDate: new Date(endDate),
          status: 'ended',
          remark: reason,
        },
        include: {
          user: { select: { id: true, realName: true, username: true } },
          ship: { select: { id: true, cnShipName: true } },
        },
      });

      await tx.ship.update({
        where: { id: existing.shipId },
        data: {
          politicalInstructor: null,
        },
      });

      return updated;
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `下船登记：${existing.user.realName} 离开 ${existing.ship.cnShipName}`,
    });

    return result;
  }

  /**
   * 休假登记
   */
  async startLeave(id: number, startDate: string, endDate: string | null, reason: string, userId: number, teamCode: string) {
    return this.update(teamCode, id, {
      endDate: endDate || undefined,
      status: 'leave',
      remark: reason,
    }, userId);
  }

  /**
   * 销假（从休假回到工作状态）
   */
  async endLeave(id: number, userId: number, teamCode: string) {
    return this.update(teamCode, id, {
      status: 'active',
      remark: '销假',
    }, userId);
  }

  /**
   * 获取用户权限信息（用于日记查询）
   */
  async getUserDiaryPermission(userId: number): Promise<{
    currentShipId: number | null;
    historyShipIds: number[];
    isOnLeave: boolean;
    isOnBoard: boolean;
  }> {
    const currentAssignment = await this.getCurrentAssignment(userId);
    const historyAssignments = await this.getHistoryAssignments(userId);
    const isOnLeave = await this.isUserOnLeave(userId);
    const isOnBoard = await this.isUserOnBoard(userId);

    return {
      currentShipId: currentAssignment?.shipId || null,
      historyShipIds: historyAssignments.map(a => a.shipId),
      isOnLeave,
      isOnBoard,
    };
  }

  async delete(teamCode: string, id: number, userId: number = 0) {
    const existing = await this.prisma.staffAssignment.findFirst({
      where: { id, teamCode: teamCode as any },
    });
    if (!existing) {
      throw new NotFoundException('派任记录不存在');
    }

    const result = await this.prisma.staffAssignment.delete({
      where: { id },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '删除',
      operationContent: `删除派任记录（ID:${id}）`,
    });

    return result;
  }
}
