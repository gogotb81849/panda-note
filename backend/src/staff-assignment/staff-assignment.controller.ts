import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StaffAssignmentService } from './staff-assignment.service';
import { CreateStaffAssignmentDto, UpdateStaffAssignmentDto, CheckOutDto, LeaveDto } from './dto';
import { UserRole } from '@prisma/client';

/** 拥有管理权限的岸基角色 */
const SHORE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
  UserRole.admin,
];

@Controller('staff-assignments')
export class StaffAssignmentController {
  constructor(private staffAssignmentService: StaffAssignmentService) {}

  /**
   * 政委候选人下拉（无 admin 限制）：所有同 team 的 ship_political_instructor 角色
   * 修复：原 /admin/users 需要 admin 角色，ship_political_instructor 角色调用会被 RolesGuard 拦截并报 "Forbidden resource"
   */
  @Get('candidates')
  @UseGuards(JwtAuthGuard)
  async listCandidates(@Request() req: any) {
    return this.staffAssignmentService.listPoliticalInstructors(req.user.teamCode);
  }

  @Post('batch-import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shore_crew_supervisor', 'admin')
  async batchImport(@Request() req: any, @Body() body: any) {
    return this.staffAssignmentService.batchImport(req.user.teamCode, body.items || []);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createDto: CreateStaffAssignmentDto) {
    return this.staffAssignmentService.create(req.user.teamCode, createDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateStaffAssignmentDto,
  ) {
    return this.staffAssignmentService.update(req.user.teamCode, +id, updateDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.staffAssignmentService.delete(req.user.teamCode, +id, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    const userRole = req.user.role;
    const roles: UserRole[] = Array.isArray(userRole) ? userRole : [userRole];
    const isShoreManager = roles.some((r: UserRole) => SHORE_MANAGEMENT_ROLES.includes(r));
    // 岸基主管看全团队，普通政委只看自己
    if (isShoreManager) {
      return this.staffAssignmentService.getAllByTeamCode(req.user.teamCode);
    }
    return this.staffAssignmentService.getHistoryAssignments(req.user.id, req.user.teamCode);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getByUser(@Request() req: any, @Param('userId') userId: string) {
    return this.staffAssignmentService.getByUserId(+userId, req.user.teamCode);
  }

  @Get('ship/:shipId')
  @UseGuards(JwtAuthGuard)
  async getByShip(@Request() req: any, @Param('shipId') shipId: string) {
    return this.staffAssignmentService.getByShipId(+shipId, req.user.teamCode);
  }

  @Get('user/:userId/current')
  @UseGuards(JwtAuthGuard)
  async getCurrent(@Request() req: any, @Param('userId') userId: string) {
    return this.staffAssignmentService.getCurrentAssignment(+userId, req.user.teamCode);
  }

  @Get('user/:userId/history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req: any, @Param('userId') userId: string) {
    return this.staffAssignmentService.getHistoryAssignments(+userId, req.user.teamCode);
  }

  @Get('user/:userId/permission')
  @UseGuards(JwtAuthGuard)
  async getUserDiaryPermission(@Request() req: any, @Param('userId') userId: string) {
    return this.staffAssignmentService.getUserDiaryPermission(+userId, req.user.teamCode);
  }

  @Get('ship/:shipId/current-staff')
  @UseGuards(JwtAuthGuard)
  async getCurrentShipStaff(@Request() req: any, @Param('shipId') shipId: string) {
    return this.staffAssignmentService.getCurrentShipStaff(+shipId, req.user.teamCode);
  }

  @Post(':id/checkout')
  @UseGuards(JwtAuthGuard)
  async checkOutShip(
    @Request() req: any,
    @Param('id') id: string,
    @Body() checkoutDto: CheckOutDto,
  ) {
    return this.staffAssignmentService.checkOutShip(
      +id,
      checkoutDto.endDate,
      checkoutDto.reason || '',
      req.user.id,
      req.user.teamCode,
    );
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  async startLeave(
    @Request() req: any,
    @Param('id') id: string,
    @Body() leaveDto: LeaveDto,
  ) {
    return this.staffAssignmentService.startLeave(
      +id,
      leaveDto.startDate,
      leaveDto.endDate || null,
      leaveDto.reason || '',
      req.user.id,
      req.user.teamCode,
    );
  }

  @Post(':id/end-leave')
  @UseGuards(JwtAuthGuard)
  async endLeave(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.staffAssignmentService.endLeave(+id, req.user.id, req.user.teamCode);
  }
}
