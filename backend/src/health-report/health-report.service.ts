import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// 标准模板列定义（基于实际提供的Excel模板）
const STANDARD_COLUMNS = [
  '序号', '船员姓名', '工号', '自有还是外聘',
  '身体状况', '精神', '工作态度', '家庭情况', '船舶采取的措施'
];

// 必须有的核心列（最少要求）
const REQUIRED_COLUMNS = ['船员姓名', '身体状况', '精神'];

export interface ParsedCrewHealthData {
  seqNo: string;
  name: string;
  employeeId: string;
  employmentType: string;
  bodyHealth: string;
  mental: string;
  workAttitude: string;
  familySituation: string;
  shipMeasures: string;
}

@Injectable()
export class HealthReportService {
  private readonly logger = new Logger(HealthReportService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'health-reports');
  private readonly templateDir = path.join(process.cwd(), 'uploads', 'templates');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
    }
    this.copyTemplateToServer();
  }

  /**
   * 复制标准模板到服务器
   */
  private copyTemplateToServer() {
    const localTemplatePath = path.join(process.cwd(), '..', '..', '..', '熊猫笔记', '"XXX"轮2026年x月底船员身体状况排查跟踪表(1).xls');
    const serverTemplatePath = path.join(this.templateDir, '船员健康排查表模板.xls');
    
    // 尝试从多个路径查找模板
    const possiblePaths = [
      localTemplatePath,
      path.join(process.cwd(), 'uploads', 'templates', '船员健康排查表模板.xls'),
      path.join(process.cwd(), '..', '熊猫笔记', '"XXX"轮2026年x月底船员身体状况排查跟踪表(1).xls'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fs.copyFileSync(p, serverTemplatePath);
        this.logger.log(`模板已复制到: ${serverTemplatePath}`);
        return;
      }
    }
    this.logger.warn('未找到标准模板文件，将使用默认模板');
  }

  /**
   * 前置校验：规则化检查Excel格式
   * 基于真实模板结构：
   * - 行0: 大标题（合并单元格）
   * - 行1: 第一行表头（序号、船员姓名、工号、自有还是外聘、排查内容...）
   * - 行2: 第二行表头（身体状况、精神、工作态度、家庭情况、船舶采取的措施）
   * - 行3+: 数据行
   */
  validateExcel(buffer: Buffer, isXls: boolean = false): {
    pass: boolean;
    errors: Array<{ field: string; message: string }>;
    aiFixable: boolean;
    structure: 'standard' | 'variant' | 'invalid';
  } {
    const errors: Array<{ field: string; message: string }> = [];
    let aiFixable = false;

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 }) as string[][];

      if (jsonData.length < 3) {
        errors.push({ field: 'file', message: '文件行数不足，至少需要3行（标题+表头+数据）' });
        return { pass: false, errors, aiFixable: false, structure: 'invalid' };
      }

      // 检查是否有大标题行（行0应该包含"船员身体状况排查跟踪表"）
      const titleRow = jsonData[0].join('');
      const hasTitle = titleRow.includes('船员') && titleRow.includes('排查');

      // 查找实际表头行（可能是行1或行2，取决于模板格式）
      let headerRowIndex = -1;
      let headerRow: string[] = [];
      
      // 尝试找到包含"船员姓名"的行作为表头行
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const rowStr = jsonData[i].join('');
        if (rowStr.includes('船员姓名') || rowStr.includes('姓名')) {
          headerRowIndex = i;
          headerRow = jsonData[i];
          break;
        }
      }

      if (headerRowIndex === -1) {
        errors.push({ field: 'headers', message: '未找到标准表头，请确认使用正确的模板' });
        return { pass: false, errors, aiFixable: false, structure: 'invalid' };
      }

      // 检查核心列是否存在（语义匹配）
      const columnMap = this.matchColumns(headerRow);
      const missingColumns: string[] = [];
      
      for (const required of REQUIRED_COLUMNS) {
        if (!(required in columnMap)) {
          missingColumns.push(required);
        }
      }

      if (missingColumns.length > 0) {
        errors.push({
          field: 'headers',
          message: `缺少必要列：${missingColumns.join('、')}`,
        });
      }

      // 检查数据行（表头之后至少有一行数据）
      const dataStartIndex = headerRowIndex + 1;
      const dataRows = jsonData.slice(dataStartIndex).filter(row => {
        return row.some(cell => cell && String(cell).trim() !== '');
      });

      if (dataRows.length === 0) {
        errors.push({ field: 'rows', message: '未找到数据行，请至少填写1名船员信息' });
      }

      // 检查是否为标准模板（所有列都匹配）
      const matchedColumns = Object.keys(columnMap).length;
      const isStandard = matchedColumns >= STANDARD_COLUMNS.length - 1 && missingColumns.length === 0;
      const isVariant = matchedColumns >= REQUIRED_COLUMNS.length;

      return {
        pass: errors.length === 0 && isStandard,
        errors,
        aiFixable: errors.length === 0 && isVariant && !isStandard,
        structure: isStandard ? 'standard' : (isVariant ? 'variant' : 'invalid'),
      };
    } catch (error) {
      return {
        pass: false,
        errors: [{ field: 'file', message: '文件解析失败，请确认是有效的Excel文件' }],
        aiFixable: false,
        structure: 'invalid',
      };
    }
  }

  /**
   * 列语义匹配
   */
  private matchColumns(headers: string[]): Record<string, number> {
    const columnMap: Record<string, number> = {};
    
    // 标准列名映射（包含可能的变体）
    const columnAliases: Record<string, string[]> = {
      '序号': ['序号', '编号', '顺序'],
      '船员姓名': ['船员姓名', '姓名', '名字', '人员姓名'],
      '工号': ['工号', '员工号', '编号'],
      '自有还是外聘': ['自有还是外聘', '用工性质', '自有/外聘', '聘用类型'],
      '身体状况': ['身体状况', '身体健康', '生理健康', '身体情况', '体检状况'],
      '精神': ['精神', '心理', '精神状态', '心理健康', '心理状况'],
      '工作态度': ['工作态度', '态度'],
      '家庭情况': ['家庭情况', '家庭状况'],
      '船舶采取的措施': ['船舶采取的措施', '措施', '处理措施', '采取的措施'],
    };

    for (const [standard, aliases] of Object.entries(columnAliases)) {
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || '').trim();
        if (aliases.some(alias => header === alias || header.includes(alias))) {
          columnMap[standard] = i;
          break;
        }
      }
    }

    return columnMap;
  }

  /**
   * 解析Excel数据
   */
  parseExcel(buffer: Buffer): {
    crewData: ParsedCrewHealthData[];
    crewCount: number;
    abnormalDetails: Array<{
      name: string;
      employeeId: string;
      bodyHealth: string;
      mental: string;
      workAttitude: string;
      familySituation: string;
      abnormalFields: string[];
      summary: string;
    }>;
  } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 }) as string[][];

    // 查找表头行
    let headerRowIndex = -1;
    let headerRow: string[] = [];
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const rowStr = jsonData[i].join('');
      if (rowStr.includes('船员姓名') || rowStr.includes('姓名')) {
        headerRowIndex = i;
        headerRow = jsonData[i];
        break;
      }
    }

    const columnMap = this.matchColumns(headerRow);
    const dataStartIndex = headerRowIndex + 1;

    const crewData: ParsedCrewHealthData[] = [];
    const abnormalDetails: Array<{
      name: string;
      employeeId: string;
      bodyHealth: string;
      mental: string;
      workAttitude: string;
      familySituation: string;
      abnormalFields: string[];
      summary: string;
    }> = [];

    for (let i = dataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const getCell = (col: string) => {
        const idx = columnMap[col];
        return idx !== undefined ? String(row[idx] || '').trim() : '';
      };

      const name = getCell('船员姓名');
      const bodyHealth = getCell('身体状况');
      const mental = getCell('精神');
      const workAttitude = getCell('工作态度');
      const familySituation = getCell('家庭情况');
      const shipMeasures = getCell('船舶采取的措施');

      // 跳过空行（没有姓名或其他核心数据）
      if (!name && !bodyHealth && !mental) continue;

      const crewRecord: ParsedCrewHealthData = {
        seqNo: getCell('序号'),
        name,
        employeeId: getCell('工号'),
        employmentType: getCell('自有还是外聘'),
        bodyHealth: bodyHealth || '正常',
        mental: mental || '正常',
        workAttitude: workAttitude || '',
        familySituation: familySituation || '',
        shipMeasures: shipMeasures || '',
      };

      crewData.push(crewRecord);

      // 检测异常
      const abnormalFields: string[] = [];
      const normalKeywords = ['正常', '良好', '无', '无异常', '', '稳定'];

      if (bodyHealth && !normalKeywords.some(k => bodyHealth.includes(k))) {
        abnormalFields.push('身体状况');
      }
      if (mental && !normalKeywords.some(k => mental.includes(k))) {
        abnormalFields.push('精神');
      }
      if (workAttitude && !normalKeywords.some(k => workAttitude.includes(k))) {
        abnormalFields.push('工作态度');
      }
      if (familySituation && !normalKeywords.some(k => familySituation.includes(k))) {
        abnormalFields.push('家庭情况');
      }

      if (abnormalFields.length > 0) {
        const summaryParts: string[] = [];
        if (abnormalFields.includes('身体状况')) summaryParts.push(`身体状况：${bodyHealth}`);
        if (abnormalFields.includes('精神')) summaryParts.push(`精神：${mental}`);
        if (abnormalFields.includes('工作态度')) summaryParts.push(`工作态度：${workAttitude}`);
        if (abnormalFields.includes('家庭情况')) summaryParts.push(`家庭情况：${familySituation}`);
        if (shipMeasures) summaryParts.push(`措施：${shipMeasures}`);

        abnormalDetails.push({
          name: name || '未知',
          employeeId: crewRecord.employeeId,
          bodyHealth,
          mental,
          workAttitude,
          familySituation,
          abnormalFields,
          summary: summaryParts.join('；'),
        });
      }
    }

    return {
      crewData,
      crewCount: crewData.length,
      abnormalDetails,
    };
  }

  /**
   * 上传健康排查表
   */
  async uploadReport(
    teamCode: string,
    shipId: number,
    userId: number,
    file: Express.Multer.File,
    month: string,
  ) {
    const buffer = fs.readFileSync(file.path);
    const isXls = file.originalname.toLowerCase().endsWith('.xls');

    // 1. 前置校验
    const validation = this.validateExcel(buffer, isXls);

    let validationResult = 'fail';
    let aiFixNotes: string | null = null;
    let parsedResult: any = null;

    if (validation.pass && validation.structure === 'standard') {
      validationResult = 'pass';
      parsedResult = this.parseExcel(buffer);
    } else if (validation.aiFixable && validation.errors.length === 0) {
      validationResult = 'ai_fixed';
      parsedResult = this.parseExcel(buffer);
      aiFixNotes = '本表存在排版变动，AI已语义容错提取';
    } else if (validation.errors.length > 0) {
      fs.unlinkSync(file.path);
      throw new BadRequestException({
        message: validation.errors.map(e => e.message).join('；'),
        errors: validation.errors,
      });
    }

    // 2. 保存文件
    const ext = isXls ? 'xls' : 'xlsx';
    const fileName = `${teamCode}_${shipId}_${month}_${Date.now()}.${ext}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.renameSync(file.path, filePath);

    // 3. 保存记录
    const record = await this.prisma.healthReportUpload.create({
      data: {
        teamCode: teamCode as any,
        shipId,
        month,
        fileName: file.originalname,
        filePath,
        fileSize: buffer.length,
        validationResult,
        validationErrors: validation.errors,
        aiFixNotes,
        crewCount: parsedResult?.crewCount || 0,
        healthAbnormalCount: parsedResult?.abnormalDetails?.filter(d => 
          d.abnormalFields.includes('身体状况') || d.abnormalFields.includes('精神')
        ).length || 0,
        psychAbnormalCount: parsedResult?.abnormalDetails?.filter(d => 
          d.abnormalFields.includes('精神')
        ).length || 0,
        abnormalDetails: parsedResult?.abnormalDetails || [],
        uploadedBy: userId,
        status: 'pending',
      },
    });

    return {
      success: true,
      data: record,
      validation,
      parsed: parsedResult,
    };
  }

  /**
   * 获取标准模板下载路径
   */
  getTemplatePath(): string | null {
    const templatePath = path.join(this.templateDir, '船员健康排查表模板.xls');
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }
    return null;
  }

  /**
   * 获取月度汇总看板数据
   */
  async getDashboard(teamCode: string, month: string) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode: teamCode as any },
      select: { id: true, cnShipName: true },
    });

    const uploads = await this.prisma.healthReportUpload.findMany({
      where: { teamCode: teamCode as any, month },
      include: { ship: { select: { cnShipName: true } } },
      orderBy: { uploadDate: 'desc' },
    });

    const shipStatusMap = new Map<number, typeof uploads[0]>();
    for (const upload of uploads) {
      if (!shipStatusMap.has(upload.shipId)) {
        shipStatusMap.set(upload.shipId, upload);
      }
    }

    let totalCrew = 0;
    let healthAbnormalTotal = 0;
    let psychAbnormalTotal = 0;
    let normalShips = 0;
    let abnormalShips = 0;
    let unsubmittedShips = 0;
    const unsubmittedShipNames: string[] = [];
    const unsubmittedShipIds: number[] = [];

    const shipCards = ships.map(ship => {
      const upload = shipStatusMap.get(ship.id);

      if (!upload) {
        unsubmittedShips++;
        unsubmittedShipNames.push(ship.cnShipName);
        unsubmittedShipIds.push(ship.id);
        return {
          shipId: ship.id,
          shipName: ship.cnShipName,
          status: 'unsubmitted' as const,
          crewCount: 0,
          healthAbnormalCount: 0,
          psychAbnormalCount: 0,
          riskLevel: 'gray' as const,
        };
      }

      totalCrew += upload.crewCount;
      healthAbnormalTotal += upload.healthAbnormalCount;
      psychAbnormalTotal += upload.psychAbnormalCount;

      const totalAbnormal = upload.healthAbnormalCount + upload.psychAbnormalCount;
      let riskLevel: 'green' | 'yellow' | 'red' = 'green';

      if (upload.validationResult === 'ai_fixed') {
        riskLevel = 'red';
      } else if (totalAbnormal >= 3) {
        riskLevel = 'red';
        abnormalShips++;
      } else if (totalAbnormal >= 1) {
        riskLevel = 'yellow';
        abnormalShips++;
      } else {
        normalShips++;
      }

      return {
        shipId: ship.id,
        shipName: ship.cnShipName,
        status: upload.validationResult === 'pass' ? 'normal' : 'abnormal',
        crewCount: upload.crewCount,
        healthAbnormalCount: upload.healthAbnormalCount,
        psychAbnormalCount: upload.psychAbnormalCount,
        riskLevel,
        validationResult: upload.validationResult,
        uploadId: upload.id,
      };
    });

    const riskOrder = { red: 0, yellow: 1, gray: 2, green: 3 };
    shipCards.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    let summary = await this.prisma.monthlyHealthSummary.findUnique({
      where: { teamCode_month: { teamCode: teamCode as any, month } },
    });

    if (!summary) {
      summary = await this.prisma.monthlyHealthSummary.create({
        data: {
          teamCode: teamCode as any,
          month,
          totalShips: ships.length,
          normalShips,
          abnormalShips,
          unsubmittedShips,
          totalCrew,
          healthAbnormalTotal,
          psychAbnormalTotal,
        },
      });
    }

    // 计算环比数据
    const prevMonth = this.getPreviousMonth(month);
    const currentSubmissionRate = ships.length > 0 ? Math.round(((ships.length - unsubmittedShips) / ships.length) * 100) : 0;
    let comparisonData = null;
    if (prevMonth) {
      const prevSummary = await this.prisma.monthlyHealthSummary.findUnique({
        where: { teamCode_month: { teamCode: teamCode as any, month: prevMonth } },
      });
      if (prevSummary) {
        const prevSubmissionRate = prevSummary.totalShips > 0 ? Math.round(((prevSummary.totalShips - prevSummary.unsubmittedShips) / prevSummary.totalShips) * 100) : 0;
        comparisonData = {
          prevMonth,
          totalCrewDiff: totalCrew - prevSummary.totalCrew,
          healthAbnormalDiff: healthAbnormalTotal - prevSummary.healthAbnormalTotal,
          psychAbnormalDiff: psychAbnormalTotal - prevSummary.psychAbnormalTotal,
          abnormalShipsDiff: abnormalShips - prevSummary.abnormalShips,
          submissionRateDiff: currentSubmissionRate - prevSubmissionRate,
        };
      }
    }

    // 生成环比分析文本
    let comparisonText = '';
    if (comparisonData) {
      const parts: string[] = [];
      if (comparisonData.healthAbnormalDiff > 0) {
        parts.push(`生理异常人数环比增加${comparisonData.healthAbnormalDiff}人`);
      } else if (comparisonData.healthAbnormalDiff < 0) {
        parts.push(`生理异常人数环比减少${Math.abs(comparisonData.healthAbnormalDiff)}人`);
      }
      if (comparisonData.psychAbnormalDiff > 0) {
        parts.push(`心理异常人数环比增加${comparisonData.psychAbnormalDiff}人`);
      } else if (comparisonData.psychAbnormalDiff < 0) {
        parts.push(`心理异常人数环比减少${Math.abs(comparisonData.psychAbnormalDiff)}人`);
      }
      if (comparisonData.submissionRateDiff > 0) {
        parts.push(`报送完成率环比提升${comparisonData.submissionRateDiff}%`);
      } else if (comparisonData.submissionRateDiff < 0) {
        parts.push(`报送完成率环比下降${Math.abs(comparisonData.submissionRateDiff)}%`);
      }
      comparisonText = parts.length > 0 ? `与上月相比，${parts.join('，')}。` : '与上月相比，整体情况基本持平。';
    }

    return {
      totalShips: ships.length,
      normalShips,
      abnormalShips,
      unsubmittedShips,
      unsubmittedShipNames,
      unsubmittedShipIds,
      totalCrew,
      healthAbnormalTotal,
      psychAbnormalTotal,
      submissionRate: ships.length > 0
        ? Math.round(((ships.length - unsubmittedShips) / ships.length) * 100)
        : 0,
      shipCards,
      summary,
      comparisonData,
      comparisonText,
    };
  }

  /**
   * 获取上一个月 YYYY-MM
   */
  private getPreviousMonth(month: string): string | null {
    const [year, mon] = month.split('-').map(Number);
    if (!year || !mon) return null;
    const prevMon = mon - 1;
    if (prevMon <= 0) {
      return `${year - 1}-12`;
    }
    return `${year}-${String(prevMon).padStart(2, '0')}`;
  }

  /**
   * 获取单船详情
   */
  async getShipDetail(teamCode: string, uploadId: number) {
    const upload = await this.prisma.healthReportUpload.findFirst({
      where: { id: uploadId, teamCode: teamCode as any },
      include: { ship: { select: { cnShipName: true } } },
    });

    if (!upload) {
      throw new BadRequestException('未找到该上传记录');
    }

    return {
      shipName: upload.ship.cnShipName,
      uploadDate: upload.uploadDate,
      validationResult: upload.validationResult,
      aiFixNotes: upload.aiFixNotes,
      crewCount: upload.crewCount,
      healthAbnormalCount: upload.healthAbnormalCount,
      psychAbnormalCount: upload.psychAbnormalCount,
      abnormalDetails: upload.abnormalDetails,
      supervisorNote: (upload as any).supervisorNote || '',
    };
  }

  /**
   * 保存主管批注
   */
  async saveSupervisorNote(teamCode: string, uploadId: number, userId: number, note: string) {
    const upload = await this.prisma.healthReportUpload.findFirst({
      where: { id: uploadId, teamCode: teamCode as any },
    });

    if (!upload) {
      throw new BadRequestException('未找到该上传记录');
    }

    await this.prisma.healthReportUpload.update({
      where: { id: uploadId },
      data: {
        supervisorNote: note,
        reviewedBy: userId,
        reviewedAt: new Date(),
        status: 'reviewed',
      },
    });

    return { success: true };
  }

  /**
   * 获取未提交船舶名单
   */
  async getUnsubmittedShips(teamCode: string, month: string) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode: teamCode as any },
      select: { id: true, cnShipName: true, politicalOfficerName: true },
    });

    const submitted = await this.prisma.healthReportUpload.findMany({
      where: { teamCode: teamCode as any, month },
      select: { shipId: true },
    });

    const submittedIds = new Set(submitted.map(s => s.shipId));
    return ships.filter(s => !submittedIds.has(s.id));
  }

  /**
   * 导出全船汇总总表
   */
  async exportSummary(teamCode: string, month: string) {
    const ships = await this.prisma.ship.findMany({
      where: { teamCode: teamCode as any },
      select: { id: true, cnShipName: true },
    });

    const uploads = await this.prisma.healthReportUpload.findMany({
      where: { teamCode: teamCode as any, month },
      include: { ship: { select: { cnShipName: true } } },
    });

    const shipMap = new Map<number, typeof uploads[0]>();
    for (const u of uploads) {
      if (!shipMap.has(u.shipId)) shipMap.set(u.shipId, u);
    }

    const header = ['船舶名称', '报送状态', '排查人数', '生理异常', '心理异常', '风险等级'];
    const rows = ships.map(ship => {
      const upload = shipMap.get(ship.id);
      if (!upload) {
        return [ship.cnShipName, '未提交', 0, 0, 0, '灰色'];
      }
      const totalAbnormal = upload.healthAbnormalCount + upload.psychAbnormalCount;
      let risk = totalAbnormal >= 3 ? '红色' : (totalAbnormal >= 1 ? '黄色' : '绿色');
      if (upload.validationResult === 'ai_fixed') risk = '红色';
      const status = upload.validationResult === 'pass' ? '正常提交' : (upload.validationResult === 'ai_fixed' ? '格式异常(AI修复)' : '异常');
      return [ship.cnShipName, status, upload.crewCount, upload.healthAbnormalCount, upload.psychAbnormalCount, risk];
    });

    return [header, ...rows];
  }

  /**
   * 导出异常人员清单
   */
  async exportAbnormalCrew(teamCode: string, month: string) {
    const uploads = await this.prisma.healthReportUpload.findMany({
      where: { teamCode: teamCode as any, month },
      include: { ship: { select: { cnShipName: true } } },
    });

    const header = ['船舶名称', '船员姓名', '异常类型', '问题说明', '风险等级'];
    const rows: any[][] = [];

    for (const upload of uploads) {
      const details = (upload.abnormalDetails as any[]) || [];
      if (details.length === 0) continue;
      const totalAbnormal = upload.healthAbnormalCount + upload.psychAbnormalCount;
      const riskLevel = totalAbnormal >= 3 ? '高' : '一般';

      for (const d of details) {
        rows.push([
          upload.ship.cnShipName,
          d.name || '未知',
          d.abnormalFields?.join('、') || d.type || '异常',
          d.summary || d.bodyHealth || '',
          riskLevel,
        ]);
      }
    }

    return [header, ...rows];
  }

  /**
   * 记录催报历史
   */
  async recordUrge(teamCode: string, shipId: number, userId: number, month: string) {
    // 记录催报日志到数据库（使用healthReportUpload表扩展）
    const existing = await this.prisma.healthReportUpload.findFirst({
      where: { teamCode: teamCode as any, shipId, month },
    });

    if (!existing) {
      // 如果还没有上传记录，创建一个催报标记
      await this.prisma.healthReportUpload.create({
        data: {
          teamCode: teamCode as any,
          shipId,
          month,
          fileName: '催报记录',
          filePath: '',
          fileSize: 0,
          validationResult: 'fail',
          crewCount: 0,
          healthAbnormalCount: 0,
          psychAbnormalCount: 0,
          uploadedBy: userId,
          supervisorNote: `催报时间: ${new Date().toISOString()}`,
          status: 'pending',
        },
      });
    }

    return { success: true, message: '催报已记录' };
  }

  /**
   * 获取上月异常船员用于连续性追踪
   */
  async getPrevMonthAbnormal(teamCode: string, shipId: number, month: string) {
    const prevMonth = this.getPreviousMonth(month);
    if (!prevMonth) return [];

    const prevUpload = await this.prisma.healthReportUpload.findFirst({
      where: { teamCode: teamCode as any, shipId, month: prevMonth },
    });

    if (!prevUpload) return [];

    const details = (prevUpload.abnormalDetails as any[]) || [];
    return details.map((d: any) => d.name);
  }
}
