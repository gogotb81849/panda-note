import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AIBriefController } from './ai-brief.controller';
import { AIBriefService } from './ai-brief.service';
import { PrismaModule } from '../prisma/prisma.module';
import { processAIBrief } from './ai-brief.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'ai-brief',
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '1'),
      },
    }),
  ],
  controllers: [AIBriefController],
  providers: [
    AIBriefService,
    {
      provide: 'AI_BRIEF_PROCESSOR',
      useFactory: () => ({
        name: 'ai-brief',
        process: processAIBrief,
      }),
    },
  ],
})
export class AIBriefModule {}