import { IsInt, IsNotEmpty, IsOptional, IsBoolean, IsIn, Min } from 'class-validator';

export class CreateScheduleReminderDto {
  @IsInt()
  @IsNotEmpty()
  scheduleId: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  remindBefore: number;

  @IsOptional()
  @IsIn(['minute', 'hour', 'day'])
  remindUnit?: string;

  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;
}

export class UpdateScheduleReminderDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  remindBefore?: number;

  @IsOptional()
  @IsIn(['minute', 'hour', 'day'])
  remindUnit?: string;

  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;
}
