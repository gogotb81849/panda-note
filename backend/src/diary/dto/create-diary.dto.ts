import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiaryDto {
  @IsDateString({ strict: false }) // 宽松：允许 YYYY-MM-DD / YYYY/MM/DD 等
  @IsNotEmpty({ message: '日记日期不能为空' })
  date: string;

  @IsString({ message: '日记内容必须是字符串' })
  @IsOptional()
  content?: string;

  @IsInt({ message: 'shipId 必须是整数' })
  @IsOptional()
  @Type(() => Number)
  shipId?: number;

  @IsString()
  @IsOptional()
  weather?: string;

  @IsString()
  @IsOptional()
  seaCondition?: string;

  @IsString()
  @IsOptional()
  dynamicStatus?: string;

  @IsString()
  @IsOptional()
  departurePort?: string;

  @IsString()
  @IsOptional()
  arrivalPort?: string;

  @IsDateString({ strict: false })
  @IsOptional()
  departureDate?: string;

  @IsDateString({ strict: false })
  @IsOptional()
  arrivalDate?: string;

  // departureTime 允许任何字符串，后端用 safeDate 解析，不强制格式
  @IsString()
  @IsOptional()
  departureTime?: string;

  @IsString()
  @IsOptional()
  pirateStatus?: string;

  @IsString()
  @IsOptional()
  pirateTime?: string;

  @IsString()
  @IsOptional()
  shipName?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  shipPosition?: string;

  @IsBoolean({ message: 'isFreePortZone 必须是布尔值' })
  @IsOptional()
  @Type(() => Boolean)
  isFreePortZone?: boolean;

  @IsBoolean({ message: 'isWarZone 必须是布尔值' })
  @IsOptional()
  @Type(() => Boolean)
  isWarZone?: boolean;

  @IsBoolean({ message: 'leadSealOperation 必须是布尔值' })
  @IsOptional()
  @Type(() => Boolean)
  leadSealOperation?: boolean;

  @IsString()
  @IsOptional()
  categoryFirst?: string;

  @IsString()
  @IsOptional()
  categorySecond?: string;

  @IsString()
  @IsOptional()
  politicalInstructorName?: string;

  @IsDateString({ strict: false })
  @IsOptional()
  politicalInstructorOnBoardDate?: string;

  @IsInt({ each: true, message: 'relatedScheduleIds 每项必须是整数' })
  @IsArray({ message: 'relatedScheduleIds 必须是数组' })
  @IsOptional()
  @Type(() => Number)
  relatedScheduleIds?: number[];
}
