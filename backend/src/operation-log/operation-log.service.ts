import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(teamCode: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where: { teamCode: teamCode as any },
        include: { user: { select: { id: true, username: true, realName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.operationLog.count({
        where: { teamCode: teamCode as any },
      }),
    ]);
    return { data: logs, total, page, pageSize };
  }

  async create(data: { userId: number; teamCode: string; operationType: string; operationContent?: string; ipAddress?: string; userAgent?: string }) {
    return this.prisma.operationLog.create({
      data: {
        ...data,
        teamCode: data.teamCode as any,
      },
    });
  }
}
