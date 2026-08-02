import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole, ScheduleStatus } from '@prisma/client';

describe('ScheduleService', () => {
  let service: ScheduleService;

  const mockPrismaService = {
    schedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    publicCase: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    diaryScheduleRelation: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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

  describe('create', () => {
    it('应创建日程并记录操作日志', async () => {
      const createDto = {
        recordDate: '2026-06-08',
        shipId: 1,
        firstType: '航行安全',
        secondType: '安全检查',
        eventDetail: '测试事件',
        finishStatus: ScheduleStatus.pending,
      };

      const mockResult = { id: 1, ...createDto, teamCode: 'team2' };
      mockPrismaService.schedule.create.mockResolvedValue(mockResult);

      const result = await service.create(
        createDto as any,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.id).toBe(1);
      expect(mockPrismaService.schedule.create).toHaveBeenCalled();
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: '新增',
          userId: 1,
          teamCode: TeamCode.team2,
        }),
      );
    });
  });

  describe('findAll - 无分页', () => {
    it('应返回全部数据', async () => {
      const mockData = [{ id: 1, teamCode: 'team2' }];
      mockPrismaService.schedule.findMany.mockResolvedValue(mockData);

      const result = await service.findAll(TeamCode.team2, UserRole.shore_crew_supervisor);

      expect(Array.isArray(result)).toBe(true);
      expect(mockPrismaService.schedule.findMany).toHaveBeenCalled();
    });
  });

  describe('findAll - 分页查询', () => {
    it('应返回分页数据和元信息', async () => {
      const mockData = [{ id: 1, teamCode: 'team2' }];
      mockPrismaService.schedule.findMany.mockResolvedValue(mockData);
      mockPrismaService.schedule.count.mockResolvedValue(25);

      const result = await service.findAll(
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
        undefined,
        undefined,
        1,
        10,
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 25);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 10);
      expect(result).toHaveProperty('totalPages', 3);
      expect(mockPrismaService.schedule.count).toHaveBeenCalled();
    });

    it('日期范围查询应正确传入 where 条件', async () => {
      mockPrismaService.schedule.findMany.mockResolvedValue([]);

      await service.findAll(
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
        '2026-01-01',
        '2026-12-31',
      );

      const callArgs = mockPrismaService.schedule.findMany.mock.calls[0][0];
      expect(callArgs.where.recordDate).toBeDefined();
      expect(callArgs.where.recordDate.gte).toBeInstanceOf(Date);
    });
  });

  describe('findOne', () => {
    it('日程存在时应返回日程数据', async () => {
      const mockSchedule = { id: 1, teamCode: 'team2', firstType: '航行安全' };
      mockPrismaService.schedule.findFirst.mockResolvedValue(mockSchedule);

      const result = await service.findOne(1, TeamCode.team2);

      expect(result.id).toBe(1);
    });

    it('日程不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.schedule.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, TeamCode.team2)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('更新普通日程应记录操作日志', async () => {
      const existingSchedule = {
        id: 1,
        teamCode: 'team2',
        finishStatus: ScheduleStatus.pending,
        firstType: '航行安全',
        secondType: '安全检查',
      };
      const updatedSchedule = {
        ...existingSchedule,
        finishStatus: ScheduleStatus.in_progress,
      };

      mockPrismaService.schedule.findFirst.mockResolvedValue(existingSchedule);
      mockPrismaService.schedule.update.mockResolvedValue(updatedSchedule);

      const updateDto = { finishStatus: ScheduleStatus.in_progress };
      const result = await service.update(1, updateDto as any, 1, TeamCode.team2);

      expect(result.finishStatus).toBe(ScheduleStatus.in_progress);
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ operationType: '修改' }),
      );
    });

    it('工单办结时应自动生成脱敏公共案例', async () => {
      const existingSchedule = {
        id: 1,
        teamCode: 'team2',
        finishStatus: ScheduleStatus.pending,
        firstType: '航行安全',
        secondType: '安全检查',
      };
      const completedSchedule = {
        ...existingSchedule,
        finishStatus: ScheduleStatus.completed,
        eventDetail: '远洋1号航行中发现安全隐患，张三负责排查，李四记录',
        ship: { cnShipName: '远洋1号' },
        assignedTo: { realName: '张三' },
        createdBy: { realName: '李四' },
      };

      mockPrismaService.schedule.findFirst.mockResolvedValue(existingSchedule);
      mockPrismaService.schedule.update.mockResolvedValue(completedSchedule);
      mockPrismaService.publicCase.findFirst.mockResolvedValue(null);
      mockPrismaService.publicCase.create.mockResolvedValue({});

      const updateDto = { finishStatus: ScheduleStatus.completed };
      await service.update(1, updateDto as any, 1, TeamCode.team2);

      expect(mockPrismaService.publicCase.create).toHaveBeenCalled();
      const createArgs = mockPrismaService.publicCase.create.mock.calls[0][0];
      // 验证脱敏：案例内容不应包含原始船名
      expect(createArgs.data.caseContent).not.toContain('远洋1号');
      expect(createArgs.data.caseContent).toContain('某船');
    });
  });

  describe('remove', () => {
    it('删除日程应记录操作日志', async () => {
      const mockSchedule = {
        id: 1,
        teamCode: 'team2',
        firstType: '航行安全',
        secondType: '安全检查',
      };
      mockPrismaService.schedule.findFirst.mockResolvedValue(mockSchedule);
      mockPrismaService.schedule.delete.mockResolvedValue({});

      await service.remove(1, 1, TeamCode.team2);

      expect(mockPrismaService.schedule.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ operationType: '删除' }),
      );
    });
  });
});
