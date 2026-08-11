import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { ShipReportParseService } from '../ship-report-parse/ship-report-parse.service';
import { TeamCode } from '@prisma/client';
import * as OpenCC from 'opencc-js';

// 繁体→简体 转换器（用于船名简繁匹配纠错）
// opencc-js: from='t'(繁体) to='cn'(简体)
const t2sConverter = OpenCC.Converter({ from: 't', to: 'cn' });

/**
 * 将字符串统一转为简体（用于比较）
 */
function toSimplified(s: string): string {
  if (!s) return s;
  try {
    return t2sConverter(s);
  } catch {
    return s;
  }
}

/**
 * 比较两个船名是否匹配（忽略简繁体差异）
 * - 先直接比较
 * - 再各自转简体后比较
 * - 再做包含匹配（双向，均转简体）
 */
function matchShipName(dbName: string, parsedName: string): { matched: boolean; confidence: number } {
  if (!dbName || !parsedName) return { matched: false, confidence: 0 };

  // 1. 精确匹配
  if (dbName === parsedName) return { matched: true, confidence: 1 };

  // 2. 简繁统一后精确匹配
  const dbSimple = toSimplified(dbName);
  const parsedSimple = toSimplified(parsedName);
  if (dbSimple === parsedSimple) return { matched: true, confidence: 1 };

  // 3. 包含匹配（原始）
  if (dbName.includes(parsedName) || parsedName.includes(dbName)) {
    return { matched: true, confidence: 0.8 };
  }

  // 4. 包含匹配（简繁统一后）
  if (dbSimple.includes(parsedSimple) || parsedSimple.includes(dbSimple)) {
    return { matched: true, confidence: 0.8 };
  }

  return { matched: false, confidence: 0 };
}

@Injectable()
export class ShipService {
  private readonly logger = new Logger(ShipService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private operationLogService: OperationLogService,
    private shipReportParseService: ShipReportParseService,
  ) {}

  async findAll(teamCode: TeamCode) {
    const cacheKey = `ships:${teamCode}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.prisma.ship.findMany({
      where: { teamCode },
      orderBy: { cnShipName: 'asc' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async findOne(id: number) {
    const ship = await this.prisma.ship.findUnique({ where: { id } });
    if (!ship) return ship;

    const rawStatus = (ship.currentStatus || '').toLowerCase();
    const rawLocation = ship.currentLocation || '';

    let status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair' = 'sailing';
    let statusText = '航行中';

    if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
      status = 'repair'; statusText = '修理中';
    } else if (rawStatus.includes('berth') || /靠泊/.test(rawStatus) || rawStatus.includes('alongside')) {
      status = 'berthed'; statusText = '已靠泊';
    } else if (rawStatus.includes('arriv') || rawStatus.includes('抵港') || rawStatus.includes('到港') || rawStatus.includes('到达') || rawStatus.includes('抵达')) {
      status = 'arrived'; statusText = '已抵港';
    } else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊') || rawStatus.includes('抛锚')) {
      status = 'anchored'; statusText = '锚泊中';
    } else if (rawStatus.includes('sail') || rawStatus.includes('voyage') || rawStatus.includes('航行') || rawStatus.includes('在航')) {
      status = 'sailing'; statusText = '航行中';
    }

    if (rawLocation) {
      if (/锚泊|抛锚|锚地/.test(rawLocation)) {
        status = 'anchored'; statusText = '锚泊中';
      } else if (/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/.test(rawLocation)) {
        status = 'berthed'; statusText = '已靠泊';
      } else if (/抵港|到港|抵达|到达/.test(rawLocation) && !/预计|预计抵达|预计到达/.test(rawLocation)) {
        status = 'arrived'; statusText = '已抵港';
      } else if (/航行|在航|东行|西行|北上|南下|漂航|出港/.test(rawLocation)) {
        status = 'sailing'; statusText = '航行中';
      }
    }

    if (status === 'sailing' && rawLocation && ship.etaPort) {
      const locationLower = rawLocation.toLowerCase();
      const etaPortLower = ship.etaPort.toLowerCase();
      const etaPortParts = etaPortLower.split(/[\s\-—–,，\.。]/).filter(Boolean);
      const locationMatchesPort = etaPortParts.some(portPart =>
        locationLower.includes(portPart) && portPart.length >= 2
      );

      if (locationMatchesPort) {
        if (/装货|卸货|上货|下货|泊|靠|系泊|靠妥|码头|泊位/.test(rawLocation)) {
          status = 'berthed'; statusText = '已靠泊';
        } else {
          status = 'arrived'; statusText = '已抵港';
        }
      }
    }

    return {
      ...ship,
      status,
      statusText,
      politicalReport: {
        voyage: ship.politicalVoyage || '',
        location: ship.politicalLocation || '',
        status: ship.politicalStatus || '',
        eta: ship.politicalETA ? new Date(ship.politicalETA).toISOString() : '',
        etaPort: ship.politicalETAPort || '',
        etd: ship.politicalETD ? new Date(ship.politicalETD).toISOString() : '',
        weather: ship.politicalWeather || '',
        seaCondition: ship.politicalSeaCondition || '',
        staffChange: ship.politicalStaffChange || '',
        focusPoints: ship.politicalFocusPoints || '',
        otherNotes: ship.politicalOtherNotes || '',
        updatedAt: ship.politicalUpdatedAt ? new Date(ship.politicalUpdatedAt).toISOString() : '',
      },
      etaPortRegion: ship.etaPortRegion || '',
      piracyZone: ship.piracyZone || false,
    };
  }

  async create(data: any, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const ship = await this.prisma.ship.create({
      data: { ...data, teamCode },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '新增',
      operationContent: `新增船舶：${ship.cnShipName || '（ID:' + ship.id + '）'}`,
      ipAddress,
      userAgent,
    });

    await this.redisService.del(`ships:${teamCode}`);
    return ship;
  }

  async update(id: number, data: any, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const ship = await this.prisma.ship.findUnique({ where: { id } });
    const result = await this.prisma.ship.update({
      where: { id },
      data,
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `修改船舶：${ship?.cnShipName || '（ID:' + id + '）'}`,
      ipAddress,
      userAgent,
    });

    await this.redisService.del(`ships:${teamCode}`);
    return result;
  }

  async remove(id: number, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    const ship = await this.prisma.ship.findUnique({ where: { id } });
    const result = await this.prisma.ship.delete({ where: { id } });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '删除',
      operationContent: `删除船舶：${ship?.cnShipName || '（ID:' + id + '）'}`,
      ipAddress,
      userAgent,
    });

    await this.redisService.del(`ships:${teamCode}`);
    return result;
  }

  /**
   * 批量清空船舶关联的填报数据（不删除船舶本身）
   * 清空：日记、日程、船笔记、日记-日程关联
   */
  async clearShipData(shipIds: number[], userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    // 先查船舶名用于日志
    const ships = await this.prisma.ship.findMany({
      where: { id: { in: shipIds }, teamCode },
      select: { id: true, cnShipName: true },
    });

    if (ships.length === 0) {
      return { success: false, message: '未找到指定船舶' };
    }

    const ids = ships.map(s => s.id);
    const shipNames = ships.map(s => s.cnShipName).join('、');

    // 用事务删除所有关联数据
    const result = await this.prisma.$transaction(async (tx) => {
      let diaryCount = 0;
      let scheduleCount = 0;
      let shipNoteCount = 0;

      // 1. 删除日记-日程关联
      const diaries = await tx.diary.findMany({
        where: { shipId: { in: ids } },
        select: { id: true },
      });
      const diaryIds = diaries.map(d => d.id);

      if (diaryIds.length > 0) {
        await tx.diaryScheduleRelation.deleteMany({
          where: { diaryId: { in: diaryIds } },
        });
      }

      // 2. 删除日程关联的公开案例（如果有的话）
      const schedules = await tx.schedule.findMany({
        where: { shipId: { in: ids } },
        select: { id: true },
      });
      const scheduleIds = schedules.map(s => s.id);

      // 3. 删除日记
      const diaryResult = await tx.diary.deleteMany({
        where: { shipId: { in: ids } },
      });
      diaryCount = diaryResult.count;

      // 4. 删除日程
      const scheduleResult = await tx.schedule.deleteMany({
        where: { shipId: { in: ids } },
      });
      scheduleCount = scheduleResult.count;

      // 5. 删除船笔记
      try {
        const noteResult = await tx.shipNote.deleteMany({
          where: { shipId: { in: ids } },
        });
        shipNoteCount = noteResult.count;
      } catch (e) {
        // 表可能不存在，忽略
      }

      return { diaryCount, scheduleCount, shipNoteCount };
    });

    // 记录操作日志
    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '清空数据',
      operationContent: `清空 ${ships.length} 艘船舶填报数据（${shipNames}）：日记${result.diaryCount}条、日程${result.scheduleCount}条、船笔记${result.shipNoteCount}条`,
      ipAddress,
      userAgent,
    });

    // 清除缓存
    await this.redisService.del(`ships:${teamCode}`);

    return {
      success: true,
      shipCount: ships.length,
      ...result,
    };
  }

  async createInitialShips() {
    const ships = [
      { cnShipName: '孔雀座', teamCode: 'team2' as const, enShipName: 'KONG QUE ZUO', flagCountry: 'SINGAPORE', factoryDate: '2011-06-27', deadweightTonnage: '75578', teamDisplayName: '白鹭座系列', tradeType: '外贸', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '李丹', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '马晶' },
      { cnShipName: '河池', teamCode: 'team2' as const, enShipName: 'HE CHI', flagCountry: '上海', factoryDate: '2013-01-04', deadweightTonnage: '48698', teamDisplayName: '荣池系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '曾长成', engineerSupervisor: '涂建红', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '张惊雷' },
      { cnShipName: '海豚座', teamCode: 'team2' as const, enShipName: 'HAI TUN ZUO', flagCountry: '上海', factoryDate: '2010-03-23', deadweightTonnage: '75571', teamDisplayName: '白鹭座系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '卢云集', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '黄小海' },
    ];

    for (const ship of ships) {
      const buildYear = ship.factoryDate ? parseInt(ship.factoryDate.substring(0, 4)) : undefined;
      await this.prisma.ship.upsert({
        where: { teamCode_cnShipName: { teamCode: ship.teamCode, cnShipName: ship.cnShipName } },
        update: { ...ship, buildYear },
        create: { ...ship, buildYear, currentStatus: 'voyage' },
      });
    }

    return this.prisma.ship.findMany();
  }

  async getDynamicStatus(teamCode: TeamCode) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode },
    });

    const tasks = await this.prisma.shipTaskStatus.findMany({
      where: { teamCode },
      include: {
        template: { select: { id: true, title: true, templateType: true } },
      },
    });

    const shipsWithStatus = ships.map((ship) => {
      const shipTasks = tasks.filter((t) => t.shipId === ship.id);
      const totalProgress = shipTasks.length > 0
        ? shipTasks.reduce((sum: number, t: any) => sum + t.progress, 0) / shipTasks.length
        : 0;

      // 状态判断优先级：修理 > 报告原文(currentStatus) > 报告位置描述(currentLocation) > ETA时间推断
      // 状态码：repair(修理) | berthed(靠泊) | arrived(抵港/到港未靠泊) | anchored(锚泊) | sailing(航行)
      let status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair' = 'sailing';
      const rawStatus = (ship.currentStatus || '').toLowerCase();
      const rawLocation = (ship.currentLocation || '');

      // 1. 修理状态优先级最高
      if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
        status = 'repair';
      }
      // 2. 靠泊（已靠泊作业）：明确"靠泊"关键字，而非"抵港"
      else if (
        rawStatus.includes('berth') ||
        /靠泊/.test(rawStatus) ||
        rawStatus.includes('alongside')
      ) {
        status = 'berthed';
      }
      // 3. 抵港（已到达港口但未靠泊，等待泊位/引航/联检等）
      else if (
        rawStatus.includes('arriv') ||
        rawStatus.includes('抵港') ||
        rawStatus.includes('到港') ||
        rawStatus.includes('到达') ||
        rawStatus.includes('抵达')
      ) {
        status = 'arrived';
      }
      // 4. 锚泊
      else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊') || rawStatus.includes('抛锚')) {
        status = 'anchored';
      }
      // 5. 航行
      else if (
        rawStatus.includes('sail') ||
        rawStatus.includes('voyage') ||
        rawStatus.includes('航行') ||
        rawStatus.includes('在航')
      ) {
        status = 'sailing';
      }
      // 6. 从位置描述中识别状态（独立执行，不受currentStatus影响）
      // 优先级：锚泊 > 靠泊 > 抵港 > 航行
      if (rawLocation) {
        if (/锚泊|抛锚|锚地/.test(rawLocation)) {
          status = 'anchored';
        } else if (/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/.test(rawLocation)) {
          status = 'berthed';
        } else if (/抵港|到港|抵达|到达/.test(rawLocation) && !/预计|预计抵达|预计到达/.test(rawLocation)) {
          status = 'arrived';
        } else if (/航行|在航|东行|西行|北上|南下|漂航|出港/.test(rawLocation)) {
          status = 'sailing';
        }
      }

      // 7. 位置描述与目的港交叉校验：如果位置已在目的港区域，应判定为已抵达而非航行中
      // 场景：海豚座"新加坡西泊装货"，目的港"新加坡" → 应识别为已靠泊
      if (status === 'sailing' && rawLocation && ship.etaPort) {
        const locationLower = rawLocation.toLowerCase();
        const etaPortLower = ship.etaPort.toLowerCase();
        const etaPortParts = etaPortLower.split(/[\s\-—–,，\.。]/).filter(Boolean);
        
        // 检查位置是否包含目的港名称（支持多词匹配，如 "CHIBA" 或 "千叶"）
        const locationMatchesPort = etaPortParts.some(portPart => 
          locationLower.includes(portPart) && portPart.length >= 2
        );
        
        if (locationMatchesPort) {
          // 如果位置描述有装货/卸货/泊/靠/系泊/靠妥/码头/泊位等词，说明已靠泊
          if (/装货|卸货|上货|下货|泊|靠|系泊|靠妥|码头|泊位/.test(rawLocation)) {
            status = 'berthed';
          } else {
            status = 'arrived';
          }
        }
      }

      // ETA 时间辅助推断（仅在状态字段和位置描述都无明确信息时使用）
      const eta = ship.eta ? new Date(ship.eta) : null;
      let etd = ship.etd ? new Date(ship.etd) : null;
      let voyageProgress = 0;
      let voyageDaysLeft = 0;
      let hasVoyageProgress = false;
      if (eta) {
        if (!etd) {
          const estDuration = 7 * 24 * 60 * 60 * 1000;
          etd = new Date(eta.getTime() - estDuration);
        }
        const now = new Date();
        const total = eta.getTime() - etd.getTime();
        if (total > 0) {
          const elapsed = now.getTime() - etd.getTime();
          voyageProgress = Math.round(Math.max(0, Math.min(100, (elapsed / total) * 100)));
          const msLeft = eta.getTime() - now.getTime();
          voyageDaysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
          hasVoyageProgress = true;
        }

        // 仅在状态仍为默认值(sailing)且无明确状态/位置描述时，根据ETA推断
        // 注意：报告原文明确说"航行中"时，即使ETA已过，仍以报告为准（航行状态保持）
        const hasExplicitStatus = rawStatus.length > 0 || rawLocation.length > 0;
        if (!hasExplicitStatus) {
          const nowMs = now.getTime();
          const etaMs = eta.getTime();
          // 已过ETA超过6小时且无ETD → 视为已抵港
          if (nowMs > etaMs + 6 * 60 * 60 * 1000 && !ship.etd) {
            status = 'arrived';
          }
        }
      }

      return {
        shipId: ship.id,
        shipName: ship.cnShipName,
        sendCompany: ship.sendCompany || '',
        voyage: ship.currentVoyage || '',
        location: ship.currentLocation || '',
        status,
        eta: ship.eta ? new Date(ship.eta).toISOString() : '',
        departurePort: ship.departurePort || '',
        etaPort: ship.etaPort || '',
        voyageProgress,
        voyageDaysLeft,
        hasVoyageProgress,
        crewChange: false,
        safety: false,
        provisions: false,
        fourSupervisors: {
          marine: ship.marineSupervisor || '',
          engineer: ship.engineerSupervisor || '',
          electric: ship.electricSupervisor || '',
          crew: ship.crewSupervisor || '',
        },
        politicalInstructor: ship.politicalInstructor || ship.politicalOfficerName || '',
        checkProgress: Math.round(totalProgress),
        taskItems: shipTasks.map((t: any) => ({
          id: t.id,
          title: t.template?.title || '',
          progress: t.progress,
          status: t.status,
        })),
        isWatched: false,
        weather: ship.currentLocation || '',
        // 船舶报告扩展字段（船工主管粘贴/政委日记同步，谁最新以谁为准）
        cargoStatus: ship.cargoStatus || '',
        visibility: ship.visibility || '',
        temperature: ship.temperature || '',
        windDirection: ship.windDirection || '',
        windForce: ship.windForce || '',
        waveLevel: ship.waveLevel || '',
        timezone: ship.timezone || '',
        focusPoints: ship.focusPoints || '',
        otherNotes: ship.otherNotes || '',
        dynamicSource: ship.dynamicSource || '',
        dynamicUpdatedAt: ship.dynamicUpdatedAt ? new Date(ship.dynamicUpdatedAt).toISOString() : '',
      };
    });

    return shipsWithStatus;
  }

  /**
   * 获取船舶时间轴（今天/明天/后天）
   * 根据ETA/ETD推算不同时间点的船舶状态
   */
  async getShipTimeline(shipId: number) {
    const ship = await this.prisma.ship.findUnique({ where: { id: shipId } });
    if (!ship) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2);

    const eta = ship.eta ? new Date(ship.eta) : null;
    const etd = ship.etd ? new Date(ship.etd) : null;

    function getStatusForDate(date: Date): { status: string; label: string; color: string; detail: string } {
      const rawLocation = ship.currentLocation || '';
      
      if (rawLocation.match(/锚泊|抛锚|锚地/)) {
        return { status: 'anchored', label: '锚泊中', color: '#e6a23c', detail: ship.currentLocation || '锚泊中' };
      } else if (rawLocation.match(/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/)) {
        return { status: 'berthed', label: '已靠泊', color: '#67c23a', detail: ship.currentLocation || '靠泊中' };
      } else if (rawLocation.match(/抵港|到港|抵达|到达/) && !rawLocation.match(/预计|预计抵达|预计到达/)) {
        return { status: 'arrived', label: '已抵港', color: '#409eff', detail: ship.currentLocation || '抵港中' };
      } else if (rawLocation.match(/航行|在航|东行|西行|北上|南下|漂航|出港/)) {
        return { status: 'sailing', label: '航行中', color: '#409eff', detail: ship.currentLocation || '航行中' };
      }

      const rawStatus = (ship.currentStatus || '').toLowerCase();
      if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
        return { status: 'repair', label: '修理中', color: '#f56c6c', detail: ship.currentLocation || '修理中' };
      } else if (rawStatus.includes('berth') || rawStatus.includes('靠泊') || rawStatus.includes('在港')) {
        return { status: 'berthed', label: '已靠泊', color: '#67c23a', detail: ship.currentLocation || '靠泊中' };
      } else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊')) {
        return { status: 'anchored', label: '锚泊中', color: '#e6a23c', detail: ship.currentLocation || '锚泊中' };
      } else if (rawStatus.includes('arriv') || rawStatus.includes('抵港') || rawStatus.includes('到港') || rawStatus.includes('到达') || rawStatus.includes('抵达')) {
        return { status: 'arrived', label: '已抵港', color: '#409eff', detail: ship.currentLocation || '抵港中' };
      }

      if (eta && etd) {
        if (date < eta) {
          const diffHours = Math.round((eta.getTime() - date.getTime()) / (1000 * 60 * 60));
          return { status: 'sailing', label: '航行中', color: '#409eff', detail: `预计${diffHours}小时后抵达` };
        } else if (date >= eta && date < etd) {
          return { status: 'berthed', label: '已靠泊', color: '#67c23a', detail: `靠泊中（ETA: ${formatDate(eta)}）` };
        } else {
          const diffHours = Math.round((date.getTime() - etd.getTime()) / (1000 * 60 * 60));
          return { status: 'sailing', label: '已离港', color: '#909399', detail: `已离开${diffHours}小时` };
        }
      }
      if (eta && !etd) {
        if (date < eta) {
          const diffHours = Math.round((eta.getTime() - date.getTime()) / (1000 * 60 * 60));
          return { status: 'sailing', label: '航行中', color: '#409eff', detail: `预计${diffHours}小时后抵达` };
        } else {
          return { status: 'berthed', label: '已靠泊', color: '#67c23a', detail: `靠泊中（ETA: ${formatDate(eta)}）` };
        }
      }

      return { status: 'sailing', label: '航行中', color: '#409eff', detail: '航行中' };
    }

    function formatDate(d: Date): string {
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    return {
      shipId: ship.id,
      shipName: ship.cnShipName,
      timeline: [
        { date: today, label: '今天', ...getStatusForDate(today) },
        { date: tomorrow, label: '明天', ...getStatusForDate(tomorrow) },
        { date: dayAfter, label: '后天', ...getStatusForDate(dayAfter) },
      ],
    };
  }

  /**
   * 按日期偏移获取船舶动态状态
   * @param teamCode 团队代码
   * @param dayOffset 日期偏移 0=今天 1=明天 2=后天
   */
  async getDynamicStatusByDate(teamCode: TeamCode, dayOffset: number = 0) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode },
    });

    const tasks = await this.prisma.shipTaskStatus.findMany({
      where: { teamCode },
      include: {
        template: { select: { id: true, title: true, templateType: true } },
      },
    });

    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);

    function calcShipStatus(ship: any): { status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair'; statusText: string; etaDisplay: string } {
      const eta = ship.eta ? new Date(ship.eta) : null;
      const etd = ship.etd ? new Date(ship.etd) : null;

      const rawStatus = (ship.currentStatus || '').toLowerCase();
      const rawLocation = ship.currentLocation || '';

      // 状态判断优先级：修理 > 锚泊 > 靠泊 > 抵港 > 航行
      let status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair' = 'sailing';
      let statusText = '航行中';

      // 1. 修理状态优先级最高
      if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
        return { status: 'repair', statusText: '修理中', etaDisplay: '' };
      }

      // 2. 从 currentStatus 字段判断（仅作为初步判断，会被 currentLocation 覆盖）
      if (rawStatus.includes('berth') || /靠泊/.test(rawStatus) || rawStatus.includes('alongside')) {
        status = 'berthed'; statusText = '已靠泊';
      } else if (rawStatus.includes('arriv') || rawStatus.includes('抵港') || rawStatus.includes('到港') || rawStatus.includes('到达') || rawStatus.includes('抵达')) {
        status = 'arrived'; statusText = '已抵港';
      } else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊') || rawStatus.includes('抛锚')) {
        status = 'anchored'; statusText = '锚泊中';
      } else if (rawStatus.includes('sail') || rawStatus.includes('voyage') || rawStatus.includes('航行') || rawStatus.includes('在航')) {
        status = 'sailing'; statusText = '航行中';
      }

      // 3. 从 currentLocation 字段覆盖（优先级高于 currentStatus）
      if (rawLocation) {
        if (/锚泊|抛锚|锚地/.test(rawLocation)) {
          status = 'anchored'; statusText = '锚泊中';
        } else if (/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/.test(rawLocation)) {
          status = 'berthed'; statusText = '已靠泊';
        } else if (/抵港|到港|抵达|到达/.test(rawLocation) && !/预计|预计抵达|预计到达/.test(rawLocation)) {
          status = 'arrived'; statusText = '已抵港';
        } else if (/航行|在航|东行|西行|北上|南下|漂航|出港/.test(rawLocation)) {
          status = 'sailing'; statusText = '航行中';
        }
      }

      // 4. 位置描述与目的港交叉校验
      if (status === 'sailing' && rawLocation && ship.etaPort) {
        const locationLower = rawLocation.toLowerCase();
        const etaPortLower = ship.etaPort.toLowerCase();
        const etaPortParts = etaPortLower.split(/[\s\-—–,，\.。]/).filter(Boolean);
        const locationMatchesPort = etaPortParts.some(portPart =>
          locationLower.includes(portPart) && portPart.length >= 2
        );

        if (locationMatchesPort) {
          if (/装货|卸货|上货|下货|泊|靠|系泊|靠妥|码头|泊位/.test(rawLocation)) {
            status = 'berthed'; statusText = '已靠泊';
          } else {
            status = 'arrived'; statusText = '已抵港';
          }
        }
      }

      return { status, statusText, etaDisplay: eta ? formatDateShort(eta) : '' };
    }

    function formatDateShort(d: Date): string {
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    // 计算航程时间进度
    function calcVoyageProgress(ship: any): { progress: number; daysLeft: number; hasData: boolean } {
      const eta = ship.eta ? new Date(ship.eta) : null;
      let etd = ship.etd ? new Date(ship.etd) : null;

      // 没有ETA就无法计算
      if (!eta) return { progress: 0, daysLeft: 0, hasData: false };

      // 没有ETD时，尝试从动态更新时间或ETA往前推估算
      if (!etd) {
        // 用ETA倒推：默认航程按7天估算（仅用于进度条显示参考）
        const estDuration = 7 * 24 * 60 * 60 * 1000;
        etd = new Date(eta.getTime() - estDuration);
      }

      const now = baseDate;
      const total = eta.getTime() - etd.getTime();
      if (total <= 0) return { progress: 100, daysLeft: 0, hasData: true };

      const elapsed = now.getTime() - etd.getTime();
      let progress = (elapsed / total) * 100;
      progress = Math.max(0, Math.min(100, progress));

      const msLeft = eta.getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

      return { progress: Math.round(progress), daysLeft, hasData: true };
    }

    const shipsWithStatus = ships.map((ship) => {
      const shipTasks = tasks.filter((t) => t.shipId === ship.id);
      const totalProgress = shipTasks.length > 0
        ? shipTasks.reduce((sum: number, t: any) => sum + t.progress, 0) / shipTasks.length
        : 0;

      const statusInfo = calcShipStatus(ship);
      const voyageInfo = calcVoyageProgress(ship);

      return {
        shipId: ship.id,
        shipName: ship.cnShipName,
        sendCompany: ship.sendCompany || '',
        flagCountry: ship.flagCountry || '',
        tradeType: ship.tradeType || '',
        voyage: ship.currentVoyage || '',
        location: ship.currentLocation || '',
        status: statusInfo.status,
        statusText: statusInfo.statusText,
        eta: ship.eta ? new Date(ship.eta).toISOString() : '',
        etaDisplay: statusInfo.etaDisplay,
        departurePort: ship.departurePort || '',
        etaPort: ship.etaPort || '',
        voyageProgress: voyageInfo.progress,
        voyageDaysLeft: voyageInfo.daysLeft,
        hasVoyageProgress: voyageInfo.hasData,
        crewChange: false,
        safety: false,
        provisions: false,
        fourSupervisors: {
          marine: ship.marineSupervisor || '',
          engineer: ship.engineerSupervisor || '',
          electric: ship.electricSupervisor || '',
          crew: ship.crewSupervisor || '',
        },
        politicalInstructor: ship.politicalInstructor || ship.politicalOfficerName || '',
        checkProgress: Math.round(totalProgress),
        taskItems: shipTasks.map((t: any) => ({
          id: t.id,
          title: t.template?.title || '',
          progress: t.progress,
          status: t.status,
        })),
        isWatched: false,
        weather: ship.currentLocation || '',
        politicalReport: {
          voyage: ship.politicalVoyage || '',
          location: ship.politicalLocation || '',
          status: ship.politicalStatus || '',
          eta: ship.politicalETA ? new Date(ship.politicalETA).toISOString() : '',
          etaPort: ship.politicalETAPort || '',
          etd: ship.politicalETD ? new Date(ship.politicalETD).toISOString() : '',
          weather: ship.politicalWeather || '',
          seaCondition: ship.politicalSeaCondition || '',
          staffChange: ship.politicalStaffChange || '',
          focusPoints: ship.politicalFocusPoints || '',
          otherNotes: ship.politicalOtherNotes || '',
          updatedAt: ship.politicalUpdatedAt ? new Date(ship.politicalUpdatedAt).toISOString() : '',
        },
        etaPortRegion: ship.etaPortRegion || '',
        piracyZone: ship.piracyZone || false,
      };
    });

    return {
      dayOffset,
      dateLabel: dayOffset === 0 ? '今天' : dayOffset === 1 ? '明天' : '后天',
      ships: shipsWithStatus,
    };
  }

  /**
   * 获取单船综合分析数据（抵港动态 + 任务状态 + 最近活动）
   * 系统自动抓取并梳理输出
   */
  async getShipAnalysis(shipId: number) {
    const ship = await this.prisma.ship.findUnique({ where: { id: shipId } });
    if (!ship) return null;

    const now = new Date();

    // ===== 1. 船舶动态与抵港信息 =====
    const eta = ship.eta ? new Date(ship.eta) : null;
    const etd = ship.etd ? new Date(ship.etd) : null;

    let dynamicStatus = '未知';
    let dynamicDetail = '';
    const rawStatus = (ship.currentStatus || '').toLowerCase();
    const rawLocation = ship.currentLocation || '';

    if (rawLocation.match(/锚泊|抛锚|锚地/)) {
      dynamicStatus = '锚泊中';
      dynamicDetail = ship.currentLocation || '锚泊中';
    } else if (rawLocation.match(/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/)) {
      dynamicStatus = '已靠泊';
      dynamicDetail = ship.currentLocation || '靠泊中';
    } else if (rawLocation.match(/抵港|到港|抵达|到达/) && !rawLocation.match(/预计|预计抵达|预计到达/)) {
      dynamicStatus = '已抵港';
      dynamicDetail = ship.currentLocation || '抵港中';
    } else if (rawLocation.match(/航行|在航|东行|西行|北上|南下|漂航|出港/)) {
      dynamicStatus = '航行中';
      dynamicDetail = ship.currentLocation || '航行中';
    } else if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
      dynamicStatus = '修理中';
      dynamicDetail = ship.currentLocation || '修理中';
    } else if (rawStatus.includes('berth') || rawStatus.includes('靠泊') || rawStatus.includes('在港')) {
      dynamicStatus = '已靠泊';
      dynamicDetail = ship.currentLocation || '靠泊中';
    } else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊')) {
      dynamicStatus = '锚泊中';
      dynamicDetail = ship.currentLocation || '锚泊中';
    } else if (rawStatus.includes('arriv') || rawStatus.includes('抵港') || rawStatus.includes('到港') || rawStatus.includes('到达') || rawStatus.includes('抵达')) {
      dynamicStatus = '已抵港';
      dynamicDetail = ship.currentLocation || '抵港中';
    } else if (eta && etd) {
      if (now < eta) {
        const diffHours = Math.max(1, Math.round((eta.getTime() - now.getTime()) / (1000 * 60 * 60)));
        dynamicStatus = '航行中';
        dynamicDetail = `预计 ${diffHours} 小时后抵达 ${ship.etaPort || '目的港'}`;
      } else if (now >= eta && now < etd) {
        dynamicStatus = '已靠泊';
        dynamicDetail = `${ship.etaPort || '港口'} 靠泊中，预计 ${this.formatDate(etd)} 离港`;
      } else {
        const diffHours = Math.round((now.getTime() - etd.getTime()) / (1000 * 60 * 60));
        dynamicStatus = '已离港';
        dynamicDetail = `已离开 ${diffHours} 小时`;
      }
    } else if (eta) {
      if (now < eta) {
        const diffHours = Math.max(1, Math.round((eta.getTime() - now.getTime()) / (1000 * 60 * 60)));
        dynamicStatus = '航行中';
        dynamicDetail = `预计 ${diffHours} 小时后抵达 ${ship.etaPort || '目的港'}`;
      } else {
        dynamicStatus = '已靠泊';
        dynamicDetail = `${ship.etaPort || '港口'} 靠泊中`;
      }
    } else {
      dynamicStatus = '航行中';
      dynamicDetail = ship.currentLocation || '航行中';
    }

    // ===== 2. 到港检查任务状态 =====
    const tasks = await this.prisma.shipTaskStatus.findMany({
      where: { shipId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        templateType: true,
        status: true,
        progress: true,
        completedItems: true,
        totalItems: true,
        triggerDate: true,
        submittedAt: true,
        updatedAt: true,
      },
    });

    const taskSummary = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length,
      avgProgress: tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0,
    };

    // 按类型分组任务
    const taskGroups: Record<string, any[]> = {};
    for (const t of tasks) {
      const type = t.templateType || 'other';
      if (!taskGroups[type]) taskGroups[type] = [];
      taskGroups[type].push({
        id: t.id,
        status: t.status,
        progress: Math.round(t.progress),
        completedItems: t.completedItems,
        totalItems: t.totalItems,
        triggerDate: t.triggerDate,
        submittedAt: t.submittedAt,
      });
    }

    // ===== 3. 最近日记摘要（主管日记，从中提取抵港记录） =====
    const recentDiaries = await this.prisma.diary.findMany({
      where: { shipId },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        date: true,
        departurePort: true,
        arrivalPort: true,
        dynamicStatus: true,
        shipPosition: true,
        pirateStatus: true,
        content: true,
      },
    });

    // 提取最近的抵港记录
    const portCalls = recentDiaries
      .filter(d => d.arrivalPort)
      .slice(0, 5)
      .map(d => ({
        date: d.date,
        arrivalPort: d.arrivalPort,
        departurePort: d.departurePort || '',
        dynamicStatus: d.dynamicStatus || '',
      }));

    // 最近一条日记摘要
    const latestDiary = recentDiaries[0] || null;
    let latestDiarySummary = '';
    if (latestDiary) {
      const content = latestDiary.content || '';
      latestDiarySummary = content.length > 100 ? content.substring(0, 100) + '...' : content;
    }

    // ===== 4. 船笔记统计 =====
    const noteCount = await this.prisma.shipNote.count({
      where: { shipId },
    });

    const recentNotes = await this.prisma.shipNote.findMany({
      where: { shipId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        content: true,
        source: true,
        createdAt: true,
        starLevel: true,
        isPinned: true,
      },
    });

    // ===== 5. 整合输出 =====
    return {
      shipId: ship.id,
      shipName: ship.cnShipName,
      snapshotTime: now.toISOString(),

      // 动态概览
      dynamic: {
        status: dynamicStatus,
        detail: dynamicDetail,
        currentVoyage: ship.currentVoyage || '',
        currentLocation: ship.currentLocation || '',
        etaPort: ship.etaPort || '',
        eta: ship.eta ? ship.eta.toISOString() : null,
        etd: ship.etd ? ship.etd.toISOString() : null,
        etaDisplay: eta ? this.formatDate(eta) : '',
        etdDisplay: etd ? this.formatDate(etd) : '',
      },

      // 任务完成情况
      tasks: {
        summary: taskSummary,
        groups: taskGroups,
        recentTasks: tasks.slice(0, 5).map(t => ({
          id: t.id,
          type: t.templateType,
          status: t.status,
          progress: Math.round(t.progress),
          completedItems: t.completedItems,
          totalItems: t.totalItems,
          triggerDate: t.triggerDate,
          submittedAt: t.submittedAt,
        })),
      },

      // 最近抵港记录（从主管日记提取）
      portCalls,

      // 最近活动
      activity: {
        latestDiaryDate: latestDiary?.date || null,
        latestDiarySummary,
        noteCount,
        recentNotes: recentNotes.map(n => ({
          id: n.id,
          source: n.source,
          summary: (n.content || '').substring(0, 80) + ((n.content || '').length > 80 ? '...' : ''),
          createdAt: n.createdAt,
          starLevel: n.starLevel,
          isPinned: n.isPinned,
        })),
      },

      // 关键提醒
      alerts: this.generateAlerts(ship, tasks, eta, etd, now),
    };
  }

  private generateAlerts(ship: any, tasks: any[], eta: Date | null, etd: Date | null, now: Date): string[] {
    const alerts: string[] = [];

    // ETA 临近提醒（24小时内）
    if (eta) {
      const diffHours = (eta.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours > 0 && diffHours <= 24) {
        alerts.push(`⏰ ${ship.cnShipName} 预计 ${Math.round(diffHours)} 小时后抵达 ${ship.etaPort || '目的港'}`);
      }
    }

    // ETD 临近提醒（12小时内）
    if (etd) {
      const diffHours = (etd.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours > 0 && diffHours <= 12) {
        alerts.push(`🚢 ${ship.cnShipName} 预计 ${Math.round(diffHours)} 小时后离港`);
      }
    }

    // 待完成任务提醒
    const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.progress < 100);
    if (pendingTasks.length > 0) {
      alerts.push(`📋 ${pendingTasks.length} 项任务待完成`);
    }

    // 长时间未更新提醒
    if (tasks.length > 0) {
      const latestUpdate = new Date(tasks[0].updatedAt);
      const daysSinceUpdate = (now.getTime() - latestUpdate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 3) {
        alerts.push(`⚠️ 任务状态已 ${Math.floor(daysSinceUpdate)} 天未更新`);
      }
    }

    return alerts;
  }

  private formatDate(d: Date): string {
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * 解析船舶报告文本（预览，不写入数据库）
   * 步骤：AI/正则解析 → 船名匹配 shipId → 返回预览结果
   */
  async parseReport(text: string, teamCode: TeamCode) {
    // 1. 解析文本
    const parseResult = await this.shipReportParseService.parseReport(text);
    if (!parseResult.success || parseResult.data.length === 0) {
      return {
        success: false,
        message: parseResult.message || '未能解析出船舶信息',
        mode: parseResult.mode,
        items: [],
      };
    }

    // 2. 船名匹配 shipId
    const ships = await this.prisma.ship.findMany({
      where: { teamCode },
      select: { id: true, cnShipName: true, enShipName: true },
    });

    const items = parseResult.data.map((parsed: any) => {
      let matchedShipId: number | null = null;
      let matchedShipName = '';
      let matchConfidence = 0;

      const parsedName = (parsed.shipName || '').trim();
      if (parsedName) {
        // 使用简繁体通配的匹配函数
        const cnMatch = ships.find(s => {
          const r = matchShipName(s.cnShipName, parsedName);
          if (r.matched) { matchConfidence = r.confidence; return true; }
          return false;
        });
        if (cnMatch) {
          matchedShipId = cnMatch.id;
          matchedShipName = cnMatch.cnShipName;
        } else {
          // 英文名匹配
          const enMatch = ships.find(s =>
            s.enShipName && s.enShipName.toLowerCase() === parsedName.toLowerCase()
          );
          if (enMatch) {
            matchedShipId = enMatch.id;
            matchedShipName = enMatch.cnShipName;
            matchConfidence = 0.9;
          }
        }
      }

      return {
        parsed,
        shipId: matchedShipId,
        shipName: matchedShipName || parsedName,
        matched: matchedShipId !== null,
        matchConfidence,
      };
    });

    return {
      success: true,
      mode: parseResult.mode,
      items,
      summary: {
        total: items.length,
        matched: items.filter(i => i.matched).length,
        unmatched: items.filter(i => !i.matched).length,
      },
    };
  }

  /**
   * 批量更新船舶动态字段（船工主管确认后调用）
   *
   * 业务规则（陈先生 2026-08-10 确认，方案A 完全覆盖）：
   * 1. 同一次粘贴里，同一艘船出现多条记录时，保留最后一条（晚报覆盖早报），其余丢弃。
   * 2. 完全覆盖：这次粘贴的船，所有动态字段都用新数据替换；
   *    新数据未解析出的字段一律清空（设为 null），避免新旧信息混杂。
   * 3. 没粘贴到的船保持原样不动。
   *
   * @param updates [{ shipId, parsed: {...字段} }]
   */
  async batchUpdateDynamic(
    updates: Array<{ shipId: number; parsed: any }>,
    userId: number,
    teamCode: TeamCode,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // === 步骤1：同次粘贴同船多条去重（保留最后一条）===
    // 用 Map 按 shipId 去重，后出现的覆盖先出现的（晚报覆盖早报）
    const dedupMap = new Map<number, { shipId: number; parsed: any }>();
    for (const item of updates) {
      if (item && item.shipId != null) {
        dedupMap.set(item.shipId, item);
      }
    }
    const dedupedUpdates = Array.from(dedupMap.values());

    const results: any[] = [];
    const now = new Date();

    for (const item of dedupedUpdates) {
      const { shipId, parsed } = item;
      try {
        // 校验船舶归属当前团队
        const ship = await this.prisma.ship.findFirst({ where: { id: shipId, teamCode } });
        if (!ship) {
          results.push({ shipId, success: false, message: '船舶不存在或无权操作' });
          continue;
        }

        // === 步骤2：完全覆盖（未解析字段清空为 null）===
        // 字段映射：parsedKey -> dbKey
        const fieldMap: Record<string, string> = {
          voyage: 'currentVoyage',
          currentLocation: 'currentLocation',
          currentStatus: 'currentStatus',
          etaPort: 'etaPort',
          departurePort: 'departurePort',
          cargoStatus: 'cargoStatus',
          visibility: 'visibility',
          temperature: 'temperature',
          windDirection: 'windDirection',
          windForce: 'windForce',
          waveLevel: 'waveLevel',
          timezone: 'timezone',
          focusPoints: 'focusPoints',
          otherNotes: 'otherNotes',
        };

        // 先把所有动态字段置 null（完全清空旧值），再用新数据覆盖
        const data: any = { dynamicSource: 'supervisor', dynamicUpdatedAt: now };
        for (const dbKey of Object.values(fieldMap)) {
          data[dbKey] = null;
        }
        data.eta = null;

        // 写入新数据（非空字段覆盖 null）
        for (const [parsedKey, dbKey] of Object.entries(fieldMap)) {
          const val = parsed[parsedKey];
          if (val !== null && val !== undefined && val !== '') {
            data[dbKey] = val;
          }
        }

        // ETA 单独处理（转 DateTime，未解析出则保持 null）
        if (parsed.eta) {
          const etaDate = new Date(parsed.eta);
          if (!isNaN(etaDate.getTime())) {
            data.eta = etaDate;
          }
        }

        // 根据目的港自动计算区域标识（五眼联盟/欧洲/海盗区）
        if (parsed.etaPort) {
          const region = this.detectRegion(parsed.etaPort);
          data.etaPortRegion = region;
          if (region === 'piracy') {
            data.piracyZone = true;
          } else {
            // 非海盗区，重置海盗标记（完全覆盖语义）
            data.piracyZone = false;
          }
        } else {
          // 未解析出目的港，清空区域标记
          data.etaPortRegion = null;
          data.piracyZone = false;
        }
        // 报告中明确提及"海盗区"也置为海盗区（覆盖上面的判断）
        if (parsed.piracyZone !== undefined && parsed.piracyZone !== null) {
          data.piracyZone = parsed.piracyZone;
        } else {
          const hasPiracyKeyword = [parsed.currentLocation, parsed.focusPoints, parsed.otherNotes]
            .filter(Boolean)
            .some(s => String(s).includes('海盗'));
          if (hasPiracyKeyword) {
            data.piracyZone = true;
          }
        }

        await this.prisma.ship.update({ where: { id: shipId }, data });

        results.push({
          shipId,
          shipName: ship.cnShipName,
          success: true,
          updatedFields: Object.keys(data).filter(k => k !== 'dynamicSource' && k !== 'dynamicUpdatedAt'),
        });
      } catch (e: any) {
        this.logger.error(`批量更新船舶动态失败 shipId=${shipId}`, e);
        results.push({ shipId, success: false, message: e.message || '更新失败' });
      }
    }

    // 清缓存
    await this.redisService.del(`ships:${teamCode}`);

    // 操作日志
    const matchedNames = results.filter(r => r.success).map(r => r.shipName).join('、');
    if (matchedNames) {
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: '修改',
        operationContent: `粘贴船舶报告更新动态：${matchedNames}（${results.filter(r => r.success).length}艘）`,
        ipAddress,
        userAgent,
      });
    }

    return {
      success: true,
      results,
      summary: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }

  /**
   * 解析政委报告文本（预览，不写入数据库）
   * 步骤：AI/正则解析 → 船名匹配 shipId → 返回预览结果
   */
  async parsePoliticalReport(text: string, teamCode: TeamCode) {
    const parseResult = await this.shipReportParseService.parsePoliticalReport(text);
    if (!parseResult.success || parseResult.data.length === 0) {
      return {
        success: false,
        message: parseResult.message || '未能解析出政委报告信息',
        mode: parseResult.mode,
        items: [],
      };
    }

    const ships = await this.prisma.ship.findMany({
      where: { teamCode },
      select: { id: true, cnShipName: true, enShipName: true },
    });

    const items = parseResult.data.map((parsed: any) => {
      let matchedShipId: number | null = null;
      let matchedShipName = '';
      let matchConfidence = 0;

      const parsedName = (parsed.shipName || '').trim();
      if (parsedName) {
        // 使用简繁体通配的匹配函数
        const cnMatch = ships.find(s => {
          const r = matchShipName(s.cnShipName, parsedName);
          if (r.matched) { matchConfidence = r.confidence; return true; }
          return false;
        });
        if (cnMatch) {
          matchedShipId = cnMatch.id;
          matchedShipName = cnMatch.cnShipName;
        } else {
          const enMatch = ships.find(s =>
            s.enShipName && s.enShipName.toLowerCase() === parsedName.toLowerCase()
          );
          if (enMatch) {
            matchedShipId = enMatch.id;
            matchedShipName = enMatch.cnShipName;
            matchConfidence = 0.9;
          }
        }
      }

      return {
        parsed,
        shipId: matchedShipId,
        shipName: matchedShipName || parsedName,
        matched: matchedShipId !== null,
        matchConfidence,
      };
    });

    return {
      success: true,
      mode: parseResult.mode,
      items,
      summary: {
        total: items.length,
        matched: items.filter(i => i.matched).length,
        unmatched: items.filter(i => !i.matched).length,
      },
    };
  }

  /**
   * 检测目的港所属区域
   * @param port 目的港名称
   * @returns fiveEyes | europe | piracy | other
   */
  private detectRegion(port: string): string {
    if (!port) return 'other';
    const p = port.toLowerCase();
    
    const fiveEyes = ['美国', '美国', '英国', '英国', '加拿大', '加拿大', '澳大利亚', '澳大利亚', '新西兰', '新西兰',
      'usa', 'united states', 'america', 'uk', 'united kingdom', 'britain', 'england',
      'canada', 'canadian', 'australia', 'australian', 'new zealand', 'nz'];
    const europe = ['欧洲', '欧盟', '法国', '德国', '意大利', '西班牙', '荷兰', '比利时', '卢森堡', '爱尔兰', '葡萄牙',
      '奥地利', '希腊', '芬兰', '瑞典', '丹麦', '挪威', '瑞士', '波兰', '匈牙利', '捷克',
      'france', 'germany', 'italy', 'spain', 'netherlands', 'belgium', 'luxembourg', 'ireland',
      'portugal', 'austria', 'greece', 'finland', 'sweden', 'denmark', 'norway', 'switzerland', 'europe'];
    const piracy = ['索马里', '亚丁湾', '红海', '波斯湾', '马六甲', '海盗', 'piracy'];
    
    if (fiveEyes.some(country => p.includes(country))) return 'fiveEyes';
    if (europe.some(country => p.includes(country))) return 'europe';
    if (piracy.some(zone => p.includes(zone))) return 'piracy';
    return 'other';
  }

  /**
   * 批量更新政委报告字段（船工主管确认后调用）
   *
   * 业务规则（陈先生 2026-08-10 确认，方案A 完全覆盖）：
   * 1. 同一次粘贴里，同一艘船出现多条记录时，保留最后一条，其余丢弃。
   * 2. 完全覆盖：这次粘贴的船，所有政委报告字段都用新数据替换；
   *    新数据未解析出的字段一律清空（设为 null），避免新旧信息混杂。
   * 3. 没粘贴到的船保持原样不动。
   *
   * @param updates [{ shipId, parsed: {...字段} }]
   */
  async batchUpdatePolitical(
    updates: Array<{ shipId: number; parsed: any }>,
    userId: number,
    teamCode: TeamCode,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // === 步骤1：同次粘贴同船多条去重（保留最后一条）===
    const dedupMap = new Map<number, { shipId: number; parsed: any }>();
    for (const item of updates) {
      if (item && item.shipId != null) {
        dedupMap.set(item.shipId, item);
      }
    }
    const dedupedUpdates = Array.from(dedupMap.values());

    const results: any[] = [];
    const now = new Date();

    for (const item of dedupedUpdates) {
      const { shipId, parsed } = item;
      try {
        const ship = await this.prisma.ship.findFirst({ where: { id: shipId, teamCode } });
        if (!ship) {
          results.push({ shipId, success: false, message: '船舶不存在或无权操作' });
          continue;
        }

        // === 步骤2：完全覆盖（未解析字段清空为 null）===
        // 字段映射：parsedKey -> dbKey
        const fieldMap: Record<string, string> = {
          voyage: 'politicalVoyage',
          status: 'politicalStatus',
          location: 'politicalLocation',
          weather: 'politicalWeather',
          seaCondition: 'politicalSeaCondition',
          staffChange: 'politicalStaffChange',
          focusPoints: 'politicalFocusPoints',
          remark: 'politicalOtherNotes',
          otherNotes: 'politicalOtherNotes',
          eta: 'politicalOtherNotes',
        };

        // 先把所有政委报告字段置 null（完全清空旧值），再用新数据覆盖
        const data: any = { politicalUpdatedAt: now, dynamicSource: 'political' };
        const politicalKeysToReset = [
          'politicalVoyage',
          'politicalStatus',
          'politicalLocation',
          'politicalWeather',
          'politicalSeaCondition',
          'politicalStaffChange',
          'politicalFocusPoints',
          'politicalOtherNotes',
          'politicalETA',
          'politicalETD',
          'politicalETAPort',
        ];
        for (const dbKey of politicalKeysToReset) {
          data[dbKey] = null;
        }

        // 写入新数据（非空字段覆盖 null）
        for (const [parsedKey, dbKey] of Object.entries(fieldMap)) {
          const val = parsed[parsedKey];
          if (val !== null && val !== undefined && val !== '') {
            data[dbKey] = val;
          }
        }

        if (parsed.arrivalTime) {
          const dateVal = new Date(parsed.arrivalTime);
          if (!isNaN(dateVal.getTime())) {
            data.politicalETA = dateVal;
          }
        }

        if (parsed.leaveTime) {
          const dateVal = new Date(parsed.leaveTime);
          if (!isNaN(dateVal.getTime())) {
            data.politicalETD = dateVal;
          }
        }

        if (parsed.etaPort || parsed.arrivalPort) {
          data.politicalETAPort = parsed.etaPort || parsed.arrivalPort;
          data.etaPortRegion = this.detectRegion(data.politicalETAPort);
        } else {
          // 未解析出目的港，清空区域标记（注意：etaPortRegion 是与船舶报告共享字段，
          // 此处仅清空政委报告侧的目的港区域，避免误清船舶报告已识别的区域）
          // 不重置 etaPortRegion，保留船舶报告侧的判断
        }

        if (parsed.piracyZone !== undefined && parsed.piracyZone !== null) {
          data.piracyZone = parsed.piracyZone;
        } else {
          const hasPiracy = [parsed.status, parsed.weather, parsed.seaCondition, parsed.remark, parsed.focusPoints]
            .filter(Boolean).some(s => String(s).includes('海盗') || String(s).includes('海盗区'));
          if (hasPiracy) {
            data.piracyZone = true;
          }
        }

        await this.prisma.ship.update({ where: { id: shipId }, data });

        results.push({
          shipId,
          shipName: ship.cnShipName,
          success: true,
          updatedFields: Object.keys(data).filter(k => k !== 'politicalUpdatedAt'),
        });
      } catch (e: any) {
        this.logger.error(`批量更新政委报告失败 shipId=${shipId}`, e);
        results.push({ shipId, success: false, message: e.message || '更新失败' });
      }
    }

    await this.redisService.del(`ships:${teamCode}`);

    const matchedNames = results.filter(r => r.success).map(r => r.shipName).join('、');
    if (matchedNames) {
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: '修改',
        operationContent: `粘贴政委报告更新动态：${matchedNames}（${results.filter(r => r.success).length}艘）`,
        ipAddress,
        userAgent,
      });
    }

    return {
      success: true,
      results,
      summary: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }
}
