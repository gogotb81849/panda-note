import { Module } from '@nestjs/common';
import { FileCollectionService } from './file-collection.service';
import { FileCollectionController } from './file-collection.controller';
import { NamingRuleService } from './naming-rule.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FileCollectionController],
  providers: [FileCollectionService, NamingRuleService],
  exports: [FileCollectionService],
})
export class FileCollectionModule {}