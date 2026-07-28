import { Module } from '@nestjs/common';
import { MeetingRecordController } from './meeting-record.controller';
import { MeetingTemplateController } from './meeting-template.controller';
import { MeetingTermController } from './meeting-term.controller';
import { MeetingRecordService } from './meeting-record.service';
import { MeetingTemplateService } from './meeting-template.service';
import { MeetingTermService } from './meeting-term.service';
import { AiMeetingService } from './ai-meeting.service';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [OperationLogModule],
  controllers: [
    MeetingRecordController,
    MeetingTemplateController,
    MeetingTermController,
  ],
  providers: [
    MeetingRecordService,
    MeetingTemplateService,
    MeetingTermService,
    AiMeetingService,
  ],
  exports: [MeetingRecordService, MeetingTemplateService, MeetingTermService, AiMeetingService],
})
export class MeetingRecordModule {}
