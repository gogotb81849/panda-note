import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole } from '@prisma/client';

export interface CreateExperienceDto {
  title: string;
  category: string;
  content: string;
  shipName?: string;
  attachmentUrl?: string;
}

export interface UpdateExperienceDto {
  title?: string;
  category?: string;
  content?: string;
  shipName?: string;
  attachmentUrl?: string;
}

export type SortField = 'createdAt' | 'rating' | 'commentCount' | 'viewCount' | 'likeCount';
export type SortOrder = 'asc' | 'desc';

@Injectable()
export class ExperienceService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  async create(dto: CreateExperienceDto, userId: number, realName: string, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const result = await this.prisma.experience.create({
      data: {
        title: dto.title,
        category: dto.category,
        content: dto.content,
        authorId: userId,
        authorName: realName,
        shipName: dto.shipName || null,
        attachmentUrl: dto.attachmentUrl || null,
        teamCode,
      },
      include: { author: { select: { id: true, realName: true } } },
    });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'create',
      operationContent: `创建经验：${result.title}`,
      ipAddress,
      userAgent,
    });

    return result;
  }

  async findAll(
    userId: number,
    teamCode: TeamCode,
    category?: string,
    keyword?: string,
    page?: number,
    pageSize?: number,
    sortField: SortField = 'createdAt',
    sortOrder: SortOrder = 'desc',
  ) {
    const where: any = { teamCode };
    if (category) where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { authorName: { contains: keyword } },
        { shipName: { contains: keyword } },
      ];
    }

    // 构建排序
    const orderBy: any = {};
    orderBy[sortField] = sortOrder;

    const include = {
      author: { select: { id: true, realName: true } },
      _count: { select: { ratings: true, comments: true } },
    };

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.prisma.experience.findMany({
          where,
          orderBy,
          include,
          skip,
          take: pageSize,
        }),
        this.prisma.experience.count({ where }),
      ]);
      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    return this.prisma.experience.findMany({
      where,
      orderBy,
      include,
    });
  }

  async findById(id: number, userId: number, teamCode: TeamCode) {
    await this.prisma.experience.update({ where: { id, teamCode }, data: { viewCount: { increment: 1 } } });
    const record = await this.prisma.experience.findFirst({
      where: { id, teamCode },
      include: {
        author: { select: { id: true, realName: true } },
        ratings: { include: { user: { select: { id: true, realName: true } } } },
        comments: {
          where: { parentId: null }, // 只查顶级评论
          include: {
            user: { select: { id: true, realName: true } },
            replies: {
              include: {
                user: { select: { id: true, realName: true } },
                replies: {
                  include: {
                    user: { select: { id: true, realName: true } },
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return record;
  }

  async update(id: number, dto: UpdateExperienceDto, userId: number, role: UserRole, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const experience = await this.prisma.experience.findFirst({ where: { id, teamCode } });
    if (!experience) {
      throw new NotFoundException('经验记录不存在');
    }
    if (experience.authorId !== userId) {
      throw new ForbiddenException('无权限修改他人经验记录');
    }
    const result = await this.prisma.experience.update({ where: { id, teamCode }, data: dto });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'update',
      operationContent: `更新经验：${result.title || experience.title}`,
      ipAddress,
      userAgent,
    });

    return result;
  }

  async remove(id: number, userId: number, role: UserRole, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const experience = await this.prisma.experience.findFirst({ where: { id, teamCode } });
    if (!experience) {
      throw new NotFoundException('经验记录不存在');
    }
    const isAuthor = experience.authorId === userId;
    const isAdmin = role !== UserRole.ship_political_instructor;
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('无权限删除他人经验记录');
    }
    await this.prisma.experienceRating.deleteMany({ where: { experienceId: id } });
    await this.prisma.experienceComment.deleteMany({ where: { experienceId: id } });
    await this.prisma.experienceLike.deleteMany({ where: { experienceId: id } });
    await this.prisma.experience.delete({ where: { id, teamCode } });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: 'delete',
      operationContent: `删除经验：${id}`,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  async rateExperience(experienceId: number, userId: number, rating: number, teamCode: TeamCode) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('评分必须在1-5之间');
    }

    const experience = await this.prisma.experience.findFirst({
      where: { id: experienceId, teamCode },
    });
    if (!experience) {
      throw new NotFoundException('经验记录不存在或不属于当前团队');
    }

    const existing = await this.prisma.experienceRating.findFirst({
      where: { experienceId, userId },
    });
    if (existing) {
      await this.prisma.experienceRating.update({ where: { id: existing.id }, data: { rating } });
    } else {
      await this.prisma.experienceRating.create({
        data: { experienceId, userId, rating, teamCode },
      });
    }

    const agg = await this.prisma.experienceRating.aggregate({
      where: { experienceId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const avgRating = agg._avg.rating ?? 0;
    const ratingCount = agg._count.rating;

    return this.prisma.experience.update({
      where: { id: experienceId },
      data: { rating: avgRating, ratingCount },
    });
  }

  // 评论经验（支持二级嵌套）
  async commentExperience(experienceId: number, userId: number, content: string, teamCode: TeamCode, parentId?: number, replyToUserId?: number) {
    const experience = await this.prisma.experience.findFirst({
      where: { id: experienceId, teamCode },
    });
    if (!experience) {
      throw new NotFoundException('经验记录不存在');
    }

    // 如果有parentId，验证父评论存在且属于同一经验
    if (parentId) {
      const parentComment = await this.prisma.experienceComment.findFirst({
        where: { id: parentId, experienceId },
      });
      if (!parentComment) {
        throw new NotFoundException('父评论不存在');
      }
      // 二级嵌套：parentId有值时不能再有parentId
      if (parentComment.parentId !== null) {
        throw new BadRequestException('不支持超过二级的嵌套评论');
      }
    }

    const comment = await this.prisma.experienceComment.create({
      data: {
        experienceId,
        userId,
        content,
        teamCode,
        parentId: parentId || null,
        replyToUserId: replyToUserId || null,
      },
      include: {
        user: { select: { id: true, realName: true } },
        replies: {
          include: {
            user: { select: { id: true, realName: true } },
          },
        },
      },
    });

    // 更新评论计数
    await this.prisma.experience.update({
      where: { id: experienceId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  // 删除评论
  async deleteComment(commentId: number, userId: number, teamCode: TeamCode) {
    const comment = await this.prisma.experienceComment.findFirst({
      where: { id: commentId, teamCode },
    });
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 只有评论作者或管理员可删除
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (comment.userId !== userId && user?.role === UserRole.ship_political_instructor) {
      throw new ForbiddenException('无权限删除此评论');
    }

    // 删除评论及其回复
    const replyIds = await this.prisma.experienceComment.findMany({
      where: { parentId: commentId },
      select: { id: true },
    });
    const allIds = [commentId, ...replyIds.map(r => r.id)];

    await this.prisma.experienceComment.deleteMany({
      where: { id: { in: allIds } },
    });

    // 更新评论计数
    const experience = await this.prisma.experience.findFirst({
      where: { id: comment.experienceId, teamCode },
    });
    if (experience) {
      await this.prisma.experience.update({
        where: { id: comment.experienceId },
        data: { commentCount: { decrement: allIds.length } },
      });
    }

    return { success: true };
  }

  async toggleLike(experienceId: number, userId: number, teamCode: TeamCode) {
    const existing = await this.prisma.experienceLike.findFirst({ where: { experienceId, userId } });
    if (existing) {
      await this.prisma.experienceLike.delete({ where: { id: existing.id } });
      return this.prisma.experience.update({ where: { id: experienceId }, data: { likeCount: { decrement: 1 } } });
    } else {
      await this.prisma.experienceLike.create({ data: { experienceId, userId, teamCode } });
      return this.prisma.experience.update({ where: { id: experienceId }, data: { likeCount: { increment: 1 } } });
    }
  }

  // ========== 分类目录管理 ==========

  // 获取分类目录树
  async getCategories(teamCode: TeamCode) {
    const categories = await this.prisma.experienceCategory.findMany({
      where: { teamCode, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // 构建树形结构
    const rootCategories = categories.filter(c => !c.parentId);
    const buildTree = (parent: any): any => {
      const children = categories.filter(c => c.parentId === parent.id);
      return {
        ...parent,
        children: children.map(buildTree),
      };
    };

    return rootCategories.map(buildTree);
  }

  // 创建分类
  async createCategory(data: { name: string; icon?: string; color?: string; parentId?: number; sortOrder?: number }, teamCode: TeamCode, userId: number) {
    // 验证父分类存在
    if (data.parentId) {
      const parent = await this.prisma.experienceCategory.findFirst({
        where: { id: data.parentId, teamCode },
      });
      if (!parent) {
        throw new NotFoundException('父分类不存在');
      }
    }

    return this.prisma.experienceCategory.create({
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
        sortOrder: data.sortOrder ?? 0,
        teamCode,
      },
    });
  }

  // 更新分类
  async updateCategory(id: number, data: { name?: string; icon?: string; color?: string; sortOrder?: number; isExpanded?: boolean }, teamCode: TeamCode) {
    const category = await this.prisma.experienceCategory.findFirst({
      where: { id, teamCode },
    });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return this.prisma.experienceCategory.update({
      where: { id },
      data,
    });
  }

  // 删除分类
  async deleteCategory(id: number, teamCode: TeamCode) {
    const category = await this.prisma.experienceCategory.findFirst({
      where: { id, teamCode },
    });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    // 删除子分类
    await this.prisma.experienceCategory.deleteMany({
      where: { parentId: id },
    });

    return this.prisma.experienceCategory.delete({
      where: { id },
    });
  }

  // ========== 临时权限管理 ==========

  // 检查用户是否有特定权限
  async checkPermission(userId: number, teamCode: TeamCode, permissionType: string): Promise<boolean> {
    // 先检查是否有有效的临时权限
    const permission = await this.prisma.experiencePermission.findFirst({
      where: {
        userId,
        teamCode,
        permissionType,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
    return !!permission;
  }

  // 授予临时权限
  async grantPermission(data: { userId: number; permissionType: string; reason?: string; expiresAt?: Date }, grantedBy: number, teamCode: TeamCode) {
    // 验证被授权用户存在
    const user = await this.prisma.user.findFirst({ where: { id: data.userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查是否已存在权限记录
    const existing = await this.prisma.experiencePermission.findFirst({
      where: { userId: data.userId, teamCode, permissionType: data.permissionType },
    });

    if (existing) {
      return this.prisma.experiencePermission.update({
        where: { id: existing.id },
        data: {
          grantedBy,
          reason: data.reason,
          expiresAt: data.expiresAt,
          isActive: true,
        },
      });
    }

    return this.prisma.experiencePermission.create({
      data: {
        userId: data.userId,
        teamCode,
        grantedBy,
        permissionType: data.permissionType,
        reason: data.reason,
        expiresAt: data.expiresAt,
      },
    });
  }

  // 撤销权限
  async revokePermission(userId: number, permissionType: string, teamCode: TeamCode) {
    return this.prisma.experiencePermission.updateMany({
      where: { userId, teamCode, permissionType },
      data: { isActive: false },
    });
  }

  // 获取用户的所有权限
  async getUserPermissions(userId: number, teamCode: TeamCode) {
    return this.prisma.experiencePermission.findMany({
      where: {
        userId,
        teamCode,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
  }

  // 获取团队所有用户的权限列表
  async getAllPermissions(teamCode: TeamCode) {
    return this.prisma.experiencePermission.findMany({
      where: { teamCode, isActive: true },
      include: {
        user: { select: { id: true, realName: true, username: true } },
      },
    });
  }
}
