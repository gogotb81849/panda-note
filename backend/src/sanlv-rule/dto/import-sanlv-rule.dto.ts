export interface SanlvRuleImportResult {
  headers: string[];
  matrix: any[][];
  totalRows: number;
  sourceName?: string;
  sheetName?: string;
  error?: string;
}

export interface SanlvRulePreviewInput {
  fileContent?: string;     // base64 编码的 .xlsx/.xls/.csv 内容
  fileName?: string;        // 文件名（含后缀）
  text?: string;            // CSV / TSV 粘贴文本
  sourceName?: string;      // 别名
}

export class ImportSanlvRuleDto implements SanlvRulePreviewInput {
  fileContent?: string;
  fileName?: string;
  text?: string;
  sourceName?: string;

  ruleName?: string;
  ruleVersion?: string;
  ruleYear?: number;
  ruleRemark?: string;
  isCurrent?: boolean;
  sourceType?: 'excel' | 'csv' | 'paste';
}
