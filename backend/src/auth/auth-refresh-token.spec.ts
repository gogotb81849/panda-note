import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as jwt from 'jsonwebtoken';
import { TeamCode } from '@prisma/client';

describe('AuthService - refreshToken', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockRedisService = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const validUser = {
    id: 1,
    username: 'shore_crew',
    password: 'hashed',
    realName: '船工主管',
    teamCode: TeamCode.team2,
    role: 'shore_crew_supervisor',
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('有效的 refresh token 时应返回新的 token', async () => {
    const decoded = {
      sub: 1,
      username: 'shore_crew',
      teamCode: 'team2',
      role: 'shore_crew_supervisor',
    };
    jest.spyOn(jwt, 'verify').mockReturnValue(decoded as never);
    mockRedisService.get.mockResolvedValue('valid-refresh-token');
    mockPrismaService.user.findUnique.mockResolvedValue(validUser);

    const result = await service.refreshToken('valid-refresh-token');

    expect(result.access_token).toBe('mock-token');
    expect(result.refresh_token).toBe('mock-token');
    expect(result.user.id).toBe(1);
    expect(result.user.username).toBe('shore_crew');
    expect(mockRedisService.get).toHaveBeenCalledWith('refresh_token:1');
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('无效的 JWT 时应抛出 UnauthorizedException', async () => {
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('invalid token');
    });

    await expect(service.refreshToken('invalid-jwt')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockRedisService.get).not.toHaveBeenCalled();
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('token 不在 Redis 中时应抛出 UnauthorizedException', async () => {
    const decoded = {
      sub: 1,
      username: 'shore_crew',
      teamCode: 'team2',
      role: 'shore_crew_supervisor',
    };
    jest.spyOn(jwt, 'verify').mockReturnValue(decoded as never);
    mockRedisService.get.mockResolvedValue(null);

    await expect(service.refreshToken('some-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('token 与 Redis 中存储的不匹配时应抛出 UnauthorizedException', async () => {
    const decoded = {
      sub: 1,
      username: 'shore_crew',
      teamCode: 'team2',
      role: 'shore_crew_supervisor',
    };
    jest.spyOn(jwt, 'verify').mockReturnValue(decoded as never);
    mockRedisService.get.mockResolvedValue('different-stored-token');

    await expect(service.refreshToken('some-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('用户不存在时应抛出 UnauthorizedException', async () => {
    const decoded = {
      sub: 999,
      username: 'unknown',
      teamCode: 'team2',
      role: 'shore_crew_supervisor',
    };
    jest.spyOn(jwt, 'verify').mockReturnValue(decoded as never);
    mockRedisService.get.mockResolvedValue('valid-refresh-token');
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.refreshToken('valid-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('缺少 JWT_SECRET 环境变量时应抛出 UnauthorizedException', async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    await expect(service.refreshToken('any-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwt.verify).not.toHaveBeenCalled();

    process.env.JWT_SECRET = originalSecret;
  });
});
