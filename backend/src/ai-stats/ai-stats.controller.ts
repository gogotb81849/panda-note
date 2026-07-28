import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AIStatsService } from './ai-stats.service';

@Controller('ai-stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIStatsController {
  constructor(private readonly aiStatsService: AIStatsService) {}

  /**
   * 生成每日工作复盘草稿
   */
  @Post('daily-review')
  @Roles('ship_political_instructor', 'shore_crew_supervisor', 'admin')
  async generateDailyReview(
    @Request() req,
    @Body('date') date: string,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;
    const reviewDate = date || new Date().toISOString().split('T')[0];
    
    return this.aiStatsService.generateDailyReview(teamCode, userId, reviewDate);
  }

  /**
   * 获取时间统计（日/周维度）
   */
  @Get('time-stats')
  @Roles('ship_political_instructor', 'shore_crew_supervisor', 'admin')
  async getTimeStats(
    @Request() req,
    @Body('type') type: 'day' | 'week',
    @Body('date') date: string,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;
    const statsDate = date || new Date().toISOString().split('T')[0];
    const statsType = type || 'day';
    
    return this.aiStatsService.getTimeStats(teamCode, userId, statsType, statsDate);
  }

  /**
   * AI碎片记录自动归类
   */
  @Post('categorize-fragments')
  @Roles('ship_political_instructor', 'shore_crew_supervisor', 'admin')
  async categorizeFragments(
    @Request() req,
    @Body('daysBack') daysBack: number,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;
    const days = daysBack || 7;
    
    return this.aiStatsService.categorizeFragments(teamCode, userId, days);
  }

  /**
   * 私有知识库问答
   */
  @Post('knowledge-qa')
  @Roles('ship_political_instructor', 'shore_crew_supervisor', 'admin')
  async knowledgeQA(
    @Request() req,
    @Body('question') question: string,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;
    
    return this.aiStatsService.knowledgeQA(teamCode, userId, question);
  }

  /**
   * P2-6: 分析任务回收数据
   */
  @Post('analyze-task')
  @Roles('shore_crew_supervisor', 'admin')
  async analyzeTaskResponses(
    @Request() req,
    @Body('templateId') templateId: number,
  ) {
    const teamCode = req.user.teamCode;
    return this.aiStatsService.analyzeTaskResponses(teamCode, templateId);
  }
}
