import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';

@Injectable()
export class MeetingRecordService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  // 创建会议纪要
  async create(data: {
    teamCode: string;
    userId: number;
    title: string;
    meetingDate: string;
    location?: string;
    participants?: any;
    diaryId?: number;
    templateId?: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const record = await this.prisma.meetingRecord.create({
      data: {
        teamCode: data.teamCode as any,
        userId: data.userId,
        title: data.title,
        meetingDate: new Date(data.meetingDate),
        location: data.location,
        participants: data.participants,
        diaryId: data.diaryId,
        templateId: data.templateId,
        status: 'draft',
      },
    });

    await this.operationLogService.create({
      userId: data.userId,
      teamCode: data.teamCode,
      operationType: '新增',
      operationContent: `创建会议纪要：${data.title}（ID:${record.id}）`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return record;
  }

  // 上传录音文件关联
  async attachRecording(id: number, teamCode: string, userId: number, recordingUrl: string, duration?: number, fileSize?: number) {
    const record = await this.prisma.meetingRecord.findFirst({
      where: { id, teamCode: teamCode as any },
    });

    if (!record) {
      throw new NotFoundException('会议记录不存在');
    }

    const updated = await this.prisma.meetingRecord.update({
      where: { id },
      data: {
        recordingUrl,
        duration,
        fileSize,
        status: 'transcribing',
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `上传录音到会议纪要（ID:${id}）`,
    });

    return updated;
  }

  // 更新转写文本
  async updateTranscript(id: number, teamCode: string, transcript: string) {
    return this.prisma.meetingRecord.update({
      where: { id, teamCode: teamCode as any },
      data: {
        transcript,
        status: 'summarizing',
      },
    });
  }

  // 更新AI摘要
  async updateSummary(id: number, teamCode: string, summary: string, actionItems?: any) {
    return this.prisma.meetingRecord.update({
      where: { id, teamCode: teamCode as any },
      data: {
        summary,
        actionItems,
        status: 'completed',
      },
    });
  }

  // 获取列表
  async findAll(teamCode: string, userId: number, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.meetingRecord.findMany({
        where: { teamCode: teamCode as any },
        orderBy: { meetingDate: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.meetingRecord.count({
        where: { teamCode: teamCode as any },
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // 获取单个
  async findOne(id: number, teamCode: string) {
    const record = await this.prisma.meetingRecord.findFirst({
      where: { id, teamCode: teamCode as any },
    });

    if (!record) {
      throw new NotFoundException('会议记录不存在');
    }

    return record;
  }

  // 更新会议纪要（用户编辑）
  async update(id: number, teamCode: string, userId: number, data: {
    title?: string;
    summary?: string;
    actionItems?: any;
    customNotes?: string;
  }) {
    const existing = await this.prisma.meetingRecord.findFirst({
      where: { id, teamCode: teamCode as any },
    });

    if (!existing) {
      throw new NotFoundException('会议记录不存在');
    }

    const updated = await this.prisma.meetingRecord.update({
      where: { id },
      data: {
        ...data,
        isEdited: true,
      },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '修改',
      operationContent: `编辑会议纪要：${existing.title}（ID:${id}）`,
    });

    return updated;
  }

  // 删除
  async remove(id: number, teamCode: string, userId: number) {
    const existing = await this.prisma.meetingRecord.findFirst({
      where: { id, teamCode: teamCode as any },
    });

    if (!existing) {
      throw new NotFoundException('会议记录不存在');
    }

    await this.prisma.meetingRecord.delete({
      where: { id },
    });

    await this.operationLogService.create({
      userId,
      teamCode,
      operationType: '删除',
      operationContent: `删除会议纪要：${existing.title}（ID:${id}）`,
    });

    return { success: true };
  }
}
