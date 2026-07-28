import { Module } from '@nestjs/common';
import { AICategorizationController } from './ai-categorization.controller';
import { AICategorizationService } from './ai-categorization.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TitleModule } from '../title/title.module';
import { DictModule } from '../dict/dict.module';

@Module({
  imports: [PrismaModule, TitleModule, DictModule],
  controllers: [AICategorizationController],
  providers: [AICategorizationService],
  exports: [AICategorizationService],
})
export class AICategorizationModule {}
