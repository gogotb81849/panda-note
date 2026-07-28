import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsInt } from 'class-validator';
import { ScheduleStatus, Priority } from '@prisma/client';

export class CreateScheduleDto {
  @IsDateString()
  @IsNotEmpty()
  recordDate: string;

  @IsInt()
  @IsOptional()
  shipId?: number;

  @IsString()
  @IsNotEmpty()
  firstType: string;

  @IsString()
  @IsNotEmpty()
  secondType: string;

  @IsInt()
  @IsOptional()
  standardFlowId?: number;

  @IsString()
  @IsOptional()
  eventDetail?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsEnum(ScheduleStatus)
  @IsOptional()
  finishStatus?: ScheduleStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsInt()
  @IsOptional()
  assignedToId?: number;
}
