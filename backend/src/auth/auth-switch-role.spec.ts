import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TeamCode } from '@prisma/client';

describe('AuthService - switchRole', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

  beforeEach(async () => {
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

  const adminUser = {
    id: 1,
    username: 'gogotb',
    password: 'hashed',
    realName: '系统管理员',
    teamCode: TeamCode.team2,
    role: 'admin',
    roles: ['admin', 'shore_crew_supervisor'],
  };

  const normalUser = {
    id: 2,
    username: 'shore_crew',
    password: 'hashed',
    realName: '船工主管',
    teamCode: TeamCode.team2,
    role: 'shore_crew_supervisor',
    roles: ['shore_crew_supervisor'],
  };

  const targetUser = {
    id: 3,
    username: 'supervisor',
    password: 'hashed',
    realName: '船舶政委',
    teamCode: TeamCode.team2,
    role: 'ship_political_instructor',
    roles: ['ship_political_instructor'],
  };

  it('管理员切换到目标用户时应成功并返回目标用户的 token', async () => {
    mockPrismaService.user.findUnique
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce(targetUser);

    const result = await service.switchRole(1, 'ship_political_instructor', 3);

    expect(result.access_token).toBe('mock-token');
    expect(result.refresh_token).toBe('mock-token');
    expect(result.user.id).toBe(targetUser.id);
    expect(result.user.username).toBe('supervisor');
    expect(result.user.role).toBe('ship_political_instructor');
    expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    expect(mockRedisService.set).toHaveBeenCalledWith(
      `refresh_token:${targetUser.id}`,
      'mock-token',
      7 * 24 * 60 * 60,
    );
  });

  it('非管理员尝试切换到其他用户时应抛出 ForbiddenException', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(normalUser);

    await expect(
      service.switchRole(2, 'ship_political_instructor', 3),
    ).rejects.toThrow(ForbiddenException);
    expect(mockJwtService.sign).not.toHaveBeenCalled();
  });

  it('目标用户不存在时应抛出 UnauthorizedException', async () => {
    mockPrismaService.user.findUnique
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce(null);

    await expect(
      service.switchRole(1, 'ship_political_instructor', 999),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockJwtService.sign).not.toHaveBeenCalled();
  });

  it('切换到自己的角色时应成功并更新用户角色', async () => {
    const multiRoleUser = {
      ...normalUser,
      roles: ['shore_crew_supervisor', 'ship_political_instructor'],
    };
    mockPrismaService.user.findUnique.mockResolvedValueOnce(multiRoleUser);
    const updatedUser = { ...multiRoleUser, role: 'ship_political_instructor' };
    mockPrismaService.user.update.mockResolvedValue(updatedUser);

    const result = await service.switchRole(2, 'ship_political_instructor');

    expect(result.access_token).toBe('mock-token');
    expect(result.user.role).toBe('ship_political_instructor');
    expect(result.user.id).toBe(2);
    expect(mockPrismaService.user.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { role: 'ship_political_instructor' },
    });
  });

  it('切换到无权的角色时应抛出 ForbiddenException', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(normalUser);

    await expect(
      service.switchRole(2, 'admin'),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    expect(mockJwtService.sign).not.toHaveBeenCalled();
  });
});
