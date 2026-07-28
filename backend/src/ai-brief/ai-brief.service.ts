import { Injectable, Logger, BadRequestException, UnauthorizedException, NotFoundException, UnprocessableEntityException, ServiceUnavailableException, InternalServerErrorException, GatewayTimeoutException, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AIBriefService {
  private readonly logger = new Logger(AIBriefService.name);
  // 从环境变量读取，禁止硬编码密钥
  private readonly API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly API_KEY = process.env.AI_API_KEY;
  private readonly ENDPOINT_ID = process.env.AI_ENDPOINT_ID;

  constructor(private prisma: PrismaService) {}

  async generateBrief(teamCode: string, date: string) {
    return this.generateBriefRange(teamCode, date, date, 'daily');
  }

  async generateBriefRange(teamCode: string, startDate: string, endDate: string, type: string) {
    try {
      this.logger.log(`生成简报请求: teamCode=${teamCode}, start=${startDate}, end=${endDate}, type=${type}`);

      // 验证日期
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('日期格式无效，请选择有效的日期');
      }
      if (start > end) {
        throw new BadRequestException('开始日期不能晚于结束日期');
      }

      const where: any = {
        teamCode,
        recordDate: {
          gte: start,
          lte: end,
        },
      };
      
      const schedules = await this.prisma.schedule.findMany({
        where,
        orderBy: {
          recordDate: 'asc',
        },
        include: {
          createdBy: {
            select: {
              realName: true,
            },
          },
          assignedTo: {
            select: {
              realName: true,
            },
          },
        },
      });

      this.logger.log(`找到 ${schedules.length} 条日程记录`);

      if (schedules.length === 0) {
        return {
          success: false,
          errorType: 'NO_DATA',
          message: `${this.getTypeName(type)}（${startDate} 至 ${endDate}）暂无日程记录，无法生成简报。请先添加一些日程。`,
          brief: null
        };
      }

      const brief = await this.callAI(schedules, type, startDate, endDate);
      return {
        success: true,
        errorType: null,
        message: '生成成功',
        brief: brief
      };
    } catch (error) {
      this.logger.error('生成简报失败', error);

      let errorType = 'UNKNOWN_ERROR';
      let errorMessage = `生成简报时出现错误：${error.message || '未知错误'}`;

      // 如果是 NestJS HttpException，可直接读取 status 与 response 中的消息
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const resp = error.getResponse();
        const detail = typeof resp === 'string' ? resp : (resp as any)?.message || error.message;
        errorMessage = detail;
        if (status >= 400 && status < 500) {
          if (status === 401 || status === 403) errorType = 'API_ERROR';
          else if (status === 404) errorType = 'API_ERROR';
          else if (status === 422) errorType = 'API_ERROR';
          else errorType = 'API_ERROR';
        } else if (status >= 500) {
          if (status === 504) errorType = 'NETWORK_ERROR';
          else errorType = 'SERVER_ERROR';
        } else if (status >= 400 && status < 500) {
          errorType = 'API_ERROR';
        }
        return {
          success: false,
          errorType,
          message: errorMessage,
          brief: null,
        };
      }

      // 普通 Error：按关键字分类（兼容 callAI 外的其他错误源）
      const msg = (error.message || '').toString();
      if (msg.includes('日期') || msg.includes('date')) {
        errorType = 'INVALID_DATE';
      } else if (msg.includes('网络') || msg.includes('fetch') || (error as any).code === 'ECONNREFUSED') {
        errorType = 'NETWORK_ERROR';
        errorMessage = '网络连接失败，请检查网络连接后重试';
      } else if (msg.includes('API') || msg.includes('401') || msg.includes('403')) {
        errorType = 'API_ERROR';
        errorMessage = 'AI服务调用失败，可能是API密钥无效或服务不可用';
      } else if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
        errorType = 'SERVER_ERROR';
        errorMessage = 'AI服务内部错误，请稍后重试';
      } else if (msg.includes('prisma') || msg.includes('Prisma') || msg.includes('数据库')) {
        errorType = 'DATABASE_ERROR';
        errorMessage = '数据库查询失败，请检查数据库连接';
      }

      return {
        success: false,
        errorType,
        message: errorMessage,
        brief: null,
      };
    }
  }

  private getTypeName(type: string): string {
    const map: Record<string, string> = {
      daily: '日报',
      '3days': '3天简报',
      weekly: '周报',
      halfmonth: '半月简报',
      monthly: '月报',
      quarterly: '季度简报',
      halfyear: '半年简报',
      yearly: '年度报告'
    };
    return map[type] || '简报';
  }

  private getStructure(type: string): string {
    const structures: Record<string, string> = {
      daily: `请生成一份结构清晰的日报，包括：
1. 今日工作总结
2. 完成情况统计
3. 重点工作回顾
4. 明日建议`,
      '3days': `请生成一份结构清晰的3天简报，包括：
1. 期间工作总结
2. 完成情况统计
3. 重点工作回顾
4. 后续工作建议`,
      weekly: `请生成一份结构清晰的周报，包括：
1. 本周工作总结
2. 完成情况统计
3. 重点工作回顾
4. 问题与分析
5. 下周计划`,
      halfmonth: `请生成一份结构清晰的半月简报，包括：
1. 半月工作总结
2. 完成情况统计
3. 重点工作回顾
4. 问题与分析
5. 后续计划`,
      monthly: `请生成一份结构清晰的月报，包括：
1. 本月工作总结
2. 完成情况统计
3. 重点工作回顾
4. 问题与分析
5. 下月计划`,
      quarterly: `请生成一份结构清晰的季度简报，包括：
1. 季度工作总结
2. 完成情况统计
3. 重点工作回顾
4. 问题与分析
5. 下季度计划`,
      halfyear: `请生成一份结构清晰的半年简报，包括：
1. 半年工作总结
2. 完成情况统计
3. 重点工作回顾
4. 问题与分析
5. 下半年计划`,
      yearly: `请生成一份结构清晰的年度报告，包括：
1. 年度工作总结
2. 完成情况统计
3. 重点工作回顾
4. 经验与教训
5. 下年度计划`
    };
    return structures[type] || structures.daily;
  }

  private organizeData(schedules: any[], type: string): string {
    // 按照日期分组
    const groupedByDate: Record<string, any[]> = {};
    schedules.forEach(s => {
      const date = s.recordDate.toISOString().split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(s);
    });

    // 按照一级分类分组
    const groupedByFirstType: Record<string, any[]> = {};
    schedules.forEach(s => {
      const key = s.firstType || '其他';
      if (!groupedByFirstType[key]) {
        groupedByFirstType[key] = [];
      }
      groupedByFirstType[key].push(s);
    });

    // 统计完成情况
    const stats = {
      total: schedules.length,
      completed: schedules.filter(s => s.finishStatus === 'completed').length,
      inProgress: schedules.filter(s => s.finishStatus === 'in_progress').length,
      pending: schedules.filter(s => s.finishStatus === 'pending').length,
      byPriority: {
        urgent_important: schedules.filter(s => s.priority === 'urgent_important').length,
        important: schedules.filter(s => s.priority === 'important').length,
        urgent: schedules.filter(s => s.priority === 'urgent').length,
        normal: schedules.filter(s => s.priority === 'normal').length,
        low: schedules.filter(s => s.priority === 'low').length
      }
    };

    let result = '';
    
    // 添加统计信息
    result += `【总体统计】\n`;
    result += `总计日程: ${stats.total}项\n`;
    result += `已完成: ${stats.completed}项\n`;
    result += `进行中: ${stats.inProgress}项\n`;
    result += `待处理: ${stats.pending}项\n`;
    result += `紧急重要: ${stats.byPriority.urgent_important}项\n`;
    result += `重要: ${stats.byPriority.important}项\n`;
    result += `紧急: ${stats.byPriority.urgent}项\n`;
    result += `普通: ${stats.byPriority.normal}项\n\n`;

    if (type === 'daily') {
      // 日报：按详细内容展示
      result += `【详细日程】\n`;
      Object.keys(groupedByDate).forEach(date => {
        result += `\n日期: ${date}\n`;
        groupedByDate[date].forEach(s => {
          result += `  [${s.finishStatus}] ${s.firstType} - ${s.secondType}\n`;
          if (s.eventDetail) {
            result += `    ${s.eventDetail}\n`;
          }
          if (s.assignedTo?.realName) {
            result += `    负责人: ${s.assignedTo.realName}\n`;
          }
        });
      });
    } else if (type === 'weekly' || type === 'halfmonth') {
      // 周报/半月报：按一级分类汇总，加上每日完成情况
      result += `【按工作分类汇总】\n`;
      Object.keys(groupedByFirstType).forEach(typeName => {
        const items = groupedByFirstType[typeName];
        result += `\n${typeName}: ${items.length}项\n`;
        items.forEach(s => {
          result += `  [${s.finishStatus}] ${s.secondType}\n`;
          if (s.eventDetail) {
            result += `    ${s.eventDetail}\n`;
          }
        });
      });
      
      result += `\n【每日完成情况】\n`;
      Object.keys(groupedByDate).sort().forEach(date => {
        const dayItems = groupedByDate[date];
        const completed = dayItems.filter(s => s.finishStatus === 'completed').length;
        result += `${date}: ${dayItems.length}项（已完成${completed}项）\n`;
      });
    } else {
      // 月报/季报/年报：更宏观的汇总
      result += `【按工作分类汇总】\n`;
      Object.keys(groupedByFirstType).forEach(typeName => {
        const items = groupedByFirstType[typeName];
        const completed = items.filter(s => s.finishStatus === 'completed').length;
        result += `\n${typeName}: ${items.length}项（已完成${completed}项）\n`;
        
        // 只展示重要内容
        const importantItems = items.filter(s => 
          s.priority === 'urgent_important' || s.priority === 'important'
        );
        importantItems.forEach(s => {
          result += `  [${s.finishStatus}] ${s.secondType}\n`;
        });
      });
    }

    return result;
  }

  private async callAI(schedules: any[], type: string, startDate: string, endDate: string): Promise<any> {
    if (!this.API_KEY || !this.ENDPOINT_ID) {
      throw new BadRequestException('AI服务未配置，请在.env文件中设置AI_API_KEY和AI_ENDPOINT_ID');
    }
    // 按照不同报告类型组织数据
    const scheduleText = this.organizeData(schedules, type);

    const typeName = this.getTypeName(type);
    const structure = this.getStructure(type);

    const messages = [
      {
        role: 'system',
        content: `你是一位专业的航务管理工作简报助手。你的任务是根据提供的日程信息，生成一份结构清晰、内容详实、语言专业的工作简报。

要求：
1. 以自然语言总结，不要使用表格或列表格式（除非明确要求）
2. 突出重点工作和完成情况
3. 分析存在的问题并提出合理建议
4. 使用专业的航务管理用语
5. 保持逻辑连贯，条理清晰
6. 避免机械罗列，要有综合分析和思考`,
      },
      {
        role: 'user',
        content: `请根据以下日程信息生成一份${typeName}（${startDate} 至 ${endDate}）：

${scheduleText}

${structure}

请用中文回答，语言专业、流畅、有深度，展现你的综合分析能力。`,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    let response: Response;
    try {
      response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          model: this.ENDPOINT_ID,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.logger.error('调用AI失败', error);
      if (error.name === 'AbortError') {
        throw new GatewayTimeoutException('AI服务响应超时，请稍后重试');
      }
      throw new ServiceUnavailableException(`网络连接失败：${error.message || '未知错误'}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`API调用失败: ${response.status} - ${errorText}`);

      switch (response.status) {
        case 401:
        case 403:
          throw new UnauthorizedException('AI服务认证失败，请检查API密钥配置');
        case 404:
          throw new NotFoundException('AI服务地址不可用，请检查服务配置');
        case 429:
          throw new UnprocessableEntityException('AI服务请求过于频繁，请稍后再试');
        case 500:
        case 502:
        case 503:
        case 504:
          throw new ServiceUnavailableException('AI服务内部错误，请稍后重试');
        default:
          throw new InternalServerErrorException(`AI服务调用失败 (错误码: ${response.status})`);
      }
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new InternalServerErrorException('AI服务返回数据格式异常');
    }
    return data.choices[0].message.content;
  }
}
