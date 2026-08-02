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

describe('SyncService 冲突检测', () => {
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

  // 复用：将 schedule 的现有记录查询 mock 为返回指定记录，
  // 而 getServerData 末尾的 findMany（按 updatedAt 查询）仍返回空数组。
  function setupScheduleExisting(existingRecords: any[]) {
    mockPrismaService.schedule.findMany.mockImplementation(({ where }: any) => {
      if (where.id && where.id.in) {
        return Promise.resolve(existingRecords);
      }
      return Promise.resolve([]);
    });
  }

  it('当服务端记录更新时间晚于客户端时，应标记为冲突', async () => {
    const clientUpdatedAt = '2026-01-01T00:00:00.000Z';
    const serverUpdatedAt = new Date('2026-06-01T00:00:00.000Z');
    setupScheduleExisting([
      { id: 1, eventDetail: '服务端版本', updatedAt: serverUpdatedAt },
    ]);

    const clientData = {
      schedules: [
        { id: 1, localId: 's1', eventDetail: '客户端版本', updatedAt: clientUpdatedAt },
      ],
    };

    const result = await service.syncData(1, TeamCode.team2, clientData);

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].storeName).toBe('schedules');
    // 冲突时不应执行写入
    expect(mockPrismaService.schedule.update).not.toHaveBeenCalled();
    expect(mockPrismaService.schedule.create).not.toHaveBeenCalled();
  });

  it('当客户端记录更新时间晚于服务端时，应接受客户端版本', async () => {
    const clientUpdatedAt = '2026-06-01T00:00:00.000Z';
    const serverUpdatedAt = new Date('2026-01-01T00:00:00.000Z');
    setupScheduleExisting([
      { id: 1, eventDetail: '服务端版本', updatedAt: serverUpdatedAt },
    ]);
    mockPrismaService.schedule.update.mockResolvedValue({
      id: 1,
      eventDetail: '客户端版本',
      updatedAt: new Date(),
    });

    const clientData = {
      schedules: [
        { id: 1, localId: 's1', eventDetail: '客户端版本', updatedAt: clientUpdatedAt },
      ],
    };

    const result = await service.syncData(1, TeamCode.team2, clientData);

    expect(result.conflicts).toHaveLength(0);
    expect(mockPrismaService.schedule.update).toHaveBeenCalled();
    expect(mockPrismaService.schedule.create).not.toHaveBeenCalled();
  });

  it('当客户端与服务端更新时间相等时，不应视为冲突', async () => {
    const equalTime = '2026-06-01T00:00:00.000Z';
    setupScheduleExisting([
      { id: 1, eventDetail: '服务端版本', updatedAt: new Date(equalTime) },
    ]);
    mockPrismaService.schedule.update.mockResolvedValue({
      id: 1,
      eventDetail: '客户端版本',
      updatedAt: new Date(),
    });

    const clientData = {
      schedules: [
        { id: 1, localId: 's1', eventDetail: '客户端版本', updatedAt: equalTime },
      ],
    };

    const result = await service.syncData(1, TeamCode.team2, clientData);

    expect(result.conflicts).toHaveLength(0);
    expect(mockPrismaService.schedule.update).toHaveBeenCalled();
  });

  it('应检测并返回多个冲突', async () => {
    setupScheduleExisting([
      { id: 1, eventDetail: 'A-server', updatedAt: new Date('2026-06-01T00:00:00.000Z') },
      { id: 2, eventDetail: 'B-server', updatedAt: new Date('2026-06-01T00:00:00.000Z') },
      { id: 3, eventDetail: 'C-server', updatedAt: new Date('2026-06-01T00:00:00.000Z') },
    ]);

    const clientData = {
      schedules: [
        { id: 1, localId: 's1', eventDetail: 'A', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 2, localId: 's2', eventDetail: 'B', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 3, localId: 's3', eventDetail: 'C', updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
    };

    const result = await service.syncData(1, TeamCode.team2, clientData);

    expect(result.conflicts).toHaveLength(3);
    expect(result.conflicts.map((c: any) => c.recordId)).toEqual([1, 2, 3]);
    expect(mockPrismaService.schedule.update).not.toHaveBeenCalled();
  });

  it('冲突响应应包含 storeName、recordId、serverUpdatedAt、clientUpdatedAt', async () => {
    const clientUpdatedAt = '2026-01-01T00:00:00.000Z';
    const serverUpdatedAt = new Date('2026-06-01T00:00:00.000Z');
    setupScheduleExisting([
      { id: 1, eventDetail: '服务端版本', updatedAt: serverUpdatedAt },
    ]);

    const clientData = {
      schedules: [
        { id: 1, localId: 's1', eventDetail: '客户端版本', updatedAt: clientUpdatedAt },
      ],
    };

    const result = await service.syncData(1, TeamCode.team2, clientData);

    expect(result.conflicts).toHaveLength(1);
    const conflict = result.conflicts[0];
    expect(conflict.storeName).toBe('schedules');
    expect(conflict.recordId).toBe(1);
    expect(conflict.serverUpdatedAt).toBe(serverUpdatedAt.toISOString());
    expect(conflict.clientUpdatedAt).toBe(new Date(clientUpdatedAt).toISOString());
  });
});