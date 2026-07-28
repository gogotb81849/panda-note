import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecurringScheduleService } from './recurring-schedule.service';

@Controller('recurring-schedules')
@UseGuards(JwtAuthGuard)
export class RecurringScheduleController {
  constructor(private readonly recurringScheduleService: RecurringScheduleService) {}

  @Get()
  async getAllTemplates(@Request() req) {
    const user = req.user;
    return this.recurringScheduleService.getAllTemplates(user.teamCode);
  }

  @Post()
  async createTemplate(@Request() req, @Body() data: any) {
    const user = req.user;
    return this.recurringScheduleService.createTemplate({
      ...data,
      teamCode: user.teamCode,
    }, user.id);
  }

  @Put(':id')
  async updateTemplate(@Param('id') id: string, @Body() data: any) {
    return this.recurringScheduleService.updateTemplate(Number(id), data);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    return this.recurringScheduleService.deleteTemplate(Number(id));
  }
}
