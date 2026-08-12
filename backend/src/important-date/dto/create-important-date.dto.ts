import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn, IsArray } from 'class-validator';

export class CreateImportantDateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsOptional()
  @IsIn(['none', 'yearly', 'monthly', 'weekly'])
  repeatType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];
}

export class UpdateImportantDateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(['none', 'yearly', 'monthly', 'weekly'])
  repeatType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];
}
