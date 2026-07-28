import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { TeamCode, UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  realName: string;

  @IsEnum(TeamCode)
  teamCode: TeamCode;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsArray()
  @IsOptional()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
