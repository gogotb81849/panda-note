/**
 * 多端同步状态管理
 * 记录设备信息和同步历史，展示多端同步状态
 */

import { ref, computed } from 'vue';
import { indexedDBManager } from './useIndexedDB';
import { createModuleLogger } from './useDebugLogger';

const logger = createModuleLogger('MultiDeviceSync');

export interface DeviceSyncInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  isCurrentDevice: boolean;
  lastSyncAt: number;
  syncCount: number;
  syncSuccessCount: number;
  syncFailCount: number;
  lastSyncDataTypes: string[];
  userAgent?: string;
}

const DEVICE_STORE = 'deviceSyncInfo';
const DEVICE_ID_KEY = 'panda_device_id';

class MultiDeviceSyncManager {
  private initialized = false;
  private _currentDeviceId: string | null = null;

  public devices = ref<DeviceSyncInfo[]>([]);
  public currentDevice = ref<DeviceSyncInfo | null>(null);

  async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      await indexedDBManager.init();
      this._currentDeviceId = this.getOrCreateDeviceId();
      await this.loadDevices();
      this.initialized = true;
      return true;
    } catch (error: any) {
      logger.error('多端同步状态初始化失败', error);
      return false;
    }
  }

  private getOrCreateDeviceId(): string {
    if (process.server) return 'server';
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return `dev_${Date.now()}`;
    }
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' | 'unknown' {
    if (process.server) return 'unknown';
    const ua = navigator.userAgent;
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
    if (/Mobile|iPhone|Android|iPod/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private getDeviceName(): string {
    if (process.server) return '服务器';
    const type = this.detectDeviceType();
    const ua = navigator.userAgent;
    let os = '未知系统';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iOS|iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    const typeMap = { desktop: '电脑', tablet: '平板', mobile: '手机', unknown: '设备' };
    return `${os} ${typeMap[type]}`;
  }

  private async loadDevices(): Promise<void> {
    try {
      const all = await indexedDBManager.getAll<DeviceSyncInfo>(DEVICE_STORE);
      this.devices.value = all.sort((a, b) => b.lastSyncAt - a.lastSyncAt);
      this.currentDevice.value = all.find(d => d.deviceId === this._currentDeviceId) || null;
    } catch (error) {
      logger.error('加载设备同步信息失败', error);
    }
  }

  /**
   * 记录本机同步事件
   */
  async recordSync(
    success: boolean,
    dataTypes: string[] = [],
    options?: { syncCount?: number; failCount?: number }
  ): Promise<void> {
    const ok = await this.ensureInitialized();
    if (!ok) return;

    try {
      const now = Date.now();
      const existing = await indexedDBManager.get<DeviceSyncInfo>(DEVICE_STORE, this._currentDeviceId!);

      const deviceInfo: DeviceSyncInfo = {
        deviceId: this._currentDeviceId!,
        deviceName: this.getDeviceName(),
        deviceType: this.detectDeviceType(),
        isCurrentDevice: true,
        lastSyncAt: now,
        syncCount: (existing?.syncCount || 0) + (options?.syncCount ?? 1),
        syncSuccessCount: (existing?.syncSuccessCount || 0) + (success ? (options?.syncCount ?? 1) : 0),
        syncFailCount: (existing?.syncFailCount || 0) + (!success ? (options?.failCount ?? 1) : 0),
        lastSyncDataTypes: dataTypes.length > 0 ? dataTypes : (existing?.lastSyncDataTypes || []),
        userAgent: process.server ? undefined : navigator.userAgent,
      };

      await indexedDBManager.put(DEVICE_STORE, deviceInfo);
      await this.loadDevices();

      logger.debug('同步状态已记录', { deviceId: deviceInfo.deviceId, success });
    } catch (error) {
      logger.error('记录同步状态失败', error);
    }
  }

  /**
   * 获取当前设备ID
   */
  getCurrentDeviceId(): string | null {
    return this._currentDeviceId;
  }

  /**
   * 获取当前设备同步摘要
   */
  getCurrentDeviceSummary(): {
    deviceName: string;
    deviceType: string;
    lastSyncAt: string;
    syncSuccessRate: string;
  } {
    const device = this.currentDevice.value;
    if (!device) {
      return {
        deviceName: this.getDeviceName(),
        deviceType: this.detectDeviceType(),
        lastSyncAt: '从未同步',
        syncSuccessRate: 'N/A',
      };
    }

    const total = device.syncCount || 0;
    const successRate = total > 0
      ? `${Math.round(((device.syncSuccessCount || 0) / total) * 100)}%`
      : 'N/A';

    return {
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      lastSyncAt: this.formatTime(device.lastSyncAt),
      syncSuccessRate: successRate,
    };
  }

  private formatTime(timestamp: number): string {
    if (!timestamp) return '从未同步';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  }

  /**
   * 清理超过30天未同步的旧设备记录
   */
  async cleanupOldDevices(): Promise<number> {
    const ok = await this.ensureInitialized();
    if (!ok) return 0;

    try {
      const all = await indexedDBManager.getAll<DeviceSyncInfo>(DEVICE_STORE);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let removed = 0;

      for (const device of all) {
        if (!device.isCurrentDevice && device.lastSyncAt < thirtyDaysAgo) {
          await indexedDBManager.delete(DEVICE_STORE, device.deviceId);
          removed++;
        }
      }

      if (removed > 0) {
        await this.loadDevices();
        logger.info(`清理了 ${removed} 个旧设备同步记录`);
      }

      return removed;
    } catch (error) {
      logger.error('清理旧设备记录失败', error);
      return 0;
    }
  }
}

let instance: MultiDeviceSyncManager | null = null;

export function useMultiDeviceSync(): MultiDeviceSyncManager {
  if (!instance) {
    instance = new MultiDeviceSyncManager();
  }
  return instance;
}
