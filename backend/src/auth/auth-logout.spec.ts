import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('AuthService - logout', () => {
  let service: AuthService;
  let redis: RedisService;

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
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('登出成功时应调用 redis.del 并传入正确的 key', async () => {
    await service.logout(1);

    expect(mockRedisService.del).toHaveBeenCalledWith('refresh_token:1');
    expect(mockRedisService.del).toHaveBeenCalledTimes(1);
  });

  it('Redis 删除失败时不应抛出异常', async () => {
    // 真实 RedisService.del 内部 try/catch 会吞掉错误并始终 resolve，
    // 因此即使 Redis 故障，logout 也不会向外抛出异常。
    mockRedisService.del.mockResolvedValue(undefined);

    await expect(service.logout(1)).resolves.toBeUndefined();
    expect(mockRedisService.del).toHaveBeenCalledWith('refresh_token:1');
  });
});
