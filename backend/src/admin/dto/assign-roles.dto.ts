import { IsArray, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AssignRolesDto {
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
