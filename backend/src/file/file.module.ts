import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { ChunkUploadService } from './chunk-upload.service';
import { ChunkUploadController } from './chunk-upload.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [FileController, ChunkUploadController],
  providers: [FileService, ChunkUploadService],
  exports: [FileService, ChunkUploadService],
})
export class FileModule {}
