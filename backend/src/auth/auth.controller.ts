import { Controller, Post, Body, Get, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ThrottlerGuard, SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsString, IsOptional, IsNumber, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  token: string;
}

export class SwitchRoleDto {
  @IsString()
  role: string;

  @IsOptional()
  targetUserId?: number;
}

export class ChangePasswordDto {
  @IsString()
  username: string;

  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto.username, dto.currentPassword, dto.newPassword);
  }

  @SkipThrottle()
  @Post('refresh-token')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.token);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('switch-role')
  async switchRole(@Request() req, @Body() dto: SwitchRoleDto) {
    const userId = req.user.sub || req.user.id;
    console.log('[switchRole] 请求信息:', { userId, targetRole: dto.role, targetUserId: dto.targetUserId });
    if (!userId) {
      throw new ForbiddenException('无效的token，请重新登录');
    }
    return this.authService.switchRole(userId, dto.role, dto.targetUserId);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('users-by-role')
  async getUsersByRole(@Request() req) {
    const adminId = req.user.sub || req.user.id;
    if (!adminId) {
      throw new ForbiddenException('无效的token，请重新登录');
    }
    return this.authService.getUsersByRole(adminId);
  }

  @SkipThrottle()
  @Post('init-users')
  async initUsers() {
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('该接口仅在开发环境可用');
    }
    return this.authService.createInitialUsers();
  }
}
