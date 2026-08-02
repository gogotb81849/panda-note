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
    // === P0: 日期先后校验 (O1) ===
    if (createDto.endDate) {
      const s = new Date(createDto.startDate).getTime();
      const e = new Date(createDto.endDate).getTime();
      if (isNaN(s) || isNaN(e)) {
        throw new BadRequestException('日期格式不正确');
      }
      if (s > e) {
        throw new BadRequestException('上船日期不能晚于下船日期');
      }
    }

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

    // === P0: 同一船舶不能同时有两个活跃在任政委 (O3) ===
    const shipActive = await this.prisma.staffAssignment.findFirst({
      where: {
        shipId: createDto.shipId,
        status: 'active',
        endDate: null,
      },
    });
    if (shipActive && shipActive.userId !== createDto.userId) {
      throw new BadRequestException('该船舶当前已有在任政委，请先将其下船后再派任新政委');
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

      // 上船登记：同步更新 Ship 表的当前政委字段（三个字段保持一致）
      await tx.ship.update({
        where: { id: createDto.shipId },
        data: {
          politicalInstructor: user.realName,
          politicalOfficerId: user.id,
          politicalOfficerName: user.realName,
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
   * 注意：如果设置了 endDate 且该派任是船舶当前的活跃派任，会同步清空 Ship 表的当前政委
   */
  async update(teamCode: string, id: number, updateDto: UpdateStaffAssignmentDto, userId: number = 0) {
    const existing = await this.prisma.staffAssignment.findFirst({
      where: { id, teamCode: teamCode as any },
      include: { user: { select: { id: true, realName: true, username: true } } },
    });
    if (!existing) {
      throw new NotFoundException('派任记录不存在');
    }

    // === P0: 更新时若设置了endDate，校验日期先后 (O1) ===
    if (updateDto.endDate !== undefined && updateDto.endDate !== null) {
      const existingStart = new Date(existing.startDate).getTime();
      const newEnd = new Date(updateDto.endDate).getTime();
      if (isNaN(newEnd)) {
        throw new BadRequestException('下船日期格式不正确');
      }
      if (newEnd < existingStart) {
        throw new BadRequestException('下船日期不能早于上船日期');
      }
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

    // 判断更新后，这条派任是否还"在船活跃"
    const willBeActive = (
      (data.status === undefined ? existing.status : data.status) === 'active' &&
      (data.endDate === undefined ? existing.endDate : data.endDate) === null
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.staffAssignment.update({
        where: { id },
        data,
        include: {
          user: { select: { id: true, realName: true, username: true } },
          ship: { select: { id: true, cnShipName: true } },
        },
      });

      // 如果这条派任被设置为已结束，且 Ship 表当前的政委正好是这个人，则清空 Ship 表的政委字段
      if (!willBeActive && existing.shipId) {
        const ship = await tx.ship.findFirst({ where: { id: existing.shipId } });
        if (ship && ship.politicalOfficerId === existing.userId) {
          await tx.ship.update({
            where: { id: existing.shipId },
            data: {
              politicalOfficerId: null,
              politicalOfficerName: null,
              politicalInstructor: null,
            },
          });
        }
      }

      return updated;
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
   * 获取全团队所有派任记录（供岸基主管使用）
   */
  async getAllByTeamCode(teamCode: string) {
    return this.prisma.staffAssignment.findMany({
      where: { teamCode: teamCode as any },
      include: {
        ship: { select: { id: true, cnShipName: true } },
        user: { select: { id: true, realName: true, username: true, role: true } },
      },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });
  }

  /**
   * 获取用户当前派任状态
   */
  async getCurrentAssignment(userId: number, teamCode?: string) {
    const now = new Date();
    const where: any = {
      userId,
      status: 'active',
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    };
    if (teamCode) {
      where.teamCode = teamCode as any;
    }
    return this.prisma.staffAssignment.findFirst({
      where,
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
          politicalOfficerId: null,
          politicalOfficerName: null,
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
  async getUserDiaryPermission(userId: number, teamCode?: string): Promise<{
    currentShipId: number | null;
    historyShipIds: number[];
    isOnLeave: boolean;
    isOnBoard: boolean;
  }> {
    const currentAssignment = await this.getCurrentAssignment(userId, teamCode);
    const historyAssignments = await this.getHistoryAssignments(userId, teamCode);
    const isOnLeave = await this.isUserOnLeave(userId);
    const isOnBoard = currentAssignment !== null && currentAssignment?.status === 'active' && currentAssignment?.endDate === null;

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

  /**
   * 从船舶数据初始化派任记录（一次性数据导入）
   * 将船舶表中已配置的政委（politicalOfficerId）生成初始派任记录
   * 上船日期默认1月1日，暂定下船日期5月1日（次年）
   */
  async initializeFromShips(teamCode: string, userId: number = 0) {
    // 查询所有已配置政委的船舶
    const ships = await this.prisma.ship.findMany({
      where: {
        teamCode: teamCode as any,
        politicalOfficerId: { not: null },
      },
      select: {
        id: true,
        cnShipName: true,
        politicalOfficerId: true,
        politicalOfficerName: true,
        sendCompany: true,
      },
    });

    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    // 暂定下船日期：次年5月1日（未来日期，保持派任为"在船"状态）
    const endDate = new Date(`${currentYear + 1}-05-01T00:00:00.000Z`);

    let createdCount = 0;
    let skippedCount = 0;
    const createdRecords: any[] = [];
    const skippedShips: string[] = [];

    for (const ship of ships) {
      if (!ship.politicalOfficerId) continue;

      // 检查该船舶是否已有派任记录（避免重复初始化）
      const existing = await this.prisma.staffAssignment.findFirst({
        where: {
          shipId: ship.id,
          userId: ship.politicalOfficerId,
          teamCode: teamCode as any,
        },
      });

      if (existing) {
        skippedCount++;
        skippedShips.push(ship.cnShipName);
        continue;
      }

      // 创建派任记录
      const record = await this.prisma.staffAssignment.create({
        data: {
          userId: ship.politicalOfficerId,
          shipId: ship.id,
          teamCode: teamCode as any,
          startDate,
          endDate,
          status: 'active',
          sourceCompany: ship.sendCompany || null,
          remark: `初始化导入：上船日期${currentYear}-01-01，暂定下船日期${currentYear + 1}-05-01`,
        },
        include: {
          user: { select: { id: true, realName: true, username: true } },
          ship: { select: { id: true, cnShipName: true } },
        },
      });

      // 同步船舶表政委字段（确保一致）
      await this.prisma.ship.update({
        where: { id: ship.id },
        data: {
          politicalInstructor: ship.politicalOfficerName,
          politicalOfficerId: ship.politicalOfficerId,
          politicalOfficerName: ship.politicalOfficerName,
        },
      });

      createdRecords.push({
        shipName: ship.cnShipName,
        instructorName: ship.politicalOfficerName,
        startDate,
        endDate,
      });
      createdCount++;
    }

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '新增',
      operationContent: `初始化派任数据：新增${createdCount}条，跳过${skippedCount}条（已有记录）`,
    });

    return {
      total: ships.length,
      created: createdCount,
      skipped: skippedCount,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      createdRecords,
      skippedShips,
    };
  }
}
