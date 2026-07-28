import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTeam, UserId } from '../auth/user.decorator';
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

@Controller('diaries')
@UseGuards(JwtAuthGuard)
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Post()
  async create(
    @Body() createDiaryDto: CreateDiaryDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.diaryService.create(createDiaryDto, userId, teamCode, getClientIp(req), userAgent);
  }

  @Get()
  async findAll(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.diaryService.findAll(userId, teamCode, startDate, endDate);
  }

  @Get('by-date')
  async findByDate(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('date') date: string,
  ) {
    return this.diaryService.findByDate(userId, teamCode, date);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.diaryService.findById(+id, userId, teamCode);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDiaryDto: UpdateDiaryDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.diaryService.update(+id, updateDiaryDto, userId, teamCode, getClientIp(req), userAgent);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.diaryService.remove(+id, userId, teamCode, getClientIp(req), userAgent);
  }

  @Get('by-permission')
  async findAllByPermission(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.diaryService.getDiariesByPermission(userId, teamCode, startDate, endDate);
  }

  @Get('permission-info')
  async getUserDiaryPermission(
    @UserId() userId: number,
  ) {
    return this.diaryService.getUserDiaryPermission(userId);
  }

  @Get('ship-view/:shipId')
  async getDiariesByShipView(
    @Param('shipId') shipId: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.diaryService.getDiariesByShipView(userId, teamCode, +shipId);
  }

  @Get('personal-view')
  async getDiariesByPersonalView(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.diaryService.getDiariesByPersonalView(userId, teamCode, startDate, endDate);
  }

  // ======= 日记与日程关联相关路由 =======

  @Get(':id/schedules')
  async getRelatedSchedules(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.diaryService.getRelatedSchedules(+id, userId, teamCode);
  }

  @Post(':id/schedules')
  async addRelatedSchedules(
    @Param('id') id: string,
    @Body() body: { scheduleIds: number[] },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.diaryService.addRelatedSchedules(+id, userId, teamCode, body.scheduleIds);
  }

  @Delete(':id/schedules/:scheduleId')
  async removeRelatedSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.diaryService.removeRelatedSchedule(+id, +scheduleId, userId, teamCode);
  }

  @Get('today/schedules-available')
  async getTodaySchedulesAvailable(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Query('date') date?: string,
  ) {
    return this.diaryService.getTodaySchedulesAvailable(userId, teamCode, date);
  }
}
