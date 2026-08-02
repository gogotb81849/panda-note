import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, ScheduleStatus } from '@prisma/client';

describe('ScheduleService - 统计', () => {
  let service: ScheduleService;

  const mockPrismaService = {
    schedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    publicCase: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockOperationLogService = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyStats', () => {
    it('应按 firstType/secondType 正确分组返回分类统计', async () => {
      const schedules = [
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.completed,
          shipId: 1,
          ship: { cnShipName: '远洋1号' },
          createdById: 1,
          assignedToId: 2,
        },
        {
          firstType: '航行安全',
          secondType: '设备维护',
          finishStatus: ScheduleStatus.pending,
          shipId: 2,
          ship: { cnShipName: '远洋2号' },
          createdById: 1,
          assignedToId: null,
        },
      ];
      mockPrismaService.schedule.findMany.mockResolvedValue(schedules);

      const result = await service.getDailyStats(TeamCode.team2, '2026-08-01');

      expect(result).toHaveLength(2);
      const checkGroup = result.find((r) => r.categorySecond === '安全检查');
      const maintainGroup = result.find((r) => r.categorySecond === '设备维护');
      expect(checkGroup).toBeDefined();
      expect(checkGroup!.categoryFirst).toBe('航行安全');
      expect(maintainGroup).toBeDefined();
      expect(maintainGroup!.categoryFirst).toBe('航行安全');
    });

    it('应正确统计 completed/inProgress/pending 数量', async () => {
      const schedules = [
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.completed,
          shipId: 1,
          ship: { cnShipName: '远洋1号' },
          createdById: 1,
          assignedToId: 2,
        },
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.completed,
          shipId: 1,
          ship: { cnShipName: '远洋1号' },
          createdById: 3,
          assignedToId: 2,
        },
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.in_progress,
          shipId: 2,
          ship: { cnShipName: '远洋2号' },
          createdById: 1,
          assignedToId: 4,
        },
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.pending,
          shipId: 3,
          ship: { cnShipName: '远洋3号' },
          createdById: 5,
          assignedToId: 2,
        },
      ];
      mockPrismaService.schedule.findMany.mockResolvedValue(schedules);

      const result = await service.getDailyStats(TeamCode.team2, '2026-08-01');

      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry.total).toBe(4);
      expect(entry.completed).toBe(2);
      expect(entry.inProgress).toBe(1);
      expect(entry.pending).toBe(1);
      expect(entry.completionRate).toBe(0.5);
    });

    it('应跟踪涉及的 shipIds 与 shipNames', async () => {
      const schedules = [
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.completed,
          shipId: 1,
          ship: { cnShipName: '远洋1号' },
          createdById: 1,
          assignedToId: 2,
        },
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.pending,
          shipId: 2,
          ship: { cnShipName: '远洋2号' },
          createdById: 1,
          assignedToId: 2,
        },
        {
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.in_progress,
          shipId: 1,
          ship: { cnShipName: '远洋1号' },
          createdById: 3,
          assignedToId: 2,
        },
      ];
      mockPrismaService.schedule.findMany.mockResolvedValue(schedules);

      const result = await service.getDailyStats(TeamCode.team2, '2026-08-01');

      const entry = result[0];
      expect(entry.shipCount).toBe(2);
      expect(entry.shipNames).toHaveLength(2);
      expect(entry.shipNames).toEqual(expect.arrayContaining(['远洋1号', '远洋2号']));
      expect(entry.involvedUserIds).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('当日无日程时应返回空数组', async () => {
      mockPrismaService.schedule.findMany.mockResolvedValue([]);

      const result = await service.getDailyStats(TeamCode.team2, '2026-08-01');

      expect(result).toEqual([]);
    });
  });

  // 注：schedule.service.ts 中并不存在 getMonthlyStats(teamCode, year, month) 方法，
  // 与"月度统计汇总"语义最接近的是 getTrendStats(teamCode, startDate, endDate)，
  // 它按日期范围返回每日趋势统计，下面以一个月范围覆盖该能力。
  describe('getTrendStats - 月度统计汇总', () => {
    it('应返回指定月份的每日趋势统计汇总', async () => {
      const schedules = [
        {
          recordDate: new Date('2026-01-01'),
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.completed,
        },
        {
          recordDate: new Date('2026-01-01'),
          firstType: '航行安全',
          secondType: '安全检查',
          finishStatus: ScheduleStatus.pending,
        },
        {
          recordDate: new Date('2026-01-15'),
          firstType: '设备管理',
          secondType: '维修',
          finishStatus: ScheduleStatus.completed,
        },
      ];
      mockPrismaService.schedule.findMany.mockResolvedValue(schedules);

      const result = await service.getTrendStats(TeamCode.team2, '2026-01-01', '2026-01-31');

      expect(result).toHaveLength(2);
      const day1 = result.find((r) => r.date === '2026-01-01');
      const day15 = result.find((r) => r.date === '2026-01-15');
      expect(day1).toBeDefined();
      expect(day1!.total).toBe(2);
      expect(day1!.completed).toBe(1);
      expect(day1!.completionRate).toBe(0.5);
      expect(day15).toBeDefined();
      expect(day15!.total).toBe(1);
      expect(day15!.completed).toBe(1);
    });
  });
});
