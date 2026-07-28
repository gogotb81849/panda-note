import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode, AppealStatusV2 } from '@prisma/client';

@Injectable()
export class AppealService {
  private readonly logger = new Logger(AppealService.name);

  constructor(private prisma: PrismaService) {}

  // 状态机定义：允许的状态流转
  private readonly statusTransitions: Record<AppealStatusV2, AppealStatusV2[]> = {
    pending: ['accepted', 'rejected'],        // 待受理 → 已受理/已驳回
    accepted: ['processing', 'resolved', 'rejected'], // 已受理 → 处理中/已解决/已驳回
    processing: ['resolved', 'escalated'],    // 处理中 → 已解决/升级
    resolved: ['confirmed', 'processing'],    // 已解决 → 已确认/退回处理
    confirmed: ['closed'],                     // 已确认 → 已关闭
    closed: [],                                // 已关闭（终态）
    rejected: ['accepted'],                    // 已驳回 → 可重新受理
    escalated: ['processing', 'resolved'],     // 升级 → 处理中/已解决
  };

  // 动作到状态的映射
  private readonly actionToStatus: Record<string, AppealStatusV2> = {
    submit: 'pending',
    accept: 'accepted',
    process: 'processing',
    resolve: 'resolved',
    confirm: 'confirmed',
    close: 'closed',
    reject: 'rejected',
    escalate: 'escalated',
  };

  /**
   * 验证状态流转是否合法
   */
  private validateTransition(currentStatus: AppealStatusV2, targetStatus: AppealStatusV2): boolean {
    const allowedTransitions = this.statusTransitions[currentStatus] || [];
    return allowedTransitions.includes(targetStatus);
  }

  /**
   * 创建诉求（船舶提交）
   */
  async create(data: {
    teamCode: TeamCode;
    crewId: number;
    crewName: string;
    shipId: number;
    shipName: string;
    title: string;
    content: string;
    category: string;
    priority?: string;
    sourceTaskId?: number;
    sourceTemplateId?: number;
  }) {
    const appeal = await this.prisma.crewAppeal.create({
      data: {
        teamCode: data.teamCode,
        crewId: data.crewId,
        crewName: data.crewName,
        shipId: data.shipId,
        shipName: data.shipName,
        title: data.title,
        content: data.content,
        category: data.category,
        priority: data.priority || 'normal',
        status: 'pending',
        sourceTaskId: data.sourceTaskId,
        sourceTemplateId: data.sourceTemplateId,
      },
    });

    // 记录状态流转
    await this.recordTransition({
      appealId: appeal.id,
      fromStatus: null,
      toStatus: 'pending',
      action: 'submit',
      operatorId: data.crewId,
      operatorName: data.crewName,
      operatorRole: 'ship',
    });

    return appeal;
  }

  /**
   * 记录状态流转
   */
  async recordTransition(params: {
    appealId: number;
    fromStatus: string | null;
    toStatus: string;
    action: string;
    operatorId?: number;
    operatorName?: string;
    operatorRole?: string;
    comment?: string;
    attachment?: any;
  }) {
    return this.prisma.appealStatusTransition.create({
      data: {
        appealId: params.appealId,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        action: params.action,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        operatorRole: params.operatorRole,
        comment: params.comment,
        attachment: params.attachment,
      },
    });
  }

  /**
   * 获取诉求列表（支持多种过滤条件）
   */
  async findAll(
    teamCode: TeamCode,
    filters?: {
      status?: string;
      priority?: string;
      category?: string;
      shipId?: number;
      search?: string;
      sourceTaskId?: number;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {
    const where: any = { teamCode };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.shipId) {
      where.shipId = filters.shipId;
    }
    if (filters?.sourceTaskId) {
      where.sourceTaskId = filters.sourceTaskId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters?.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters?.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { content: { contains: filters.search } },
        { crewName: { contains: filters.search } },
        { shipName: { contains: filters.search } },
      ];
    }

    return this.prisma.crewAppeal.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        statusTransitions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * 获取单个诉求详情
   */
  async findOne(id: number, teamCode: TeamCode) {
    const appeal = await this.prisma.crewAppeal.findFirst({
      where: { id, teamCode },
      include: {
        statusTransitions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException('诉求不存在');
    }

    return appeal;
  }

  /**
   * 获取诉求的状态流转历史
   */
  async getTransitionHistory(appealId: number, teamCode: TeamCode) {
    const appeal = await this.findOne(appealId, teamCode);
    return appeal.statusTransitions;
  }

  /**
   * 主管受理诉求
   */
  async acceptAppeal(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    comment?: string,
  ) {
    return this.transitionStatus(id, teamCode, 'accepted', 'accept', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'supervisor',
    }, comment);
  }

  /**
   * 主管开始处理
   */
  async startProcessing(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    comment?: string,
  ) {
    return this.transitionStatus(id, teamCode, 'processing', 'process', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'supervisor',
    }, comment);
  }

  /**
   * 主管解决诉求
   */
  async resolveAppeal(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    response: string,
    comment?: string,
  ) {
    const appeal = await this.transitionStatus(id, teamCode, 'resolved', 'resolve', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'supervisor',
    }, comment);

    // 更新响应信息
    await this.prisma.crewAppeal.update({
      where: { id },
      data: {
        response,
        respondedBy: operator.operatorId,
        respondedAt: new Date(),
        resolvedAt: new Date(),
      },
    });

    return appeal;
  }

  /**
   * 船舶确认诉求已解决
   */
  async confirmAppeal(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    satisfaction?: number,
    feedback?: string,
    comment?: string,
  ) {
    const appeal = await this.transitionStatus(id, teamCode, 'confirmed', 'confirm', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'ship',
    }, comment);

    // 更新确认信息和满意度
    await this.prisma.crewAppeal.update({
      where: { id },
      data: {
        confirmedAt: new Date(),
        confirmedBy: operator.operatorId,
        satisfaction,
        feedback,
      },
    });

    return appeal;
  }

  /**
   * 主管关闭诉求（船舶超期未确认时）
   */
  async closeAppeal(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    comment?: string,
  ) {
    return this.transitionStatus(id, teamCode, 'closed', 'close', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'supervisor',
    }, comment);
  }

  /**
   * 主管驳回诉求
   */
  async rejectAppeal(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    reason: string,
  ) {
    return this.transitionStatus(id, teamCode, 'rejected', 'reject', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'supervisor',
    }, reason);
  }

  /**
   * 升级诉求
   */
  async escalateAppeal(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    escalatedTo: string,
    comment?: string,
  ) {
    const appeal = await this.transitionStatus(id, teamCode, 'escalated', 'escalate', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'supervisor',
    }, comment);

    // 更新升级信息
    await this.prisma.crewAppeal.update({
      where: { id },
      data: {
        escalatedAt: new Date(),
        escalatedTo,
      },
    });

    return appeal;
  }

  /**
   * 退回处理（船舶确认不满意，要求重新处理）
   */
  async returnToProcessing(
    id: number,
    teamCode: TeamCode,
    operator: {
      operatorId: number;
      operatorName: string;
    },
    reason: string,
  ) {
    return this.transitionStatus(id, teamCode, 'processing', 'process', {
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: 'ship',
    }, reason);
  }

  /**
   * 核心状态流转方法
   */
  private async transitionStatus(
    id: number,
    teamCode: TeamCode,
    targetStatus: AppealStatusV2,
    action: string,
    operator: {
      operatorId: number;
      operatorName: string;
      operatorRole: string;
    },
    comment?: string,
  ) {
    const appeal = await this.findOne(id, teamCode);
    const currentStatus = appeal.status as AppealStatusV2;

    // 验证状态流转是否合法
    if (!this.validateTransition(currentStatus, targetStatus)) {
      throw new BadRequestException(
        `状态流转不允许：从 ${currentStatus} 到 ${targetStatus}`,
      );
    }

    // 更新状态
    const updated = await this.prisma.crewAppeal.update({
      where: { id },
      data: { status: targetStatus },
    });

    // 记录流转
    await this.recordTransition({
      appealId: id,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      action,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: operator.operatorRole,
      comment,
    });

    return updated;
  }

  /**
   * 更新诉求信息（仅限特定字段）
   */
  async update(
    id: number,
    teamCode: TeamCode,
    data: {
      title?: string;
      content?: string;
      category?: string;
      priority?: string;
    },
  ) {
    await this.findOne(id, teamCode);

    return this.prisma.crewAppeal.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除诉求
   */
  async remove(id: number, teamCode: TeamCode) {
    await this.findOne(id, teamCode);

    await this.prisma.crewAppeal.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * 获取统计数据
   */
  async getStats(teamCode: TeamCode) {
    const [total, pending, accepted, processing, resolved, confirmed, closed, rejected] = await Promise.all([
      this.prisma.crewAppeal.count({ where: { teamCode } }),
      this.prisma.crewAppeal.count({ where: { teamCode, status: 'pending' } }),
      this.prisma.crewAppeal.count({ where: { teamCode, status: 'accepted' } }),
      this.prisma.crewAppeal.count({ where: { teamCode, status: 'processing' } }),
      this.prisma.crewAppeal.count({ where: { teamCode, status: 'resolved' } }),
      this.prisma.crewAppeal.count({ where: { teamCode, status: 'confirmed' } }),
      this.prisma.crewAppeal.count({ where: { teamCode, status: 'closed' } }),
      this.prisma.crewAppeal.count({ where: { teamCode, status: 'rejected' } }),
    ]);

    // 计算闭环率（已确认/已关闭 vs 总数）
    const closedLoopCount = confirmed + closed;
    const closedLoopRate = total > 0 ? ((closedLoopCount / total) * 100).toFixed(1) : '0.0';

    // 计算平均处理时长（已完成诉求的平均处理时间）
    const avgProcessingTime = await this.calculateAvgProcessingTime(teamCode);

    return {
      total,
      pending,
      accepted,
      processing,
      resolved,
      confirmed,
      closed,
      rejected,
      closedLoopCount,
      closedLoopRate,
      avgProcessingTime,
    };
  }

  /**
   * 计算平均处理时长
   */
  private async calculateAvgProcessingTime(teamCode: TeamCode): Promise<string> {
    const resolvedAppeals = await this.prisma.crewAppeal.findMany({
      where: {
        teamCode,
        status: { in: ['confirmed', 'closed'] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (resolvedAppeals.length === 0) {
      return '0小时';
    }

    const totalMs = resolvedAppeals.reduce((acc, appeal) => {
      const diff = appeal.resolvedAt!.getTime() - appeal.createdAt.getTime();
      return acc + diff;
    }, 0);

    const avgMs = totalMs / resolvedAppeals.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天${hours % 24}小时`;
    }
    return `${hours}小时`;
  }

  /**
   * 获取待确认的诉求（船舶端）
   */
  async getPendingConfirmation(teamCode: TeamCode, shipId: number) {
    return this.prisma.crewAppeal.findMany({
      where: {
        teamCode,
        shipId,
        status: 'resolved',
      },
      orderBy: { resolvedAt: 'desc' },
    });
  }

  /**
   * 获取需要主管处理的诉求列表
   */
  async getAppealsForSupervisor(
    teamCode: TeamCode,
    options?: {
      includeProcessing?: boolean;
      includeResolved?: boolean;
    },
  ) {
    const statuses: AppealStatusV2[] = ['pending', 'accepted'];
    if (options?.includeProcessing) {
      statuses.push('processing');
    }
    if (options?.includeResolved) {
      statuses.push('resolved');
    }

    return this.prisma.crewAppeal.findMany({
      where: {
        teamCode,
        status: { in: statuses },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }
}
