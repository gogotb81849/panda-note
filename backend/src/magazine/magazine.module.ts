import { Module } from '@nestjs/common';
import { MagazineController } from './magazine.controller';
import { MagazineService } from './magazine.service';
import { AIMagazineService } from './ai-magazine.service';
import { AITextService } from './ai-text.service';
import { TemplateService } from './template.service';
import { ArticleParserService } from './article-parser.service';
import { MagazineVersionService } from './version.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MagazineController],
  providers: [MagazineService, AIMagazineService, AITextService, TemplateService, ArticleParserService, MagazineVersionService],
  exports: [MagazineService, AIMagazineService, AITextService, TemplateService, ArticleParserService, MagazineVersionService],
})
export class MagazineModule {}
