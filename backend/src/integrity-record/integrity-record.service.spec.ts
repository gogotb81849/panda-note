import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntegrityRecordService } from './integrity-record.service';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import {
  TeamCode,
  UserRole,
  IntegrityCategory,
  RiskLevel,
  InspectionType,
} from '@prisma/client';

describe('IntegrityRecordService', () => {
  let service: IntegrityRecordService;

  const mockPrismaService = {
    integrityRecord: {
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
        IntegrityRecordService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
      ],
    }).compile();

    service = module.get<IntegrityRecordService>(IntegrityRecordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('使用合法数据应成功创建廉洁监督记录', async () => {
      const dto = {
        category: IntegrityCategory.meal_fund,
        riskLevel: RiskLevel.medium,
        inspectionType: InspectionType.routine,
        inspectionDate: '2026-03-10',
        title: '伙食费使用情况检查',
        findings: '发现部分票据不规范',
        measures: '要求补齐相关票据',
      };
      const created = {
        id: 1,
        ...dto,
        inspectionDate: new Date('2026-03-10'),
        teamCode: TeamCode.team2,
        userId: 1,
        status: 'open',
      };
      mockPrismaService.integrityRecord.create.mockResolvedValue(created);

      const result = await service.create(
        dto as any,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.id).toBe(1);
      expect(result.status).toBe('open');
      expect(mockPrismaService.integrityRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: IntegrityCategory.meal_fund,
            riskLevel: RiskLevel.medium,
            inspectionType: InspectionType.routine,
            userId: 1,
            teamCode: TeamCode.team2,
            status: 'open',
          }),
        }),
      );
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          teamCode: TeamCode.team2,
          operationType: 'create',
          operationContent: '创建廉洁监督记录：伙食费使用情况检查',
        }),
      );
    });

    it('使用非法的监督类别应抛出 BadRequestException', async () => {
      const dto = {
        category: 'invalid_category',
        riskLevel: RiskLevel.medium,
        inspectionType: InspectionType.routine,
        inspectionDate: '2026-03-10',
        title: '检查',
        findings: '发现',
      };

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.integrityRecord.create).not.toHaveBeenCalled();
    });

    it('使用非法的风险等级应抛出 BadRequestException', async () => {
      const dto = {
        category: IntegrityCategory.meal_fund,
        riskLevel: 'invalid_risk',
        inspectionType: InspectionType.routine,
        inspectionDate: '2026-03-10',
        title: '检查',
        findings: '发现',
      };

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.integrityRecord.create).not.toHaveBeenCalled();
    });

    it('使用非法的检查类型应抛出 BadRequestException', async () => {
      const dto = {
        category: IntegrityCategory.meal_fund,
        riskLevel: RiskLevel.medium,
        inspectionType: 'invalid_inspection',
        inspectionDate: '2026-03-10',
        title: '检查',
        findings: '发现',
      };

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.integrityRecord.create).not.toHaveBeenCalled();
    });

    it('船舶不存在时应抛出 NotFoundException', async () => {
      const dto = {
        category: IntegrityCategory.meal_fund,
        riskLevel: RiskLevel.medium,
        inspectionType: InspectionType.routine,
        inspectionDate: '2026-03-10',
        title: '检查',
        findings: '发现',
        shipId: 999,
      };
      mockPrismaService.ship.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dto as any, 1, TeamCode.team2, UserRole.shore_crew_supervisor),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.ship.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
      expect(mockPrismaService.integrityRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('分页查询应返回正确的分页结构', async () => {
      const data = [
        { id: 1, title: '记录1', teamCode: TeamCode.team2 },
        { id: 2, title: '记录2', teamCode: TeamCode.team2 },
      ];
      mockPrismaService.integrityRecord.findMany.mockResolvedValue(data);
      mockPrismaService.integrityRecord.count.mockResolvedValue(7);

      const result = await service.findAll(
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
        2,
        2,
      );

      expect(result).toEqual({
        data,
        total: 7,
        page: 2,
        pageSize: 2,
        totalPages: 4,
      });
      expect(mockPrismaService.integrityRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 2, take: 2 }),
      );
      expect(mockPrismaService.integrityRecord.count).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('记录存在时应返回廉洁监督记录数据', async () => {
      const record = { id: 1, title: '记录', teamCode: TeamCode.team2, userId: 1 };
      mockPrismaService.integrityRecord.findFirst.mockResolvedValue(record);

      const result = await service.findById(1, 1, TeamCode.team2);

      expect(result.id).toBe(1);
      expect(mockPrismaService.integrityRecord.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, teamCode: TeamCode.team2 } }),
      );
    });

    it('记录不存在时应抛出 NotFoundException', async () => {
      mockPrismaService.integrityRecord.findFirst.mockResolvedValue(null);

      await expect(service.findById(999, 1, TeamCode.team2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('应成功修改廉洁监督记录', async () => {
      const existing = {
        id: 1,
        title: '原标题',
        teamCode: TeamCode.team2,
        userId: 1,
      };
      const updated = { ...existing, title: '新标题', findings: '新发现' };
      mockPrismaService.integrityRecord.findFirst.mockResolvedValue(existing);
      mockPrismaService.integrityRecord.update.mockResolvedValue(updated);

      const result = await service.update(
        1,
        { title: '新标题', findings: '新发现' } as any,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.title).toBe('新标题');
      expect(result.findings).toBe('新发现');
      expect(mockPrismaService.integrityRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { title: '新标题', findings: '新发现' },
        }),
      );
    });
  });

  describe('remove', () => {
    it('应成功删除廉洁监督记录并记录操作日志', async () => {
      const existing = {
        id: 1,
        title: '记录',
        teamCode: TeamCode.team2,
        userId: 1,
      };
      mockPrismaService.integrityRecord.findFirst.mockResolvedValue(existing);
      mockPrismaService.integrityRecord.delete.mockResolvedValue({});

      const result = await service.remove(
        1,
        1,
        TeamCode.team2,
        UserRole.shore_crew_supervisor,
      );

      expect(result.success).toBe(true);
      expect(mockPrismaService.integrityRecord.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockOperationLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          teamCode: TeamCode.team2,
          operationType: 'delete',
          operationContent: '删除廉洁监督记录：记录',
        }),
      );
    });
  });
});
