import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiaryBlockType, TeamCode } from '@prisma/client';
import { CreateDiaryBlockDto } from './dto/create-diary-block.dto';
import { UpdateDiaryBlockDto } from './dto/update-diary-block.dto';
import { BlockClassifierService } from './block-classifier.service';

@Injectable()
export class DiaryBlockService {
  private readonly logger = new Logger(DiaryBlockService.name);

  constructor(
    private prisma: PrismaService,
    private classifier: BlockClassifierService,
  ) {}

  /**
   * 按 diaryId 查询所有块（按 sortOrder 排序）
   */
  async findByDiaryId(diaryId: number, userId: number, teamCode: TeamCode) {
    const diary = await this.prisma.diary.findUnique({ where: { id: diaryId } });
    if (!diary) throw new NotFoundException('日记不存在');
    if (diary.teamCode !== teamCode) throw new ForbiddenException('无权查看');

    return this.prisma.diaryBlock.findMany({
      where: { diaryId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(id: number, userId: number, teamCode: TeamCode) {
    const block = await this.prisma.diaryBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('块不存在');
    if (block.teamCode !== teamCode) throw new ForbiddenException('无权查看');
    return block;
  }

  /**
   * 按 shipId 查询关联的日记块 + 待办（仅未完成的 todo）
   * 用于船舶卡片展示
   */
  async findByShipId(shipId: number, userId: number, teamCode: TeamCode) {
    return this.prisma.diaryBlock.findMany({
      where: {
        teamCode,
        detectedShipId: shipId,
        OR: [
          { blockType: { not: DiaryBlockType.todo } }, // 非待办都显示
          { todoStatus: { not: 'completed' } }, // 待办：仅未完成
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
      include: {
        diary: { select: { id: true, date: true, userId: true } },
      },
    });
  }

  /**
   * 创建块：自动执行 AI 分类 + 船名识别
   */
  async create(dto: CreateDiaryBlockDto, userId: number, teamCode: TeamCode) {
    const diary = await this.prisma.diary.findUnique({ where: { id: dto.diaryId } });
    if (!diary) throw new NotFoundException('日记不存在');
    if (diary.teamCode !== teamCode || diary.userId !== userId) {
      throw new ForbiddenException('无权在该日记下创建块');
    }

    // 若没有指定 sortOrder，则取当前最大 +1
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const max = await this.prisma.diaryBlock.aggregate({
        where: { diaryId: dto.diaryId },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? -1) + 1;
    }

    // AI 分类 + 船名识别
    let suggested: DiaryBlockType = dto.blockType ? (dto.blockType as DiaryBlockType) : DiaryBlockType.diary;
    if (!dto.blockType) {
      suggested = this.classifier.classifyType(dto.content).suggested;
    }

    const ship = await this.classifier.detectShip(dto.content, teamCode);

    // 如果 blockType 是 todo，同步创建一条 Schedule（复用现有日程系统）
    let scheduleId = dto.scheduleId;
    const finalBlockType = dto.blockType ? (dto.blockType as DiaryBlockType) : suggested;
    if (finalBlockType === DiaryBlockType.todo && !scheduleId) {
      try {
        const sched = await this.prisma.schedule.create({
          data: {
            teamCode,
            userId,
            shipId: ship?.id ?? diary.shipId ?? undefined,
            recordDate: diary.date,
            firstType: '待办事项',
            secondType: '日记流转',
            content: dto.content,
            finishStatus: dto.todoStatus || 'pending',
          },
        });
        scheduleId = sched.id;
      } catch (e) {
        this.logger.warn('创建关联 Schedule 失败，继续创建 DiaryBlock：', e.message);
      }
    }

    return this.prisma.diaryBlock.create({
      data: {
        diaryId: dto.diaryId,
        userId,
        teamCode,
        sortOrder,
        blockType: finalBlockType,
        content: dto.content,
        todoStatus: finalBlockType === DiaryBlockType.todo ? (dto.todoStatus || 'pending') : undefined,
        todoDueDate: dto.todoDueDate ? new Date(dto.todoDueDate) : undefined,
        metaJson: dto.metaJson,
        aiSuggested: suggested,
        userChanged: !!dto.blockType && dto.blockType !== suggested,
        detectedShipId: ship?.id,
        detectedShipName: ship?.name,
        scheduleId,
      },
    });
  }

  async update(id: number, dto: UpdateDiaryBlockDto, userId: number, teamCode: TeamCode) {
    const block = await this.prisma.diaryBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('块不存在');
    if (block.userId !== userId || block.teamCode !== teamCode) {
      throw new ForbiddenException('无权修改该块');
    }

    // 如果用户手动修改了类型，记录日志
    if (dto.userManuallyChangedType && dto.blockType && block.aiSuggested) {
      try {
        await this.prisma.diaryBlockClassificationLog.create({
          data: {
            userId,
            teamCode,
            aiSuggested: block.aiSuggested,
            userCorrected: dto.blockType as DiaryBlockType,
            content: dto.content ?? block.content,
          },
        });
        // 触发异步权重重训练（无需 await）
        this.classifier.retrainWeights(userId, teamCode);
      } catch (e) {
        this.logger.warn('记录分类训练日志失败：', e.message);
      }
    }

    // 重新 AI 分类 + 船名识别（仅当 content 变了且用户没手动强制指定 blockType）
    let newSuggested = block.aiSuggested;
    let newShip: { id: number; name: string } | null = null;
    if (dto.content !== undefined && dto.content !== block.content && !dto.blockType) {
      newSuggested = this.classifier.classifyType(dto.content).suggested;
      newShip = await this.classifier.detectShip(dto.content, teamCode);
    }

    // 如果块类型改为 todo，且尚未关联 Schedule，则创建
    let scheduleId = dto.scheduleId ?? block.scheduleId;
    const finalBlockType = (dto.blockType as DiaryBlockType) ?? block.blockType;
    if (finalBlockType === DiaryBlockType.todo && !scheduleId) {
      try {
        const diary = await this.prisma.diary.findUnique({ where: { id: block.diaryId } });
        const sched = await this.prisma.schedule.create({
          data: {
            teamCode,
            userId,
            shipId: newShip?.id ?? block.detectedShipId ?? diary?.shipId ?? undefined,
            recordDate: diary?.date ?? new Date(),
            firstType: '待办事项',
            secondType: '日记流转',
            content: dto.content ?? block.content,
            finishStatus: dto.todoStatus || block.todoStatus || 'pending',
          },
        });
        scheduleId = sched.id;
      } catch (e) {
        this.logger.warn('更新块时同步创建 Schedule 失败：', e.message);
      }
    }

    // 如果是 todo 状态变化，同步到 Schedule
    if (finalBlockType === DiaryBlockType.todo && scheduleId && dto.todoStatus && dto.todoStatus !== block.todoStatus) {
      try {
        await this.prisma.schedule.update({
          where: { id: scheduleId },
          data: { finishStatus: dto.todoStatus === 'completed' ? 'completed' : 'pending' },
        });
      } catch (e) {
        this.logger.warn('同步 Schedule 状态失败：', e.message);
      }
    }

    return this.prisma.diaryBlock.update({
      where: { id },
      data: {
        sortOrder: dto.sortOrder ?? block.sortOrder,
        blockType: finalBlockType,
        content: dto.content ?? block.content,
        todoStatus: finalBlockType === DiaryBlockType.todo
          ? (dto.todoStatus ?? block.todoStatus ?? 'pending')
          : undefined,
        todoDueDate: dto.todoDueDate ? new Date(dto.todoDueDate) : block.todoDueDate,
        metaJson: dto.metaJson ?? block.metaJson,
        aiSuggested: newSuggested,
        userChanged: dto.userManuallyChangedType ?? block.userChanged,
        detectedShipId: newShip?.id ?? block.detectedShipId,
        detectedShipName: newShip?.name ?? block.detectedShipName,
        scheduleId,
      },
    });
  }

  async remove(id: number, userId: number, teamCode: TeamCode) {
    const block = await this.prisma.diaryBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('块不存在');
    if (block.userId !== userId || block.teamCode !== teamCode) {
      throw new ForbiddenException('无权删除该块');
    }
    return this.prisma.diaryBlock.delete({ where: { id } });
  }

  /**
   * 批量重新排序（sortOrder）
   */
  async reorder(diaryId: number, orderedIds: number[], userId: number, teamCode: TeamCode) {
    const diary = await this.prisma.diary.findUnique({ where: { id: diaryId } });
    if (!diary) throw new NotFoundException('日记不存在');
    if (diary.userId !== userId || diary.teamCode !== teamCode) {
      throw new ForbiddenException('无权操作');
    }
    const txs = orderedIds.map((id, idx) =>
      this.prisma.diaryBlock.updateMany({
        where: { id, userId, teamCode },
        data: { sortOrder: idx },
      }),
    );
    await this.prisma.$transaction(txs);
    return { ok: true };
  }

  /**
   * 触发权重重训练（手动调用或定时）
   */
  async retrain(userId: number, teamCode: TeamCode) {
    await this.classifier.retrainWeights(userId, teamCode);
    return { ok: true };
  }
}
