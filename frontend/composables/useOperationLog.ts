/**
 * 操作日志与版本历史
 * 记录每次数据修改操作，支持查看历史和回滚
 */

import { ref } from 'vue';
import { indexedDBManager } from './useIndexedDB';
import { createModuleLogger } from './useDebugLogger';

const logger = createModuleLogger('OperationLog');

export interface OperationLogEntry {
  id: string;
  timestamp: number;
  storeName: string;
  recordId: any;
  operation: 'create' | 'update' | 'delete';
  /** 操作前的数据快照 */
  beforeData?: any;
  /** 操作后的数据快照 */
  afterData?: any;
  /** 修改的字段列表 */
  changedFields?: string[];
  /** 操作来源 */
  source: 'user' | 'sync' | 'system';
  /** 用户ID */
  userId?: string;
  /** 操作描述 */
  description?: string;
}

const OPERATION_LOG_STORE = 'operationLogs';
const MAX_LOG_ENTRIES = 1000;

class OperationLogManager {
  private initialized = false;

  async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      await indexedDBManager.init();
      this.initialized = true;
      return true;
    } catch (error: any) {
      logger.error('操作日志初始化失败', error);
      return false;
    }
  }

  /**
   * 记录操作日志
   */
  async logOperation(entry: Omit<OperationLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const ok = await this.ensureInitialized();
    if (!ok) return;

    try {
      const logEntry: OperationLogEntry = {
        ...entry,
        id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
      };

      await indexedDBManager.put(OPERATION_LOG_STORE, logEntry);

      // 清理旧日志
      await this.cleanupOldLogs();

      logger.debug('操作日志已记录', { operation: entry.operation, storeName: entry.storeName });
    } catch (error: any) {
      logger.error('记录操作日志失败', error);
    }
  }

  /**
   * 记录更新操作（自动计算变更字段）
   */
  async logUpdate(
    storeName: string,
    recordId: any,
    beforeData: any,
    afterData: any,
    source: 'user' | 'sync' | 'system' = 'user',
    userId?: string
  ): Promise<void> {
    const changedFields = this.getChangedFields(beforeData, afterData);

    await this.logOperation({
      storeName,
      recordId,
      operation: 'update',
      beforeData,
      afterData,
      changedFields,
      source,
      userId,
      description: `更新 ${storeName}/${recordId}，变更字段: ${changedFields.join(', ')}`,
    });
  }

  /**
   * 记录创建操作
   */
  async logCreate(
    storeName: string,
    recordId: any,
    afterData: any,
    source: 'user' | 'sync' | 'system' = 'user',
    userId?: string
  ): Promise<void> {
    await this.logOperation({
      storeName,
      recordId,
      operation: 'create',
      afterData,
      source,
      userId,
      description: `创建 ${storeName}/${recordId}`,
    });
  }

  /**
   * 记录删除操作
   */
  async logDelete(
    storeName: string,
    recordId: any,
    beforeData: any,
    source: 'user' | 'sync' | 'system' = 'user',
    userId?: string
  ): Promise<void> {
    await this.logOperation({
      storeName,
      recordId,
      operation: 'delete',
      beforeData,
      source,
      userId,
      description: `删除 ${storeName}/${recordId}`,
    });
  }

  /**
   * 获取记录的操作历史
   */
  async getRecordHistory(storeName: string, recordId: any): Promise<OperationLogEntry[]> {
    const ok = await this.ensureInitialized();
    if (!ok) return [];

    try {
      const allLogs = await indexedDBManager.getAll<OperationLogEntry>(OPERATION_LOG_STORE);
      return allLogs
        .filter(log => log.storeName === storeName && log.recordId === recordId)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error: any) {
      logger.error('获取操作历史失败', error);
      return [];
    }
  }

  /**
   * 获取最近的日志
   */
  async getRecentLogs(limit: number = 50): Promise<OperationLogEntry[]> {
    const ok = await this.ensureInitialized();
    if (!ok) return [];

    try {
      const allLogs = await indexedDBManager.getAll<OperationLogEntry>(OPERATION_LOG_STORE);
      return allLogs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error: any) {
      logger.error('获取最近日志失败', error);
      return [];
    }
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(logId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    const ok = await this.ensureInitialized();
    if (!ok) return { success: false, message: '操作日志未初始化' };

    try {
      // 获取目标日志
      const allLogs = await indexedDBManager.getAll<OperationLogEntry>(OPERATION_LOG_STORE);
      const targetLog = allLogs.find(log => log.id === logId);

      if (!targetLog) {
        return { success: false, message: '未找到指定版本' };
      }

      // 根据操作类型回滚
      switch (targetLog.operation) {
        case 'create':
          // 回滚创建 = 删除记录
          await indexedDBManager.delete(targetLog.storeName, targetLog.recordId);
          logger.info(`回滚创建操作: ${targetLog.storeName}/${targetLog.recordId}`);
          return { success: true, message: '已删除创建的记录' };

        case 'update':
          // 回滚更新 = 恢复到更新前的状态
          if (targetLog.beforeData) {
            await indexedDBManager.put(targetLog.storeName, targetLog.beforeData);
            logger.info(`回滚更新操作: ${targetLog.storeName}/${targetLog.recordId}`);
            return { success: true, data: targetLog.beforeData, message: '已恢复到更新前的状态' };
          }
          return { success: false, message: '缺少更新前的数据快照' };

        case 'delete':
          // 回滚删除 = 恢复记录
          if (targetLog.beforeData) {
            await indexedDBManager.put(targetLog.storeName, targetLog.beforeData);
            logger.info(`回滚删除操作: ${targetLog.storeName}/${targetLog.recordId}`);
            return { success: true, data: targetLog.beforeData, message: '已恢复删除的记录' };
          }
          return { success: false, message: '缺少删除前的数据快照' };

        default:
          return { success: false, message: '不支持的操作类型' };
      }
    } catch (error: any) {
      logger.error('回滚操作失败', error);
      return { success: false, message: `回滚失败: ${error.message}` };
    }
  }

  /**
   * 获取记录的当前版本与历史版本的差异
   */
  async getVersionDiff(storeName: string, recordId: any, logId: string): Promise<{ current: any; historical: any; changedFields: string[] } | null> {
    const ok = await this.ensureInitialized();
    if (!ok) return null;

    try {
      const current = await indexedDBManager.get(storeName, recordId);
      const allLogs = await indexedDBManager.getAll<OperationLogEntry>(OPERATION_LOG_STORE);
      const targetLog = allLogs.find(log => log.id === logId);

      if (!targetLog) return null;

      const historical = targetLog.afterData || targetLog.beforeData;
      const changedFields = this.getChangedFields(current, historical);

      return { current, historical, changedFields };
    } catch (error: any) {
      logger.error('获取版本差异失败', error);
      return null;
    }
  }

  /**
   * 清理旧日志
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const allLogs = await indexedDBManager.getAll<OperationLogEntry>(OPERATION_LOG_STORE);
      if (allLogs.length <= MAX_LOG_ENTRIES) return;

      // 按时间排序，删除最旧的
      const sorted = allLogs.sort((a, b) => a.timestamp - b.timestamp);
      const toDelete = sorted.slice(0, allLogs.length - MAX_LOG_ENTRIES);

      for (const log of toDelete) {
        await indexedDBManager.delete(OPERATION_LOG_STORE, log.id);
      }

      logger.debug(`清理了 ${toDelete.length} 条旧操作日志`);
    } catch (error: any) {
      logger.error('清理旧日志失败', error);
    }
  }

  /**
   * 计算变更字段
   */
  private getChangedFields(before: any, after: any): string[] {
    if (!before || !after) return [];

    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      // 忽略元数据字段
      if (key.startsWith('_') || key === 'updatedAt' || key === 'createdAt') continue;

      const beforeVal = before[key];
      const afterVal = after[key];

      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changed.push(key);
      }
    }

    return changed;
  }
}

let instance: OperationLogManager | null = null;

export function useOperationLog(): OperationLogManager {
  if (!instance) {
    instance = new OperationLogManager();
  }
  return instance;
}
