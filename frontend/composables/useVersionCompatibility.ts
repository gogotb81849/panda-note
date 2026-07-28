/**
 * 版本兼容性管理
 * 处理离线期间服务器版本升级后的数据兼容问题
 * 
 * 行业主流方案：
 * 1. Schema Versioning - 每次API变更升级版本号
 * 2. Backward Compatibility - 后端接受旧版本数据，缺失字段用默认值
 * 3. Forward Compatibility - 后端忽略未知字段
 * 4. Graceful Degradation - 客户端处理缺失字段
 * 5. Version Negotiation - 重连时先协商版本
 */

import { ref } from 'vue';
import { indexedDBManager } from './useIndexedDB';
import { createModuleLogger } from './useDebugLogger';

const logger = createModuleLogger('VersionCompat');

const SCHEMA_VERSION_KEY = 'schemaVersion';
const CLIENT_VERSION_KEY = 'clientVersion';

export interface SchemaVersionInfo {
  version: string;
  buildTime: string;
  breakingChanges: string[];
  deprecatedFields: Record<string, string[]>;
  requiredFields: Record<string, string[]>;
  fieldMappings: Record<string, Record<string, string>>;
}

export interface VersionCheckResult {
  compatible: boolean;
  serverVersion: string;
  localVersion: string;
  breakingChanges: string[];
  needsMigration: boolean;
  migrationRequired: string[];
}

class VersionCompatibilityManager {
  private initialized = false;

  public serverVersion = ref('');
  public localVersion = ref('');
  public isChecking = ref(false);
  public lastCheckTime = ref(0);

  async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      await indexedDBManager.init();
      const syncState = await indexedDBManager.getSyncState();
      this.localVersion.value = syncState.schemaVersion || '';
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error('版本兼容性管理初始化失败', error);
      return false;
    }
  }

  /**
   * 保存下载时的服务器版本号
   */
  async saveServerVersion(version: string, schemaInfo?: SchemaVersionInfo): Promise<void> {
    await this.ensureInitialized();
    this.localVersion.value = version;
    
    const syncState = await indexedDBManager.getSyncState();
    syncState.schemaVersion = version;
    syncState.schemaInfo = schemaInfo;
    syncState.versionSavedAt = Date.now();
    await indexedDBManager.setSyncState(syncState);
    
    logger.info(`已保存服务器版本: ${version}`);
  }

  /**
   * 获取本地保存的版本信息
   */
  async getLocalVersionInfo(): Promise<{ version: string; savedAt: number; schemaInfo?: SchemaVersionInfo }> {
    await this.ensureInitialized();
    const syncState = await indexedDBManager.getSyncState();
    return {
      version: syncState.schemaVersion || '',
      savedAt: syncState.versionSavedAt || 0,
      schemaInfo: syncState.schemaInfo,
    };
  }

  /**
   * 检查服务器版本是否与本地兼容
   */
  async checkVersionCompatibility(): Promise<VersionCheckResult> {
    this.isChecking.value = true;
    
    try {
      const localInfo = await this.getLocalVersionInfo();
      
      if (!localInfo.version) {
        return {
          compatible: true,
          serverVersion: 'unknown',
          localVersion: '',
          breakingChanges: [],
          needsMigration: false,
          migrationRequired: [],
        };
      }

      // 调用服务器版本接口
      const config = useRuntimeConfig();
      const response = await fetch(`${config.public.apiBase}/version/schema`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      }).catch(() => null);

      if (!response || !response.ok) {
        logger.warn('无法获取服务器版本信息，假设兼容');
        return {
          compatible: true,
          serverVersion: 'unknown',
          localVersion: localInfo.version,
          breakingChanges: [],
          needsMigration: false,
          migrationRequired: [],
        };
      }

      const serverSchema: SchemaVersionInfo = await response.json();
      this.serverVersion.value = serverSchema.version;

      // 版本对比
      const comparison = this.compareVersions(localInfo.version, serverSchema.version);
      
      if (comparison === 0) {
        // 版本相同
        return {
          compatible: true,
          serverVersion: serverSchema.version,
          localVersion: localInfo.version,
          breakingChanges: [],
          needsMigration: false,
          migrationRequired: [],
        };
      }

      if (comparison > 0) {
        // 本地版本比服务器新（不应该发生）
        logger.warn(`本地版本(${localInfo.version})比服务器(${serverSchema.version})新`);
        return {
          compatible: false,
          serverVersion: serverSchema.version,
          localVersion: localInfo.version,
          breakingChanges: ['local_ahead'],
          needsMigration: true,
          migrationRequired: ['reinstall_required'],
        };
      }

      // 服务器版本更新，检查是否有破坏性变更
      const breakingChanges: string[] = [];
      const migrationRequired: string[] = [];

      // 检查是否有字段删除（破坏性变更）
      if (serverSchema.deprecatedFields) {
        for (const [entity, fields] of Object.entries(serverSchema.deprecatedFields)) {
          if (fields.length > 0) {
            breakingChanges.push(`${entity}: ${fields.join(', ')} 已废弃`);
          }
        }
      }

      // 检查是否有新必填字段
      if (serverSchema.requiredFields) {
        for (const [entity, fields] of Object.entries(serverSchema.requiredFields)) {
          if (fields.length > 0) {
            migrationRequired.push(`${entity}: 需要补充 ${fields.join(', ')}`);
          }
        }
      }

      // 检查是否有字段重命名
      if (serverSchema.fieldMappings) {
        for (const [entity, mappings] of Object.entries(serverSchema.fieldMappings)) {
          for (const [oldField, newField] of Object.entries(mappings)) {
            migrationRequired.push(`${entity}: ${oldField} → ${newField}`);
          }
        }
      }

      const result: VersionCheckResult = {
        compatible: breakingChanges.length === 0,
        serverVersion: serverSchema.version,
        localVersion: localInfo.version,
        breakingChanges,
        needsMigration: migrationRequired.length > 0,
        migrationRequired,
      };

      this.lastCheckTime.value = Date.now();
      logger.info('版本兼容性检查结果', result);
      return result;

    } catch (error) {
      logger.error('版本兼容性检查失败', error);
      return {
        compatible: true, // 出错时默认兼容，避免阻塞业务
        serverVersion: 'unknown',
        localVersion: this.localVersion.value,
        breakingChanges: [],
        needsMigration: false,
        migrationRequired: [],
      };
    } finally {
      this.isChecking.value = false;
    }
  }

  /**
   * 对离线数据进行版本适配（上传前调用）
   */
  async adaptDataForUpload(data: any, entityType: string): Promise<any> {
    const localInfo = await this.getLocalVersionInfo();
    if (!localInfo.schemaInfo) return data;

    const adapted = { ...data };
    const schemaInfo = localInfo.schemaInfo;

    // 应用字段映射（旧字段名 → 新字段名）
    if (schemaInfo.fieldMappings && schemaInfo.fieldMappings[entityType]) {
      const mappings = schemaInfo.fieldMappings[entityType];
      for (const [oldField, newField] of Object.entries(mappings)) {
        if (adapted[oldField] !== undefined && adapted[newField] === undefined) {
          adapted[newField] = adapted[oldField];
          delete adapted[oldField];
          logger.debug(`字段映射: ${oldField} → ${newField}`);
        }
      }
    }

    // 补充必填字段的默认值
    if (schemaInfo.requiredFields && schemaInfo.requiredFields[entityType]) {
      const requiredFields = schemaInfo.requiredFields[entityType];
      for (const field of requiredFields) {
        if (adapted[field] === undefined || adapted[field] === null) {
          adapted[field] = this.getDefaultValue(field, entityType);
          logger.debug(`补充默认字段: ${field} = ${adapted[field]}`);
        }
      }
    }

    // 移除已废弃的字段（后端会忽略，但清理一下更好）
    if (schemaInfo.deprecatedFields && schemaInfo.deprecatedFields[entityType]) {
      const deprecated = schemaInfo.deprecatedFields[entityType];
      for (const field of deprecated) {
        if (adapted[field] !== undefined) {
          delete adapted[field];
        }
      }
    }

    return adapted;
  }

  /**
   * 获取字段默认值
   */
  private getDefaultValue(field: string, entityType: string): any {
    const defaults: Record<string, Record<string, any>> = {
      status: { default: 'active' },
      createdAt: { default: () => new Date().toISOString() },
      updatedAt: { default: () => new Date().toISOString() },
      version: { default: 1 },
      isDeleted: { default: false },
    };

    const fieldDefaults: Record<string, any> = {
      status: 'active',
      priority: 'normal',
      isPublic: false,
      isActive: true,
      count: 0,
      sortOrder: 0,
    };

    if (fieldDefaults[field] !== undefined) {
      return fieldDefaults[field];
    }

    if (field.endsWith('At') || field.endsWith('Time')) {
      return new Date().toISOString();
    }

    if (field.startsWith('is') || field.startsWith('has')) {
      return false;
    }

    return null;
  }

  /**
   * 比较版本号
   * @returns -1: local < server, 0: equal, 1: local > server
   */
  private compareVersions(local: string, server: string): number {
    const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
    const localParts = parse(local);
    const serverParts = parse(server);
    
    for (let i = 0; i < Math.max(localParts.length, serverParts.length); i++) {
      const localPart = localParts[i] || 0;
      const serverPart = serverParts[i] || 0;
      
      if (localPart < serverPart) return -1;
      if (localPart > serverPart) return 1;
    }
    
    return 0;
  }

  /**
   * 清除版本信息（重新下载时调用）
   */
  async clearVersion(): Promise<void> {
    this.localVersion.value = '';
    const syncState = await indexedDBManager.getSyncState();
    delete syncState.schemaVersion;
    delete syncState.schemaInfo;
    delete syncState.versionSavedAt;
    await indexedDBManager.setSyncState(syncState);
    logger.info('版本信息已清除');
  }
}

let instance: VersionCompatibilityManager | null = null;

export function useVersionCompatibility(): VersionCompatibilityManager {
  if (!instance) {
    instance = new VersionCompatibilityManager();
  }
  return instance;
}
