import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request, Query } from '@nestjs/common';
import { MeetingTermService } from './meeting-term.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('meeting-terms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingTermController {
  constructor(private readonly meetingTermService: MeetingTermService) {}

  @Post()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  create(@Body() body: any, @Request() req) {
    return this.meetingTermService.create({
      teamCode: req.user.teamCode,
      userId: req.user.id,
      term: body.term,
      explanation: body.explanation,
      category: body.category,
    });
  }

  @Get()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findAll(@Request() req, @Query('category') category?: string) {
    return this.meetingTermService.findAll(req.user.teamCode, category);
  }

  @Delete(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  remove(@Param('id') id: string, @Request() req) {
    return this.meetingTermService.remove(parseInt(id, 10), req.user.teamCode);
  }
}
