import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * 检查当前用户是否为全局管理员（超级管理员或管理员）
   */
  private isGlobalAdmin(user: any): boolean {
    return user.role === 'admin' || user.role === UserRole.admin;
  }

  /**
   * 检查当前用户是否为船工主管
   */
  private isCrewSupervisor(user: any): boolean {
    return user.role === 'shore_crew_supervisor';
  }

  /**
   * 获取当前用户可管理的团队范围
   * 全局管理员/管理员：所有团队
   * 船工主管：仅本团队
   */
  private getManageableTeamCodes(currentUser: any): string[] | null {
    if (this.isGlobalAdmin(currentUser)) {
      return null; // null 表示无限制
    }
    if (this.isCrewSupervisor(currentUser)) {
      return [currentUser.teamCode];
    }
    return []; // 无权管理
  }

  /**
   * 验证当前用户是否有权操作目标用户
   */
  private async verifyManagePermission(currentUser: any, targetUserId: number) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    // 全局管理员可以操作任何人
    if (this.isGlobalAdmin(currentUser)) {
      return targetUser;
    }

    // 船工主管只能操作本团队的用户
    if (this.isCrewSupervisor(currentUser)) {
      if (targetUser.teamCode !== currentUser.teamCode) {
        throw new ForbiddenException('无权管理其他团队的用户');
      }
      // 船工主管不能操作其他船工主管或管理员
      if (targetUser.role === 'admin' || targetUser.role === 'shore_crew_supervisor') {
        if (targetUser.id !== currentUser.id) {
          throw new ForbiddenException('无权操作同级或上级角色');
        }
      }
      return targetUser;
    }

    throw new ForbiddenException('无权执行此操作');
  }

  /**
   * 验证密码强度
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 6) {
      throw new BadRequestException('密码长度至少为6位');
    }
  }

  /**
   * 验证角色分配权限
   */
  private validateRoleAssignment(currentUser: any, targetRoles: UserRole[]): void {
    if (this.isGlobalAdmin(currentUser)) {
      return; // 管理员可以分配任何角色
    }

    if (this.isCrewSupervisor(currentUser)) {
      // 船工主管不能分配 admin 或 shore_crew_supervisor 角色
      const forbiddenRoles = [UserRole.admin, 'admin', 'shore_crew_supervisor'];
      const hasForbidden = targetRoles.some(r => forbiddenRoles.includes(r as any));
      if (hasForbidden) {
        throw new ForbiddenException('无权分配管理员或主管角色');
      }
    }
  }

  /**
   * 获取账号列表（分页+筛选）
   */
  async findAll(
    currentUser: any,
    page: number = 1,
    limit: number = 20,
    search?: string,
    roleFilter?: string,
    teamFilter?: string,
  ) {
    // 验证查看权限
    const manageableTeams = this.getManageableTeamCodes(currentUser);
    if (!manageableTeams || manageableTeams.length === 0) {
      // null 表示无限制，空数组表示无权查看
      if (manageableTeams && manageableTeams.length === 0) {
        throw new ForbiddenException('无权查看账号列表');
      }
    }

    const skip = (page - 1) * limit;
    const where: any = {};

    // 团队范围限制
    if (manageableTeams) {
      where.teamCode = { in: manageableTeams };
    }

    // 搜索条件
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { realName: { contains: search } },
      ];
    }

    // 角色筛选
    if (roleFilter) {
      where.role = roleFilter;
    }

    // 团队筛选
    if (teamFilter && !manageableTeams) {
      // 只有全局管理员可以使用团队筛选
      where.teamCode = teamFilter;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          realName: true,
          teamCode: true,
          role: true,
          roles: true,
          lastLoginAt: true,
          loginFailCount: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取账号详情
   */
  async findOne(currentUser: any, id: number) {
    const targetUser = await this.verifyManagePermission(currentUser, id);

    return {
      id: targetUser.id,
      username: targetUser.username,
      realName: targetUser.realName,
      teamCode: targetUser.teamCode,
      role: targetUser.role,
      roles: targetUser.roles,
      lastLoginAt: targetUser.lastLoginAt,
      loginFailCount: targetUser.loginFailCount,
      lockedUntil: targetUser.lockedUntil,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
    };
  }

  /**
   * 创建账号
   */
  async create(currentUser: any, dto: CreateAccountDto) {
    // 检查权限
    if (!this.isGlobalAdmin(currentUser) && !this.isCrewSupervisor(currentUser)) {
      throw new ForbiddenException('无权创建账号');
    }

    // 船工主管只能在本团队创建
    if (this.isCrewSupervisor(currentUser)) {
      if (dto.teamCode !== currentUser.teamCode) {
        throw new ForbiddenException('只能在本团队创建账号');
      }
      // 验证角色分配
      const targetRoles = dto.roles || [dto.role];
      this.validateRoleAssignment(currentUser, targetRoles);
    }

    // 全局管理员验证角色分配
    if (this.isGlobalAdmin(currentUser)) {
      const targetRoles = dto.roles || [dto.role];
      this.validateRoleAssignment(currentUser, targetRoles);
    }

    // 检查用户名唯一性
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    // 密码处理：如果未提供密码，使用默认规则
    let password = dto.password;
    if (!password) {
      // 默认密码：身份证后6位或 123456
      password = dto.idCardLast6 || '123456';
    }

    this.validatePasswordStrength(password);
    const hashedPassword = await bcrypt.hash(password, 10);

    const roles = dto.roles || [dto.role];

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        realName: dto.realName,
        teamCode: dto.teamCode,
        role: dto.role,
        roles,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
        role: true,
        roles: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * 更新账号信息
   */
  async update(currentUser: any, id: number, dto: UpdateAccountDto) {
    const targetUser = await this.verifyManagePermission(currentUser, id);

    // 船工主管不能修改同级或上级角色
    if (this.isCrewSupervisor(currentUser)) {
      if (dto.role === 'admin' || dto.role === 'shore_crew_supervisor') {
        throw new ForbiddenException('无权修改为管理员或主管角色');
      }
      if (dto.roles) {
        this.validateRoleAssignment(currentUser, dto.roles);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
        role: true,
        roles: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 删除账号
   */
  async remove(currentUser: any, id: number) {
    const targetUser = await this.verifyManagePermission(currentUser, id);

    // 防止删除主管理员账号
    if (targetUser.username === 'gogotb') {
      throw new BadRequestException('不能删除主管理员账号');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: '账号已删除' };
  }

  /**
   * 重置密码
   */
  async resetPassword(currentUser: any, id: number, dto: ResetPasswordDto) {
    const targetUser = await this.verifyManagePermission(currentUser, id);

    this.validatePasswordStrength(dto.newPassword);

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        loginFailCount: 0,
        lockedUntil: null,
      },
    });

    return { message: '密码已重置' };
  }

  /**
   * 工号查找用户名
   */
  async lookupByStaffId(staffId: string) {
    // 这里假设 username 字段存储的是工号
    // 如果后续需要独立的 staffId 字段，需要修改 schema
    const user = await this.prisma.user.findUnique({
      where: { username: staffId },
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
        role: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      username: user.username,
      realName: user.realName,
      teamCode: user.teamCode,
    };
  }

  /**
   * 获取可用角色列表
   */
  getAvailableRoles(currentUser: any) {
    const allRoles = Object.values(UserRole);

    // 船工主管不能看到 admin 角色
    if (this.isCrewSupervisor(currentUser)) {
      return {
        roles: allRoles.filter(r => r !== UserRole.admin),
        labels: this.getRoleLabels(),
      };
    }

    return {
      roles: allRoles,
      labels: this.getRoleLabels(),
    };
  }

  /**
   * 角色标签映射
   */
  private getRoleLabels(): Record<string, string> {
    return {
      admin: '系统管理员',
      ship_political_instructor: '船舶政委',
      shore_crew_supervisor: '岸基船工主管',
      shore_marine_supervisor: '岸基海务主管',
      shore_engineer_supervisor: '岸基机务主管',
      shore_electric_supervisor: '岸基电气主管',
      general_manager: '总管团队',
      company_admin: '油轮船管部',
    };
  }

  /**
   * 批量导入账号（从 Excel 数据）
   */
  async batchImport(currentUser: any, importData: Array<{
    username: string;
    realName: string;
    teamCode: string;
    role: string;
    password?: string;
    staffId?: string;
    idCardLast6?: string;
  }>) {
    // 验证权限
    if (!this.isGlobalAdmin(currentUser) && !this.isCrewSupervisor(currentUser)) {
      throw new ForbiddenException('无权批量导入账号');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      createdUsers: [] as any[],
    };

    for (let i = 0; i < importData.length; i++) {
      const row = importData[i];
      const rowNum = i + 2; // Excel 行号（从第2行开始，第1行是标题）

      try {
        // 验证必填字段
        if (!row.username) {
          results.errors.push(`第${rowNum}行：用户名不能为空`);
          results.failed++;
          continue;
        }

        if (!row.realName) {
          results.errors.push(`第${rowNum}行：姓名不能为空`);
          results.failed++;
          continue;
        }

        // 检查用户名是否已存在
        const existing = await this.prisma.user.findUnique({
          where: { username: row.username },
        });

        if (existing) {
          results.errors.push(`第${rowNum}行：用户名 "${row.username}" 已存在`);
          results.failed++;
          continue;
        }

        // 处理团队代码
        let teamCode: any = row.teamCode || currentUser.teamCode;
        if (!['team1', 'team2', 'team3'].includes(teamCode)) {
          results.errors.push(`第${rowNum}行：团队代码无效`);
          results.failed++;
          continue;
        }

        // 船工主管只能导入本团队
        if (this.isCrewSupervisor(currentUser) && teamCode !== currentUser.teamCode) {
          results.errors.push(`第${rowNum}行：无权导入其他团队的账号`);
          results.failed++;
          continue;
        }

        // 处理角色
        let role: any = row.role || 'ship_political_instructor';
        if (!Object.values(UserRole).includes(role)) {
          results.errors.push(`第${rowNum}行：角色无效`);
          results.failed++;
          continue;
        }

        // 船工主管不能创建管理员
        if (this.isCrewSupervisor(currentUser) && (role === 'admin' || role === 'shore_crew_supervisor')) {
          results.errors.push(`第${rowNum}行：无权创建管理员或主管角色`);
          results.failed++;
          continue;
        }

        // 处理密码
        let password = row.password;
        if (!password) {
          password = row.idCardLast6 || '123456';
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
          data: {
            username: row.username,
            password: hashedPassword,
            realName: row.realName,
            teamCode,
            role,
            roles: [role],
          },
          select: {
            id: true,
            username: true,
            realName: true,
            teamCode: true,
            role: true,
          },
        });

        results.createdUsers.push(user);
        results.success++;
      } catch (error: any) {
        results.errors.push(`第${rowNum}行：${error.message || '未知错误'}`);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * 政委修改自己的密码
   */
  async changeOwnPassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('当前密码不正确');
    }

    this.validatePasswordStrength(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: '密码已修改' };
  }
}
