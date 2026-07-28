import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional } from 'class-validator';
import { TeamCode, UserRole } from '@prisma/client';

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  realName?: string;

  @IsEnum(TeamCode)
  @IsOptional()
  teamCode?: TeamCode;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsArray()
  @IsOptional()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsOptional()
  username?: string;
}
