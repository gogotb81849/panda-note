import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ImportantDateService } from './important-date.service';
import { CreateImportantDateDto, UpdateImportantDateDto } from './dto/create-important-date.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TeamCode, UserRole } from '@prisma/client';

@Controller('important-dates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportantDateController {
  constructor(private readonly service: ImportantDateService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll(
      req.user.teamCode as TeamCode,
      req.user.id,
      req.user.role as UserRole,
      startDate,
      endDate,
    );
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateImportantDateDto) {
    return this.service.create(dto, req.user.id, req.user.teamCode as TeamCode);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: number,
    @Body() dto: UpdateImportantDateDto,
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
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  async remove(@Req() req: any, @Param('id') id: number) {
    return this.service.remove(
      id,
      req.user.id,
      req.user.teamCode as TeamCode,
      req.user.role as UserRole,
    );
  }
}
