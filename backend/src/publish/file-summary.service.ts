import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

@Injectable()
export class FileSummaryService {
  constructor(private prisma: PrismaService) {}

  private async getShipName(shipId: number): Promise<string> {
    try {
      const ship = await this.prisma.ship.findUnique({
        where: { id: shipId },
        select: { cnShipName: true },
      });
      return ship?.cnShipName || '';
    } catch {
      return '';
    }
  }

  private async getShipNames(shipIds: number[]): Promise<Map<number, string>> {
    const names = new Map<number, string>();
    if (shipIds.length === 0) return names;

    const ships = await this.prisma.ship.findMany({
      where: { id: { in: shipIds } },
      select: { id: true, cnShipName: true },
    });

    ships.forEach((ship) => {
      names.set(ship.id, ship.cnShipName || '');
    });

    return names;
  }

  async generateExcelSummary(templateId: number, teamCode: string): Promise<string> {
    const template = await this.prisma.publishTemplate.findFirst({
      where: { id: templateId, teamCode: teamCode as any },
    });

    if (!template) {
      throw new BadRequestException('模板不存在');
    }

    const items = template.items as any[] || [];

    const shipTasks = await this.prisma.shipTaskStatus.findMany({
      where: { templateId, teamCode: teamCode as any, status: 'completed' },
    });

    if (shipTasks.length === 0) {
      throw new BadRequestException('暂无已完成的提交记录');
    }

    const shipIds = [...new Set(shipTasks.map((t) => t.shipId))];
    const shipNames = await this.getShipNames(shipIds);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '熊猫笔记';
    workbook.lastModifiedBy = '系统自动生成';
    workbook.created = new Date();
    workbook.modified = new Date();

    const mainSheet = workbook.addWorksheet('汇总数据');

    const headers = ['序号', '船舶名称', '提交时间', ...items.map((item) => item.label || item.fieldLabel || item.name)];
    mainSheet.addRow(headers);

    headers.forEach((_, index) => {
      mainSheet.getColumn(index + 1).width = index <= 2 ? 15 : 25;
    });

    for (let index = 0; index < shipTasks.length; index++) {
      const task = shipTasks[index];
      const responseData = task.responseData as Record<string, any> || {};
      const shipName = shipNames.get(task.shipId) || '';

      const rowData = [
        index + 1,
        shipName,
        task.submittedAt ? new Date(task.submittedAt).toLocaleString('zh-CN') : '',
      ];

      items.forEach((item) => {
        const fieldName = item.name || item.fieldName;
        let value = responseData[fieldName];

        if (value === undefined || value === null) {
          value = '';
        } else if (Array.isArray(value)) {
          value = value.join('; ');
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }

        rowData.push(String(value));
      });

      mainSheet.addRow(rowData);
    }

    const headerRow = mainSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1677FF' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    mainSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      }
    });

    mainSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: shipTasks.length + 1, column: headers.length },
    };

    const summarySheet = workbook.addWorksheet('统计汇总');
    summarySheet.addRow(['统计项', '数值']);
    summarySheet.addRow(['总船舶数', shipTasks.length]);
    summarySheet.addRow(['模板名称', template.title || '']);
    summarySheet.addRow(['生成时间', new Date().toLocaleString('zh-CN')]);

    items.forEach((item) => {
      if (item.type === 'select' || item.type === 'multi_select') {
        const optionCounts: Record<string, number> = {};
        shipTasks.forEach((task) => {
          const responseData = task.responseData as Record<string, any> || {};
          const fieldName = item.name || item.fieldName;
          const value = responseData[fieldName];
          if (value) {
            const values = Array.isArray(value) ? value : [value];
            values.forEach((v: string) => {
              optionCounts[v] = (optionCounts[v] || 0) + 1;
            });
          }
        });
        summarySheet.addRow([`${item.label || item.fieldLabel || item.name} - 选项统计`]);
        Object.entries(optionCounts).forEach(([option, count]) => {
          summarySheet.addRow([option, count]);
        });
        summarySheet.addRow([]);
      }
    });

    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'summaries');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `${template.title}_汇总_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(outputDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  async mergeExcelFiles(templateId: number, teamCode: string): Promise<string> {
    const shipTasks = await this.prisma.shipTaskStatus.findMany({
      where: { templateId, teamCode: teamCode as any, status: 'completed' },
    });

    if (shipTasks.length === 0) {
      throw new BadRequestException('暂无已完成的提交记录');
    }

    const shipIds = [...new Set(shipTasks.map((t) => t.shipId))];
    const shipNames = await this.getShipNames(shipIds);

    const mergedWorkbook = new ExcelJS.Workbook();
    let hasData = false;

    for (const task of shipTasks) {
      const fileList = task.fileList as any[] || [];
      const shipName = shipNames.get(task.shipId) || 'unknown';

      for (const fileItem of fileList) {
        const filePath = path.join(
          __dirname,
          '..',
          '..',
          'uploads',
          fileItem.path || fileItem.url || ''
        );

        if (!fs.existsSync(filePath)) {
          continue;
        }

        const fileExt = path.extname(filePath).toLowerCase();
        if (fileExt !== '.xlsx' && fileExt !== '.xls') {
          continue;
        }

        try {
          const sourceWorkbook = new ExcelJS.Workbook();
          await sourceWorkbook.xlsx.readFile(filePath);
          sourceWorkbook.eachSheet((sheet) => {
            const newSheetName = `${shipName}_${sheet.name}`;
            const targetSheet = mergedWorkbook.addWorksheet(newSheetName);

            sheet.eachRow((row, rowNumber) => {
              const rowValues: any[] = [];
              row.eachCell((cell) => {
                rowValues.push(cell.value);
              });

              if (rowNumber === 1) {
                rowValues.unshift('来源船舶');
              } else {
                rowValues.unshift(shipName);
              }

              targetSheet.addRow(rowValues);
            });

            targetSheet.getColumn(1).width = 20;
            hasData = true;
          });
        } catch {
          continue;
        }
      }
    }

    if (!hasData) {
      throw new BadRequestException('未找到可合并的Excel文件');
    }

    const template = await this.prisma.publishTemplate.findFirst({
      where: { id: templateId, teamCode: teamCode as any },
    });

    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'summaries');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `${template?.title || 'Excel合并'}_合并结果_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(outputDir, fileName);

    await mergedWorkbook.xlsx.writeFile(filePath);

    return filePath;
  }

  async generateSummaryReport(templateId: number, teamCode: string): Promise<string> {
    const template = await this.prisma.publishTemplate.findFirst({
      where: { id: templateId, teamCode: teamCode as any },
    });

    if (!template) {
      throw new BadRequestException('模板不存在');
    }

    const items = template.items as any[] || [];

    const shipTasks = await this.prisma.shipTaskStatus.findMany({
      where: { templateId, teamCode: teamCode as any },
    });

    const shipIds = [...new Set(shipTasks.map((t) => t.shipId))];
    const shipNames = await this.getShipNames(shipIds);

    const completedCount = shipTasks.filter((t) => t.status === 'completed').length;
    const pendingCount = shipTasks.filter((t) => t.status === 'pending').length;
    const draftCount = shipTasks.filter((t) => t.status === 'draft').length;
    const completionRate = shipTasks.length > 0 ? Math.round((completedCount / shipTasks.length) * 100) : 0;

    let reportContent = `# ${template.title} - 汇总报告\n\n`;
    reportContent += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    reportContent += `## 一、总体统计\n\n`;
    reportContent += `| 统计项 | 数量 |\n`;
    reportContent += `|--------|------|\n`;
    reportContent += `| 总船舶数 | ${shipTasks.length} |\n`;
    reportContent += `| 已完成 | ${completedCount} |\n`;
    reportContent += `| 待提交 | ${pendingCount} |\n`;
    reportContent += `| 草稿 | ${draftCount} |\n`;
    reportContent += `| 完成率 | ${completionRate}% |\n\n`;

    if (completedCount > 0) {
      reportContent += `## 二、提交明细\n\n`;
      reportContent += `| 序号 | 船舶名称 | 状态 | 提交时间 |\n`;
      reportContent += `|------|----------|------|----------|\n`;

      for (let index = 0; index < shipTasks.length; index++) {
        const task = shipTasks[index];
        const shipName = shipNames.get(task.shipId) || '-';
        reportContent += `| ${index + 1} | ${shipName} | ${task.status} | ${task.submittedAt ? new Date(task.submittedAt).toLocaleString('zh-CN') : '-'} |\n`;
      }

      reportContent += `\n`;
    }

    reportContent += `## 三、字段统计\n\n`;
    items.forEach((item) => {
      if (item.type === 'select' || item.type === 'multi_select') {
        const optionCounts: Record<string, number> = {};
        let totalWithValue = 0;

        shipTasks.forEach((task) => {
          const responseData = task.responseData as Record<string, any> || {};
          const fieldName = item.name || item.fieldName;
          const value = responseData[fieldName];
          if (value) {
            totalWithValue++;
            const values = Array.isArray(value) ? value : [value];
            values.forEach((v: string) => {
              optionCounts[v] = (optionCounts[v] || 0) + 1;
            });
          }
        });

        const label = item.label || item.fieldLabel || item.name;
        reportContent += `### ${label}\n\n`;
        reportContent += `参与人数: ${totalWithValue} 人\n\n`;

        if (Object.keys(optionCounts).length > 0) {
          reportContent += `| 选项 | 选择人数 | 占比 |\n`;
          reportContent += `|------|----------|------|\n`;

          Object.entries(optionCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([option, count]) => {
              const percentage = totalWithValue > 0 ? Math.round((count / totalWithValue) * 100) : 0;
              reportContent += `| ${option} | ${count} | ${percentage}% |\n`;
            });

          reportContent += `\n`;
        }
      }
    });

    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'summaries');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `${template.title}_汇总报告_${new Date().toISOString().split('T')[0]}.md`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, reportContent, 'utf-8');

    return filePath;
  }

  async getFileListForDownload(templateId: number, teamCode: string): Promise<Array<{ filePath: string; fileName: string; shipName: string }>> {
    const shipTasks = await this.prisma.shipTaskStatus.findMany({
      where: { templateId, teamCode: teamCode as any, status: 'completed' },
    });

    const shipIds = [...new Set(shipTasks.map((t) => t.shipId))];
    const shipNames = await this.getShipNames(shipIds);

    const fileList: Array<{ filePath: string; fileName: string; shipName: string }> = [];

    for (const task of shipTasks) {
      const taskFileList = task.fileList as any[] || [];
      const shipName = shipNames.get(task.shipId) || '';

      for (const fileItem of taskFileList) {
        const filePath = path.join(
          __dirname,
          '..',
          '..',
          'uploads',
          fileItem.path || fileItem.url || ''
        );

        if (fs.existsSync(filePath)) {
          fileList.push({
            filePath,
            fileName: fileItem.filename || path.basename(filePath),
            shipName,
          });
        }
      }
    }

    return fileList;
  }
}
