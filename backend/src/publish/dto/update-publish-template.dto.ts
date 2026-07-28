import { IsString, IsOptional, IsBoolean, IsInt, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CreatePublishTemplateDto } from './create-publish-template.dto';

export class UpdatePublishTemplateDto extends PartialType(CreatePublishTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
