import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataExportService } from './data-export.service';
import { DataExportController } from './data-export.controller';
import { DataImportService } from './data-import.service';
import { DataImportController } from './data-import.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DataExportController, DataImportController],
  providers: [DataExportService, DataImportService],
  exports: [DataExportService, DataImportService],
})
export class DataExportModule {}
