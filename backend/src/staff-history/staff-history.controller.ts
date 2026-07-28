import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffHistoryService } from './staff-history.service';
import { CreateStaffHistoryDto, UpdateStaffHistoryDto } from './staff-history.dto';

@Controller('staff-history')
export class StaffHistoryController {
  constructor(private staffHistoryService: StaffHistoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    return this.staffHistoryService.findAll(req.user.teamCode);
  }

  @Get('ship/:shipId')
  @UseGuards(JwtAuthGuard)
  async findByShip(@Request() req: any, @Param('shipId') shipId: string) {
    return this.staffHistoryService.findByShipId(req.user.teamCode, +shipId);
  }

  @Get('current/:shipId')
  @UseGuards(JwtAuthGuard)
  async findCurrentStaff(
    @Request() req: any,
    @Param('shipId') shipId: string,
    @Query('date') date: string,
  ) {
    const recordDate = date ? new Date(date) : new Date();
    return this.staffHistoryService.findCurrentStaff(req.user.teamCode, +shipId, recordDate);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createDto: CreateStaffHistoryDto) {
    return this.staffHistoryService.create(req.user.teamCode, createDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateStaffHistoryDto,
  ) {
    return this.staffHistoryService.update(req.user.teamCode, +id, updateDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.staffHistoryService.delete(req.user.teamCode, +id, req.user.id);
  }
}
