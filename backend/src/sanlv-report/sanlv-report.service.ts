import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';
import * as XLSX from 'xlsx';
import {
  ImportSanlvReportDto,
  SanlvReportImportResult,
  SanlvReportPreviewInput,
} from './dto/import-sanlv-report.dto';

@Injectable()
export class SanlvReportService {
  constructor(private readonly prisma: PrismaService) {}

  async list(teamCode: TeamCode, limit = 30) {
    const items = await this.prisma.sanlvReport.findMany({
      where: { teamCode },
      orderBy: [{ reportMonth: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        shipName: true,
        reportMonth: true,
        reportYear: true,
        totalScore: true,
        passScore: true,
        labelRate1: true,
        threeRate1: true,
        labelRate2: true,
        threeRate2: true,
        labelRate3: true,
        threeRate3: true,
        sourceName: true,
        sourceType: true,
        ruleId: true,
        createdAt: true,
        user: { select: { realName: true, username: true } },
        rule: { select: { id: true, ruleName: true, ruleVersion: true } },
      },
    });
    const total = await this.prisma.sanlvReport.count({ where: { teamCode } });
    return { items, total };
  }

  async findOne(id: number, teamCode: TeamCode) {
    return this.prisma.sanlvReport.findFirst({
      where: { id, teamCode },
      include: {
        user: { select: { realName: true } },
        rule: { select: { id: true, ruleName: true } },
      },
    });
  }

  async remove(id: number, teamCode: TeamCode) {
    await this.prisma.sanlvReport.deleteMany({ where: { id, teamCode } });
    return { ok: true };
  }

  // ---------- 预览（解析 + 自动识别船名/月份等） ----------
  preview(input: SanlvReportPreviewInput): SanlvReportImportResult {
    const parsed = this.parseInputToMatrix(input);
    parsed.detected = this.detectMeta(parsed.matrix, input as any);
    return parsed;
  }

  // ---------- 导入 + 入库 ----------
  async import(
    dto: ImportSanlvReportDto,
    userId: number,
    teamCode: TeamCode,
  ): Promise<{ ok: boolean; reportId: number; importSummary: SanlvReportImportResult }> {
    const parsed = this.parseInputToMatrix(dto);

    if (!dto.shipName || !dto.reportMonth) {
      throw new Error('船名和月份为必填项');
    }
    if (!/^\d{4}-\d{2}$/.test(dto.reportMonth)) {
      throw new Error('月份格式必须是 YYYY-MM，例如 2026-07');
    }

    const headers = parsed.headers || parsed.matrix[0] || [];
    const dataRows = parsed.matrix
      .slice(1)
      .filter((row: any[]) => row.some((c: any) => String(c ?? '').trim() !== ''));

    const details = dataRows.map((row: any[], rowIdx: number) => {
      const col: any = {};
      headers.forEach((h: string, hi: number) => {
        const key = String(h ?? `col_${hi}`).trim() || `col_${hi}`;
        col[key] = row[hi] ?? null;
      });
      return {
        _rowIdx: rowIdx + 2,
        columns: col,
        category: String(col['一级分类'] || col['分类'] || col['category'] || '').trim(),
        subCategory: String(col['二级分类'] || col['子分类'] || col['subCategory'] || '').trim(),
        item:
          String(col['评分项目'] || col['项目'] || col['考核项目'] || col['item'] || '').trim() ||
          `第${rowIdx + 1}行`,
        score: this.safeFloat(col['得分'] || col['实得分'] || col['score']),
        fullMark: this.safeFloat(col['满分'] || col['标准分'] || col['分值'] || col['fullMark']),
        deductReason: String(col['扣分原因'] || col['备注'] || col['说明'] || col['问题说明'] || '').trim(),
      };
    });

    const reportYear = dto.reportYear ?? parseInt(dto.reportMonth.slice(0, 4), 10);

    const created = await this.prisma.sanlvReport.create({
      data: {
        teamCode,
        userId,
        shipName: dto.shipName.trim(),
        reportMonth: dto.reportMonth,
        reportYear,
        ruleId: dto.ruleId || null,
        totalScore: this.safeFloat(dto.totalScore),
        passScore: this.safeFloat(dto.passScore),
        labelRate1: dto.labelRate1?.trim() || null,
        threeRate1: this.safeFloat(dto.threeRate1),
        labelRate2: dto.labelRate2?.trim() || null,
        threeRate2: this.safeFloat(dto.threeRate2),
        labelRate3: dto.labelRate3?.trim() || null,
        threeRate3: this.safeFloat(dto.threeRate3),
        details: details as any,
        analysis: {} as any,   // 分析阶段留空，等陈先生贴两份表数据后再填
        sourceType: dto.sourceType || (dto.fileContent ? 'excel' : 'paste'),
        sourceName: dto.sourceName || null,
        rawPreview: parsed.matrix.slice(0, 20) as any,
        rawColumns: headers as any,
      },
    });

    return {
      ok: true,
      reportId: created.id,
      importSummary: {
        headers,
        matrix: parsed.matrix,
        totalRows: dataRows.length,
        sourceName: parsed.sourceName,
        detected: {
          shipName: created.shipName,
          reportMonth: created.reportMonth,
          reportYear: created.reportYear,
          totalScore: created.totalScore ?? undefined,
          passScore: created.passScore ?? undefined,
        },
      },
    };
  }

  // ======= 工具函数 =======
  private detectMeta(matrix: any[][], input: SanlvReportPreviewInput) {
    const d: NonNullable<SanlvReportImportResult['detected']> = {};
    if (!matrix || matrix.length === 0) return d;
    const sourceName = (input as any).sourceName || (input as any).fileName || '';

    // 从文件名里猜船名和月份
    const m1 = sourceName.match(/(20\d{2})[-_.年\/](\d{1,2})/) || [];
    if (m1[1] && m1[2]) {
      d.reportYear = parseInt(m1[1], 10);
      d.reportMonth = `${m1[1]}-${String(parseInt(m1[2], 10)).padStart(2, '0')}`;
    }
    const mShip = sourceName.match(/([\u4e00-\u9fa5A-Za-z0-9]{2,8})(?=轮|船|号)?[-_\s]*(?:三率|月报|评分|得分)/);
    if (mShip) d.shipName = mShip[1];

    // 在表格内容里扫描"船名/船舶名称/月份/三率总分"这样的 key-value 行（很多报表会在表格顶部放元信息）
    const topRows = matrix.slice(0, Math.min(15, matrix.length));
    for (const row of topRows) {
      const key = String(row[0] ?? '').trim();
      const val = String(row[1] ?? '').trim();
      if (!key || !val) continue;
      if (/(船名|船舶名称|船舶|船)/.test(key) && !d.shipName && /[\u4e00-\u9fa5A-Za-z]/.test(val)) {
        d.shipName = val.replace(/\s*(轮|船|号)\s*$/, '$1');
      }
      if (/(月份|月份：|统计月份|报告期|所属月份)/.test(key)) {
        const mm = val.match(/(20\d{2})[^0-9](\d{1,2})/);
        if (mm) {
          d.reportYear = parseInt(mm[1], 10);
          d.reportMonth = `${mm[1]}-${String(parseInt(mm[2], 10)).padStart(2, '0')}`;
        }
      }
      if (/(总分|合计分|总得分|评分合计)/.test(key)) {
        d.totalScore = this.safeFloat(val);
      }
      if (/(合格线|及格分|合格分)/.test(key)) {
        d.passScore = this.safeFloat(val);
      }
      if (/三率.*?1|第一项|(合规?率|出勤率|准确率)/.test(key)) {
        d.labelRate1 = key;
        d.rate1 = this.safeFloat(val);
      }
    }
    return d;
  }

  private parseInputToMatrix(input: SanlvReportPreviewInput): SanlvReportImportResult {
    const sourceName = (input as any).sourceName || (input as any).fileName || '';
    try {
      if (input.fileContent) {
        const buf = Buffer.from(input.fileContent, 'base64');
        const wb = XLSX.read(buf, { type: 'buffer' });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          return { headers: [], matrix: [], totalRows: 0, sourceName, error: 'Excel 内没有可用的工作表' };
        }
        const ws = wb.Sheets[firstSheet];
        const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        const cleaned = matrix.filter(r => r.some(c => String(c ?? '').trim() !== ''));
        return {
          headers: cleaned[0] || [],
          matrix: cleaned,
          totalRows: Math.max(0, cleaned.length - 1),
          sourceName,
          sheetName: firstSheet,
        };
      }
      if (input.text) {
        const text = input.text;
        const sep = this.guessSeparator(text);
        const lines = text.split(/\r?\n/).map(l => l.replace(/\uFEFF/g, ''));
        const nonEmptyLines = lines.filter(l => l.trim() !== '');
        const matrix: any[][] = [];
        for (const line of nonEmptyLines) {
          if (sep === '\t') matrix.push(line.split('\t'));
          else matrix.push(this.splitCsvLine(line, sep));
        }
        return {
          headers: matrix[0] || [],
          matrix,
          totalRows: Math.max(0, matrix.length - 1),
          sourceName: sourceName || '粘贴文本.csv',
        };
      }
      return { headers: [], matrix: [], totalRows: 0, sourceName, error: '未提供 fileContent 或 text 数据' };
    } catch (e: any) {
      return {
        headers: [], matrix: [], totalRows: 0, sourceName,
        error: `解析失败: ${e?.message || String(e)}`,
      };
    }
  }

  private guessSeparator(text: string): string {
    if (text.includes('\t')) return '\t';
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const countCsv = (firstLine.match(/,/g) || []).length;
    const countPivot = (firstLine.match(/;/g) || []).length;
    return countPivot > countCsv ? ';' : ',';
  }

  private splitCsvLine(line: string, sep: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === sep) { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  private safeFloat(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const f = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(f) ? null : f;
  }
}
