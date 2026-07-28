import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';
import { Prisma } from '@prisma/client';

interface SyncData {
  schedules?: any[];
  ships?: any[];
  staffHistory?: any[];
  sopFlow?: any[];
  publicCase?: any[];
  dict?: any[];
  diaries?: any[];
  standardTaskTemplates?: any[];
  publishTemplates?: any[];
  partyActivities?: any[];
  integrityRecords?: any[];
  officerProfiles?: any[];
  thoughtReports?: any[];
  experiences?: any[];
  lastSyncTime?: number;
  conflicts?: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>;
}
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFullData(userId: number, teamCode: string) {
    this.logger.log(`用户 ${userId} 请求全量数据下载`);

    const teamCodeEnum = teamCode as TeamCode;

    const [
      ships,
      schedules,
      staffHistory,
      sopFlow,
      publicCase,
      dict,
      diaries,
      standardTaskTemplates,
      publishTemplates,
      partyActivities,
      integrityRecords,
      officerProfiles,
      thoughtReports,
      experiences,
    ] = await Promise.all([
      this.prisma.ship.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.schedule.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.staffHistory.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.sopFlow.findMany(),
      this.prisma.publicCase.findMany(),
      this.prisma.dictCategory.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.diary.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.standardTaskTemplate.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.publishTemplate.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.partyActivity.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.integrityRecord.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.officerProfile.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.thoughtReport.findMany({ where: { teamCode: teamCodeEnum } }),
      this.prisma.experience.findMany(),
    ]);

    this.logger.log(`全量数据下载完成: 船舶${ships.length} 日程${schedules.length} 日记${diaries.length} 人员${staffHistory.length}`);

    return {
      ships,
      schedules,
      staffHistory,
      sopFlow,
      publicCase,
      dict,
      diaries,
      standardTaskTemplates,
      publishTemplates,
      partyActivities,
      integrityRecords,
      officerProfiles,
      thoughtReports,
      experiences,
      syncTime: Date.now(),
    };
  }

  async getIncrementalData(userId: number, teamCode: string, lastSyncTime: number, stores: string[]) {
    this.logger.log(`用户 ${userId} 请求增量同步，上次同步时间: ${lastSyncTime}`);

    const teamCodeEnum = teamCode as TeamCode;
    const lastSyncDate = new Date(lastSyncTime);

    const result: any = { syncTime: Date.now() };
    const requestedStores = stores.length > 0 ? stores : [
      'ships', 'schedules', 'diaries', 'staffHistory', 'sopFlow', 'publicCase',
      'dict', 'standardTaskTemplates', 'publishTemplates', 'partyActivities',
      'integrityRecords', 'officerProfiles', 'thoughtReports', 'experiences'
    ];

    const fetchPromises: Promise<any>[] = [];

    if (requestedStores.includes('ships')) {
      fetchPromises.push(this.prisma.ship.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('schedules')) {
      fetchPromises.push(this.prisma.schedule.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('diaries')) {
      fetchPromises.push(this.prisma.diary.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('staffHistory')) {
      fetchPromises.push(this.prisma.staffHistory.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('sopFlow')) {
      fetchPromises.push(this.prisma.sopFlow.findMany({ where: { updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('publicCase')) {
      fetchPromises.push(this.prisma.publicCase.findMany({ where: { updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('dict')) {
      fetchPromises.push(this.prisma.dictCategory.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('standardTaskTemplates')) {
      fetchPromises.push(this.prisma.standardTaskTemplate.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('publishTemplates')) {
      fetchPromises.push(this.prisma.publishTemplate.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('partyActivities')) {
      fetchPromises.push(this.prisma.partyActivity.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('integrityRecords')) {
      fetchPromises.push(this.prisma.integrityRecord.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('officerProfiles')) {
      fetchPromises.push(this.prisma.officerProfile.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('thoughtReports')) {
      fetchPromises.push(this.prisma.thoughtReport.findMany({ where: { teamCode: teamCodeEnum, updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    if (requestedStores.includes('experiences')) {
      fetchPromises.push(this.prisma.experience.findMany({ where: { updatedAt: { gt: lastSyncDate } } }));
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    const [
      ships, schedules, diaries, staffHistory, sopFlow, publicCase, dict,
      standardTaskTemplates, publishTemplates, partyActivities, integrityRecords,
      officerProfiles, thoughtReports, experiences
    ] = await Promise.all(fetchPromises);

    const storeMap: Record<string, any> = {
      ships, schedules, diaries, staffHistory, sopFlow, publicCase, dict,
      standardTaskTemplates, publishTemplates, partyActivities, integrityRecords,
      officerProfiles, thoughtReports, experiences
    };

    let totalChanges = 0;
    for (const store of requestedStores) {
      const data = storeMap[store];
      if (data && data.length > 0) {
        result[store] = data;
        totalChanges += data.length;
      }
    }

    result.lastSyncTime = Date.now();
    result.totalChanges = totalChanges;
    result.storesChanged = requestedStores.filter(s => storeMap[s]?.length > 0);

    this.logger.log(`增量同步完成: 共 ${totalChanges} 条变更`);
    return result;
  }

  async getSyncStats(userId: number, teamCode: string) {
    const teamCodeEnum = teamCode as TeamCode;

    const [
      shipCount, scheduleCount, diaryCount, staffHistoryCount,
      sopFlowCount, publicCaseCount, partyActivityCount, integrityRecordCount,
      officerProfileCount, thoughtReportCount, experienceCount,
    ] = await Promise.all([
      this.prisma.ship.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.schedule.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.diary.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.staffHistory.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.sopFlow.count(),
      this.prisma.publicCase.count(),
      this.prisma.partyActivity.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.integrityRecord.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.officerProfile.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.thoughtReport.count({ where: { teamCode: teamCodeEnum } }),
      this.prisma.experience.count(),
    ]);

    return {
      shipCount,
      scheduleCount,
      diaryCount,
      staffHistoryCount,
      sopFlowCount,
      publicCaseCount,
      partyActivityCount,
      integrityRecordCount,
      officerProfileCount,
      thoughtReportCount,
      experienceCount,
      totalRecords: shipCount + scheduleCount + diaryCount + staffHistoryCount +
        sopFlowCount + publicCaseCount + partyActivityCount + integrityRecordCount +
        officerProfileCount + thoughtReportCount + experienceCount,
    };
  }

  async syncData(userId: number, teamCode: string, clientData: SyncData) {
    this.logger.log(`用户 ${userId} 开始同步数据`);

    const result: SyncData = {};

    try {
      const lastSyncTime = clientData.lastSyncTime || 0;
      const teamCodeEnum = teamCode as TeamCode;

      const conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }> = [];

      const serverData = await this.prisma.$transaction(async (tx) => {
        if (clientData.schedules && clientData.schedules.length > 0) {
          result.schedules = await this.syncSchedules(
            userId,
            teamCodeEnum,
            clientData.schedules,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.ships && clientData.ships.length > 0) {
          result.ships = await this.syncShips(
            userId,
            teamCodeEnum,
            clientData.ships,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.staffHistory && clientData.staffHistory.length > 0) {
          result.staffHistory = await this.syncStaffHistory(
            userId,
            teamCodeEnum,
            clientData.staffHistory,
            lastSyncTime,
            tx
          );
        }

        if (clientData.sopFlow && clientData.sopFlow.length > 0) {
          result.sopFlow = await this.syncSopFlow(
            userId,
            clientData.sopFlow,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.publicCase && clientData.publicCase.length > 0) {
          result.publicCase = await this.syncPublicCase(
            userId,
            clientData.publicCase,
            lastSyncTime,
            tx
          );
        }

        if (clientData.dict && clientData.dict.length > 0) {
          result.dict = await this.syncDict(
            userId,
            teamCodeEnum,
            clientData.dict,
            lastSyncTime,
            tx
          );
        }

        if (clientData.diaries && clientData.diaries.length > 0) {
          result.diaries = await this.syncDiaries(
            userId,
            teamCodeEnum,
            clientData.diaries,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.standardTaskTemplates && clientData.standardTaskTemplates.length > 0) {
          result.standardTaskTemplates = await this.syncStandardTaskTemplates(
            userId,
            teamCodeEnum,
            clientData.standardTaskTemplates,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.publishTemplates && clientData.publishTemplates.length > 0) {
          result.publishTemplates = await this.syncPublishTemplates(
            userId,
            teamCodeEnum,
            clientData.publishTemplates,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.partyActivities && clientData.partyActivities.length > 0) {
          result.partyActivities = await this.syncPartyActivities(
            userId,
            teamCodeEnum,
            clientData.partyActivities,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.integrityRecords && clientData.integrityRecords.length > 0) {
          result.integrityRecords = await this.syncIntegrityRecords(
            userId,
            teamCodeEnum,
            clientData.integrityRecords,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.officerProfiles && clientData.officerProfiles.length > 0) {
          result.officerProfiles = await this.syncOfficerProfiles(
            userId,
            teamCodeEnum,
            clientData.officerProfiles,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.thoughtReports && clientData.thoughtReports.length > 0) {
          result.thoughtReports = await this.syncThoughtReports(
            userId,
            teamCodeEnum,
            clientData.thoughtReports,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        if (clientData.experiences && clientData.experiences.length > 0) {
          result.experiences = await this.syncExperiences(
            userId,
            clientData.experiences,
            lastSyncTime,
            conflicts,
            tx
          );
        }

        return this.getServerData(
          userId,
          teamCodeEnum,
          lastSyncTime,
          tx
        );
      });

      result.lastSyncTime = Date.now();
      result.conflicts = conflicts;

      this.logger.log(`用户 ${userId} 同步完成`);
      return { ...result, ...serverData };
    } catch (error) {
      this.logger.error(`同步失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async syncSchedules(
    userId: number,
    teamCode: TeamCode,
    clientSchedules: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientSchedules.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.schedule.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const schedule of clientSchedules) {
      const localId = schedule.localId;
      delete schedule.localId;

      const existing = existingMap.get(schedule.id);
      if (existing) {
        const clientUpdatedAt = schedule.updatedAt ? new Date(schedule.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !schedule.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'schedules',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete schedule.force;
          const updated = await tx.schedule.update({
            where: { id: existing.id },
            data: { ...schedule, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.schedule.create({
          data: {
            ...schedule,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncShips(
    userId: number,
    teamCode: TeamCode,
    clientShips: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientShips.map(s => s.id).filter(Boolean);
    const names = clientShips.map(s => s.cnShipName || s.chineseName).filter(Boolean);
    const existingRecords = (ids.length > 0 || names.length > 0)
      ? await tx.ship.findMany({
          where: {
            teamCode,
            OR: [
              ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
              ...(names.length > 0 ? [{ cnShipName: { in: names } }] : []),
            ],
          },
        })
      : [];
    const existingById = new Map(existingRecords.filter(r => ids.includes(r.id)).map(r => [r.id, r]));
    const existingByName = new Map(existingRecords.map(r => [r.cnShipName, r]));

    const results = [];
    for (const ship of clientShips) {
      const localId = ship.localId;
      delete ship.localId;

      const shipName = ship.cnShipName || ship.chineseName;
      const existing = existingById.get(ship.id) || existingByName.get(shipName);

      if (existing) {
        const clientUpdatedAt = ship.updatedAt ? new Date(ship.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !ship.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'ships',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete ship.force;
          const updated = await tx.ship.update({
            where: { id: existing.id },
            data: { ...ship, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.ship.create({
          data: {
            ...ship,
            teamCode,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncStaffHistory(
    userId: number,
    teamCode: TeamCode,
    clientStaffHistory: any[],
    lastSyncTime: number,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientStaffHistory.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.staffHistory.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const staff of clientStaffHistory) {
      const localId = staff.localId;
      delete staff.localId;

      const existing = existingMap.get(staff.id);
      if (existing) {
        const updated = await tx.staffHistory.update({
          where: { id: existing.id },
          data: { ...staff },
        });
        results.push({ ...updated, localId });
      } else {
        const created = await tx.staffHistory.create({
          data: { ...staff, teamCode, createdAt: new Date() },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncSopFlow(
    userId: number,
    clientSopFlow: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientSopFlow.map(f => f.id).filter(Boolean);
    const names = clientSopFlow.map(f => f.flowName || f.title).filter(Boolean);
    const existingRecords = (ids.length > 0 || names.length > 0)
      ? await tx.sopFlow.findMany({
          where: {
            OR: [
              ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
              ...(names.length > 0 ? [{ flowName: { in: names } }] : []),
            ],
          },
        })
      : [];
    const existingById = new Map(existingRecords.filter(r => ids.includes(r.id)).map(r => [r.id, r]));
    const existingByName = new Map(existingRecords.map(r => [r.flowName, r]));

    const results = [];
    for (const flow of clientSopFlow) {
      const localId = flow.localId;
      delete flow.localId;

      const flowName = flow.flowName || flow.title;
      const existing = existingById.get(flow.id) || existingByName.get(flowName);

      if (existing) {
        const clientUpdatedAt = flow.updatedAt ? new Date(flow.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !flow.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'sopFlow',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete flow.force;
          const updated = await tx.sopFlow.update({
            where: { id: existing.id },
            data: { ...flow, updatedAt: new Date(), updatedById: userId },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.sopFlow.create({
          data: { ...flow, updatedById: userId, createdAt: new Date(), updatedAt: new Date() },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncPublicCase(
    userId: number,
    clientPublicCase: any[],
    lastSyncTime: number,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientPublicCase.map(c => c.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.publicCase.findMany({ where: { id: { in: ids } } })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const caseItem of clientPublicCase) {
      const localId = caseItem.localId;
      delete caseItem.localId;

      const existing = existingMap.get(caseItem.id);
      if (existing) {
        const updated = await tx.publicCase.update({
          where: { id: existing.id },
          data: { ...caseItem },
        });
        results.push({ ...updated, localId });
      } else {
        const created = await tx.publicCase.create({
          data: { ...caseItem, createdAt: new Date() },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncDict(
    userId: number,
    teamCode: TeamCode,
    clientDict: any[],
    lastSyncTime: number,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientDict.map(d => d.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.dictCategory.findMany({ where: { id: { in: ids } } })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const dictItem of clientDict) {
      const localId = dictItem.localId;
      delete dictItem.localId;

      const existing = existingMap.get(dictItem.id);
      if (existing) {
        const updated = await tx.dictCategory.update({
          where: { id: existing.id },
          data: { ...dictItem },
        });
        results.push({ ...updated, localId });
      } else {
        const created = await tx.dictCategory.create({
          data: { ...dictItem, teamCode, createdAt: new Date() },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async getServerData(
    userId: number,
    teamCode: TeamCode,
    lastSyncTime: number,
    tx: Prisma.TransactionClient
  ) {
    const lastSyncDate = new Date(lastSyncTime);

    const [
      schedules, ships, staffHistory, sopFlow, publicCase, dict,
      diaries, standardTaskTemplates, publishTemplates,
      partyActivities, integrityRecords, officerProfiles,
      thoughtReports, experiences
    ] = await Promise.all([
      tx.schedule.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.ship.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.staffHistory.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.sopFlow.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
      tx.publicCase.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
      tx.dictCategory.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.diary.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.standardTaskTemplate.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.publishTemplate.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.partyActivity.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.integrityRecord.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.officerProfile.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.thoughtReport.findMany({
        where: { teamCode, updatedAt: { gt: lastSyncDate } },
      }),
      tx.experience.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
    ]);

    return {
      schedules, ships, staffHistory, sopFlow, publicCase, dict,
      diaries, standardTaskTemplates, publishTemplates,
      partyActivities, integrityRecords, officerProfiles,
      thoughtReports, experiences,
    };
  }

  private async syncDiaries(
    userId: number,
    teamCode: TeamCode,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.diary.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'diaries',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.diary.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.diary.create({
          data: {
            ...item,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncStandardTaskTemplates(
    userId: number,
    teamCode: TeamCode,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.standardTaskTemplate.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'standardTaskTemplates',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.standardTaskTemplate.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.standardTaskTemplate.create({
          data: {
            ...item,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncPublishTemplates(
    userId: number,
    teamCode: TeamCode,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.publishTemplate.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'publishTemplates',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.publishTemplate.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.publishTemplate.create({
          data: {
            ...item,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncPartyActivities(
    userId: number,
    teamCode: TeamCode,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.partyActivity.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'partyActivities',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.partyActivity.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.partyActivity.create({
          data: {
            ...item,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncIntegrityRecords(
    userId: number,
    teamCode: TeamCode,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.integrityRecord.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'integrityRecords',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.integrityRecord.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.integrityRecord.create({
          data: {
            ...item,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncOfficerProfiles(
    userId: number,
    teamCode: TeamCode,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.officerProfile.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'officerProfiles',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.officerProfile.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.officerProfile.create({
          data: {
            ...item,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncThoughtReports(
    userId: number,
    teamCode: TeamCode,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.thoughtReport.findMany({
          where: { id: { in: ids }, teamCode },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'thoughtReports',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.thoughtReport.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.thoughtReport.create({
          data: {
            ...item,
            teamCode,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }

  private async syncExperiences(
    userId: number,
    clientData: any[],
    lastSyncTime: number,
    conflicts: Array<{ storeName: string; recordId: any; serverUpdatedAt: string; clientUpdatedAt: string }>,
    tx: Prisma.TransactionClient
  ) {
    const ids = clientData.map(s => s.id).filter(Boolean);
    const existingRecords = ids.length > 0
      ? await tx.experience.findMany({
          where: { id: { in: ids } },
        })
      : [];
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    const results = [];
    for (const item of clientData) {
      const localId = item.localId;
      delete item.localId;
      const existing = existingMap.get(item.id);
      if (existing) {
        const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
        const serverUpdatedAt = existing.updatedAt;
        if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt && !item.force) {
          results.push({ ...existing, localId, _conflict: true });
          conflicts.push({
            storeName: 'experiences',
            recordId: existing.id,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
            clientUpdatedAt: clientUpdatedAt.toISOString(),
          });
        } else {
          delete item.force;
          const updated = await tx.experience.update({
            where: { id: existing.id },
            data: { ...item, updatedAt: new Date() },
          });
          results.push({ ...updated, localId });
        }
      } else {
        const created = await tx.experience.create({
          data: {
            ...item,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.push({ ...created, localId });
      }
    }
    return results;
  }
}
