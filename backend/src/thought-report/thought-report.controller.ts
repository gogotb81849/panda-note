import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ThoughtReportService, CreateThoughtReportDto, UpdateThoughtReportDto } from './thought-report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTeam, UserId, UserRoles } from '../auth/user.decorator';
import { TeamCode, UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const SHORE_MANAGEMENT_ROLES = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
] as const;

@Controller('thought-reports')
@UseGuards(JwtAuthGuard)
export class ThoughtReportController {
  constructor(private readonly thoughtReportService: ThoughtReportService) {}

  @Post()
  async create(
    @Body() dto: CreateThoughtReportDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.thoughtReportService.create(dto, userId, teamCode, userRole);
  }

  @Get()
  async findAll(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('emotionalState') emotionalState?: string,
    @Query('concernLevel') concernLevel?: string,
    @Query('status') status?: string,
    @Query('shipId') shipId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.thoughtReportService.findAll(userId, teamCode, userRole, pageNum, pageSizeNum, {
      emotionalState,
      concernLevel,
      status,
      shipId: shipId ? parseInt(shipId, 10) : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async getStatistics(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.thoughtReportService.getStatistics(userId, teamCode, userRole, { dateFrom, dateTo });
  }

  @Get('warnings')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async getWarnings(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.thoughtReportService.getWarnings(userId, teamCode, userRole, pageNum, pageSizeNum);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.thoughtReportService.findById(+id, userId, teamCode);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateThoughtReportDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.thoughtReportService.update(+id, dto, userId, teamCode, userRole);
  }

  @Post(':id/close')
  async close(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.thoughtReportService.close(+id, userId, teamCode, userRole);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.thoughtReportService.remove(+id, userId, teamCode, userRole);
  }
}
