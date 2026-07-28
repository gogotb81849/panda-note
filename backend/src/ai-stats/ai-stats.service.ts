import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AIStatsService {
  private readonly logger = new Logger(AIStatsService.name);

  constructor(private prisma: PrismaService) {}

  async generateDailyReview(teamCode: string, userId: number, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [schedules, diaries] = await Promise.all([
      this.prisma.schedule.findMany({
        where: {
          teamCode: teamCode as any,
          createdById: userId,
          recordDate: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.diary.findMany({
        where: {
          teamCode: teamCode as any,
          userId,
          date: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (schedules.length === 0 && diaries.length === 0) {
      return { success: false, message: 'No records for this day', data: null };
    }

    const scheduleLines = schedules.map(s => 
      `- ${s.title || s.eventDetail || 'Untitled'} | Status: ${s.finishStatus} | Priority: ${s.priority}`
    ).join('\n');

    const diaryLines = diaries.map(d => 
      `- ${d.categoryFirst || 'Uncategorized'}: ${(d.content || '').substring(0, 100)}...`
    ).join('\n');

    const prompt = [
      'Generate a daily work review draft based on the following data:',
      '',
      `## Schedule Records (${schedules.length} items)`,
      scheduleLines,
      '',
      `## Diary Records (${diaries.length} items)`,
      diaryLines,
      '',
      'Please generate:',
      '1. Completed items',
      '2. In-progress items',
      '3. Pending tasks',
      '4. Next day priority todo list (High/Medium/Low)',
      '',
      'Requirements: Standardized maritime work style, remove colloquial content.',
    ].join('\n');

    return {
      success: true,
      isDraft: true,
      data: {
        scheduleCount: schedules.length,
        diaryCount: diaries.length,
        prompt,
      },
    };
  }

  async getTimeStats(teamCode: string, userId: number, type: 'day' | 'week', date: string) {
    let startDate: Date;
    let endDate: Date;

    if (type === 'day') {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(date);
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        teamCode: teamCode as any,
        createdById: userId,
        recordDate: { gte: startDate, lte: endDate },
        startTime: { not: null },
        endTime: { not: null },
      },
      orderBy: { recordDate: 'asc' },
    });

    const categoryStats: Record<string, { count: number; totalMinutes: number; items: string[] }> = {};
    
    for (const s of schedules) {
      const category = s.firstType || 'Uncategorized';
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, totalMinutes: 0, items: [] };
      }
      
      categoryStats[category].count++;
      
      if (s.startTime && s.endTime) {
        const minutes = (s.endTime.getTime() - s.startTime.getTime()) / 60000;
        categoryStats[category].totalMinutes += minutes;
        const itemTitle = s.title || s.eventDetail || 'Untitled';
        categoryStats[category].items.push(`${itemTitle} (${Math.round(minutes)}min)`);
      }
    }

    const totalMinutes = Object.values(categoryStats).reduce((sum, s) => sum + s.totalMinutes, 0);
    const diagnosis = this.generateEfficiencyDiagnosis(categoryStats, totalMinutes);

    return {
      type,
      dateRange: { start: startDate, end: endDate },
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      categoryStats: Object.entries(categoryStats).map(([name, data]) => ({
        name,
        count: data.count,
        totalMinutes: data.totalMinutes,
        totalHours: Math.round(data.totalMinutes / 60 * 10) / 10,
        percentage: totalMinutes > 0 ? Math.round(data.totalMinutes / totalMinutes * 100) : 0,
        items: data.items,
      })),
      diagnosis,
    };
  }

  private generateEfficiencyDiagnosis(
    categoryStats: Record<string, { count: number; totalMinutes: number; items: string[] }>,
    totalMinutes: number,
  ): string[] {
    const diagnosis: string[] = [];
    
    const sorted = Object.entries(categoryStats)
      .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes);

    if (sorted.length > 0) {
      const [topCategory, topData] = sorted[0];
      const percentage = totalMinutes > 0 ? (topData.totalMinutes / totalMinutes * 100) : 0;
      
      if (percentage > 50) {
        diagnosis.push(`"${topCategory}" takes ${Math.round(percentage)}% of time, suggest better allocation`);
      }
    }

    const fragmentedTasks = Object.values(categoryStats).filter(c => c.totalMinutes < 30).length;
    if (fragmentedTasks > 3) {
      diagnosis.push(`${fragmentedTasks} tasks under 30min, suggest merging`);
    }

    const longTasks = Object.values(categoryStats).filter(c => c.totalMinutes > 180).length;
    if (longTasks > 0) {
      diagnosis.push(`${longTasks} tasks over 3 hours, suggest taking breaks`);
    }

    if (diagnosis.length === 0) {
      diagnosis.push('Time allocation is reasonable, keep it up');
    }

    return diagnosis;
  }

  async categorizeFragments(teamCode: string, userId: number, daysBack: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const diaries = await this.prisma.diary.findMany({
      where: {
        teamCode: teamCode as any,
        userId,
        createdAt: { gte: cutoffDate },
        categoryFirst: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (diaries.length === 0) {
      return { success: false, message: 'No uncategorized records', data: null };
    }

    const recordLines = diaries.map((d, i) => 
      `${i + 1}. ${(d.content || '').substring(0, 150)}...`
    ).join('\n');

    const prompt = [
      `Categorize the following ${diaries.length} uncategorized records into: Notes, Issues, Todos, Notifications, Insights`,
      '',
      'Records:',
      recordLines,
      '',
      'Output JSON format: [{id: recordId, category: category}]',
    ].join('\n');

    return { success: true, count: diaries.length, prompt };
  }

  async knowledgeQA(teamCode: string, userId: number, question: string) {
    const [diaries, experiences, schedules] = await Promise.all([
      this.prisma.diary.findMany({
        where: {
          teamCode: teamCode as any,
          userId,
          OR: [
            { content: { contains: question, mode: 'insensitive' } },
            { categoryFirst: { contains: question, mode: 'insensitive' } },
            { categorySecond: { contains: question, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { date: 'desc' },
      }),
      this.prisma.experience.findMany({
        where: {
          teamCode: teamCode as any,
          OR: [
            { title: { contains: question, mode: 'insensitive' } },
            { content: { contains: question, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { rating: 'desc' },
      }),
      this.prisma.schedule.findMany({
        where: {
          teamCode: teamCode as any,
          createdById: userId,
          OR: [
            { title: { contains: question, mode: 'insensitive' } },
            { eventDetail: { contains: question, mode: 'insensitive' } },
            { description: { contains: question, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { recordDate: 'desc' },
      }),
    ]);

    const diaryLines = diaries.map(d => 
      `- ${d.date}: ${(d.content || '').substring(0, 100)}...`
    ).join('\n');

    const experienceLines = experiences.map(e => 
      `- ${e.title}: ${(e.content || '').substring(0, 100)}...`
    ).join('\n');

    const scheduleLines = schedules.map(s => 
      `- ${s.recordDate}: ${s.title || s.eventDetail || 'Untitled'}`
    ).join('\n');

    const prompt = [
      `User question: ${question}`,
      '',
      'Found related materials:',
      `## Diaries (${diaries.length} items)`,
      diaryLines,
      '',
      `## Experiences (${experiences.length} items)`,
      experienceLines,
      '',
      `## Schedules (${schedules.length} items)`,
      scheduleLines,
      '',
      'Please integrate the above materials to answer the user question.',
    ].join('\n');

    return {
      success: true,
      data: {
        question,
        relatedDiaries: diaries.length,
        relatedExperiences: experiences.length,
        relatedSchedules: schedules.length,
        prompt,
      },
    };
  }

  /**
   * P2-6: 分析任务回收数据（AI增强）
   */
  async analyzeTaskResponses(teamCode: string, templateId: number) {
    const template = await this.prisma.publishTemplate.findFirst({
      where: { id: templateId, teamCode: teamCode as any },
    });
    if (!template) throw new BadRequestException('模板不存在');

    const submissions = await this.prisma.shipTaskStatus.findMany({
      where: { teamCode: teamCode as any, templateId },
      include: {
        template: { select: { title: true, items: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const totalSubmissions = submissions.length;
    const completedSubmissions = submissions.filter(s => s.status === 'completed').length;
    const responseDataList = submissions
      .filter(s => s.responseData)
      .map((s, i) => ({
        index: i + 1,
        data: s.responseData,
        status: s.status,
        progress: s.progress,
      }));

    // 提取指标数据
    const items = (template.items as any[]) || [];
    const metrics: any[] = [];
    const metricDefs = (template.dashboardMetrics as any[]) || [];

    for (const def of metricDefs) {
      const values = responseDataList
        .map(r => r.data?.[def.field])
        .filter(v => v !== null && v !== undefined);

      if (values.length === 0) continue;

      if (def.type === 'average' && typeof values[0] === 'number') {
        const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        metrics.push({ code: def.code, label: def.label, value: Math.round(avg * 10) / 10, type: 'average', count: values.length });
      } else if (def.type === 'sum' && typeof values[0] === 'number') {
        const sum = values.reduce((a: number, b: number) => a + b, 0);
        metrics.push({ code: def.code, label: def.label, value: sum, type: 'sum', count: values.length });
      } else if (def.type === 'count') {
        const condition = def.condition;
        const count = condition
          ? values.filter((v: any) => v === condition || String(v).includes(condition)).length
          : values.length;
        metrics.push({ code: def.code, label: def.label, value: count, type: 'count', total: totalSubmissions });
      } else if (def.type === 'rate') {
        const trueCount = values.filter((v: any) => v === true || v === 'true' || v === '是').length;
        const rate = values.length > 0 ? Math.round((trueCount / values.length) * 100) : 0;
        metrics.push({ code: def.code, label: def.label, value: rate, type: 'rate', unit: '%', total: values.length, trueCount });
      }
    }

    // 生成AI分析提示词
    const dataSummary = [
      `## 模板：${template.title}`,
      `总提交数：${totalSubmissions}，完成：${completedSubmissions}，完成率：${totalSubmissions > 0 ? Math.round(completedSubmissions / totalSubmissions * 100) : 0}%`,
      '',
      '## 提取的指标',
      ...metrics.map(m => `- ${m.label}: ${m.value}${m.unit || ''}`),
      '',
      '## 提交数据摘要',
      ...responseDataList.slice(0, 10).map(r =>
        `提交#${r.index}: ${JSON.stringify(r.data).substring(0, 200)}`
      ),
    ].join('\n');

    const prompt = [
      '请基于以下任务回收数据，生成一份结构化的分析报告：',
      '',
      dataSummary,
      '',
      '请生成：',
      '1. 整体概况（1-2句）',
      '2. 关键指标解读',
      '3. 异常发现（如有）',
      '4. 管理建议',
    ].join('\n');

    return {
      success: true,
      templateId,
      templateTitle: template.title,
      stats: {
        totalSubmissions,
        completedSubmissions,
        completionRate: totalSubmissions > 0 ? Math.round(completedSubmissions / totalSubmissions * 100) : 0,
      },
      metrics,
      prompt,
      isDraft: true,
    };
  }
}
