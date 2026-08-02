import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { Priority } from '@prisma/client';

describe('ScheduleService - 公共案例脱敏', () => {
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

  // generatePublicCase 为私有方法，此处通过反射直接调用以覆盖脱敏逻辑
  const buildCompletedSchedule = () => ({
    id: 10,
    firstType: '航行安全',
    secondType: '安全检查',
    priority: Priority.urgent_important,
    eventDetail: '2026-01-01 远洋1号在航行中发现隐患，张三负责排查，李四记录处置过程',
    ship: { cnShipName: '远洋1号' },
    assignedTo: { realName: '张三' },
    createdBy: { realName: '李四' },
  });

  describe('generatePublicCase', () => {
    it('办结工单应生成脱敏公共案例并将船名替换为某船', async () => {
      const schedule = buildCompletedSchedule();
      mockPrismaService.publicCase.findFirst.mockResolvedValue(null);
      mockPrismaService.publicCase.create.mockResolvedValue({});

      await (service as any).generatePublicCase(schedule);

      expect(mockPrismaService.publicCase.create).toHaveBeenCalled();
      const args = mockPrismaService.publicCase.create.mock.calls[0][0];
      expect(args.data.fromRecordId).toBe(10);
      expect(args.data.caseType).toBe('航行安全');
      expect(args.data.caseContent).toContain('某船');
      expect(args.data.caseContent).toContain('【处置状态】已办结');
    });

    it('已存在公共案例时不应重复生成', async () => {
      const schedule = buildCompletedSchedule();
      mockPrismaService.publicCase.findFirst.mockResolvedValue({ id: 99, fromRecordId: 10 });

      await (service as any).generatePublicCase(schedule);

      expect(mockPrismaService.publicCase.findFirst).toHaveBeenCalledWith({
        where: { fromRecordId: 10 },
      });
      expect(mockPrismaService.publicCase.create).not.toHaveBeenCalled();
    });

    it('案例内容不应包含原始船名', async () => {
      const schedule = buildCompletedSchedule();
      mockPrismaService.publicCase.findFirst.mockResolvedValue(null);
      mockPrismaService.publicCase.create.mockResolvedValue({});

      await (service as any).generatePublicCase(schedule);

      const args = mockPrismaService.publicCase.create.mock.calls[0][0];
      expect(args.data.caseContent).not.toContain('远洋1号');
    });

    it('案例内容不应包含船员姓名', async () => {
      const schedule = buildCompletedSchedule();
      mockPrismaService.publicCase.findFirst.mockResolvedValue(null);
      mockPrismaService.publicCase.create.mockResolvedValue({});

      await (service as any).generatePublicCase(schedule);

      const args = mockPrismaService.publicCase.create.mock.calls[0][0];
      expect(args.data.caseContent).not.toContain('张三');
      expect(args.data.caseContent).not.toContain('李四');
      // 姓名应被替换为脱敏占位符
      expect(args.data.caseContent).toContain('相关人员');
      expect(args.data.caseContent).toContain('记录人');
    });
  });
});
