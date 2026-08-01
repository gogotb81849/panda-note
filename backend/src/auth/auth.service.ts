import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      teamCode: user.teamCode,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.redisService.set(`refresh_token:${user.id}`, refreshToken, 7 * 24 * 60 * 60);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        teamCode: user.teamCode,
        role: user.role,
        roles: user.roles || [user.role],
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new UnauthorizedException('JWT_SECRET 未配置');
    }

    let decoded: { sub: number; username: string; teamCode: string; role: string };
    try {
      decoded = jwt.verify(refreshToken, jwtSecret) as any;
    } catch {
      throw new UnauthorizedException('无效的refresh token');
    }

    if (!decoded.sub) {
      throw new UnauthorizedException('token格式无效');
    }

    const storedToken = await this.redisService.get(`refresh_token:${decoded.sub}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('refresh token已失效，请重新登录');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return this.generateTokens(user);
  }

  async logout(userId: number) {
    await this.redisService.del(`refresh_token:${userId}`);
  }

  async switchRole(userId: number, targetRole: string, targetUserId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (targetUserId) {
      if (user.role !== 'admin') {
        throw new ForbiddenException('只有管理员可以切换用户');
      }
      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
      });
      if (!targetUser) {
        throw new UnauthorizedException('目标用户不存在');
      }

      return this.generateTokens(targetUser);
    }

    const availableRoles = user.roles || [user.role];
    const hasRole = availableRoles.some(r => String(r) === targetRole);
    if (!hasRole) {
      throw new ForbiddenException('无权切换到该角色');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: targetRole as any },
    });

    return this.generateTokens(updated);
  }

  async getUsersByRole(adminId: number) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('只有管理员可以查看用户列表');
    }

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        teamCode: true,
      },
      orderBy: [
        { role: 'asc' },
        { realName: 'asc' },
      ],
    });

    const grouped: Record<string, Array<{ id: number; username: string; realName: string; teamCode: string }>> = {};
    for (const u of users) {
      if (!grouped[u.role]) {
        grouped[u.role] = [];
      }
      grouped[u.role].push({
        id: u.id,
        username: u.username,
        realName: u.realName,
        teamCode: u.teamCode,
      });
    }

    return grouped;
  }

  async createInitialUsers() {
    const logger = { log: (msg: string) => console.log(`[createInitialUsers] ${msg}`) };
    logger.log('开始初始化测试用户...');

    const hashedPassword123 = await bcrypt.hash('123456', 12);
    const hashedPasswordAdmin = await bcrypt.hash('admin123', 12);

    const test123 = await bcrypt.compare('123456', hashedPassword123);
    const testAdmin = await bcrypt.compare('admin123', hashedPasswordAdmin);
    logger.log(`bcrypt 验证: 123456=${test123}, admin123=${testAdmin}`);

    const users = [
      {
        username: 'gogotb',
        password: hashedPassword123,
        plainPassword: '123456',
        realName: '系统管理员',
        teamCode: 'team2',
        role: 'admin',
        roles: ['admin', 'shore_crew_supervisor', 'ship_political_instructor', 'shore_marine_supervisor', 'shore_engineer_supervisor', 'shore_electric_supervisor', 'general_manager', 'company_admin'],
      },
      {
        username: 'supervisor',
        password: hashedPassword123,
        plainPassword: '123456',
        realName: '船舶政委',
        teamCode: 'team2',
        role: 'ship_political_instructor',
        roles: ['ship_political_instructor'],
      },
      {
        username: 'shore_crew',
        password: hashedPasswordAdmin,
        plainPassword: 'admin123',
        realName: '船工主管',
        teamCode: 'team2',
        role: 'shore_crew_supervisor',
        roles: ['shore_crew_supervisor'],
      },
      {
        username: 'ship_political',
        password: hashedPasswordAdmin,
        plainPassword: 'admin123',
        realName: '船舶政委',
        teamCode: 'team2',
        role: 'ship_political_instructor',
        roles: ['ship_political_instructor'],
      },
    ];

    for (const u of users) {
      try {
        const existing = await this.prisma.user.findUnique({
          where: { username: u.username },
        });

        if (existing) {
          const isPasswordValid = await bcrypt.compare(u.plainPassword, existing.password);
          if (isPasswordValid) {
            await this.prisma.user.update({
              where: { username: u.username },
              data: {
                realName: u.realName,
                teamCode: u.teamCode as any,
                role: u.role as any,
                roles: u.roles as any,
              },
            });
            logger.log(`${u.username}: 用户已存在，密码验证通过，跳过密码重置`);
          } else {
            await this.prisma.user.update({
              where: { username: u.username },
              data: {
                password: u.password,
                realName: u.realName,
                teamCode: u.teamCode as any,
                role: u.role as any,
                roles: u.roles as any,
                loginFailCount: 0,
                lockedUntil: null,
              },
            });
            const verifyAfterReset = await bcrypt.compare(u.plainPassword, u.password);
            logger.log(`${u.username}: 密码已损坏，强制重置密码，验证=${verifyAfterReset ? '通过' : '失败'}`);
          }
        } else {
          const result = await this.prisma.user.create({
            data: {
              username: u.username,
              password: u.password,
              realName: u.realName,
              teamCode: u.teamCode as any,
              role: u.role as any,
              roles: u.roles as any,
            },
          });

          const isPasswordValid = await bcrypt.compare(u.plainPassword, result.password);
          logger.log(`${u.username}: 新用户创建成功，密码验证=${isPasswordValid ? '通过' : '失败'}`);
        }
      } catch (error) {
        logger.log(`${u.username}: 失败 - ${error.message}`);
      }
    }

    logger.log('初始用户初始化完成');
    return { message: '测试用户密码已重置并验证' };
  }
}