import { Test, TestingModule } from '@nestjs/testing';
import { BlockClassifierService } from './block-classifier.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiaryBlockType, TeamCode } from '@prisma/client';

describe('BlockClassifierService', () => {
  let service: BlockClassifierService;

  const mockPrismaService = {
    ship: {
      findMany: jest.fn(),
    },
    diaryBlockClassificationLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockClassifierService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BlockClassifierService>(BlockClassifierService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyType', () => {
    it('包含待办关键词时应建议 todo 类型', () => {
      const result = service.classifyType('需要完成待办任务');

      expect(result.suggested).toBe(DiaryBlockType.todo);
      expect(result.todoScore).toBeGreaterThan(result.memoScore);
      expect(result.todoScore).toBeGreaterThan(result.diaryScore);
    });

    it('包含备忘关键词时应建议 memo 类型', () => {
      const result = service.classifyType('提醒备忘注意事项');

      expect(result.suggested).toBe(DiaryBlockType.memo);
      expect(result.memoScore).toBeGreaterThan(result.todoScore);
      expect(result.memoScore).toBeGreaterThan(result.diaryScore);
    });

    it('包含日记关键词时应建议 diary 类型', () => {
      const result = service.classifyType('今天上午会议讨论靠泊离港');

      expect(result.suggested).toBe(DiaryBlockType.diary);
      expect(result.diaryScore).toBeGreaterThan(result.todoScore);
      expect(result.diaryScore).toBeGreaterThan(result.memoScore);
    });

    it('空字符串应返回默认 diary 类型', () => {
      const result = service.classifyType('');

      expect(result.suggested).toBe(DiaryBlockType.diary);
      expect(result.todoScore).toBe(0);
      expect(result.memoScore).toBe(0);
      expect(result.diaryScore).toBe(0);
    });

    it('中性内容（无关键词命中）应返回默认 diary 类型', () => {
      const result = service.classifyType('你好世界');

      expect(result.suggested).toBe(DiaryBlockType.diary);
    });
  });

  describe('detectShip', () => {
    it('内容中包含船名时应返回匹配的船舶', async () => {
      mockPrismaService.ship.findMany.mockResolvedValue([
        { id: 1, name: '远洋一号', shortName: '远洋', shipCode: 'YY01' },
        { id: 2, name: '长江二号', shortName: '长江', shipCode: 'CJ02' },
      ]);

      const result = await service.detectShip('今天远洋一号靠泊离港', TeamCode.team2);

      expect(result).toEqual({ id: 1, name: '远洋一号' });
      expect(mockPrismaService.ship.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
        select: { id: true, name: true, shortName: true, shipCode: true },
      });
    });

    it('内容中不包含任何船名时应返回 null', async () => {
      mockPrismaService.ship.findMany.mockResolvedValue([
        { id: 1, name: '远洋一号', shortName: '远洋', shipCode: 'YY01' },
      ]);

      const result = await service.detectShip('今天天气不错', TeamCode.team2);

      expect(result).toBeNull();
    });

    it('内容为空字符串时应返回 null', async () => {
      const result = await service.detectShip('', TeamCode.team2);

      expect(result).toBeNull();
    });

    it('应返回得分最高的船舶匹配', async () => {
      mockPrismaService.ship.findMany.mockResolvedValue([
        { id: 1, name: '远洋一号', shortName: '远洋', shipCode: 'YY01' },
        { id: 2, name: '长江', shortName: '长', shipCode: 'CJ02' },
      ]);

      // 远洋一号：name 命中(+10) + shortName 命中(+8) = 18
      // 长江：name 命中(+10) = 10
      const result = await service.detectShip('远洋一号和长江今天靠泊', TeamCode.team2);

      expect(result).toEqual({ id: 1, name: '远洋一号' });
    });
  });

  describe('retrainWeights', () => {
    it('日志少于10条时不应重新训练权重', async () => {
      mockPrismaService.diaryBlockClassificationLog.findMany.mockResolvedValue([]);

      const result = await service.retrainWeights(1, TeamCode.team2);

      expect(result).toBeUndefined();
      expect(mockPrismaService.diaryBlockClassificationLog.findMany).toHaveBeenCalledWith({
        where: { userId: 1, teamCode: TeamCode.team2 },
        take: 500,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('日志刚好5条时也不应重新训练权重', async () => {
      const mockLogs = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        teamCode: TeamCode.team2,
        aiSuggested: DiaryBlockType.diary,
        userCorrected: DiaryBlockType.todo,
        content: '需要完成任务',
        createdAt: new Date(),
      }));
      mockPrismaService.diaryBlockClassificationLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.retrainWeights(1, TeamCode.team2);

      expect(result).toBeUndefined();
    });
  });
});
