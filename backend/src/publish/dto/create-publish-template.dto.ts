import { IsString, IsOptional, IsBoolean, IsInt, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePublishTemplateDto {
  @IsString()
  teamCode: string;

  @IsOptional()
  @IsString()
  templateType?: string;

  @IsString()
  title: string;

  @IsArray()
  items: any;

  @IsOptional()
  @IsString()
  templateDesc?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  targetShips?: any;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  triggerDays?: number;

  @IsOptional()
  @IsString()
  frequencyType?: string;

  @IsOptional()
  @IsString()
  frequencyCron?: string;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  reminderDaysBefore?: any;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsString()
  aiPromptTemplate?: string;

  @IsOptional()
  @IsString()
  aiOutputFormat?: string;

  @IsOptional()
  dashboardMetrics?: any;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sourceTaskId?: number;

  @IsOptional()
  @IsString()
  creatorRole?: string;

  @IsOptional()
  @IsString()
  fileNamingRule?: string;

  @IsOptional()
  allowedTypes?: any;

  @IsOptional()
  @IsBoolean()
  progressTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
