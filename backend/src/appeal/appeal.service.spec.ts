import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode, AppealStatusV2 } from '@prisma/client';

describe('AppealService', () => {
  let service: AppealService;

  const mockPrismaService = {
    crewAppeal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    appealStatusTransition: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppealService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AppealService>(AppealService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const data = {
      teamCode: TeamCode.team2,
      crewId: 10,
      crewName: '王船员',
      shipId: 1,
      shipName: '远洋一号',
      title: '伙食问题反馈',
      content: '近期伙食质量下降',
      category: 'meal',
    };

    it('应创建诉求并设置初始状态为 pending', async () => {
      const created = { id: 1, ...data, status: 'pending', priority: 'normal' };
      mockPrismaService.crewAppeal.create.mockResolvedValue(created);
      mockPrismaService.appealStatusTransition.create.mockResolvedValue({});

      const result = await service.create(data);

      expect(result.id).toBe(1);
      expect(result.status).toBe('pending');
      expect(mockPrismaService.crewAppeal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            priority: 'normal',
            teamCode: TeamCode.team2,
            crewId: 10,
            crewName: '王船员',
          }),
        }),
      );
    });

    it('应记录初始状态流转（null → pending）', async () => {
      mockPrismaService.crewAppeal.create.mockResolvedValue({
        id: 1,
        ...data,
        status: 'pending',
      });
      mockPrismaService.appealStatusTransition.create.mockResolvedValue({});

      await service.create(data);

      expect(mockPrismaService.appealStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appealId: 1,
            fromStatus: null,
            toStatus: 'pending',
            action: 'submit',
            operatorId: 10,
            operatorName: '王船员',
            operatorRole: 'ship',
          }),
        }),
      );
    });
  });

  describe('transitionStatus', () => {
    const operator = {
      operatorId: 99,
      operatorName: '李主管',
      operatorRole: 'supervisor',
    };

    it('pending → accepted 应为合法流转', async () => {
      mockPrismaService.crewAppeal.findFirst.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.pending,
        statusTransitions: [],
      });
      mockPrismaService.crewAppeal.update.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.accepted,
      });

      const result = await (service as any).transitionStatus(
        1,
        TeamCode.team2,
        AppealStatusV2.accepted,
        'accept',
        operator,
      );

      expect(result.status).toBe(AppealStatusV2.accepted);
      expect(mockPrismaService.crewAppeal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: AppealStatusV2.accepted },
        }),
      );
      expect(mockPrismaService.appealStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appealId: 1,
            fromStatus: AppealStatusV2.pending,
            toStatus: AppealStatusV2.accepted,
            action: 'accept',
          }),
        }),
      );
    });

    it('pending → resolved 应为非法流转，应抛出 BadRequestException', async () => {
      mockPrismaService.crewAppeal.findFirst.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.pending,
        statusTransitions: [],
      });

      await expect(
        (service as any).transitionStatus(
          1,
          TeamCode.team2,
          AppealStatusV2.resolved,
          'resolve',
          operator,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.crewAppeal.update).not.toHaveBeenCalled();
      expect(mockPrismaService.appealStatusTransition.create).not.toHaveBeenCalled();
    });

    it('closed → accepted 应为非法流转（终态），应抛出 BadRequestException', async () => {
      mockPrismaService.crewAppeal.findFirst.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.closed,
        statusTransitions: [],
      });

      await expect(
        (service as any).transitionStatus(
          1,
          TeamCode.team2,
          AppealStatusV2.accepted,
          'accept',
          operator,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.crewAppeal.update).not.toHaveBeenCalled();
    });

    it('rejected → accepted 应为合法流转（可重新受理）', async () => {
      mockPrismaService.crewAppeal.findFirst.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.rejected,
        statusTransitions: [],
      });
      mockPrismaService.crewAppeal.update.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.accepted,
      });

      const result = await (service as any).transitionStatus(
        1,
        TeamCode.team2,
        AppealStatusV2.accepted,
        'accept',
        operator,
      );

      expect(result.status).toBe(AppealStatusV2.accepted);
      expect(mockPrismaService.crewAppeal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: AppealStatusV2.accepted },
        }),
      );
      expect(mockPrismaService.appealStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: AppealStatusV2.rejected,
            toStatus: AppealStatusV2.accepted,
          }),
        }),
      );
    });

    it('escalated → processing 应为合法流转', async () => {
      mockPrismaService.crewAppeal.findFirst.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.escalated,
        statusTransitions: [],
      });
      mockPrismaService.crewAppeal.update.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.processing,
      });

      const result = await (service as any).transitionStatus(
        1,
        TeamCode.team2,
        AppealStatusV2.processing,
        'process',
        operator,
      );

      expect(result.status).toBe(AppealStatusV2.processing);
      expect(mockPrismaService.crewAppeal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: AppealStatusV2.processing },
        }),
      );
      expect(mockPrismaService.appealStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: AppealStatusV2.escalated,
            toStatus: AppealStatusV2.processing,
          }),
        }),
      );
    });

    it('escalated → resolved 应为合法流转', async () => {
      mockPrismaService.crewAppeal.findFirst.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.escalated,
        statusTransitions: [],
      });
      mockPrismaService.crewAppeal.update.mockResolvedValue({
        id: 1,
        status: AppealStatusV2.resolved,
      });

      const result = await (service as any).transitionStatus(
        1,
        TeamCode.team2,
        AppealStatusV2.resolved,
        'resolve',
        operator,
      );

      expect(result.status).toBe(AppealStatusV2.resolved);
      expect(mockPrismaService.crewAppeal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: AppealStatusV2.resolved },
        }),
      );
      expect(mockPrismaService.appealStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: AppealStatusV2.escalated,
            toStatus: AppealStatusV2.resolved,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('应返回指定团队的诉求列表', async () => {
      const appeals = [
        { id: 1, title: '诉求1', teamCode: TeamCode.team2, status: 'pending' },
        { id: 2, title: '诉求2', teamCode: TeamCode.team2, status: 'accepted' },
      ];
      mockPrismaService.crewAppeal.findMany.mockResolvedValue(appeals);

      const result = await service.findAll(TeamCode.team2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(mockPrismaService.crewAppeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teamCode: TeamCode.team2 },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应返回诉求详情及其状态流转历史', async () => {
      const appeal = {
        id: 1,
        title: '诉求1',
        teamCode: TeamCode.team2,
        status: 'accepted',
        statusTransitions: [
          { id: 1, fromStatus: null, toStatus: 'pending', action: 'submit' },
          { id: 2, fromStatus: 'pending', toStatus: 'accepted', action: 'accept' },
        ],
      };
      mockPrismaService.crewAppeal.findFirst.mockResolvedValue(appeal);

      const result = await service.findOne(1, TeamCode.team2);

      expect(result.id).toBe(1);
      expect(result.statusTransitions).toHaveLength(2);
      expect(mockPrismaService.crewAppeal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, teamCode: TeamCode.team2 },
        }),
      );
    });
  });
});
