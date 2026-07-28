import { Module } from '@nestjs/common';
import { PartyActivityController } from './party-activity.controller';
import { PartyActivityService } from './party-activity.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [PartyActivityController],
  providers: [PartyActivityService],
  exports: [PartyActivityService],
})
export class PartyActivityModule {}
