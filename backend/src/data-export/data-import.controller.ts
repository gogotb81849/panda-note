import { Controller, Post, UploadedFile, UseInterceptors, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataImportService } from './data-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/import')
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async importData(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('duplicateStrategy') duplicateStrategy: string = 'skip',
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    if (!type) {
      throw new BadRequestException('未指定导入类型');
    }

    const result = await this.dataImportService.importFromExcel(type, file.buffer, duplicateStrategy);
    return result;
  }
}
