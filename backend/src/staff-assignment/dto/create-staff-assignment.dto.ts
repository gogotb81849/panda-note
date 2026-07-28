import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateStaffAssignmentDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  shipId: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sourceCompany?: string;

  @IsOptional()
  @IsString()
  assignmentNo?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateStaffAssignmentDto {
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sourceCompany?: string;

  @IsOptional()
  @IsString()
  assignmentNo?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CheckOutDto {
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class LeaveDto {
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
