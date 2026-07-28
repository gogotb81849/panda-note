import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards, Request } from '@nestjs/common';
import { CrewService } from './crew.service';
import { CreateCrewDto } from './dto/create-crew.dto';
import { UpdateCrewDto } from './dto/update-crew.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crew')
@UseGuards(JwtAuthGuard)
export class CrewController {
  constructor(private readonly crewService: CrewService) {}

  @Post()
  async create(@Body() createCrewDto: CreateCrewDto, @Request() req) {
    return this.crewService.create(createCrewDto, req.user.teamCode);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('shipId') shipId?: string,
  ) {
    const shipIdNum = shipId ? parseInt(shipId, 10) : undefined;
    return this.crewService.findAll(req.user.teamCode, search, status, shipIdNum);
  }

  /**
   * 获取指定年月的生日日历数据（必须在 birthdays 之前）
   */
  @Get('birthdays/calendar')
  async getBirthdaysCalendar(
    @Request() req,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const yearNum = year ? parseInt(year, 10) : now.getFullYear();
    const monthNum = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.crewService.getBirthdaysCalendar(req.user.teamCode, yearNum, monthNum);
  }

  /**
   * 获取今日生日（必须在 birthdays 之前）
   */
  @Get('birthdays/today')
  async getTodayBirthdays(@Request() req) {
    return this.crewService.getTodayBirthdays(req.user.teamCode);
  }

  @Get('upcoming-birthdays')
  async getUpcomingBirthdays(
    @Request() req,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.crewService.getUpcomingBirthdays(req.user.teamCode, daysNum);
  }

  /**
   * 兼容旧接口路径 /crew/birthdays
   */
  @Get('birthdays')
  async getBirthdays(
    @Request() req,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.crewService.getUpcomingBirthdays(req.user.teamCode, daysNum);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.crewService.findOne(+id, req.user.teamCode);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCrewDto: UpdateCrewDto,
    @Request() req,
  ) {
    return this.crewService.update(+id, updateCrewDto, req.user.teamCode);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.crewService.remove(+id, req.user.teamCode);
  }
}
