import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { indexedDBManager } from '~/composables/useIndexedDB';

const TEST_STORE = 'diaries';

describe('IndexedDB Manager', () => {
  beforeEach(async () => {
    indexedDBManager['db'] = null;
    await indexedDBManager.init();
  });

  afterEach(async () => {
    try {
      await indexedDBManager.clear(TEST_STORE);
      await indexedDBManager.clear('conflicts');
      await indexedDBManager.clear('syncQueue');
    } catch {}
  });

  describe('初始化', () => {
    it('应该成功初始化数据库', async () => {
      expect(indexedDBManager['db']).toBeTruthy();
    });

    it('应该返回当前版本号', async () => {
      const version = await indexedDBManager.getCurrentVersion();
      expect(version).toBeGreaterThan(0);
    });

    it('应该能获取迁移历史', async () => {
      const history = await indexedDBManager.getMigrationHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('基本操作 - CRUD', () => {
    it('应该能保存和获取单条记录', async () => {
      const testItem = { id: 'test1', name: 'Test Item', value: 123 };
      await indexedDBManager.put(TEST_STORE, testItem);
      const retrieved = await indexedDBManager.get(TEST_STORE, 'test1');
      expect(retrieved).toBeTruthy();
      expect(retrieved!.name).toBe('Test Item');
      expect(retrieved!.value).toBe(123);
    });

    it('应该自动添加 _checksum 字段', async () => {
      const testItem = { id: 'checksum_test', name: 'Test' };
      await indexedDBManager.put(TEST_STORE, testItem);
      const retrieved = await indexedDBManager.get(TEST_STORE, 'checksum_test');
      expect(retrieved?._checksum).toBeDefined();
      expect(typeof retrieved?._checksum).toBe('string');
      expect(retrieved!._checksum.length).toBeGreaterThan(0);
    });

    it('应该自动添加 updatedAt 字段', async () => {
      const testItem = { id: 'timestamp_test', name: 'Test' };
      const before = Date.now();
      await indexedDBManager.put(TEST_STORE, testItem);
      const after = Date.now();
      const retrieved = await indexedDBManager.get(TEST_STORE, 'timestamp_test');
      expect(retrieved?.updatedAt).toBeDefined();
      expect(retrieved!.updatedAt).toBeGreaterThanOrEqual(before);
      expect(retrieved!.updatedAt).toBeLessThanOrEqual(after);
    });

    it('获取不存在的记录应该返回 null', async () => {
      const result = await indexedDBManager.get(TEST_STORE, 'nonexistent_id');
      expect(result).toBeNull();
    });

    it('应该能删除记录', async () => {
      const testItem = { id: 'delete_test', name: 'To Delete' };
      await indexedDBManager.put(TEST_STORE, testItem);
      const before = await indexedDBManager.get(TEST_STORE, 'delete_test');
      expect(before).toBeTruthy();

      await indexedDBManager.delete(TEST_STORE, 'delete_test');
      const after = await indexedDBManager.get(TEST_STORE, 'delete_test');
      expect(after).toBeNull();
    });

    it('应该能清空整个表', async () => {
      await indexedDBManager.put(TEST_STORE, { id: 'clear1', name: 'Item 1' });
      await indexedDBManager.put(TEST_STORE, { id: 'clear2', name: 'Item 2' });
      await indexedDBManager.put(TEST_STORE, { id: 'clear3', name: 'Item 3' });

      const before = await indexedDBManager.getAll(TEST_STORE);
      expect(before.length).toBeGreaterThanOrEqual(3);

      await indexedDBManager.clear(TEST_STORE);
      const after = await indexedDBManager.getAll(TEST_STORE);
      expect(after.length).toBe(0);
    });

    it('应该能获取记录数量', async () => {
      await indexedDBManager.clear(TEST_STORE);
      await indexedDBManager.put(TEST_STORE, { id: 'count1', name: 'Item 1' });
      await indexedDBManager.put(TEST_STORE, { id: 'count2', name: 'Item 2' });

      const count = await indexedDBManager.getStoreCount(TEST_STORE);
      expect(count).toBe(2);
    });
  });

  describe('批量操作', () => {
    it('应该能批量保存多条记录', async () => {
      const items = [
        { id: 'batch1', name: 'Batch Item 1' },
        { id: 'batch2', name: 'Batch Item 2' },
        { id: 'batch3', name: 'Batch Item 3' },
      ];
      await indexedDBManager.putAll(TEST_STORE, items);
      const all = await indexedDBManager.getAll(TEST_STORE);
      expect(all.length).toBeGreaterThanOrEqual(3);

      const ids = all.map(i => i.id);
      expect(ids).toContain('batch1');
      expect(ids).toContain('batch2');
      expect(ids).toContain('batch3');
    });

    it('批量保存的记录应该都有 checksum', async () => {
      const items = [
        { id: 'batch_check1', name: 'Item 1' },
        { id: 'batch_check2', name: 'Item 2' },
      ];
      await indexedDBManager.putAll(TEST_STORE, items);
      const all = await indexedDBManager.getAll(TEST_STORE);
      const batchItems = all.filter(i => i.id.startsWith('batch_check'));
      expect(batchItems.every(i => i._checksum)).toBe(true);
    });
  });

  describe('校验和 (Checksum)', () => {
    it('相同对象应该生成相同的校验和', async () => {
      const item1 = { id: 'checksum_consistent', name: 'Test', data: { a: 1, b: 2 } };
      const item2 = { id: 'checksum_consistent', name: 'Test', data: { a: 1, b: 2 } };

      await indexedDBManager.put(TEST_STORE, item1);
      const retrieved1 = await indexedDBManager.get(TEST_STORE, 'checksum_consistent');
      const checksum1 = retrieved1?._checksum;

      await indexedDBManager.put(TEST_STORE, item2);
      const retrieved2 = await indexedDBManager.get(TEST_STORE, 'checksum_consistent');
      const checksum2 = retrieved2?._checksum;

      expect(checksum1).toBe(checksum2);
    });

    it('不同对象应该生成不同的校验和', async () => {
      await indexedDBManager.put(TEST_STORE, { id: 'checksum_diff1', name: 'Test 1', value: 1 });
      await indexedDBManager.put(TEST_STORE, { id: 'checksum_diff2', name: 'Test 2', value: 2 });

      const item1 = await indexedDBManager.get(TEST_STORE, 'checksum_diff1');
      const item2 = await indexedDBManager.get(TEST_STORE, 'checksum_diff2');

      expect(item1?._checksum).not.toBe(item2?._checksum);
    });

    it('对象属性顺序不同应该生成相同的校验和', async () => {
      const item1 = { id: 'checksum_order', a: 1, b: 2, c: 3 };
      const item2 = { id: 'checksum_order', c: 3, a: 1, b: 2 };

      await indexedDBManager.put(TEST_STORE, item1);
      const retrieved1 = await indexedDBManager.get(TEST_STORE, 'checksum_order');
      const checksum1 = retrieved1?._checksum;

      await indexedDBManager.put(TEST_STORE, item2);
      const retrieved2 = await indexedDBManager.get(TEST_STORE, 'checksum_order');
      const checksum2 = retrieved2?._checksum;

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('数据完整性校验', () => {
    it('未损坏的数据应该通过完整性校验', async () => {
      await indexedDBManager.put(TEST_STORE, { id: 'integrity_valid1', name: 'Valid 1' });
      await indexedDBManager.put(TEST_STORE, { id: 'integrity_valid2', name: 'Valid 2' });

      const result = await indexedDBManager.validateStoreIntegrity(TEST_STORE);
      expect(result.valid).toBe(true);
      expect(result.corruptedCount).toBe(0);
      expect(result.totalCount).toBeGreaterThanOrEqual(2);
    });

    it('应该能检测到损坏的数据', async () => {
      await indexedDBManager.put(TEST_STORE, { id: 'corrupted_item', name: 'Original' });

      const db = indexedDBManager['db'];
      if (db) {
        const transaction = db.transaction([TEST_STORE], 'readwrite');
        const store = transaction.objectStore(TEST_STORE);
        const request = store.get('corrupted_item');
        await new Promise<void>((resolve) => {
          request.onsuccess = () => {
            const item = request.result;
            item._checksum = 'tampered_checksum_value';
            store.put(item);
            transaction.oncomplete = () => resolve();
          };
        });
      }

      const result = await indexedDBManager.validateStoreIntegrity(TEST_STORE);
      expect(result.valid).toBe(false);
      expect(result.corruptedCount).toBeGreaterThan(0);
    });

    it('应该能校验所有表的完整性', async () => {
      await indexedDBManager.put(TEST_STORE, { id: 'test_all_stores', name: 'Test' });

      const results = await indexedDBManager.validateAllStores();
      expect(results).toBeDefined();
      expect(typeof results).toBe('object');
      expect(TEST_STORE in results).toBe(true);
      expect(results[TEST_STORE].valid).toBeDefined();
    });

    it('rebuildChecksum 应该能修复损坏的校验和', async () => {
      await indexedDBManager.put(TEST_STORE, { id: 'rebuild_test', name: 'Original' });

      const db = indexedDBManager['db'];
      if (db) {
        const transaction = db.transaction([TEST_STORE], 'readwrite');
        const store = transaction.objectStore(TEST_STORE);
        const request = store.get('rebuild_test');
        await new Promise<void>((resolve) => {
          request.onsuccess = () => {
            const item = request.result;
            item._checksum = 'bad_checksum';
            store.put(item);
            transaction.oncomplete = () => resolve();
          };
        });
      }

      const beforeResult = await indexedDBManager.validateStoreIntegrity(TEST_STORE);
      expect(beforeResult.valid).toBe(false);

      const rebuildResult = await indexedDBManager.rebuildChecksum(TEST_STORE);
      expect(rebuildResult.updated).toBeGreaterThan(0);

      const afterResult = await indexedDBManager.validateStoreIntegrity(TEST_STORE);
      expect(afterResult.valid).toBe(true);
    });
  });

  describe('同步状态管理', () => {
    it('应该能获取默认同步状态', async () => {
      const state = await indexedDBManager.getSyncState();
      expect(state).toBeDefined();
      expect(state.lastSyncTime).toBeDefined();
    });

    it('应该能设置同步状态', async () => {
      const testTime = Date.now();
      await indexedDBManager.setSyncState({ lastSyncTime: testTime, syncQueue: [] });
      const state = await indexedDBManager.getSyncState();
      expect(state.lastSyncTime).toBe(testTime);
    });
  });

  describe('带版本控制的保存', () => {
    it('新记录应该从版本1开始', async () => {
      const result = await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'version_new',
        name: 'New Item',
      });
      expect(result.success).toBe(true);

      const item = await indexedDBManager.get(TEST_STORE, 'version_new');
      expect(item?._version).toBe(1);
    });

    it('更新记录应该递增版本号', async () => {
      await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'version_inc',
        name: 'V1',
      });

      const result = await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'version_inc',
        name: 'V2',
      });
      expect(result.success).toBe(true);

      const item = await indexedDBManager.get(TEST_STORE, 'version_inc');
      expect(item?._version).toBe(2);
    });
  });

  describe('冲突管理', () => {
    it('应该能保存和获取冲突记录', async () => {
      const conflicts = await indexedDBManager.getConflicts();
      const initialCount = conflicts.length;

      const result = await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'conflict_test',
        name: 'Local Version',
        _serverVersion: 1,
      });
      expect(result.success).toBe(true);

      const conflictResult = await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'conflict_test',
        name: 'Server Older Version',
        _serverVersion: 0,
      });
      expect(conflictResult.success).toBe(false);
      expect(conflictResult.conflict).toBe(true);

      const afterConflicts = await indexedDBManager.getConflicts();
      expect(afterConflicts.length).toBeGreaterThan(initialCount);
    });

    it('应该能解决冲突 - 选择本地版本', async () => {
      await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'resolve_test',
        name: 'Local',
        _serverVersion: 2,
      });
      await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'resolve_test',
        name: 'Server Old',
        _serverVersion: 1,
      });

      const conflicts = await indexedDBManager.getConflicts();
      const conflictRecord = conflicts.find(c => c.recordId === 'resolve_test');
      expect(conflictRecord).toBeDefined();

      const resolveResult = await indexedDBManager.resolveConflict(conflictRecord!.id, 'local');
      expect(resolveResult.success).toBe(true);

      const item = await indexedDBManager.get(TEST_STORE, 'resolve_test');
      expect(item?.name).toBe('Local');
    });

    it('应该能解决冲突 - 选择服务器版本', async () => {
      await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'resolve_server_test',
        name: 'Local Version',
        _serverVersion: 3,
      });
      await indexedDBManager.putWithVersion(TEST_STORE, {
        id: 'resolve_server_test',
        name: 'Server Version',
        _serverVersion: 2,
      });

      const conflicts = await indexedDBManager.getConflicts();
      const conflictRecord = conflicts.find(c => c.recordId === 'resolve_server_test');
      expect(conflictRecord).toBeDefined();

      const resolveResult = await indexedDBManager.resolveConflict(conflictRecord!.id, 'server');
      expect(resolveResult.success).toBe(true);

      const item = await indexedDBManager.get(TEST_STORE, 'resolve_server_test');
      expect(item?.name).toBe('Server Version');
    });
  });

  describe('v7 新存储表', () => {
    it('应该存在 operationLogs 存储表', async () => {
      const logEntry = {
        id: 'op_test_1',
        timestamp: Date.now(),
        storeName: 'schedules',
        recordId: 'rec1',
        operation: 'update' as const,
        source: 'user' as const,
      };
      await indexedDBManager.put('operationLogs', logEntry);
      const retrieved = await indexedDBManager.get('operationLogs', 'op_test_1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.storeName).toBe('schedules');
      expect(retrieved!.operation).toBe('update');
    });

    it('应该存在 deviceSyncInfo 存储表', async () => {
      const deviceInfo = {
        deviceId: 'dev_test_1',
        deviceName: 'Test Device',
        deviceType: 'desktop' as const,
        isCurrentDevice: true,
        lastSyncAt: Date.now(),
        syncCount: 5,
        syncSuccessCount: 4,
        syncFailCount: 1,
        lastSyncDataTypes: ['schedules', 'ships'],
      };
      await indexedDBManager.put('deviceSyncInfo', deviceInfo);
      const retrieved = await indexedDBManager.get('deviceSyncInfo', 'dev_test_1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.deviceName).toBe('Test Device');
      expect(retrieved!.syncCount).toBe(5);
    });

    it('应该存在 debugLogs 存储表', async () => {
      const debugLog = {
        id: 'debug_test_1',
        timestamp: Date.now(),
        level: 'info' as const,
        module: 'Test',
        message: 'Test debug message',
        traceId: 'trace_123',
      };
      await indexedDBManager.put('debugLogs', debugLog);
      const retrieved = await indexedDBManager.get('debugLogs', 'debug_test_1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.level).toBe('info');
      expect(retrieved!.module).toBe('Test');
    });
  });

  describe('数据库关闭', () => {
    it('应该能关闭数据库', async () => {
      expect(indexedDBManager['db']).toBeTruthy();
      await indexedDBManager.close();
      expect(indexedDBManager['db']).toBeNull();
    });
  });
});
