/**
 * 发布模板种子数据 - 15个行业预置模板
 * 用法: npx ts-node prisma/seed-publish-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEAM_CODE = 'team2' as any;

// 5个分类
const categories = [
  { name: '船员管理', icon: '👥', color: '#1677ff', sortOrder: 1 },
  { name: '航行安全', icon: '🚢', color: '#52c41a', sortOrder: 2 },
  { name: '设备维护', icon: '🔧', color: '#faad14', sortOrder: 3 },
  { name: '港口业务', icon: '⚓', color: '#722ed1', sortOrder: 4 },
  { name: '质量管理', icon: '📋', color: '#eb2f96', sortOrder: 5 },
];

// 15个模板定义
const templates = [
  // ===== 船员管理 =====
  {
    category: '船员管理',
    templateType: 'form_collect',
    title: '船员思想健康月报',
    templateDesc: '每月船员思想动态与健康状态汇报，涵盖身心健康、工作满意度、家庭状况',
    frequencyType: 'monthly',
    aiEnabled: true,
    aiOutputFormat: 'full_report',
    items: [
      { name: 'report_month', label: '汇报月份', type: 'date', required: true },
      { name: 'health_score', label: '整体健康评分', type: 'rating', required: true, options: ['1','2','3','4','5'], helpText: '1-5分' },
      { name: 'psych_score', label: '心理状态评分', type: 'rating', required: true, options: ['1','2','3','4','5'] },
      { name: 'main_concern', label: '主要关注事项', type: 'long_text', required: false, helpText: '船员反映的主要问题或困难' },
      { name: 'team_morale', label: '团队士气', type: 'single_choice', required: true, options: ['良好','一般','偏低','需关注'], helpText: '整体团队氛围' },
      { name: 'special_events', label: '特殊事件', type: 'long_text', required: false, helpText: '本月发生的特殊事件（生病、受伤、家庭变故等）' },
      { name: 'suggestion', label: '管理建议', type: 'long_text', required: false },
    ],
    dashboardMetrics: [
      { code: 'avg_health', label: '平均健康评分', field: 'health_score', type: 'average' },
      { code: 'avg_psych', label: '平均心理评分', field: 'psych_score', type: 'average' },
      { code: 'low_morale_count', label: '士气偏低船舶', field: 'team_morale', type: 'count', condition: '偏低' },
    ],
    reminderEnabled: true,
    reminderDaysBefore: [5, 2, 0],
  },
  {
    category: '船员管理',
    templateType: 'form_collect',
    title: '船员每日健康记录',
    templateDesc: '船员每日体温、血压、身体状况记录',
    frequencyType: 'daily',
    items: [
      { name: 'record_date', label: '记录日期', type: 'date', required: true },
      { name: 'temperature', label: '体温(℃)', type: 'number', required: true, minValue: 35, maxValue: 42, helpText: '正常范围36.0-37.2℃' },
      { name: 'blood_pressure_sys', label: '收缩压(mmHg)', type: 'number', required: false },
      { name: 'blood_pressure_dia', label: '舒张压(mmHg)', type: 'number', required: false },
      { name: 'health_status', label: '身体状况', type: 'single_choice', required: true, options: ['良好','不适','就医','休息'], helpText: '今日身体状况' },
      { name: 'symptoms', label: '症状描述', type: 'long_text', required: false, helpText: '如有不适请描述具体症状' },
      { name: 'medication', label: '用药情况', type: 'long_text', required: false },
    ],
  },
  {
    category: '船员管理',
    templateType: 'form_collect',
    title: '船员培训记录表',
    templateDesc: '船员安全培训、技能培训记录',
    frequencyType: 'once',
    items: [
      { name: 'train_date', label: '培训日期', type: 'date', required: true },
      { name: 'train_topic', label: '培训主题', type: 'short_text', required: true, helpText: '如：消防演练、急救培训' },
      { name: 'train_type', label: '培训类型', type: 'single_choice', required: true, options: ['安全培训','技能培训','法规培训','应急演练','其他'] },
      { name: 'trainer_name', label: '培训讲师', type: 'short_text', required: false },
      { name: 'participant_count', label: '参训人数', type: 'number', required: true },
      { name: 'pass_rate', label: '通过率(%)', type: 'number', required: false, minValue: 0, maxValue: 100 },
      { name: 'train_summary', label: '培训总结', type: 'long_text', required: false },
      { name: 'train_photos', label: '培训照片', type: 'photo', required: false, maxCount: 5 },
    ],
  },

  // ===== 航行安全 =====
  {
    category: '航行安全',
    templateType: 'form_collect',
    title: '船舶安全检查清单',
    templateDesc: '每日/每航次船舶安全检查项目',
    frequencyType: 'daily',
    aiEnabled: true,
    aiOutputFormat: 'bullet_points',
    items: [
      { name: 'check_date', label: '检查日期', type: 'date', required: true },
      { name: 'navigation_equip', label: '导航设备', type: 'single_choice', required: true, options: ['正常','异常','已修复'] },
      { name: 'communication_equip', label: '通讯设备', type: 'single_choice', required: true, options: ['正常','异常','已修复'] },
      { name: 'life_saving_equip', label: '救生设备', type: 'single_choice', required: true, options: ['正常','异常','已修复'] },
      { name: 'fire_fighting_equip', label: '消防设备', type: 'single_choice', required: true, options: ['正常','异常','已修复'] },
      { name: 'engine_room', label: '机舱状况', type: 'single_choice', required: true, options: ['正常','异常','已修复'] },
      { name: 'hull_condition', label: '船体状况', type: 'single_choice', required: true, options: ['正常','异常','已修复'] },
      { name: 'abnormal_detail', label: '异常详情', type: 'long_text', required: false },
      { name: 'checker_name', label: '检查人', type: 'short_text', required: true },
    ],
    dashboardMetrics: [
      { code: 'abnormal_rate', label: '异常发现率', type: 'rate', field: 'navigation_equip' },
      { code: 'common_issues', label: '常见问题', field: 'abnormal_detail', type: 'wordcloud' },
    ],
  },
  {
    category: '航行安全',
    templateType: 'photo_checkin',
    title: '航行值班打卡',
    templateDesc: '航行期间值班人员定时拍照打卡，记录位置和时间',
    frequencyType: 'daily',
    reminderEnabled: true,
    items: [
      { name: 'shift_time', label: '值班时间', type: 'datetime', required: true },
      { name: 'watch_position', label: '值班岗位', type: 'single_choice', required: true, options: ['驾驶台','机舱','甲板','其他'] },
      { name: 'watch_photo', label: '值班现场照片', type: 'photo', required: true, maxCount: 3, helpText: '拍摄值班现场' },
      { name: 'watch_location', label: '当前位置', type: 'geolocation', required: true },
      { name: 'watch_notes', label: '值班记录', type: 'long_text', required: false, helpText: '异常情况记录' },
      { name: 'weather', label: '天气状况', type: 'single_choice', required: false, options: ['晴','多云','雨','雾','大风','浪高'] },
      { name: 'visibility', label: '能见度', type: 'single_choice', required: false, options: ['良好','一般','差','极差'] },
    ],
  },
  {
    category: '航行安全',
    templateType: 'form_collect',
    title: 'SOP执行记录',
    templateDesc: '标准操作程序执行情况记录',
    frequencyType: 'once',
    items: [
      { name: 'sop_name', label: 'SOP名称', type: 'short_text', required: true },
      { name: 'exec_date', label: '执行日期', type: 'date', required: true },
      { name: 'executor', label: '执行人', type: 'short_text', required: true },
      { name: 'all_steps_done', label: '所有步骤已执行', type: 'boolean_switch', required: true },
      { name: 'skipped_steps', label: '跳过步骤', type: 'long_text', required: false, helpText: '如有跳过，请说明原因' },
      { name: 'deviation', label: '偏差说明', type: 'long_text', required: false },
      { name: 'result', label: '执行结果', type: 'single_choice', required: true, options: ['合格','不合格','需改进'] },
      { name: 'supervisor_confirm', label: '主管确认', type: 'boolean_switch', required: false },
    ],
  },

  // ===== 设备维护 =====
  {
    category: '设备维护',
    templateType: 'form_collect',
    title: '设备巡检记录',
    templateDesc: '机舱设备、甲板设备定期巡检',
    frequencyType: 'weekly',
    reminderEnabled: true,
    reminderDaysBefore: [1, 0],
    items: [
      { name: 'inspect_date', label: '巡检日期', type: 'date', required: true },
      { name: 'equipment_name', label: '设备名称', type: 'short_text', required: true },
      { name: 'equipment_type', label: '设备类型', type: 'single_choice', required: true, options: ['主机','发电机','锅炉','压缩机','泵','舵机','锚机','其他'] },
      { name: 'running_status', label: '运行状态', type: 'single_choice', required: true, options: ['正常','需关注','异常','停机'] },
      { name: 'temperature', label: '运行温度(℃)', type: 'number', required: false },
      { name: 'pressure', label: '运行压力(MPa)', type: 'number', required: false },
      { name: 'vibration', label: '振动情况', type: 'single_choice', required: false, options: ['正常','偏大','异常'] },
      { name: 'abnormal_sound', label: '异常声音', type: 'boolean_switch', required: false },
      { name: 'abnormal_detail', label: '异常详情', type: 'long_text', required: false },
      { name: 'inspect_photos', label: '巡检照片', type: 'photo', required: false, maxCount: 3 },
    ],
  },
  {
    category: '设备维护',
    templateType: 'form_collect',
    title: '备件库存盘点',
    templateDesc: '船舶备件、消耗品库存月度盘点',
    frequencyType: 'monthly',
    items: [
      { name: 'inventory_date', label: '盘点日期', type: 'date', required: true },
      { name: 'part_name', label: '备件名称', type: 'short_text', required: true },
      { name: 'part_code', label: '备件编号', type: 'short_text', required: false },
      { name: 'current_qty', label: '当前库存', type: 'number', required: true, minValue: 0 },
      { name: 'min_qty', label: '最低库存', type: 'number', required: false, minValue: 0 },
      { name: 'need_reorder', label: '需要补货', type: 'boolean_switch', required: false },
      { name: 'reorder_qty', label: '建议补货数量', type: 'number', required: false },
      { name: 'storage_location', label: '存放位置', type: 'short_text', required: false },
      { name: 'condition', label: '备件状态', type: 'single_choice', required: true, options: ['完好','可用','需更换','已过期'] },
    ],
  },
  {
    category: '设备维护',
    templateType: 'form_collect',
    title: '燃油消耗日报',
    templateDesc: '主机/发电机组每日燃油消耗记录',
    frequencyType: 'daily',
    aiEnabled: true,
    aiOutputFormat: 'metric_extraction',
    items: [
      { name: 'record_date', label: '记录日期', type: 'date', required: true },
      { name: 'fuel_type', label: '燃油类型', type: 'single_choice', required: true, options: ['重油','轻柴油','润滑油'] },
      { name: 'start_reading', label: '起始读数', type: 'number', required: true },
      { name: 'end_reading', label: '结束读数', type: 'number', required: true },
      { name: 'consumption', label: '消耗量(L)', type: 'number', required: true },
      { name: 'running_hours', label: '运行小时', type: 'number', required: true },
      { name: 'avg_consumption', label: '平均油耗(L/h)', type: 'number', required: false },
      { name: 'notes', label: '备注', type: 'long_text', required: false },
    ],
    dashboardMetrics: [
      { code: 'total_consumption', label: '总油耗', field: 'consumption', type: 'sum' },
      { code: 'avg_hourly', label: '平均小时油耗', field: 'avg_consumption', type: 'average' },
      { code: 'daily_trend', label: '日消耗趋势', field: 'consumption', type: 'line_chart' },
    ],
  },

  // ===== 港口业务 =====
  {
    category: '港口业务',
    templateType: 'form_collect',
    title: '到港检查清单',
    templateDesc: '船舶到港前/到港后安全检查项目',
    frequencyType: 'once',
    triggerDays: 3,
    items: [
      { name: 'port_name', label: '港口名称', type: 'short_text', required: true },
      { name: 'eta', label: '预计到港时间', type: 'datetime', required: true },
      { name: 'pilot_boarding', label: '引航员登船安排', type: 'boolean_switch', required: true },
      { name: 'mooring_plan', label: '系泊方案确认', type: 'boolean_switch', required: true },
      { name: 'cargo_ready', label: '货物装卸准备', type: 'boolean_switch', required: true },
      { name: 'customs_docs', label: '海关文件准备', type: 'boolean_switch', required: true },
      { name: 'gangway_check', label: '舷梯安全检查', type: 'boolean_switch', required: true },
      { name: 'security_level', label: '安保等级', type: 'single_choice', required: true, options: ['1级','2级','3级'] },
      { name: 'check_items', label: '其他检查项', type: 'long_text', required: false },
      { name: 'signature', label: '船长签名', type: 'short_text', required: true },
    ],
  },
  {
    category: '港口业务',
    templateType: 'photo_checkin',
    title: '港口现场拍照',
    templateDesc: '靠港期间现场拍照记录（装卸货、船舶状态、港口设施）',
    frequencyType: 'once',
    items: [
      { name: 'photo_time', label: '拍照时间', type: 'datetime', required: true },
      { name: 'photo_category', label: '照片分类', type: 'single_choice', required: true, options: ['装卸货','船舶外观','港口设施','甲板作业','其他'] },
      { name: 'photo', label: '现场照片', type: 'photo', required: true, maxCount: 5 },
      { name: 'photo_location', label: '拍摄位置', type: 'geolocation', required: true },
      { name: 'description', label: '照片说明', type: 'long_text', required: false },
    ],
  },
  {
    category: '港口业务',
    templateType: 'file_collect',
    title: '港口文件递交',
    templateDesc: '港口相关文件收集（报关单、检查报告、证书等）',
    frequencyType: 'once',
    items: [
      { name: 'file_time', label: '递交时间', type: 'datetime', required: true },
      { name: 'file_type', label: '文件类型', type: 'single_choice', required: true, options: ['报关单','检查报告','检疫证书','港口收据','其他'] },
      { name: 'file', label: '上传文件', type: 'file', required: true, maxCount: 3 },
      { name: 'file_notes', label: '文件说明', type: 'long_text', required: false },
    ],
  },

  // ===== 质量管理 =====
  {
    category: '质量管理',
    templateType: 'form_collect',
    title: '月度工作报表',
    templateDesc: '每月工作总结与数据报表',
    frequencyType: 'monthly',
    aiEnabled: true,
    aiOutputFormat: 'full_report',
    items: [
      { name: 'report_month', label: '报表月份', type: 'date', required: true },
      { name: 'voyage_count', label: '本月航次', type: 'number', required: true },
      { name: 'total_mileage', label: '总航程(海里)', type: 'number', required: false },
      { name: 'cargo_tonnage', label: '货运量(吨)', type: 'number', required: false },
      { name: 'incident_count', label: '安全事故', type: 'number', required: true, minValue: 0 },
      { name: 'near_miss_count', label: '未遂事件', type: 'number', required: false, minValue: 0 },
      { name: 'maintenance_count', label: '维修次数', type: 'number', required: false },
      { name: 'work_summary', label: '工作总结', type: 'long_text', required: true },
      { name: 'next_plan', label: '下月计划', type: 'long_text', required: false },
    ],
    dashboardMetrics: [
      { code: 'total_voyages', label: '总航次', field: 'voyage_count', type: 'sum' },
      { code: 'incident_rate', label: '事故率', type: 'custom', formula: 'incident_count / voyage_count' },
      { code: 'total_cargo', label: '总货运量', field: 'cargo_tonnage', type: 'sum' },
    ],
  },
  {
    category: '质量管理',
    templateType: 'form_collect',
    title: '事故/未遂事件报告',
    templateDesc: '安全事故、未遂事件详细报告',
    frequencyType: 'once',
    aiEnabled: true,
    aiOutputFormat: 'summary',
    items: [
      { name: 'incident_date', label: '发生日期', type: 'datetime', required: true },
      { name: 'incident_type', label: '事件类型', type: 'single_choice', required: true, options: ['安全事故','未遂事件','设备故障','人员伤害','环境污染','其他'] },
      { name: 'severity', label: '严重程度', type: 'single_choice', required: true, options: ['轻微','一般','严重','重大'] },
      { name: 'location', label: '发生地点', type: 'short_text', required: true },
      { name: 'description', label: '事件描述', type: 'long_text', required: true, helpText: '请详细描述事件经过' },
      { name: 'root_cause', label: '根本原因', type: 'long_text', required: false },
      { name: 'immediate_action', label: '即时措施', type: 'long_text', required: false },
      { name: 'corrective_action', label: '纠正措施', type: 'long_text', required: false },
      { name: 'incident_photos', label: '现场照片', type: 'photo', required: false, maxCount: 5 },
      { name: 'reported_by', label: '报告人', type: 'short_text', required: true },
    ],
  },
  {
    category: '质量管理',
    templateType: 'form_collect',
    title: '客户满意度调查',
    templateDesc: '货主/港口客户满意度反馈',
    frequencyType: 'monthly',
    items: [
      { name: 'survey_date', label: '调查日期', type: 'date', required: true },
      { name: 'customer_name', label: '客户名称', type: 'short_text', required: true },
      { name: 'service_rating', label: '服务评分', type: 'rating', required: true, options: ['1','2','3','4','5'] },
      { name: 'punctuality', label: '准时性', type: 'rating', required: true, options: ['1','2','3','4','5'] },
      { name: 'communication', label: '沟通效率', type: 'rating', required: true, options: ['1','2','3','4','5'] },
      { name: 'cargo_handling', label: '货物处理', type: 'rating', required: true, options: ['1','2','3','4','5'] },
      { name: 'complaint', label: '投诉/建议', type: 'long_text', required: false },
      { name: 'would_recommend', label: '是否推荐', type: 'boolean_switch', required: false },
    ],
    dashboardMetrics: [
      { code: 'avg_satisfaction', label: '平均满意度', field: 'service_rating', type: 'average' },
      { code: 'recommend_rate', label: '推荐率', field: 'would_recommend', type: 'rate' },
    ],
  },
];

async function main() {
  console.log('===== 开始种子数据导入 =====\n');

  // 1. 创建分类
  console.log('创建分类...');
  const categoryMap: Record<string, number> = {};
  for (const cat of categories) {
    const existing = await prisma.taskCategory.findFirst({
      where: { teamCode: TEAM_CODE, name: cat.name },
    });
    if (existing) {
      categoryMap[cat.name] = existing.id;
      console.log(`  [跳过] ${cat.name} (已存在)`);
    } else {
      const created = await prisma.taskCategory.create({
        data: { teamCode: TEAM_CODE, ...cat },
      });
      categoryMap[cat.name] = created.id;
      console.log(`  [创建] ${cat.name}`);
    }
  }

  // 2. 创建模板
  console.log('\n创建模板...');
  for (const tpl of templates) {
    const existing = await prisma.publishTemplate.findFirst({
      where: { teamCode: TEAM_CODE, title: tpl.title },
    });
    if (existing) {
      console.log(`  [跳过] ${tpl.title} (已存在)`);
      continue;
    }

    await prisma.publishTemplate.create({
      data: {
        teamCode: TEAM_CODE,
        templateType: tpl.templateType,
        title: tpl.title,
        templateDesc: tpl.templateDesc,
        items: tpl.items as any,
        categoryId: categoryMap[tpl.category],
        frequencyType: tpl.frequencyType || 'once',
        triggerDays: tpl.triggerDays || null,
        aiEnabled: tpl.aiEnabled ?? false,
        aiOutputFormat: tpl.aiOutputFormat || 'summary',
        dashboardMetrics: tpl.dashboardMetrics as any,
        reminderEnabled: tpl.reminderEnabled ?? false,
        reminderDaysBefore: tpl.reminderDaysBefore as any,
        isDraft: false,
        isPublished: true,
        isActive: true,
        version: 1,
        usageCount: 0,
      } as any,
    });
    console.log(`  [创建] ${tpl.title} (${tpl.templateType})`);
  }

  console.log(`\n===== 完成！共 ${templates.length} 个模板 =====`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());