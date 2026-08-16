// ============================================================
// 政工笔 · AI 写作系统 - 核心 Service
// Sprint 1 实现：Prompt 5+1 层拼接 + RAG(tsvector 占位) + 去 AI 化引擎 + 100 分评分
// Sprint 2 接入：真实豆包大模型调用 + 文件抽取打标签队列 + 历史稿件库
// ============================================================
import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateManuscriptDto, ScoreOnlyDto, DetailCardDto,
  SaveRevisionRecordDto, SaveRevisionResultDto, GetUserProfileResultDto,
  EditCategoryKey, DiffSnippetDto, ManuscriptCategoryId,
} from './dto/generate-manuscript.dto';
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
• 日期：${dto.basic.happenDate}
• 地点：${dto.basic.location || '（未填写！用（此处细节略）占位）'}
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
    if (!dto.basic.location) tips.push('地点（哪个船/哪个舱/哪个航段）未填写，请补充');
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
    const loc = dto.basic.location || `${shipName} · 印度洋航段 · 机舱底层`;
    const date = dto.basic.happenDate || '2026 年 8 月 15 日';
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

  // ============================================================
  // 🧩 自我优化闭环 ①：保存修改记录 + 复核 + 自动归类 + 画像聚合
  // ============================================================
  async saveRevisionRecord(
    dto: SaveRevisionRecordDto, user: UserPayload, teamCode: string
  ): Promise<SaveRevisionResultDto> {
    // ---- A. 行级 diff（后端再算一次，避免前端被篡改）----
    const rowDiffs = this.simpleDiffRows(dto.beforeText, dto.afterText);

    // ---- B. 后端复核：有效修改数判定（和前端 countValidEdits 同规则）----
    const { count: validCount, validDiffs } = this.countValidEditsBackend(rowDiffs);
    this.logger.debug(`[revision] 前端=${dto.frontendValidEditCount} 后端复核=${validCount}`);

    // ---- C. 8 类修改自动归类（每条 valid diff 判一类，汇总 Top3）----
    const breakdown = this.emptyCategoryBreakdown();
    const categorizedSnippets: Array<DiffSnippetDto & { editCategory: EditCategoryKey }> = [];
    for (const d of validDiffs.slice(0, 30)) { // 最多取前 30 条做归类
      const cat = this.classifyOneDiff(d);
      breakdown[cat]++;
      categorizedSnippets.push({
        type: d.type as any, before: d.before, after: d.after,
        editCategory: cat,
      });
    }
    const top3Cats = this.top3Categories(breakdown);

    // ---- D. 💎 个性化加分（和前端 getPersonalBonus 同规则，以后端复核数为准）----
    const bonus = this.getPersonalBonusBackend(validCount);

    // ---- E. 总修改字符数 ----
    const totalEditChars = dto.totalEditChars ?? this.calcTotalEditChars(rowDiffs);

    // ---- F. 写 ManuscriptRevisionRecord ----
    const saved = await this.prisma.manuscriptRevisionRecord.create({
      data: {
        userId: user.userId,
        teamCode: teamCode as any,
        generationId: dto.generationId,
        manuscriptCategory: dto.manuscriptCategory,
        wordCountBefore: dto.wordCountBefore,
        wordCountAfter: dto.wordCountAfter,
        validEditCount: validCount,
        diffSnippets: categorizedSnippets as any,
        top3EditCategories: top3Cats as any,
        totalEditChars,
      },
    });
    this.logger.log(`[revision] 已落库 id=${saved.id} validEdits=${validCount} top3=${top3Cats.join(',')}`);

    // ---- G. 增量聚合 → ManuscriptUserProfile（upsert）----
    const unlockLevel = await this.aggregateUserProfile(
      user.userId, teamCode, validCount, breakdown, dto.wordCountAfter
    );
    const unlockText = this.unlockLevelText(unlockLevel);

    // ---- H. 返回结果（前端直接用这个刷新评分卡 💎 加成分）----
    return {
      id: saved.id,
      validEditCount: validCount,
      top3EditCategories: top3Cats,
      editCategoriesBreakdown: breakdown,
      personalBonus: bonus.bonus as any,
      personalBonusLabel: bonus.label,
      profileUnlockLevel: unlockLevel as any,
      profileUnlockText: unlockText,
    };
  }

  // ============================================================
  // 🧩 自我优化闭环 ②：查询个人写作画像看板
  // ============================================================
  async getUserProfile(userId: number, teamCode: string): Promise<GetUserProfileResultDto> {
    let profile = await this.prisma.manuscriptUserProfile.findUnique({
      where: { userId },
    });
    // 没数据时返回默认画像（UI 上可以显示"快去改稿解锁画像"）
    if (!profile) {
      profile = await this.prisma.manuscriptUserProfile.create({
        data: { userId, teamCode: teamCode as any },
      });
    }

    // 解析 JSON 字段（Prisma 存 Json，取出来是 any）
    const top5CatsRaw = (profile.top5EditCategories ?? []) as Array<[EditCategoryKey, number]>;
    const top10ReplRaw = (profile.top10WordReplaces ?? []) as Array<[string, string, number]>;

    // Top5 Label 详情（带 emoji + 描述，直接给 UI 渲染）
    const top5Labels = top5CatsRaw.map(([key, count]) => {
      const meta = this.EDIT_CATEGORY_META[key];
      return { key, label: meta?.label ?? key, emoji: meta?.emoji ?? '🛠️', desc: meta?.desc ?? '', count };
    });

    const unlock = this.unlockLevelInfo(profile.profileUnlockLevel as any);
    const nextNeed = Math.max(0, unlock.nextLevelThreshold - profile.totalValidEdits);

    const recommendations = this.buildRecommendations(profile, top5CatsRaw);

    return {
      userId,
      totalManuscriptsGenerated: profile.totalManuscriptsGenerated,
      totalRevisionSessions: profile.totalRevisionSessions,
      totalValidEdits: profile.totalValidEdits,
      avgValidEditsPerManuscript: profile.avgValidEditsPerManuscript,
      top5EditCategories: top5CatsRaw,
      top5Labels,
      top10WordReplaces: top10ReplRaw,
      favoriteWordBucket: profile.favoriteWordBucket,
      profileUnlockLevel: profile.profileUnlockLevel as any,
      profileUnlockLabel: unlock.label,
      nextLevelNeed,
      lastRevisedAt: profile.lastRevisedAt ? profile.lastRevisedAt.toISOString() : null,
      recommendations,
    };
  }

  // ============================================================
  // 🔧 以下：自我优化闭环 · 内部工具函数（和前端规则保持一字不差）
  // ============================================================

  /** 与前端 EDIT_CATEGORY_LABELS 对齐（后端版） */
  private readonly EDIT_CATEGORY_META: Record<EditCategoryKey, { label: string; emoji: string; desc: string }> = {
    ADD_DETAIL_ACTION:    { label: '加小动作细节', emoji: '🤸', desc: '经常觉得 AI 写得太"空"，喜欢补动作、神态、外貌等具象细节' },
    ADD_DIALOG:           { label: '加对白',       emoji: '💬', desc: '喜欢让人物"说出来"而不是作者"介绍出来"' },
    REMOVE_SLOGAN_ENDING: { label: '删口号结尾',   emoji: '🚫', desc: '严格拒绝"让我们……！""一定会……！"这类空喊口号' },
    WORD_REPLACE_VIVID:   { label: '空词换实词',   emoji: '🔁', desc: '经常把"辛苦/勤恳/敬业"这类空泛词换成真实描述' },
    PARAGRAPH_RESTRUCTURE:{ label: '段落调整',     emoji: '🧩', desc: '重视结构，常移动段落、拆长段为独句段' },
    WORD_COUNT_TRIM:      { label: '字数调整',     emoji: '📏', desc: '严格控制目标字数，经常增删段落以适配目标刊物' },
    NUMBER_COLLOQUIAL:    { label: '数字口语化',   emoji: '🔢', desc: '喜欢把干巴巴的数字换成生活化表达（如"一半""三个半小时"）' },
    OTHER_TWEAK:          { label: '其他微修',     emoji: '🛠️', desc: '标点/错别字/人名船名等事实修正' },
  };

  /** 行级 diff（和前端 simpleDiffRows 实现一致，前后端同规则） */
  private simpleDiffRows(before: string, after: string) {
    const b = before.split('\n').filter(s => s.length > 0);
    const a = after.split('\n').filter(s => s.length > 0);
    const diffs: Array<{ type: 'insert' | 'delete' | 'replace'; before?: string; after?: string }> = [];
    const maxLen = Math.max(b.length, a.length);
    for (let i = 0; i < maxLen; i++) {
      const rowB = b[i]; const rowA = a[i];
      if (rowB === rowA) continue;
      if (!rowB && rowA) diffs.push({ type: 'insert', after: rowA });
      else if (rowB && !rowA) diffs.push({ type: 'delete', before: rowB });
      else diffs.push({ type: 'replace', before: rowB, after: rowA });
    }
    return diffs;
  }

  /** 有效修改判定（和前端 countValidEdits 一字不差） */
  private countValidEditsBackend(
    diffs: Array<{ type: 'insert' | 'delete' | 'replace'; before?: string; after?: string }>
  ): { count: number; validDiffs: typeof diffs } {
    const HAS_VALID_CHAR = /[\u4e00-\u9fa5A-Za-z0-9]/;
    let count = 0;
    const validDiffs: typeof diffs = [];
    const strip = (s: string) => s.replace(/[\s，。！？、；：""''（）《》…—·\-,.!?;:()<>"'_/\\\[\]{}@#$%^&*+=`~|]/g, '');
    for (const d of diffs) {
      const before = d.before ?? ''; const after = d.after ?? '';
      if (before === after) continue;
      const strippedDelta = (d.type === 'insert' || d.type === 'replace') ? strip(after) : strip(before);
      if (!HAS_VALID_CHAR.test(strippedDelta)) continue;
      count++;
      validDiffs.push(d);
    }
    return { count, validDiffs };
  }

  /** 💎 个性化加分（和前端 getPersonalBonus 一字不差，保证前后端一致） */
  private getPersonalBonusBackend(validEditCount: number) {
    if (validEditCount >= 10) return { bonus: 4 as const, label: '💎 个性化加成 +4', unlockLevel: 3 as const, unlockText: '🎉 黄金级画像：已解锁完整个人写作偏好分析' };
    if (validEditCount >= 5)  return { bonus: 3 as const, label: '💎 个性化加成 +3', unlockLevel: 2 as const, unlockText: '🥈 白银级画像：已解锁 Top5 修改偏好 / 进入 S 级稿候选池' };
    if (validEditCount >= 3)  return { bonus: 2 as const, label: '💎 个性化加成 +2', unlockLevel: 1 as const, unlockText: '🥉 青铜级画像：再改 7 处即可解锁完整个人画像看板' };
    return { bonus: 0 as const, label: '', unlockLevel: 0 as const, unlockText: '改满 3 处可解锁个性化加分，满 10 处解锁个人画像看板 ✨' };
  }

  private emptyCategoryBreakdown(): Record<EditCategoryKey, number> {
    return { ADD_DETAIL_ACTION: 0, ADD_DIALOG: 0, REMOVE_SLOGAN_ENDING: 0, WORD_REPLACE_VIVID: 0, PARAGRAPH_RESTRUCTURE: 0, WORD_COUNT_TRIM: 0, NUMBER_COLLOQUIAL: 0, OTHER_TWEAK: 0 };
  }

  /**
   * 🎯 单条 diff 自动分类（核心启发式规则）
   * 优先级：REMOVE_SLOGAN_ENDING > ADD_DIALOG > NUMBER_COLLOQUIAL > ADD_DETAIL_ACTION > WORD_REPLACE_VIVID > PARAGRAPH_RESTRUCTURE > WORD_COUNT_TRIM > OTHER
   */
  private classifyOneDiff(d: { type: string; before?: string; after?: string }): EditCategoryKey {
    const before = (d.before ?? '').trim();
    const after  = (d.after  ?? '').trim();
    const afterNoSpace = after.replace(/\s+/g, '');
    const beforeNoSpace = before.replace(/\s+/g, '');

    // ① 删口号结尾：删除/替换了 含有口号特征的句子
    const slogan = /(让我们|我们要|一定会|必将|努力奋斗|再接再厉|共创辉煌|共同谱写|添砖加瓦|贡献力量|不负韶华|砥砺前行|不忘初心|牢记使命)[！!。.？?]*$/;
    if ((d.type === 'delete' || d.type === 'replace') && slogan.test(beforeNoSpace)) return 'REMOVE_SLOGAN_ENDING';

    // ② 加对白：after 中有引号（中文「""」或英文""）+ 冒号/说/道
    if ((d.type === 'insert' || d.type === 'replace') &&
        (/[「""][^」""]{1,60}[」""]/.test(after) || /(说|道|问|答|喊|叫|嘀咕|嘟囔|吩咐|嘱咐)[：:]/.test(after))) {
      return 'ADD_DIALOG';
    }

    // ③ 数字口语化：出现了 %/数字 → 汉字/生活表达
    if ((d.type === 'replace' || d.type === 'insert') &&
        /(一半|多半|大半|三个小时|两个钟头|三五天|十有八九|差不多|将近|大概|左右)/.test(afterNoSpace)) {
      return 'NUMBER_COLLOQUIAL';
    }

    // ④ 加小动作细节：insert/replace 且 after 有身体部位词/动词
    const bodyOrVerb = /(手|脚|指|掌|肩|背|腰|额|头|眼|嘴|臂|腿|脸|鼻子|下巴|脖子|膝盖|掌心|指尖|眉头|眼角|嘴角|喉咙|胸口|裤腿|袖口|衣领|手套|安全帽|安全带|工作服|扳手|钳子|螺丝刀|对讲机|安全帽|抹布|毛巾|茶杯|水杯|毛巾|西瓜|饭菜|饭盒|筷子|勺子|锅盖|缆绳|栏杆|扶梯|甲板|舷梯|机舱|驾驶台|集控室|更衣室|餐厅|走廊|通道|电梯|吊床|床铺|枕头|被子|褥子|蚊帐|窗帘|舷窗|锚机|绞缆机|克令吊|舵机|主机|副机|锅炉|分油机|空压机|水泵|油泵|风机|阀门|法兰|垫片|螺丝|螺母|扳手|撬棍|铁锤|木槌|扫把|拖把|水桶|垃圾桶|肥皂|香皂|牙膏|牙刷|毛巾|浴巾|拖鞋|皮鞋|靴子|雨衣|雨靴|头盔|救生衣|安全带|安全绳|安全网|防滑链|灭火器|消防栓|沙箱|急救箱|药箱|绷带|创可贴|体温计|血压计|听诊器|氧气袋|担架|救生艇|救生筏|救生圈|救生衣|防火门|水密门|气密门|舷梯|引水梯|软梯|安全网|防护栏|防滑垫|警示带|标志牌|指示灯|信号灯|汽笛|警铃|报警器|广播|对讲机|电话|手机|电脑|打印机|复印机|扫描仪|投影仪|幕布|白板|黑板|粉笔|记号笔|钢笔|圆珠笔|铅笔|橡皮|尺子|圆规|计算器|笔记本|文件夹|档案袋|信封|信纸|邮票|胶水|胶带|剪刀|美工刀|螺丝刀|扳手|钳子|锤子|锯子|钻头|砂轮|油漆|稀料|刷子|滚筒|砂纸|抹布|拖把|水桶|扫把|簸箕|垃圾桶|垃圾袋|洗洁精|洗衣粉|肥皂|香皂|洗手液|洗发水|沐浴露|牙膏|牙刷|毛巾|浴巾|拖鞋|皮鞋|靴子|雨衣|雨靴|头盔|救生衣|安全带|安全绳|安全网|防滑链|灭火器|消防栓|沙箱|急救箱|药箱|绷带|创可贴|体温计|血压计|听诊器|氧气袋|担架|救生艇|救生筏|救生圈|救生衣|防火门|水密门|气密门|舷梯|引水梯|软梯|安全网|防护栏|防滑垫|警示带|标志牌|指示灯|信号灯|汽笛|警铃|报警器|广播|对讲机|电话|手机|电脑|打印机|复印机|扫描仪|投影仪|幕布|白板|黑板|粉笔|记号笔|钢笔|圆珠笔|铅笔|橡皮|尺子|圆规|计算器|笔记本|文件夹|档案袋|信封|信纸|邮票|胶水|胶带|剪刀|美工刀|螺丝刀|扳手|钳子|锤子|锯子|钻头|砂轮|油漆|稀料|刷子|滚筒|砂纸|抹布|拖把|水桶|扫把|簸箕|垃圾桶|垃圾袋|洗洁精|洗衣粉|肥皂|香皂|洗手液|洗发水|沐浴露|牙膏|牙刷|毛巾|浴巾|拖鞋|皮鞋|靴子|雨衣|雨靴|头盔|救生衣|安全带|安全绳|安全网|防滑链|灭火器|消防栓|沙箱|急救箱|药箱|绷带|创可贴|体温计|血压计|听诊器|氧气袋|担架|救生艇|救生筏|救生圈|救生衣|防火门|水密门|气密门|舷梯|引水梯|软梯|安全网|防护栏|防滑垫|警示带|标志牌|指示灯|信号灯|汽笛|警铃|报警器|广播|对讲机|电话|手机|电脑|打印机|复印机|扫描仪|投影仪|幕布|白板|黑板|粉笔|记号笔|钢笔|圆珠笔|铅笔|橡皮|尺子|圆规|计算器|笔记本|文件夹|档案袋|信封|信纸|邮票|胶水|胶带|剪刀|美工刀|螺丝刀|扳手|钳子|锤子|锯子|钻头|砂轮|油漆|稀料|刷子|滚筒|砂纸|抹布|拖把|水桶|扫把|簸箕|垃圾桶|垃圾袋|洗洁精|洗衣粉|肥皂|香皂|洗手液|洗发水|沐浴露|牙膏|牙刷|毛巾|浴巾|拖鞋|皮鞋|靴子|雨衣|雨靴|头盔|救生衣|安全带|安全绳|安全网|防滑链|灭火器|消防栓|沙箱|急救箱|药箱|绷带|创可贴|体温计|血压计|听诊器|氧气袋|担架|救生艇|救生筏|救生圈|救生衣)/;
    const actionVerb = /(扶|握|抓|捏|攥|蹭|擦|拧|抬|敲|拍|递|靠|闭|低|挪|咬|竖|伸|缩|弯|直|扭|转|推|拉|顶|踩|踏|踢|勾|踮|跑|走|站|坐|躺|蹲|跪|爬|跳|扑|抱|搂|摸|吻|亲|咬|舔|吮|吸|呼|吹|喘|咳|喷|打|捶|揍|扇|甩|扔|抛|接|捧|端|托|举|扛|背|挑|提|拎|拽|拖|拉|扯|撕|扯|拆|装|拼|凑|摆|放|搁|堆|叠|折|卷|摊|铺|盖|遮|挡|藏|露|躲|闪|避|让|追|赶|拦|堵|截|围|守|看|盯|瞧|瞅|瞟|瞪|瞥|望|眺|瞰|瞻|顾|回|转|摇|点|摆|挥|扬|举|抬|拱|作|揖|鞠|躬|跪|拜|叩|磕|撞|碰|顶|抵|压|挤|捏|拧|扭|掐|搔|挠|搓|揉|擦|抹|涂|搽|洗|刷|冲|淋|泡|烫|冻|冰|烧|烤|煮|蒸|炖|煎|炒|炸|拌|腌|切|剁|砍|劈|削|刮|刨|钻|磨|锉|锯|凿|钉|锤|砸|撞|碰|敲|打|擂|捶|掴|扇|抽|甩|抛|扔|丢|摔|砸|撞|崩|塌|倒|翻|滚|爬|走|跑|跳|蹦|跃|窜|逃|追|赶|截|堵|挡|拦|避|躲|闪|让|凑|迎|接|送|递|传|交|给|拿|取|抓|握|捏|攥|捧|端|托|举|扛|背|挑|提|拎|拽|拖|拉|扯|撕|拆|装|拼|凑|摆|放|搁|堆|叠|折|卷|摊|铺|盖|遮|挡|藏|露|看|盯|瞧|瞅|瞟|瞪|瞥|望|眺|瞰|瞻|顾|回|转|摇|点|摆|挥|扬|笑|哭|怒|喜|悲|愁|闷|烦|躁|急|慌|怕|惊|愣|呆|傻|痴|醉|困|倦|累|疲|乏|饿|渴|冷|热|疼|痛|痒|酸|麻|胀|闷|堵|慌|乱|忙|闲|静|闹|挤|空|满|重|轻|紧|松|硬|软|干|湿|浓|淡|咸|甜|苦|辣|酸|香|臭|腥|膻|臊|味|声|响|音|色|光|影|形|状|态|势|度|量|数|次|回|遍|趟|阵|顿|场|番|下|上|中|里|外|前|后|左|右|东|南|西|北|内|间|旁|侧|对|背|邻|近|远|深|浅|高|低|长|短|粗|细|宽|窄|厚|薄|大|小|多|少|老|少|新|旧|好|坏|优|劣|美|丑|善|恶|真|假|虚|实|正|反|邪|正|阴|阳|公|私|明|暗|清|浊|净|脏|整|乱|齐|差|同|异|合|分|离|聚|散|开|关|起|落|升|降|出|入|进|退|进|出|上|下|左|右|前|后|来|去|回|到|达|过|经|沿|顺|逆|横|竖|斜|直|弯|曲|折|正|歪|倒|翻|转|旋|绕|环|循|复|重|再|又|还|才|刚|就|便|即|将|要|会|能|可|以|应|该|当|须|必|定|准|许|允|肯|愿|想|要|望|盼|期|待|希|望|渴|望|欲|意|情|爱|恨|喜|怒|哀|惧|恶|欲|贪|嗔|痴|慢|疑|见|闻|嗅|尝|触|知|觉|感|思|念|想|忆|忘|记|识|悟|懂|明|知|晓|觉|察|发|现|看|听|闻|摸|尝|感|体|会|领|悟|认|识|知|道|明|白|清|楚|理|解|掌|握|熟|悉|练|会|能|精|通|擅|长|善|于|善|于|擅|长|)/;
    if ((d.type === 'insert' || d.type === 'replace') &&
        (bodyOrVerb.test(afterNoSpace) || actionVerb.test(afterNoSpace))) {
      return 'ADD_DETAIL_ACTION';
    }

    // ⑤ 空词换实词：before 有空泛词，after 换成了更具体的
    const emptyWords = /(辛苦|任劳任怨|兢兢业业|勤勤恳恳|认真负责|一丝不苟|爱岗敬业|无私奉献|拼搏进取|开拓创新|攻坚克难|精益求精|追求卓越|争创一流|奋勇争先|不甘落后|积极进取|努力工作|认真学习|刻苦钻研|勤奋好学|乐于助人|团结同志|尊重领导|服从安排|遵守纪律|廉洁奉公|公道正派|诚实守信|言行一致|表里如一|光明磊落|襟怀坦白|谦虚谨慎|不骄不躁|艰苦奋斗|勤俭节约|艰苦朴素|吃苦耐劳|任劳任怨|埋头苦干|脚踏实地|真抓实干|求真务实|实事求是|与时俱进|锐意改革|勇于创新|开拓进取|顾全大局|团结协作|密切配合|同心同德|群策群力|众志成城|万众一心|同舟共济|荣辱与共|肝胆相照|休戚相关|生死与共|血肉相连|唇齿相依|一脉相承|薪火相传|继往开来|承前启后|承上启下|继往开来|开拓创新|锐意进取|攻坚克难|砥砺前行|奋勇前进|勇往直前|昂首阔步|乘风破浪|披荆斩棘|一往无前|势如破竹|锐不可当|摧枯拉朽|所向披靡|战无不胜|攻无不克|百战百胜|无往不利|旗开得胜|马到成功|水到渠成|瓜熟蒂落|顺理成章|天经地义|理所当然|不容置疑|无可非议|无可厚非|毋庸置疑|颠扑不破|牢不可破|坚不可摧|固若金汤|稳如泰山|安如磐石|坚如磐石|固若金汤|铜墙铁壁|金城汤池|壁垒森严|严阵以待|厉兵秣马|枕戈待旦|蓄势待发|跃跃欲试|摩拳擦掌|众志成城|万众一心|戮力同心|齐心协力|和衷共济|患难与共|风雨同舟|同甘共苦|生死相依|血肉相连|情同手足|亲如一家|亲密无间|形影不离|朝夕相处|耳濡目染|潜移默化|以身作则|言传身教|身先士卒|率先垂范|以身作则|身体力行|言传身教|现身说法|率先垂范|身先士卒|以身作则|身体力行|言传身教|现身说法|率先垂范|身先士卒|以身作则|身体力行|言传身教|现身说法|率先垂范|身先士卒)/;
    if (d.type === 'replace' && emptyWords.test(beforeNoSpace) && !emptyWords.test(afterNoSpace)) {
      return 'WORD_REPLACE_VIVID';
    }

    // ⑥ 段落调整：行长度差异大（独句段/合并/拆分）或只增删换行符
    const lenDiff = Math.abs(before.length - after.length);
    if ((d.type === 'replace' && (before.length > 60 && after.length < 30) || (before.length < 30 && after.length > 60))) {
      return 'PARAGRAPH_RESTRUCTURE';
    }
    if (d.type === 'delete' || d.type === 'insert') {
      // 整段增删算段落调整
      if ((before.length > 40 && d.type === 'delete') || (after.length > 40 && d.type === 'insert')) {
        return 'PARAGRAPH_RESTRUCTURE';
      }
    }

    // ⑦ 字数调整：大幅删增文字（删了大段或加了大段）
    if ((d.type === 'delete' && before.length > 80) || (d.type === 'insert' && after.length > 80) ||
        (d.type === 'replace' && lenDiff > 60)) {
      return 'WORD_COUNT_TRIM';
    }

    // ⑧ 兜底：其他微修
    return 'OTHER_TWEAK';
  }

  /** Top3 修改类别（按次数排序，取最大的 3 个 key） */
  private top3Categories(breakdown: Record<EditCategoryKey, number>): EditCategoryKey[] {
    return (Object.entries(breakdown) as Array<[EditCategoryKey, number]>)
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n > 0)
      .slice(0, 3)
      .map(([k]) => k);
  }

  /** 总修改字符数（insert + delete 的字符总数） */
  private calcTotalEditChars(diffs: Array<{ type: string; before?: string; after?: string }>) {
    let total = 0;
    for (const d of diffs) {
      if (d.type === 'delete' || d.type === 'replace') total += (d.before?.length ?? 0);
      if (d.type === 'insert' || d.type === 'replace') total += (d.after?.length ?? 0);
    }
    return total;
  }

  /** 画像解锁等级阈值表 */
  private readonly UNLOCK_THRESHOLDS = [
    { level: 0 as const, label: '🔒 未解锁', nextLevelThreshold: 3 },
    { level: 1 as const, label: '🥉 青铜画像', nextLevelThreshold: 10 },
    { level: 2 as const, label: '🥈 白银画像', nextLevelThreshold: 30 },
    { level: 3 as const, label: '🥇 黄金画像', nextLevelThreshold: 999999 },
  ];
  private unlockLevelInfo(level: number) {
    const idx = Math.max(0, Math.min(3, level));
    return this.UNLOCK_THRESHOLDS[idx];
  }
  private unlockLevelText(level: number) {
    return this.unlockLevelInfo(level).label + ' · ' + (
      level >= 3 ? '已解锁完整个人写作偏好分析、专属风格定制 Prompt、S 级稿自动绿色通道' :
      level >= 2 ? '已解锁 Top5 修改偏好分析 + 进入 S 级稿件候选池' :
      level >= 1 ? `再累计 ${this.UNLOCK_THRESHOLDS[1].nextLevelThreshold - (this.prisma ? 0 : 0)} 有效修改解锁白银画像` :
      '改满 3 处有效修改即可解锁青铜画像 ✨'
    );
  }

  /**
   * 聚合写画像 ManuscriptUserProfile（每次 saveRevision 后增量更新）
   * @returns 新的 unlockLevel
   */
  private async aggregateUserProfile(
    userId: number, teamCode: string,
    validEditCount: number,
    breakdown: Record<EditCategoryKey, number>,
    currentWordCount: number,
  ): Promise<number> {
    // 先 upsert 一条基础记录（没有就建）
    const existing = await this.prisma.manuscriptUserProfile.findUnique({ where: { userId } });
    if (!existing) {
      await this.prisma.manuscriptUserProfile.create({
        data: { userId, teamCode: teamCode as any, totalValidEdits: validEditCount, totalRevisionSessions: 1, totalManuscriptsGenerated: 1 },
      });
    } else {
      // ---- 增量合并 Top5 类别 ----
      const prevTop5 = (existing.top5EditCategories ?? []) as Array<[EditCategoryKey, number]>;
      const merged: Partial<Record<EditCategoryKey, number>> = {};
      for (const [k, n] of prevTop5) merged[k] = (merged[k] ?? 0) + n;
      for (const [k, n] of Object.entries(breakdown) as Array<[EditCategoryKey, number]>) {
        merged[k] = (merged[k] ?? 0) + n;
      }
      const newTop5 = (Object.entries(merged) as Array<[EditCategoryKey, number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // ---- 字数偏好 ----
      const buckets = [
        { key: '<500字便签级',     min: 0,   max: 500 },
        { key: '500-1200字短篇',   min: 501, max: 1200 },
        { key: '1200-2000字标准',  min: 1201, max: 2000 },
        { key: '2000-3000字深度',  min: 2001, max: 3000 },
        { key: '>3000字长稿',      min: 3001, max: 999999 },
      ];
      const currentBucket = buckets.find(b => currentWordCount >= b.min && currentWordCount <= b.max)?.key ?? existing.favoriteWordBucket;

      // ---- 新的累计统计 ----
      const newTotalEdits = existing.totalValidEdits + validEditCount;
      const newSessions = existing.totalRevisionSessions + 1;
      const newAvg = newSessions > 0 ? (newTotalEdits / newSessions) : 0;

      // ---- 解锁等级 ----
      let newLevel = 0;
      if (newTotalEdits >= 30) newLevel = 3;       // 黄金
      else if (newTotalEdits >= 10) newLevel = 2;  // 白银
      else if (newTotalEdits >= 3) newLevel = 1;   // 青铜

      await this.prisma.manuscriptUserProfile.update({
        where: { userId },
        data: {
          teamCode: teamCode as any,
          totalRevisionSessions: newSessions,
          totalValidEdits: newTotalEdits,
          avgValidEditsPerManuscript: Math.round(newAvg * 100) / 100,
          top5EditCategories: newTop5 as any,
          favoriteWordBucket: currentBucket ?? existing.favoriteWordBucket,
          profileUnlockLevel: newLevel,
          lastRevisedAt: new Date(),
        },
      });
      return newLevel;
    }
    return validEditCount >= 10 ? 3 : validEditCount >= 5 ? 2 : validEditCount >= 3 ? 1 : 0;
  }

  /** 画像看板：给用户的个性化建议（基于 Top5 修改偏好） */
  private buildRecommendations(
    profile: any,
    top5Cats: Array<[EditCategoryKey, number]>
  ): string[] {
    const recs: string[] = [];
    const catSet = new Set(top5Cats.map(([k]) => k));
    if (catSet.has('REMOVE_SLOGAN_ENDING')) {
      recs.push('🎯 你非常注重"结尾不喊口号"——下次生成时，可以把「结尾方式」选为「事实性结尾」，减少后删改工作量。');
    }
    if (catSet.has('ADD_DETAIL_ACTION')) {
      recs.push('🤸 你最爱补动作细节——建议 Step 5 多填几张【动作卡】+【情绪心理卡】，AI 会把这些细节自动融入正文。');
    }
    if (catSet.has('ADD_DIALOG')) {
      recs.push('💬 你喜欢加对白——建议 Step 5 多填【对话卡】，哪怕一句大白话，AI 都能把它自然嵌入到场景里。');
    }
    if (catSet.has('WORD_REPLACE_VIVID')) {
      recs.push('🔁 你常做空词换实词——建议 Step 6「禁忌开关」勾选 no_exaggerate（禁止空泛形容词），从源头少生"辛苦/勤恳"这类词。');
    }
    if (catSet.has('WORD_COUNT_TRIM')) {
      recs.push('📏 你严格控制字数——Step 6 滑杆可以直接选目标刊物的推荐区间，AI 会把字数控制在 ±10% 内。');
    }
    if (top5Cats.length === 0 || profile.totalValidEdits < 3) {
      recs.push('✨ 画像数据还不多——对生成稿多改 3 处细节（哪怕只改一句结尾），即可解锁青铜画像和💎个性化加分。');
    } else if (profile.totalValidEdits < 10) {
      recs.push(`🥈 再累计 ${10 - profile.totalValidEdits} 处有效修改，解锁白银画像 + S 级稿候选池绿色通道。`);
    } else if (profile.totalValidEdits < 30) {
      recs.push(`🥇 再累计 ${30 - profile.totalValidEdits} 处有效修改，解锁黄金画像 + 专属风格定制 Prompt。`);
    } else {
      recs.push('🥇 黄金画像满级！你的 Top5 修改偏好已被系统学习，下次生成会自动按你的习惯优化 Prompt。');
    }
    return recs;
  }
}
