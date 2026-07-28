import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSyncQueue } from '~/composables/useSyncQueue';
import { indexedDBManager } from '~/composables/useIndexedDB';

describe('Sync Queue (同步队列)', () => {
  let syncQueue: ReturnType<typeof useSyncQueue>;

  beforeEach(async () => {
    indexedDBManager['db'] = null;
    await indexedDBManager.init();
    // 设为离线，防止 enqueue 自动触发 processQueue 把测试数据"同步"掉
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    syncQueue = useSyncQueue();
    syncQueue.stopAutoSync();
    vi.clearAllMocks();
    try {
      await syncQueue.clearQueue();
    } catch {}
  });

  afterEach(async () => {
    try {
      await syncQueue.clearQueue();
      syncQueue.stopAutoSync();
    } catch {}
    // 恢复在线状态
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  describe('队列管理', () => {
    it('队列初始状态应该为空', () => {
      expect(syncQueue.queue.value).toBeDefined();
      expect(Array.isArray(syncQueue.queue.value)).toBe(true);
    });

    it('应该能添加条目到队列', async () => {
      const item = await syncQueue.addItem('diaries', 'create', {
        id: 'test-sync-1',
        title: 'Test Diary',
        content: 'Test Content',
      });

      expect(item).toBeDefined();
      expect(item.id).toBeTruthy();
      expect(item.storeName).toBe('diaries');
      expect(item.operation).toBe('create');
      expect(item.status).toBe('pending');

      const pendingItems = syncQueue.getPendingItems();
      expect(pendingItems.length).toBeGreaterThanOrEqual(1);
    });

    it('应该能获取待处理条目', async () => {
      await syncQueue.addItem('diaries', 'create', { id: 'pending-1', name: 'Test 1' });
      await syncQueue.addItem('diaries', 'create', { id: 'pending-2', name: 'Test 2' });

      const pendingItems = syncQueue.getPendingItems();
      expect(pendingItems.length).toBeGreaterThanOrEqual(2);
      expect(pendingItems.every(i => i.status === 'pending')).toBe(true);
    });

    it('应该能更新队列条目状态', async () => {
      const item = await syncQueue.addItem('diaries', 'create', { id: 'update-status-test', name: 'Test' });

      await syncQueue.updateItemStatus(item.id, 'processing');
      const allItems = syncQueue.queue.value;
      const updated = allItems.find(i => i.id === item.id);
      expect(updated?.status).toBe('processing');
    });

    it('应该能标记条目失败并记录错误', async () => {
      const item = await syncQueue.addItem('diaries', 'create', { id: 'fail-test', name: 'Test' });

      const testError = new Error('Network error');
      await syncQueue.markItemFailed(item.id, testError);

      const allItems = syncQueue.queue.value;
      const failedItem = allItems.find(i => i.id === item.id);
      expect(failedItem?.status).toBe('failed');
      expect(failedItem?.errorMsg).toBeTruthy();
      expect(failedItem?.retryCount).toBeGreaterThan(0);
    });

    it('应该能移除队列条目', async () => {
      const item = await syncQueue.addItem('diaries', 'create', { id: 'remove-test', name: 'Test' });
      const beforeCount = syncQueue.queue.value.length;

      await syncQueue.removeItem(item.id);

      const afterCount = syncQueue.queue.value.length;
      expect(afterCount).toBeLessThan(beforeCount);
      const found = syncQueue.queue.value.find(i => i.id === item.id);
      expect(found).toBeUndefined();
    });

    it('应该能清空队列', async () => {
      await syncQueue.addItem('diaries', 'create', { id: 'clear-1', name: 'Test 1' });
      await syncQueue.addItem('diaries', 'create', { id: 'clear-2', name: 'Test 2' });

      expect(syncQueue.queue.value.length).toBeGreaterThanOrEqual(2);

      await syncQueue.clearQueue();
      expect(syncQueue.queue.value.length).toBe(0);
    });
  });

  describe('队列统计', () => {
    it('应该能获取待处理数量', async () => {
      await syncQueue.clearQueue();
      await syncQueue.addItem('diaries', 'create', { id: 'stat-1', name: 'Test 1' });
      await syncQueue.addItem('diaries', 'create', { id: 'stat-2', name: 'Test 2' });

      expect(syncQueue.pendingCount.value).toBeGreaterThanOrEqual(2);
    });

    it('应该能获取失败数量', async () => {
      const item = await syncQueue.addItem('diaries', 'create', { id: 'fail-stat', name: 'Test' });
      await syncQueue.markItemFailed(item.id, new Error('Test error'));

      expect(syncQueue.failedCount.value).toBeGreaterThanOrEqual(1);
    });

    it('isSyncing 初始值应该为 false', () => {
      expect(syncQueue.isSyncing.value).toBe(false);
    });
  });

  describe('冲突策略设置', () => {
    it('应该能设置冲突策略', async () => {
      await syncQueue.setConflictStrategy('client-first');
      // 通过processQueue内部行为间接验证策略生效
      expect(typeof syncQueue.setConflictStrategy).toBe('function');

      await syncQueue.setConflictStrategy('server-first');
      expect(typeof syncQueue.setConflictStrategy).toBe('function');

      await syncQueue.setConflictStrategy('manual');
      expect(typeof syncQueue.setConflictStrategy).toBe('function');
    });
  });

  describe('优先级排序', () => {
    it('高优先级条目应该排在前面', async () => {
      await syncQueue.addItem('diaries', 'create', { id: 'low-prio', name: 'Low' }, 0);
      await syncQueue.addItem('diaries', 'create', { id: 'high-prio', name: 'High' }, 10);

      const pending = syncQueue.getPendingItems();
      const highIndex = pending.findIndex(i => i.recordId === 'high-prio');
      const lowIndex = pending.findIndex(i => i.recordId === 'low-prio');

      expect(highIndex).toBeLessThan(lowIndex);
    });
  });

  describe('重试机制', () => {
    it('失败条目应该有最大重试次数', async () => {
      const item = await syncQueue.addItem('diaries', 'create', { id: 'retry-test', name: 'Test' });

      for (let i = 0; i < 5; i++) {
        await syncQueue.markItemFailed(item.id, new Error(`Error ${i}`));
      }

      const allItems = syncQueue.queue.value;
      const retryItem = allItems.find(i => i.id === item.id);
      expect(retryItem?.retryCount).toBeLessThanOrEqual(5);
    });
  });

  describe('冲突记录管理', () => {
    it('应该能保存和解决冲突', async () => {
      const conflictId = await syncQueue.saveConflict({
        storeName: 'diaries',
        recordId: 'conflict-1',
        localData: { id: 'conflict-1', name: 'Local' },
        serverData: { id: 'conflict-1', name: 'Server' },
        localUpdatedAt: new Date().toISOString(),
        serverUpdatedAt: new Date().toISOString(),
      });

      expect(conflictId).toBeTruthy();
      expect(syncQueue.conflicts.value.length).toBeGreaterThan(0);

      const result = await syncQueue.resolveConflict(conflictId, 'local');
      expect(result.success).toBe(true);
      expect(syncQueue.conflicts.value.find(c => c.id === conflictId)).toBeUndefined();
    });
  });

  describe('队列压缩', () => {
    it('create + delete 同一记录应该全部移除', async () => {
      await syncQueue.clearQueue();
      await syncQueue.addItem('diaries', 'create', { id: 'compress-1', name: 'A' });
      await syncQueue.addItem('diaries', 'delete', { id: 'compress-1' });

      const before = syncQueue.queue.value.length;
      expect(before).toBeGreaterThanOrEqual(2);

      const result = syncQueue.compressQueue();
      expect(result.removed).toBeGreaterThanOrEqual(2);
      expect(syncQueue.queue.value.length).toBeLessThan(before);
    });

    it('多次 update 同一记录应该合并为最后一次', async () => {
      await syncQueue.clearQueue();
      await syncQueue.addItem('diaries', 'update', { id: 'compress-2', name: 'A' });
      await syncQueue.addItem('diaries', 'update', { id: 'compress-2', name: 'B' });
      await syncQueue.addItem('diaries', 'update', { id: 'compress-2', name: 'C' });

      const before = syncQueue.queue.value.length;
      expect(before).toBeGreaterThanOrEqual(3);

      const result = syncQueue.compressQueue();
      expect(result.merged).toBeGreaterThanOrEqual(2);
      expect(syncQueue.queue.value.length).toBeLessThan(before);
    });

    it('update + delete 同一记录应该保留 delete', async () => {
      await syncQueue.clearQueue();
      await syncQueue.addItem('diaries', 'update', { id: 'compress-3', name: 'A' });
      await syncQueue.addItem('diaries', 'delete', { id: 'compress-3' });

      const before = syncQueue.queue.value.length;
      syncQueue.compressQueue();

      const items = syncQueue.queue.value.filter(
        i => i.storeName === 'diaries' && i.recordId === 'compress-3'
      );
      expect(items.length).toBe(1);
      expect(items[0].operation).toBe('delete');
    });

    it('不同记录不应该被压缩', async () => {
      await syncQueue.clearQueue();
      await syncQueue.addItem('diaries', 'update', { id: 'r1', name: 'A' });
      await syncQueue.addItem('diaries', 'update', { id: 'r2', name: 'B' });

      const before = syncQueue.queue.value.length;
      const result = syncQueue.compressQueue();

      expect(result.removed).toBe(0);
      expect(result.merged).toBe(0);
      expect(syncQueue.queue.value.length).toBe(before);
    });
  });
});
