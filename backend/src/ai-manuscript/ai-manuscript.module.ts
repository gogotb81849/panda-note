// ============================================================
// 政工笔 · AI 智能写作系统 - NestJS 模块
// ============================================================
import { Module } from '@nestjs/common';
import { AiManuscriptController } from './ai-manuscript.controller';
import { AiManuscriptService } from './ai-manuscript.service';
import { DeAiEngine } from './engines/deai.engine';
import { QualityScoringEngine } from './engines/quality-scoring.engine';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,    // 范文库表访问用
    RedisModule,     // Sprint 2 BullMQ 队列（异步打标签）、缓存用
  ],
  controllers: [AiManuscriptController],
  providers:   [AiManuscriptService, DeAiEngine, QualityScoringEngine],
  exports:     [AiManuscriptService, DeAiEngine, QualityScoringEngine],
})
export class AiManuscriptModule {}
