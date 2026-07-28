import { Controller, Get, Post, Query, Res, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { DataExportService } from './data-export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/export')
export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  @Get('users')
  async exportUsers(@Res() res: Response) {
    const { buffer, filename } = await this.dataExportService.exportUsers();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('schedules')
  async exportSchedules(
    @Res() res: Response,
    @Query('teamCode') teamCode: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!teamCode) {
      throw new BadRequestException('团队代码不能为空');
    }
    const { buffer, filename } = await this.dataExportService.exportSchedules(teamCode, startDate, endDate);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('diaries')
  async exportDiaries(
    @Res() res: Response,
    @Query('teamCode') teamCode: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!teamCode) {
      throw new BadRequestException('团队代码不能为空');
    }
    const { buffer, filename } = await this.dataExportService.exportDiaries(teamCode, startDate, endDate);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('party-activities')
  async exportPartyActivities(
    @Res() res: Response,
    @Query('teamCode') teamCode: string,
  ) {
    if (!teamCode) {
      throw new BadRequestException('团队代码不能为空');
    }
    const { buffer, filename } = await this.dataExportService.exportPartyActivities(teamCode);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('template')
  async getTemplate(
    @Res() res: Response,
    @Query('type') templateType: string,
  ) {
    const { buffer, filename } = await this.dataExportService.getImportTemplate(templateType);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
