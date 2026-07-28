import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

export interface ShipPartyConfigData {
  activityFrequency?: 'weekly' | 'biweekly' | 'monthly';
  studyTopics?: string[];
  reportTemplateId?: number;
  specialRequirements?: string;
}

@Injectable()
export class PartyConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取船舶差异化党建配置（一船一策）
   * 先读取 PartyActivity 记录分析当前活动模式，再合并已存储的覆盖配置
   */
  async getShipSpecificConfig(teamCode: TeamCode, shipId: number) {
    // 验证 shipId 是否为有效的正整数
    if (!Number.isFinite(shipId) || shipId <= 0 || !Number.isInteger(shipId)) {
      throw new BadRequestException(`无效的船舶ID: ${shipId}`);
    }

    // 读取该船舶的 PartyActivity 记录，分析活动频率
    const activities = await this.prisma.partyActivity.findMany({
      where: { teamCode, shipId },
      orderBy: { activityDate: 'desc' },
      take: 50,
      select: {
        activityType: true,
        title: true,
        activityDate: true,
        agenda: true,
      },
    });

    // 计算活动频率（基于最近6个月的活动间隔）
    let derivedFrequency: ShipPartyConfigData['activityFrequency'] = 'monthly';
    if (activities.length >= 2) {
      const sorted = activities
        .map((a) => new Date(a.activityDate).getTime())
        .sort((a, b) => b - a);
      const intervals: number[] = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        intervals.push(sorted[i] - sorted[i + 1]);
      }
      const avgIntervalDays = intervals.reduce((s, v) => s + v, 0) / intervals.length / (1000 * 60 * 60 * 24);
      if (avgIntervalDays <= 10) {
        derivedFrequency = 'weekly';
      } else if (avgIntervalDays <= 20) {
        derivedFrequency = 'biweekly';
      } else {
        derivedFrequency = 'monthly';
      }
    }

    // 从活动记录中提取学习主题
    const topicSet = new Set<string>();
    for (const a of activities) {
      if (a.title) {
        topicSet.add(a.title);
      }
    }
    const derivedTopics = Array.from(topicSet).slice(0, 10);

    // 读取已存储的覆盖配置
    const storedConfig = await this.prisma.shipPartyConfig.findUnique({
      where: { shipId },
    });

    const ship = await this.prisma.ship.findUnique({
      where: { id: shipId },
      select: { cnShipName: true, teamCode: true },
    });

    return {
      shipId,
      shipName: ship?.cnShipName ?? '',
      teamCode: ship?.teamCode ?? teamCode,
      derived: {
        activityFrequency: derivedFrequency,
        studyTopics: derivedTopics,
      },
      config: (storedConfig?.config as ShipPartyConfigData) ?? {
        activityFrequency: derivedFrequency,
        studyTopics: [],
        reportTemplateId: undefined,
        specialRequirements: '',
      },
      hasOverride: storedConfig !== null,
      activitiesCount: activities.length,
    };
  }

  /**
   * 更新船舶差异化党建配置
   */
  async updateShipSpecificConfig(
    teamCode: TeamCode,
    shipId: number,
    config: ShipPartyConfigData,
    userId?: number,
  ) {
    // 验证 shipId 是否为有效的正整数
    if (!Number.isFinite(shipId) || shipId <= 0 || !Number.isInteger(shipId)) {
      throw new BadRequestException(`无效的船舶ID: ${shipId}`);
    }

    // 确保船舶存在
    const ship = await this.prisma.ship.findUnique({
      where: { id: shipId },
    });
    if (!ship) {
      throw new NotFoundException('船舶不存在');
    }

    const result = await this.prisma.shipPartyConfig.upsert({
      where: { shipId },
      update: {
        config: config as any,
        updatedBy: userId,
      },
      create: {
        teamCode,
        shipId,
        config: config as any,
        updatedBy: userId,
      },
    });

    return result;
  }

  /**
   * 获取所有船舶的党建配置列表
   */
  async getAllShipsConfig(teamCode: TeamCode) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode },
      orderBy: { cnShipName: 'asc' },
      select: {
        id: true,
        cnShipName: true,
        teamCode: true,
        politicalInstructor: true,
        partyConfig: {
          select: {
            config: true,
            updatedAt: true,
            updatedBy: true,
          },
        },
      },
    });

    return ships.map((ship) => ({
      shipId: ship.id,
      shipName: ship.cnShipName,
      teamCode: ship.teamCode,
      politicalInstructor: ship.politicalInstructor,
      config: (ship.partyConfig?.config as ShipPartyConfigData) ?? {
        activityFrequency: undefined,
        studyTopics: [],
        reportTemplateId: undefined,
        specialRequirements: '',
      },
      hasOverride: ship.partyConfig !== null,
      updatedAt: ship.partyConfig?.updatedAt ?? null,
      updatedBy: ship.partyConfig?.updatedBy ?? null,
    }));
  }
}