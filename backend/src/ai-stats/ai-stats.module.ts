import { Module } from '@nestjs/common';
import { AIStatsController } from './ai-stats.controller';
import { AIStatsService } from './ai-stats.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIStatsController],
  providers: [AIStatsService],
  exports: [AIStatsService],
})
export class AIStatsModule {}
