import { Module, OnModuleInit } from '@nestjs/common';
import { PublishService } from './publish.service';
import { PublishController } from './publish.controller';
import { FileSummaryService } from './file-summary.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublishController],
  providers: [PublishService, FileSummaryService],
  exports: [PublishService, FileSummaryService],
})
export class PublishModule implements OnModuleInit {
  constructor(private publishService: PublishService) {}

  async onModuleInit() {
    await this.publishService.initSystemTemplates();
  }
}
