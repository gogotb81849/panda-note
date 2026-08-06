import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { TempFixPm2Controller } from './temp-fix-pm2.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OpsController, TempFixPm2Controller],
  exports: [],
})
export class OpsModule {}
