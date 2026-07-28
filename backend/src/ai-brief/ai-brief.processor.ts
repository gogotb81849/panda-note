import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('AIBriefProcessor');

export async function processAIBrief(job: any) {
  const { teamCode, startDate, endDate, type } = job.data;
  
  logger.log(`开始处理AI简报任务: teamCode=${teamCode}, start=${startDate}, end=${endDate}, type=${type}`);
  
  const prisma = new PrismaService();
  
  try {
    await prisma.$connect();
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const schedules = await prisma.schedule.findMany({
      where: {
        teamCode,
        recordDate: { gte: start, lte: end },
      },
      orderBy: { recordDate: 'asc' },
      include: {
        createdBy: { select: { realName: true } },
        assignedTo: { select: { realName: true } },
      },
    });
    
    if (schedules.length === 0) {
      logger.log('没有找到日程记录');
      return { success: false, message: '暂无日程记录' };
    }
    
    const brief = await callAI(schedules, type, startDate, endDate);
    
    return { success: true, brief };
  } catch (error) {
    logger.error('处理AI简报任务失败', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function callAI(schedules: any[], type: string, startDate: string, endDate: string): Promise<string> {
  const API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const API_KEY = process.env.AI_API_KEY;
  const ENDPOINT_ID = process.env.AI_ENDPOINT_ID;
  
  if (!API_KEY || !ENDPOINT_ID) {
    throw new Error('AI服务未配置');
  }
  
  const scheduleText = organizeData(schedules, type);
  const typeName = getTypeName(type);
  const structure = getStructure(type);
  
  const messages = [
    {
      role: 'system',
      content: '你是一位专业的航务管理工作简报助手。请根据提供的日程信息，生成一份结构清晰、内容详实的工作简报。',
    },
    {
      role: 'user',
      content: `请根据以下日程信息生成一份${typeName}（${startDate} 至 ${endDate}）：\n\n${scheduleText}\n\n${structure}`,
    },
  ];
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: ENDPOINT_ID,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(30000),
  });
  
  if (!response.ok) {
    throw new Error(`AI服务调用失败: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

function getTypeName(type: string): string {
  const map: Record<string, string> = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
    quarterly: '季度简报',
  };
  return map[type] || '简报';
}

function getStructure(type: string): string {
  const structures: Record<string, string> = {
    daily: '1. 今日工作总结\n2. 完成情况统计\n3. 重点工作回顾\n4. 明日建议',
    weekly: '1. 本周工作总结\n2. 完成情况统计\n3. 重点工作回顾\n4. 问题与分析\n5. 下周计划',
    monthly: '1. 本月工作总结\n2. 完成情况统计\n3. 重点工作回顾\n4. 问题与分析\n5. 下月计划',
    quarterly: '1. 季度工作总结\n2. 完成情况统计\n3. 重点工作回顾\n4. 问题与分析\n5. 下季度计划',
  };
  return structures[type] || structures.daily;
}

function organizeData(schedules: any[], type: string): string {
  const groupedByDate: Record<string, any[]> = {};
  schedules.forEach(s => {
    const date = s.recordDate.toISOString().split('T')[0];
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(s);
  });
  
  let result = `总计日程: ${schedules.length}项\n`;
  Object.keys(groupedByDate).forEach(date => {
    result += `\n日期: ${date}\n`;
    groupedByDate[date].forEach(s => {
      result += `  [${s.finishStatus}] ${s.firstType} - ${s.secondType}\n`;
      if (s.eventDetail) result += `    ${s.eventDetail}\n`;
    });
  });
  
  return result;
}