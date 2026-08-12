import { IsBoolean, IsInt, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';

export class UpdateScheduleSettingsDto {
  @IsOptional()
  @IsBoolean()
  showLunar?: boolean;

  @IsOptional()
  @IsBoolean()
  showWeekNumber?: boolean;

  @IsOptional()
  @IsBoolean()
  showHolidayRest?: boolean;

  @IsOptional()
  @IsBoolean()
  showHistoricalEvents?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartDay?: number;

  @IsOptional()
  @IsBoolean()
  syncTodo?: boolean;

  @IsOptional()
  @IsBoolean()
  showImportantDate?: boolean;

  @IsOptional()
  @IsBoolean()
  recommendSubscribe?: boolean;

  @IsOptional()
  @IsString()
  otherCalendar?: string;
}
