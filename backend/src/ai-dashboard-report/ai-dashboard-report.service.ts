import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { TeamCode } from '@prisma/client';

@Injectable()
export class AIDashboardReportService {
  private readonly logger = new Logger(AIDashboardReportService.name);
  private readonly API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly API_KEY = process.env.AI_API_KEY;
  private readonly ENDPOINT_ID = process.env.AI_ENDPOINT_ID;

  constructor(
    private prisma: PrismaService,
    private dashboardService: DashboardService,
  ) {}

  // 生成看板AI提炼报告
  async generateDashboardReport(teamCode: TeamCode, date: Date) {
    try {
      // 获取统计数据
      const stats = await this.dashboardService.getDashboardStats(teamCode, date);
      
      // 获取船舶列表
      const shipsByCategory = await this.dashboardService.getShipsByCategory(teamCode, date);

      if (Object.keys(stats).length === 0) {
        return {
          success: false,
          message: '今日暂无数据，无法生成报告',
          report: null,
        };
      }

      // 构建数据摘要
      let dataSummary = `【今日数据概览 - ${date.toISOString().split('T')[0]}】\n\n`;
      
      // 统计卡片信息
      dataSummary += '重点事项统计：\n';
      const importantStats = stats.filter(s => s.shipCount > 0);
      for (const stat of importantStats) {
        dataSummary += `- ${stat.categoryFirst} / ${stat.categorySecond}：${stat.shipCount} 艘船舶（${stat.shipNames.join('、')}）\n`;
      }

      // 船舶详细信息
      dataSummary += '\n船舶详细分布：\n';
      for (const [categoryFirst, subcategories] of Object.entries(shipsByCategory)) {
        dataSummary += `\n${categoryFirst}：\n`;
        for (const [categorySecond, ships] of Object.entries(subcategories) as [string, any[]][]) {
          dataSummary += `  - ${categorySecond}：${ships.length} 艘\n`;
          for (const ship of ships) {
            dataSummary += `    • ${ship.shipName}\n`;
          }
        }
      }

      // 调用AI生成报告
      const report = await this.callAI(dataSummary, date);
      return {
        success: true,
        message: '报告生成成功',
        report,
      };
    } catch (error) {
      this.logger.error('生成看板报告失败', error);
      return {
        success: false,
        message: error.message || '生成报告失败',
        report: null,
      };
    }
  }

  private async callAI(dataSummary: string, date: Date): Promise<string> {
    if (!this.API_KEY || !this.ENDPOINT_ID) {
      throw new ServiceUnavailableException('AI服务未配置，请在.env文件中设置AI_API_KEY和AI_ENDPOINT_ID');
    }

    const messages = [
      {
        role: 'system',
        content: `你是一位专业的船舶管理AI助手。你的任务是根据提供的船舶动态数据，生成一份结构清晰、内容专业的船工主管看板日报。

要求：
1. 使用HTML格式输出，包含<h3>标题、<p>段落、<strong>加粗等标签
2. 语言专业、简洁、有条理
3. 突出重点船舶和重点事项
4. 给出合理的工作建议
5. 避免机械罗列，要有综合分析
6. 报告长度控制在500-800字`,
      },
      {
        role: 'user',
        content: `请根据以下船舶动态数据生成一份船工主管看板日报（${date.toISOString().split('T')[0]}）：

${dataSummary}

请用HTML格式输出报告，包含以下结构：
1. 今日重点关注（重点船舶和事项）
2. 各分类详细情况
3. 工作建议

注意：只输出HTML内容，不要包含markdown代码块标记。`,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.logger.error('调用AI失败', error);
      if (error.name === 'AbortError') {
        throw new ServiceUnavailableException('AI服务响应超时，请稍后重试');
      }
      throw new ServiceUnavailableException(`网络连接失败：${error.message || '未知错误'}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`API调用失败: ${response.status} - ${errorText}`);
      throw new ServiceUnavailableException(`AI服务调用失败 (错误码: ${response.status})`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new BadRequestException('AI服务返回数据格式异常');
    }
    return data.choices[0].message.content;
  }
}
