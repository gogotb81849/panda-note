import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { MeetingTemplateService } from './meeting-template.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('meeting-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingTemplateController {
  constructor(private readonly meetingTemplateService: MeetingTemplateService) {}

  @Post()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  create(@Body() body: any, @Request() req) {
    return this.meetingTemplateService.create({
      teamCode: req.user.teamCode,
      userId: req.user.id,
      name: body.name,
      content: body.content,
      description: body.description,
      isDefault: body.isDefault,
    });
  }

  @Get()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findAll(@Request() req) {
    return this.meetingTemplateService.findAll(req.user.teamCode, req.user.id);
  }

  @Get('default')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getDefault(@Request() req) {
    return this.meetingTemplateService.getDefaultTemplate(req.user.teamCode);
  }

  @Get(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findOne(@Param('id') id: string, @Request() req) {
    return this.meetingTemplateService.findOne(parseInt(id, 10), req.user.teamCode);
  }

  @Patch(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  update(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.meetingTemplateService.update(parseInt(id, 10), req.user.teamCode, body);
  }

  @Delete(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  remove(@Param('id') id: string, @Request() req) {
    return this.meetingTemplateService.remove(parseInt(id, 10), req.user.teamCode);
  }
}
