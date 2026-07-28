function generateChecksum(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'NavLogDB';
  private readonly dbVersion = 7;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('IndexedDB 打开失败'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        // 使用 upgrade transaction（versionchange），在 onupgradeneeded 中不能新建 readwrite 事务
        const upgradeTx = (event.target as IDBOpenDBRequest).transaction!;

        const stores = [
          { name: 'schedules', keyPath: 'id' },
          { name: 'ships', keyPath: 'id' },
          { name: 'staffHistory', keyPath: 'id' },
          { name: 'sopFlow', keyPath: 'id' },
          { name: 'publicCase', keyPath: 'id' },
          { name: 'dict', keyPath: 'id' },
          { name: 'syncQueue', keyPath: 'id', autoIncrement: true },
          { name: 'syncState', keyPath: 'key' },
          { name: 'conflicts', keyPath: 'id' },
          { name: 'diaries', keyPath: 'id' },
          { name: 'tasks', keyPath: 'id' },
          { name: 'taskResponses', keyPath: 'id' },
          { name: 'shipTasks', keyPath: 'id' },
          { name: 'standardTaskTemplates', keyPath: 'id' },
          { name: 'publishTemplates', keyPath: 'id' },
          { name: 'dictCategories', keyPath: 'id' },
          { name: 'partyActivities', keyPath: 'id' },
          { name: 'healthReports', keyPath: 'id' },
          { name: 'fileRecords', keyPath: 'id' },
          { name: 'integrityRecords', keyPath: 'id' },
          { name: 'officerProfiles', keyPath: 'id' },
          { name: 'thoughtReports', keyPath: 'id' },
          { name: 'experiences', keyPath: 'id' },
          { name: 'userProfile', keyPath: 'key' },
        ];

        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objStore = db.createObjectStore(store.name, { keyPath: store.keyPath, autoIncrement: store.autoIncrement });
            objStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        });

        // v2升级：为所有业务表添加_version索引
        if (oldVersion < 2) {
          const businessStores = ['schedules', 'ships', 'staffHistory', 'sopFlow', 'publicCase', 'dict'];
          businessStores.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
              const store = upgradeTx.objectStore(storeName);
              if (!store.indexNames.contains('_version')) {
                store.createIndex('_version', '_version', { unique: false });
              }
            }
          });
        }

        // v3升级：为新表和旧表统一添加_version索引
        if (oldVersion < 3) {
          const allBusinessStores = ['schedules', 'ships', 'staffHistory', 'sopFlow', 'publicCase', 'dict', 'diaries', 'tasks', 'taskResponses', 'shipTasks'];
          allBusinessStores.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
              const store = upgradeTx.objectStore(storeName);
              if (!store.indexNames.contains('_version')) {
                store.createIndex('_version', '_version', { unique: false });
              }
              if (!store.indexNames.contains('teamCode')) {
                store.createIndex('teamCode', 'teamCode', { unique: false });
              }
              if (!store.indexNames.contains('shipId')) {
                store.createIndex('shipId', 'shipId', { unique: false });
              }
            }
          });
        }

        // v4升级：为新增业务表添加_version/teamCode/shipId索引
        if (oldVersion < 4) {
          const v4Stores = [
            'standardTaskTemplates', 'publishTemplates', 'dictCategories',
            'partyActivities', 'healthReports', 'fileRecords',
            'integrityRecords', 'officerProfiles', 'thoughtReports', 'experiences'
          ];
          v4Stores.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
              const store = upgradeTx.objectStore(storeName);
              if (!store.indexNames.contains('_version')) {
                store.createIndex('_version', '_version', { unique: false });
              }
              if (!store.indexNames.contains('teamCode')) {
                store.createIndex('teamCode', 'teamCode', { unique: false });
              }
              if (!store.indexNames.contains('shipId')) {
                store.createIndex('shipId', 'shipId', { unique: false });
              }
            }
          });
        }

        // v5升级：添加数据完整性校验表和checksum索引
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('dataIntegrity')) {
            db.createObjectStore('dataIntegrity', { keyPath: 'storeName' });
          }
          const allBusinessStores = [
            'schedules', 'ships', 'staffHistory', 'sopFlow', 'publicCase', 'dict',
            'diaries', 'tasks', 'taskResponses', 'shipTasks', 'standardTaskTemplates',
            'publishTemplates', 'dictCategories', 'partyActivities', 'healthReports',
            'fileRecords', 'integrityRecords', 'officerProfiles', 'thoughtReports', 'experiences'
          ];
          allBusinessStores.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
              const store = upgradeTx.objectStore(storeName);
              if (!store.indexNames.contains('_checksum')) {
                store.createIndex('_checksum', '_checksum', { unique: false });
              }
            }
          });
        }

        // v6升级：添加调试日志存储表
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains('debugLogs')) {
            const logStore = db.createObjectStore('debugLogs', { keyPath: 'id' });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
            logStore.createIndex('level', 'level', { unique: false });
            logStore.createIndex('module', 'module', { unique: false });
            logStore.createIndex('traceId', 'traceId', { unique: false });
          }
        }

        // v7升级：添加操作日志和多端同步状态存储表
        if (oldVersion < 7) {
          if (!db.objectStoreNames.contains('operationLogs')) {
            const opStore = db.createObjectStore('operationLogs', { keyPath: 'id' });
            opStore.createIndex('timestamp', 'timestamp', { unique: false });
            opStore.createIndex('storeName', 'storeName', { unique: false });
            opStore.createIndex('recordId', 'recordId', { unique: false });
            opStore.createIndex('operation', 'operation', { unique: false });
          }
          if (!db.objectStoreNames.contains('deviceSyncInfo')) {
            const deviceStore = db.createObjectStore('deviceSyncInfo', { keyPath: 'deviceId' });
            deviceStore.createIndex('lastSyncAt', 'lastSyncAt', { unique: false });
            deviceStore.createIndex('isCurrentDevice', 'isCurrentDevice', { unique: false });
          }
        }

        // 记录版本迁移日志
        if (!db.objectStoreNames.contains('migrations')) {
          const migrationStore = db.createObjectStore('migrations', { keyPath: 'id' });
          migrationStore.createIndex('version', 'version', { unique: false });
          migrationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        const migrationStore = upgradeTx.objectStore('migrations');
        migrationStore.put({
          id: `mig_${Date.now()}`,
          version: this.dbVersion,
          oldVersion,
          timestamp: Date.now(),
          description: `升级从v${oldVersion}到v${this.dbVersion}`,
        });
      };
    });
  }

  async getMigrationHistory(): Promise<any[]> {
    return this.getAll('migrations');
  }

  async getCurrentVersion(): Promise<number> {
    return this.dbVersion;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(new Error(`获取 ${storeName} 失败`));
      };
    });
  }

  async get<T>(storeName: string, id: any): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as T || null);
      };

      request.onerror = () => {
        reject(new Error(`获取 ${storeName} 失败`));
      };
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const dataWithoutMeta = { ...data };
      delete dataWithoutMeta._checksum;
      delete dataWithoutMeta._version;
      delete dataWithoutMeta.updatedAt;
      delete dataWithoutMeta.createdAt;
      const checksum = generateChecksum(dataWithoutMeta);
      const request = store.put({
        ...data,
        _checksum: checksum,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`保存 ${storeName} 失败`));
      };
    });
  }

  async putAll<T>(storeName: string, data: T[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      data.forEach(item => {
        const dataWithoutMeta = { ...item };
        delete dataWithoutMeta._checksum;
        delete dataWithoutMeta._version;
        delete dataWithoutMeta.updatedAt;
        delete dataWithoutMeta.createdAt;
        const checksum = generateChecksum(dataWithoutMeta);
        store.put({
          ...item,
          _checksum: checksum,
          updatedAt: Date.now(),
        });
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`批量保存 ${storeName} 失败`));
      };
    });
  }

  async delete(storeName: string, id: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`删除 ${storeName} 失败`));
      };
    });
  }

  async clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`清空 ${storeName} 失败`));
      };
    });
  }

  async getSyncState(): Promise<any> {
    const state = await this.get('syncState', 'syncState');
    return state || {
      lastSyncTime: 0,
      syncQueue: [],
    };
  }

  async setSyncState(state: any): Promise<void> {
    await this.put('syncState', { key: 'syncState', ...state });
  }

  async addToSyncQueue(operation: any): Promise<void> {
    const state = await this.getSyncState();
    state.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
    });
    await this.setSyncState(state);
  }

  async clearSyncQueue(): Promise<void> {
    const state = await this.getSyncState();
    state.syncQueue = [];
    await this.setSyncState(state);
  }

  /**
   * 带版本控制的保存（用于冲突检测）
   */
  async putWithVersion<T extends Record<string, any>>(storeName: string, data: T): Promise<{ success: boolean; conflict?: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName, 'conflicts'], 'readwrite');
      const store = transaction.objectStore(storeName);
      const conflictStore = transaction.objectStore('conflicts');

      const getRequest = store.get(data.id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const newVersion = (existing?._version || 0) + 1;

        if (existing && existing._serverVersion !== undefined && data._serverVersion !== undefined) {
          if (existing._serverVersion > data._serverVersion) {
            const conflictId = `${storeName}_${data.id}_${Date.now()}`;
            conflictStore.put({
              id: conflictId,
              storeName,
              recordId: data.id,
              localData: existing,
              serverData: data,
              localUpdatedAt: existing.updatedAt ? new Date(existing.updatedAt).toISOString() : '',
              serverUpdatedAt: (data as any).updatedAt ? new Date((data as any).updatedAt).toISOString() : '',
              timestamp: Date.now(),
              resolved: false,
            });
            transaction.oncomplete = () => {
              resolve({ success: false, conflict: true });
            };
            return;
          }
        }

        const dataWithoutMeta = { ...data };
        delete dataWithoutMeta._checksum;
        delete dataWithoutMeta._version;
        delete dataWithoutMeta.updatedAt;
        delete dataWithoutMeta.createdAt;
        const checksum = generateChecksum(dataWithoutMeta);

        const saveData = {
          ...data,
          _version: newVersion,
          _checksum: checksum,
          updatedAt: Date.now(),
        };

        const putRequest = store.put(saveData);
        putRequest.onsuccess = () => {
          transaction.oncomplete = () => resolve({ success: true });
        };
        putRequest.onerror = () => reject(new Error(`保存 ${storeName} 失败`));
      };

      getRequest.onerror = () => {
        const dataWithoutMeta = { ...data };
        delete dataWithoutMeta._checksum;
        delete dataWithoutMeta._version;
        delete dataWithoutMeta.updatedAt;
        delete dataWithoutMeta.createdAt;
        const checksum = generateChecksum(dataWithoutMeta);

        const saveData = {
          ...data,
          _version: 1,
          _checksum: checksum,
          updatedAt: Date.now(),
        };

        const putRequest = store.put(saveData);
        putRequest.onsuccess = () => {
          transaction.oncomplete = () => resolve({ success: true });
        };
        putRequest.onerror = () => reject(new Error(`创建 ${storeName} 失败`));
      };
    });
  }

  /**
   * 获取所有冲突记录
   */
  async getConflicts(): Promise<any[]> {
    return this.getAll('conflicts');
  }

  /**
   * 解决冲突（选择本地或服务器版本）
   */
  async resolveConflict(conflictId: string, choice: 'local' | 'server'): Promise<{ success: boolean; data?: any }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['conflicts'], 'readonly');
      const conflictStore = transaction.objectStore('conflicts');
      const getRequest = conflictStore.get(conflictId);

      getRequest.onsuccess = () => {
        const conflict = getRequest.result;
        if (!conflict) {
          resolve({ success: false });
          return;
        }

        const { storeName, localData, serverData } = conflict;
        const chosenData = choice === 'local' ? localData : serverData;

        const writeTx = this.db!.transaction([storeName, 'conflicts'], 'readwrite');
        const store = writeTx.objectStore(storeName);
        const cStore = writeTx.objectStore('conflicts');

        store.put(chosenData);
        cStore.delete(conflictId);

        writeTx.oncomplete = () => resolve({ success: true, data: chosenData });
        writeTx.onerror = () => reject(new Error('解决冲突失败'));
      };

      getRequest.onerror = () => reject(new Error('获取冲突记录失败'));
    });
  }

  /**
   * 从服务器同步数据时应用版本比较
   */
  async syncFromServer<T extends Record<string, any>>(
    storeName: string,
    serverData: T[]
  ): Promise<{ applied: number; skipped: number }> {
    let applied = 0;
    let skipped = 0;

    for (const item of serverData) {
      const local = await this.get<T & { _serverVersion?: number }>(storeName, item.id);
      
      if (!local) {
        // 本地不存在，直接创建
        await this.put(storeName, { ...item, _serverVersion: item._version || 1 });
        applied++;
      } else {
        const localVersion = local._serverVersion || 0;
        const serverVersion = (item as any)._version || 0;
        
        if (serverVersion > localVersion) {
          // 服务器版本更新，应用更新
          await this.put(storeName, { ...item, _serverVersion: serverVersion });
          applied++;
        } else {
          // 本地版本更新或相同，跳过
          skipped++;
        }
      }
    }

    return { applied, skipped };
  }

  async validateStoreIntegrity(storeName: string): Promise<{ valid: boolean; corruptedCount: number; totalCount: number }> {
    const allItems = await this.getAll(storeName);
    let corruptedCount = 0;

    for (const item of allItems) {
      const dataWithoutMeta = { ...item };
      delete dataWithoutMeta._checksum;
      delete dataWithoutMeta._version;
      delete dataWithoutMeta.updatedAt;
      delete dataWithoutMeta.createdAt;
      const expectedChecksum = generateChecksum(dataWithoutMeta);
      if (item._checksum !== expectedChecksum) {
        corruptedCount++;
      }
    }

    return {
      valid: corruptedCount === 0,
      corruptedCount,
      totalCount: allItems.length,
    };
  }

  async validateAllStores(): Promise<Record<string, { valid: boolean; corruptedCount: number; totalCount: number }>> {
    const stores = [
      'schedules', 'ships', 'staffHistory', 'sopFlow', 'publicCase', 'dict',
      'diaries', 'tasks', 'taskResponses', 'shipTasks', 'standardTaskTemplates',
      'publishTemplates', 'dictCategories', 'partyActivities', 'healthReports',
      'fileRecords', 'integrityRecords', 'officerProfiles', 'thoughtReports', 'experiences'
    ];

    const results: Record<string, { valid: boolean; corruptedCount: number; totalCount: number }> = {};
    for (const store of stores) {
      try {
        results[store] = await this.validateStoreIntegrity(store);
      } catch {
        results[store] = { valid: false, corruptedCount: 0, totalCount: 0 };
      }
    }
    return results;
  }

  async rebuildChecksum(storeName: string): Promise<{ updated: number }> {
    const allItems = await this.getAll(storeName);
    let updated = 0;

    for (const item of allItems) {
      const dataWithoutMeta = { ...item };
      delete dataWithoutMeta._checksum;
      delete dataWithoutMeta._version;
      delete dataWithoutMeta.updatedAt;
      delete dataWithoutMeta.createdAt;
      const checksum = generateChecksum(dataWithoutMeta);
      if (item._checksum !== checksum) {
        await new Promise<void>((resolve, reject) => {
          if (!this.db) {
            reject(new Error('数据库未初始化'));
            return;
          }
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          store.put({ ...item, _checksum: checksum });
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(new Error('重建校验和失败'));
        });
        updated++;
      }
    }

    return { updated };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async getStoreCount(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`获取 ${storeName} 数量失败`));
    });
  }
}

export const indexedDBManager = new IndexedDBManager();
