import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

function createMockPrismaService() {
  const modelNames = [
    'ship',
    'schedule',
    'staffHistory',
    'sopFlow',
    'publicCase',
    'dictCategory',
    'diary',
    'standardTaskTemplate',
    'publishTemplate',
    'partyActivity',
    'integrityRecord',
    'officerProfile',
    'thoughtReport',
    'experience',
  ];
  const mock: any = {};
  for (const name of modelNames) {
    mock[name] = {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
  }
  // $transaction 把回调以同一个 mock 作为 tx 传入，便于复用同一组 mock
  mock.$transaction = jest.fn((cb: any) => cb(mock));
  return mock;
}

describe('SyncService', () => {
  let service: SyncService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<SyncService>(SyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getFullData', () => {
    it('应以正确的 teamCode 过滤条件调用全部 14 个 Prisma 模型', async () => {
      await service.getFullData(1, TeamCode.team2);

      // 11 个带 teamCode 过滤的模型
      expect(mockPrismaService.ship.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.schedule.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.staffHistory.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.dictCategory.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.diary.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.standardTaskTemplate.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.publishTemplate.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.partyActivity.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.integrityRecord.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.officerProfile.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });
      expect(mockPrismaService.thoughtReport.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2 },
      });

      // 3 个不带 teamCode 过滤的全局模型
      expect(mockPrismaService.sopFlow.findMany).toHaveBeenCalledWith();
      expect(mockPrismaService.publicCase.findMany).toHaveBeenCalledWith();
      expect(mockPrismaService.experience.findMany).toHaveBeenCalledWith();
    });

    it('应在响应对象中返回全部数据类型', async () => {
      const ships = [{ id: 1, cnShipName: '船A' }];
      const schedules = [{ id: 1, eventDetail: '日程1' }];
      const staffHistory = [{ id: 1, name: '张三' }];
      const sopFlow = [{ id: 1, flowName: '流程1' }];
      const publicCase = [{ id: 1, caseName: '案件1' }];
      const dict = [{ id: 1, categoryName: '分类1' }];
      const diaries = [{ id: 1, content: '日记1' }];
      const standardTaskTemplates = [{ id: 1, templateName: '标准任务模板1' }];
      const publishTemplates = [{ id: 1, templateName: '发布模板1' }];
      const partyActivities = [{ id: 1, activityName: '党建活动1' }];
      const integrityRecords = [{ id: 1, recordName: '廉政记录1' }];
      const officerProfiles = [{ id: 1, officerName: '干部1' }];
      const thoughtReports = [{ id: 1, reportTitle: '思想汇报1' }];
      const experiences = [{ id: 1, experienceTitle: '经验1' }];

      mockPrismaService.ship.findMany.mockResolvedValue(ships);
      mockPrismaService.schedule.findMany.mockResolvedValue(schedules);
      mockPrismaService.staffHistory.findMany.mockResolvedValue(staffHistory);
      mockPrismaService.sopFlow.findMany.mockResolvedValue(sopFlow);
      mockPrismaService.publicCase.findMany.mockResolvedValue(publicCase);
      mockPrismaService.dictCategory.findMany.mockResolvedValue(dict);
      mockPrismaService.diary.findMany.mockResolvedValue(diaries);
      mockPrismaService.standardTaskTemplate.findMany.mockResolvedValue(standardTaskTemplates);
      mockPrismaService.publishTemplate.findMany.mockResolvedValue(publishTemplates);
      mockPrismaService.partyActivity.findMany.mockResolvedValue(partyActivities);
      mockPrismaService.integrityRecord.findMany.mockResolvedValue(integrityRecords);
      mockPrismaService.officerProfile.findMany.mockResolvedValue(officerProfiles);
      mockPrismaService.thoughtReport.findMany.mockResolvedValue(thoughtReports);
      mockPrismaService.experience.findMany.mockResolvedValue(experiences);

      const result = await service.getFullData(1, TeamCode.team2);

      expect(result.ships).toBe(ships);
      expect(result.schedules).toBe(schedules);
      expect(result.staffHistory).toBe(staffHistory);
      expect(result.sopFlow).toBe(sopFlow);
      expect(result.publicCase).toBe(publicCase);
      expect(result.dict).toBe(dict);
      expect(result.diaries).toBe(diaries);
      expect(result.standardTaskTemplates).toBe(standardTaskTemplates);
      expect(result.publishTemplates).toBe(publishTemplates);
      expect(result.partyActivities).toBe(partyActivities);
      expect(result.integrityRecords).toBe(integrityRecords);
      expect(result.officerProfiles).toBe(officerProfiles);
      expect(result.thoughtReports).toBe(thoughtReports);
      expect(result.experiences).toBe(experiences);
      expect(result.syncTime).toEqual(expect.any(Number));
    });

    it('应记录正确的汇总数量日志', async () => {
      mockPrismaService.ship.findMany.mockResolvedValue([1, 2, 3]);
      mockPrismaService.schedule.findMany.mockResolvedValue([1, 2]);
      mockPrismaService.diary.findMany.mockResolvedValue([1, 2, 3, 4, 5]);
      mockPrismaService.staffHistory.findMany.mockResolvedValue([1]);

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.getFullData(1, TeamCode.team2);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('船舶3'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('日程2'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('日记5'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('人员1'));
    });
  });

  describe('getIncrementalData', () => {
    it('应以 updatedAt > lastSyncTime 过滤记录', async () => {
      const lastSyncTime = 1700000000000;

      await service.getIncrementalData(1, TeamCode.team2, lastSyncTime, []);

      const expectedDate = new Date(lastSyncTime);

      // 带 teamCode 的模型应同时携带 teamCode 与 updatedAt 过滤
      expect(mockPrismaService.ship.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2, updatedAt: { gt: expectedDate } },
      });
      expect(mockPrismaService.schedule.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2, updatedAt: { gt: expectedDate } },
      });
      expect(mockPrismaService.diary.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2, updatedAt: { gt: expectedDate } },
      });
      expect(mockPrismaService.dictCategory.findMany).toHaveBeenCalledWith({
        where: { teamCode: TeamCode.team2, updatedAt: { gt: expectedDate } },
      });

      // 不带 teamCode 的全局模型仅过滤 updatedAt
      expect(mockPrismaService.sopFlow.findMany).toHaveBeenCalledWith({
        where: { updatedAt: { gt: expectedDate } },
      });
      expect(mockPrismaService.publicCase.findMany).toHaveBeenCalledWith({
        where: { updatedAt: { gt: expectedDate } },
      });
      expect(mockPrismaService.experience.findMany).toHaveBeenCalledWith({
        where: { updatedAt: { gt: expectedDate } },
      });
    });

    it('应仅返回发生变更的记录', async () => {
      const changedShips = [{ id: 1, cnShipName: '变更船' }];
      mockPrismaService.ship.findMany.mockResolvedValue(changedShips);
      // 其余模型保持 factory 默认返回空数组

      const result = await service.getIncrementalData(
        1,
        TeamCode.team2,
        1700000000000,
        [],
      );

      expect(result.ships).toEqual(changedShips);
      // 没有变更的 store 不应出现在结果中
      expect(result.schedules).toBeUndefined();
      expect(result.diaries).toBeUndefined();
      expect(result.totalChanges).toBe(1);
      expect(result.storesChanged).toEqual(['ships']);
    });
  });

  describe('batchSync (syncData)', () => {
    it('应处理多种实体类型', async () => {
      const clientData = {
        schedules: [
          { id: 1, localId: 's1', eventDetail: '日程1', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
        ships: [
          { id: 2, localId: 's2', cnShipName: '船A', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
        diaries: [
          { id: 3, localId: 's3', content: '日记1', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
      };

      // 现有记录查询返回空数组 → 全部走 create 分支
      mockPrismaService.schedule.create.mockResolvedValue({ id: 1, eventDetail: '日程1' });
      mockPrismaService.ship.create.mockResolvedValue({ id: 2, cnShipName: '船A' });
      mockPrismaService.diary.create.mockResolvedValue({ id: 3, content: '日记1' });

      const result = await service.syncData(1, TeamCode.team2, clientData);

      expect(mockPrismaService.schedule.create).toHaveBeenCalled();
      expect(mockPrismaService.ship.create).toHaveBeenCalled();
      expect(mockPrismaService.diary.create).toHaveBeenCalled();
      expect(result.conflicts).toEqual([]);
    });

    it('应能优雅处理空数据', async () => {
      const result = await service.syncData(1, TeamCode.team2, {});

      expect(result.conflicts).toEqual([]);
      expect(mockPrismaService.schedule.create).not.toHaveBeenCalled();
      expect(mockPrismaService.ship.create).not.toHaveBeenCalled();
      expect(mockPrismaService.diary.create).not.toHaveBeenCalled();
      expect(mockPrismaService.schedule.update).not.toHaveBeenCalled();
    });

    it('当服务端 updatedAt 晚于客户端时应检测到冲突', async () => {
      const clientData = {
        schedules: [
          { id: 1, localId: 's1', eventDetail: '客户端版本', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
      };

      // 现有记录查询返回更新时间更新的服务端记录
      mockPrismaService.schedule.findMany.mockImplementation(({ where }: any) => {
        if (where.id && where.id.in) {
          return Promise.resolve([
            {
              id: 1,
              eventDetail: '服务端版本',
              updatedAt: new Date('2026-06-01T00:00:00.000Z'),
            },
          ]);
        }
        // getServerData 调用返回空数组
        return Promise.resolve([]);
      });

      const result = await service.syncData(1, TeamCode.team2, clientData);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].storeName).toBe('schedules');
      // 冲突时不应执行 update / create
      expect(mockPrismaService.schedule.update).not.toHaveBeenCalled();
      expect(mockPrismaService.schedule.create).not.toHaveBeenCalled();
    });
  });
});
