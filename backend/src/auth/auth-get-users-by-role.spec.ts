import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TeamCode } from '@prisma/client';

describe('AuthService - getUsersByRole', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
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
  };

  const normalUser = {
    id: 2,
    username: 'shore_crew',
    password: 'hashed',
    realName: '船工主管',
    teamCode: TeamCode.team2,
    role: 'shore_crew_supervisor',
  };

  it('管理员用户应成功返回按角色分组的用户', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(adminUser);
    const users = [
      {
        id: 1,
        username: 'gogotb',
        realName: '系统管理员',
        role: 'admin',
        teamCode: TeamCode.team2,
      },
      {
        id: 2,
        username: 'shore_crew',
        realName: '船工主管',
        role: 'shore_crew_supervisor',
        teamCode: TeamCode.team2,
      },
    ];
    mockPrismaService.user.findMany.mockResolvedValue(users);

    const result = await service.getUsersByRole(1);

    expect(result).toHaveProperty('admin');
    expect(result).toHaveProperty('shore_crew_supervisor');
    expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        teamCode: true,
      },
      orderBy: [{ role: 'asc' }, { realName: 'asc' }],
    });
  });

  it('非管理员用户应抛出 ForbiddenException', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(normalUser);

    await expect(service.getUsersByRole(2)).rejects.toThrow(ForbiddenException);
    expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
  });

  it('用户列表为空时应返回空对象', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(adminUser);
    mockPrismaService.user.findMany.mockResolvedValue([]);

    const result = await service.getUsersByRole(1);

    expect(result).toEqual({});
  });

  it('用户应按角色正确分组', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(adminUser);
    const users = [
      {
        id: 1,
        username: 'gogotb',
        realName: '系统管理员',
        role: 'admin',
        teamCode: TeamCode.team2,
      },
      {
        id: 2,
        username: 'shore_crew',
        realName: '船工主管',
        role: 'shore_crew_supervisor',
        teamCode: TeamCode.team2,
      },
      {
        id: 3,
        username: 'shore_crew2',
        realName: '船工主管2',
        role: 'shore_crew_supervisor',
        teamCode: TeamCode.team2,
      },
    ];
    mockPrismaService.user.findMany.mockResolvedValue(users);

    const result = await service.getUsersByRole(1);

    expect(Object.keys(result).sort()).toEqual(['admin', 'shore_crew_supervisor']);
    expect(result.admin).toHaveLength(1);
    expect(result.shore_crew_supervisor).toHaveLength(2);
    expect(result.shore_crew_supervisor[0]).toEqual({
      id: 2,
      username: 'shore_crew',
      realName: '船工主管',
      teamCode: TeamCode.team2,
    });
    expect(result.admin[0]).toEqual({
      id: 1,
      username: 'gogotb',
      realName: '系统管理员',
      teamCode: TeamCode.team2,
    });
  });
});
