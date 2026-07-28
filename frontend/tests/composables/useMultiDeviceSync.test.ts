import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useMultiDeviceSync } from '~/composables/useMultiDeviceSync';
import { indexedDBManager } from '~/composables/useIndexedDB';

describe('MultiDeviceSync (多端同步状态)', () => {
  let multiDeviceSync: ReturnType<typeof useMultiDeviceSync>;

  beforeEach(async () => {
    indexedDBManager['db'] = null;
    await indexedDBManager.init();
    multiDeviceSync = useMultiDeviceSync();
    await multiDeviceSync.ensureInitialized();
  });

  afterEach(async () => {
    try {
      await indexedDBManager.clear('deviceSyncInfo');
    } catch {}
  });

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      const result = await multiDeviceSync.ensureInitialized();
      expect(result).toBe(true);
    });

    it('应该生成当前设备ID', () => {
      const deviceId = multiDeviceSync.getCurrentDeviceId();
      expect(deviceId).toBeTruthy();
      expect(deviceId).toContain('dev_');
    });

    it('应该获取当前设备摘要', () => {
      const summary = multiDeviceSync.getCurrentDeviceSummary();
      expect(summary.deviceName).toBeTruthy();
      expect(summary.deviceType).toBeTruthy();
      expect(summary.lastSyncAt).toBeDefined();
      expect(summary.syncSuccessRate).toBeDefined();
    });
  });

  describe('同步记录', () => {
    it('应该记录同步成功状态', async () => {
      await multiDeviceSync.recordSync(true, ['schedules', 'ships']);

      const summary = multiDeviceSync.getCurrentDeviceSummary();
      expect(summary.lastSyncAt).not.toBe('从未同步');
    });

    it('应该记录同步失败状态', async () => {
      await multiDeviceSync.recordSync(false, ['diaries']);

      const devices = multiDeviceSync.devices.value;
      expect(devices.length).toBeGreaterThanOrEqual(1);
    });

    it('应该累积同步次数', async () => {
      await multiDeviceSync.recordSync(true, []);
      await multiDeviceSync.recordSync(true, []);
      await multiDeviceSync.recordSync(false, []);

      const devices = multiDeviceSync.devices.value;
      const current = devices.find(d => d.isCurrentDevice);
      expect(current).toBeDefined();
      expect(current!.syncCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('设备列表', () => {
    it('应该加载设备列表', async () => {
      await multiDeviceSync.recordSync(true, []);

      const devices = multiDeviceSync.devices.value;
      expect(Array.isArray(devices)).toBe(true);
    });

    it('当前设备应该标记为isCurrentDevice', async () => {
      await multiDeviceSync.recordSync(true, []);

      const current = multiDeviceSync.currentDevice.value;
      expect(current).toBeDefined();
      expect(current!.isCurrentDevice).toBe(true);
    });
  });

  describe('清理旧设备', () => {
    it('应该清理超过30天的旧设备记录', async () => {
      // 先记录当前设备
      await multiDeviceSync.recordSync(true, []);

      // 插入一条模拟的旧设备记录
      const oldDevice = {
        deviceId: 'dev_old_test',
        deviceName: 'Old Device',
        deviceType: 'desktop' as const,
        isCurrentDevice: false,
        lastSyncAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
        syncCount: 1,
        syncSuccessCount: 1,
        syncFailCount: 0,
        lastSyncDataTypes: [],
      };
      await indexedDBManager.put('deviceSyncInfo', oldDevice);

      const removed = await multiDeviceSync.cleanupOldDevices();
      expect(removed).toBe(1);

      const allDevices = await indexedDBManager.getAll('deviceSyncInfo');
      const hasOld = allDevices.some((d: any) => d.deviceId === 'dev_old_test');
      expect(hasOld).toBe(false);
    });

    it('不应该清理当前设备', async () => {
      await multiDeviceSync.recordSync(true, []);

      const removed = await multiDeviceSync.cleanupOldDevices();
      expect(removed).toBe(0);

      const current = multiDeviceSync.currentDevice.value;
      expect(current).toBeDefined();
    });
  });
});
