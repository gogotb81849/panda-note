import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateStaffHistoryDto {
  @IsInt()
  shipId: number;

  @IsString()
  postName: string;

  @IsString()
  staffName: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  handoverNote?: string;
}

export class UpdateStaffHistoryDto {
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  handoverNote?: string;
}
