import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PortCheckService, UpdateShipTaskStatusDto } from './port-check.service';
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

@Controller('port-check')
@UseGuards(JwtAuthGuard)
export class PortCheckController {
  constructor(private readonly portCheckService: PortCheckService) {}

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async createTemplate(
    @Body() dto: { title: string; items: any[]; targetShips?: any[]; triggerDays?: number },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.portCheckService.createTemplate(dto, userId, teamCode, userRole);
  }

  @Get('templates')
  async findAllTemplates(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.portCheckService.findAllTemplates(userId, teamCode, userRole, pageNum, pageSizeNum);
  }

  @Get('templates/:id')
  async findTemplateById(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.portCheckService.findTemplateById(+id, userId, teamCode);
  }

  @Post('templates/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async publishTemplate(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.portCheckService.publishTemplate(+id, userId, teamCode, userRole);
  }

  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async removeTemplate(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.portCheckService.removeTemplate(+id, userId, teamCode, userRole);
  }

  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: { title?: string; items?: any[]; targetShips?: any[]; triggerDays?: number },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.portCheckService.updateTemplate(+id, dto, userId, teamCode, userRole);
  }

  @Get('ship-tasks')
  async getShipTasks(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.portCheckService.getShipTasks(userId, teamCode, userRole, pageNum, pageSizeNum);
  }

  @Get('ship-tasks/:id')
  async findShipTaskById(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.portCheckService.findShipTaskById(+id, userId, teamCode);
  }

  @Put('ship-tasks/:id')
  async updateShipTaskStatus(
    @Param('id') id: string,
    @Body() dto: UpdateShipTaskStatusDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.portCheckService.updateShipTaskStatus(+id, dto, userId, teamCode, userRole);
  }

  @Get('progress-summary')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async getProgressSummary(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.portCheckService.getProgressSummary(userId, teamCode, userRole);
  }
}
