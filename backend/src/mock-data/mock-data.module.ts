import { Module } from '@nestjs/common';
import { MockDataController } from './mock-data.controller';
import { MockDataService } from './mock-data.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MockDataController],
  providers: [MockDataService, PrismaService],
})
export class MockDataModule {}
