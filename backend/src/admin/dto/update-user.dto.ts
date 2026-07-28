import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { TeamCode, UserRole } from '@prisma/client';

export class UpdateUserDto {
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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
