import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

export interface CreateVersionDto {
  teamCode: TeamCode;
  entityType: string;
  entityId: number;
  snapshot: any;
  changes?: any;
  changeSummary?: string;
  userId: number;
  userName: string;
}

export interface VersionDiffResult {
  versionA: number;
  versionB: number;
  additions: Record<string, any>;
  deletions: Record<string, any>;
  modifications: Record<string, { old: any; new: any }>;
}

@Injectable()
export class VersionHistoryService {
  private readonly logger = new Logger(VersionHistoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建新版本记录，自动递增版本号
   */
  async createVersion(dto: CreateVersionDto) {
    const { teamCode, entityType, entityId, snapshot, changes, changeSummary, userId, userName } = dto;

    // 获取当前最新版本号
    const latest = await this.prisma.versionHistory.findFirst({
      where: { teamCode, entityType, entityId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = latest ? latest.version + 1 : 1;

    return this.prisma.versionHistory.create({
      data: {
        teamCode,
        entityType,
        entityId,
        version: nextVersion,
        snapshot,
        changes: changes || {},
        changeSummary: changeSummary || '',
        userId,
        userName,
      },
    });
  }

  /**
   * 获取实体的所有版本，按版本号降序排列
   */
  async getVersions(teamCode: TeamCode, entityType: string, entityId: number) {
    return this.prisma.versionHistory.findMany({
      where: { teamCode, entityType, entityId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * 获取指定版本
   */
  async getVersion(teamCode: TeamCode, entityType: string, entityId: number, version: number) {
    const record = await this.prisma.versionHistory.findFirst({
      where: { teamCode, entityType, entityId, version },
    });

    if (!record) {
      throw new NotFoundException('指定版本不存在');
    }

    return record;
  }

  /**
   * 恢复到指定版本：基于旧版本快照创建新版本
   */
  async restoreVersion(
    teamCode: TeamCode,
    entityType: string,
    entityId: number,
    version: number,
    userId: number,
    userName: string,
  ) {
    const source = await this.getVersion(teamCode, entityType, entityId, version);

    return this.createVersion({
      teamCode,
      entityType,
      entityId,
      snapshot: source.snapshot,
      changes: { restoredFrom: version },
      changeSummary: `恢复至版本 ${version}`,
      userId,
      userName,
    });
  }

  /**
   * 比较两个版本的差异
   */
  async diffVersions(
    teamCode: TeamCode,
    entityType: string,
    entityId: number,
    versionA: number,
    versionB: number,
  ): Promise<VersionDiffResult> {
    const [recordA, recordB] = await Promise.all([
      this.getVersion(teamCode, entityType, entityId, versionA),
      this.getVersion(teamCode, entityType, entityId, versionB),
    ]);

    const snapshotA: Record<string, any> = (recordA.snapshot as Record<string, any>) || {};
    const snapshotB: Record<string, any> = (recordB.snapshot as Record<string, any>) || {};

    const additions: Record<string, any> = {};
    const deletions: Record<string, any> = {};
    const modifications: Record<string, { old: any; new: any }> = {};

    const allKeys = new Set([...Object.keys(snapshotA), ...Object.keys(snapshotB)]);

    for (const key of allKeys) {
      const valA = snapshotA[key];
      const valB = snapshotB[key];

      if (!(key in snapshotA)) {
        additions[key] = valB;
      } else if (!(key in snapshotB)) {
        deletions[key] = valA;
      } else if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        modifications[key] = { old: valA, new: valB };
      }
    }

    return {
      versionA,
      versionB,
      additions,
      deletions,
      modifications,
    };
  }

  /**
   * 辅助方法：在保存前追踪变更（对比旧数据与新数据）
   * 返回变更摘要和变更详情
   */
  autoTrack(
    oldData: Record<string, any> | null,
    newData: Record<string, any>,
  ): { changes: Record<string, any>; changeSummary: string } {
    const changes: Record<string, any> = {};
    const changedFields: string[] = [];

    if (!oldData) {
      // 新增：所有字段都是变更
      for (const key of Object.keys(newData)) {
        changes[key] = { old: null, new: newData[key] };
        changedFields.push(key);
      }
      return { changes, changeSummary: '新建记录' };
    }

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldVal = oldData[key];
      const newVal = newData[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
        changedFields.push(key);
      }
    }

    const changeSummary = changedFields.length > 0
      ? `修改了 ${changedFields.join(', ')}`
      : '无变更';

    return { changes, changeSummary };
  }
}
