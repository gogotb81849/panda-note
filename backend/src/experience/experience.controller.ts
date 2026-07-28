import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { ExperienceService, SortField, SortOrder } from './experience.service';
import { CreateExperienceDto, UpdateExperienceDto } from './experience.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserTeam, UserId, User, UserRoles } from '../auth/user.decorator';
import { TeamCode, UserRole } from '@prisma/client';

/**
 * Extract client IP address from request
 */
function getClientIp(req: any): string {
  return req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}

const ALL_ROLES = [
  UserRole.ship_political_instructor,
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
] as const;

const DELETE_EXPERIENCE_ROLES = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
] as const;

const ADMIN_ROLES = [
  UserRole.admin,
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
] as const;

@Controller('experiences')
@UseGuards(JwtAuthGuard)
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async create(
    @Body() createExperienceDto: CreateExperienceDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @User() user: any,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.experienceService.create(createExperienceDto, userId, user?.realName || '', teamCode, getClientIp(req), userAgent);
  }

  @Get()
  async findAll(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortField') sortField?: SortField,
    @Query('sortOrder') sortOrder?: SortOrder,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.experienceService.findAll(userId, teamCode, category, keyword, pageNum, pageSizeNum, sortField, sortOrder);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.findById(+id, userId, teamCode);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  async update(
    @Param('id') id: string,
    @Body() updateExperienceDto: UpdateExperienceDto,
    @UserId() userId: number,
    @User() user: any,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.experienceService.update(+id, updateExperienceDto, userId, user?.role as UserRole, teamCode, getClientIp(req), userAgent);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...DELETE_EXPERIENCE_ROLES)
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @User() user: any,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.experienceService.remove(+id, userId, user?.role as UserRole, teamCode, getClientIp(req), userAgent);
  }

  @Post(':id/rate')
  async rate(
    @Param('id') id: string,
    @Body('rating') rating: number,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.rateExperience(+id, userId, rating, teamCode);
  }

  @Post(':id/like')
  async like(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.toggleLike(+id, userId, teamCode);
  }

  // 评论（支持回复）
  @Post(':id/comment')
  async comment(
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: number; replyToUserId?: number },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.commentExperience(+id, userId, body.content, teamCode, body.parentId, body.replyToUserId);
  }

  // 删除评论
  @Delete(':id/comment/:commentId')
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.deleteComment(+commentId, userId, teamCode);
  }

  // ========== 分类目录管理 ==========

  @Get('categories/tree')
  async getCategories(@UserTeam() teamCode: TeamCode) {
    return this.experienceService.getCategories(teamCode);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async createCategory(
    @Body() body: { name: string; icon?: string; color?: string; parentId?: number; sortOrder?: number },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.createCategory(body, teamCode, userId);
  }

  @Put('categories/:id')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; icon?: string; color?: string; sortOrder?: number; isExpanded?: boolean },
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.updateCategory(+id, body, teamCode);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async deleteCategory(
    @Param('id') id: string,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.deleteCategory(+id, teamCode);
  }

  // ========== 临时权限管理 ==========

  @Get('permissions/user')
  async getUserPermissions(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.getUserPermissions(userId, teamCode);
  }

  @Get('permissions/all')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async getAllPermissions(@UserTeam() teamCode: TeamCode) {
    return this.experienceService.getAllPermissions(teamCode);
  }

  @Post('permissions/grant')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async grantPermission(
    @Body() body: { userId: number; permissionType: string; reason?: string; expiresAt?: Date },
    @UserId() grantedBy: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.grantPermission({
      userId: body.userId,
      permissionType: body.permissionType,
      reason: body.reason,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    }, grantedBy, teamCode);
  }

  @Post('permissions/revoke')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async revokePermission(
    @Body() body: { userId: number; permissionType: string },
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.experienceService.revokePermission(body.userId, body.permissionType, teamCode);
  }

  @Get('permissions/check')
  async checkPermission(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('type') permissionType: string,
  ) {
    const hasPermission = await this.experienceService.checkPermission(userId, teamCode, permissionType);
    return { hasPermission };
  }
}
