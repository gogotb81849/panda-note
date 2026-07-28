import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicCaseDto } from './public-case.dto';

@Injectable()
export class PublicCaseService {
  constructor(private prisma: PrismaService) {}

  async findAll(caseType?: string) {
    const where = caseType ? { caseType } : {};
    return this.prisma.publicCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { fromRecord: { select: { id: true, firstType: true, secondType: true } } },
    });
  }

  async findOne(id: number) {
    return this.prisma.publicCase.findUnique({ where: { id } });
  }

  async create(createDto: CreatePublicCaseDto) {
    return this.prisma.publicCase.create({
      data: createDto,
    });
  }

  async delete(id: number) {
    return this.prisma.publicCase.delete({ where: { id } });
  }
}
