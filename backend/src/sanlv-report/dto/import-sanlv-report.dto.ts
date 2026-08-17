export interface SanlvReportImportResult {
  headers: string[];
  matrix: any[][];
  totalRows: number;
  sourceName?: string;
  sheetName?: string;
  error?: string;
  // 自动识别到的候选字段（仅供表单回显，用户可以改）
  detected?: {
    shipName?: string;
    reportMonth?: string;  // YYYY-MM
    reportYear?: number;
    totalScore?: number;
    passScore?: number;
    labelRate1?: string;
    rate1?: number;
    labelRate2?: string;
    rate2?: number;
    labelRate3?: string;
    rate3?: number;
    ruleId?: number;
  };
}

export interface SanlvReportPreviewInput {
  fileContent?: string;     // base64
  fileName?: string;
  text?: string;            // CSV/TSV 粘贴
  sourceName?: string;
}

export class ImportSanlvReportDto implements SanlvReportPreviewInput {
  fileContent?: string;
  fileName?: string;
  text?: string;
  sourceName?: string;
  sourceType?: 'excel' | 'csv' | 'paste';

  // ===== 用户在前端填 / 自动识别的 =====
  shipName!: string;        // 必填（未识别到时前端表单要提示用户手填）
  reportMonth!: string;     // YYYY-MM，必填
  reportYear?: number;
  ruleId?: number;          // 关联 SanlvRule 评分规则（将来分析用），可选

  totalScore?: number;
  passScore?: number;
  labelRate1?: string;
  threeRate1?: number;
  labelRate2?: string;
  threeRate2?: number;
  labelRate3?: string;
  threeRate3?: number;
}
