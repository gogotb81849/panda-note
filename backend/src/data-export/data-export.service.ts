import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { TeamCode } from '@prisma/client';

@Injectable()
export class DataExportService {
  constructor(private prisma: PrismaService) {}

  async exportUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户列表');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '用户名', key: 'username', width: 20 },
      { header: '真实姓名', key: 'realName', width: 20 },
      { header: '团队', key: 'teamCode', width: 15 },
      { header: '当前角色', key: 'role', width: 25 },
      { header: '最后登录', key: 'lastLoginAt', width: 20 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    users.forEach((user) => {
      worksheet.addRow({
        ...user,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '未登录',
        createdAt: new Date(user.createdAt).toLocaleString('zh-CN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename: `users_${Date.now()}.xlsx` };
  }

  async exportSchedules(teamCode: string, startDate?: string, endDate?: string) {
    const where: any = { teamCode };
    if (startDate && endDate) {
      where.recordDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        ship: true,
        createdBy: { select: { realName: true } },
      },
      orderBy: { recordDate: 'desc' },
      take: 1000,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('工作台账');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '日期', key: 'recordDate', width: 15 },
      { header: '船舶', key: 'shipName', width: 20 },
      { header: '一级分类', key: 'firstType', width: 20 },
      { header: '二级分类', key: 'secondType', width: 20 },
      { header: '标题', key: 'title', width: 30 },
      { header: '描述', key: 'description', width: 40 },
      { header: '状态', key: 'finishStatus', width: 15 },
      { header: '优先级', key: 'priority', width: 15 },
      { header: '创建人', key: 'createdBy', width: 20 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    schedules.forEach((schedule) => {
      worksheet.addRow({
        id: schedule.id,
        recordDate: new Date(schedule.recordDate).toLocaleDateString('zh-CN'),
        shipName: schedule.ship?.cnShipName || '-',
        firstType: schedule.firstType,
        secondType: schedule.secondType,
        title: schedule.title || '-',
        description: schedule.description || '-',
        finishStatus: schedule.finishStatus,
        priority: schedule.priority,
        createdBy: schedule.createdBy?.realName || '-',
        createdAt: new Date(schedule.createdAt).toLocaleString('zh-CN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename: `schedules_${teamCode}_${Date.now()}.xlsx` };
  }

  async exportDiaries(teamCode: string, startDate?: string, endDate?: string) {
    const where: any = { teamCode };
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const diaries = await this.prisma.diary.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('航海日记');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '日期', key: 'date', width: 15 },
      { header: '天气', key: 'weather', width: 15 },
      { header: '海况', key: 'seaCondition', width: 20 },
      { header: '船舶名称', key: 'shipName', width: 20 },
      { header: '离港', key: 'departurePort', width: 20 },
      { header: '抵港', key: 'arrivalPort', width: 20 },
      { header: '政委', key: 'politicalInstructorName', width: 20 },
      { header: '一级分类', key: 'categoryFirst', width: 20 },
      { header: '二级分类', key: 'categorySecond', width: 20 },
      { header: '内容摘要', key: 'content', width: 50 },
    ];

    diaries.forEach((diary) => {
      worksheet.addRow({
        id: diary.id,
        date: new Date(diary.date).toLocaleDateString('zh-CN'),
        weather: diary.weather || '-',
        seaCondition: diary.seaCondition || '-',
        shipName: diary.shipName || '-',
        departurePort: diary.departurePort || '-',
        arrivalPort: diary.arrivalPort || '-',
        politicalInstructorName: diary.politicalInstructorName || '-',
        categoryFirst: diary.categoryFirst || '-',
        categorySecond: diary.categorySecond || '-',
        content: diary.content?.substring(0, 200) || '-',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename: `diaries_${teamCode}_${Date.now()}.xlsx` };
  }

  async exportPartyActivities(teamCode: string) {
    const activities = await this.prisma.partyActivity.findMany({
      where: { teamCode: teamCode as TeamCode },
      orderBy: { activityDate: 'desc' },
      take: 1000,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('党建活动');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '活动类型', key: 'activityType', width: 20 },
      { header: '主题', key: 'title', width: 30 },
      { header: '日期', key: 'activityDate', width: 15 },
      { header: '地点', key: 'location', width: 20 },
      { header: '主持人', key: 'hostName', width: 20 },
      { header: '记录人', key: 'recorderName', width: 20 },
      { header: '参会人数', key: 'attendeeCount', width: 15 },
      { header: '议题', key: 'agenda', width: 50 },
      { header: '决议', key: 'resolution', width: 50 },
    ];

    const typeLabels = {
      branch_meeting: '支部党员大会',
      committee_meeting: '支委会',
      party_group_meeting: '党小组会',
      party_lecture: '党课',
      theme_party_day: '主题党日',
      study_session: '专题学习',
      organizational_life: '组织生活会',
      democratic_review: '民主评议',
    };

    activities.forEach((activity) => {
      worksheet.addRow({
        id: activity.id,
        activityType: typeLabels[activity.activityType] || activity.activityType,
        title: activity.title,
        activityDate: new Date(activity.activityDate).toLocaleDateString('zh-CN'),
        location: activity.location || '-',
        hostName: activity.hostName || '-',
        recorderName: activity.recorderName || '-',
        attendeeCount: activity.attendeeCount,
        agenda: activity.agenda?.substring(0, 200) || '-',
        resolution: activity.resolution?.substring(0, 200) || '-',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename: `party_activities_${teamCode}_${Date.now()}.xlsx` };
  }

  // Get import template
  async getImportTemplate(templateType: string) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('导入模板');

    if (templateType === 'users') {
      worksheet.columns = [
        { header: '用户名*', key: 'username', width: 20 },
        { header: '密码*', key: 'password', width: 20 },
        { header: '真实姓名*', key: 'realName', width: 20 },
        { header: '团队*', key: 'teamCode', width: 15 },
        { header: '角色*', key: 'role', width: 25 },
      ];
      worksheet.addRow({});
      worksheet.addRow({ username: 'testuser', password: '123456', realName: '测试用户', teamCode: 'team1', role: 'shore_crew_supervisor' });
    } else if (templateType === 'schedules') {
      worksheet.columns = [
        { header: '日期*', key: 'date', width: 15 },
        { header: '一级分类*', key: 'firstType', width: 20 },
        { header: '二级分类*', key: 'secondType', width: 20 },
        { header: '标题', key: 'title', width: 30 },
        { header: '描述', key: 'description', width: 40 },
        { header: '状态', key: 'status', width: 15 },
        { header: '优先级', key: 'priority', width: 15 },
      ];
      worksheet.addRow({});
      worksheet.addRow({ date: '2024-01-01', firstType: '党建工作', secondType: '支部会议', title: '示例标题', description: '示例描述', status: 'pending', priority: 'normal' });
    } else {
      throw new BadRequestException('不支持的模板类型');
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename: `template_${templateType}.xlsx` };
  }
}
