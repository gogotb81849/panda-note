import { Controller, Get, Put, Body, Request, Param, UseGuards } from '@nestjs/common';
import { RoleMenuConfigService } from './role-menu-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('menu-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleMenuConfigController {
  constructor(private readonly service: RoleMenuConfigService) {}

  /**
   * 获取当前用户角色的菜单（仅返回启用的）
   */
  @Get('my')
  async getMyMenus(@Request() req) {
    return this.service.getMyMenus(req.user.teamCode, req.user.role);
  }

  /**
   * 管理员获取所有角色的菜单配置
   */
  @Get('admin/all')
  @Roles(UserRole.admin)
  async getAllRoleMenus(@Request() req) {
    return this.service.getAllRoleMenus(req.user.teamCode);
  }

  /**
   * 管理员更新指定角色的菜单配置
   */
  @Put('admin/role/:role')
  @Roles(UserRole.admin)
  async updateRoleMenus(
    @Param('role') role: UserRole,
    @Body() menus: { menuKey: string; enabled: boolean; sortOrder?: number }[],
    @Request() req,
  ) {
    return this.service.updateRoleMenus(req.user.teamCode, role, menus);
  }

  /**
   * 管理员初始化默认菜单配置
   */
  @Put('admin/seed')
  @Roles(UserRole.admin)
  async seedDefaultMenus(@Request() req) {
    return this.service.seedDefaultMenus(req.user.teamCode);
  }
}