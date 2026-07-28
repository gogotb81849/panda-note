import { Module } from '@nestjs/common';
import { ClientLogService } from './client-log.service';
import { ClientLogController } from './client-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientLogController],
  providers: [ClientLogService],
  exports: [ClientLogService],
})
export class ClientLogModule {}
