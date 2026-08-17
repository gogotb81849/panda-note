import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';
import * as XLSX from 'xlsx';
import { ImportSanlvRuleDto, SanlvRuleImportResult, SanlvRulePreviewInput } from './dto/import-sanlv-rule.dto';

@Injectable()
export class SanlvRuleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- 列表 ----------
  async list(teamCode: TeamCode, limit = 20) {
    const items = await this.prisma.sanlvRule.findMany({
      where: { teamCode },
      orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        ruleName: true,
        ruleVersion: true,
        ruleYear: true,
        ruleRemark: true,
        isCurrent: true,
        sourceType: true,
        sourceName: true,
        items: true,
        createdAt: true,
        user: { select: { realName: true, username: true } },
      },
    });
    const total = await this.prisma.sanlvRule.count({ where: { teamCode } });
    return { items, total };
  }

  async findOne(id: number, teamCode: TeamCode) {
    return this.prisma.sanlvRule.findFirst({
      where: { id, teamCode },
      include: { user: { select: { realName: true } } },
    });
  }

  async remove(id: number, teamCode: TeamCode) {
    await this.prisma.sanlvRule.deleteMany({ where: { id, teamCode } });
    return { ok: true };
  }

  async setCurrent(id: number, teamCode: TeamCode) {
    await this.prisma.sanlvRule.updateMany({
      where: { teamCode, id: { not: id } },
      data: { isCurrent: false },
    });
    await this.prisma.sanlvRule.updateMany({
      where: { teamCode, id },
      data: { isCurrent: true },
    });
    return { ok: true };
  }

  // ---------- 导入前预览（不上传，先给前端显示看看解析对不对） ----------
  preview(input: SanlvRulePreviewInput): SanlvRuleImportResult {
    return this.parseInputToMatrix(input);
  }

  // ---------- 导入 + 入库 ----------
  async import(
    dto: ImportSanlvRuleDto,
    userId: number,
    teamCode: TeamCode,
  ): Promise<{ ok: boolean; ruleId: number; importSummary: SanlvRuleImportResult }> {
    const parsed = this.parseInputToMatrix(dto);
    if (!parsed.matrix || parsed.matrix.length === 0) {
      throw new Error('解析失败：未读取到任何数据，请检查文件或粘贴内容');
    }

    const headers = parsed.headers || parsed.matrix[0] || [];
    const dataRows = parsed.matrix.slice(1).filter((row: any[]) => row.some((c: any) => String(c ?? '').trim() !== ''));

    const itemObjs = dataRows.map((row: any[], rowIdx: number) => {
      const col: any = {};
      headers.forEach((h: string, hi: number) => {
        const key = String(h ?? `col_${hi}`).trim() || `col_${hi}`;
        col[key] = row[hi] ?? null;
      });
      return {
        _rowIdx: rowIdx + 2,
        columns: col,
        category: String(col['一级分类'] || col['分类'] || col['category'] || '').trim(),
        subCategory: String(col['二级分类'] || col['子分类'] || col['subCategory'] || col['sub_category'] || '').trim(),
        item: String(col['评分项目'] || col['项目'] || col['考核项目'] || col['item'] || '').trim() || `第${rowIdx + 1}行`,
        fullMark: this.safeFloat(col['满分'] || col['标准分'] || col['分值'] || col['fullMark']),
        passLine: this.safeFloat(col['合格分'] || col['及格分'] || col['合格线'] || col['passLine']),
        weight: this.safeFloat(col['权重'] || col['加权'] || col['weight']) || 1,
        deductRule: String(col['扣分规则'] || col['评分标准'] || col['说明'] || col['deductRule'] || '').trim(),
      };
    });

    const ruleYear =
      dto.ruleYear ??
      this.safeInt(dto.ruleYear || String(dto.ruleName || '').match(/20\d{2}/)?.[0] || new Date().getFullYear());

    const created = await this.prisma.sanlvRule.create({
      data: {
        teamCode,
        userId,
        ruleName:
          dto.ruleName?.trim() ||
          `三率评分规则-${ruleYear}年版 (导入 ${new Date().toLocaleDateString()})`,
        ruleVersion: dto.ruleVersion?.trim() || null,
        ruleYear,
        ruleRemark: dto.ruleRemark?.trim() || null,
        isCurrent: dto.isCurrent === false ? false : true,
        sourceType: dto.sourceType || (dto.fileContent ? 'excel' : 'paste'),
        sourceName: dto.sourceName || null,
        items: itemObjs as any,
        rawPreview: parsed.matrix.slice(0, 20) as any,
      },
    });

    // 若本次标记为"当前"，把同团队其他版本置为非当前
    if (created.isCurrent) {
      await this.prisma.sanlvRule.updateMany({
        where: { teamCode, id: { not: created.id } },
        data: { isCurrent: false },
      });
    }

    return {
      ok: true,
      ruleId: created.id,
      importSummary: {
        headers,
        matrix: parsed.matrix,
        totalRows: dataRows.length,
        sourceName: parsed.sourceName,
      },
    };
  }

  // ---------- 通用解析器：支持 fileContent(base64 xlsx/csv) / text(CSV/Tab/粘贴) ----------
  private parseInputToMatrix(input: SanlvRulePreviewInput): SanlvRuleImportResult {
    const sourceName = (input as any).sourceName || (input as any).fileName || '';
    try {
      // Case 1: base64 Excel (.xlsx/.xls/.csv二进制皆可)
      if (input.fileContent) {
        const buf = Buffer.from(input.fileContent, 'base64');
        const wb = XLSX.read(buf, { type: 'buffer' });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          return { headers: [], matrix: [], totalRows: 0, sourceName, error: 'Excel 内没有可用的工作表' };
        }
        const ws = wb.Sheets[firstSheet];
        const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        // 去掉全空行
        const cleaned = matrix.filter(r => r.some(c => String(c ?? '').trim() !== ''));
        return {
          headers: cleaned[0] || [],
          matrix: cleaned,
          totalRows: Math.max(0, cleaned.length - 1),
          sourceName,
          sheetName: firstSheet,
        };
      }

      // Case 2: 粘贴文本 / CSV 纯文本
      if (input.text) {
        const text = input.text;
        const sep = this.guessSeparator(text);
        const lines = text.split(/\r?\n/).map(l => l.replace(/\uFEFF/g, ''));
        const nonEmptyLines = lines.filter(l => l.trim() !== '');
        const matrix: any[][] = [];
        for (const line of nonEmptyLines) {
          if (sep === '\t') {
            matrix.push(line.split('\t'));
          } else {
            matrix.push(this.splitCsvLine(line, sep));
          }
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
        headers: [],
        matrix: [],
        totalRows: 0,
        sourceName,
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
    // 简易支持双引号包裹的逗号
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

  private safeInt(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(String(v).replace(/[^0-9\-]/g, ''), 10);
    return isNaN(n) ? null : n;
  }
}
