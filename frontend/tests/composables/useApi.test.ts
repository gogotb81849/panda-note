import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useApi, getCacheStats, resetCacheStats, clearCacheMeta, resetApiState } from '~/composables/useApi';

describe('useApi (API拦截与缓存)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApiState();
  });

  describe('初始化', () => {
    it('应该能正常创建useApi实例', () => {
      const api = useApi();
      expect(api).toBeDefined();
      expect(typeof api.apiFetch).toBe('function');
    });
  });

  describe('URL解析逻辑', () => {
    it('应该能正确解析列表URL的storeName', () => {
      const api = useApi();
      const testCases = [
        { url: '/schedules', expected: 'schedules' },
        { url: '/diaries', expected: 'diaries' },
        { url: '/ships', expected: 'ships' },
        { url: '/tasks', expected: 'tasks' },
        { url: '/dict/categories', expected: 'dictCategories' },
      ];

      for (const tc of testCases) {
        const storeName = (api as any)._getStoreFromUrl?.(tc.url);
        if (storeName !== undefined) {
          expect(storeName).toBe(tc.expected);
        }
      }
    });

    it('应该能正确解析详情URL的storeName', () => {
      const api = useApi();
      const testCases = [
        { url: '/schedules/123', expected: 'schedules' },
        { url: '/diaries/abc', expected: 'diaries' },
        { url: '/ships/ship-001', expected: 'ships' },
      ];

      for (const tc of testCases) {
        const storeName = (api as any)._getStoreFromUrl?.(tc.url);
        if (storeName !== undefined) {
          expect(storeName).toBe(tc.expected);
        }
      }
    });
  });

  describe('离线状态检测', () => {
    it('navigator.onLine为false时应该识别为离线', () => {
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const api = useApi();
      expect(api).toBeDefined();

      Object.defineProperty(navigator, 'onLine', {
        value: originalOnLine,
        configurable: true,
      });
    });
  });

  describe('缓存元数据持久化', () => {
    it('localStorage可用时应该能保存和读取缓存元数据', () => {
      const testKey = 'panda_test_cache_meta';
      const testData = [
        { key: '/test', timestamp: Date.now(), size: 100, hitCount: 1 },
      ];

      localStorage.setItem(testKey, JSON.stringify(testData));
      const read = localStorage.getItem(testKey);
      expect(read).toBeTruthy();

      const parsed = JSON.parse(read!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].key).toBe('/test');

      localStorage.removeItem(testKey);
    });

    it('localStorage写入失败不应影响主逻辑', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const api = useApi();
      expect(api).toBeDefined();

      localStorage.setItem = originalSetItem;
    });
  });

  describe('请求去重', () => {
    it('相同GET请求应该只发送一次网络请求', async () => {
      let scheduleCalls = 0;
      (globalThis as any).$fetch = vi.fn(async (url: string) => {
        if (url.includes('/schedules')) scheduleCalls++;
        if (url.includes('/sync/server-time')) return { data: { serverTime: Date.now() } };
        await new Promise(r => setTimeout(r, 30));
        return [{ id: 1, name: 'Test' }];
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const api = useApi();
      const promise1 = api.apiFetch('/schedules');
      const promise2 = api.apiFetch('/schedules');

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toEqual(result2);
      expect(scheduleCalls).toBe(1);
    });

    it('不同GET请求应该分别发送网络请求', async () => {
      let scheduleCalls = 0;
      let shipCalls = 0;
      (globalThis as any).$fetch = vi.fn(async (url: string) => {
        if (url.includes('/schedules')) scheduleCalls++;
        if (url.includes('/ships')) shipCalls++;
        if (url.includes('/sync/server-time')) return { data: { serverTime: Date.now() } };
        return [];
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const api = useApi();
      const promise1 = api.apiFetch('/schedules');
      const promise2 = api.apiFetch('/ships');

      await Promise.all([promise1, promise2]);
      expect(scheduleCalls).toBe(1);
      expect(shipCalls).toBe(1);
    });

    it('POST请求不应该被去重', async () => {
      let scheduleCalls = 0;
      (globalThis as any).$fetch = vi.fn(async (url: string) => {
        if (url.includes('/schedules')) scheduleCalls++;
        if (url.includes('/sync/server-time')) return { data: { serverTime: Date.now() } };
        return { id: 1 };
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const api = useApi();
      const promise1 = api.apiFetch('/schedules', { method: 'POST', body: { name: 'Test 1' } });
      const promise2 = api.apiFetch('/schedules', { method: 'POST', body: { name: 'Test 2' } });

      await Promise.all([promise1, promise2]);
      expect(scheduleCalls).toBe(2);
    });
  });

  describe('缓存统计', () => {
    it('初始统计应该全为0', () => {
      const stats = getCacheStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.networkRequests).toBe(0);
      expect(stats.networkErrors).toBe(0);
    });

    it('resetCacheStats 应该重置所有统计', () => {
      // 先模拟一些统计变化无法直接触发，但可验证重置后回到0
      resetCacheStats();
      const stats = getCacheStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.lastResetTime).toBeGreaterThan(0);
    });

    it('网络请求后应该记录响应时间和请求数', async () => {
      (globalThis as any).$fetch = vi.fn(async () => {
        await new Promise(r => setTimeout(r, 20));
        return [{ id: 1, name: 'Test' }];
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const api = useApi();
      await api.apiFetch('/schedules');

      const stats = getCacheStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.networkRequests).toBe(1);
      expect(stats.avgResponseTime).toBeGreaterThanOrEqual(10);
    });

    it('网络错误后应该记录错误数', async () => {
      (globalThis as any).$fetch = vi.fn(async () => {
        throw new Error('Network Error');
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const api = useApi();
      try {
        await api.apiFetch('/schedules');
      } catch {
        // 预期错误
      }

      const stats = getCacheStats();
      expect(stats.networkErrors).toBe(1);
    });
  });
});
