import { Injectable, Logger } from '@nestjs/common';
import { DiaryBlockType, TeamCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 基于关键词规则的 AI 分类服务
 * - 判断块类型（待办/备忘/日记）
 * - 从文本中识别关联的船名
 * - 根据用户修改历史调整关键词权重
 */
@Injectable()
export class BlockClassifierService {
  private readonly logger = new Logger(BlockClassifierService.name);

  constructor(private prisma: PrismaService) {}

  // 待办关键词（命中即建议 todo 类型），权重初始为 1.0，会根据用户纠正日志动态调整
  private todoKeywords: Record<string, number> = {
    需要: 2.0, '必须': 1.5, '记得': 1.8, '跟进': 2.0, '处理': 1.5,
    完成: 1.5, '待办': 3.0, 'todo': 3.0, '任务': 2.0, '安排': 1.5,
    准备: 1.2, '送': 1.5, '制作': 1.5, '提交': 1.5, '上报': 1.5,
    办理: 1.5, '检查': 1.2, '通知': 1.2, '联系': 1.2, '沟通': 1.2,
    '按时': 1.2, '尽快': 1.8, '今天': 1.2, '明天': 1.2,
  };

  // 备忘关键词（命中即建议 memo 类型）
  private memoKeywords: Record<string, number> = {
    提醒: 3.0, '备忘': 3.0, '注意': 2.0, '切记': 2.0, '别忘了': 2.5,
    记得带: 2.0, '记住': 2.0, '警告': 2.0, '注意事项': 2.0,
  };

  // 日记关键词（命中即建议 diary 类型）
  private diaryKeywords: Record<string, number> = {
    会议: 1.8, '讨论': 1.5, '汇报': 1.5, '到达': 1.8, '离港': 2.5,
    靠泊: 2.5, '开航': 2.5, '完成了': 1.8, '进行了': 1.5, '开展': 1.5,
    今天: 1.0, '上午': 1.0, '下午': 1.0, '晚上': 1.0, '会议纪要': 2.0,
    检查了: 1.5, '培训': 1.5, '演练': 1.5, '巡视': 1.5, '巡查': 1.5,
  };

  /**
   * 定期根据用户修改历史重新训练关键词权重
   */
  async retrainWeights(userId: number, teamCode: TeamCode) {
    try {
      const logs = await this.prisma.diaryBlockClassificationLog.findMany({
        where: { userId, teamCode },
        take: 500,
        orderBy: { createdAt: 'desc' },
      });

      if (logs.length < 10) return; // 样本太少，不训练

      // 重置权重为默认
      this.logger.log(`重新训练关键词权重：${logs.length} 条历史记录`);
      for (const log of logs) {
        const tokens = this.tokenize(log.content);
        const correctType = log.userCorrected;
        const wrongType = log.aiSuggested;
        if (correctType === wrongType) continue;

        tokens.forEach(tok => {
          // 正确类型：关键词加权
          if (correctType === DiaryBlockType.todo && this.todoKeywords[tok] !== undefined) {
            this.todoKeywords[tok] = (this.todoKeywords[tok] || 1.0) * 1.1;
          }
          if (correctType === DiaryBlockType.memo && this.memoKeywords[tok] !== undefined) {
            this.memoKeywords[tok] = (this.memoKeywords[tok] || 1.0) * 1.1;
          }
          if (correctType === DiaryBlockType.diary && this.diaryKeywords[tok] !== undefined) {
            this.diaryKeywords[tok] = (this.diaryKeywords[tok] || 1.0) * 1.1;
          }
          // 错误类型：关键词降权
          if (wrongType === DiaryBlockType.todo && this.todoKeywords[tok] !== undefined) {
            this.todoKeywords[tok] = (this.todoKeywords[tok] || 1.0) * 0.9;
          }
          if (wrongType === DiaryBlockType.memo && this.memoKeywords[tok] !== undefined) {
            this.memoKeywords[tok] = (this.memoKeywords[tok] || 1.0) * 0.9;
          }
          if (wrongType === DiaryBlockType.diary && this.diaryKeywords[tok] !== undefined) {
            this.diaryKeywords[tok] = (this.diaryKeywords[tok] || 1.0) * 0.9;
          }
        });
      }
    } catch (e) {
      this.logger.warn('权重重新训练失败：', e.message || e);
    }
  }

  /**
   * 对文本内容进行类型分类
   */
  classifyType(content: string): {
    suggested: DiaryBlockType;
    todoScore: number;
    memoScore: number;
    diaryScore: number;
  } {
    const text = content || '';
    const tokens = this.tokenize(text);

    let todoScore = 0;
    let memoScore = 0;
    let diaryScore = 0;

    for (const tok of tokens) {
      if (this.todoKeywords[tok]) todoScore += this.todoKeywords[tok];
      if (this.memoKeywords[tok]) memoScore += this.memoKeywords[tok];
      if (this.diaryKeywords[tok]) diaryScore += this.diaryKeywords[tok];
    }

    // 额外启发式：以问号结尾 -> memo（备忘提醒）
    if (/[?？]$/.test(text.trim())) memoScore += 1.0;

    // 额外启发式：含"要"+动词 结构 -> todo
    if (/(要|应|需|须)[\u4e00-\u9fa5]{0,3}(做|搞|写|发|报|办|弄|交)/.test(text)) todoScore += 1.5;

    // 额外启发式：描述过去完成的事（含"了"结尾或"已"开头）-> diary
    if (/(了[。，,!！]?$)|(^已)|(今日|今天).{0,10}完成/.test(text)) diaryScore += 1.2;

    // 额外启发式：todoStatus = completed 的块，如果内容是描述性的就还是保持 diary
    let suggested: DiaryBlockType = DiaryBlockType.diary;
    const max = Math.max(todoScore, memoScore, diaryScore);
    if (max < 0.8) {
      suggested = DiaryBlockType.diary; // 分数低，默认日记
    } else if (todoScore === max) {
      suggested = DiaryBlockType.todo;
    } else if (memoScore === max) {
      suggested = DiaryBlockType.memo;
    } else {
      suggested = DiaryBlockType.diary;
    }

    return { suggested, todoScore, memoScore, diaryScore };
  }

  /**
   * 从内容中识别关联的船舶名称
   * 匹配团队内的船舶名（全称或简称），返回最匹配的船舶
   */
  async detectShip(content: string, teamCode: TeamCode): Promise<{ id: number; name: string } | null> {
    try {
      if (!content || !content.trim()) return null;
      const ships = await this.prisma.ship.findMany({
        where: { teamCode },
        select: { id: true, cnShipName: true, enShipName: true },
      });
      let bestMatch: { id: number; name: string; score: number } | null = null;
      for (const s of ships) {
        let score = 0;
        if (s.cnShipName && content.includes(s.cnShipName)) score += 10;
        if (s.enShipName && content.includes(s.enShipName)) score += 8;
        if (String(s.id) && content.includes(String(s.id))) score += 5;
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: s.id, name: s.cnShipName, score };
        }
      }
      return bestMatch ? { id: bestMatch.id, name: bestMatch.name } : null;
    } catch (e) {
      this.logger.warn('船舶识别失败：', e.message || e);
      return null;
    }
  }

  /**
   * 简单分词：拆成字符级 bigram（中文轻量方案，不依赖分词库）+ 关键词精确匹配
   */
  private tokenize(text: string): string[] {
    const result: string[] = [];
    // 1. 精确匹配所有已知关键词（最长优先）
    const allKeywords = new Set([
      ...Object.keys(this.todoKeywords),
      ...Object.keys(this.memoKeywords),
      ...Object.keys(this.diaryKeywords),
    ]).keys();
    const kwList = Array.from(allKeywords).sort((a, b) => b.length - a.length);
    let remaining = text;
    for (const kw of kwList) {
      if (remaining.includes(kw)) {
        result.push(kw);
        remaining = remaining.split(kw).join('');
      }
    }
    return result;
  }
}
