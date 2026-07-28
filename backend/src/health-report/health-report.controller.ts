import { Controller, Post, Get, UseInterceptors, UploadedFile, Body, Query, UseGuards, Request, Res, StreamableFile, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HealthReportService } from './health-report.service';
import { NotificationsGateway } from '../websocket/notifications.gateway';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

@Controller('health-report')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthReportController {
  private readonly logger = new Logger(HealthReportController.name);

  constructor(
    private readonly healthReportService: HealthReportService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * 上传健康排查表
   */
  @Post('upload')
  @Roles('ship_political_instructor', 'shore_crew_supervisor', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReport(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('shipId') shipId: string,
    @Body('month') month: string,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;

    return this.healthReportService.uploadReport(
      teamCode,
      parseInt(shipId),
      userId,
      file,
      month,
    );
  }

  /**
   * 下载标准模板
   */
  @Get('download-template')
  @Roles('ship_political_instructor', 'shore_crew_supervisor', 'admin')
  async downloadTemplate(@Res({ passthrough: true }) res: Response) {
    const templatePath = this.healthReportService.getTemplatePath();
    
    if (!templatePath || !fs.existsSync(templatePath)) {
      return {
        success: false,
        message: '模板文件不存在，请联系管理员',
      };
    }

    const file = fs.readFileSync(templatePath);
    res.set({
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': 'attachment; filename="船员健康排查表模板.xls"',
      'Content-Length': file.length,
    });

    return new StreamableFile(fs.createReadStream(templatePath));
  }

  /**
   * 获取月度看板数据
   */
  @Get('dashboard')
  @Roles('shore_crew_supervisor', 'admin')
  async getDashboard(
    @Request() req,
    @Query('month') month: string,
  ) {
    const teamCode = req.user.teamCode;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    return this.healthReportService.getDashboard(teamCode, currentMonth);
  }

  /**
   * 获取单船详情
   */
  @Get('ship-detail')
  @Roles('shore_crew_supervisor', 'admin')
  async getShipDetail(
    @Request() req,
    @Query('uploadId') uploadId: string,
  ) {
    const teamCode = req.user.teamCode;
    return this.healthReportService.getShipDetail(teamCode, parseInt(uploadId));
  }

  /**
   * 保存主管批注
   */
  @Post('save-note')
  @Roles('shore_crew_supervisor', 'admin')
  async saveNote(
    @Request() req,
    @Body('uploadId') uploadId: number,
    @Body('note') note: string,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;
    return this.healthReportService.saveSupervisorNote(teamCode, uploadId, userId, note);
  }

  /**
   * 获取未提交船舶名单
   */
  @Get('unsubmitted')
  @Roles('shore_crew_supervisor', 'admin')
  async getUnsubmittedShips(
    @Request() req,
    @Body('month') month: string,
  ) {
    const teamCode = req.user.teamCode;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    return this.healthReportService.getUnsubmittedShips(teamCode, currentMonth);
  }

  /**
   * AI生成月度健康报告（调用真实AI API）
   */
  @Post('generate-report')
  @Roles('shore_crew_supervisor', 'admin')
  async generateReport(
    @Request() req,
    @Body('month') month: string,
  ) {
    const teamCode = req.user.teamCode;
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    const dashboard = await this.healthReportService.getDashboard(teamCode, currentMonth);

    // 获取高风险船舶详情
    const highRiskShips = dashboard.shipCards.filter(s => s.riskLevel === 'red' || s.riskLevel === 'yellow');
    const unsubmittedNames = dashboard.unsubmittedShipNames || [];

    // 构建数据摘要供AI分析
    const dataSummary = [
      `## 月度健康排查数据摘要 - ${currentMonth}`,
      '',
      `### 报送统计`,
      `- 应报送船舶：${dashboard.totalShips}艘`,
      `- 正常提交：${dashboard.normalShips}艘`,
      `- 格式异常：${dashboard.abnormalShips}艘`,
      `- 未报送：${dashboard.unsubmittedShips}艘${unsubmittedNames.length > 0 ? '（' + unsubmittedNames.join('、') + '）' : ''}`,
      `- 报送完成率：${dashboard.submissionRate}%`,
      '',
      `### 健康数据`,
      `- 排查船员总数：${dashboard.totalCrew}人`,
      `- 生理异常：${dashboard.healthAbnormalTotal}人`,
      `- 心理异常：${dashboard.psychAbnormalTotal}人`,
      '',
      `### 重点关注船舶`,
      ...(highRiskShips.length > 0
        ? highRiskShips.map((s, i) => {
            const level = s.riskLevel === 'red' ? '高风险' : '一般风险';
            return `${i + 1}. ${s.shipName}（${level}，生理异常${s.healthAbnormalCount}人，心理异常${s.psychAbnormalCount}人）`;
          })
        : ['本月无重点关注船舶']),
      '',
      ...(dashboard.comparisonText ? [`### 环比分析`, dashboard.comparisonText] : []),
    ].join('\n');

    // 调用AI生成报告
    let aiReport = '';
    let aiModel = '';
    try {
      const aiUrl = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      const aiKey = process.env.AI_API_KEY;
      const endpointId = process.env.AI_ENDPOINT_ID;

      if (aiKey && endpointId) {
        const response = await fetch(aiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiKey}`,
          },
          body: JSON.stringify({
            model: endpointId,
            messages: [
              {
                role: 'system',
                content: '你是一个专业的船员健康管理顾问。请根据提供的月度健康排查数据，生成一份结构化的分析报告。报告应包括：1) 整体概况 2) 异常分析 3) 重点关注船舶与人员 4) 环比趋势 5) 管理建议。请使用专业但易懂的语言，突出关键风险点。',
              },
              {
                role: 'user',
                content: dataSummary + '\n\n请基于以上数据生成月度船员健康分析报告。',
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        const result = await response.json();
        if (result.choices?.[0]?.message?.content) {
          aiReport = result.choices[0].message.content;
          aiModel = endpointId;
        } else {
          throw new BadRequestException('AI返回格式异常');
        }
      } else {
        throw new ServiceUnavailableException('AI API未配置');
      }
    } catch (aiError: any) {
      this.logger.warn(`AI报告生成失败，使用模板备用: ${aiError.message}`);
      // 备用：使用模板生成报告
      aiReport = this.generateFallbackReport(dashboard, currentMonth);
      aiModel = 'fallback-template';
    }

    return {
      success: true,
      month: currentMonth,
      report: aiReport,
      model: aiModel,
      dashboardSummary: {
        totalShips: dashboard.totalShips,
        submittedShips: dashboard.totalShips - dashboard.unsubmittedShips,
        unsubmittedShips: dashboard.unsubmittedShips,
        totalCrew: dashboard.totalCrew,
        healthAbnormal: dashboard.healthAbnormalTotal,
        psychAbnormal: dashboard.psychAbnormalTotal,
      },
    };
  }

  /**
   * 备用模板报告生成（AI不可用时使用）
   */
  private generateFallbackReport(dashboard: any, month: string): string {
    const highRiskShips = dashboard.shipCards.filter((s: any) => s.riskLevel === 'red' || s.riskLevel === 'yellow');
    const unsubmittedNames = dashboard.unsubmittedShipNames || [];

    let abnormalAnalysis = '';
    if (dashboard.healthAbnormalTotal > 0 || dashboard.psychAbnormalTotal > 0) {
      abnormalAnalysis = `本月共发现${dashboard.healthAbnormalTotal + dashboard.psychAbnormalTotal}名异常船员，其中生理异常${dashboard.healthAbnormalTotal}人，心理异常${dashboard.psychAbnormalTotal}人。`;
    } else {
      abnormalAnalysis = '本月未发现明显健康异常船员。';
    }

    let focusShipsText = '本月无重点关注船舶。';
    if (highRiskShips.length > 0) {
      const shipList = highRiskShips.map((s: any) => {
        const level = s.riskLevel === 'red' ? '高风险' : '一般风险';
        return `${s.shipName}（${level}，生理异常${s.healthAbnormalCount}人，心理异常${s.psychAbnormalCount}人）`;
      });
      focusShipsText = `共${highRiskShips.length}艘船舶需重点关注：\n${shipList.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
    }

    let suggestions = '无特殊管理建议。';
    if (dashboard.unsubmittedShips > 0) {
      suggestions = `1. 请尽快督促${unsubmittedNames.join('、')}提交健康排查表；\n`;
    }
    if (dashboard.healthAbnormalTotal > 0) {
      suggestions += `2. 建议对${dashboard.healthAbnormalTotal}名生理异常船员进行跟踪复查；\n`;
    }
    if (dashboard.psychAbnormalTotal > 0) {
      suggestions += `3. 建议对${dashboard.psychAbnormalTotal}名心理异常船员提供心理疏导支持；\n`;
    }

    let comparisonSection = '';
    if (dashboard.comparisonText) {
      comparisonSection = `\n## 六、环比分析\n${dashboard.comparisonText}\n`;
    }

    return [
      `# 月度船员健康分析报告（模板生成）`,
      `**报告月份：** ${month}`,
      `**生成时间：** ${new Date().toLocaleDateString('zh-CN')}`,
      '',
      '## 一、报送情况统计',
      `- 应报送船舶：${dashboard.totalShips}艘`,
      `- 正常提交：${dashboard.normalShips}艘`,
      `- 格式异常：${dashboard.abnormalShips}艘`,
      `- 未报送：${dashboard.unsubmittedShips}艘${unsubmittedNames.length > 0 ? '（' + unsubmittedNames.join('、') + '）' : ''}`,
      `- 报送完成率：${dashboard.submissionRate}%`,
      '',
      '## 二、健康数据汇总',
      `- 排查船员总数：${dashboard.totalCrew}人`,
      `- 生理异常：${dashboard.healthAbnormalTotal}人`,
      `- 心理异常：${dashboard.psychAbnormalTotal}人`,
      '',
      '## 三、异常分布分析',
      abnormalAnalysis,
      '',
      '## 四、重点关注船舶',
      focusShipsText,
      '',
      '## 五、管理建议',
      suggestions,
      comparisonSection,
    ].join('\n');
  }

  /**
   * 导出全船汇总总表（XLSX文件下载）
   */
  @Get('export-summary')
  @Roles('shore_crew_supervisor', 'admin')
  async exportSummary(
    @Request() req,
    @Query('month') month: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const teamCode = req.user.teamCode;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const data = await this.healthReportService.exportSummary(teamCode, currentMonth);

    // 生成XLSX文件
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 船舶名称
      { wch: 15 }, // 报送状态
      { wch: 10 }, // 排查人数
      { wch: 10 }, // 生理异常
      { wch: 10 }, // 心理异常
      { wch: 10 }, // 风险等级
    ];

    XLSX.utils.book_append_sheet(wb, ws, '全船汇总');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="健康排查汇总表_${currentMonth}.xlsx"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(Buffer.from(buffer));
  }

  /**
   * 导出异常人员清单（XLSX文件下载）
   */
  @Get('export-abnormal')
  @Roles('shore_crew_supervisor', 'admin')
  async exportAbnormal(
    @Request() req,
    @Query('month') month: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const teamCode = req.user.teamCode;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const data = await this.healthReportService.exportAbnormalCrew(teamCode, currentMonth);

    // 生成XLSX文件
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 船舶名称
      { wch: 15 }, // 船员姓名
      { wch: 15 }, // 异常类型
      { wch: 40 }, // 问题说明
      { wch: 10 }, // 风险等级
    ];

    XLSX.utils.book_append_sheet(wb, ws, '异常人员清单');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="健康排查异常人员_${currentMonth}.xlsx"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(Buffer.from(buffer));
  }

  /**
   * 催报提醒（单船 + WebSocket通知）
   */
  @Post('urge-submit')
  @Roles('shore_crew_supervisor', 'admin')
  async urgeSubmit(
    @Request() req,
    @Body('shipId') shipId: number,
    @Body('month') month: string,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    const result = await this.healthReportService.recordUrge(teamCode, shipId, userId, currentMonth);

    // 发送WebSocket通知
    this.notificationsGateway.sendToTeam(teamCode, {
      type: 'warning_triggered',
      title: '健康排查催报提醒',
      message: `请尽快提交${currentMonth}月健康排查表`,
      data: { shipId, month: currentMonth, type: 'health_report_urge' },
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  /**
   * 批量催报（所有未提交船舶 + WebSocket通知）
   */
  @Post('urge-batch')
  @Roles('shore_crew_supervisor', 'admin')
  async urgeBatch(
    @Request() req,
    @Body('month') month: string,
  ) {
    const teamCode = req.user.teamCode;
    const userId = req.user.userId;
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    const unsubmitted = await this.healthReportService.getUnsubmittedShips(teamCode, currentMonth);
    const results = [];

    for (const ship of unsubmitted) {
      try {
        await this.healthReportService.recordUrge(teamCode, ship.id, userId, currentMonth);
        results.push({ shipId: ship.id, shipName: ship.cnShipName, status: 'success' });
      } catch (e: any) {
        results.push({ shipId: ship.id, shipName: ship.cnShipName, status: 'failed', error: e.message });
      }
    }

    // 发送WebSocket通知
    if (unsubmitted.length > 0) {
      const shipNames = unsubmitted.map(s => s.cnShipName).join('、');
      this.notificationsGateway.sendToTeam(teamCode, {
        type: 'warning_triggered',
        title: '健康排查批量催报',
        message: `已向${unsubmitted.length}艘未提交船舶（${shipNames}）发送催报提醒`,
        data: { unsubmittedCount: unsubmitted.length, month: currentMonth, type: 'health_report_urge_batch' },
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      totalUrged: unsubmitted.length,
      results,
      message: unsubmitted.length > 0
        ? `已向${unsubmitted.length}艘船舶发送催报提醒`
        : '本月所有船舶均已提交',
    };
  }

  /**
   * 获取上月异常船员（连续性追踪）
   */
  @Get('prev-month-abnormal')
  @Roles('shore_crew_supervisor', 'admin')
  async getPrevMonthAbnormal(
    @Request() req,
    @Query('shipId') shipId: string,
    @Query('month') month: string,
  ) {
    const teamCode = req.user.teamCode;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    return this.healthReportService.getPrevMonthAbnormal(teamCode, parseInt(shipId), currentMonth);
  }
}
