import { IsString, IsOptional } from 'class-validator';

export class CreateSopFlowDto {
  @IsString()
  flowName: string;

  @IsString()
  flowContent: string;

  @IsString()
  @IsOptional()
  firstType?: string;

  @IsString()
  @IsOptional()
  secondType?: string;
}

export class UpdateSopFlowDto {
  @IsString()
  @IsOptional()
  flowName?: string;

  @IsString()
  @IsOptional()
  flowContent?: string;
}
