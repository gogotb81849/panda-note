import { Module } from '@nestjs/common';
import { ShipService } from './ship.service';
import { ShipController } from './ship.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { ShipReportParseModule } from '../ship-report-parse/ship-report-parse.module';

@Module({
  imports: [PrismaModule, RedisModule, OperationLogModule, ShipReportParseModule],
  controllers: [ShipController],
  providers: [ShipService],
})
export class ShipModule {}
