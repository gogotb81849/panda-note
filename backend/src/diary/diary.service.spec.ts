import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { StaffAssignmentService } from '../staff-assignment/staff-assignment.service';
import { TeamCode, UserRole } from '@prisma/client';

describe('DiaryService', () => {
  let service: DiaryService;

  const mockPrismaService = {
    diary: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    diaryBlock: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ship: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    schedule: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    shipNote: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockOperationLogService = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockStaffAssignmentService = {
    getCurrentAssignment: jest.fn(),
    getHistoryAssignments: jest.fn(),
    isUserOnLeave: jest.fn(),
    isUserOnBoard: jest.fn(),
    getUserDiaryPermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiaryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
        { provide: StaffAssignmentService, useValue: mockStaffAssignmentService },
      ],
    }).compile();

    service = module.get<DiaryService>(DiaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应成功创建日记并记录操作日志', async () => {
      const dto = { date: '2026-01-01', content: '今天天气不错' };
      const mockDiary = {
        id: 1,
        date: new Date('2026-01-01'),
        content: '今天天气不错',
        teamCode: TeamCode.team2,
        userId: 1,
        shipId: null,
      };
      mockPrismaService.diary.findUnique.mockResolvedValue(null);
      mockPrismaService.ship.findMany.mockResolvedValue([]);
      mockPrismaService.diary.create.mockResolvedValue(mockDiary);

      const result = await service.create(dto as any, 1, TeamCode.team2);

      expect(result.id).toBe(1);
      expect(mockPrismaService.diary.create).toHaveBeenCalled();
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: '新增',
          userId: 1,
          teamCode: TeamCode.team2,
        }),
      );
    });

    it('应从内容中识别船名并关联船舶', async () => {
      const dto = { date: '2026-01-01', content: '远洋一号今天靠泊离港' };
      const createdDiary = {
        id: 1,
        date: new Date('2026-01-01'),
        content: '远洋一号今天靠泊离港',
        teamCode: TeamCode.team2,
        userId: 1,
        shipId: null,
      };
      const updatedDiary = {
        ...createdDiary,
        shipId: 1,
        shipName: '远洋一号',
      };
      mockPrismaService.diary.findUnique.mockResolvedValue(null);
      mockPrismaService.ship.findMany.mockResolvedValue([
        { id: 1, cnShipName: '远洋一号', enShipName: 'Ocean One' },
      ]);
      mockPrismaService.diary.create.mockResolvedValue(createdDiary);
      mockPrismaService.diary.update.mockResolvedValue(updatedDiary);
      // 政委角色：非岸基主管（syncDiaryToShipNotes 提前返回），是政委（syncDiaryToShipDynamic 继续）
      mockPrismaService.user.findUnique.mockResolvedValue({
        roles: [UserRole.ship_political_instructor],
      });
      mockPrismaService.ship.update.mockResolvedValue({});

      const result = await service.create(dto as any, 1, TeamCode.team2);

      expect(result.shipId).toBe(1);
      expect(result.shipName).toBe('远洋一号');
      expect(mockPrismaService.ship.findMany).toHaveBeenCalled();
      expect(mockPrismaService.diary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipId: 1,
            shipName: '远洋一号',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('不传日期参数时应返回日记数组', async () => {
      const mockDiaries = [
        { id: 1, content: '日记1', teamCode: TeamCode.team2, userId: 1 },
        { id: 2, content: '日记2', teamCode: TeamCode.team2, userId: 1 },
      ];
      mockPrismaService.diary.findMany.mockResolvedValue(mockDiaries);

      const result = await service.findAll(1, TeamCode.team2);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(mockPrismaService.diary.findMany).toHaveBeenCalledWith({
        where: { userId: 1, teamCode: TeamCode.team2 },
        orderBy: { date: 'desc' },
      });
    });

    it('传入日期范围时应正确过滤', async () => {
      mockPrismaService.diary.findMany.mockResolvedValue([]);

      await service.findAll(1, TeamCode.team2, '2026-01-01', '2026-12-31');

      const callArgs = mockPrismaService.diary.findMany.mock.calls[0][0];
      expect(callArgs.where.date).toBeDefined();
      expect(callArgs.where.date.gte).toBeInstanceOf(Date);
      expect(callArgs.where.date.lte).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('日记存在时应返回日记数据', async () => {
      const mockDiary = {
        id: 1,
        content: '日记内容',
        teamCode: TeamCode.team2,
        userId: 1,
      };
      mockPrismaService.diary.findFirst.mockResolvedValue(mockDiary);

      const result = await service.findById(1, 1, TeamCode.team2);

      expect(result.id).toBe(1);
      expect(mockPrismaService.diary.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1, teamCode: TeamCode.team2 },
      });
    });

    it('日记不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.diary.findFirst.mockResolvedValue(null);

      await expect(service.findById(999, 1, TeamCode.team2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('应成功修改日记并记录操作日志', async () => {
      const existingDiary = {
        id: 1,
        content: '原始内容',
        teamCode: TeamCode.team2,
        userId: 1,
        shipId: null,
      };
      const updatedDiary = {
        ...existingDiary,
        content: '更新后的内容',
      };
      mockPrismaService.diary.findFirst.mockResolvedValue(existingDiary);
      mockPrismaService.diary.update.mockResolvedValue(updatedDiary);
      mockPrismaService.ship.findMany.mockResolvedValue([]);
      // syncDiaryToShipDynamic 中 user 查询返回非政委角色，提前返回
      mockPrismaService.user.findUnique.mockResolvedValue({
        roles: [UserRole.shore_crew_supervisor],
      });

      const result = await service.update(
        1,
        { content: '更新后的内容' } as any,
        1,
        TeamCode.team2,
      );

      expect(result.content).toBe('更新后的内容');
      expect(mockPrismaService.diary.update).toHaveBeenCalled();
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ operationType: '修改' }),
      );
    });

    it('日记不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.diary.findFirst.mockResolvedValue(null);

      await expect(
        service.update(999, { content: 'test' } as any, 1, TeamCode.team2),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('应删除日记并记录操作日志', async () => {
      const mockDiary = {
        id: 1,
        content: '日记内容',
        teamCode: TeamCode.team2,
        userId: 1,
      };
      mockPrismaService.diary.findFirst.mockResolvedValue(mockDiary);
      mockPrismaService.diary.delete.mockResolvedValue({});

      const result = await service.remove(1, 1, TeamCode.team2);

      expect(result.success).toBe(true);
      expect(mockPrismaService.diary.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: '删除',
          userId: 1,
          teamCode: TeamCode.team2,
        }),
      );
    });

    it('日记不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.diary.findFirst.mockResolvedValue(null);

      await expect(service.remove(999, 1, TeamCode.team2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
