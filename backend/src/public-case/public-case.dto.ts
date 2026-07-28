import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreatePublicCaseDto {
  @IsInt()
  @IsOptional()
  fromRecordId?: number;

  @IsString()
  caseType: string;

  @IsString()
  caseContent: string;
}
