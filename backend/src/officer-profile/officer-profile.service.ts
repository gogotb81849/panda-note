import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole, OfficerGrade } from '@prisma/client';

const SHORE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

export interface CreateOfficerProfileDto {
  userId: number;
  shipId?: number;
  appointmentDate: string;
  expectedEndDate?: string;
  preTalk?: string;
  preTalkDate?: string;
  preTalkBy?: number;
  mentorPlan?: string;
  mentorName?: string;
  mentorId?: number;
  isThin?: boolean;
  isNewbie?: boolean;
  focusAreas?: any[];
}

export interface UpdateOfficerProfileDto {
  shipId?: number | null;
  appointmentDate?: string;
  expectedEndDate?: string | null;
  preTalk?: string;
  preTalkDate?: string;
  preTalkBy?: number | null;
  mentorPlan?: string;
  mentorName?: string;
  mentorId?: number | null;
  overallGrade?: string;
  strengths?: string;
  weaknesses?: string;
  improvePlan?: string;
  isThin?: boolean;
  isNewbie?: boolean;
  focusAreas?: any;
}

export interface CreateEvaluationDto {
  officerProfileId: number;
  officerId: number;
  evalDate: string;
  evalType: string;
  partyWork?: number;
  teamManage?: number;
  safetyAware?: number;
  communication?: number;
  learning?: number;
  overallScore: number;
  overallGrade: string;
  comments?: string;
  suggestions?: string;
}

export interface CreateMentorshipRecordDto {
  officerProfileId: number;
  menteeId: number;
  mentorId: number;
  recordDate: string;
  topic: string;
  content: string;
  advice?: string;
  menteeFeedback?: string;
  effectiveness?: string;
}

@Injectable()
export class OfficerProfileService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  private hasShoreManagementRole(role: UserRole): boolean {
    return SHORE_MANAGEMENT_ROLES.includes(role);
  }

  async create(
    dto: CreateOfficerProfileDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限创建政委履职档案');
    }

    // 验证政委用户
    const officer = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!officer || officer.teamCode !== teamCode) {
      throw new NotFoundException('政委不存在或不属于当前团队');
    }

    // 检查是否已存在档案
    const existing = await this.prisma.officerProfile.findFirst({
      where: { teamCode, userId: dto.userId },
    });
    if (existing) {
      throw new BadRequestException('该政委已存在履职档案');
    }

    if (dto.shipId !== undefined && dto.shipId !== null) {
      const ship = await this.prisma.ship.findUnique({ where: { id: dto.shipId } });
      if (!ship || ship.teamCode !== teamCode) {
        throw new NotFoundException('船舶不存在或不属于当前团队');
      }
    }

    // 统计该政委的活动数量和学习记录
    const [activityCount, studyCount] = await Promise.all([
      this.prisma.partyActivity.count({ where: { teamCode, createdById: dto.userId } }),
      this.prisma.studyRecord.count({ where: { teamCode, userId: dto.userId } }),
    ]);

    const result = await this.prisma.officerProfile.create({
      data: {
        teamCode,
        userId: dto.userId,
        shipId: dto.shipId || null,
        appointmentDate: new Date(dto.appointmentDate),
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
        preTalk: dto.preTalk || null,
        preTalkDate: dto.preTalkDate ? new Date(dto.preTalkDate) : null,
        preTalkBy: dto.preTalkBy || null,
        mentorPlan: dto.mentorPlan || null,
        mentorName: dto.mentorName || null,
        mentorId: dto.mentorId || null,
        isThin: dto.isThin || false,
        isNewbie: dto.isNewbie || false,
        focusAreas: dto.focusAreas || null,
        activityCount,
        studyCount,
      },
      include: {
        user: { select: { id: true, realName: true, role: true } },
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建政委履职档案：${officer.realName}`,
    });

    return result;
  }

  async findAll(
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    page?: number,
    pageSize?: number,
  ) {
    const where: any = { teamCode };

    // 非管理角色只能查看自己的档案
    if (!this.hasShoreManagementRole(role)) {
      where.userId = userId;
    }

    const orderBy = { createdAt: 'desc' as const };
    const include = {
      user: { select: { id: true, realName: true, role: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.officerProfile.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.officerProfile.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.officerProfile.findMany({ where, orderBy, include });
  }

  async findById(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    const profile = await this.prisma.officerProfile.findFirst({
      where: { id, teamCode },
      include: {
        user: { select: { id: true, realName: true, role: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('政委履职档案不存在');
    }

    // 权限校验
    if (!this.hasShoreManagementRole(role) && profile.userId !== userId) {
      throw new ForbiddenException('无权限查看此档案');
    }

    return profile;
  }

  async update(
    id: number,
    dto: UpdateOfficerProfileDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限编辑政委履职档案');
    }

    const existing = await this.prisma.officerProfile.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('政委履职档案不存在');

    const data: any = {};

    if (dto.overallGrade !== undefined) {
      if (!Object.values(OfficerGrade).includes(dto.overallGrade as OfficerGrade)) {
        throw new BadRequestException(`非法的评级: ${dto.overallGrade}`);
      }
      data.overallGrade = dto.overallGrade;
    }

    if (dto.shipId !== undefined) data.shipId = dto.shipId;
    if (dto.appointmentDate !== undefined) data.appointmentDate = new Date(dto.appointmentDate);
    if (dto.expectedEndDate !== undefined) data.expectedEndDate = dto.expectedEndDate ? new Date(dto.expectedEndDate) : null;
    if (dto.preTalk !== undefined) data.preTalk = dto.preTalk;
    if (dto.preTalkDate !== undefined) data.preTalkDate = dto.preTalkDate ? new Date(dto.preTalkDate) : null;
    if (dto.preTalkBy !== undefined) data.preTalkBy = dto.preTalkBy;
    if (dto.mentorPlan !== undefined) data.mentorPlan = dto.mentorPlan;
    if (dto.mentorName !== undefined) data.mentorName = dto.mentorName;
    if (dto.mentorId !== undefined) data.mentorId = dto.mentorId;
    if (dto.strengths !== undefined) data.strengths = dto.strengths;
    if (dto.weaknesses !== undefined) data.weaknesses = dto.weaknesses;
    if (dto.improvePlan !== undefined) data.improvePlan = dto.improvePlan;
    if (dto.isThin !== undefined) data.isThin = dto.isThin;
    if (dto.isNewbie !== undefined) data.isNewbie = dto.isNewbie;
    if (dto.focusAreas !== undefined) data.focusAreas = dto.focusAreas;

    // 自动重新计算统计数据
    data.activityCount = await this.prisma.partyActivity.count({
      where: { teamCode, createdById: existing.userId },
    });
    data.studyCount = await this.prisma.studyRecord.count({
      where: { teamCode, userId: existing.userId },
    });
    data.diaryCount = await this.prisma.diary.count({
      where: { teamCode, userId: existing.userId },
    });

    const result = await this.prisma.officerProfile.update({ where: { id }, data });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新政委履职档案：${id}`,
    });

    return result;
  }

  async refreshStats(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限刷新统计');
    }

    const profile = await this.prisma.officerProfile.findFirst({ where: { id, teamCode } });
    if (!profile) throw new NotFoundException('政委履职档案不存在');

    const [diaryCount, activityCount, studyCount] = await Promise.all([
      this.prisma.diary.count({ where: { teamCode, userId: profile.userId } }),
      this.prisma.partyActivity.count({ where: { teamCode, createdById: profile.userId } }),
      this.prisma.studyRecord.count({ where: { teamCode, userId: profile.userId } }),
    ]);

    const lastActive = await this.prisma.diary.findFirst({
      where: { teamCode, userId: profile.userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // 计算活跃天数（有日记的不同日期数）
    const activeDays = await this.prisma.diary.groupBy({
      by: ['date'],
      where: { teamCode, userId: profile.userId },
    });

    const result = await this.prisma.officerProfile.update({
      where: { id },
      data: {
        diaryCount,
        activityCount,
        studyCount,
        activeDays: activeDays.length,
        lastActiveAt: lastActive?.createdAt || null,
      },
    });

    return result;
  }

  async remove(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限删除政委履职档案');
    }

    const existing = await this.prisma.officerProfile.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('政委履职档案不存在');

    await this.prisma.officerProfile.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除政委履职档案：${id}`,
    });

    return { success: true };
  }

  // ============== 考核评价 ==============

  async createEvaluation(
    dto: CreateEvaluationDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限创建考核评价');
    }

    const profile = await this.prisma.officerProfile.findFirst({
      where: { id: dto.officerProfileId, teamCode },
    });
    if (!profile) {
      throw new NotFoundException('政委履职档案不存在');
    }

    if (!Object.values(OfficerGrade).includes(dto.overallGrade as OfficerGrade)) {
      throw new BadRequestException(`非法的评级: ${dto.overallGrade}`);
    }

    const result = await this.prisma.officerEvaluation.create({
      data: {
        teamCode,
        officerProfileId: dto.officerProfileId,
        officerId: dto.officerId,
        evaluatorId: userId,
        evalDate: new Date(dto.evalDate),
        evalType: dto.evalType,
        partyWork: dto.partyWork || null,
        teamManage: dto.teamManage || null,
        safetyAware: dto.safetyAware || null,
        communication: dto.communication || null,
        learning: dto.learning || null,
        overallScore: dto.overallScore,
        overallGrade: dto.overallGrade as OfficerGrade,
        comments: dto.comments || null,
        suggestions: dto.suggestions || null,
      },
      include: {
        officer: { select: { id: true, realName: true } },
        evaluator: { select: { id: true, realName: true } },
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建考核评价：${dto.evalType}`,
    });

    return result;
  }

  async getEvaluations(
    officerProfileId: number,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    page?: number,
    pageSize?: number,
  ) {
    const where: any = { teamCode, officerProfileId };

    const orderBy = { evalDate: 'desc' as const };
    const include = {
      officer: { select: { id: true, realName: true } },
      evaluator: { select: { id: true, realName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.officerEvaluation.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.officerEvaluation.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.officerEvaluation.findMany({ where, orderBy, include });
  }

  async removeEvaluation(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限删除考核评价');
    }

    const existing = await this.prisma.officerEvaluation.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('考核评价不存在');

    await this.prisma.officerEvaluation.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除考核评价：${id}`,
    });

    return { success: true };
  }

  // ============== 传帮带记录 ==============

  async createMentorshipRecord(
    dto: CreateMentorshipRecordDto,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限创建传帮带记录');
    }

    const profile = await this.prisma.officerProfile.findFirst({
      where: { id: dto.officerProfileId, teamCode },
    });
    if (!profile) {
      throw new NotFoundException('政委履职档案不存在');
    }

    const result = await this.prisma.mentorshipRecord.create({
      data: {
        teamCode,
        officerProfileId: dto.officerProfileId,
        menteeId: dto.menteeId,
        mentorId: dto.mentorId,
        recordDate: new Date(dto.recordDate),
        topic: dto.topic,
        content: dto.content,
        advice: dto.advice || null,
        menteeFeedback: dto.menteeFeedback || null,
        effectiveness: dto.effectiveness || 'good',
      },
      include: {
        mentee: { select: { id: true, realName: true } },
        mentor: { select: { id: true, realName: true } },
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建传帮带记录：${dto.topic}`,
    });

    return result;
  }

  async getMentorshipRecords(
    officerProfileId: number,
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    page?: number,
    pageSize?: number,
  ) {
    const where: any = { teamCode, officerProfileId };

    const orderBy = { recordDate: 'desc' as const };
    const include = {
      mentee: { select: { id: true, realName: true } },
      mentor: { select: { id: true, realName: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.mentorshipRecord.findMany({ where, orderBy, include, skip, take: pageSize }),
        this.prisma.mentorshipRecord.count({ where }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.prisma.mentorshipRecord.findMany({ where, orderBy, include });
  }

  async removeMentorshipRecord(id: number, userId: number, teamCode: TeamCode, role: UserRole) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限删除传帮带记录');
    }

    const existing = await this.prisma.mentorshipRecord.findFirst({ where: { id, teamCode } });
    if (!existing) throw new NotFoundException('传帮带记录不存在');

    await this.prisma.mentorshipRecord.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除传帮带记录：${id}`,
    });

    return { success: true };
  }

  // ============== 统计 ==============

  async getOfficerStats(
    userId: number,
    teamCode: TeamCode,
    role: UserRole,
    filters?: { dateFrom?: string; dateTo?: string },
  ) {
    if (!this.hasShoreManagementRole(role)) {
      throw new ForbiddenException('无权限查看统计信息');
    }

    const where: any = { teamCode };

    const total = await this.prisma.officerProfile.count({ where });
    const newbies = await this.prisma.officerProfile.count({ where: { ...where, isNewbie: true } });
    const thin = await this.prisma.officerProfile.count({ where: { ...where, isThin: true } });

    const byGrade = await this.prisma.officerProfile.groupBy({
      by: ['overallGrade'],
      where: { ...where, overallGrade: { not: null } },
      _count: { id: true },
    });

    const avgStats = await this.prisma.officerProfile.aggregate({
      where,
      _avg: {
        diaryCount: true,
        activityCount: true,
        studyCount: true,
        activeDays: true,
      },
    });

    return {
      total,
      newbies,
      thin,
      byGrade: byGrade.map((item) => ({ grade: item.overallGrade, count: item._count.id })),
      avgStats: {
        diaryCount: Math.round(avgStats._avg.diaryCount || 0),
        activityCount: Math.round(avgStats._avg.activityCount || 0),
        studyCount: Math.round(avgStats._avg.studyCount || 0),
        activeDays: Math.round(avgStats._avg.activeDays || 0),
      },
    };
  }
}
