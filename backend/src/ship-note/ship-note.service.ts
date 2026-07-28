import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShipNote } from '@prisma/client';

@Injectable()
export class ShipNoteService {
  private readonly logger = new Logger(ShipNoteService.name);
  private readonly API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly API_KEY = process.env.AI_API_KEY;
  private readonly ENDPOINT_ID = process.env.AI_ENDPOINT_ID;

  constructor(private prisma: PrismaService) {}

  async create(shipId: number, userId: number, content: string, source?: string, tags?: string[]): Promise<ShipNote> {
    return this.prisma.shipNote.create({
      data: {
        shipId,
        userId,
        content,
        source: source || 'manual',
        tags,
        teamCode: 'team2',
      },
    });
  }

  async findByShipId(
    shipId: number,
    options?: {
      keyword?: string;
      tag?: string;
      sortBy?: 'time' | 'star' | 'custom';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<ShipNote[]> {
    const where: any = { shipId, teamCode: 'team2' };

    if (options?.keyword) {
      where.content = {
        contains: options.keyword,
        mode: 'insensitive',
      };
    }

    if (options?.tag) {
      where.AND = [
        {
          tags: {
            arrayContains: [options.tag],
          },
        },
      ];
    }

    let orderBy: any[] = [];

    // 置顶永远在最前
    orderBy.push({ isPinned: 'desc' });

    if (options?.sortBy === 'star') {
      orderBy.push({ starLevel: 'desc' });
      orderBy.push({ createdAt: 'desc' });
    } else if (options?.sortBy === 'custom') {
      orderBy.push({ sortOrder: 'desc' });
      orderBy.push({ createdAt: 'desc' });
    } else {
      // 默认按时间
      orderBy.push({ createdAt: options?.sortOrder === 'asc' ? 'asc' : 'desc' });
    }

    return this.prisma.shipNote.findMany({
      where,
      orderBy,
    });
  }

  /**
   * 获取某船舶的所有标签
   */
  async getTagsByShipId(shipId: number): Promise<string[]> {
    const notes = await this.prisma.shipNote.findMany({
      where: { shipId, teamCode: 'team2' },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const note of notes) {
      if (note.tags && Array.isArray(note.tags)) {
        (note.tags as string[]).forEach(t => tagSet.add(t));
      }
    }
    return Array.from(tagSet).sort();
  }

  async findById(id: number): Promise<ShipNote | null> {
    return this.prisma.shipNote.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: {
    content?: string;
    tags?: string[];
    starLevel?: number;
    isPinned?: boolean;
    sortOrder?: number;
  }): Promise<ShipNote> {
    return this.prisma.shipNote.update({
      where: { id },
      data,
    });
  }

  /**
   * 设置置顶
   */
  async setPinned(id: number, isPinned: boolean): Promise<ShipNote> {
    // 如果设为置顶，给一个较大的 sortOrder
    const data: any = { isPinned };
    if (isPinned) {
      data.sortOrder = 9999;
    }
    return this.prisma.shipNote.update({
      where: { id },
      data,
    });
  }

  /**
   * 设置星级
   */
  async setStar(id: number, starLevel: number): Promise<ShipNote> {
    const level = Math.max(0, Math.min(5, starLevel));
    return this.prisma.shipNote.update({
      where: { id },
      data: { starLevel: level },
    });
  }

  /**
   * 移动排序（上移/下移/置顶/置底）
   */
  async moveOrder(id: number, direction: 'up' | 'down' | 'top' | 'bottom', shipId: number): Promise<ShipNote> {
    const current = await this.prisma.shipNote.findUnique({
      where: { id },
      select: { sortOrder: true, isPinned: true },
    });
    if (!current) throw new Error('笔记不存在');

    if (direction === 'top') {
      return this.prisma.shipNote.update({
        where: { id },
        data: { sortOrder: current.sortOrder + 1000, isPinned: true },
      });
    }
    if (direction === 'bottom') {
      return this.prisma.shipNote.update({
        where: { id },
        data: { sortOrder: -1000, isPinned: false },
      });
    }

    // 上下移动：调整 sortOrder（相邻交换）
    const step = direction === 'up' ? 1 : -1;
    const newOrder = current.sortOrder + step * 10;

    return this.prisma.shipNote.update({
      where: { id },
      data: { sortOrder: newOrder },
    });
  }

  async delete(id: number): Promise<ShipNote> {
    return this.prisma.shipNote.delete({
      where: { id },
    });
  }

  async getAll(): Promise<ShipNote[]> {
    return this.prisma.shipNote.findMany({
      where: { teamCode: 'team2' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * AI分析船舶笔记 - 整合多源数据
   */
  async analyzeShipNotes(shipId: number) {
    const ship = await this.prisma.ship.findUnique({ where: { id: shipId } });
    if (!ship) {
      return { success: false, message: '船舶不存在', analysis: null };
    }

    // 1. 获取船舶笔记（手动录入 + 日记关联）
    const notes = await this.prisma.shipNote.findMany({
      where: { shipId, teamCode: 'team2' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 2. 获取关联该船舶的日记（包含抵港、防海盗等信息）
    const diaries = await this.prisma.diary.findMany({
      where: { shipId, teamCode: 'team2' },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        date: true,
        content: true,
        departurePort: true,
        arrivalPort: true,
        pirateStatus: true,
        pirateTime: true,
        shipPosition: true,
        dynamicStatus: true,
        weather: true,
        seaCondition: true,
      },
    });

    // 3. 获取人员派任历史（换员信息）
    const staffAssignments = await this.prisma.staffAssignment.findMany({
      where: { shipId },
      orderBy: { startDate: 'desc' },
      take: 20,
      select: { userId: true, startDate: true, endDate: true, status: true, remark: true },
    });

    // 4. 获取到港检查任务记录
    const portCallTasks = await this.prisma.shipTaskStatus.findMany({
      where: { shipId, templateType: { in: ['port_call_check', 'ship_dynamic'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { status: true, progress: true, submittedAt: true, triggerDate: true },
    });

    // 检查是否有数据
    const hasData = notes.length > 0 || diaries.length > 0 || staffAssignments.length > 0;
    if (!hasData) {
      return { success: false, message: '暂无数据，无法分析', analysis: null };
    }

    // 构建综合信息文本
    const shipName = ship.cnShipName || '该船舶';
    let infoText = `===== ${shipName} 综合信息分析 =====\n\n`;

    // 船舶基本动态
    infoText += `【船舶当前状态】\n`;
    infoText += `船名：${ship.cnShipName}\n`;
    infoText += `当前航次：${ship.currentVoyage || '未知'}\n`;
    infoText += `当前位置：${ship.currentLocation || '未知'}\n`;
    infoText += `目的港：${ship.etaPort || '未知'}\n`;
    infoText += `ETA：${ship.eta ? this.formatDate(ship.eta) : '未知'}\n`;
    infoText += `ETD：${ship.etd ? this.formatDate(ship.etd) : '未知'}\n\n`;

    // 交流记录
    if (notes.length > 0) {
      infoText += `【交流记录与笔记】（共${notes.length}条）\n`;
      for (const note of notes) {
        const time = note.createdAt.toISOString().replace('T', ' ').substring(0, 16);
        const sourceLabel = note.source === 'diary' ? '[日记关联]' : note.source === 'manual' ? '[手动录入]' : `[${note.source || '其他'}]`;
        infoText += `[${time}]${sourceLabel} ${note.content}\n`;
      }
      infoText += '\n';
    }

    // 日记中的关键信息（抵港、防海盗等）
    if (diaries.length > 0) {
      infoText += `【日记记录】（共${diaries.length}条关联日记）\n`;
      for (const d of diaries) {
        const dateStr = d.date.toISOString().substring(0, 10);
        infoText += `[${dateStr}]`;
        if (d.departurePort) infoText += ` 出发港:${d.departurePort}`;
        if (d.arrivalPort) infoText += ` 到达港:${d.arrivalPort}`;
        if (d.pirateStatus) infoText += ` 防海盗:${d.pirateStatus}`;
        if (d.pirateTime) infoText += `(${d.pirateTime})`;
        if (d.shipPosition) infoText += ` 船位:${d.shipPosition}`;
        if (d.dynamicStatus) infoText += ` 动态:${d.dynamicStatus}`;
        infoText += '\n';
        if (d.content) {
          // 日记内容截取前200字
          infoText += `  内容摘要: ${d.content.substring(0, 200)}${d.content.length > 200 ? '...' : ''}\n`;
        }
      }
      infoText += '\n';
    }

    // 换员历史
    if (staffAssignments.length > 0) {
      infoText += `【人员派任/换员历史】（共${staffAssignments.length}条）\n`;
      for (const s of staffAssignments) {
        const start = s.startDate ? s.startDate.toISOString().substring(0, 10) : '未知';
        const end = s.endDate ? s.endDate.toISOString().substring(0, 10) : '至今';
        infoText += `  ${start} ~ ${end} | 状态:${s.status}`;
        if (s.remark) infoText += ` | 备注:${s.remark}`;
        infoText += '\n';
      }
      infoText += '\n';
    }

    // 到港检查记录
    if (portCallTasks.length > 0) {
      infoText += `【到港检查记录】（共${portCallTasks.length}条）\n`;
      for (const t of portCallTasks) {
        const time = t.submittedAt || t.triggerDate;
        infoText += `  ${time ? time.toISOString().substring(0, 10) : '未确定'} | 状态:${t.status} | 进度:${Math.round(t.progress)}%`;
        infoText += '\n';
      }
      infoText += '\n';
    }

    const analysis = await this.callAI(infoText, shipName);
    return {
      success: true,
      message: '分析完成',
      analysis,
    };
  }

  private formatDate(d: Date): string {
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private async callAI(infoText: string, shipName: string): Promise<string> {
    if (!this.API_KEY || !this.ENDPOINT_ID) {
      throw new ServiceUnavailableException('AI服务未配置');
    }

    const messages = [
      {
        role: 'system',
        content: `你是一位专业的船舶管理AI助手。你的任务是根据提供的船舶多源综合信息（交流记录、日记、换员历史、到港检查等），生成一份结构清晰的分析报告。

要求：
1. 使用HTML格式输出，包含<h4>标题、<p>段落、<strong>加粗、<ul><li>列表等标签
2. 分析以下方面：
   - 船舶当前动态与航次情况
   - 历史抵港信息梳理（哪些港口、什么时间）
   - 换员/人员变动情况
   - 防海盗安全状态
   - 交流记录中的关键事项和问题
3. 提取待办事项和工作建议
4. 如果数据不足，指出哪些信息需要补充
5. 报告长度控制在500-800字`,
      },
      {
        role: 'user',
        content: `请根据以下${shipName}的综合信息，生成一份全面的分析报告：

${infoText}

请用HTML格式输出报告，包含以下结构：
1. <h4>船舶动态概览</h4> - 当前航次、位置、ETA/ETD等
2. <h4>历史抵港记录</h4> - 梳理日记中记录的到港信息
3. <h4>人员变动</h4> - 换员历史摘要
4. <h4>安全与防海盗</h4> - 防海盗状态分析
5. <h4>关键事项与待办</h4> - 从交流记录和日记中提取
6. <h4>工作建议</h4> - AI给出的管理建议

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
          max_tokens: 1000,
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
