import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ShipModule } from './ship/ship.module';
import { DictModule } from './dict/dict.module';
import { StaffHistoryModule } from './staff-history/staff-history.module';
import { SopFlowModule } from './sop-flow/sop-flow.module';
import { PublicCaseModule } from './public-case/public-case.module';
import { OperationLogModule } from './operation-log/operation-log.module';
import { AIBriefModule } from './ai-brief/ai-brief.module';
import { SyncModule } from './sync/sync.module';
import { DiaryModule } from './diary/diary.module';
import { PortModule } from './port/port.module';
import { PublishModule } from './publish/publish.module';
import { TaskModule } from './task/task.module';
import { ExperienceModule } from './experience/experience.module';
import { FileModule } from './file/file.module';
import { PortCheckModule } from './port-check/port-check.module';
import { PartyActivityModule } from './party-activity/party-activity.module';
import { ThoughtReportModule } from './thought-report/thought-report.module';
import { IntegrityRecordModule } from './integrity-record/integrity-record.module';
import { OfficerProfileModule } from './officer-profile/officer-profile.module';
import { OpsModule } from './ops/ops.module';
import { TitleModule } from './title/title.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AICategorizationModule } from './ai-categorization/ai-categorization.module';
import { UserGuideModule } from './user-guide/user-guide.module';
import { AIDashboardReportModule } from './ai-dashboard-report/ai-dashboard-report.module';
import { UserManagementModule } from './admin/user-management.module';
import { DataExportModule } from './data-export/data-export.module';
import { MeetingRecordModule } from './meeting-record/meeting-record.module';
import { NotificationsModule } from './websocket/notifications.module';
import { SearchModule } from './search/search.module';
import { VersionHistoryModule } from './version-history/version-history.module';
import { VersionModule } from './version/version.module';
import { StaffAssignmentModule } from './staff-assignment/staff-assignment.module';
import { AccountModule } from './account/account.module';
import { FileCollectionModule } from './file-collection/file-collection.module';
import { CrewModule } from './crew/crew.module';
import { HealthReportModule } from './health-report/health-report.module';
import { AIStatsModule } from './ai-stats/ai-stats.module';
import { PartyConfigModule } from './party-config/party-config.module';
import { RoleMenuConfigModule } from './role-menu-config/role-menu-config.module';
import { HealthController } from './health/health.controller';
import { AppealModule } from './appeal/appeal.module';
import { MigrationModule } from './migration/migration.module';
import { RecurringScheduleModule } from './recurring-schedule/recurring-schedule.module';
import { ClientLogModule } from './client-log/client-log.module';
import { NotificationModule } from './notification/notification.module';
import { MagazineModule } from './magazine/magazine.module';
import { MockDataModule } from './mock-data/mock-data.module';
import { ShipNoteModule } from './ship-note/ship-note.module';
import { DiaryBlockModule } from './diary-block/diary-block.module';
import { ImportantDateModule } from './important-date/important-date.module';
import { ScheduleReminderModule } from './schedule-reminder/schedule-reminder.module';
import { ScheduleSettingsModule } from './schedule-settings/schedule-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ScheduleModule,
    ShipModule,
    DictModule,
    StaffHistoryModule,
    SopFlowModule,
    PublicCaseModule,
    OperationLogModule,
    AIBriefModule,
    SyncModule,
    DiaryModule,
    PortModule,
    PublishModule,
    TaskModule,
    ExperienceModule,
    FileModule,
    PortCheckModule,
    PartyActivityModule,
    ThoughtReportModule,
    IntegrityRecordModule,
    OfficerProfileModule,
    OpsModule,
    TitleModule,
    DashboardModule,
    AICategorizationModule,
    UserGuideModule,
    AIDashboardReportModule,
    UserManagementModule,
    DataExportModule,
    MeetingRecordModule,
    NotificationsModule,
    SearchModule,
    VersionHistoryModule,
    VersionModule,
    StaffAssignmentModule,
    AccountModule,
    FileCollectionModule,
    CrewModule,
    HealthReportModule,
    AIStatsModule,
    PartyConfigModule,
    RoleMenuConfigModule,
    AppealModule,
    MigrationModule,
    RecurringScheduleModule,
    ClientLogModule,
    NotificationModule,
    MagazineModule,
    MockDataModule,
    ShipNoteModule,
    DiaryBlockModule,
    ImportantDateModule,
    ScheduleReminderModule,
    ScheduleSettingsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
