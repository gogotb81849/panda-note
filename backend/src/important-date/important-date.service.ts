import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImportantDateDto, UpdateImportantDateDto } from './dto/create-important-date.dto';
import { TeamCode, UserRole } from '@prisma/client';

@Injectable()
export class ImportantDateService {
  private readonly logger = new Logger(ImportantDateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 查询重要日列表（支持按月份过滤）
   * 重复类型为 yearly/monthly/weekly 的记录，会虚拟展开到查询区间内的对应日期
   */
  async findAll(
    teamCode: TeamCode,
    userId: number,
    userRole: UserRole,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { teamCode };
    // 非管理员只能看自己的重要日
    if (userRole !== 'admin' && userRole !== 'shore_crew_supervisor') {
      where.userId = userId;
    }

    const records = await this.prisma.importantDate.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // 如果指定了日期范围，虚拟展开重复事件
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const expanded: any[] = [];

      for (const r of records) {
        if (r.repeatType === 'none') {
          const d = new Date(r.date);
          if (d >= start && d <= end) {
            expanded.push({ ...r, date: r.date, isVirtual: false });
          }
        } else if (r.repeatType === 'yearly') {
          // 在区间内的每一年展开
          const baseDate = new Date(r.date);
          for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
            const virtualDate = new Date(baseDate);
            virtualDate.setFullYear(y);
            if (virtualDate >= start && virtualDate <= end) {
              expanded.push({ ...r, id: r.id * 10000 + y, date: virtualDate, isVirtual: true });
            }
          }
        } else if (r.repeatType === 'monthly') {
          // 在区间内的每月展开
          const baseDate = new Date(r.date);
          const cur = new Date(start);
          while (cur <= end) {
            const virtualDate = new Date(baseDate);
            virtualDate.setFullYear(cur.getFullYear());
            virtualDate.setMonth(cur.getMonth());
            if (virtualDate >= start && virtualDate <= end && virtualDate.getDate() === baseDate.getDate()) {
              expanded.push({
                ...r,
                id: r.id * 100000 + cur.getFullYear() * 12 + cur.getMonth(),
                date: virtualDate,
                isVirtual: true,
              });
            }
            cur.setMonth(cur.getMonth() + 1);
          }
        } else {
          // weekly 等不展开，直接返回原记录
          expanded.push({ ...r, date: r.date, isVirtual: false });
        }
      }

      return expanded.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return records;
  }

  async create(dto: CreateImportantDateDto, userId: number, teamCode: TeamCode) {
    return this.prisma.importantDate.create({
      data: {
        teamCode,
        userId,
        name: dto.name,
        date: new Date(dto.date),
        repeatType: dto.repeatType || 'none',
        description: dto.description || null,
        attachments: dto.attachments || null,
      },
    });
  }

  async update(id: number, dto: UpdateImportantDateDto, userId: number, teamCode: TeamCode, userRole: UserRole) {
    const record = await this.prisma.importantDate.findFirst({
      where: { id, teamCode },
    });
    if (!record) {
      throw new Error('重要日不存在或无权操作');
    }
    if (record.userId !== userId && userRole !== 'admin') {
      throw new Error('只能修改自己创建的重要日');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.repeatType !== undefined) data.repeatType = dto.repeatType;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.attachments !== undefined) data.attachments = dto.attachments;

    return this.prisma.importantDate.update({ where: { id }, data });
  }

  async remove(id: number, userId: number, teamCode: TeamCode, userRole: UserRole) {
    const record = await this.prisma.importantDate.findFirst({
      where: { id, teamCode },
    });
    if (!record) {
      throw new Error('重要日不存在或无权操作');
    }
    if (record.userId !== userId && userRole !== 'admin') {
      throw new Error('只能删除自己创建的重要日');
    }
    return this.prisma.importantDate.delete({ where: { id } });
  }
}
