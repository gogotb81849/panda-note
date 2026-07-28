import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

export interface CreateTaskTemplateDto {
  firstType: string;
  secondType: string;
  title?: string;
  eventDetail?: string;
  priority?: string;
  sortOrder?: number;
}

export interface UpdateTaskTemplateDto {
  firstType?: string;
  secondType?: string;
  title?: string | null;
  eventDetail?: string | null;
  priority?: string;
  sortOrder?: number;
}

export interface BatchCreateResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
  ids: number[];
}

@Injectable()
export class StandardTaskTemplateService {
  constructor(private prisma: PrismaService) {}

  async findAll(teamCode: TeamCode) {
    return this.prisma.standardTaskTemplate.findMany({
      where: {
        OR: [
          { teamCode: null },
          { teamCode },
        ],
      },
      orderBy: [
        { sortOrder: 'asc' },
        { firstType: 'asc' },
        { secondType: 'asc' },
      ],
      include: {
        createdBy: {
          select: { id: true, realName: true, username: true },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.standardTaskTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, realName: true, username: true },
        },
      },
    });
  }

  async create(dto: CreateTaskTemplateDto, teamCode: TeamCode, userId: number) {
    return this.prisma.standardTaskTemplate.create({
      data: {
        teamCode,
        firstType: dto.firstType,
        secondType: dto.secondType,
        title: dto.title,
        eventDetail: dto.eventDetail,
        priority: dto.priority || 'normal',
        sortOrder: dto.sortOrder || 0,
        createdById: userId,
      },
    });
  }

  async update(id: number, dto: UpdateTaskTemplateDto) {
    const data: any = {};
    if (dto.firstType !== undefined) data.firstType = dto.firstType;
    if (dto.secondType !== undefined) data.secondType = dto.secondType;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.eventDetail !== undefined) data.eventDetail = dto.eventDetail;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.standardTaskTemplate.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.standardTaskTemplate.delete({
      where: { id },
    });
  }

  async batchCreate(
    items: CreateTaskTemplateDto[],
    teamCode: TeamCode,
    userId: number,
  ): Promise<BatchCreateResult> {
    const result: BatchCreateResult = {
      success: 0,
      failed: 0,
      total: items.length,
      errors: [],
      ids: [],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.firstType || !item.secondType) {
          throw new BadRequestException(`第 ${i + 1} 条：一级分类和二级分类不能为空`);
        }

        const created = await this.prisma.standardTaskTemplate.create({
          data: {
            teamCode,
            firstType: item.firstType,
            secondType: item.secondType,
            title: item.title || null,
            eventDetail: item.eventDetail || null,
            priority: item.priority || 'normal',
            sortOrder: item.sortOrder || 0,
            createdById: userId,
          },
        });
        result.success++;
        result.ids.push(created.id);
      } catch (err: any) {
        result.failed++;
        result.errors.push(err.message || `第 ${i + 1} 条处理失败`);
      }
    }

    return result;
  }

  // 从文本导入：格式为 "一级分类,二级分类,标题,详情,优先级"
  async importFromText(
    text: string,
    teamCode: TeamCode,
    userId: number,
  ): Promise<BatchCreateResult> {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const items: CreateTaskTemplateDto[] = [];

    for (const line of lines) {
      const parts = line.split(/[,，\t]/).map((p) => p.trim());
      if (parts.length >= 2) {
        items.push({
          firstType: parts[0],
          secondType: parts[1],
          title: parts[2] || undefined,
          eventDetail: parts[3] || undefined,
          priority: parts[4] || 'normal',
        });
      }
    }

    return this.batchCreate(items, teamCode, userId);
  }

  // 获取指定分类下的模板列表，供前端下拉
  async getTemplatesByCategory(firstType: string, teamCode: TeamCode) {
    return this.prisma.standardTaskTemplate.findMany({
      where: {
        AND: [
          {
            OR: [
              { teamCode: null },
              { teamCode },
            ],
          },
          { firstType },
        ],
      },
      orderBy: [
        { sortOrder: 'asc' },
        { secondType: 'asc' },
      ],
    });
  }
}
