import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const validUser = {
      id: 1,
      username: 'shore_crew',
      password: '$2b$10$hashedPassword',
      realName: '船工主管',
      teamCode: 'team2',
      role: 'shore_crew_supervisor',
    };

    it('用户不存在时应抛出 UnauthorizedException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'unknown', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('密码错误时应抛出 UnauthorizedException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(validUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ username: 'shore_crew', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('登录成功时应返回 access_token 和用户信息', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(validUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({
        username: 'shore_crew',
        password: 'admin123',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.username).toBe('shore_crew');
      expect(result.user.teamCode).toBe('team2');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: validUser.id,
        username: validUser.username,
        teamCode: validUser.teamCode,
        role: validUser.role,
      });
    });
  });

  describe('createInitialUsers', () => {
    it('应创建所有初始用户', async () => {
      const mockUser = { id: 1, username: 'test' };
      mockPrismaService.user.upsert.mockResolvedValue(mockUser);

      const result = await service.createInitialUsers();

      expect(mockPrismaService.user.upsert).toHaveBeenCalledTimes(4);
      expect(result).toHaveProperty('gogotb');
      expect(result).toHaveProperty('supervisor');
      expect(result).toHaveProperty('shoreCrewSupervisor');
      expect(result).toHaveProperty('shipPoliticalInstructor');
    });
  });
});
