// ============================================================
// 政工笔 · 3 大维度 18 项 · 100 分制质量评分引擎
// Sprint 1: 18 项判分函数骨架（纯规则/简单NLP，无需再调大模型）
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { DeAiEngine, DeAiRuleScores } from './deai.engine';
import { FORBIDDEN_WORDS_LIST, POLITICAL_TERM_WHITELIST } from '../prompts/system-templates';
import type { GenerateManuscriptDto } from '../dto/generate-manuscript.dto';

export interface QualityBreakdown {
  contentIntegrity:  number; // 1-a 0-10
  numberDensity:     number; // 1-b 0-10
  themeCoherence:    number; // 1-c 0-10
  structureFitness:  number; // 1-d 0-10
  detailRichness:    number; // 1-e 0-10 (= 用户 detailsScore 映射)
  freeDirectiveDone: number; // 1-f 0-10 (= Yes/No/Partial 判定占位)
  contentTotal:      number; // 60 满分

  deAi:              number; // 2 维 25 满分
  compliance:        number; // 3 维 15 满分
    forbiddenHits:   number; // 3-a 0-6 (反向扣分后得分)
    politicalTermOK: number; // 3-b 0-5
    titleShipOK:     number; // 3-c 0-4

  total100:          number; // 0-100
  grade: 'S'|'A'|'B'|'C'|'D'|'E';
  gradeLabel: string;
  gradeColor: string;
  gradeAdvice: string;
  simAiDetectRate: number; // 0-100 %
  aiDetectRateLevel: string;
  aiDetectRateColor: string;
  aiDetectRateHint: string;
}

@Injectable()
export class QualityScoringEngine {
  private readonly logger = new Logger(QualityScoringEngine.name);

  constructor(private readonly deAi: DeAiEngine) {}

  /**
   * 对成品稿跑 100 分评分
   */
  async score(
    articleText: string,
    dto: GenerateManuscriptDto,
    userDetailsScore: number,
    deaiIntensity: number,
  ): Promise<QualityBreakdown> {
    const deai = await this.deAi.process(articleText, deaiIntensity);
    return this.scoreWithDeaiResult(articleText, dto, userDetailsScore, deai.ruleScores, deaiIntensity);
  }

  scoreWithDeaiResult(
    articleText: string,
    dto: GenerateManuscriptDto,
    userDetailsScore: number,
    rule: DeAiRuleScores,
    deaiIntensity: number,
  ): QualityBreakdown {
    const clean = articleText.replace(/<!--[\s\S]*?-->/g, '');
    const textLen = clean.length;
    const charPer1000 = Math.max(1, textLen / 1000);

    // ====== 维度 1：内容质量 60 ======
    // 1-a 事实要素完整度（10 分，按 Step2-4 字段齐全度扣）
    let integrity = 10;
    if (!dto.happenDate) integrity -= 2;
    if (!dto.location?.trim()) integrity -= 2;
    if (!dto.basic?.personList?.some(p => p.name || p.duty)) integrity -= 3;
    if (!dto.eventProcess || dto.eventProcess.length < 100) integrity -= 2;
    if (!dto.themeIdea || dto.themeIdea.length < 50) integrity -= 1;
    integrity = Math.max(0, integrity);

    // 1-b 数字密度（10 分：每千字 ≥3 具体数字 → 满分）
    const numMatches = clean.match(/\d+(\.\d+)?/g) || [];
    const numsPer1000 = numMatches.length / charPer1000;
    let numDensity = 10;
    if (numsPer1000 < 1) numDensity = 1;
    else if (numsPer1000 < 2) numDensity = 4;
    else if (numsPer1000 < 3) numDensity = 7;

    // 1-c 主题贴合度（10 分：关键词重合度）
    const themeKeywords = this.extractKeywords(dto.themeIdea + ' ' + dto.eventProcess, 10);
    let hit = 0;
    themeKeywords.forEach(kw => { if (clean.includes(kw)) hit++; });
    const themeCoherence = themeKeywords.length > 0
      ? Math.max(0, Math.min(10, Math.round(hit / themeKeywords.length * 10)))
      : 0;

    // 1-d 文种结构规范度（10 分：按文种 checklist 简化判）
    let structure = 6; // 基础分
    const paragraphs = clean.split(/\n\s*\n/).filter(p => p.trim());
    if (paragraphs.length >= 3) structure += 2;
    // 导语-主体-结尾三段比例差
    if (paragraphs.length >= 3) {
      const lens = paragraphs.map(p => p.length);
      const max = Math.max(...lens), min = Math.min(...lens);
      if (max <= min * 8) structure += 2;
    }
    structure = Math.min(10, structure);

    // 1-e 细节动作丰度（10 分：= 用户 Step5 雷达分 / 100 × 10）
    const detailRichness = Math.round(Math.max(0, Math.min(10, userDetailsScore / 10)));

    // 1-f 自由特别指令完成度（10 分：Sprint2 调微型 AI，Sprint1 按指令长度打分占位）
    const freeLen = dto.freeSpecialInstructions?.length || 0;
    let freeDone = 10;
    if (freeLen === 0) freeDone = 7; // 用户没写，不算错
    else if (freeLen < 50) freeDone = 8;
    else if (freeLen < 100) freeDone = 9;

    const contentTotal = integrity + numDensity + themeCoherence + structure + detailRichness + freeDone;

    // ====== 维度 2：去 AI 化 25 ======
    const deAi = rule.cappedScore; // 0-25

    // ====== 维度 3：合规 15 ======
    // 3-a 禁用词命中（满分 6，每命中 1 扣 1）
    let forbiddenHitsScore = 6;
    FORBIDDEN_WORDS_LIST.forEach(f => {
      if (clean.includes(f.word)) forbiddenHitsScore--;
    });
    forbiddenHitsScore = Math.max(0, forbiddenHitsScore);

    // 3-b 政治术语准确性（5 分：如果文中出现政工关键词做模糊匹配）
    let politicalScore = 5;
    const politRegexes: [RegExp, string][] = [
      [/三.*?会.*?一.*?课/, '三会一课'], [/两.*?学.*?一.*?做/, '两学一做'],
      [/第.*?一.*?议.*?题/, '第一议题'], [/主.*?题.*?党.*?日/, '主题党日']
    ];
    politRegexes.forEach(([regex, correct]) => {
      if (regex.test(clean) && !clean.includes(correct)) politicalScore -= 2;
    });
    politicalScore = Math.max(0, politicalScore);

    // 3-c 船舶称谓规范（4 分：禁止"某船/某某"这类模糊代称）
    let shipOK = 4;
    if (/\b某船\b/.test(clean)) shipOK -= 2;
    if (/某某|XX|XXX/.test(clean)) shipOK -= 2;
    shipOK = Math.max(0, shipOK);
    const compliance = forbiddenHitsScore + politicalScore + shipOK;

    // ====== 合计 100 ======
    const total100 = Math.min(100, contentTotal + deAi + compliance);

    // ====== 等级映射 ======
    const { grade, gradeLabel, gradeColor, gradeAdvice } = this.mapGrade(total100);

    // ====== AI 检测率 & 级别 ======
    const simAiDetectRate = rule.simAiDetectRatePercent;
    let aiDetectRateLevel: 'safe'|'good'|'warn'|'danger' = 'safe';
    let aiDetectRateColor = 'green';
    let aiDetectRateHint = '';
    if (simAiDetectRate <= 10) { aiDetectRateLevel = 'safe'; aiDetectRateColor = 'green'; aiDetectRateHint = '🟢 优秀 · 主流检测器几乎100%判为人类手写'; }
    else if (simAiDetectRate <= 15) { aiDetectRateLevel = 'good'; aiDetectRateColor = 'yellow'; aiDetectRateHint = '🟡 良好 · 绝大多数判为人类'; }
    else if (simAiDetectRate <= 25) { aiDetectRateLevel = 'warn'; aiDetectRateColor = 'orange'; aiDetectRateHint = '🟠 临界 · 建议一键加强去AI化'; }
    else { aiDetectRateLevel = 'danger'; aiDetectRateColor = 'red'; aiDetectRateHint = '🔴 危险 · 检测器大概率判AI'; }

    return {
      contentIntegrity: integrity, numberDensity: numDensity, themeCoherence, structureFitness: structure,
      detailRichness, freeDirectiveDone: freeDone, contentTotal,
      deAi,
      compliance, forbiddenHits: forbiddenHitsScore, politicalTermOK: politicalScore, titleShipOK: shipOK,
      total100, grade, gradeLabel, gradeColor, gradeAdvice,
      simAiDetectRate, aiDetectRateLevel, aiDetectRateColor, aiDetectRateHint,
    };
  }

  // ============================================================
  // 等级映射表（与前端常量保持一致）
  // ============================================================
  private mapGrade(total: number): Omit<QualityBreakdown, 'total100' | 'simAiDetectRate' | 'aiDetectRateLevel' | 'aiDetectRateColor' | 'aiDetectRateHint' | 'contentIntegrity'|'numberDensity'|'themeCoherence'|'structureFitness'|'detailRichness'|'freeDirectiveDone'|'contentTotal'|'deAi'|'compliance'|'forbiddenHits'|'politicalTermOK'|'titleShipOK'> {
    if (total >= 95) return { grade: 'S', gradeLabel: '卓越', gradeColor: 'purple',
      gradeAdvice: '集团年度优秀稿件征集 / 国家级水运期刊通过率≥70% / 中远海运报头版推荐' };
    if (total >= 90) return { grade: 'A', gradeLabel: '优秀', gradeColor: 'green',
      gradeAdvice: '中国远洋海运报普通版通过率≥85% / 公司内部刊物100%可用' };
    if (total >= 80) return { grade: 'B', gradeLabel: '良好', gradeColor: 'emerald',
      gradeAdvice: '船队/公司内部刊物100%可用 / 中远海运报普通版建议微调后投递' };
    if (total >= 70) return { grade: 'C', gradeLabel: '合格', gradeColor: 'yellow',
      gradeAdvice: '单船/党支部内部刊物100%可用 / 上报公司建议先润色' };
    if (total >= 60) return { grade: 'D', gradeLabel: '待改进', gradeColor: 'orange',
      gradeAdvice: '不建议直接报送 → 补字段 / AI 再润色 / 手动修改 5-8 处细节' };
    return { grade: 'E', gradeLabel: '不合格', gradeColor: 'red',
      gradeAdvice: '建议重新生成 → 检查：要素完整性 / 细节卡丰富度 / 自由指令是否写清楚' };
  }

  // ============================================================
  // 中文简易关键词抽取（去停用词 + 词频前 N 个）
  // Sprint 1 够用（Sprint 2 换成 jieba-ts 分词）
  // ============================================================
  private extractKeywords(text: string, topN = 10): string[] {
    if (!text) return [];
    const STOP = new Set(['的','了','在','是','我','有','和','就','不','人','都','一','一个','上','也','很','到','说','要','去','你','会','着','没有','看','好','自己','这','那','他','她','它','们','这个','那个','什么','怎么','但','但是','而且','因为','所以','如果','虽然','我们','你们','他们','可以','可能','已经']);
    const tokens = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    const freq = new Map<string, number>();
    tokens.forEach(t => {
      if (STOP.has(t)) return;
      freq.set(t, (freq.get(t) || 0) + 1);
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([w]) => w);
  }
}
