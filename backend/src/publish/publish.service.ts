import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublishTemplateDto } from './dto/create-publish-template.dto';
import { UpdatePublishTemplateDto } from './dto/update-publish-template.dto';

// 4种任务类型定义
const TASK_MODULES = {
  checklist:      { code: 'checklist',      name: '勾选清单', icon: '✅', color: '#52c41a', desc: '多项勾选进度跟踪' },
  form_collect:   { code: 'form_collect',   name: '收集表',  icon: '📋', color: '#1677ff', desc: '通用表单采集' },
  photo_checkin:  { code: 'photo_checkin',  name: '拍照打卡', icon: '📷', color: '#52c41a', desc: '定位拍照签到' },
  file_collect:   { code: 'file_collect',   name: '文件收集', icon: '📁', color: '#faad14', desc: '多文件上传' },
  ai_survey:      { code: 'ai_survey',      name: 'AI分析收集', icon: '🤖', color: '#722ed1', desc: '文件收集+AI汇总分析' },
};

// 系统预设模板（精简原则：只保留最常用的核心模板，避免用户觉得工作量大
// 用户使用过程中会积累自己的模板和历史任务，系统预设仅作示例
const SYSTEM_TEMPLATES = [
  {
    title: '月度安全报告收集',
    templateType: 'file_collect',
    templateDesc: '收集各船舶月度安全报告，支持规范命名和批量下载',
    fileNamingRule: 'ship_date_type_seq',
    allowedTypes: ['doc', 'docx', 'pdf'],
    isSystem: true,
    items: [
      { name: 'safety_report', label: '安全报告', type: 'attachment', required: true, maxCount: 1 },
      { name: 'accident_report', label: '事故报告（如有）', type: 'attachment', required: false, maxCount: 1 },
    ],
  },
  {
    title: '船舶运营数据分析',
    templateType: 'ai_survey',
    templateDesc: '收集船舶运营数据，AI自动分析汇总并生成报告',
    aiEnabled: true,
    aiPromptTemplate: '请分析以下船舶运营数据，重点关注安全指标、效率指标和成本控制，生成详细的汇总报告',
    aiOutputFormat: 'full_report',
    fileNamingRule: 'ship_date_type_seq',
    allowedTypes: ['doc', 'docx', 'pdf', 'xlsx'],
    isSystem: true,
    items: [
      { name: 'operation_report', label: '运营报告', type: 'attachment', required: true, maxCount: 1 },
      { name: 'financial_data', label: '财务数据', type: 'attachment', required: false, maxCount: 1 },
      { name: 'safety_data', label: '安全数据', type: 'attachment', required: false, maxCount: 1 },
    ],
  },
  {
    title: '船舶伙食采购计划',
    templateType: 'form_collect',
    templateDesc: '收集船舶伙食采购计划，便于统一采购管理',
    isSystem: true,
    items: [
      { name: 'period', label: '采购周期', type: 'date', required: true },
      { name: 'food_items', label: '食品清单', type: 'textarea', required: true },
      { name: 'special_requirements', label: '特殊需求', type: 'textarea', required: false },
      { name: 'estimated_cost', label: '预计费用', type: 'number', required: false },
    ],
  },
  {
    title: '政委每日动态报告',
    templateType: 'form_collect',
    templateDesc: '船舶政委每日动态报告收集，涵盖基本动态、风险管控、燃油补给、访客管理、船员换班、外部检查、安全生产等七大板块',
    isSystem: true,
    creatorRole: 'ship_political_instructor',
    items: [
      // 一、船舶基本动态
      { name: 'section_basic', label: '一、船舶基本动态', type: 'section' },
      { name: 'voyage', label: '航次', type: 'text', required: true, helpText: '如：V211航次、334航次' },
      { name: 'current_status', label: '当前状态', type: 'select', required: true, options: ['靠泊', '锚泊', '航行'] },
      { name: 'port_anchorage', label: '港口/锚地', type: 'text', required: true, helpText: '如：新加坡、锦州502#泊位' },
      { name: 'key_time', label: '关键时间', type: 'text', required: false, helpText: '如：0754LT' },
      { name: 'next_port', label: '下一港', type: 'text', required: true },
      { name: 'eta', label: 'ETA', type: 'text', required: true, helpText: '如：8月4日0900LT' },

      // 二、航线风险管控
      { name: 'section_risk', label: '二、航线风险管控', type: 'section' },
      { name: 'piracy_risk', label: '是否处于/途经海盗高风险海域', type: 'select', required: true, options: ['否', '是'] },
      { name: 'piracy_area', label: '海盗海域名称', type: 'text', required: false, showWhen: { field: 'piracy_risk', value: '是' } },
      { name: 'war_zone', label: '是否处于/途经战区、局势敏感区域', type: 'select', required: true, options: ['否', '是'] },
      { name: 'war_zone_name', label: '敏感区域名称', type: 'text', required: false, showWhen: { field: 'war_zone', value: '是' } },
      { name: 'five_eyes', label: '是否停靠五眼联盟成员国港口', type: 'select', required: true, options: ['否', '是'] },

      // 三、燃油与补给计划
      { name: 'section_fuel', label: '三、燃油与补给计划', type: 'section' },
      { name: 'fuel_plan', label: '燃油加装', type: 'select', required: true, options: ['无', '本港加装', '下一港加装'] },
      { name: 'fuel_desc', label: '燃油简述', type: 'text', required: false, showWhen: { field: 'fuel_plan', not: '无' } },
      { name: 'supply_plan', label: '伙食、淡水、物料补给', type: 'select', required: true, options: ['无', '本港补给', '下一港补给'] },

      // 四、访客与外来人员管理
      { name: 'section_visitor', label: '四、访客与外来人员管理', type: 'section' },
      { name: 'visitor_count', label: '登轮访客总人次', type: 'number', required: false, helpText: '单位：人' },
      { name: 'external_stay', label: '外来人员住船', type: 'select', required: true, options: ['无', '有'] },
      { name: 'external_composition', label: '人员构成', type: 'text', required: false, showWhen: { field: 'external_stay', value: '有' } },
      { name: 'leave_time', label: '主要人员离船时间要点', type: 'text', required: false },

      // 五、船员换班安排
      { name: 'section_crew', label: '五、船员换班安排', type: 'section' },
      { name: 'crew_change', label: '换班情况', type: 'select', required: true, options: ['无换班计划', '本港已完成换班', '计划换班'] },
      { name: 'embark_count', label: '上船人数', type: 'number', required: false, showWhen: { field: 'crew_change', not: '无换班计划' } },
      { name: 'disembark_count', label: '下船人数', type: 'number', required: false, showWhen: { field: 'crew_change', not: '无换班计划' } },
      { name: 'crew_change_date', label: '计划换班日期', type: 'date', required: false, showWhen: { field: 'crew_change', value: '计划换班' } },

      // 六、外部检查及跟船人员
      { name: 'section_inspection', label: '六、外部检查及跟船人员', type: 'section' },
      { name: 'boarding_inspection', label: '登轮检查', type: 'select', required: true, options: ['无', '有'] },
      { name: 'inspection_type', label: '检查类型', type: 'text', required: false, showWhen: { field: 'boarding_inspection', value: '有' } },
      { name: 'company_escort', label: '公司管理人员跟船', type: 'select', required: true, options: ['无', '有'] },
      { name: 'escort_detail', label: '人员/时段', type: 'text', required: false, showWhen: { field: 'company_escort', value: '有' } },

      // 七、安全生产与安保特殊事项
      { name: 'section_safety', label: '七、安全生产与安保特殊事项', type: 'section' },
      { name: 'safety_status', label: '安全生产', type: 'select', required: true, options: ['正常', '存在隐患'] },
      { name: 'hazard_desc', label: '隐患说明', type: 'textarea', required: false, showWhen: { field: 'safety_status', value: '存在隐患' } },
      { name: 'security_focus', label: '安保重点', type: 'textarea', required: false, helpText: '防偷渡、防海盗值班情况；其他异常事项' },
    ],
  },
];

// 根据中文显示名称生成英文字段名（自动生成，无需用户填写
function generateFieldName(label: string, index: number): string {
  const pinyinMap: Record<string, string> = {
    '安': 'an', '全': 'quan', '报': 'bao', '告': 'gao',
    '事': 'shi', '故': 'gu', '如': 'ru', '有': 'you',
    '运': 'yun', '营': 'ying', '数': 'shu', '据': 'ju',
    '财': 'cai', '务': 'wu', '采': 'cai', '购': 'gou',
    '周': 'zhou', '期': 'qi', '食': 'shi', '品': 'pin',
    '清': 'qing', '单': 'dan', '特': 'te', '殊': 'shu',
    '需': 'xu', '求': 'qiu', '预': 'yu', '计': 'ji',
    '费': 'fei', '用': 'yong', '到': 'dao', '岗': 'gang',
    '照': 'zhao', '片': 'pian', '打': 'da', '卡': 'ka',
    '地': 'di', '点': 'dian', '主': 'zhu', '机': 'ji',
    '检': 'jian', '查': 'cha', '发': 'fa', '电': 'dian',
    '泵': 'beng', '组': 'zu', '气': 'qi', '系': 'xi',
    '统': 'tong', '消': 'xiao', '防': 'fang', '设': 'she',
    '备': 'bei', '救': 'jiu', '生': 'sheng', '导': 'dao',
    '航': 'hang', '通': 'tong', '信': 'xin', '货': 'huo',
    '物': 'wu', '准': 'zhun', '文': 'wen', '件': 'jian',
    '手': 'shou', '续': 'xu', '船': 'chuan', '员': 'yuan',
    '会': 'hui', '议': 'yi', '召': 'zhao', '开': 'kai',
    '象': 'xiang', '接': 'jie', '收': 'shou',
    '港': 'gang', '口': 'kou', '息': 'xi',
    '确': 'que', '认': 'ren', '今': 'jin', '日': 'ri',
    '温': 'wen', '度': 'du', '动': 'dong', '态': 'tai',
    '中': 'zhong', '英': 'ying', '天': 'tian',
    '海': 'hai', '况': 'kuang', '行': 'xing', '在': 'zai',
    '位': 'wei', '置': 'zhi', '注': 'zhu',
    '名': 'ming', '称': 'cheng', '类': 'lei', '型': 'xing',
    '编': 'bian', '号': 'hao', '规': 'gui', '格': 'ge',
    '量': 'liang', '附': 'fu', '档': 'dang',
    '图': 'tu', '相': 'xiang', '说': 'shuo',
  };

  let result = '';
  for (const char of label) {
    if (pinyinMap[char]) {
      result += pinyinMap[char];
    }
  }

  if (result) {
    return result;
  }

  return `field_${index + 1}`;
}

// 兼容旧类型映射
const LEGACY_TYPE_MAP: Record<string, string> = {
  ship_dynamic:    'form_collect',
  port_call_check: 'checklist',
};

@Injectable()
export class PublishService {
  constructor(private prisma: PrismaService) {}

  async initSystemTemplates() {
    for (const teamCode of ['team1', 'team2'] as any[]) {
      for (const templateData of SYSTEM_TEMPLATES) {
        const existing = await this.prisma.publishTemplate.findFirst({
          where: { title: templateData.title, isSystem: true, teamCode },
        });
        if (!existing) {
          await this.prisma.publishTemplate.create({
            data: {
              teamCode,
              ...templateData,
              isDraft: false,
              isPublished: false,
              isActive: true,
            },
          });
        }
      }
    }
  }

  getTaskModules() {
    return Object.values(TASK_MODULES);
  }

  async create(createDto: CreatePublishTemplateDto, userId: number) {
    const title = createDto.title;

    // 自动生成字段名称（name），如果用户没有填写则根据显示名称（label/label）自动生成
    const processedItems = (createDto.items || []).map((item: any, index: number) => {
      const itemName = item.name || item.fieldName || generateFieldName(item.label || item.fieldLabel || '字段', index);
      return {
        ...item,
        name: itemName,
      };
    });

    return this.prisma.publishTemplate.create({
      data: {
        teamCode: createDto.teamCode as any,
        templateType: createDto.templateType || 'form_collect',
        title: title,
        items: processedItems,
        templateDesc: createDto.templateDesc || null,
        coverImage: createDto.coverImage || null,
        categoryId: createDto.categoryId || null,
        targetShips: createDto.targetShips || null,
        triggerDays: createDto.triggerDays || null,
        frequencyType: createDto.frequencyType || 'once',
        frequencyCron: createDto.frequencyCron || null,
        reminderEnabled: createDto.reminderEnabled ?? false,
        reminderDaysBefore: createDto.reminderDaysBefore || null,
        aiEnabled: createDto.aiEnabled ?? false,
        aiPromptTemplate: createDto.aiPromptTemplate || null,
        aiOutputFormat: createDto.aiOutputFormat || 'summary',
        dashboardMetrics: createDto.dashboardMetrics || null,
        isDraft: createDto.isDraft ?? true,
        isPublished: createDto.isPublished ?? false,
        isSystem: createDto.isSystem ?? false,
        sourceTaskId: createDto.sourceTaskId || null,
        creatorRole: createDto.creatorRole || null,
        fileNamingRule: createDto.fileNamingRule || null,
        allowedTypes: createDto.allowedTypes || null,
        progressTracking: createDto.progressTracking ?? false,
        sortOrder: createDto.sortOrder ?? 0,
        deadline: createDto.deadline ? new Date(createDto.deadline) : null,
      },
    });
  }

  async findAll(teamCode: string, filters?: {
    templateType?: string;
    categoryId?: number;
    isDraft?: boolean;
    isPublished?: boolean;
    search?: string;
  }) {
    const where: any = { teamCode, isActive: true };
    if (filters?.templateType) where.templateType = filters.templateType;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.isDraft !== undefined) where.isDraft = filters.isDraft;
    if (filters?.isPublished !== undefined) where.isPublished = filters.isPublished;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { templateDesc: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.publishTemplate.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // 简单内存缓存（避免频繁数据库查询）
  private templateCache = new Map<string, { data: any; expireAt: number }>();
  private readonly CACHE_TTL = 60 * 1000; // 1分钟缓存

  async findOne(id: number, teamCode: string) {
    const cacheKey = `${teamCode}:${id}`;
    const cached = this.templateCache.get(cacheKey);
    
    // 缓存有效则直接返回
    if (cached && cached.expireAt > Date.now()) {
      return cached.data;
    }

    const template = await this.prisma.publishTemplate.findFirst({
      where: { id, teamCode: teamCode as any },
      include: { category: true },
    });
    if (!template) throw new NotFoundException(`模板 ID ${id} 不存在`);

    // 写入缓存
    this.templateCache.set(cacheKey, {
      data: template,
      expireAt: Date.now() + this.CACHE_TTL,
    });

    return template;
  }

  async update(id: number, teamCode: string, updateDto: UpdatePublishTemplateDto) {
    await this.findOne(id, teamCode);

    // 如果有 items 更新，自动生成字段名称
    let processedItems = undefined;
    if (updateDto.items) {
      processedItems = (updateDto.items as any[]).map((item: any, index: number) => {
        const itemName = item.name || item.fieldName || generateFieldName(item.label || item.fieldLabel || '字段', index);
        return {
          ...item,
          name: itemName,
        };
      });
    }

    return this.prisma.publishTemplate.update({
      where: { id },
      data: {
        ...updateDto,
        items: processedItems as any,
        teamCode: undefined,
        categoryId: updateDto.categoryId,
        version: updateDto.version !== undefined ? updateDto.version : undefined,
      },
    });
  }

  async remove(id: number, teamCode: string) {
    await this.findOne(id, teamCode);
    await this.prisma.shipTaskStatus.deleteMany({ where: { templateId: id } });
    return this.prisma.publishTemplate.delete({ where: { id } });
  }

  async saveAsDraft(id: number, teamCode: string) {
    await this.findOne(id, teamCode);
    return this.prisma.publishTemplate.update({
      where: { id },
      data: { isDraft: true, isPublished: false, publishedBy: null, publishedAt: null },
    });
  }

  /**
   * 发布模板：通用表单驱动，不再按类型硬编码分支
   */
  async publishTemplate(id: number, teamCode: string, userId: number) {
    const template = await this.findOne(id, teamCode);

    if (!template.items || (Array.isArray(template.items) && template.items.length === 0)) {
      throw new BadRequestException('模板字段不能为空，无法发布');
    }

    const now = new Date();
    const updated = await this.prisma.publishTemplate.update({
      where: { id },
      data: {
        isDraft: false,
        isPublished: true,
        publishedBy: userId,
        publishedAt: now,
        usageCount: { increment: 1 },
      },
    });

    // 所有类型统一使用通用表单任务创建
    const effectiveType = LEGACY_TYPE_MAP[template.templateType] || template.templateType;
    await this.createFormTasks(template, effectiveType, teamCode);

    return updated;
  }

  /**
   * 通用表单任务创建（替代原有的 createShipDynamicTasks / createPortCallCheckTasks）
   */
  private async createFormTasks(template: any, effectiveType: string, teamCode: string) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode: teamCode as any },
    });

    const items = template.items || [];
    const totalItems = items.length;
    const triggerDays = template.triggerDays || 0;
    const now = new Date();
    const triggerDate = triggerDays > 0
      ? new Date(now.getTime() + triggerDays * 24 * 60 * 60 * 1000)
      : now;

    for (const ship of ships) {
      if (template.templateType === 'port_call_check' && ship.eta) {
        const daysToEta = (ship.eta.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
        if (daysToEta > triggerDays) continue;
      }

      const dateStr = now.toISOString().split('T')[0];
      const fileNamePrefix = `${ship.cnShipName}_${dateStr}_`;

      const checklistProgress = template.templateType === 'checklist' && items.length > 0
        ? items.map(item => ({
            itemName: item.name,
            label: item.label,
            completed: false,
            completedAt: null,
          }))
        : null;

      await this.prisma.shipTaskStatus.upsert({
        where: { shipId_templateId: { shipId: ship.id, templateId: template.id } },
        update: { totalItems, status: 'pending', triggerDate },
        create: {
          teamCode: teamCode as any,
          shipId: ship.id,
          templateId: template.id,
          templateType: template.templateType,
          totalItems,
          completedItems: 0,
          progress: 0,
          status: 'pending',
          triggerDate,
          checklistProgress,
          fileNamePrefix,
        },
      });
    }
  }

  // ========== Ship Task methods ==========

  async findShipTasks(teamCode: string, filters?: {
    shipId?: number;
    templateType?: string;
    status?: string;
  }) {
    const where: any = { teamCode };
    if (filters?.shipId) where.shipId = filters.shipId;
    if (filters?.templateType) where.templateType = filters.templateType;
    if (filters?.status) where.status = filters.status;

    return this.prisma.shipTaskStatus.findMany({
      where,
      include: {
        template: {
          select: { id: true, title: true, templateType: true, templateDesc: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateShipTask(id: number, teamCode: string, updateData: {
    responseData?: any;
    completedItems?: number;
    status?: string;
    respondedBy?: number;
    geoLat?: number;
    geoLng?: number;
    geoAddress?: string;
    deviceInfo?: any;
    checklistProgress?: any[];
    fileList?: any[];
  }) {
    const task = await this.prisma.shipTaskStatus.findFirst({
      where: { id, teamCode: teamCode as any },
    });
    if (!task) throw new NotFoundException(`任务 ID ${id} 不存在`);

    let completedItems = updateData.completedItems ?? task.completedItems;
    let checklistProgress = updateData.checklistProgress ?? task.checklistProgress;

    if (checklistProgress && Array.isArray(checklistProgress)) {
      completedItems = checklistProgress.filter((item: any) => item.completed).length;
    }

    const totalItems = task.totalItems || 1;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const isCompleted = updateData.status === 'completed' || progress >= 100;

    const data: any = {
      responseData: updateData.responseData ?? task.responseData,
      completedItems,
      progress,
      status: updateData.status || (isCompleted ? 'completed' : 'in_progress'),
      respondedBy: updateData.respondedBy ?? task.respondedBy,
      respondedAt: isCompleted ? new Date() : task.respondedAt,
      submittedAt: isCompleted ? new Date() : task.submittedAt,
      geoLat: updateData.geoLat ?? task.geoLat,
      geoLng: updateData.geoLng ?? task.geoLng,
      geoAddress: updateData.geoAddress ?? task.geoAddress,
      deviceInfo: updateData.deviceInfo ?? task.deviceInfo,
    };

    if (checklistProgress !== undefined) {
      data.checklistProgress = checklistProgress;
    }
    if (updateData.fileList !== undefined) {
      data.fileList = updateData.fileList;
    }

    return this.prisma.shipTaskStatus.update({
      where: { id },
      data,
    });
  }

  async triggerTasks(teamCode: string) {
    const publishedTemplates = await this.prisma.publishTemplate.findMany({
      where: { teamCode: teamCode as any, isPublished: true, isActive: true },
    });

    let count = 0;
    for (const template of publishedTemplates) {
      const effectiveType = LEGACY_TYPE_MAP[template.templateType] || template.templateType;
      await this.createFormTasks(template, effectiveType, teamCode);
      count++;
    }

    return { triggered: count, message: `已触发 ${count} 个模板的任务生成` };
  }

  async getShipDynamicStatus(teamCode: string) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode: teamCode as any },
    });

    const tasks = await this.prisma.shipTaskStatus.findMany({
      where: { teamCode: teamCode as any },
      include: {
        template: { select: { id: true, title: true, templateType: true } },
      },
    });

    const shipsWithStatus = ships.map((ship) => {
      const shipTasks = tasks.filter((t) => t.shipId === ship.id);
      const totalProgress = shipTasks.length > 0
        ? shipTasks.reduce((sum, t) => sum + t.progress, 0) / shipTasks.length
        : 0;

      // 映射状态到前端格式
      let status: 'berthed' | 'sailing' | 'anchored' = 'sailing';
      const rawStatus = (ship.currentStatus || '').toLowerCase();
      if (rawStatus.includes('berth') || rawStatus.includes('靠泊') || rawStatus.includes('在港')) {
        status = 'berthed';
      } else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊')) {
        status = 'anchored';
      } else if (rawStatus.includes('sail') || rawStatus.includes('航行')) {
        status = 'sailing';
      }

      return {
        shipId: ship.id,
        shipName: ship.cnShipName,
        sendCompany: ship.sendCompany || '',
        voyage: ship.currentVoyage || '',
        location: ship.currentLocation || '',
        status,
        eta: ship.eta ? new Date(ship.eta).toISOString() : '',
        crewChange: false,
        safety: false,
        provisions: false,
        fourSupervisors: {
          marine: '',
          engineer: '',
          electric: '',
          crew: '',
        },
        politicalInstructor: '',
        checkProgress: Math.round(totalProgress),
        taskItems: shipTasks.map(t => ({
          id: t.id,
          title: t.template?.title || '',
          progress: t.progress,
          status: t.status,
        })),
        isWatched: false,
      };
    });

    return shipsWithStatus;
  }

  // ========== Category methods ==========

  async getCategories(teamCode: string) {
    return this.prisma.taskCategory.findMany({
      where: { teamCode: teamCode as any, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTemplatesByCategory(teamCode: string, categoryId: number) {
    return this.prisma.publishTemplate.findMany({
      where: { teamCode: teamCode as any, categoryId, isActive: true },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ========== AI 问卷生成 ==========

  async generateAiSurveyFields(prompt: string) {
    // 调用AI生成字段建议
    const aiUrl = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const aiKey = process.env.AI_API_KEY;
    const endpointId = process.env.AI_ENDPOINT_ID;

    if (!aiKey || !endpointId) {
      // 返回预设字段模板
      return {
        success: true,
        fields: this.getDefaultSurveyFields(),
        message: 'AI未配置，返回默认字段模板',
      };
    }

    try {
      const response = await fetch(aiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiKey}`,
        },
        body: JSON.stringify({
          model: endpointId,
          messages: [
            {
              role: 'system',
              content: `你是一个专业的表单设计助手。根据用户描述的场景，生成一个JSON数组格式的字段列表。
每个字段必须包含：name(英文标识), label(中文标题), type(字段类型), required(是否必填), options(选项列表-仅用于单选/多选/评分), helpText(提示文字)。
支持的字段类型：short_text, long_text, number, date, rating, single_choice, multi_choice, dropdown, boolean_switch, photo, file, geolocation。
返回纯JSON数组，不要包含markdown标记。`,
            },
            { role: 'user', content: `请为以下场景设计收集表字段：${prompt}` },
          ],
          temperature: 0.5,
          max_tokens: 2000,
        }),
      });

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '[]';
      // 清理可能的markdown包裹
      const cleanJson = content.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();
      const fields = JSON.parse(cleanJson);

      return { success: true, fields, message: 'AI生成成功' };
    } catch (e: any) {
      return {
        success: true,
        fields: this.getDefaultSurveyFields(),
        message: `AI生成失败，返回默认模板：${e.message}`,
      };
    }
  }

  private getDefaultSurveyFields() {
    return [
      { name: 'report_date', label: '汇报日期', type: 'date', required: true, helpText: '请选择汇报日期' },
      { name: 'status_summary', label: '整体情况', type: 'long_text', required: true, helpText: '请简要描述整体情况' },
      { name: 'rating', label: '综合评价', type: 'rating', required: true, options: ['1', '2', '3', '4', '5'], helpText: '1-5分，5分最佳' },
      { name: 'main_issue', label: '主要问题', type: 'long_text', required: false, helpText: '如有问题请描述' },
      { name: 'photos', label: '现场照片', type: 'photo', required: false, maxCount: 5, helpText: '最多上传5张' },
    ];
  }
}
