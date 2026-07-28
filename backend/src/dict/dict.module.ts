import { Module } from '@nestjs/common';
import { DictController } from './dict.controller';
import { DictService } from './dict.service';
import { StandardTaskTemplateController } from './standard-task-template.controller';
import { StandardTaskTemplateService } from './standard-task-template.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DictController, StandardTaskTemplateController],
  providers: [DictService, StandardTaskTemplateService],
  exports: [DictService, StandardTaskTemplateService],
})
export class DictModule {}
