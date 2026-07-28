import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  OfficerProfileService,
  CreateOfficerProfileDto,
  UpdateOfficerProfileDto,
  CreateEvaluationDto,
  CreateMentorshipRecordDto,
} from './officer-profile.service';
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

@Controller('officer-profiles')
@UseGuards(JwtAuthGuard)
export class OfficerProfileController {
  constructor(private readonly officerProfileService: OfficerProfileService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async create(
    @Body() dto: CreateOfficerProfileDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.create(dto, userId, teamCode, userRole);
  }

  @Get()
  async findAll(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.officerProfileService.findAll(userId, teamCode, userRole, pageNum, pageSizeNum);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async getOfficerStats(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.officerProfileService.getOfficerStats(userId, teamCode, userRole, { dateFrom, dateTo });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.findById(+id, userId, teamCode, userRole);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOfficerProfileDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.update(+id, dto, userId, teamCode, userRole);
  }

  @Post(':id/refresh-stats')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async refreshStats(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.refreshStats(+id, userId, teamCode, userRole);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.remove(+id, userId, teamCode, userRole);
  }

  // ============== 考核评价 ==============

  @Post('evaluations')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async createEvaluation(
    @Body() dto: CreateEvaluationDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.createEvaluation(dto, userId, teamCode, userRole);
  }

  @Get(':profileId/evaluations')
  async getEvaluations(
    @Param('profileId') profileId: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.officerProfileService.getEvaluations(+profileId, userId, teamCode, userRole, pageNum, pageSizeNum);
  }

  @Delete('evaluations/:id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async removeEvaluation(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.removeEvaluation(+id, userId, teamCode, userRole);
  }

  // ============== 传帮带记录 ==============

  @Post('mentorships')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async createMentorshipRecord(
    @Body() dto: CreateMentorshipRecordDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.createMentorshipRecord(dto, userId, teamCode, userRole);
  }

  @Get(':profileId/mentorships')
  async getMentorshipRecords(
    @Param('profileId') profileId: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.officerProfileService.getMentorshipRecords(+profileId, userId, teamCode, userRole, pageNum, pageSizeNum);
  }

  @Delete('mentorships/:id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async removeMentorshipRecord(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.officerProfileService.removeMentorshipRecord(+id, userId, teamCode, userRole);
  }
}
