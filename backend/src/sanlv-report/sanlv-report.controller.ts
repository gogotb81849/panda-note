import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { SanlvReportService } from './sanlv-report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TeamCode, UserRole } from '@prisma/client';
import { ImportSanlvReportDto, SanlvReportPreviewInput } from './dto/import-sanlv-report.dto';

@Controller('sanlv-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SanlvReportController {
  constructor(private readonly service: SanlvReportService) {}

  @Get()
  async list(@Req() req: any, @Query('limit') limit = 30) {
    return this.service.list(req.user.teamCode as TeamCode, limit);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const r = await this.service.findOne(id, req.user.teamCode as TeamCode);
    if (!r) throw new HttpException('月报不存在', HttpStatus.NOT_FOUND);
    return r;
  }

  @Post('/preview')
  async preview(@Body() input: SanlvReportPreviewInput) {
    return this.service.preview(input);
  }

  @Post()
  async import(@Req() req: any, @Body() dto: ImportSanlvReportDto) {
    try {
      return await this.service.import(dto, req.user.id, req.user.teamCode as TeamCode);
    } catch (e: any) {
      throw new HttpException(e?.message || '导入月报失败', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id, req.user.teamCode as TeamCode);
  }
}
