import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

@Injectable()
export class ClientLogService {
  private readonly logger = new Logger(ClientLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取日志收集配置
   */
  async getConfig(teamCode: TeamCode) {
    return this.prisma.logCollectionConfig.findUnique({
      where: { teamCode },
    });
  }

  /**
   * 更新日志收集配置
   */
  async updateConfig(teamCode: TeamCode, data: {
    enabled?: boolean;
    collectErrors?: boolean;
    collectApiErrors?: boolean;
    collectPerformance?: boolean;
    collectUserActions?: boolean;
    uploadInterval?: number;
    maxBatchSize?: number;
    targetUserIds?: number[];
  }) {
    return this.prisma.logCollectionConfig.upsert({
      where: { teamCode },
      update: data,
      create: {
        teamCode,
        ...data,
      },
    });
  }

  /**
   * 批量上传客户端日志
   */
  async uploadLogs(teamCode: TeamCode, userId: number, logs: Array<{
    logType: string;
    level: string;
    message: string;
    details?: any;
    userAgent?: string;
    platform?: string;
    screenResolution?: string;
    networkType?: string;
    pageUrl?: string;
    pagePath?: string;
    clientTime: string;
  }>) {
    const created = await this.prisma.clientLog.createMany({
      data: logs.map(log => ({
        teamCode,
        userId,
        logType: log.logType,
        level: log.level,
        message: log.message,
        details: log.details,
        userAgent: log.userAgent,
        platform: log.platform,
        screenResolution: log.screenResolution,
        networkType: log.networkType,
        pageUrl: log.pageUrl,
        pagePath: log.pagePath,
        clientTime: new Date(log.clientTime),
      })),
    });

    this.logger.log(`收到 ${created.count} 条客户端日志`);

    // 自动触发AI分析（如果有未分析的日志）
    await this.triggerAIAnalysis(teamCode);

    return { count: created.count };
  }

  /**
   * 获取日志列表（管理员查看）
   */
  async getLogs(teamCode: TeamCode, params: {
    logType?: string;
    level?: string;
    analyzed?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { logType, level, analyzed, startDate, endDate, page = 1, pageSize = 20 } = params;

    const where: any = { teamCode };
    if (logType) where.logType = logType;
    if (level) where.level = level;
    if (analyzed !== undefined) where.analyzed = analyzed;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.clientLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          analysis: true,
        },
      }),
      this.prisma.clientLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 触发AI分析（分析未处理的日志）
   */
  async triggerAIAnalysis(teamCode: TeamCode) {
    // 获取未分析的日志（最多50条）
    const unanalyzedLogs = await this.prisma.clientLog.findMany({
      where: {
        teamCode,
        analyzed: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (unanalyzedLogs.length === 0) {
      return { analyzed: 0 };
    }

    // 按错误类型分组
    const errorGroups = new Map<string, typeof unanalyzedLogs>();
    for (const log of unanalyzedLogs) {
      const key = `${log.logType}_${log.level}`;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(log);
    }

    // 对每组进行AI分析
    let analyzedCount = 0;
    for (const [key, logs] of errorGroups.entries()) {
      try {
        const analysis = await this.analyzeErrorGroup(teamCode, logs);
        
        // 更新日志状态
        await this.prisma.clientLog.updateMany({
          where: {
            id: { in: logs.map(l => l.id) },
          },
          data: {
            analyzed: true,
            analysisId: analysis.id,
          },
        });

        analyzedCount += logs.length;
      } catch (error) {
        this.logger.error(`AI分析失败: ${error.message}`);
      }
    }

    return { analyzed: analyzedCount };
  }

  /**
   * AI分析错误组
   */
  private async analyzeErrorGroup(teamCode: TeamCode, logs: any[]) {
    // 构建AI分析提示
    const errorSample = logs[0];
    const prompt = this.buildAnalysisPrompt(logs);

    // TODO: 调用AI服务进行分析
    // 这里暂时使用简单的规则分析
    const analysis = await this.simpleRuleAnalysis(logs);

    // 保存分析结果
    return this.prisma.logAnalysis.create({
      data: {
        teamCode,
        logIds: logs.map(l => l.id),
        errorType: analysis.errorType,
        rootCause: analysis.rootCause,
        suggestion: analysis.suggestion,
        severity: analysis.severity,
        fixType: analysis.fixType,
        fixContent: analysis.fixContent,
      },
    });
  }

  /**
   * 构建AI分析提示
   */
  private buildAnalysisPrompt(logs: any[]): string {
    const sample = logs[0];
    return `
请分析以下客户端错误日志：

错误类型: ${sample.logType}
错误级别: ${sample.level}
错误消息: ${sample.message}
详细信息: ${JSON.stringify(sample.details, null, 2)}
页面URL: ${sample.pageUrl}
浏览器: ${sample.userAgent}
发生次数: ${logs.length}

请提供：
1. 错误类型分类
2. 根本原因分析
3. 修复建议
4. 严重级别评估（low/medium/high/critical）
    `.trim();
  }

  /**
   * 简单规则分析（临时方案）
   */
  private async simpleRuleAnalysis(logs: any[]) {
    const sample = logs[0];
    const message = sample.message.toLowerCase();

    let errorType = 'unknown';
    let severity = 'medium';
    let rootCause = '未知错误';
    let suggestion = '请检查错误日志详情';
    let fixType = 'user_guide';
    let fixContent: any = {};

    // 网络错误
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      errorType = 'network_error';
      severity = 'high';
      rootCause = '网络连接问题，可能是网络不稳定或服务器不可达';
      suggestion = '建议用户检查网络连接，或稍后重试';
      fixType = 'user_guide';
      fixContent = {
        title: '网络连接问题',
        steps: [
          '检查网络连接是否正常',
          '尝试刷新页面',
          '如果问题持续，请联系管理员',
        ],
      };
    }
    // API错误
    else if (message.includes('api') || message.includes('404') || message.includes('500')) {
      errorType = 'api_error';
      severity = message.includes('500') ? 'critical' : 'high';
      rootCause = 'API接口调用失败';
      suggestion = '检查后端服务状态和API接口';
      fixType = 'code_patch';
      fixContent = {
        title: 'API接口错误',
        description: '需要检查后端服务',
      };
    }
    // JavaScript错误
    else if (message.includes('undefined') || message.includes('null') || message.includes('typeerror')) {
      errorType = 'js_error';
      severity = 'medium';
      rootCause = 'JavaScript运行时错误，可能是数据类型问题';
      suggestion = '检查前端代码中的数据类型和空值处理';
      fixType = 'code_patch';
      fixContent = {
        title: 'JavaScript错误',
        description: '需要修复前端代码',
      };
    }
    // 权限错误
    else if (message.includes('permission') || message.includes('403') || message.includes('unauthorized')) {
      errorType = 'permission_error';
      severity = 'high';
      rootCause = '权限不足或认证失败';
      suggestion = '检查用户权限配置和Token有效性';
      fixType = 'config_change';
      fixContent = {
        title: '权限问题',
        description: '需要检查权限配置',
      };
    }

    return {
      errorType,
      severity,
      rootCause,
      suggestion,
      fixType,
      fixContent,
    };
  }

  /**
   * 获取AI分析结果列表
   */
  async getAnalyses(teamCode: TeamCode, params: {
    severity?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { severity, status, page = 1, pageSize = 20 } = params;

    const where: any = { teamCode };
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [analyses, total] = await Promise.all([
      this.prisma.logAnalysis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.logAnalysis.count({ where }),
    ]);

    return {
      data: analyses,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 创建修复包并下发
   */
  async createFixPackage(teamCode: TeamCode, data: {
    name: string;
    description?: string;
    analysisId?: number;
    fixType: string;
    fixContent: any;
    targetUserIds: number[];
    sentBy: number;
  }) {
    // 创建修复包
    const fixPackage = await this.prisma.fixPackage.create({
      data: {
        teamCode,
        name: data.name,
        description: data.description,
        analysisId: data.analysisId,
        fixType: data.fixType,
        fixContent: data.fixContent,
        targetUserIds: data.targetUserIds,
        sentBy: data.sentBy,
      },
    });

    // 创建接收记录
    await this.prisma.fixPackageReceipt.createMany({
      data: data.targetUserIds.map(userId => ({
        packageId: fixPackage.id,
        userId,
      })),
    });

    // 更新分析状态
    if (data.analysisId) {
      await this.prisma.logAnalysis.update({
        where: { id: data.analysisId },
        data: { status: 'fix_sent' },
      });
    }

    return fixPackage;
  }

  /**
   * 获取修复包列表
   */
  async getFixPackages(teamCode: TeamCode, page = 1, pageSize = 20) {
    const [packages, total] = await Promise.all([
      this.prisma.fixPackage.findMany({
        where: { teamCode },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.fixPackage.count({ where: { teamCode } }),
    ]);

    return {
      data: packages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 用户获取待接收的修复包
   */
  async getPendingFixPackages(teamCode: TeamCode, userId: number) {
    const receipts = await this.prisma.fixPackageReceipt.findMany({
      where: {
        userId,
        received: false,
      },
      include: {
        package: true,
      },
    });

    return receipts.map(r => r.package);
  }

  /**
   * 用户确认接收修复包
   */
  async confirmReceipt(packageId: number, userId: number) {
    const receipt = await this.prisma.fixPackageReceipt.findUnique({
      where: {
        packageId_userId: { packageId, userId },
      },
    });

    if (!receipt) {
      throw new NotFoundException('修复包接收记录不存在');
    }

    await this.prisma.fixPackageReceipt.update({
      where: { id: receipt.id },
      data: {
        received: true,
        receivedAt: new Date(),
      },
    });

    // 更新修复包的接收计数
    const receivedCount = await this.prisma.fixPackageReceipt.count({
      where: { packageId, received: true },
    });

    await this.prisma.fixPackage.update({
      where: { id: packageId },
      data: { receivedCount },
    });

    return { success: true };
  }

  /**
   * 用户确认应用修复包
   */
  async confirmApplied(packageId: number, userId: number, feedback?: string) {
    const receipt = await this.prisma.fixPackageReceipt.findUnique({
      where: {
        packageId_userId: { packageId, userId },
      },
    });

    if (!receipt) {
      throw new NotFoundException('修复包接收记录不存在');
    }

    await this.prisma.fixPackageReceipt.update({
      where: { id: receipt.id },
      data: {
        applied: true,
        appliedAt: new Date(),
        feedback,
      },
    });

    // 更新修复包的应用计数
    const appliedCount = await this.prisma.fixPackageReceipt.count({
      where: { packageId, applied: true },
    });

    await this.prisma.fixPackage.update({
      where: { id: packageId },
      data: { appliedCount },
    });

    return { success: true };
  }
}
