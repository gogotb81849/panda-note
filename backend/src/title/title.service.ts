import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode, UserRole } from '@prisma/client';

@Injectable()
export class TitleService {
  constructor(private prisma: PrismaService) {}

  // 获取用户可用的标题列表（按一级分组）
  async getUserTitles(teamCode: TeamCode, role: UserRole) {
    const titles = await this.prisma.userTitle.findMany({
      where: { teamCode, role, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { categoryFirst: 'asc' }, { categorySecond: 'asc' }],
    });

    // 按一级分类分组
    const grouped: Record<string, { id: number; title: string; description?: string }[]> = {};
    for (const t of titles) {
      if (!grouped[t.categoryFirst]) {
        grouped[t.categoryFirst] = [];
      }
      grouped[t.categoryFirst].push({
        id: t.id,
        title: t.categorySecond,
        description: t.description || undefined,
      });
    }
    return grouped;
  }

  // 获取所有一级分类
  async getCategoryFirstList(teamCode: TeamCode, role: UserRole) {
    const categories = await this.prisma.userTitle.findMany({
      where: { teamCode, role, isActive: true },
      select: { categoryFirst: true },
      distinct: ['categoryFirst'],
      orderBy: { categoryFirst: 'asc' },
    });
    return categories.map(c => c.categoryFirst);
  }

  // 创建标题
  async createTitle(teamCode: TeamCode, userId: number, role: UserRole, data: {
    categoryFirst: string;
    categorySecond: string;
    description?: string;
    sortOrder?: number;
  }) {
    return this.prisma.userTitle.create({
      data: {
        teamCode,
        userId,
        role,
        categoryFirst: data.categoryFirst,
        categorySecond: data.categorySecond,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
        isSystem: false,
        isUserCustom: true,
      },
    });
  }

  // 更新标题
  async updateTitle(id: number, teamCode: TeamCode, userId: number, data: {
    categoryFirst?: string;
    categorySecond?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    role?: UserRole;
  }) {
    const title = await this.prisma.userTitle.findUnique({ where: { id } });
    if (!title || title.teamCode !== teamCode) {
      throw new NotFoundException('标题不存在');
    }
    return this.prisma.userTitle.update({
      where: { id },
      data,
    });
  }

  // 删除标题
  async deleteTitle(id: number, teamCode: TeamCode) {
    return this.prisma.userTitle.delete({
      where: { id, teamCode },
    });
  }

  // 批量更新排序
  async updateSort(teamCode: TeamCode, updates: { id: number; sortOrder: number }[]) {
    const promises = updates.map(u =>
      this.prisma.userTitle.update({
        where: { id: u.id, teamCode },
        data: { sortOrder: u.sortOrder },
      }),
    );
    return Promise.all(promises);
  }

  // 移动标题到另一个类别或角色
  async moveTitle(id: number, teamCode: TeamCode, data: {
    categoryFirst?: string;
    role?: UserRole;
  }) {
    const title = await this.prisma.userTitle.findUnique({ where: { id } });
    if (!title || title.teamCode !== teamCode) {
      throw new NotFoundException('标题不存在');
    }
    return this.prisma.userTitle.update({
      where: { id },
      data: {
        ...(data.categoryFirst && { categoryFirst: data.categoryFirst }),
        ...(data.role && { role: data.role }),
      },
    });
  }

  // 复制标题
  async copyTitle(id: number, teamCode: TeamCode, userId: number, data: {
    categoryFirst?: string;
    role?: UserRole;
  }) {
    const title = await this.prisma.userTitle.findUnique({ where: { id } });
    if (!title || title.teamCode !== teamCode) {
      throw new NotFoundException('标题不存在');
    }
    return this.prisma.userTitle.create({
      data: {
        teamCode,
        userId,
        role: data.role || title.role,
        categoryFirst: data.categoryFirst || title.categoryFirst,
        categorySecond: title.categorySecond,
        description: title.description,
        sortOrder: title.sortOrder,
        isSystem: false,
        isUserCustom: true,
      },
    });
  }

  // 记录日记标题使用
  async recordTitleUsage(teamCode: TeamCode, diaryId: number, userId: number, data: {
    categoryFirst: string;
    categorySecond: string;
    isAISuggested?: boolean;
    userAccepted?: boolean;
  }) {
    return this.prisma.diaryTitleUsage.create({
      data: {
        teamCode,
        diaryId,
        userId,
        categoryFirst: data.categoryFirst,
        categorySecond: data.categorySecond,
        usageDate: new Date(),
        isAISuggested: data.isAISuggested || false,
        userAccepted: data.userAccepted || false,
      },
    });
  }

  // 初始化系统预设标题
  async initSystemTitles(teamCode: TeamCode) {
    const systemTitles = [
      // 航行安全
      { categoryFirst: '航行安全', categorySecond: '狭水道航行', description: '船舶通过狭水道、浅水区航行', sortOrder: 1 },
      { categoryFirst: '航行安全', categorySecond: '进出港操作', description: '船舶进出港口操作', sortOrder: 2 },
      { categoryFirst: '航行安全', categorySecond: '锚泊操作', description: '锚泊、起锚操作', sortOrder: 3 },
      { categoryFirst: '航行安全', categorySecond: '引航员上下船', description: '引航员登船、离船', sortOrder: 4 },
      { categoryFirst: '航行安全', categorySecond: '恶劣天气航行', description: '大风浪、雾航等', sortOrder: 5 },

      // 公司检查
      { categoryFirst: '公司检查', categorySecond: '大油公司检查', description: '石油公司检查', sortOrder: 10 },
      { categoryFirst: '公司检查', categorySecond: '船旗国检查', description: 'FSC检查', sortOrder: 11 },
      { categoryFirst: '公司检查', categorySecond: 'PSC检查', description: '港口国监督检查', sortOrder: 12 },
      { categoryFirst: '公司检查', categorySecond: '内部审核', description: '公司内部审核', sortOrder: 13 },

      // 人员管理
      { categoryFirst: '人员管理', categorySecond: '人员换班', description: '船员上下船换班', sortOrder: 20 },
      { categoryFirst: '人员管理', categorySecond: '船员培训', description: '船员业务培训', sortOrder: 21 },
      { categoryFirst: '人员管理', categorySecond: '伤病报告', description: '船员伤病情况', sortOrder: 22 },
      { categoryFirst: '人员管理', categorySecond: '党建工作', description: '党支部活动、学习', sortOrder: 23 },

      // 设备维护
      { categoryFirst: '设备维护', categorySecond: '主机维护', description: '主机保养、维修', sortOrder: 30 },
      { categoryFirst: '设备维护', categorySecond: '舵机检查', description: '舵机系统检查', sortOrder: 31 },
      { categoryFirst: '设备维护', categorySecond: '应急演习', description: '消防、弃船等演习', sortOrder: 32 },
      { categoryFirst: '设备维护', categorySecond: '货物作业', description: '装卸货作业', sortOrder: 33 },

      // 安全管理
      { categoryFirst: '安全管理', categorySecond: '安全会议', description: '安全会议记录', sortOrder: 40 },
      { categoryFirst: '安全管理', categorySecond: '事故报告', description: '事故、险情报告', sortOrder: 41 },
      { categoryFirst: '安全管理', categorySecond: '保安检查', description: 'ISPS保安检查', sortOrder: 42 },
    ];

    // 为每个角色初始化
    const roles: UserRole[] = ['ship_political_instructor', 'shore_crew_supervisor'];
    for (const role of roles) {
      for (const t of systemTitles) {
        const exists = await this.prisma.userTitle.findFirst({
          where: { teamCode, role: role as UserRole, categoryFirst: t.categoryFirst, categorySecond: t.categorySecond },
        });
        if (!exists) {
          await this.prisma.userTitle.create({
            data: {
              teamCode,
              userId: 0, // 系统创建
              role,
              categoryFirst: t.categoryFirst,
              categorySecond: t.categorySecond,
              description: t.description,
              sortOrder: t.sortOrder,
              isSystem: true,
              isUserCustom: false,
            },
          });
        }
      }
    }
  }
}
