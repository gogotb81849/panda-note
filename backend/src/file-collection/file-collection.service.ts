import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NamingRuleService } from './naming-rule.service';
import { Prisma, TeamCode, UserRole } from '@prisma/client';

export interface CreateCollectionDto {
  title: string;
  description?: string;
  targetShips: Array<{ shipId: number; shipName: string }>;
  fileType?: string;
  namingRule?: string;
  maxSize?: number;
  deadline: string;
  status?: string;
}

export interface SubmitFileDto {
  shipId: number;
  fileId: number;
  fileName: string;
}

const MANAGER_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

@Injectable()
export class FileCollectionService {
  private readonly logger = new Logger(FileCollectionService.name);

  constructor(
    private prisma: PrismaService,
    private namingRuleService: NamingRuleService,
  ) {}

  async create(
    dto: CreateCollectionDto,
    userId: number,
    teamCode: TeamCode,
    realName?: string,
  ) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('任务名称不能为空');
    }

    const deadline = new Date(dto.deadline);
    if (isNaN(deadline.getTime())) {
      throw new BadRequestException('截止时间格式不正确');
    }

    if (!dto.targetShips || dto.targetShips.length === 0) {
      throw new BadRequestException('请至少选择一艘目标船舶');
    }

    // 计算总数量
    const totalCount = dto.targetShips.length;

    // 如果有命名规则，验证一下
    if (dto.namingRule) {
      // 简单验证：至少包含一个变量
      if (!/{\w+}/.test(dto.namingRule)) {
        throw new BadRequestException('命名规则至少包含一个变量（如 {shipName}）');
      }
    }

    const collection = await this.prisma.fileCollection.create({
      data: {
        title: dto.title.trim(),
        description: dto.description || null,
        creatorId: userId,
        teamCode,
        targetShips: dto.targetShips as Prisma.InputJsonValue,
        fileType: dto.fileType || null,
        namingRule: dto.namingRule || null,
        maxSize: dto.maxSize || null,
        deadline,
        totalCount,
        submittedCount: 0,
      },
      include: {
        creator: { select: { id: true, realName: true } },
      },
    });

    return collection;
  }

  async findAll(
    teamCode: TeamCode,
    status?: string,
    page?: number,
    pageSize?: number,
  ) {
    const where: Prisma.FileCollectionWhereInput = { teamCode };

    if (status) {
      where.status = status;
    }

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.fileCollection.findMany({
          where,
          include: {
            creator: { select: { id: true, realName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        this.prisma.fileCollection.count({ where }),
      ]);
      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    return this.prisma.fileCollection.findMany({
      where,
      include: {
        creator: { select: { id: true, realName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, teamCode: TeamCode, userId?: number, userRole?: UserRole) {
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id, teamCode },
      include: {
        creator: { select: { id: true, realName: true } },
        submissions: {
          include: {
            ship: { select: { id: true, cnShipName: true } },
            submitter: { select: { id: true, realName: true } },
            file: {
              select: { id: true, fileName: true, originalName: true, fileSize: true, fileType: true, filePath: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    // 非管理员只能查看自己创建的或已提交的
    if (userRole && !MANAGER_ROLES.includes(userRole)) {
      const isCreator = collection.creatorId === userId;
      if (!isCreator) {
        throw new ForbiddenException('无权查看此任务');
      }
    }

    // 计算已提交数量
    const submittedCount = collection.submissions.length;

    return { ...collection, submittedCount };
  }

  async update(
    id: number,
    dto: Partial<CreateCollectionDto>,
    userId: number,
    teamCode: TeamCode,
    userRole: UserRole,
  ) {
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id, teamCode },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    const isManager = MANAGER_ROLES.includes(userRole);
    if (collection.creatorId !== userId && !isManager) {
      throw new ForbiddenException('无权修改此任务');
    }

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title.trim();
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.fileType !== undefined) updateData.fileType = dto.fileType;
    if (dto.namingRule !== undefined) updateData.namingRule = dto.namingRule;
    if (dto.maxSize !== undefined) updateData.maxSize = dto.maxSize;
    if (dto.deadline) {
      const deadline = new Date(dto.deadline);
      if (isNaN(deadline.getTime())) {
        throw new BadRequestException('截止时间格式不正确');
      }
      updateData.deadline = deadline;
    }
    if (dto.targetShips) {
      updateData.targetShips = dto.targetShips as Prisma.InputJsonValue;
      updateData.totalCount = dto.targetShips.length;
    }
    if (dto.status) {
      updateData.status = dto.status;
    }

    return this.prisma.fileCollection.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, realName: true } },
      },
    });
  }

  async remove(id: number, userId: number, teamCode: TeamCode, userRole: UserRole) {
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id, teamCode },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    const isManager = MANAGER_ROLES.includes(userRole);
    if (collection.creatorId !== userId && !isManager) {
      throw new ForbiddenException('无权删除此任务');
    }

    await this.prisma.fileSubmission.deleteMany({
      where: { collectionId: id },
    });

    return this.prisma.fileCollection.delete({
      where: { id },
    });
  }

  async submitFile(
    collectionId: number,
    dto: SubmitFileDto,
    userId: number,
    teamCode: TeamCode,
  ) {
    // 1. 检查收集任务是否存在且活跃
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id: collectionId, teamCode },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    if (collection.status !== 'active') {
      throw new BadRequestException('该收集任务已关闭');
    }

    // 检查截止时间
    if (new Date(collection.deadline) < new Date()) {
      throw new BadRequestException('该收集任务已过期');
    }

    // 2. 检查文件是否存在
    const file = await this.prisma.sharedFile.findFirst({
      where: { id: dto.fileId, teamCode },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    // 3. 检查文件大小
    if (collection.maxSize && file.fileSize > collection.maxSize * 1024 * 1024) {
      throw new BadRequestException(`文件大小超过限制（最大 ${collection.maxSize}MB）`);
    }

    // 4. 检查船舶是否在目标列表中
    const targetShips = collection.targetShips as Array<{ shipId: number; shipName: string }>;
    const targetShip = targetShips.find((s: any) => s.shipId === dto.shipId);

    if (!targetShip) {
      throw new BadRequestException('该船舶不在收集范围内');
    }

    // 5. 检查是否已提交过
    const existing = await this.prisma.fileSubmission.findUnique({
      where: { collectionId_shipId: { collectionId, shipId: dto.shipId } },
    });

    if (existing && existing.status === 'submitted') {
      throw new BadRequestException('该船舶已提交过文件');
    }

    // 6. 生成重命名后的文件名
    let renamedName = dto.fileName;
    if (collection.namingRule) {
      renamedName = this.namingRuleService.generateFileNameWithExt(
        collection.namingRule,
        {
          shipName: targetShip.shipName,
          submitter: userId ? String(userId) : '',
          taskName: collection.title,
          originalName: dto.fileName,
        },
        dto.fileName,
      );
    }

    // 7. 创建提交记录
    const submission = await this.prisma.$transaction(async (tx) => {
      let result;
      if (existing) {
        // 更新已有提交（重新提交）
        result = await tx.fileSubmission.update({
          where: { id: existing.id },
          data: {
            fileId: dto.fileId,
            fileName: dto.fileName,
            renamedName,
            status: 'submitted',
            rejectReason: null,
            submittedAt: new Date(),
          },
          include: {
            ship: { select: { id: true, cnShipName: true } },
            submitter: { select: { id: true, realName: true } },
            file: { select: { id: true, fileName: true, originalName: true } },
          },
        });
      } else {
        result = await tx.fileSubmission.create({
          data: {
            collectionId,
            shipId: dto.shipId,
            submitterId: userId,
            fileId: dto.fileId,
            fileName: dto.fileName,
            renamedName,
            status: 'submitted',
          },
          include: {
            ship: { select: { id: true, cnShipName: true } },
            submitter: { select: { id: true, realName: true } },
            file: { select: { id: true, fileName: true, originalName: true } },
          },
        });
      }

      // 更新提交计数
      const submittedCount = await tx.fileSubmission.count({
        where: { collectionId, status: 'submitted' },
      });

      await tx.fileCollection.update({
        where: { id: collectionId },
        data: { submittedCount },
      });

      return result;
    });

    return submission;
  }

  async rejectSubmission(
    collectionId: number,
    submissionId: number,
    reason: string,
    userId: number,
    teamCode: TeamCode,
    userRole: UserRole,
  ) {
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id: collectionId, teamCode },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    const submission = await this.prisma.fileSubmission.findFirst({
      where: { id: submissionId, collectionId },
    });

    if (!submission) {
      throw new NotFoundException('提交记录不存在');
    }

    const isManager = MANAGER_ROLES.includes(userRole);
    if (collection.creatorId !== userId && !isManager) {
      throw new ForbiddenException('无权操作此任务');
    }

    return this.prisma.fileSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'rejected',
        rejectReason: reason,
      },
      include: {
        ship: { select: { id: true, cnShipName: true } },
        submitter: { select: { id: true, realName: true } },
        file: { select: { id: true, fileName: true } },
      },
    });
  }

  /**
   * 获取可下载的文件列表（用于前端JSZip批量打包）
   */
  async getDownloadFiles(
    collectionId: number,
    teamCode: TeamCode,
    userId: number,
    userRole?: UserRole,
  ) {
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id: collectionId, teamCode },
      include: {
        submissions: {
          include: {
            file: {
              select: { id: true, fileName: true, originalName: true, filePath: true, fileSize: true, fileType: true },
            },
            ship: { select: { id: true, cnShipName: true } },
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    const isManager = userRole && MANAGER_ROLES.includes(userRole);
    const isCreator = collection.creatorId === userId;
    if (!isCreator && !isManager) {
      throw new ForbiddenException('无权下载此任务文件');
    }

    const submissions = collection.submissions.filter((s) => s.status === 'submitted');

    return submissions.map((s) => ({
      submissionId: s.id,
      fileName: s.fileName,
      renamedName: s.renamedName,
      fileId: s.file.id,
      filePath: s.file.filePath,
      fileSize: s.file.fileSize,
      fileType: s.file.fileType,
      shipName: s.ship.cnShipName,
    }));
  }

  /**
   * 获取未提交的船舶列表
   */
  async getUnsubmittedShips(collectionId: number, teamCode: TeamCode) {
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id: collectionId, teamCode },
      select: { targetShips: true, status: true },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    const targetShips = collection.targetShips as Array<{ shipId: number; shipName: string }>;

    const submitted = await this.prisma.fileSubmission.findMany({
      where: { collectionId, status: 'submitted' },
      select: { shipId: true },
    });

    const submittedShipIds = new Set(submitted.map((s: any) => s.shipId));

    return targetShips.filter((s: any) => !submittedShipIds.has(s.shipId));
  }

  /**
   * 催收通知（返回需要催收的船舶和提交人信息）
   */
  async getRemindList(collectionId: number, teamCode: TeamCode) {
    const collection = await this.prisma.fileCollection.findFirst({
      where: { id: collectionId, teamCode },
      select: { targetShips: true, title: true, deadline: true },
    });

    if (!collection) {
      throw new NotFoundException('收集任务不存在');
    }

    const targetShips = collection.targetShips as Array<{ shipId: number; shipName: string }>;

    const submitted = await this.prisma.fileSubmission.findMany({
      where: { collectionId, status: 'submitted' },
      select: { shipId: true, submitter: { select: { id: true, realName: true } } },
    });

    const submittedShipIds = new Set(submitted.map((s: any) => s.shipId));
    const unsubmitted = targetShips.filter((s: any) => !submittedShipIds.has(s.shipId));

    // 获取船舶对应的政委信息
    const shipsWithPolitical = await this.prisma.ship.findMany({
      where: {
        id: { in: unsubmitted.map((s: any) => s.shipId) },
      },
      select: {
        id: true,
        cnShipName: true,
        politicalOfficerName: true,
        politicalOfficerId: true,
      },
    });

    return {
      collectionTitle: collection.title,
      deadline: collection.deadline,
      unsubmittedShips: shipsWithPolitical,
      totalTarget: targetShips.length,
      submittedCount: submitted.length,
    };
  }
}