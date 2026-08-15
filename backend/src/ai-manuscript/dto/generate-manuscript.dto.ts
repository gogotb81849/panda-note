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

export class GenerateManuscriptDto {
  // -------- Step 1 --------
  @IsEnum(['advanced_deed','political_briefing','ship_news','meeting_minutes','work_summary'])
  categoryId!: ManuscriptCategoryId;
  @IsDefined() writerStyleId!: WriterStyleId;

  // -------- Step 2 --------
  @IsString() happenDate!: string;
  @IsString() location!: string;
  @ValidateNested({ each: true }) @Type(() => PersonItemDto) personList!: PersonItemDto[];

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

export class ScoreOnlyDto {
  @IsString() articleText!: string;
  @IsInt() @Min(0) @Max(100) deaiStrength = 80;
}

export class DeaiOnlyDto extends ScoreOnlyDto {}
