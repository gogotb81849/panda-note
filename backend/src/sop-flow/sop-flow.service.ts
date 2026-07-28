import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSopFlowDto, UpdateSopFlowDto } from './sop-flow.dto';

@Injectable()
export class SopFlowService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sopFlow.findMany({
      orderBy: { createdAt: 'desc' },
      include: { updatedBy: { select: { id: true, username: true, realName: true } } },
    });
  }

  async findByType(firstType?: string, secondType?: string) {
    const where: any = {};
    if (firstType) where.firstType = firstType;
    if (secondType) where.secondType = secondType;
    return this.prisma.sopFlow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.sopFlow.findUnique({ where: { id } });
  }

  async create(userId: number, createDto: CreateSopFlowDto) {
    return this.prisma.sopFlow.create({
      data: {
        ...createDto,
        updatedById: userId,
      },
    });
  }

  async update(id: number, userId: number, updateDto: UpdateSopFlowDto) {
    return this.prisma.sopFlow.update({
      where: { id },
      data: {
        ...updateDto,
        updatedById: userId,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.sopFlow.delete({ where: { id } });
  }
}
