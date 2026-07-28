import { Module } from '@nestjs/common';
import { PortCheckController } from './port-check.controller';
import { PortCheckService } from './port-check.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [PortCheckController],
  providers: [PortCheckService],
  exports: [PortCheckService],
})
export class PortCheckModule {}
