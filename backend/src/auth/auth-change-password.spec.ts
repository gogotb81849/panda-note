import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService - changePassword', () => {
  let service: AuthService;
  let prisma: PrismaService;

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
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validUser = {
    id: 1,
    username: 'shore_crew',
    password: '$2a$10$hashedPassword',
    realName: '船工主管',
    teamCode: 'team2',
    role: 'shore_crew_supervisor',
    passwordChanged: false,
  };

  it('当前密码正确且新密码有效时应成功修改密码', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(validUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashedPassword' as never);
    mockPrismaService.user.update.mockResolvedValue({
      ...validUser,
      password: 'newHashedPassword',
      passwordChanged: true,
    });

    const result = await service.changePassword('shore_crew', 'admin123', 'newpass123');

    expect(result).toEqual({ message: '密码已修改' });
    expect(bcrypt.compare).toHaveBeenCalledWith('admin123', validUser.password);
    expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
    expect(mockPrismaService.user.update).toHaveBeenCalledWith({
      where: { id: validUser.id },
      data: { password: 'newHashedPassword', passwordChanged: true },
    });
  });

  it('用户不存在时应抛出 NotFoundException', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      service.changePassword('unknown', 'admin123', 'newpass123'),
    ).rejects.toThrow(NotFoundException);
    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
  });

  it('当前密码错误时应抛出 BadRequestException', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(validUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      service.changePassword('shore_crew', 'wrongpassword', 'newpass123'),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
  });

  it('新密码少于6位时应抛出 BadRequestException', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(validUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    await expect(
      service.changePassword('shore_crew', 'admin123', '12345'),
    ).rejects.toThrow(BadRequestException);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
  });

  it('修改密码时应将 passwordChanged 标志设置为 true', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(validUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashedPassword' as never);
    mockPrismaService.user.update.mockResolvedValue({
      ...validUser,
      password: 'newHashedPassword',
      passwordChanged: true,
    });

    await service.changePassword('shore_crew', 'admin123', 'newpass123');

    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordChanged: true }),
      }),
    );
  });
});
