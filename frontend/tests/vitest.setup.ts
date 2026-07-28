import { vi } from 'vitest';

// === 1. 设置 fake-indexeddb ===
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

(globalThis as any).indexedDB = new IDBFactory();
(globalThis as any).IDBKeyRange = IDBKeyRange;

// === 2. 注入 Nuxt 自动导入的函数到 globalThis ===
const mockConfig = { public: { apiBase: 'http://localhost:3002' } };
const mockAuthStore = {
  token: 'test-token',
  user: { id: 1, teamCode: 'team1' },
};

(globalThis as any).useRuntimeConfig = () => mockConfig;
(globalThis as any).useAuthStore = () => mockAuthStore;
(globalThis as any).useNuxtApp = () => ({ $config: mockConfig });
(globalThis as any).useRouter = () => ({ push: vi.fn() });

// === 3. 模拟 $fetch ===
(globalThis as any).$fetch = vi.fn();

// === 4. 全局 process 模拟 ===
(globalThis as any).process = {
  ...(globalThis as any).process,
  client: true,
  server: false,
};

// === 5. 清理 IndexedDB 测试数据库 ===
// fake-indexeddb 不支持 databases() API，直接删除已知测试数据库名
const TEST_DB_NAMES = ['NavLogDB', 'SmokeTest', 'SmokeTest2'];
afterEach(async () => {
  try {
    for (const dbName of TEST_DB_NAMES) {
      await new Promise<void>((resolve) => {
        const req = (globalThis as any).indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
  } catch {}
});
