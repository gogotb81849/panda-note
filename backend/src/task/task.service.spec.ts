import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { TeamCode, UserRole } from '@prisma/client';

describe('TaskService', () => {
  let service: TaskService;

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    schedule: {
      updateMany: jest.fn(),
    },
    // remove() 通过 $transaction 执行递归删除，需将回调以 tx 形式回放
    $transaction: jest.fn(async (cb: any) =>
      cb({
        schedule: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        task: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      }),
    ),
  };

  const mockOperationLogService = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应创建任务并记录操作日志', async () => {
      const dto = { title: '测试任务', priority: 'normal' };
      const mockResult = { id: 1, title: '测试任务', createdById: 1, teamCode: 'team2' };
      mockPrismaService.task.create.mockResolvedValue(mockResult);

      const result = await service.create(
        dto as any,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.id).toBe(1);
      expect(mockPrismaService.task.create).toHaveBeenCalled();
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: 'create',
          userId: 1,
          teamCode: TeamCode.team2,
        }),
      );
    });

    it('父任务不存在时应抛出 NotFoundException', async () => {
      const dto = { title: '子任务', parentId: 999 };
      mockPrismaService.task.findFirst.mockResolvedValue(null);

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.task.create).not.toHaveBeenCalled();
    });

    it('指派人不属于当前团队时应抛出 NotFoundException', async () => {
      const dto = { title: '任务', assignedToId: 5 };
      // 返回的用户属于 team1，与当前 team2 不一致
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 5, teamCode: 'team1' });

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.task.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('分页查询应返回 data/total/page/pageSize/totalPages', async () => {
      const mockData = [{ id: 1, title: '任务1' }, { id: 2, title: '任务2' }];
      mockPrismaService.task.findMany.mockResolvedValue(mockData);
      mockPrismaService.task.count.mockResolvedValue(25);

      const result: any = await service.findAll(1, TeamCode.team2, 2, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it('不分页时应返回数组', async () => {
      const mockData = [{ id: 1, title: '任务1' }];
      mockPrismaService.task.findMany.mockResolvedValue(mockData);

      const result: any = await service.findAll(1, TeamCode.team2);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  // 注：task.service.ts 中单条查询方法为 findById（控制器层 findOne 委托给它）
  describe('findById', () => {
    it('任务存在时应返回任务', async () => {
      const mockTask = {
        id: 1,
        title: '任务',
        teamCode: 'team2',
        createdBy: { id: 1, realName: '张三' },
        assignedTo: null,
        schedules: [],
        children: [],
      };
      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.findById(1, 1, TeamCode.team2);

      expect(result.id).toBe(1);
      expect(result.title).toBe('任务');
    });

    it('任务不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue(null);

      await expect(service.findById(999, 1, TeamCode.team2)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应成功更新任务', async () => {
      const existing = { id: 1, title: '旧标题', createdById: 1, assignedToId: null, teamCode: 'team2' };
      const updated = {
        id: 1,
        title: '新标题',
        createdById: 1,
        teamCode: 'team2',
        createdBy: { id: 1, realName: '张三' },
        assignedTo: null,
      };
      mockPrismaService.task.findFirst.mockResolvedValue(existing);
      mockPrismaService.task.update.mockResolvedValue(updated);

      const result = await service.update(
        1,
        { title: '新标题' } as any,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.title).toBe('新标题');
      expect(mockPrismaService.task.update).toHaveBeenCalled();
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ operationType: 'update' }),
      );
    });
  });

  describe('remove', () => {
    it('应删除任务并记录操作日志', async () => {
      const existing = { id: 1, title: '任务', createdById: 1, teamCode: 'team2' };
      mockPrismaService.task.findFirst.mockResolvedValue(existing);
      // collectIds 查询子任务时返回空数组（无子任务）
      mockPrismaService.task.findMany.mockResolvedValue([]);

      const result: any = await service.remove(1, 1, TeamCode.team2, UserRole.shore_crew_supervisor);

      expect(result.success).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ operationType: 'delete' }),
      );
    });
  });

  describe('getTree', () => {
    it('应返回层级任务结构', async () => {
      const flat = [
        { id: 1, parentId: null, title: '父任务', createdBy: { id: 1, realName: '张三' }, assignedTo: null },
        { id: 2, parentId: 1, title: '子任务1', createdBy: { id: 1, realName: '张三' }, assignedTo: null },
        { id: 3, parentId: 1, title: '子任务2', createdBy: { id: 1, realName: '张三' }, assignedTo: null },
        { id: 4, parentId: 2, title: '孙任务', createdBy: { id: 1, realName: '张三' }, assignedTo: null },
      ];
      mockPrismaService.task.findMany.mockResolvedValue(flat);

      const result: any = await service.getTree(1, TeamCode.team2);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].id).toBe(2);
      expect(result[0].children[0].children[0].id).toBe(4);
    });
  });

  // 注：task.service.ts 中不存在 updateSort(ids, teamCode) 批量排序方法，
  // 实际的排序更新方法为 reorder(id, newSortOrder, teamCode, role)（单条），
  // 此处覆盖排序更新能力。
  describe('reorder - 更新排序', () => {
    it('应更新任务排序', async () => {
      const existing = { id: 1, sortOrder: 0, teamCode: 'team2' };
      const updated = { id: 1, sortOrder: 5 };
      mockPrismaService.task.findFirst.mockResolvedValue(existing);
      mockPrismaService.task.update.mockResolvedValue(updated);

      const result: any = await service.reorder(
        1,
        5,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.sortOrder).toBe(5);
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { sortOrder: 5 },
      });
    });
  });
});
