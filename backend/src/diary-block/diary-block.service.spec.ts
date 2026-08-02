import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DiaryBlockService } from './diary-block.service';
import { BlockClassifierService } from './block-classifier.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiaryBlockType, TeamCode } from '@prisma/client';

describe('DiaryBlockService', () => {
  let service: DiaryBlockService;

  const mockPrismaService = {
    diary: {
      findUnique: jest.fn(),
    },
    diaryBlock: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    schedule: {
      create: jest.fn(),
    },
  };

  const mockClassifier = {
    classifyType: jest.fn(),
    detectShip: jest.fn(),
    retrainWeights: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiaryBlockService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BlockClassifierService, useValue: mockClassifier },
      ],
    }).compile();

    service = module.get<DiaryBlockService>(DiaryBlockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByDiaryId', () => {
    it('应返回按 sortOrder 排序的块列表', async () => {
      const mockDiary = { id: 1, teamCode: TeamCode.team2 };
      const mockBlocks = [
        { id: 1, diaryId: 1, sortOrder: 0, content: '块1' },
        { id: 2, diaryId: 1, sortOrder: 1, content: '块2' },
      ];
      mockPrismaService.diary.findUnique.mockResolvedValue(mockDiary);
      mockPrismaService.diaryBlock.findMany.mockResolvedValue(mockBlocks);

      const result = await service.findByDiaryId(1, 1, TeamCode.team2);

      expect(result).toEqual(mockBlocks);
      expect(mockPrismaService.diaryBlock.findMany).toHaveBeenCalledWith({
        where: { diaryId: 1 },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
    });

    it('日记不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.diary.findUnique.mockResolvedValue(null);

      await expect(service.findByDiaryId(999, 1, TeamCode.team2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('teamCode 不匹配时应抛出 ForbiddenException', async () => {
      const mockDiary = { id: 1, teamCode: TeamCode.team1 };
      mockPrismaService.diary.findUnique.mockResolvedValue(mockDiary);

      await expect(service.findByDiaryId(1, 1, TeamCode.team2)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('teamCode 匹配时应返回块数据', async () => {
      const mockBlock = {
        id: 1,
        diaryId: 1,
        teamCode: TeamCode.team2,
        blockType: DiaryBlockType.diary,
        content: '日记内容',
      };
      mockPrismaService.diaryBlock.findUnique.mockResolvedValue(mockBlock);

      const result = await service.findOne(1, 1, TeamCode.team2);

      expect(result).toEqual(mockBlock);
      expect(mockPrismaService.diaryBlock.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('块不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.diaryBlock.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, 1, TeamCode.team2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('teamCode 不匹配时应抛出 ForbiddenException', async () => {
      const mockBlock = { id: 1, teamCode: TeamCode.team1, content: '内容' };
      mockPrismaService.diaryBlock.findUnique.mockResolvedValue(mockBlock);

      await expect(service.findOne(1, 1, TeamCode.team2)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    const mockDiary = {
      id: 1,
      teamCode: TeamCode.team2,
      userId: 1,
      date: new Date('2026-01-01'),
      shipId: null,
    };

    it('指定 blockType 时应跳过 AI 分类', async () => {
      const dto = { diaryId: 1, blockType: 'memo', content: '备忘内容' };
      mockPrismaService.diary.findUnique.mockResolvedValue(mockDiary);
      mockPrismaService.diaryBlock.aggregate.mockResolvedValue({
        _max: { sortOrder: null },
      });
      mockClassifier.detectShip.mockResolvedValue(null);
      mockPrismaService.diaryBlock.create.mockResolvedValue({
        id: 1,
        ...dto,
        blockType: DiaryBlockType.memo,
      });

      const result = await service.create(dto as any, 1, TeamCode.team2);

      expect(result.id).toBe(1);
      expect(mockClassifier.classifyType).not.toHaveBeenCalled();
      expect(mockPrismaService.diaryBlock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            blockType: DiaryBlockType.memo,
            aiSuggested: DiaryBlockType.memo,
          }),
        }),
      );
    });

    it('未指定 blockType 时应使用 AI 分类器', async () => {
      const dto = { diaryId: 1, content: '需要完成待办任务' };
      mockPrismaService.diary.findUnique.mockResolvedValue(mockDiary);
      mockPrismaService.diaryBlock.aggregate.mockResolvedValue({
        _max: { sortOrder: 2 },
      });
      mockClassifier.classifyType.mockReturnValue({
        suggested: DiaryBlockType.todo,
        todoScore: 8.5,
        memoScore: 0,
        diaryScore: 0,
      });
      mockClassifier.detectShip.mockResolvedValue(null);
      mockPrismaService.schedule.create.mockResolvedValue({ id: 100 });
      mockPrismaService.diaryBlock.create.mockResolvedValue({
        id: 1,
        blockType: DiaryBlockType.todo,
        content: '需要完成待办任务',
        scheduleId: 100,
      });

      const result = await service.create(dto as any, 1, TeamCode.team2);

      expect(mockClassifier.classifyType).toHaveBeenCalledWith('需要完成待办任务');
      expect(result.blockType).toBe(DiaryBlockType.todo);
      expect(mockPrismaService.diaryBlock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            blockType: DiaryBlockType.todo,
            aiSuggested: DiaryBlockType.todo,
            sortOrder: 3,
          }),
        }),
      );
    });

    it('创建 todo 块时应自动创建关联 Schedule', async () => {
      const dto = { diaryId: 1, blockType: 'todo', content: '需要完成任务' };
      mockPrismaService.diary.findUnique.mockResolvedValue(mockDiary);
      mockPrismaService.diaryBlock.aggregate.mockResolvedValue({
        _max: { sortOrder: null },
      });
      mockClassifier.detectShip.mockResolvedValue(null);
      mockPrismaService.schedule.create.mockResolvedValue({ id: 200 });
      mockPrismaService.diaryBlock.create.mockResolvedValue({
        id: 1,
        blockType: DiaryBlockType.todo,
        content: '需要完成任务',
        scheduleId: 200,
      });

      const result = await service.create(dto as any, 1, TeamCode.team2);

      expect(mockPrismaService.schedule.create).toHaveBeenCalled();
      const scheduleCallArgs = mockPrismaService.schedule.create.mock.calls[0][0];
      expect(scheduleCallArgs.data).toEqual(
        expect.objectContaining({
          teamCode: TeamCode.team2,
          createdById: 1,
          firstType: '待办事项',
          secondType: '日记流转',
          title: '需要完成任务',
          finishStatus: 'pending',
        }),
      );
      expect(mockPrismaService.diaryBlock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduleId: 200,
            todoStatus: 'pending',
          }),
        }),
      );
      expect(result.scheduleId).toBe(200);
    });
  });
});
