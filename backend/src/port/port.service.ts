import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortDto } from './dto/create-port.dto';

@Injectable()
export class PortService {
  private readonly logger = new Logger(PortService.name);

  constructor(private prisma: PrismaService) {}

  async create(createPortDto: CreatePortDto) {
    return this.prisma.port.create({
      data: createPortDto,
    });
  }

  async findAll(search?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { english: { contains: search, mode: 'insensitive' } },
        { pinyin: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.port.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.port.findUnique({
      where: { id },
    });
  }
}
