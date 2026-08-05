export interface User {
  id: number;
  username: string;
  realName: string;
  teamCode: string;
  role: string;
  roles?: string[];
  lastLoginAt?: string;
  loginFailCount?: number;
  lockedUntil?: string;
}

export interface Ship {
  id: number;
  teamCode: string;
  cnShipName: string;
  enShipName?: string;
  flagCountry?: string;
  portRegistry?: string;
  shipType?: string;
  deadweightTonnage?: string;
  factoryDate?: string;
  teamDisplayName?: string;
  tradeType?: string;
  marineSupervisor?: string;
  engineerSupervisor?: string;
  electricSupervisor?: string;
  crewSupervisor?: string;
  politicalInstructor?: string;
  instructorIdNumber?: string;
  onBoardDate?: string;
  daysOnBoard?: string;
  sendCompany?: string;
  sendRuleNote?: string;
  buildYear?: number;
  currentVoyage?: string;
  currentLocation?: string;
  currentStatus?: string;
  eta?: string;
  etaPort?: string;
  etd?: string;
  politicalOfficerId?: number;
  politicalOfficerName?: string;
  politicalOfficerPhoto?: string;
  captainName?: string;
  shipPhoto?: string;
  // 船舶动态字段（船工主管粘贴 / 政委日记同步）
  cargoStatus?: string;
  departurePort?: string;
  visibility?: string;
  temperature?: string;
  windDirection?: string;
  windForce?: string;
  waveLevel?: string;
  timezone?: string;
  focusPoints?: string;
  otherNotes?: string;
  dynamicSource?: 'supervisor' | 'political' | string;
  dynamicUpdatedAt?: string;
  // 区域标识（自动根据目的港检测）
  etaPortRegion?: string; // fiveEyes(五眼联盟)/europe(欧洲)/piracy(海盗区)/other
  piracyZone?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Schedule {
  id: number;
  teamCode: string;
  recordDate: string;
  shipId?: number;
  firstType: string;
  secondType: string;
  standardFlowId?: number;
  eventDetail?: string;
  startTime?: string;
  endTime?: string;
  finishStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'urgent_important' | 'urgent' | 'important' | 'normal' | 'low';
  createdById: number;
  assignedToId?: number;
  ship?: Ship;
  createdBy?: { id: number; username: string; realName: string };
  assignedTo?: { id: number; username: string; realName: string };
  sopFlow?: SopFlow;
}

export interface DictCategory {
  id: number;
  teamCode?: string;
  categoryType: string;
  categoryName: string;
  parentId?: number;
  sortOrder: number;
}

export interface StaffHistory {
  id: number;
  teamCode: string;
  shipId: number;
  postName: string;
  staffName: string;
  startDate: string;
  endDate?: string;
  handoverNote?: string;
  ship?: Ship;
}

export interface SopFlow {
  id: number;
  flowName: string;
  flowContent: string;
  firstType?: string;
  secondType?: string;
  updatedById?: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { id: number; username: string; realName: string };
}

export interface PublicCase {
  id: number;
  fromRecordId?: number;
  caseType: string;
  caseContent: string;
  createdAt: string;
  fromRecord?: { id: number; recordDate: string };
}

export interface OperationLog {
  id: number;
  userId: number;
  teamCode: string;
  operationType: string;
  operationContent?: string;
  ipAddress?: string;
  userAgent?: string;
  requestParams?: any;
  createdAt: string;
  user: { id: number; username: string; realName: string };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

export interface CreateScheduleRequest {
  recordDate: string;
  shipId?: number;
  firstType: string;
  secondType: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  finishStatus?: string;
  priority?: string;
  assignedToId?: number;
}

export interface CreateStaffHistoryRequest {
  shipId: number;
  postName: string;
  staffName: string;
  startDate: string;
  endDate?: string;
  handoverNote?: string;
}

export interface UpdateStaffHistoryRequest {
  endDate?: string;
  handoverNote?: string;
}

export interface CreateSopFlowRequest {
  flowName: string;
  flowContent: string;
  firstType?: string;
  secondType?: string;
}

export interface UpdateSopFlowRequest {
  flowName?: string;
  flowContent?: string;
}

export interface CreatePublicCaseRequest {
  fromRecordId?: number;
  caseType: string;
  caseContent: string;
}

// === Publish Template Types ===

export interface PublishTemplateItem {
  id?: number;
  templateId?: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'attachment' | 'multi_select';
  fieldOptions?: string; // JSON array for select options
  isRequired: boolean;
  sortOrder: number;
  maxCount?: number; // 附件数量限制
  helpText?: string; // 字段提示文字
}

export interface FileCollectionConfig {
  description?: string;
  fileTypes: string[];
  namingRule: string;
  maxSize: number;
  deadline: string;
}

export interface PublishTemplate {
  id?: number;
  templateName: string;
  title?: string; // 后端字段，兼容前端 templateName
  templateType: 'form_collect' | 'ship_dynamic' | 'port_call_check' | 'file_collection' | 'photo_checkin' | 'ai_survey';
  status: 'draft' | 'published';
  targetShips: 'all' | 'eta_before' | 'route' | 'custom';
  targetValue?: string; // ETA days or route IDs or comma-separated ship IDs
  items?: PublishTemplateItem[];
  fileConfig?: FileCollectionConfig;
  deadline?: string; // 截止时间
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePublishTemplateRequest {
  title?: string; // 后端使用 title
  templateName?: string; // 前端传入时使用
  templateType: 'form_collect' | 'ship_dynamic' | 'port_call_check' | 'file_collection' | 'photo_checkin' | 'ai_survey';
  status: 'draft' | 'published';
  targetShips: 'all' | 'eta_before' | 'route' | 'custom';
  targetValue?: string;
  items?: Omit<PublishTemplateItem, 'id' | 'templateId'>[];
  fileConfig?: FileCollectionConfig;
  deadline?: string;
}

export interface UpdatePublishTemplateRequest {
  title?: string;
  templateName?: string;
  templateType?: 'form_collect' | 'ship_dynamic' | 'port_call_check' | 'file_collection' | 'photo_checkin' | 'ai_survey';
  status?: 'draft' | 'published';
  targetShips?: 'all' | 'eta_before' | 'route' | 'custom';
  targetValue?: string;
  items?: PublishTemplateItem[];
  fileConfig?: FileCollectionConfig;
  deadline?: string;
}

// === Ship Task Types ===

export interface ShipTask {
  id: number;
  shipId: number;
  taskId: string;
  taskType: 'ship_dynamic' | 'port_call_check' | 'file_collection';
  assignedTo?: number;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
  ship?: Ship;
  items?: ShipTaskItem[];
}

export interface ShipTaskItem {
  id: number;
  taskId: number;
  fieldName: string;
  fieldLabel: string;
  status: 'not_started' | 'in_progress' | 'completed';
  value?: string;
  completedDate?: string;
}

export interface FileRecord {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  description?: string;
  category?: string;
  visibility: 'public' | 'private';
  downloadCount: number;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
  uploader?: { id: number; username: string; realName: string };
}

export interface CreateFileRecordRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  description?: string;
  category?: string;
  visibility?: 'public' | 'private';
}

export interface UpdateFileRecordRequest {
  description?: string;
  category?: string;
  visibility?: 'public' | 'private';
}

export interface PoliticalReport {
  voyage?: string;
  location?: string;
  status?: string;
  eta?: string;
  etaPort?: string;
  etd?: string;
  weather?: string;
  seaCondition?: string;
  staffChange?: string;
  focusPoints?: string;
  otherNotes?: string;
  updatedAt?: string;
}

export interface ShipDynamicStatus {
  shipId: number;
  shipName: string;
  sendCompany?: string;
  flagCountry?: string;
  tradeType?: string;
  voyage?: string;
  location?: string;
  status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair';
  statusText?: string;
  eta?: string;
  etaDisplay?: string;
  departurePort?: string;
  etaPort?: string;
  voyageProgress?: number;
  voyageDaysLeft?: number;
  hasVoyageProgress?: boolean;
  politicalReport?: PoliticalReport;
  etaPortRegion?: string;
  piracyZone?: boolean;
  weather?: string;
  crewChange?: boolean;
  safety?: boolean;
  provisions?: boolean;
  fourSupervisors: {
    marine: string;
    engineer: string;
    electric: string;
    crew: string;
  };
  politicalInstructor: string;
  checkProgress: number;
  taskItems?: ShipTaskItem[];
  isWatched: boolean;
}

// === Task (Work Task) Types ===

export interface TaskNode {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'urgent_important' | 'urgent' | 'important' | 'normal' | 'low';
  dueDate?: string;
  parentId?: number | null;
  children?: TaskNode[];
  assignedTo?: { id: number; username: string; realName: string };
  createdBy?: { id: number; username: string; realName: string };
  category?: string;
  category2?: string;
  sortOrder?: number;
  ganttStartDate?: string;
  ganttEndDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'urgent_important' | 'urgent' | 'important' | 'normal' | 'low';
  dueDate?: string;
  parentId?: number | null;
  assignedToId?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'urgent_important' | 'urgent' | 'important' | 'normal' | 'low';
  dueDate?: string;
  parentId?: number | null;
  assignedToId?: number;
}

// === Experience Types ===

export interface ExperienceComment {
  id: number;
  experienceId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: { id: number; username: string; realName: string };
}

export interface Experience {
  id: number;
  title: string;
  content: string;
  category: string;
  author: string;
  rating: number;
  ratingCount: number;
  likes: number;
  views: number;
  comments?: ExperienceComment[];
  createdAt: string;
  updatedAt: string;
  userId?: number;
  createdBy?: { id: number; username: string; realName: string };
}

export interface CreateExperienceRequest {
  title: string;
  content: string;
  category: string;
}

export interface RateExperienceRequest {
  rating: number;
}

export interface CommentExperienceRequest {
  content: string;
}

// === Port Check (抵港前检查) Types ===

export interface PortCheckTemplate {
  id: number;
  templateId: number;
  templateName: string;
  templateType: 'port_call_check';
  status: 'draft' | 'published';
  targetShips: 'all' | 'eta_before' | 'route' | 'custom';
  targetValue?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortCheckShipTask {
  id: number;
  shipId: number;
  ship?: Ship;
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
  dueDate?: string;
  completedDate?: string;
}

export interface CreatePortCheckTemplateRequest {
  templateName: string;
  targetShips: 'all' | 'eta_before' | 'route' | 'custom';
  targetValue?: string;
  checkItems: string[];
}

export interface UpdatePortCheckTaskRequest {
  status?: 'pending' | 'in_progress' | 'completed';
  progress?: number;
}

// === Party Activity (党建活动) Types ===

export type PartyActivityType = 
  | 'branch_meeting' | 'committee_meeting' | 'party_group_meeting' | 'party_lecture'
  | 'theme_party_day' | 'study_session' | 'organizational_life' | 'democratic_review';

export interface PartyActivity {
  id: number;
  activityType: PartyActivityType;
  title: string;
  activityDate: string;
  participantCount: number;
  shipId?: number;
  ship?: Ship;
  description?: string;
  organizer?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: number; username: string; realName: string };
}

export interface CreatePartyActivityRequest {
  activityType: PartyActivityType;
  title: string;
  activityDate: string;
  participantCount: number;
  shipId?: number;
  description?: string;
  organizer?: string;
}

export interface PartyActivityStatistics {
  branchMeetingCount: number;
  committeeMeetingCount: number;
  partyGroupMeetingCount: number;
  partyLectureCount: number;
  themePartyDayCount: number;
  studySessionCount: number;
  totalThisMonth: number;
}

// === Thought Report (思想动态) Types ===

export type EmotionalState = 'stable' | 'fluctuating' | 'anxious' | 'depressed' | 'angry' | 'enthusiastic';
export type ConcernLevel = 'normal' | 'attention' | 'warning' | 'critical';
export type ThoughtReportStatus = 'open' | 'processing' | 'closed';

export interface ThoughtReport {
  id: number;
  personInvolved: string;
  emotionalState: EmotionalState;
  concernLevel: ConcernLevel;
  status: ThoughtReportStatus;
  summary: string;
  shipId?: number;
  ship?: Ship;
  reporter?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  createdBy?: { id: number; username: string; realName: string };
}

export interface CreateThoughtReportRequest {
  personInvolved: string;
  emotionalState: EmotionalState;
  concernLevel: ConcernLevel;
  summary: string;
  shipId?: number;
  reporter?: string;
}

export interface ThoughtReportWarning {
  id: number;
  personInvolved: string;
  emotionalState: EmotionalState;
  concernLevel: ConcernLevel;
  status: ThoughtReportStatus;
  summary: string;
  ship?: Ship;
  createdAt: string;
}

// === Integrity Record (廉洁监督) Types ===

export type IntegrityCategory = 
  | 'meal_fund' | 'union_fund' | 'material' | 'fuel_oil' 
  | 'waste_oil' | 'gift_redpacket' | 'procurement' | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type InspectionType = 'routine' | 'special' | 'surprise' | 'follow_up';
export type IntegrityStatus = 'open' | 'processing' | 'closed';

export interface IntegrityRecord {
  id: number;
  inspectionType: InspectionType;
  category: IntegrityCategory;
  riskLevel: RiskLevel;
  status: IntegrityStatus;
  title: string;
  problemFound?: string;
  shipId?: number;
  ship?: Ship;
  inspector?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  createdBy?: { id: number; username: string; realName: string };
}

export interface CreateIntegrityRecordRequest {
  inspectionType: InspectionType;
  category: IntegrityCategory;
  riskLevel: RiskLevel;
  title: string;
  problemFound?: string;
  shipId?: number;
  inspector?: string;
}

// === Officer Profile (政委履职档案) Types ===

export type OfficerGrade = 'excellent' | 'good' | 'qualified' | 'needs_improve' | 'unqualified';

export interface OfficerProfile {
  id: number;
  userId: number;
  realName: string;
  shipId?: number;
  ship?: Ship;
  grade?: OfficerGrade;
  isNew?: boolean;
  isWeakness?: boolean;
  joinDate?: string;
  totalActivities?: number;
  totalStudies?: number;
  activeDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerEvaluation {
  id: number;
  officerId: number;
  evaluationDate: string;
  grade: OfficerGrade;
  comments?: string;
  evaluator?: string;
  createdAt: string;
}

export interface OfficerMentorship {
  id: number;
  mentorId: number;
  menteeId: number;
  mentorName: string;
  menteeName: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed';
  notes?: string;
}

export interface OfficerStats {
  totalActivities: number;
  totalStudies: number;
  activeDays: number;
}

// === StaffAssignment (政委派任管理) Types ===

export interface StaffAssignment {
  id: number;
  userId: number;
  shipId: number;
  teamCode: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'leave' | 'ended';
  sourceCompany?: string;
  assignmentNo?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    realName: string;
    username: string;
    birthDate?: string;
    idNumber?: string;
    englishName?: string;
    gender?: string;
    nationality?: string;
    hometown?: string;
    politicalStatus?: string;
    phoneNumber?: string;
    employeeNo?: string;
    dataSource?: string;
  };
  ship?: { id: number; cnShipName: string; politicalInstructor?: string };
}

export interface CreateStaffAssignmentRequest {
  userId: number;
  shipId: number;
  startDate: string;
  endDate?: string;
  status?: string;
  sourceCompany?: string;
  assignmentNo?: string;
  remark?: string;
}

export interface DiaryPermissionInfo {
  currentShipId: number | null;
  historyShipIds: number[];
  isOnLeave: boolean;
  isOnBoard: boolean;
}

// === Crew Member & Birthday Reminder Types ===

export interface CrewMember {
  id: number;
  teamCode: string;
  name: string;
  gender: string;
  idNumber: string;
  position: string;
  department?: string;
  birthdaySolar: string;
  birthdayLunar: string;
  birthPlace?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  shipId?: number;
  shipName?: string;
  onBoardDate?: string;
  expectedOffDate?: string;
  solarReminderDays: number;
  lunarReminderDays: number;
  solarGiftAmount: number;
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BirthdayReminder {
  id: number;
  teamCode: string;
  crewMemberId: number;
  crewName: string;
  reminderDate: string;
  birthdayType: 'solar' | 'lunar';
  reminderSent: boolean;
  giftGiven: boolean;
  comfortVisit: boolean;
  notes?: string;
  createdAt: string;
}

export interface BirthdayReminderItem {
  crewMemberId: number;
  crewName: string;
  birthdayDate: string; // 实际生日日期
  birthdayType: 'solar' | 'lunar';
  birthdayLabel: string; // 显示名称，如"公历生日"、"农历生日"
  daysUntil: number;
  isToday: boolean;
  actionLabel: string; // 行动提示：如"发放礼金300元"、"政委慰问安排一碗面"
  actionType: 'gift' | 'comfort';
  solarGiftAmount?: number;
  shipName?: string;
  position?: string;
}

export interface BirthdayCalendarData {
  [date: string]: BirthdayReminderItem[]; // key 为 YYYY-MM-DD
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sort?: SortOptions;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorType?: string;
}

export interface TeamInfo {
  teamCode: string;
  teamName: string;
  description?: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  content: string;
  type: 'task_reminder' | 'system_notice' | 'message';
  read: boolean;
  createdAt: string;
}

export interface WebhookConfig {
  id: number;
  teamCode: string;
  name: string;
  url: string;
  type: 'wechat' | 'dingtalk' | 'slack';
  enabled: boolean;
  reminderDays: number[];
  createdAt: string;
  updatedAt: string;
}
