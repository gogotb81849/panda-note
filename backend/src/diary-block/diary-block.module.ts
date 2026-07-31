import { Module } from '@nestjs/common';
import { DiaryBlockController } from './diary-block.controller';
import { DiaryBlockService } from './diary-block.service';
import { BlockClassifierService } from './block-classifier.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiaryBlockController],
  providers: [DiaryBlockService, BlockClassifierService],
  exports: [DiaryBlockService, BlockClassifierService],
})
export class DiaryBlockModule {}
