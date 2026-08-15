// ============================================================
// 政工笔 · 6 大规则自动去 AI 化引擎
// Sprint 1: 代码骨架 + 6 大特征打分函数实现（返回分数 + 模拟改写文本占位）
// Sprint 2: 逐条规则的真实文本改写函数
// ============================================================
import { Injectable, Logger } from '@nestjs/common';

export interface DeAiRuleScores {
  sentenceLengthStdDev: number;   // 2-a 0-5
  perplexityCoverage: number;     // 2-b 0-5
  transitionDensity: number;      // 2-c 0-5
  paragraphLengthStdDev: number;  // 2-d 0-5
  punctuationDiversity: number;   // 2-e 0-5
  numberColloquialRate: number;   // 2-f 0-5
  totalSubscore: number;          // 6 项合计 0-30
  cappedScore: number;            // ÷30×25 → 封顶 25（质量评分用）
  simAiDetectRatePercent: number; // 0-100 反向映射 → 模拟 AI 检测率
}

export interface DeAiOutput {
  rawText: string;                 // 输入原文
  outputText: string;              // 改写后的去 AI 化文本（Sprint2 真实改写，Sprint1 占位）
  ruleScores: DeAiRuleScores;
  appliedIntensityPercent: number; // 0-100
  appliedRules: string[];          // 实际执行了哪些改写动作
}

// 路标过渡词黑名单（规则 3 用）
const TRANSITION_BLACKLIST = [
  '首先', '其次', '再者', '此外', '与此同时', '值得一提的是',
  '综上所述', '由此可见', '不难看出', '毋庸置疑', '因此', '所以',
  '由此', '进而', '而且', '另外', '与此同时', '特别是'
];

@Injectable()
export class DeAiEngine {
  private readonly logger = new Logger(DeAiEngine.name);

  /**
   * 公开 API：按指定强度跑去 AI 化引擎
   * Sprint 1 返回打分 + 模拟改写文本（为了不依赖真实改写逻辑也能给前端看效果）
   */
  async process(articleText: string, intensityPercent: number): Promise<DeAiOutput> {
    const intensity = Math.max(0, Math.min(100, intensityPercent));
    const scores = this.compute6RuleScores(articleText);

    // Sprint 1 占位：outputText = 原文 + 末尾附加一行应用说明
    // Sprint 2 逐条规则真实改写
    const applied: string[] = [];
    const mapped = this.intensityToRuleParams(intensity);
    if (mapped.sentenceMergeSplitRate > 0) applied.push(`① 句长波动：拆合句子 ${(mapped.sentenceMergeSplitRate*100).toFixed(0)}% + ${mapped.minStandaloneSentences} 条独句段`);
    if (mapped.highFreqReplaceRate > 0)  applied.push(`② 高频词替换：${(mapped.highFreqReplaceRate*100).toFixed(0)}%`);
    if (mapped.transitionRemoveRate > 0) applied.push(`③ 路标过渡词删除：${(mapped.transitionRemoveRate*100).toFixed(0)}%`);
    if (mapped.paragraphSplitMerge > 0)  applied.push(`④ 段落打散：拆分 ${mapped.paragraphSplitMerge} + 合并 ${mapped.paragraphSplitMerge} + 拎句 ${mapped.extractSentence}`);
    if (mapped.punctuationDiversity > 0) applied.push(`⑤ 丰富标点：注入 ${mapped.punctuationDiversity} 种/共 ${mapped.punctuationDiversity*2} 处`);
    if (mapped.numberColloquialRate > 0) applied.push(`⑥ 数字口语化：${(mapped.numberColloquialRate*100).toFixed(0)}%`);

    let outputText = articleText;
    if (intensity > 0) {
      outputText += `\n\n<!-- 政工笔 DeAi v1.0 · 强度 ${intensity}% · 应用规则：${applied.join('；')} -->`;
    }
    return {
      rawText: articleText,
      outputText,
      ruleScores: scores,
      appliedIntensityPercent: intensity,
      appliedRules: applied,
    };
  }

  /**
   * 核心：计算 6 大规则特征分（Sprint 1 已完整实现真实 NLP 打分）
   * 每条 0-5 分 → 合计 0-30 → 封顶映射到 0-25 分（防完美）
   */
  compute6RuleScores(text: string): DeAiRuleScores {
    // 先清洗
    const clean = text.replace(/<!--[\s\S]*?-->/g, '');

    // ===== 2-a 句长波动 σ =====
    const sentences = clean.split(/[。！？!?\n]/).map(s => s.trim()).filter(Boolean);
    const senLens = sentences.map(s => s.length);
    const senStdDev = this.stdDev(senLens);
    const sentScore = senStdDev >= 12 ? 5 : senStdDev >= 8 ? 4 : senStdDev >= 5 ? 3 : senStdDev >= 2 ? 2 : 0;

    // ===== 2-b 用词突现率（近似：top100 高频词覆盖率）=====
    const tokens = clean.match(/[\u4e00-\u9fa5A-Za-z]+/g) || [];
    const freqMap = new Map<string, number>();
    tokens.forEach(t => freqMap.set(t, (freqMap.get(t) || 0) + 1));
    const sorted = Array.from(freqMap.values()).sort((a, b) => b - a);
    const top100Sum = sorted.slice(0, 100).reduce((a, b) => a + b, 0);
    const top100Coverage = tokens.length > 0 ? top100Sum / tokens.length : 1;
    // 覆盖率越低 → 分越高（越不像 AI）
    let perpScore = 5;
    if (top100Coverage > 0.93) perpScore = 0;
    else if (top100Coverage > 0.90) perpScore = 2;
    else if (top100Coverage > 0.85) perpScore = 3;
    else if (top100Coverage > 0.80) perpScore = 4;

    // ===== 2-c 过渡词密度 =====
    let transitionHits = 0;
    TRANSITION_BLACKLIST.forEach(w => {
      const reg = new RegExp(this.escapeRegExp(w), 'g');
      transitionHits += (clean.match(reg) || []).length;
    });
    const densityPer100 = tokens.length > 0 ? transitionHits * 100 / tokens.length : 0;
    let transScore = 5;
    if (densityPer100 > 1.5) transScore = 0;
    else if (densityPer100 > 1.0) transScore = 2;
    else if (densityPer100 > 0.6) transScore = 3;
    else if (densityPer100 > 0.3) transScore = 4;

    // ===== 2-d 段落长度 σ =====
    const paragraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const paraSentCounts = paragraphs.map(p => (p.match(/[。！？!?\n]/g) || []).length || 1);
    const paraStdDev = this.stdDev(paraSentCounts);
    const paraScore = paraStdDev >= 3 ? 5 : paraStdDev >= 2 ? 4 : paraStdDev >= 1.5 ? 3 : paraStdDev >= 1 ? 2 : 0;

    // ===== 2-e 标点多样性 =====
    const allPunc = clean.match(/[，。！？!?、；;：:"""''（）()《》【】\[\]…—\-~·/\\]/g) || [];
    const puncTypes = new Set(allPunc).size;
    // 扣掉"，。"这两种基本的，统计额外的种类数
    const extraTypes = Math.max(0, puncTypes - 2);
    let puncScore = 5;
    if (extraTypes === 0) puncScore = 0;
    else if (extraTypes === 1) puncScore = 2;
    else if (extraTypes === 2) puncScore = 3;
    else if (extraTypes <= 4) puncScore = 4;

    // ===== 2-f 数字口语化率 =====
    const preciseNums = (clean.match(/\d+(\.\d+)?[%个小时天人次年月℃度节箱吨节米海里节]/g) || []).length;
    const colloquialNums = (clean.match(/(近半|约莫|大约|小半|大半|半天|一天半|好几天|隔三差五|年过半百|三四十|五六十)/g) || []).length;
    const totalNums = preciseNums + colloquialNums;
    const colloqRate = totalNums > 0 ? colloquialNums / totalNums : 0;
    let numScore = 5;
    if (colloqRate === 0 && totalNums > 0) numScore = 0;
    else if (colloqRate < 0.1) numScore = 2;
    else if (colloqRate < 0.2) numScore = 3;
    else if (colloqRate < 0.3) numScore = 4;
    else if (totalNums === 0) numScore = 0;

    // ===== 合计 & 映射 =====
    const totalSubscore = sentScore + perpScore + transScore + paraScore + puncScore + numScore;
    const cappedScore = Math.round(Math.min(25, totalSubscore * 25 / 30));
    // 模拟 AI 检测率（反向公式 · 加 ±4% 浮动）
    const base = Math.max(0, Math.min(1, totalSubscore / 30));
    const detectBase = 100 - (base * 90 + 6);
    const simAiDetectRatePercent = Math.max(0, Math.min(100,
      Math.round(detectBase + (Math.random() * 8 - 4))
    ));

    return {
      sentenceLengthStdDev: sentScore,
      perplexityCoverage: perpScore,
      transitionDensity: transScore,
      paragraphLengthStdDev: paraScore,
      punctuationDiversity: puncScore,
      numberColloquialRate: numScore,
      totalSubscore,
      cappedScore,
      simAiDetectRatePercent,
    };
  }

  // 强度滑杆 0-100 → 6 条规则的具体执行参数（线性插值）
  intensityToRuleParams(intensity: number) {
    const p = intensity / 100;
    return {
      sentenceMergeSplitRate: this.lerp(0, 0.45, p),
      minStandaloneSentences:   Math.round(this.lerp(0, 4, p)),
      highFreqReplaceRate:      this.lerp(0, 0.10, p),
      transitionRemoveRate:     this.lerp(0, 0.85, p),
      paragraphSplitMerge:      Math.round(this.lerp(0, 3, p)),
      extractSentence:          Math.round(this.lerp(0, 3, p)),
      punctuationDiversity:     Math.round(this.lerp(0, 8, p)),
      numberColloquialRate:     this.lerp(0, 0.50, p),
    };
  }

  // ============================================================
  // 工具函数
  // ============================================================
  private stdDev(arr: number[]): number {
    if (arr.length === 0) return 0;
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((s, n) => s + Math.pow(n - m, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }
  private lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
  private escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
}
