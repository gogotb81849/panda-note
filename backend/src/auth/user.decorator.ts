import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TeamCode, UserRole } from '@prisma/client';

export interface UserPayload {
  id: number;
  username: string;
  realName?: string;
  teamCode: TeamCode;
  role: UserRole;
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// 获取用户 ID
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);

// 获取用户所属团队代码
export const UserTeam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.teamCode;
  },
);

// 获取用户角色
export const UserRoles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.role;
  },
);
