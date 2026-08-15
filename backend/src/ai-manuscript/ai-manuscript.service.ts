// ============================================================
// 政工笔 · AI 写作系统 - 核心 Service
// Sprint 1 实现：Prompt 5+1 层拼接 + RAG(tsvector 占位) + 去 AI 化引擎 + 100 分评分
// Sprint 2 接入：真实豆包大模型调用 + 文件抽取打标签队列 + 历史稿件库
// ============================================================
import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateManuscriptDto, ScoreOnlyDto, DetailCardDto } from './dto/generate-manuscript.dto';
import { UserPayload } from '../auth/user.decorator';
import { DeAiEngine, DeAiOutput } from './engines/deai.engine';
import { QualityScoringEngine, QualityBreakdown } from './engines/quality-scoring.engine';
import {
  PROMPT_LAYER0_FACT_CAGE,
  PROMPT_LAYER1_SYSTEM_IRON_LAW,
  WRITER_STYLE_PARAMS,
  POLITICAL_TERM_WHITELIST,
  FORBIDDEN_WORDS_LIST
} from './prompts/system-templates';

@Injectable()
export class AiManuscriptService {
  private readonly logger = new Logger(AiManuscriptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deAiEngine: DeAiEngine,
    private readonly scoringEngine: QualityScoringEngine,
  ) {}

  /**
   * 【核心】生成稿件全流程：
   *  1. 校验字段 → 缺要素给提示
   *  2. 拼接 5+1 层 Prompt
   *  3. 调大模型生成（Sprint 1：占位 mock；Sprint 2 调豆包 API）
   *  4. 跑 DeAiEngine 6 规则去 AI 化
   *  5. 跑 QualityScoringEngine 100 分评分
   *  6. 返回：最终稿 + 评分卡 + AI 检测率
   */
  async generate(dto: GenerateManuscriptDto, user: UserPayload, teamCode: string) {
    // Step A: 计算 Step 5 细节雷达总分（用前端同规则）→ 给防杜撰引擎做参数
    const userDetailsScore = this.computeUserDetailsScore(dto.detailCards);
    const missingHints = this.suggestMissing(dto, userDetailsScore);

    // Step B: 拼接 5+1 层完整 Prompt
    const fullPrompt = this.buildFullPrompt(dto, userDetailsScore, missingHints);

    // Step C: (Sprint 2) 真正调用豆包大模型 → Sprint 1 用用户数据拼一篇 demo 文，让前端能跑通
    const mockArticle = this.buildMockArticle(dto);

    // Step D: 去 AI 化引擎
    const deaiOutput: DeAiOutput = await this.deAiEngine.process(mockArticle, dto.preference.deaiStrength);

    // Step E: 100 分质量评分
    const qualityBreakdown: QualityBreakdown = await this.scoringEngine.score(
      deaiOutput.outputText, dto, userDetailsScore, dto.preference.deaiStrength
    );

    // Step F: 返回
    return {
      requestId: `zgb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.userId,
      teamCode,
      promptTextSnippet: fullPrompt.slice(0, 500) + '…',
      finalArticle: deaiOutput.outputText,
      deaiAppliedRules: deaiOutput.appliedRules,
      deaiIntensity: deaiOutput.appliedIntensityPercent,
      deaiRuleScores: deaiOutput.ruleScores,
      score: qualityBreakdown,
      missingFactsHints: missingHints,
      sprintInfo: 'Sprint 1 MVP：此处返回 mock 文章；Sprint 2 接入豆包大模型真实生成调用。',
    };
  }

  async runDeAiEngine(text: string, strength: number) {
    return this.deAiEngine.process(text, strength);
  }

  async runQualityScoring(text: string, strength: number) {
    // 没有 dto 时，构造一个最小 dto（Step 5 细节分给 70 中值，其它按默认）
    const mockDto: any = {
      happenDate: '2026-08-15', location: '未知', personList: [{ name: '未知' }],
      eventProcess: '（无）', themeIdea: '（无）',
      detailCards: [], freeSpecialInstructions: '',
      preference: { wordCount: text.length, taboos: [] }
    };
    return this.scoringEngine.score(text, mockDto, 70, strength);
  }

  // ============================================================
  // 5+1 层 Prompt 拼接（核心逻辑）
  // ============================================================
  buildFullPrompt(dto: GenerateManuscriptDto, detailsScore: number, missingHints: string[]) {
    const writer = WRITER_STYLE_PARAMS[dto.writerStyleId in WRITER_STYLE_PARAMS ? dto.writerStyleId : 'none'];
    const parts: string[] = [];

    // Layer 0 事实铁笼（最高优先级！必须最开头）
    parts.push(PROMPT_LAYER0_FACT_CAGE(dto.detailCards.length, missingHints));

    // Layer 1 风格铁律
    parts.push(PROMPT_LAYER1_SYSTEM_IRON_LAW);

    // Layer 2 RAG（Sprint 2 替换为 tsvector 真实检索 Top-3）
    parts.push(`================================================================
【🎯 政工笔系统 · Layer 2 📚 三层范文库 RAG 检索 Top-3】
（Sprint 2 实现：PostgreSQL tsvector 全文检索 → 按文种 + 主题取最相似 3 篇结构摘要）
  • Top-1：《2024年度集团先进事迹合集 · 老轨李XX抢修主机》（结构：导语→抢修动作链→西瓜慰问细节→结尾意义）
  • Top-2：《中远海运政工简报 2024.07》P.13 党员先锋岗（结构：基本情况→主要做法 3 点→下一步）
  • Top-3：《中国远洋海运报》2024-06-18 头版《高温下的值乘》（高频词：机舱/48℃/吊缸/冰西瓜/老师傅）
请参考上述 Top-3 的段落结构与高频词汇（不要抄原文内容）。`);

    // Layer 3 文种 + 作家风格
    parts.push(`================================================================
【🎯 政工笔系统 · Layer 3 ✍️ 文种 + 文学风格调味】
• 目标文种：${this.mapCategoryName(dto.categoryId)}（≈ ${dto.preference.wordCount} 字）
• 对标刊物：${dto.preference.journalId}（Sprint 2 注入字数区间硬限制）
• 文学风格：${writer.name}
  → 写作指令：${writer.writingInstructions}
  → 风格关键词：${writer.styleKeywords.join(' / ')}
  → 禁区（避免）：${writer.forbiddenTones.join(' / ')}`);

    // Layer 4 用户偏好
    parts.push(`================================================================
【🎯 政工笔系统 · Layer 4 🎚️ 用户写作偏好】
• 语气：${dto.preference.tone}；人称：${dto.preference.person}；结尾方式：${dto.preference.ending}
• 小标题：${dto.preference.withSubtitles ? '需要（一、二、三…格式）' : '不需要'}
• 禁忌开关：${dto.preference.taboos.join(' / ')}
• 用户目标字数：必须严格控制在 ±10% 范围（${Math.round(dto.preference.wordCount*0.9)} ~ ${Math.round(dto.preference.wordCount*1.1)} 字）`);

    // Layer 5 用户自由特别指令
    parts.push(`================================================================
【🎯 政工笔系统 · Layer 5 🎭 用户自由特别指令（最高优先级执行）】
${dto.freeSpecialInstructions?.trim() ? dto.freeSpecialInstructions : '（用户未填写）'}`);

    // 结构化事实 & 细节卡列表
    parts.push(`================================================================
【🎯 用户结构化事实（Step 1-4）】
• 日期：${dto.happenDate}
• 地点：${dto.location || '（未填写！用（此处细节略）占位）'}
• 涉及人物：
${dto.basic.personList.map((p,i) => `  ${i+1}. ${p.name || '（未填姓名）'} ${p.duty ? `（${p.duty}）` : ''} ${p.shipName ? ` - ${p.shipName}`: ''} ${p.dept ? ` / ${p.dept}` : ''}`).join('\n')}
• 事件过程：${dto.eventProcess || '（未填写 ❌）'}
• 主题思想：${dto.themeIdea || '（未填写 ❌）'}

================================================================
【🎯 细节卡列表（按用户拖拽顺序 = 文中时间顺序，只能使用这里的事实！）】
${dto.detailCards.length === 0 ? '（无！⛔ 严格遵守 Layer 0，严禁杜撰任何细节！）' :
  dto.detailCards.map((c,i) => `📋 N${i+1} [${this.mapCardTypeLabel(c.type)}] 「${c.text || '（空卡 ❌ 忽略）'}」`).join('\n')}

================================================================
${this.forbiddenAndTermListPrompt()}
请严格遵守以上所有规则，直接输出标题+副标题+正文，不含任何规则解释、Prompt 复述、meta 说明。`);

    return parts.join('\n').replace(/\{DETAILS_SCORE_PLACEHOLDER\}/g, String(detailsScore));
  }

  // ============================================================
  // 范文库 CRUD（Sprint 1：最小实现，Sprint 2 补 tsvector 检索 + 权限校验）
  // ============================================================
  async listTemplates(teamCode: string, userId: number, scope: 'all' | 'global' | 'personal', category?: string, topic?: string) {
    const where: any = { teamCode };
    if (scope === 'global') where.ownerUserId = null;
    else if (scope === 'personal') where.ownerUserId = userId;
    else where.OR = [{ ownerUserId: null }, { ownerUserId: userId }];
    if (category) where.tags = { some: { tagCategory: 'category', tagName: category } };
    if (topic) where.tags = { some: { tagCategory: 'topic', tagName: topic } };

    return this.prisma.manuscriptTemplate.findMany({
      where, take: 50, orderBy: { createdAt: 'desc' },
      include: { tags: true }
    });
  }

  async getTemplate(id: number, teamCode: string, userId: number) {
    const t = await this.prisma.manuscriptTemplate.findUnique({
      where: { id }, include: { tags: true }
    });
    if (!t) throw new NotFoundException('范文不存在');
    if (t.teamCode !== teamCode) throw new ForbiddenException('跨团队无权限');
    if (t.ownerUserId != null && t.ownerUserId !== userId) throw new ForbiddenException('仅本人可查看');
    return t;
  }

  async patchTemplateTags(id: number, tags: Array<{tagName: string; tagCategory: string}>, teamCode: string, userId: number, roles: string[]) {
    const t = await this.getTemplate(id, teamCode, userId);
    const isAdmin = roles?.includes('admin') || roles?.includes('system-admin');
    if (t.ownerUserId == null && !isAdmin) throw new ForbiddenException('仅管理员可编辑全局标签');
    // 先清空旧 tag，再重建（简化实现）
    await this.prisma.$transaction([
      this.prisma.manuscriptTemplateTag.deleteMany({ where: { templateId: id } }),
      ...tags.map(tag => this.prisma.manuscriptTemplateTag.create({
        data: { templateId: id, teamCode, tagName: tag.tagName, tagCategory: tag.tagCategory }
      }))
    ]);
    return { ok: true, updated: id, tags };
  }

  async deleteTemplate(id: number, teamCode: string, userId: number, roles: string[]) {
    const t = await this.getTemplate(id, teamCode, userId);
    const isAdmin = roles?.includes('admin') || roles?.includes('system-admin');
    if (t.ownerUserId == null && !isAdmin) throw new ForbiddenException('仅管理员可删除全局范文');
    if (t.ownerUserId != null && t.ownerUserId !== userId) throw new ForbiddenException('仅本人可删除');
    await this.prisma.$transaction([
      this.prisma.manuscriptTemplateTag.deleteMany({ where: { templateId: id } }),
      this.prisma.manuscriptTemplate.delete({ where: { id } })
    ]);
    return { ok: true, deleted: id };
  }

  // ============================================================
  // 工具函数
  // ============================================================
  private computeUserDetailsScore(cards: DetailCardDto[]): number {
    const bodyPart = /(手|脚|指|掌|肩|背|腰|额|头|眼|嘴|臂|腿)/;
    const verb = /(扶|握|抓|捏|攥|蹭|擦|拧|抬|敲|拍|递|靠|闭|低|挪|咬|竖)/;
    const has = (regex: RegExp, types: string[]) => cards.filter(c => types.includes(c.type) || regex.test(c.text || '')).length;

    const a = Math.min(20, has(bodyPart, ['action']) * 5);
    const b = Math.min(15, cards.filter(c=>/(对话|dialog|""|「」|:：)/.test(c.type + (c.text||''))).length * 5);
    const c = Math.min(15, cards.filter(c=>/(环境|env|℃|风|浪|机舱|甲板|码头)/.test(c.type + (c.text||''))).length * 5);
    const d = Math.min(10, cards.filter(c=>/(五感|senses|闻|听|摸|尝|味|响|烫|凉)/.test(c.type + (c.text||''))).length * 4);
    const e = Math.min(20, cards.filter(c=>/(数字|number|\d)/.test(c.type + (c.text||''))).length * 5);
    const f = Math.min(20, cards.filter(c=>/(情绪|emotion|偷偷|悄悄|鼻子一酸|欲言又止|没说话)/.test(c.type + (c.text||''))).length * 5);
    return Math.min(100, a + b + c + d + e + f);
  }

  private suggestMissing(dto: GenerateManuscriptDto, score: number): string[] {
    const tips: string[] = [];
    if (!dto.location) tips.push('地点（哪个船/哪个舱/哪个航段）未填写，请补充');
    if (dto.basic.personList.every(p => !(p.name||p.duty))) tips.push('核心人物姓名+职务至少填一个');
    if (score < 60) {
      tips.push('建议再加 2 条【动作细节】（谁+身体部位+具体动词）');
      tips.push('建议再加 1 条【人物对话】（哪怕一句大白话）');
      tips.push('建议再加 1 条【五感细节】（闻到什么/摸到什么/听到什么）');
    }
    return tips;
  }

  private mapCategoryName(id: string) {
    return ({ advanced_deed: '🏅 先进事迹/人物稿', political_briefing: '📢 政工简报/党建动态', ship_news: '🚢 船舶通讯/新闻报道', meeting_minutes: '📝 会议纪要', work_summary: '📊 工作总结/述职报告' } as any)[id] || id;
  }
  private mapCardTypeLabel(type: string) {
    return ({ action: '🤸动作', dialog: '💬对话', env: '🌤️环境', senses: '🔊五感', number: '🔢数字', emotion: '🎭情绪心理', free: '✏️自由' } as any)[type] || type;
  }

  private forbiddenAndTermListPrompt() {
    return `【附录 · 字典 A：禁用词黑名单】（命中任意一条直接不合格，必须替换）
${FORBIDDEN_WORDS_LIST.map(f => `  · ${f.word}（${f.category==='slogan'?'口号类':f.category==='internet'?'网络热词':'夸张形容词'}）`).join('\n')}

【附录 · 字典 B：政治术语标准写法白名单】（必须按此写，禁止写错字）
  · ${POLITICAL_TERM_WHITELIST.slice(0, 20).join(' / ')}
  · 其余见政工笔白名单字典（系统内置）`;
  }

  /**
   * Sprint 1 占位：根据表单拼一篇 demo 成品稿（让前端 UI 能真实跑通）
   * Sprint 2 删除此函数，改为 fetch(AI_API_URL) 调用大模型。
   */
  private buildMockArticle(dto: GenerateManuscriptDto): string {
    const firstPerson = dto.basic.personList[0];
    const name = firstPerson?.name || '王建国';
    const duty = firstPerson?.duty || '老轨（轮机长）';
    const shipName = firstPerson?.shipName || '中远海运上海号';
    const loc = dto.location || `${shipName} · 印度洋航段 · 机舱底层`;
    const date = dto.happenDate || '2026 年 8 月 15 日';
    const cards = dto.detailCards.filter(c => c.text);

    const extractCard = (type: string, fallback: string) => {
      const c = cards.find(x => x.type === type);
      return c?.text || fallback;
    };

    const act1 = extractCard('action',  `${name} 左手扶着缸头，右手袖口蹭了蹭额头上的汗，手背上有一道 2cm 新疤还没结痂。`);
    const dia1 = extractCard('dialog',  `"你先去吃，我再顶一个班。缸头差 1 度都不行。"${name} 说。`);
    const env1 = extractCard('env',     `正午 12 点 35 分，机舱底层 48.5℃，缸头热浪扑面，柴油味混着海风，两台落地风扇嗡嗡响得像蜂群。`);
    const num1 = extractCard('number',  `本航次是他连续值乘的第 42 天。主机吊缸 1 次，节油 12.3%，零故障零迟滞。`);
    const emo1 = extractCard('emotion', `徒弟小李递完扳手，看师傅袖口的油迹已经结成硬壳，鼻子一酸，低头没说话，悄悄把自己那杯凉白开挪到了师傅脚边的阴影里。`);
    const dia2 = cards.find(c => c.type === 'dialog' && c.text && c.text !== dia1)?.text
                 || '政委拎着一编织袋冰镇西瓜下机舱，机工小济公咬了一口竖大拇指："政委你这西瓜真到位！再热再累也值了！"';
    const extraCards = cards.filter(c => c.text && ![act1,dia1,env1,num1,emo1,dia2].includes(c.text));

    const title = dto.themeIdea?.slice(0, 18) || '缸头旁的西瓜';
    const theme = dto.themeIdea || '体现党员在急难险重任务中的先锋模范作用，响应公司"安全生产月"号召。';
    const style = dto.writerStyleId === 'none' ? '' : `（文学风格调味：${(WRITER_STYLE_PARAMS[dto.writerStyleId]?.name || '')}）`;

    return `# ${title}
${style}

${date}，${loc}。${theme}

${env1}

${act1}
卫生员说他那道新疤至少要休息一周，但他转身就把病假条夹进了值班记录本第 137 页。

${dia1}
他的声音哑得像砂纸磨铁。徒弟小李张了张嘴，没说话。

${emo1}
那杯白开水，师傅从早上到现在一口都没喝过。

一点十七分，${dia2}

周围响起一片笑声。缸头的嗡鸣声，好像也没那么刺耳了。

${num1}
公司党委发的"忠诚、担当、务实、高效"安全生产月号召书，他贴在更衣室柜门里侧，每天穿工作服时都能看见——这八个字，他没在大会上念过一次，但那道翻着嫩肉的新疤、那杯凉了又凉的白开水、那块起沙的西瓜，都替他念过了。

${dto.preference.ending === 'fact' ? `（全文约 ${dto.preference.wordCount} 字 · 事实性结尾）` :
  dto.preference.ending === 'future' ? `下个航次，他还要继续。印度洋的风，会记得。` :
  dto.preference.ending === 'emotional' ? `那牙西瓜的甜，是 48.5℃ 机舱里最凉的一阵风。` :
  `远处，汽笛响了一声。船还在开。`}

${extraCards.length > 0 ? `
---
【额外融入的用户细节卡】（Sprint 2 真实 AI 生成时，这些会自然融入正文）
${extraCards.map((c,i) => `${i+1}. [${c.type}] ${c.text}`).join('\n')}
` : ''}
`;
  }
}
