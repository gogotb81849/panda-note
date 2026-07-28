import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCrewDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsNotEmpty()
  birthdaySolar: string;

  @IsString()
  @IsNotEmpty()
  birthdayLunar: string;

  @IsString()
  @IsOptional()
  birthPlace?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  shipId?: number;

  @IsString()
  @IsOptional()
  shipName?: string;

  @IsDateString()
  @IsOptional()
  onBoardDate?: string;

  @IsDateString()
  @IsOptional()
  expectedOffDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  solarReminderDays?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lunarReminderDays?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  solarGiftAmount?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
