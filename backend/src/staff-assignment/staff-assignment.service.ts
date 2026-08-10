import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateStaffAssignmentDto, UpdateStaffAssignmentDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class StaffAssignmentService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  /**
   * 列出同团队下所有可指派的政委候选人（用于人员派任页下拉）
   * 这个接口不做 admin 限制，任何合法登录角色（含 ship_political_instructor）都可调用
   */
  async listPoliticalInstructors(teamCode: string) {
    const users = await this.prisma.user.findMany({
      where: {
        teamCode: teamCode as any,
        role: UserRole.ship_political_instructor,
      },
      select: {
        id: true,
        realName: true,
        username: true,
        role: true,
        teamCode: true,
      },
      orderBy: { id: 'asc' as const },
    })
    return users
  }

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
      // ★ v0862 关键修复：创建时若endDate已过或为今天，自动设status='ended'
      let autoStatus = createDto.status || 'active';
      if (createDto.endDate) {
        const endTs = new Date(createDto.endDate).getTime();
        if (!isNaN(endTs)) {
          const now = new Date();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
          if (endTs <= todayEnd && (!createDto.status || createDto.status === 'active')) {
            autoStatus = 'ended';
          }
        }
      }

      const result = await tx.staffAssignment.create({
        data: {
          userId: createDto.userId,
          shipId: createDto.shipId,
          teamCode: teamCode as any,
          startDate: new Date(createDto.startDate),
          endDate: createDto.endDate ? new Date(createDto.endDate) : null,
          status: autoStatus,
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

    // ★ v0860 关键修复：编辑派任时设了 endDate 且是过去日期 → 自动 status='ended'
    //   之前根因：通过"编辑派任"只设了 endDate 没改 status，status 仍='active'
    //   → 前端 isAssignmentEnded 只能靠 endDate < Date.now() 判断（受 computed 缓存影响）
    //   → 现在后端主动同步：endDate 已过 → status='ended'，前端条件①直接命中 → 灰色
    if (data.endDate !== undefined && data.endDate !== null) {
      const now = new Date();
      const endTs = new Date(data.endDate).getTime();
      if (!isNaN(endTs) && endTs < now.getTime()) {
        // endDate 已过 → 强制 status='ended'（除非用户显式设了其他非 active 状态）
        if (data.status === undefined || data.status === 'active') {
          data.status = 'ended';
        }
      }
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
    // ★ v0862 关键修复：查询时自动同步已过期派任的status
    //   解决根因：历史派任endDate已过但status仍='active'，前端isAssignmentEnded依赖status判断
    //   每次查询时自动将endDate<=今天且status='active'的记录更新为status='ended'
    const now = new Date();
    const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const expiredActive = await this.prisma.staffAssignment.findMany({
      where: {
        teamCode: teamCode as any,
        status: 'active',
        endDate: { lte: new Date(todayTs) },
      },
      select: { id: true },
    });
    if (expiredActive.length > 0) {
      const ids = expiredActive.map(a => a.id);
      await this.prisma.staffAssignment.updateMany({
        where: { id: { in: ids } },
        data: { status: 'ended' },
      });
    }

    return this.prisma.staffAssignment.findMany({
      where: { teamCode: teamCode as any },
      include: {
        ship: { select: { id: true, cnShipName: true } },
        user: {
          select: {
            id: true,
            realName: true,
            username: true,
            role: true,
            birthDate: true,
            idNumber: true,
            englishName: true,
            gender: true,
            nationality: true,
            hometown: true,
            politicalStatus: true,
            phoneNumber: true,
            employeeNo: true,
            dataSource: true,
          },
        },
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
   * 批量导入政委数据（首次初始化用）
   * 对每条数据：创建/更新User → 删除该船旧派任 → 创建新派任 → 更新Ship表政委字段
   */
  async batchImport(teamCode: string, items: any[]) {
    const results: any[] = [];
    const hashedPassword = await bcrypt.hash('123456', 10);

    for (const item of items) {
      try {
        // 1. 根据船名找到Ship
        const ship = await this.prisma.ship.findFirst({
          where: { cnShipName: item.cnShipName, teamCode: teamCode as any },
        });
        if (!ship) {
          results.push({ ship: item.cnShipName, ok: false, error: '船舶不存在' });
          continue;
        }

        // 2. 查找或创建User（用工号作为username）
        let user = await this.prisma.user.findFirst({
          where: { username: item.employeeNo },
        });
        // 政委个人信息字段
        const profileData: any = {
          realName: item.realName,
          employeeNo: item.employeeNo || null,
          birthDate: item.birthDate ? new Date(item.birthDate) : null,
          idNumber: item.idNumber || null,
          englishName: item.englishName || null,
          gender: item.gender || null,
          nationality: item.nationality || null,
          hometown: item.hometown || null,
          politicalStatus: item.politicalStatus || null,
          phoneNumber: item.phoneNumber || null,
          dataSource: item.dataSource || null,
        };
        if (!user) {
          user = await this.prisma.user.create({
            data: {
              username: item.employeeNo,
              password: hashedPassword,
              teamCode: teamCode as any,
              role: 'ship_political_instructor' as any,
              roles: ['ship_political_instructor'] as any,
              ...profileData,
            },
          });
        } else {
          // 更新已有用户的个人信息
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: profileData,
          });
        }

        // 3. 删除该船的所有旧派任记录
        await this.prisma.staffAssignment.deleteMany({
          where: { shipId: ship.id, teamCode: teamCode as any },
        });

        // 4. 创建新的StaffAssignment
        const startDate = new Date(item.startDate);
        const assignment = await this.prisma.staffAssignment.create({
          data: {
            userId: user.id,
            shipId: ship.id,
            teamCode: teamCode as any,
            startDate,
            endDate: null,
            status: 'active',
            sourceCompany: item.sourceCompany || null,
            assignmentNo: item.employeeNo,
          },
        });

        // 5. 更新Ship表的政委字段
        await this.prisma.ship.update({
          where: { id: ship.id },
          data: {
            politicalInstructor: item.realName,
            politicalOfficerId: user.id,
            politicalOfficerName: item.realName,
            instructorIdNumber: item.idNumber || null,
            onBoardDate: item.startDate,
          },
        });

        results.push({
          ship: item.cnShipName,
          officer: item.realName,
          ok: true,
          assignmentId: assignment.id,
        });
      } catch (e: any) {
        results.push({
          ship: item.cnShipName,
          officer: item.realName,
          ok: false,
          error: e.message,
        });
      }
    }

    return { total: items.length, success: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, details: results };
  }

  /**
   * ★ v0848 快速创建政委用户（换班时新政委不在名单里）
   * 场景：陈先生换政委时，新政委不在已有名单里（名单里都是在船的），
   *       需要直接录入姓名+工号就能创建用户，再完成派任。
   * 逻辑：
   *   1. 如果有工号 → 先按工号查找已有用户，找到就返回（避免重复创建）
   *   2. 找不到 → 创建新用户（username=工号 或 自动生成，password=默认123456，
   *      role=ship_political_instructor，teamCode 从 JWT 获取）
   *   3. 返回 { id, realName, employeeNo, isNew }
   */
  async quickCreateOfficer(
    teamCode: string,
    realName: string,
    employeeNo: string | undefined,
    operatorId: number = 0,
  ) {
    if (!realName || !realName.trim()) {
      throw new BadRequestException('姓名不能为空');
    }
    realName = realName.trim();
    employeeNo = employeeNo ? employeeNo.trim() : '';

    // 1. 如果有工号，先按工号查找已有用户
    if (employeeNo) {
      const existing = await this.prisma.user.findFirst({
        where: { username: employeeNo },
      });
      if (existing) {
        // 已有用户：更新 realName（防止工号对但名字没填）
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: { realName, employeeNo },
        });
        await this.operationLogService.create({
          userId: operatorId,
          teamCode,
          operationType: '新增',
          operationContent: `快速创建政委（复用已有用户）：${realName}（工号 ${employeeNo}）`,
        });
        return {
          id: updated.id,
          realName: updated.realName,
          employeeNo: updated.employeeNo || employeeNo,
          username: updated.username,
          isNew: false,
        };
      }
    }

    // 2. 创建新用户
    const hashedPassword = await bcrypt.hash('123456', 10);
    // username：有工号用工号，没工号用 officer_ + 时间戳保证唯一
    const username = employeeNo || `officer_${Date.now()}`;

    // 检查 username 是否已存在（极端情况：工号没查到但 username 冲突）
    const conflict = await this.prisma.user.findUnique({ where: { username } });
    if (conflict) {
      // username 冲突：用 officer_ + 时间戳 兜底
      const fallbackUsername = `officer_${Date.now()}`;
      const user = await this.prisma.user.create({
        data: {
          username: fallbackUsername,
          password: hashedPassword,
          realName,
          employeeNo: employeeNo || null,
          teamCode: teamCode as any,
          role: 'ship_political_instructor' as any,
          roles: ['ship_political_instructor'] as any,
        },
      });
      await this.operationLogService.create({
        userId: operatorId,
        teamCode,
        operationType: '新增',
        operationContent: `快速创建政委（新用户）：${realName}（工号 ${employeeNo || '无'}，用户名 ${fallbackUsername}）`,
      });
      return {
        id: user.id,
        realName: user.realName,
        employeeNo: user.employeeNo || employeeNo || '',
        username: user.username,
        isNew: true,
      };
    }

    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        realName,
        employeeNo: employeeNo || null,
        teamCode: teamCode as any,
        role: 'ship_political_instructor' as any,
        roles: ['ship_political_instructor'] as any,
      },
    });

    await this.operationLogService.create({
      userId: operatorId,
      teamCode,
      operationType: '新增',
      operationContent: `快速创建政委（新用户）：${realName}（工号 ${employeeNo || '无'}，用户名 ${username}）`,
    });

    return {
      id: user.id,
      realName: user.realName,
      employeeNo: user.employeeNo || employeeNo || '',
      username: user.username,
      isNew: true,
    };
  }
}
