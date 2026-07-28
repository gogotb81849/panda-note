import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PartyActivityService, CreatePartyActivityDto, UpdatePartyActivityDto } from './party-activity.service';
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

@Controller('party-activities')
@UseGuards(JwtAuthGuard)
export class PartyActivityController {
  constructor(private readonly partyActivityService: PartyActivityService) {}

  @Post()
  async create(
    @Body() dto: CreatePartyActivityDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.partyActivityService.create(dto, userId, teamCode, userRole);
  }

  @Get()
  async findAll(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('activityType') activityType?: string,
    @Query('shipId') shipId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.partyActivityService.findAll(userId, teamCode, userRole, pageNum, pageSizeNum, {
      activityType,
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
    return this.partyActivityService.getStatistics(userId, teamCode, userRole, { dateFrom, dateTo });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.partyActivityService.findById(+id, userId, teamCode);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePartyActivityDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.partyActivityService.update(+id, dto, userId, teamCode, userRole);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.partyActivityService.remove(+id, userId, teamCode, userRole);
  }
}
