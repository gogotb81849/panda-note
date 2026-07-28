import { Injectable } from '@nestjs/common';

export interface NamingRuleContext {
  shipName?: string;
  shipCode?: string;
  submitter?: string;
  date?: string;
  fileType?: string;
  taskName?: string;
  originalName?: string;
}

/**
 * 命名规则引擎
 * 支持变量：{shipName}, {shipCode}, {submitter}, {date}, {fileType}, {taskName}
 * 示例规则：{shipName}_{taskName}_{date}
 */
@Injectable()
export class NamingRuleService {
  /**
   * 根据命名规则和上下文生成文件名
   */
  generateFileName(rule: string, context: NamingRuleContext): string {
    let result = rule;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    result = result.replace(/{shipName}/g, context.shipName || '');
    result = result.replace(/{shipCode}/g, context.shipCode || '');
    result = result.replace(/{submitter}/g, context.submitter || '');
    result = result.replace(/{date}/g, context.date || dateStr);
    result = result.replace(/{fileType}/g, context.fileType || '');
    result = result.replace(/{taskName}/g, context.taskName || '');

    // 清理连续的下划线和横杠
    result = result.replace(/[_-]{2,}/g, '_').replace(/^[_-]+|[_-]+$/g, '');

    return result;
  }

  /**
   * 根据原始文件名生成重命名后的文件名（保留扩展名）
   */
  generateFileNameWithExt(rule: string, context: NamingRuleContext, originalName: string): string {
    const baseName = this.generateFileName(rule, context);
    const ext = this.getExtension(originalName);
    return ext ? `${baseName}.${ext}` : baseName;
  }

  /**
   * 获取文件扩展名
   */
  getExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * 获取可用的变量列表
   */
  getAvailableVariables(): { key: string; label: string; example: string }[] {
    return [
      { key: '{shipName}', label: '船舶名称', example: '新金洋' },
      { key: '{shipCode}', label: '船舶编号', example: '001' },
      { key: '{submitter}', label: '提交人', example: '张三' },
      { key: '{date}', label: '提交日期', example: '20260615' },
      { key: '{fileType}', label: '文件类型', example: 'pdf' },
      { key: '{taskName}', label: '任务名称', example: '月度报告' },
    ];
  }
}