import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Headers } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserId, UserTeam } from '../auth/user.decorator';
import { UserRole } from '@prisma/client';

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

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  create(@Body() createScheduleDto: CreateScheduleDto, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.scheduleService.create(
      createScheduleDto,
      req.user.id,
      req.user.teamCode,
      req.user.role,
      getClientIp(req),
      userAgent,
    );
  }

  @Get()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.scheduleService.findAll(
      req.user.teamCode,
      req.user.role,
      startDate,
      endDate,
      pageNum,
      pageSizeNum,
    );
  }

  @Get(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findOne(@Param('id') id: string, @Request() req) {
    return this.scheduleService.findOne(+id, req.user.teamCode);
  }

  @Patch(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.scheduleService.update(
      +id,
      updateScheduleDto,
      req.user.id,
      req.user.teamCode,
      getClientIp(req),
      userAgent,
    );
  }

  @Get('stats/daily')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getDailyStats(@UserTeam() teamCode: any, @Query('date') date: string) {
    return this.scheduleService.getDailyStats(teamCode, date);
  }

  @Get('stats/by-ship')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getStatsByShip(@UserTeam() teamCode: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.scheduleService.getStatsByShip(teamCode, startDate, endDate);
  }

  @Get('stats/trend')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getTrendStats(@UserTeam() teamCode: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.scheduleService.getTrendStats(teamCode, startDate, endDate);
  }

  @Get('stats/by-user')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getStatsByUser(@UserTeam() teamCode: any, @Query('userId') userId: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.scheduleService.getStatsByUser(teamCode, Number(userId), startDate, endDate);
  }

  @Get('dict/categories')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getDictCategories(@UserTeam() teamCode: any, @Query('type') type: 'first_type' | 'second_type', @Query('parentId') parentId?: string) {
    const pid = parentId !== undefined && parentId !== '' ? Number(parentId) : undefined;
    return this.scheduleService.getDictCategories(teamCode, type, pid);
  }

  @Post('bulk-create')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  bulkCreate(@Body() body: { items: CreateScheduleDto[] }, @UserId() userId: number, @UserTeam() teamCode: any, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.scheduleService.bulkCreate(body.items, userId, teamCode, req.user.role, getClientIp(req), userAgent);
  }

  @Delete(':id')
  @Roles(UserRole.shore_crew_supervisor)
  remove(@Param('id') id: string, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.scheduleService.remove(+id, req.user.id, req.user.teamCode, getClientIp(req), userAgent);
  }
}
