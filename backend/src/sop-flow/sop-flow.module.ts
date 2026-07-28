import { Module } from '@nestjs/common';
import { SopFlowController } from './sop-flow.controller';
import { SopFlowService } from './sop-flow.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SopFlowController],
  providers: [SopFlowService],
  exports: [SopFlowService],
})
export class SopFlowModule {}
