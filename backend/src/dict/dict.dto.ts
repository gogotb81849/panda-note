import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateDictDto {
  @IsString()
  @IsOptional()
  teamCode?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  categoryType: string;

  @IsString()
  categoryName: string;

  @IsInt()
  @IsOptional()
  parentId?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateDictDto {
  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsInt()
  @IsOptional()
  parentId?: number;

  @IsString()
  @IsOptional()
  role?: string;
}

export class UpdateUserPermissionsDto {
  @IsInt()
  userId: number;

  @IsOptional()
  canEditAll?: boolean;

  @IsOptional()
  editableCategoryIds?: number[];
}
