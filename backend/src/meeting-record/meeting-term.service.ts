import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingTermService {
  constructor(private prisma: PrismaService) {}

  // 添加专业术语
  async create(data: {
    teamCode: string;
    userId: number;
    term: string;
    explanation?: string;
    category?: string;
  }) {
    try {
      return await this.prisma.meetingTerm.create({
        data: {
          teamCode: data.teamCode as any,
          userId: data.userId,
          term: data.term,
          explanation: data.explanation,
          category: data.category,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('该术语已存在');
      }
      throw error;
    }
  }

  // 获取词库列表
  async findAll(teamCode: string, category?: string) {
    return this.prisma.meetingTerm.findMany({
      where: {
        teamCode: teamCode as any,
        ...(category ? { category } : {}),
      },
      orderBy: { term: 'asc' },
    });
  }

  // 删除术语
  async remove(id: number, teamCode: string) {
    const term = await this.prisma.meetingTerm.findFirst({
      where: { id, teamCode: teamCode as any },
    });

    if (!term) {
      throw new NotFoundException('术语不存在');
    }

    await this.prisma.meetingTerm.delete({
      where: { id },
    });

    return { success: true };
  }
}
