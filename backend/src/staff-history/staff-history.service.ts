import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateStaffHistoryDto, UpdateStaffHistoryDto } from './staff-history.dto';

@Injectable()
export class StaffHistoryService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  async findAll(teamCode: string) {
    return this.prisma.staffHistory.findMany({
      where: { teamCode: teamCode as any },
      include: { ship: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async findByShipId(teamCode: string, shipId: number) {
    return this.prisma.staffHistory.findMany({
      where: { teamCode: teamCode as any, shipId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findCurrentStaff(teamCode: string, shipId: number, recordDate: Date) {
    return this.prisma.staffHistory.findMany({
      where: {
        teamCode: teamCode as any,
        shipId,
        startDate: { lte: recordDate },
        OR: [
          { endDate: null },
          { endDate: { gte: recordDate } },
        ],
      },
    });
  }

  async create(teamCode: string, createDto: CreateStaffHistoryDto, userId: number = 0) {
    const result = await this.prisma.staffHistory.create({
      data: {
        ...createDto,
        teamCode: teamCode as any,
        startDate: new Date(createDto.startDate),
        endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '新增',
      operationContent: `新增人员履历：${createDto.staffName}（${createDto.postName}）`,
    });

    return result;
  }

  async update(teamCode: string, id: number, updateDto: UpdateStaffHistoryDto, userId: number = 0) {
    const result = await this.prisma.staffHistory.updateMany({
      where: { id, teamCode: teamCode as any },
      data: {
        ...updateDto,
        endDate: updateDto.endDate ? new Date(updateDto.endDate) : null,
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `修改人员履历（ID:${id}）`,
    });

    return result;
  }

  async delete(teamCode: string, id: number, userId: number = 0) {
    const result = await this.prisma.staffHistory.deleteMany({
      where: { id, teamCode: teamCode as any },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '删除',
      operationContent: `删除人员履历（ID:${id}）`,
    });

    return result;
  }
}
