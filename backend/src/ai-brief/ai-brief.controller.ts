import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AIBriefService } from './ai-brief.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';

@Controller('ai-brief')
@UseGuards(JwtAuthGuard)
export class AIBriefController {
  constructor(private readonly aiBriefService: AIBriefService) {}

  @Get('generate')
  async generateBrief(
    @User() user: any,
    @Query('date') date: string,
  ) {
    const brief = await this.aiBriefService.generateBrief(user.teamCode, date);
    return { success: true, brief };
  }

  @Get('generate-range')
  async generateBriefRange(
    @User() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: string,
  ) {
    const brief = await this.aiBriefService.generateBriefRange(user.teamCode, startDate, endDate, type);
    return { success: true, brief };
  }
}
