import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VersionModule } from '../version/version.module';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [PrismaModule, VersionModule],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
