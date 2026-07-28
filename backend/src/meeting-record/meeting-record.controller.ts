import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Headers, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingRecordService } from './meeting-record.service';
import { AiMeetingService } from './ai-meeting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('meeting-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingRecordController {
  constructor(
    private readonly meetingRecordService: MeetingRecordService,
    private readonly aiMeetingService: AiMeetingService,
  ) {}

  @Post()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  async create(@Body() body: any, @Request() req) {
    const record = await this.meetingRecordService.create({
      teamCode: req.user.teamCode,
      userId: req.user.id,
      title: body.title || '会议录音',
      meetingDate: body.meetingDate || body.date || new Date().toISOString(),
      location: body.location,
      participants: body.participants,
      diaryId: body.diaryId,
      templateId: body.templateId,
      ipAddress: getClientIp(req),
      userAgent: body.userAgent,
    });
    return record;
  }

  @Post(':id/upload-recording')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: join(__dirname, '../../uploads/recordings'),
      filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  }))
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  uploadRecording(@Param('id') id: string, @UploadedFile() file: any, @Request() req) {
    return this.meetingRecordService.attachRecording(
      parseInt(id, 10),
      req.user.teamCode,
      req.user.id,
      `/uploads/recordings/${file.filename}`,
      parseInt(req.body.duration) || undefined,
      file.size,
    );
  }

  @Post(':id/transcribe')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  transcribe(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.meetingRecordService.updateTranscript(
      parseInt(id, 10),
      req.user.teamCode,
      body.transcript,
    );
  }

  @Post(':id/summarize')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  summarize(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.meetingRecordService.updateSummary(
      parseInt(id, 10),
      req.user.teamCode,
      body.summary,
      body.actionItems,
    );
  }

  // 一键处理录音：转写 + 生成摘要
  @Post(':id/process-recording')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  async processRecording(@Param('id') id: string, @Request() req) {
    const recordId = parseInt(id, 10);
    const record = await this.meetingRecordService.findOne(recordId, req.user.teamCode);

    // 1. 语音转写
    const transcript = await this.aiMeetingService.speechToText(record.recordingUrl);
    await this.meetingRecordService.updateTranscript(recordId, req.user.teamCode, transcript);

    // 2. 生成摘要
    const result = await this.aiMeetingService.generateSummary(
      transcript,
      record.title,
      undefined, // template
      undefined, // customTerms
    );

    // 3. 更新摘要
    await this.meetingRecordService.updateSummary(
      recordId,
      req.user.teamCode,
      result.summary,
      result.actionItems,
    );

    return {
      success: true,
      transcript,
      summary: result.summary,
      actionItems: result.actionItems,
    };
  }

  @Get()
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findAll(@Request() req, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.meetingRecordService.findAll(
      req.user.teamCode,
      req.user.id,
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
    );
  }

  @Get(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findOne(@Param('id') id: string, @Request() req) {
    return this.meetingRecordService.findOne(parseInt(id, 10), req.user.teamCode);
  }

  @Patch(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  update(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.meetingRecordService.update(
      parseInt(id, 10),
      req.user.teamCode,
      req.user.id,
      body,
    );
  }

  @Delete(':id')
  @Roles(UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  remove(@Param('id') id: string, @Request() req) {
    return this.meetingRecordService.remove(parseInt(id, 10), req.user.teamCode, req.user.id);
  }
}

function getClientIp(req: any): string {
  return req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}
