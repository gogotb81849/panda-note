import { Module, OnModuleInit } from '@nestjs/common';
import { VersionController } from './version.controller';
import { VersionService } from './version.service';
import { FrontendHashService } from './frontend-hash.service';
import { MigrationTrackerService } from '../prisma/migration-tracker.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VersionController],
  providers: [VersionService, FrontendHashService, MigrationTrackerService],
  exports: [VersionService, MigrationTrackerService],
})
export class VersionModule implements OnModuleInit {
  constructor(private readonly versionService: VersionService) {}

  async onModuleInit() {
    await this.versionService.init();
  }
}
