import { ref, computed } from 'vue';
import { indexedDBManager } from './useIndexedDB';
import { createModuleLogger } from './useDebugLogger';
import { useVersionCompatibility } from './useVersionCompatibility';

const logger = createModuleLogger('OfflineData');

export interface DownloadStep {
  key: string;
  label: string;
  storeName: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  count: number;
  errorMsg?: string;
}

export interface OfflineDataStats {
  totalRecords: number;
  lastSyncTime: number;
  storeCounts: Record<string, number>;
}

class OfflineDataManager {
  private initialized = false;
  private dbReady = false;

  public isDownloading = ref(false);
  public downloadProgress = ref(0);
  public currentStep = ref('');
  public downloadSteps = ref<DownloadStep[]>([]);
  public downloadError = ref('');
  public lastSyncTime = ref(0);

  private stepConfig: Array<{ key: string; label: string; storeName: string; dataKey: string }> = [
    { key: 'ships', label: '船舶资料', storeName: 'ships', dataKey: 'ships' },
    { key: 'schedules', label: '日程记录', storeName: 'schedules', dataKey: 'schedules' },
    { key: 'diaries', label: '政委日记', storeName: 'diaries', dataKey: 'diaries' },
    { key: 'staffHistory', label: '人员履历', storeName: 'staffHistory', dataKey: 'staffHistory' },
    { key: 'sopFlow', label: 'SOP流程', storeName: 'sopFlow', dataKey: 'sopFlow' },
    { key: 'publicCase', label: '案例库', storeName: 'publicCase', dataKey: 'publicCase' },
    { key: 'dict', label: '字典数据', storeName: 'dictCategories', dataKey: 'dict' },
    { key: 'standardTaskTemplates', label: '标准任务库', storeName: 'standardTaskTemplates', dataKey: 'standardTaskTemplates' },
    { key: 'publishTemplates', label: '发布模板', storeName: 'publishTemplates', dataKey: 'publishTemplates' },
    { key: 'partyActivities', label: '党建活动', storeName: 'partyActivities', dataKey: 'partyActivities' },
    { key: 'integrityRecords', label: '廉洁监督', storeName: 'integrityRecords', dataKey: 'integrityRecords' },
    { key: 'officerProfiles', label: '政委档案', storeName: 'officerProfiles', dataKey: 'officerProfiles' },
    { key: 'thoughtReports', label: '思想汇报', storeName: 'thoughtReports', dataKey: 'thoughtReports' },
    { key: 'experiences', label: '经验分享', storeName: 'experiences', dataKey: 'experiences' },
  ];

  constructor() {
    this.initSteps();
  }

  private initSteps() {
    this.downloadSteps.value = this.stepConfig.map(s => ({
      key: s.key,
      label: s.label,
      storeName: s.storeName,
      status: 'pending' as const,
      count: 0,
    }));
  }

  async ensureInitialized(): Promise<boolean> {
    if (this.initialized && this.dbReady) return true;

    try {
      logger.info('初始化 IndexedDB...');
      await indexedDBManager.init();
      this.dbReady = true;
      this.initialized = true;
      logger.info('IndexedDB 初始化成功');

      const state = await indexedDBManager.getSyncState();
      this.lastSyncTime.value = state.lastSyncTime || 0;

      return true;
    } catch (error: any) {
      logger.error('IndexedDB 初始化失败', error);
      return false;
    }
  }

  async downloadAllData(): Promise<boolean> {
    if (this.isDownloading.value) {
      logger.warn('已有下载任务进行中，跳过');
      return false;
    }

    const ok = await this.ensureInitialized();
    if (!ok) {
      this.downloadError.value = '本地数据库初始化失败';
      logger.error('下载失败：本地数据库初始化失败');
      return false;
    }

    this.isDownloading.value = true;
    this.downloadError.value = '';
    this.downloadProgress.value = 0;
    this.initSteps();

    const api = useApi();

    try {
      logger.info('开始下载全量数据...');
      this.currentStep.value = '正在从服务器获取数据...';

      const result: any = await api.apiFetch('/sync/full-download', {
        method: 'POST',
      });

      if (!result || !result.success || !result.data) {
        throw new Error('服务器返回数据格式错误');
      }

      const data = result.data;
      const totalSteps = this.stepConfig.length;
      let completedSteps = 0;

      for (let i = 0; i < this.stepConfig.length; i++) {
        const step = this.stepConfig[i];
        const stepState = this.downloadSteps.value[i];

        this.currentStep.value = `正在保存 ${step.label}...`;
        stepState.status = 'loading';

        try {
          const items = data[step.dataKey] || [];
          logger.debug(`保存 ${step.label}`, { count: items.length });

          if (items.length > 0) {
            await indexedDBManager.putAll(step.storeName, items);
          }

          stepState.count = items.length;
          stepState.status = 'success';
          completedSteps++;
          this.downloadProgress.value = Math.round((completedSteps / totalSteps) * 100);
        } catch (stepError: any) {
          logger.error(`保存 ${step.label} 失败`, stepError);
          stepState.status = 'error';
          stepState.errorMsg = stepError.message;
        }
      }

      const syncTime = data.syncTime || Date.now();
      this.lastSyncTime.value = syncTime;
      await indexedDBManager.setSyncState({
        lastSyncTime: syncTime,
        syncQueue: [],
      });

      // 保存服务器版本信息
      const versionCompat = useVersionCompatibility();
      const serverVersion = data.version || 'unknown';
      const schemaInfo = data.schemaInfo || null;
      await versionCompat.saveServerVersion(serverVersion, schemaInfo);

      this.currentStep.value = '下载完成';
      logger.info('全量数据下载完成', { progress: this.downloadProgress.value + '%', version: serverVersion });

      const hasErrors = this.downloadSteps.value.some(s => s.status === 'error');
      if (hasErrors) {
        this.downloadError.value = '部分数据下载失败，详情请查看各步骤状态';
        logger.warn('部分数据下载失败');
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error('下载失败', error);
      this.downloadError.value = error.message || '下载失败';
      this.currentStep.value = '下载失败';
      return false;
    } finally {
      this.isDownloading.value = false;
    }
  }

  async getStats(): Promise<OfflineDataStats> {
    await this.ensureInitialized();

    const storeCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const step of this.stepConfig) {
      try {
        const items = await indexedDBManager.getAll(step.storeName);
        storeCounts[step.key] = items.length;
        totalRecords += items.length;
      } catch {
        storeCounts[step.key] = 0;
      }
    }

    return {
      totalRecords,
      lastSyncTime: this.lastSyncTime.value,
      storeCounts,
    };
  }

  async exportBackup(): Promise<Blob> {
    await this.ensureInitialized();

    const backup: Record<string, any[]> = {};
    for (const step of this.stepConfig) {
      try {
        backup[step.storeName] = await indexedDBManager.getAll(step.storeName);
      } catch {
        backup[step.storeName] = [];
      }
    }

    const backupData = {
      version: 1,
      exportTime: new Date().toISOString(),
      lastSyncTime: this.lastSyncTime.value,
      data: backup,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
  }

  async downloadIncrementalData(): Promise<boolean> {
    if (this.isDownloading.value) {
      logger.warn('已有下载任务进行中，跳过');
      return false;
    }

    const ok = await this.ensureInitialized();
    if (!ok) {
      this.downloadError.value = '本地数据库初始化失败';
      return false;
    }

    if (this.lastSyncTime.value === 0) {
      return this.downloadAllData();
    }

    this.isDownloading.value = true;
    this.downloadError.value = '';
    this.downloadProgress.value = 0;
    this.initSteps();

    const api = useApi();

    try {
      logger.info('开始增量同步...', { lastSyncTime: this.lastSyncTime.value });
      this.currentStep.value = '正在获取增量数据...';

      const result: any = await api.apiFetch('/sync/incremental', {
        method: 'POST',
        body: { lastSyncTime: this.lastSyncTime.value },
      });

      if (!result || !result.success || !result.data) {
        throw new Error('服务器返回数据格式错误');
      }

      const data = result.data;
      const totalSteps = this.stepConfig.length;
      let completedSteps = 0;
      let totalChanged = 0;

      for (let i = 0; i < this.stepConfig.length; i++) {
        const step = this.stepConfig[i];
        const stepState = this.downloadSteps.value[i];

        this.currentStep.value = `正在更新 ${step.label}...`;
        stepState.status = 'loading';

        try {
          const items = data[step.dataKey] || [];
          logger.debug(`更新 ${step.label}`, { count: items.length });

          if (items.length > 0) {
            for (const item of items) {
              await indexedDBManager.put(step.storeName, item);
            }
            totalChanged += items.length;
          }

          stepState.count = items.length;
          stepState.status = 'success';
          completedSteps++;
          this.downloadProgress.value = Math.round((completedSteps / totalSteps) * 100);
        } catch (stepError: any) {
          logger.error(`更新 ${step.label} 失败`, stepError);
          stepState.status = 'error';
          stepState.errorMsg = stepError.message;
        }
      }

      const syncTime = data.syncTime || Date.now();
      this.lastSyncTime.value = syncTime;
      await indexedDBManager.setSyncState({
        lastSyncTime: syncTime,
      });

      this.currentStep.value = `增量同步完成，共 ${totalChanged} 条变更`;
      logger.info('增量同步完成', { totalChanged });

      const hasErrors = this.downloadSteps.value.some(s => s.status === 'error');
      if (hasErrors) {
        this.downloadError.value = '部分数据同步失败，详情请查看各步骤状态';
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error('增量同步失败', error);
      this.downloadError.value = error.message || '同步失败';
      this.currentStep.value = '同步失败';
      return false;
    } finally {
      this.isDownloading.value = false;
    }
  }

  async importBackup(file: File): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || !backup.version) {
        throw new Error('备份文件格式不正确');
      }

      if (backup.version > 2) {
        throw new Error('备份文件版本过高，请升级应用后再导入');
      }

      logger.info('导入备份数据...', { version: backup.version });

      for (const step of this.stepConfig) {
        const items = backup.data[step.storeName];
        if (items && items.length > 0) {
          await indexedDBManager.putAll(step.storeName, items);
          logger.debug(`导入 ${step.label}`, { count: items.length });
        }
      }

      if (backup.lastSyncTime) {
        this.lastSyncTime.value = backup.lastSyncTime;
        await indexedDBManager.setSyncState({
          lastSyncTime: backup.lastSyncTime,
          syncQueue: [],
        });
      }

      logger.info('备份导入成功');
      return true;
    } catch (error: any) {
      logger.error('导入失败', error);
      return false;
    }
  }

  async clearAllData(): Promise<boolean> {
    await this.ensureInitialized();

    try {
      for (const step of this.stepConfig) {
        try {
          await indexedDBManager.clear(step.storeName);
        } catch {
        }
      }
      await indexedDBManager.setSyncState({ lastSyncTime: 0, syncQueue: [] });
      this.lastSyncTime.value = 0;
      this.initSteps();
      logger.info('本地数据已清空');
      return true;
    } catch (error: any) {
      logger.error('清空数据失败', error);
      return false;
    }
  }

  async clearStoreData(storeName: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      await indexedDBManager.clear(storeName);
      logger.debug(`已清空表: ${storeName}`);
      return true;
    } catch (error: any) {
      logger.error(`清空表失败: ${storeName}`, error);
      return false;
    }
  }

  async getData<T>(storeName: string): Promise<T[]> {
    await this.ensureInitialized();
    return indexedDBManager.getAll<T>(storeName);
  }

  async getDataById<T>(storeName: string, id: any): Promise<T | null> {
    await this.ensureInitialized();
    return indexedDBManager.get<T>(storeName, id);
  }

  async saveData(storeName: string, data: any): Promise<void> {
    await this.ensureInitialized();
    await indexedDBManager.put(storeName, data);
  }

  async deleteData(storeName: string, id: any): Promise<void> {
    await this.ensureInitialized();
    await indexedDBManager.delete(storeName, id);
  }

  get isOfflineAvailable() {
    return computed(() => this.lastSyncTime.value > 0);
  }

  get formattedLastSyncTime() {
    return computed(() => {
      if (!this.lastSyncTime.value) return '从未同步';
      return new Date(this.lastSyncTime.value).toLocaleString('zh-CN');
    });
  }
}

let instance: OfflineDataManager | null = null;

export function useOfflineData() {
  if (!instance) {
    instance = new OfflineDataManager();
  }
  return instance;
}
