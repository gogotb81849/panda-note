import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TaskService, CreateTaskDto, UpdateTaskDto } from './task.service';
import { GanttService } from './gantt.service';
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

const CREATE_TASK_ROLES = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.company_admin,
] as const;

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly ganttService: GanttService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...CREATE_TASK_ROLES)
  async create(
    @Body() dto: CreateTaskDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.taskService.create(dto, userId, teamCode, userRole);
  }

  @Get()
  async findAll(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.taskService.findAll(userId, teamCode, pageNum, pageSizeNum);
  }

  @Get('tree')
  async getTree(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.taskService.getTree(userId, teamCode);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.taskService.findById(+id, userId, teamCode);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES, UserRole.ship_political_instructor)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.taskService.update(+id, dto, userId, teamCode, userRole);
  }

  @Put(':id/reorder')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async reorder(
    @Param('id') id: string,
    @Body('sortOrder') sortOrder: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.taskService.reorder(+id, sortOrder, teamCode, userRole);
  }

  @Post('batch-status')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES)
  async batchUpdateStatus(
    @Body('ids') ids: number[],
    @Body('status') status: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.taskService.batchUpdateStatus(ids, status, teamCode, userRole, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...SHORE_MANAGEMENT_ROLES, UserRole.ship_political_instructor)
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.taskService.remove(+id, userId, teamCode, userRole);
  }

  // ========== Gantt Chart Endpoints ==========

  @Get('gantt')
  async getGanttData(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const end = endDate || new Date(new Date().setMonth(new Date().getMonth() + 1, 0)).toISOString().split('T')[0];
    return this.ganttService.getGanttData(teamCode, start, end);
  }

  @Get(':id/progress')
  async getTaskProgress(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.ganttService.getTaskProgress(+id);
  }

  @Get(':id/ship-status')
  async getShipTaskStatus(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.ganttService.getShipTaskStatus(+id);
  }
}
