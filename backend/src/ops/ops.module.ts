import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OpsController],
  exports: [],
})
export class OpsModule {}
