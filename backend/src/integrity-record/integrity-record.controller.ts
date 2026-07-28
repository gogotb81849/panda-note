import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IntegrityRecordService, CreateIntegrityRecordDto, UpdateIntegrityRecordDto } from './integrity-record.service';
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

@Controller('integrity-records')
@UseGuards(JwtAuthGuard)
export class IntegrityRecordController {
  constructor(private readonly integrityRecordService: IntegrityRecordService) {}

  @Post()
  async create(
    @Body() dto: CreateIntegrityRecordDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.integrityRecordService.create(dto, userId, teamCode, userRole);
  }

  @Get()
  async findAll(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('status') status?: string,
    @Query('shipId') shipId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.integrityRecordService.findAll(userId, teamCode, userRole, pageNum, pageSizeNum, {
      category,
      riskLevel,
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
    return this.integrityRecordService.getStatistics(userId, teamCode, userRole, { dateFrom, dateTo });
  }

  @Get('high-risk')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async getHighRiskRecords(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.integrityRecordService.getHighRiskRecords(userId, teamCode, userRole, pageNum, pageSizeNum);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.integrityRecordService.findById(+id, userId, teamCode);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrityRecordDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.integrityRecordService.update(+id, dto, userId, teamCode, userRole);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.integrityRecordService.remove(+id, userId, teamCode, userRole);
  }
}
