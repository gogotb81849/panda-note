import { Module } from '@nestjs/common';
import { VersionHistoryController } from './version-history.controller';
import { VersionHistoryService } from './version-history.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [VersionHistoryController],
  providers: [VersionHistoryService],
  exports: [VersionHistoryService],
})
export class VersionHistoryModule {}
