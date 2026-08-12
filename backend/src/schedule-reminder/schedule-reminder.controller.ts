import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ScheduleReminderService } from './schedule-reminder.service';
import { CreateScheduleReminderDto, UpdateScheduleReminderDto } from './dto/create-schedule-reminder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TeamCode, UserRole } from '@prisma/client';

@Controller('schedule-reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleReminderController {
  constructor(private readonly service: ScheduleReminderService) {}

  @Get()
  async findPending(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findPending(
      req.user.id,
      req.user.teamCode as TeamCode,
      startDate,
      endDate,
    );
  }

  @Get('by-schedule/:scheduleId')
  async findByScheduleId(@Req() req: any, @Param('scheduleId') scheduleId: number) {
    return this.service.findByScheduleId(
      scheduleId,
      req.user.id,
      req.user.teamCode as TeamCode,
    );
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateScheduleReminderDto) {
    return this.service.create(dto, req.user.id, req.user.teamCode as TeamCode);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: number,
    @Body() dto: UpdateScheduleReminderDto,
  ) {
    return this.service.update(
      id,
      dto,
      req.user.id,
      req.user.teamCode as TeamCode,
      req.user.role as UserRole,
    );
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: number) {
    return this.service.remove(
      id,
      req.user.id,
      req.user.teamCode as TeamCode,
      req.user.role as UserRole,
    );
  }

  @Delete('by-schedule/:scheduleId')
  async removeAllByScheduleId(@Req() req: any, @Param('scheduleId') scheduleId: number) {
    return this.service.removeAllByScheduleId(
      scheduleId,
      req.user.id,
      req.user.teamCode as TeamCode,
      req.user.role as UserRole,
    );
  }
}
