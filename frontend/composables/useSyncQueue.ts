import { ref, computed } from 'vue';
import { indexedDBManager } from './useIndexedDB';
import { createModuleLogger } from './useDebugLogger';
import { smartMerge } from './useConflictMerger';
import { useMultiDeviceSync } from './useMultiDeviceSync';
import { useVersionCompatibility } from './useVersionCompatibility';

const logger = createModuleLogger('SyncQueue');
export type SyncOperation = 'create' | 'update' | 'delete';
export type ConflictResolutionStrategy = 'server-first' | 'client-first' | 'manual';

export interface SyncQueueItem {
  id: string;
  storeName: string;
  operation: SyncOperation;
  recordId: any;
  data?: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
  errorMsg?: string;
  priority?: number;
}

export interface ConflictRecord {
  id: string;
  storeName: string;
  recordId: any;
  localData: any;
  serverData: any;
  localUpdatedAt: string;
  serverUpdatedAt: string;
  timestamp: number;
  resolved: boolean;
  resolution?: 'server' | 'client' | 'merged';
}

const QUEUE_STORE = 'syncQueue';
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000;

const ENDPOINT_MAP: Record<string, string> = {
  schedules: '/schedules',
  diaries: '/diaries',
  ships: '/ships',
  staffHistory: '/staff-history',
  sopFlow: '/sop-flow',
  publicCase: '/public-case',
  partyActivities: '/party-activities',
  integrityRecords: '/integrity-records',
  officerProfiles: '/officer-profiles',
  thoughtReports: '/thought-reports',
  experiences: '/experiences',
  standardTaskTemplates: '/standard-task-templates',
  publishTemplates: '/publish-templates',
  tasks: '/tasks',
  shipTasks: '/ship-tasks',
  dictCategories: '/dict/categories',
  healthReports: '/health-reports',
  fileRecords: '/files',
};

function getEndpoint(storeName: string): string {
  return ENDPOINT_MAP[storeName] || `/${storeName}`;
}

class SyncQueueManager {
  private initialized = false;
  private processing = false;
  private timer: any = null;
  private conflictStrategy: ConflictResolutionStrategy = 'client-first';

  public queue = ref<SyncQueueItem[]>([]);
  public isSyncing = ref(false);
  public lastSyncTime = ref(0);
  public pendingCount = ref(0);
  public failedCount = ref(0);
  public conflicts = ref<ConflictRecord[]>([]);

  async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      await indexedDBManager.init();
      this.initialized = true;
      await this.loadQueue();
      await this.loadConflicts();
      logger.info('同步队列初始化完成', { pending: this.pendingCount.value, conflicts: this.conflicts.value.length });
      return true;
    } catch (error: any) {
      logger.error('同步队列初始化失败', error);
      return false;
    }
  }

  private async loadQueue() {
    try {
      const items = await indexedDBManager.getAll<SyncQueueItem>(QUEUE_STORE);
      this.queue.value = items.sort((a, b) => {
        const priorityDiff = (b.priority || 0) - (a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });
      this.pendingCount.value = items.filter(i => i.status === 'pending').length;
      this.failedCount.value = items.filter(i => i.status === 'failed').length;
    } catch (error) {
      logger.error('加载同步队列失败', error);
    }
  }

  private async saveQueue() {
    try {
      this.pendingCount.value = this.queue.value.filter(i => i.status === 'pending').length;
      this.failedCount.value = this.queue.value.filter(i => i.status === 'failed').length;

      // 按优先级排序（高优先级在前，同优先级按时间先后）
      this.queue.value.sort((a, b) => {
        const priorityDiff = (b.priority || 0) - (a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      await indexedDBManager.clear(QUEUE_STORE);
      for (const item of this.queue.value) {
        // 安全序列化：移除不可结构化克隆的字段，避免 fake-indexeddb/structuredClone 报错
        const safeItem = JSON.parse(JSON.stringify(item));
        await indexedDBManager.put(QUEUE_STORE, safeItem);
      }
    } catch (error) {
      logger.error('保存同步队列失败', error);
    }
  }

  async setConflictStrategy(strategy: ConflictResolutionStrategy): Promise<void> {
    this.conflictStrategy = strategy;
    logger.info(`冲突处理策略已设置为: ${strategy}`);
  }

  async loadConflicts(): Promise<void> {
    try {
      const conflictRecords = await indexedDBManager.getAll<ConflictRecord>('conflicts');
      this.conflicts.value = conflictRecords.filter(c => !c.resolved);
      logger.info(`已加载 ${this.conflicts.value.length} 个未解决冲突`);
    } catch (error) {
      logger.error('加载冲突记录失败', error);
    }
  }

  async saveConflict(conflict: Omit<ConflictRecord, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const conflictId = `${conflict.storeName}_${conflict.recordId}_${Date.now()}`;
    const record: ConflictRecord = {
      ...conflict,
      id: conflictId,
      timestamp: Date.now(),
      resolved: false,
    };
    await indexedDBManager.put('conflicts', record);
    this.conflicts.value.push(record);
    logger.warn(`冲突已保存: ${conflict.storeName}/${conflict.recordId}`);
    return conflictId;
  }

  async resolveConflict(conflictId: string, choice: 'server' | 'client'): Promise<{ success: boolean; data?: any }> {
    const conflict = this.conflicts.value.find(c => c.id === conflictId);
    if (!conflict) {
      return { success: false };
    }

    try {
      const chosenData = choice === 'server' ? conflict.serverData : conflict.localData;
      // 深拷贝为纯对象，避免 Vue Proxy 导致 structuredClone / fake-indexeddb 报错
      const safeData = JSON.parse(JSON.stringify(chosenData));
      await indexedDBManager.put(conflict.storeName, safeData);

      const safeConflict = JSON.parse(JSON.stringify(conflict));
      safeConflict.resolved = true;
      safeConflict.resolution = choice;
      await indexedDBManager.put('conflicts', safeConflict);

      this.conflicts.value = this.conflicts.value.filter(c => c.id !== conflictId);

      logger.info(`冲突已解决 (${choice}): ${conflict.storeName}/${conflict.recordId}`);
      return { success: true, data: chosenData };
    } catch (error) {
      logger.error(`冲突解决失败: ${conflictId}`, error);
      return { success: false };
    }
  }

  async resolveAllConflicts(choice: 'server' | 'client'): Promise<{ resolved: number; failed: number }> {
    let resolved = 0;
    let failed = 0;

    for (const conflict of [...this.conflicts.value]) {
      const result = await this.resolveConflict(conflict.id, choice);
      if (result.success) {
        resolved++;
      } else {
        failed++;
      }
    }

    logger.info(`批量解决冲突完成: ${resolved} 成功, ${failed} 失败`);
    return { resolved, failed };
  }

  async enqueue(
    storeName: string,
    operation: SyncOperation,
    recordId: any,
    data?: any
  ): Promise<string> {
    await this.ensureInitialized();

    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      storeName,
      operation,
      recordId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.value.push(item);
    await this.saveQueue();

    logger.debug(`入队: ${operation} ${storeName}/${recordId}`, { id: item.id });

    if (navigator.onLine && !this.processing) {
      this.processQueue();
    }

    return item.id;
  }

  /**
   * 压缩同步队列：合并对同一记录的冗余操作，减少网络请求
   * 规则：
   * - create + update → create（数据合并）
   * - update + update → 最后一次 update
   * - update + delete → delete
   * - create + delete → 移除（无意义）
   * - delete + create → create（视为替换）
   */
  compressQueue(): { removed: number; merged: number } {
    const items = this.queue.value.filter(i => i.status === 'pending' || i.status === 'failed');
    if (items.length === 0) return { removed: 0, merged: 0 };

    // 按 storeName + recordId 分组
    const groups = new Map<string, SyncQueueItem[]>();
    for (const item of items) {
      const key = `${item.storeName}:${item.recordId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    let removed = 0;
    let merged = 0;
    const toRemove = new Set<string>();

    for (const [, group] of groups) {
      if (group.length <= 1) continue;
      // 按时间排序
      group.sort((a, b) => a.timestamp - b.timestamp);

      const ops = group.map(g => g.operation);
      const first = group[0];
      const last = group[group.length - 1];

      // create + ... + delete → 全部移除
      if (first.operation === 'create' && last.operation === 'delete') {
        group.forEach(g => toRemove.add(g.id));
        removed += group.length;
        continue;
      }

      // create + ... + update → 保留 create，数据合并为最后一次 update
      if (first.operation === 'create' && last.operation === 'update') {
        first.data = { ...first.data, ...last.data };
        for (let i = 1; i < group.length; i++) {
          toRemove.add(group[i].id);
        }
        merged += group.length - 1;
        continue;
      }

      // update + ... + update → 保留最后一次
      if (ops.every(o => o === 'update')) {
        last.data = group.reduce((acc, g) => ({ ...acc, ...g.data }), {});
        for (let i = 0; i < group.length - 1; i++) {
          toRemove.add(group[i].id);
        }
        merged += group.length - 1;
        continue;
      }

      // update + ... + delete → 保留 delete
      if (first.operation === 'update' && last.operation === 'delete') {
        for (let i = 0; i < group.length - 1; i++) {
          toRemove.add(group[i].id);
        }
        merged += group.length - 1;
        continue;
      }

      // delete + create → 保留 create（替换）
      if (first.operation === 'delete' && last.operation === 'create') {
        for (let i = 0; i < group.length - 1; i++) {
          toRemove.add(group[i].id);
        }
        merged += group.length - 1;
        continue;
      }
    }

    if (toRemove.size > 0) {
      this.queue.value = this.queue.value.filter(i => !toRemove.has(i.id));
      this.saveQueue();
      logger.info(`队列压缩完成: 移除 ${removed} 项, 合并 ${merged} 项`);
    }

    return { removed, merged };
  }

  async processQueue(): Promise<void> {
    if (this.processing || !navigator.onLine) return;

    await this.ensureInitialized();

    // 压缩队列，减少冗余操作
    this.compressQueue();

    const pendingItems = this.queue.value.filter(i => i.status === 'pending' || i.status === 'failed');
    if (pendingItems.length === 0) return;

    this.processing = true;
    this.isSyncing.value = true;

    logger.info(`开始处理同步队列，共 ${pendingItems.length} 项`);

    try {
      const { useApi } = await import('./useApi');
      const api = useApi();

      for (const item of pendingItems) {
        if (!navigator.onLine) break;

        item.status = 'processing';

        try {
          const syncResult = await this.executeSyncItem(api, item);
          item.status = 'pending';
          this.queue.value = this.queue.value.filter(i => i.id !== item.id);

          if (syncResult) {
            try {
              if (item.operation === 'create') {
                await indexedDBManager.delete(item.storeName, item.recordId);
                await indexedDBManager.put(item.storeName, syncResult);
              } else if (item.operation === 'update') {
                await indexedDBManager.put(item.storeName, syncResult);
              }

              const integrity = await indexedDBManager.validateStoreIntegrity(item.storeName);
              if (!integrity.valid) {
                logger.warn(`同步后数据完整性校验失败: ${item.storeName} 损坏 ${integrity.corruptedCount}/${integrity.totalCount}`);
              }
            } catch (e) {
              logger.warn(`同步后更新本地数据失败`, e);
            }
          }

          logger.debug(`同步成功: ${item.operation} ${item.storeName}/${item.recordId}`);
        } catch (error: any) {
          item.retryCount++;
          item.errorMsg = error.message;

          if (item.retryCount >= MAX_RETRIES) {
            item.status = 'failed';
            logger.error(`同步失败（已达最大重试次数）: ${item.operation} ${item.storeName}/${item.recordId}`, error);
          } else {
            item.status = 'pending';
            logger.warn(`同步失败，将重试（${item.retryCount}/${MAX_RETRIES}）: ${item.operation} ${item.storeName}/${item.recordId}`, error);
          }
        }

        await this.saveQueue();
      }

      this.lastSyncTime.value = Date.now();
      logger.info('同步队列处理完成', { remaining: this.pendingCount.value });
    } catch (error) {
      logger.error('同步队列处理异常', error);
    } finally {
      this.processing = false;
      this.isSyncing.value = false;

      // 记录多端同步状态
      try {
        const multiDeviceSync = useMultiDeviceSync();
        const failed = this.failedCount.value;
        const pending = this.pendingCount.value;
        const success = failed === 0 && pending === 0;
        multiDeviceSync.recordSync(success, [], {
          syncCount: pendingItems.length,
          failCount: failed,
        });
      } catch {
        // 忽略多端同步记录错误，不影响主流程
      }
    }
  }

  async validateAllDataIntegrity(): Promise<Record<string, { valid: boolean; corruptedCount: number; totalCount: number }>> {
    logger.info('开始全量数据完整性校验');
    const results = await indexedDBManager.validateAllStores();
    const corruptedStores = Object.entries(results).filter(([, v]) => !v.valid);
    if (corruptedStores.length > 0) {
      logger.warn(`数据完整性校验发现 ${corruptedStores.length} 个表损坏`, corruptedStores);
    } else {
      logger.info('数据完整性校验通过');
    }
    return results;
  }

  private async executeSyncItem(api: any, item: SyncQueueItem): Promise<any> {
    const baseEndpoint = getEndpoint(item.storeName);

    try {
      // 版本兼容性处理：上传前适配数据
      let adaptedData = item.data;
      if (item.data && (item.operation === 'create' || item.operation === 'update')) {
        const versionCompat = useVersionCompatibility();
        const checkResult = await versionCompat.checkVersionCompatibility();
        
        if (!checkResult.compatible) {
          logger.warn(`版本不兼容，尝试适配数据后上传`, {
            serverVersion: checkResult.serverVersion,
            localVersion: checkResult.localVersion,
            breakingChanges: checkResult.breakingChanges,
          });
        }

        if (checkResult.needsMigration) {
          logger.info(`需要对数据进行迁移适配`, checkResult.migrationRequired);
        }

        adaptedData = await versionCompat.adaptDataForUpload(item.data, item.storeName);
      }

      switch (item.operation) {
        case 'create':
          return await api.apiFetch(baseEndpoint, {
            method: 'POST',
            body: adaptedData,
          });

        case 'update':
          return await api.apiFetch(`${baseEndpoint}/${item.recordId}`, {
            method: 'PUT',
            body: adaptedData,
          });

        case 'delete':
          return await api.apiFetch(`${baseEndpoint}/${item.recordId}`, {
            method: 'DELETE',
          });

        default:
          throw new Error(`未知操作类型: ${item.operation}`);
      }
    } catch (error: any) {
      if (error.statusCode === 409 || error.message?.includes('conflict') || error.message?.includes('Conflict')) {
        logger.warn(`检测到冲突，采用${this.conflictStrategy}策略: ${item.operation} ${item.storeName}/${item.recordId}`);
        return this.handleConflict(api, item, error);
      }
      throw error;
    }
  }

  private async handleConflict(api: any, item: SyncQueueItem, error: any): Promise<any> {
    const baseEndpoint = getEndpoint(item.storeName);

    switch (this.conflictStrategy) {
      case 'server-first':
        logger.info(`冲突处理(服务器优先): 放弃本地修改 ${item.storeName}/${item.recordId}`);
        try {
          const serverData = await api.apiFetch(`${baseEndpoint}/${item.recordId}`, { method: 'GET' });
          await indexedDBManager.put(item.storeName, serverData);
          this.queue.value = this.queue.value.filter(i => i.id !== item.id);
          return serverData;
        } catch (e) {
          logger.error('获取服务器数据失败', e);
          throw error;
        }

      case 'client-first':
        logger.info(`冲突处理(本地优先): 强制覆盖服务器数据 ${item.storeName}/${item.recordId}`);
        switch (item.operation) {
          case 'create':
            return await api.apiFetch(baseEndpoint, {
              method: 'POST',
              body: { ...item.data, force: true },
            });
          case 'update':
            return await api.apiFetch(`${baseEndpoint}/${item.recordId}?force=true`, {
              method: 'PUT',
              body: item.data,
            });
          case 'delete':
            return await api.apiFetch(`${baseEndpoint}/${item.recordId}?force=true`, {
              method: 'DELETE',
            });
          default:
            throw error;
        }

      case 'manual':
        logger.info(`冲突处理(智能合并): 尝试自动合并 ${item.storeName}/${item.recordId}`);
        try {
          const serverData = await api.apiFetch(`${baseEndpoint}/${item.recordId}`, { method: 'GET' });
          const localData = await indexedDBManager.get(item.storeName, item.recordId);

          // 先尝试字段级自动合并
          const mergeResult = smartMerge(
            localData || item.data,
            serverData,
            localData || item.data, // 本地基线
            serverData // 服务器基线（简化处理）
          );

          if (mergeResult.success && mergeResult.data) {
            // 自动合并成功，应用合并结果
            logger.info(`字段级自动合并成功: ${item.storeName}/${item.recordId}`, {
              mergedFields: mergeResult.mergedFields,
              clientOnlyFields: mergeResult.clientOnlyFields,
              serverOnlyFields: mergeResult.serverOnlyFields,
            });

            // 将合并结果更新到服务器
            const mergedData = await api.apiFetch(`${baseEndpoint}/${item.recordId}`, {
              method: 'PUT',
              body: mergeResult.data,
            });

            // 更新本地数据
            await indexedDBManager.put(item.storeName, mergedData);
            this.queue.value = this.queue.value.filter(i => i.id !== item.id);
            return mergedData;
          }

          // 自动合并失败，保存冲突记录等待手动解决
          logger.warn(`字段级自动合并失败，存在 ${mergeResult.conflicts?.length || 0} 个字段冲突，转入手动解决`);

          await this.saveConflict({
            storeName: item.storeName,
            recordId: item.recordId,
            localData: localData || item.data,
            serverData,
            localUpdatedAt: (localData || item.data)?.updatedAt || '',
            serverUpdatedAt: serverData?.updatedAt || '',
          });

          this.queue.value = this.queue.value.filter(i => i.id !== item.id);
          return null;
        } catch (e) {
          logger.error('冲突处理失败', e);
          throw error;
        }

      default:
        throw error;
    }
  }

  async retryAllFailed(): Promise<void> {
    const failedItems = this.queue.value.filter(i => i.status === 'failed');
    if (failedItems.length === 0) return;

    logger.info(`重试 ${failedItems.length} 个失败项`);

    for (const item of failedItems) {
      item.status = 'pending';
      item.retryCount = 0;
      item.errorMsg = undefined;
    }

    await this.saveQueue();

    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async clearQueue(): Promise<void> {
    this.queue.value = [];
    await this.saveQueue();
    logger.info('同步队列已清空');
  }

  async removeItem(id: string): Promise<void> {
    this.queue.value = this.queue.value.filter(i => i.id !== id);
    await this.saveQueue();
  }

  startAutoSync(intervalMs: number = 30000) {
    this.stopAutoSync();

    this.timer = setInterval(() => {
      if (navigator.onLine && this.pendingCount.value > 0) {
        this.processQueue();
      }
    }, intervalMs);

    logger.debug(`自动同步已启动，间隔 ${intervalMs}ms`);
  }

  stopAutoSync() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.debug('自动同步已停止');
    }
  }

  setupNetworkListeners() {
    if (process.server) return;

    window.addEventListener('online', () => {
      logger.info('网络恢复，触发同步');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      logger.warn('网络断开，暂停同步');
      this.processing = false;
      this.isSyncing.value = false;
    });
  }

  get hasPending() {
    return computed(() => this.pendingCount.value > 0);
  }

  get hasFailed() {
    return computed(() => this.failedCount.value > 0);
  }

  get failedItems() {
    return computed(() => this.queue.value.filter(i => i.status === 'failed'));
  }

  get pendingItems() {
    return computed(() => this.queue.value.filter(i => i.status === 'pending' || i.status === 'processing'));
  }

  // ===== 便捷业务方法 =====

  async addItem(storeName: string, operation: SyncOperation, data: any, priority = 0): Promise<SyncQueueItem> {
    const recordId = data?.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const id = await this.enqueue(storeName, operation, recordId, data);
    const item = this.queue.value.find(i => i.id === id);
    if (item && priority) {
      item.priority = priority;
      await this.saveQueue();
    }
    return item!;
  }

  getPendingItems(): SyncQueueItem[] {
    return this.pendingItems.value;
  }

  async updateItemStatus(id: string, status: SyncQueueItem['status']): Promise<void> {
    const item = this.queue.value.find(i => i.id === id);
    if (item) {
      item.status = status;
      await this.saveQueue();
    }
  }

  async markItemFailed(id: string, error: Error, immediate = true): Promise<void> {
    const item = this.queue.value.find(i => i.id === id);
    if (item) {
      item.retryCount = (item.retryCount || 0) + 1;
      item.errorMsg = error.message;
      // immediate=true 时直接标记为 failed（用于手动标记/测试）；否则按重试次数判断
      item.status = immediate || item.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
      await this.saveQueue();
    }
  }
}

let queueInstance: SyncQueueManager | null = null;

export function useSyncQueue() {
  if (!queueInstance) {
    queueInstance = new SyncQueueManager();
    if (process.client) {
      queueInstance.setupNetworkListeners();
      queueInstance.startAutoSync();
    }
  }
  return queueInstance;
}
