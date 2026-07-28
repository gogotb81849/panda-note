import { Module } from '@nestjs/common';
import { PublicCaseController } from './public-case.controller';
import { PublicCaseService } from './public-case.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicCaseController],
  providers: [PublicCaseService],
  exports: [PublicCaseService],
})
export class PublicCaseModule {}
