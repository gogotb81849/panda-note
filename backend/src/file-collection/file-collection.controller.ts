import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FileCollectionService, CreateCollectionDto, SubmitFileDto } from './file-collection.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserId, UserTeam, UserRoles } from '../auth/user.decorator';
import { TeamCode, UserRole } from '@prisma/client';

const ALL_ROLES = [
  UserRole.ship_political_instructor,
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
] as const;

@Controller('file-collections')
@UseGuards(JwtAuthGuard)
export class FileCollectionController {
  constructor(private readonly fileCollectionService: FileCollectionService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async create(
    @Body() dto: CreateCollectionDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
  ) {
    const realName = req.user?.realName;
    return this.fileCollectionService.create(dto, userId, teamCode, realName);
  }

  @Get()
  async findAll(
    @UserTeam() teamCode: TeamCode,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.fileCollectionService.findAll(teamCode, status, pageNum, pageSizeNum);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.fileCollectionService.findOne(+id, teamCode, userId, userRole);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCollectionDto>,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.fileCollectionService.update(+id, dto, userId, teamCode, userRole);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.fileCollectionService.remove(+id, userId, teamCode, userRole);
  }

  @Post(':id/submit')
  async submitFile(
    @Param('id') id: string,
    @Body() dto: SubmitFileDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.fileCollectionService.submitFile(+id, dto, userId, teamCode);
  }

  @Get(':id/download-all')
  async downloadAll(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    // 返回文件列表供前端JSZip批量打包下载
    return this.fileCollectionService.getDownloadFiles(+id, teamCode, userId, userRole);
  }

  @Post(':id/remind')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async getRemindList(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.fileCollectionService.getRemindList(+id, teamCode);
  }

  @Get(':id/unsubmitted')
  async getUnsubmittedShips(
    @Param('id') id: string,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.fileCollectionService.getUnsubmittedShips(+id, teamCode);
  }

  @Post(':id/reject/:submissionId')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async rejectSubmission(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: { reason: string },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.fileCollectionService.rejectSubmission(
      +id,
      +submissionId,
      dto.reason,
      userId,
      teamCode,
      userRole,
    );
  }
}