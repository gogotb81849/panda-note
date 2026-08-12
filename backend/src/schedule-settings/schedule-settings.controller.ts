import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ScheduleSettingsService } from './schedule-settings.service';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamCode } from '@prisma/client';

@Controller('schedule-settings')
@UseGuards(JwtAuthGuard)
export class ScheduleSettingsController {
  constructor(private readonly service: ScheduleSettingsService) {}

  @Get()
  async get(@Req() req: any) {
    return this.service.getOrCreate(req.user.id, req.user.teamCode as TeamCode);
  }

  @Patch()
  async update(@Req() req: any, @Body() dto: UpdateScheduleSettingsDto) {
    return this.service.update(req.user.id, req.user.teamCode as TeamCode, dto);
  }
}
