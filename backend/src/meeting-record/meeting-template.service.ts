import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingTemplateService {
  constructor(private prisma: PrismaService) {}

  // 创建模板
  async create(data: {
    teamCode: string;
    userId: number;
    name: string;
    content: string;
    description?: string;
    isDefault?: boolean;
  }) {
    // 如果设为默认模板，先取消其他默认
    if (data.isDefault) {
      await this.prisma.meetingTemplate.updateMany({
        where: { teamCode: data.teamCode as any, userId: data.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.meetingTemplate.create({
      data: {
        teamCode: data.teamCode as any,
        userId: data.userId,
        name: data.name,
        content: data.content,
        description: data.description,
        isDefault: data.isDefault || false,
      },
    });
  }

  // 获取模板列表
  async findAll(teamCode: string, userId: number) {
    // 系统模板 + 用户自定义模板
    return this.prisma.meetingTemplate.findMany({
      where: {
        teamCode: teamCode as any,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { isSystem: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // 获取单个模板
  async findOne(id: number, teamCode: string) {
    const template = await this.prisma.meetingTemplate.findFirst({
      where: { id, teamCode: teamCode as any },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    return template;
  }

  // 更新模板
  async update(id: number, teamCode: string, data: {
    name?: string;
    content?: string;
    description?: string;
    isDefault?: boolean;
  }) {
    if (data.isDefault) {
      await this.prisma.meetingTemplate.updateMany({
        where: { teamCode: teamCode as any, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.meetingTemplate.update({
      where: { id, teamCode: teamCode as any },
      data,
    });
  }

  // 删除模板
  async remove(id: number, teamCode: string) {
    const template = await this.prisma.meetingTemplate.findFirst({
      where: { id, teamCode: teamCode as any },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (template.isSystem) {
      throw new ForbiddenException('系统模板不可删除');
    }

    await this.prisma.meetingTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  // 获取默认模板
  async getDefaultTemplate(teamCode: string) {
    return this.prisma.meetingTemplate.findFirst({
      where: {
        teamCode: teamCode as any,
        isDefault: true,
        isActive: true,
      },
    });
  }
}
