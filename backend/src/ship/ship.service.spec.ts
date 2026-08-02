import { Test, TestingModule } from '@nestjs/testing';
import { ShipService } from './ship.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { ShipReportParseService } from '../ship-report-parse/ship-report-parse.service';
import { TeamCode } from '@prisma/client';

describe('ShipService', () => {
  let service: ShipService;

  const mockPrismaService = {
    ship: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockOperationLogService = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockShipReportParseService = {
    parseReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: OperationLogService, useValue: mockOperationLogService },
        { provide: ShipReportParseService, useValue: mockShipReportParseService },
      ],
    }).compile();

    service = module.get<ShipService>(ShipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('缓存命中时应返回缓存数据且不调用 Prisma', async () => {
      const cachedShips = [{ id: 1, cnShipName: '鲸鱼座' }];
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedShips));

      const result = await service.findAll(TeamCode.team2);

      expect(result).toEqual(cachedShips);
      expect(mockRedisService.get).toHaveBeenCalledWith('ships:team2');
      expect(mockPrismaService.ship.findMany).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('缓存未命中时应查询 Prisma 并缓存结果', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const dbShips = [{ id: 1, cnShipName: '鲸鱼座' }];
      mockPrismaService.ship.findMany.mockResolvedValue(dbShips);

      const result = await service.findAll(TeamCode.team2);

      expect(result).toEqual(dbShips);
      expect(mockPrismaService.ship.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
        orderBy: { cnShipName: 'asc' },
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'ships:team2',
        JSON.stringify(dbShips),
        300,
      );
    });

    it('应将正确的 teamCode 传递到 where 条件', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.ship.findMany.mockResolvedValue([]);

      await service.findAll(TeamCode.team1);

      const callArgs = mockPrismaService.ship.findMany.mock.calls[0][0];
      expect(callArgs.where).toEqual({ teamCode: TeamCode.team1 });
    });
  });

  describe('findOne - 状态解析', () => {
    it('应从 currentStatus 中的“修理”关键字解析为 repair 状态', async () => {
      const ship = { id: 1, cnShipName: '鲸鱼座', currentStatus: '修理', currentLocation: '' };
      mockPrismaService.ship.findUnique.mockResolvedValue(ship);

      const result: any = await service.findOne(1);

      expect(result.status).toBe('repair');
      expect(result.statusText).toBe('修理中');
    });

    it('应从 currentStatus 中的“靠泊”关键字解析为 berthed 状态', async () => {
      const ship = { id: 1, cnShipName: '鲸鱼座', currentStatus: '靠泊', currentLocation: '' };
      mockPrismaService.ship.findUnique.mockResolvedValue(ship);

      const result: any = await service.findOne(1);

      expect(result.status).toBe('berthed');
      expect(result.statusText).toBe('已靠泊');
    });

    it('应从 currentStatus 中的“锚泊”关键字解析为 anchored 状态', async () => {
      const ship = { id: 1, cnShipName: '鲸鱼座', currentStatus: '锚泊', currentLocation: '' };
      mockPrismaService.ship.findUnique.mockResolvedValue(ship);

      const result: any = await service.findOne(1);

      expect(result.status).toBe('anchored');
      expect(result.statusText).toBe('锚泊中');
    });

    it('无匹配关键字时应默认为 sailing 状态', async () => {
      const ship = { id: 1, cnShipName: '鲸鱼座', currentStatus: '', currentLocation: '' };
      mockPrismaService.ship.findUnique.mockResolvedValue(ship);

      const result: any = await service.findOne(1);

      expect(result.status).toBe('sailing');
      expect(result.statusText).toBe('航行中');
    });

    it('船舶不存在时应返回 null', async () => {
      mockPrismaService.ship.findUnique.mockResolvedValue(null);

      const result: any = await service.findOne(999);

      expect(result).toBeNull();
    });
  });
});
