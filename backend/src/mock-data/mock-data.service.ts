import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode, UserRole } from '@prisma/client';

@Injectable()
export class MockDataService {
  constructor(private prisma: PrismaService) {}

  async generateMockData() {
    const teamCode: TeamCode = 'team2';
    const ships = await this.prisma.ship.findMany({ where: { teamCode } });
    if (ships.length === 0) {
      return { message: '未找到船舶数据，请先导入船舶资料', created: 0 };
    }

    const adminUser = await this.prisma.user.findFirst({ 
      where: { teamCode, role: UserRole.admin } 
    });
    const crewSupervisor = await this.prisma.user.findFirst({
      where: { teamCode, role: UserRole.shore_crew_supervisor }
    });
    const politicalInstructor = await this.prisma.user.findFirst({
      where: { teamCode, role: UserRole.ship_political_instructor }
    });

    const createdBy = adminUser?.id || crewSupervisor?.id || 1;

    let totalCreated = 0;
    const createdItems: { type: string; count: number }[] = [];

    try {
      const schedulesCreated = await this.generateSchedules(ships, createdBy, teamCode);
      totalCreated += schedulesCreated;
      createdItems.push({ type: '日程记录', count: schedulesCreated });

      const templatesCreated = await this.generateTemplates(crewSupervisor?.id || createdBy, teamCode);
      totalCreated += templatesCreated;
      createdItems.push({ type: '任务模板', count: templatesCreated });

      const tasksCreated = await this.generateShipTasks(ships, crewSupervisor?.id || createdBy, teamCode);
      totalCreated += tasksCreated;
      createdItems.push({ type: '船舶任务', count: tasksCreated });

      const responsesCreated = await this.generateTaskResponses(ships, politicalInstructor?.id || createdBy, teamCode);
      totalCreated += responsesCreated;
      createdItems.push({ type: '任务回答', count: responsesCreated });

      const diariesCreated = await this.generateDiaries(ships, politicalInstructor?.id || createdBy, teamCode);
      totalCreated += diariesCreated;
      createdItems.push({ type: '航海日记', count: diariesCreated });
    } catch (error) {
      console.error('生成模拟数据失败:', error);
      return {
        message: '模拟数据生成失败',
        error: error.message,
        created: totalCreated,
        details: createdItems,
        shipsCount: ships.length
      };
    }

    return {
      message: '模拟数据生成完成',
      created: totalCreated,
      details: createdItems,
      shipsCount: ships.length
    };
  }

  async clearMockData() {
    const teamCode: TeamCode = 'team2';
    const mockMarker = 'mock_data';

    try {
      const deleted = await this.prisma.$transaction([
        this.prisma.schedule.deleteMany({ 
          where: { teamCode, description: { contains: mockMarker } } 
        }),
        this.prisma.shipTaskStatus.deleteMany({
          where: { teamCode, responseData: { path: ['_mock'], equals: mockMarker } }
        }),
        this.prisma.publishTemplate.deleteMany({
          where: { teamCode, templateDesc: { contains: mockMarker } }
        }),
        this.prisma.diary.deleteMany({
          where: { teamCode, weather: { contains: mockMarker } }
        }),
      ]);

      const totalDeleted = deleted.reduce((sum, d) => sum + (d.count || 0), 0);

      return {
        message: '模拟数据已清空',
        deleted: totalDeleted,
        details: {
          schedules: deleted[0].count || 0,
          shipTasks: deleted[1].count || 0,
          templates: deleted[2].count || 0,
          diaries: deleted[3].count || 0,
        }
      };
    } catch (error) {
      console.error('清空模拟数据失败:', error);
      return {
        message: '清空模拟数据失败',
        error: error.message,
      };
    }
  }

  private async generateSchedules(ships: any[], createdBy: number, teamCode: TeamCode): Promise<number> {
    const firstTypes = ['日常工作', '安全检查', '设备维护', '教育培训', '会议活动'];
    const secondTypes = {
      '日常工作': ['值班记录', '航行日志', '气象报告', '设备巡检', '物资盘点'],
      '安全检查': ['消防检查', '救生设备检查', '防污检查', '电气安全', '机械安全'],
      '设备维护': ['主机保养', '发电机检查', '空调维护', '通信设备', '导航设备'],
      '教育培训': ['安全培训', '技能培训', '应急演练', '法规学习', '业务学习'],
      '会议活动': ['班前会', '安全例会', '技术交底', '工作总结', '文化活动'],
    };

    const schedules = [];
    const statuses: ('pending' | 'completed' | 'in_progress')[] = ['pending', 'completed', 'completed', 'completed', 'in_progress'];

    const sampleShips = ships.slice(0, 10);

    for (const ship of sampleShips) {
      for (let day = 1; day <= 15; day++) {
        if (Math.random() > 0.5) {
          const firstType = firstTypes[Math.floor(Math.random() * firstTypes.length)];
          const secondType = secondTypes[firstType][Math.floor(Math.random() * secondTypes[firstType].length)];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          schedules.push({
            teamCode,
            recordDate: new Date(2026, 5, day),
            shipId: ship.id,
            firstType,
            secondType,
            eventDetail: `【${ship.cnShipName}】${firstType}-${secondType} - 模拟数据`,
            title: `${firstType}-${secondType}`,
            finishStatus: status,
            priority: 'normal',
            createdById: createdBy,
            description: 'mock_data',
          });
        }
      }
    }

    if (schedules.length === 0) return 0;

    await this.prisma.schedule.createMany({ data: schedules, skipDuplicates: true });
    return schedules.length;
  }

  private async generateTemplates(createdBy: number, teamCode: TeamCode): Promise<number> {
    const existing = await this.prisma.publishTemplate.count({
      where: { teamCode, templateDesc: { contains: 'mock_data' } }
    });
    if (existing > 0) return 0;

    const templates = [
      {
        teamCode,
        templateType: 'form_collect',
        title: '每日安全检查表',
        templateDesc: 'mock_data - 每日安全检查收集表',
        items: JSON.stringify([
          { name: 'weather', label: '天气状况', type: 'select', required: true, options: ['晴朗', '多云', '阴天', '雨天', '雾天'] },
          { name: 'seaState', label: '海况', type: 'select', required: true, options: ['平静', '轻微', '中等', '恶劣'] },
          { name: 'safetyBrief', label: '安全简报', type: 'textarea', required: false },
          { name: 'issues', label: '发现问题', type: 'textarea', required: false },
        ]),
      },
      {
        teamCode,
        templateType: 'photo_checkin',
        title: '设备巡检拍照',
        templateDesc: 'mock_data - 设备巡检拍照打卡',
        items: JSON.stringify([
          { name: 'equipment', label: '设备名称', type: 'select', required: true, options: ['主机', '发电机', '舵机', '消防系统', '救生设备'] },
          { name: 'condition', label: '设备状态', type: 'select', required: true, options: ['正常', '需保养', '故障待修'] },
          { name: 'photos', label: '现场照片', type: 'photo', required: true, maxCount: 3 },
        ]),
      },
      {
        teamCode,
        templateType: 'port_call_check',
        title: '抵港前检查清单',
        templateDesc: 'mock_data - 抵港前检查清单',
        items: JSON.stringify([
          { name: 'documents', label: '证件文书', type: 'checkbox', required: true, options: ['船舶证书', '船员证书', '航行日志', '货物清单'] },
          { name: 'equipment', label: '设备检查', type: 'checkbox', required: true, options: ['通信设备', '导航设备', '消防设备', '救生设备'] },
          { name: 'cargo', label: '货物状态', type: 'text', required: true },
        ]),
      },
    ];

    await this.prisma.publishTemplate.createMany({ data: templates, skipDuplicates: true });
    return templates.length;
  }

  private async generateShipTasks(ships: any[], createdBy: number, teamCode: TeamCode): Promise<number> {
    const templates = await this.prisma.publishTemplate.findMany({
      where: { teamCode, templateDesc: { contains: 'mock_data' } }
    });

    if (templates.length === 0) return 0;

    const tasks = [];
    const sampleShips = ships.slice(0, 10);

    for (const ship of sampleShips) {
      for (const template of templates) {
        for (let day = 1; day <= 10; day += 3) {
          const date = new Date(2026, 5, day);
          tasks.push({
            teamCode,
            shipId: ship.id,
            templateId: template.id,
            templateType: template.templateType,
            totalItems: 4,
            completedItems: Math.random() > 0.5 ? 4 : Math.floor(Math.random() * 4),
            progress: Math.random() > 0.5 ? 100 : Math.floor(Math.random() * 100),
            status: Math.random() > 0.5 ? 'completed' : (Math.random() > 0.5 ? 'in_progress' : 'pending'),
            triggerDate: date,
          });
        }
      }
    }

    await this.prisma.shipTaskStatus.createMany({ data: tasks, skipDuplicates: true });
    return tasks.length;
  }

  private async generateTaskResponses(ships: any[], respondedBy: number, teamCode: TeamCode): Promise<number> {
    const tasks = await this.prisma.shipTaskStatus.findMany({
      where: { teamCode, status: { in: ['in_progress', 'completed'] } }
    });

    if (tasks.length === 0) return 0;

    const responses = [];
    for (const task of tasks) {
      if (Math.random() > 0.3) {
        responses.push({
          where: { id: task.id },
          data: {
            status: 'completed',
            completedItems: task.totalItems,
            progress: 100,
            respondedBy,
            respondedAt: new Date(2026, 5, Math.floor(Math.random() * 30) + 1),
            responseData: JSON.stringify({
              _mock: 'mock_data',
              weather: ['晴朗', '多云', '阴天'][Math.floor(Math.random() * 3)],
              seaState: ['平静', '轻微', '中等'][Math.floor(Math.random() * 3)],
              safetyBrief: '今日安全状况良好，无异常情况报告。',
              issues: Math.random() > 0.7 ? '部分设备需安排时间保养' : '',
            }),
          },
        });
      }
    }

    let count = 0;
    for (const response of responses) {
      try {
        await this.prisma.shipTaskStatus.update(response);
        count++;
      } catch (e) {
        console.error('更新任务响应失败:', e);
      }
    }
    return count;
  }

  private async generateDiaries(ships: any[], createdBy: number, teamCode: TeamCode): Promise<number> {
    const weathers = ['晴朗', '多云', '阴天', '小雨', '大风'];
    const contents = [
      '今日航行顺利，天气良好。船员状态稳定，各项设备运行正常。',
      '完成了今日的设备巡检工作，发现2号发电机需进行例行保养。',
      '召开了安全例会，强调了近期航行安全注意事项。',
      '进行了消防演练，全体船员反应迅速，达到预期效果。',
      '收到公司通知，下周将进行船舶年检，请各部门做好准备。',
      '今日天气突变，已采取相应安全措施，确保船舶安全。',
      '完成了货物装卸工作，一切正常。准备离港。',
      '组织船员进行了业务学习，提高专业技能水平。',
    ];

    const diaries = [];
    const sampleShips = ships.slice(0, 8);

    for (const ship of sampleShips) {
      for (let day = 1; day <= 10; day++) {
        if (Math.random() > 0.5) {
          diaries.push({
            teamCode,
            shipId: ship.id,
            userId: createdBy,
            date: new Date(2026, 5, day),
            weather: weathers[Math.floor(Math.random() * weathers.length)] + ' (mock_data)',
            content: `<p>${contents[Math.floor(Math.random() * contents.length)]}</p><p>船舶位置：${ship.cnShipName} 航行中</p>`,
          });
        }
      }
    }

    if (diaries.length === 0) return 0;

    await this.prisma.diary.createMany({ data: diaries, skipDuplicates: true });
    return diaries.length;
  }
}
