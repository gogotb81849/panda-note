import { Module } from '@nestjs/common';
import { ImportantDateService } from './important-date.service';
import { ImportantDateController } from './important-date.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ImportantDateController],
  providers: [ImportantDateService],
  exports: [ImportantDateService],
})
export class ImportantDateModule {}
