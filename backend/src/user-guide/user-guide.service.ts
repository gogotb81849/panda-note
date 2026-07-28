import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

@Injectable()
export class UserGuideService {
  constructor(private prisma: PrismaService) {}

  // 获取用户引导状态
  async getGuideState(teamCode: TeamCode, userId: number) {
    let state = await this.prisma.userGuideState.findUnique({
      where: { teamCode_userId: { teamCode, userId } },
    });

    if (!state) {
      state = await this.prisma.userGuideState.create({
        data: {
          teamCode,
          userId,
          guideStep: 'welcome',
          completedSteps: [],
          skipped: false,
        },
      });
    }

    return state;
  }

  // 更新引导进度
  async updateGuideStep(teamCode: TeamCode, userId: number, step: string) {
    return this.prisma.userGuideState.update({
      where: { teamCode_userId: { teamCode, userId } },
      data: {
        guideStep: step,
        updatedAt: new Date(),
      },
    });
  }

  // 完成引导
  async completeGuide(teamCode: TeamCode, userId: number, completedSteps: number[]) {
    return this.prisma.userGuideState.update({
      where: { teamCode_userId: { teamCode, userId } },
      data: {
        guideStep: 'completed',
        completedSteps,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // 跳过引导
  async skipGuide(teamCode: TeamCode, userId: number) {
    return this.prisma.userGuideState.update({
      where: { teamCode_userId: { teamCode, userId } },
      data: {
        skipped: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // 重置引导（用户在设置中重新触发）
  async resetGuide(teamCode: TeamCode, userId: number) {
    return this.prisma.userGuideState.update({
      where: { teamCode_userId: { teamCode, userId } },
      data: {
        guideStep: 'welcome',
        completedSteps: [],
        skipped: false,
        completedAt: null,
        updatedAt: new Date(),
      },
    });
  }
}
