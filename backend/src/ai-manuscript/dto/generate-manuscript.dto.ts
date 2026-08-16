// ============================================================
// 政工笔 · 生成稿件 DTO（前端 10 步表单提交 → 后端）
// ============================================================
import { IsArray, IsBoolean, IsDefined, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export type ManuscriptCategoryId =
  | 'advanced_deed' | 'political_briefing' | 'ship_news' | 'meeting_minutes' | 'work_summary';
export type WriterStyleId =
  | 'none' | 'qiuzhongshu' | 'liangshiqiu' | 'wangzengqi' | 'zhuziqing'
  | 'shencongwen' | 'luxun' | 'luyao' | 'shitiesheng'
  | 'moyan' | 'bifeiyu' | 'xiaohong' | 'tiening';
export type DetailCardTypeId =
  | 'action' | 'dialog' | 'env' | 'senses' | 'number' | 'emotion' | 'free';
export type PreferenceTone = 'formal' | 'plain' | 'enthusiastic' | 'objective';
export type PreferencePerson = 'first' | 'third';
export type PreferenceEnding = 'fact' | 'future' | 'emotional' | 'open';

export class PersonItemDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() duty?: string;
  @IsString() @IsOptional() shipName?: string;
  @IsString() @IsOptional() dept?: string;
}

export class DetailCardDto {
  @IsString() @IsDefined() id!: string;
  @IsEnum(['action','dialog','env','senses','number','emotion','free'])
  type!: DetailCardTypeId;
  @IsString() @IsOptional() text?: string;
}

export class TemplateChoiceDto {
  @IsBoolean() useGlobalL1 = true;
  @IsBoolean() usePersonalL1 = false;
  @IsBoolean() usePublicL2 = true;
}

export class PreferenceDto {
  @IsEnum(['formal','plain','enthusiastic','objective']) tone: PreferenceTone = 'plain';
  @IsEnum(['first','third']) person: PreferencePerson = 'third';
  @IsEnum(['fact','future','emotional','open']) ending: PreferenceEnding = 'fact';
  @IsBoolean() withSubtitles = false;
  @IsArray() @IsString({ each: true }) taboos: string[] = ['no_slogan','no_exaggerate','prefer_short'];
  @IsString() journalId = 'cosco_shipping_news_normal';
  @IsInt() @Min(200) @Max(8000) wordCount = 1200;
  @IsInt() @Min(0) @Max(100) deaiStrength = 80;
}

export class BasicInfoDto {
  // Step 2: 三要素（时间 / 地点 / 人物）—— 和前端 form.basic 结构完全对齐
  @IsString() happenDate!: string;
  @IsString() location!: string;
  @ValidateNested({ each: true }) @Type(() => PersonItemDto) personList!: PersonItemDto[];
}

export class GenerateManuscriptDto {
  // -------- Step 1 --------
  @IsEnum(['advanced_deed','political_briefing','ship_news','meeting_minutes','work_summary'])
  categoryId!: ManuscriptCategoryId;
  @IsDefined() writerStyleId!: WriterStyleId;

  // -------- Step 2（前后端字段对齐：前端 form.basic，后端 dto.basic，完全一致）--------
  @ValidateNested() @Type(() => BasicInfoDto) basic!: BasicInfoDto;

  // -------- Step 3 --------
  @IsString() eventProcess!: string;

  // -------- Step 4 --------
  @IsString() themeIdea!: string;

  // -------- Step 5 --------
  @ValidateNested({ each: true }) @Type(() => DetailCardDto)
  detailCards!: DetailCardDto[];
  @IsString() @IsOptional() freeSpecialInstructions?: string;

  // -------- Step 6 --------
  @ValidateNested() @Type(() => PreferenceDto)
  preference!: PreferenceDto;

  // -------- Step 7 --------
  @ValidateNested() @Type(() => TemplateChoiceDto)
  templateChoice!: TemplateChoiceDto;
}

// ============================================================
// 🧩 政工笔 · 自我优化闭环：修改记录 DTOs
// ============================================================

/** 8 大修改类别（与前端 constants/ai-manuscript 中 EditCategoryKey 对齐） */
export type EditCategoryKey =
  | 'ADD_DETAIL_ACTION' | 'ADD_DIALOG' | 'REMOVE_SLOGAN_ENDING'
  | 'WORD_REPLACE_VIVID' | 'PARAGRAPH_RESTRUCTURE' | 'WORD_COUNT_TRIM'
  | 'NUMBER_COLLOQUIAL' | 'OTHER_TWEAK';

export interface DiffSnippetDto {
  type: 'insert' | 'delete' | 'replace';
  before?: string;
  after?: string;
  startIdx?: number;
  endIdx?: number;
  /** 后端自动归类后回填给前端，前端可不填 */
  editCategory?: EditCategoryKey;
}

/** 前端提交：保存一次修改会话记录（每次下载/存草稿时提交 1 条） */
export class SaveRevisionRecordDto {
  @IsString() generationId!: string;       // 前端 generatedAt+随机，用于把同篇稿子的多次修改聚合
  @IsEnum(['advanced_deed','political_briefing','ship_news','meeting_minutes','work_summary'])
  manuscriptCategory!: ManuscriptCategoryId;

  @IsString() beforeText!: string;        // 修改前全文（原始快照）
  @IsString() afterText!: string;         // 修改后全文（用户当前版本）

  @IsInt() @Min(0) wordCountBefore!: number;
  @IsInt() @Min(0) wordCountAfter!: number;

  @IsInt() @Min(0) frontendValidEditCount!: number; // 前端已经算过一次，后端再复核
  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => Object)
  diffSnippets?: DiffSnippetDto[];       // 3-15 条重点 diff（前端传）
  @IsInt() @Min(0) totalEditChars?: number; // 总修改字符数（insert+delete）
}

/** 后端返回：保存 revision 后把「复核后的有效修改数 + 自动 Top3 分类」回传给前端，用于刷新评分卡 💎 加成分 */
export interface SaveRevisionResultDto {
  id: number;
  validEditCount: number;                  // 后端复核后的"真实有效修改数"
  top3EditCategories: EditCategoryKey[];   // 本次用户改得最多的 3 类
  editCategoriesBreakdown: Record<EditCategoryKey, number>; // 各类的次数分布，便于画像
  /** 后端按这张表计算出的 💎 个性化加成（与前端 getPersonalBonus 同规则） */
  personalBonus: 0 | 2 | 3 | 4;
  personalBonusLabel: string;
  profileUnlockLevel: 0 | 1 | 2 | 3;
  profileUnlockText: string;
}

/** 查询个人写作画像看板（/user-profile GET）—— 返回聚合表 ManuscriptUserProfile */
export interface GetUserProfileResultDto {
  userId: number;
  // 基础统计
  totalManuscriptsGenerated: number;
  totalRevisionSessions: number;
  totalValidEdits: number;
  avgValidEditsPerManuscript: number;
  // Top5 修改类别（"你最喜欢改什么？"）
  top5EditCategories: Array<[EditCategoryKey, number]>; // [[类别, 次数]]
  top5Labels: Array<{ key: EditCategoryKey; label: string; emoji: string; desc: string; count: number }>;
  // Top10 词替换偏好（"你经常把 XX 改成 YY"）
  top10WordReplaces: Array<[string, string, number]>; // [[beforeWord, afterWord, 次数]]
  // 字数偏好
  favoriteWordBucket: string | null;
  // 解锁等级
  profileUnlockLevel: 0 | 1 | 2 | 3;
  profileUnlockLabel: string; // 锁/青铜/白银/黄金
  nextLevelNeed: number;      // 到下一级还需要多少有效修改
  lastRevisedAt: string | null; // ISO
  // Sprint 3 建议：把这些数据做成雷达/柱状/饼图可视化
  recommendations: string[];
}

export class ScoreOnlyDto {
  @IsString() articleText!: string;
  @IsInt() @Min(0) @Max(100) deaiStrength = 80;
}

export class DeaiOnlyDto extends ScoreOnlyDto {}
