import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PartyActivityService } from './party-activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole, PartyActivityType } from '@prisma/client';

describe('PartyActivityService', () => {
  let service: PartyActivityService;

  const mockPrismaService = {
    partyActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    ship: {
      findUnique: jest.fn(),
    },
  };

  const mockOperationLogService = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartyActivityService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
      ],
    }).compile();

    service = module.get<PartyActivityService>(PartyActivityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('使用合法数据应成功创建党建活动并记录操作日志', async () => {
      const dto = {
        activityType: PartyActivityType.branch_meeting,
        title: '第一季度支部党员大会',
        activityDate: '2026-03-15',
        attendees: [{ name: '张三' }, { name: '李四' }],
        agenda: '讨论年度工作计划',
      };
      const created = {
        id: 1,
        activityType: PartyActivityType.branch_meeting,
        title: '第一季度支部党员大会',
        activityDate: new Date('2026-03-15'),
        attendeeCount: 2,
        teamCode: TeamCode.team2,
        createdById: 1,
      };
      mockPrismaService.partyActivity.create.mockResolvedValue(created);

      const result = await service.create(
        dto as any,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.id).toBe(1);
      expect(result.attendeeCount).toBe(2);
      expect(mockPrismaService.partyActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activityType: PartyActivityType.branch_meeting,
            attendeeCount: 2,
            createdById: 1,
            teamCode: TeamCode.team2,
          }),
        }),
      );
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          teamCode: TeamCode.team2,
          operationType: 'create',
          operationContent: '创建党建活动：第一季度支部党员大会',
        }),
      );
    });

    it('使用非法的活动类型应抛出 BadRequestException', async () => {
      const dto = {
        activityType: 'invalid_type',
        title: '非法活动',
        activityDate: '2026-03-15',
        attendees: [{ name: '张三' }],
        agenda: '议程',
      };

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.partyActivity.create).not.toHaveBeenCalled();
      expect(mockOperationLogService.create).not.toHaveBeenCalled();
    });

    it('船舶不存在时应抛出 NotFoundException', async () => {
      const dto = {
        activityType: PartyActivityType.branch_meeting,
        title: '活动',
        activityDate: '2026-03-15',
        shipId: 999,
        attendees: [{ name: '张三' }],
        agenda: '议程',
      };
      mockPrismaService.ship.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.ship.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
      expect(mockPrismaService.partyActivity.create).not.toHaveBeenCalled();
    });

    it('船舶不属于当前团队时应抛出 NotFoundException', async () => {
      const dto = {
        activityType: PartyActivityType.branch_meeting,
        title: '活动',
        activityDate: '2026-03-15',
        shipId: 5,
        attendees: [{ name: '张三' }],
        agenda: '议程',
      };
      mockPrismaService.ship.findUnique.mockResolvedValue({ id: 5, teamCode: TeamCode.team1 });

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.partyActivity.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('分页查询应返回 {data, total, page, pageSize, totalPages} 结构', async () => {
      const data = [
        { id: 1, title: '活动1', teamCode: TeamCode.team2 },
        { id: 2, title: '活动2', teamCode: TeamCode.team2 },
      ];
      mockPrismaService.partyActivity.findMany.mockResolvedValue(data);
      mockPrismaService.partyActivity.count.mockResolvedValue(5);

      const result = await service.findAll(
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
        1,
        2,
      );

      expect(result).toEqual({
        data,
        total: 5,
        page: 1,
        pageSize: 2,
        totalPages: 3,
      });
      expect(mockPrismaService.partyActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 2 }),
      );
      expect(mockPrismaService.partyActivity.count).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('记录存在时应返回党建活动数据', async () => {
      const activity = { id: 1, title: '活动', teamCode: TeamCode.team2 };
      mockPrismaService.partyActivity.findFirst.mockResolvedValue(activity);

      const result = await service.findById(1, 1, TeamCode.team2);

      expect(result.id).toBe(1);
      expect(mockPrismaService.partyActivity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, teamCode: TeamCode.team2 } }),
      );
    });

    it('记录不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.partyActivity.findFirst.mockResolvedValue(null);

      await expect(service.findById(999, 1, TeamCode.team2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('应成功修改党建活动并记录操作日志', async () => {
      const existing = {
        id: 1,
        title: '原标题',
        teamCode: TeamCode.team2,
        createdById: 1,
      };
      const updated = { ...existing, title: '新标题' };
      mockPrismaService.partyActivity.findFirst.mockResolvedValue(existing);
      mockPrismaService.partyActivity.update.mockResolvedValue(updated);

      const result = await service.update(
        1,
        { title: '新标题' } as any,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.title).toBe('新标题');
      expect(mockPrismaService.partyActivity.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { title: '新标题' } }),
      );
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          teamCode: TeamCode.team2,
          operationType: 'update',
          operationContent: '更新党建活动：新标题',
        }),
      );
    });
  });

  describe('remove', () => {
    it('应成功删除党建活动并记录操作日志', async () => {
      const existing = {
        id: 1,
        title: '活动',
        teamCode: TeamCode.team2,
        createdById: 1,
      };
      mockPrismaService.partyActivity.findFirst.mockResolvedValue(existing);
      mockPrismaService.partyActivity.delete.mockResolvedValue({});

      const result = await service.remove(
        1,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.success).toBe(true);
      expect(mockPrismaService.partyActivity.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          teamCode: TeamCode.team2,
          operationType: 'delete',
          operationContent: '删除党建活动：活动',
        }),
      );
    });
  });
});
