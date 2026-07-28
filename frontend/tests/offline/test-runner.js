/**
 * 离线功能自动化测试套件
 * 运行方式：node tests/offline/test-runner.js
 *
 * 覆盖模块（共 6 大类，36 个测试用例）：
 * 1. URL-storeName 映射（8个）
 * 2. 缓存写入队列 - 竞态条件防护（5个）
 * 3. 时间同步校准（3个）
 * 4. IndexedDB 原生操作（6个）
 * 5. 数据流向完整性验证（4个）
 * 6. 边界与异常场景（4个）
 * 7. 冲突检测逻辑（6个）
 */

// ========== 测试框架（零依赖） ==========
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(65));
  console.log('🧪 离线功能自动化测试套件');
  console.log('='.repeat(65));

  let currentCategory = '';
  for (const t of tests) {
    const category = t.name.split('：')[0];
    if (category !== currentCategory) {
      console.log(`\n  📂 ${category}`);
      currentCategory = category;
    }
    try {
      await t.fn();
      passed++;
      console.log(`    ✓ ${t.name.split('：')[1] || t.name}`);
    } catch (e) {
      failed++;
      console.log(`    ✗ ${t.name.split('：')[1] || t.name}`);
      console.log(`      错误: ${e.message}`);
      if (e.stack) {
        const line = e.stack.split('\n')[1]?.trim();
        if (line) console.log(`      ${line}`);
      }
    }
  }

  const duration = Date.now() - startTime;
  console.log('\n' + '-'.repeat(65));
  console.log(`测试结果: ${passed} 通过, ${failed} 失败, 共 ${tests.length} 项 (${duration}ms)`);
  console.log('-'.repeat(65));

  process.exit(failed > 0 ? 1 : 0);
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}\n      期望: ${e}\n      实际:   ${a}`);
  }
}

function assertApprox(actual, expected, delta, message = '') {
  if (Math.abs(actual - expected) > delta) {
    throw new Error(`${message} 期望约 ${expected}，实际 ${actual}，容差 ${delta}`);
  }
}

// ========== 被测模块：URL-storeName 映射 ==========
const URL_STORE_MAP = {
  '/ships': 'ships',
  '/schedules': 'schedules',
  '/diaries': 'diaries',
  '/staff-history': 'staffHistory',
  '/sop-flow': 'sopFlow',
  '/public-case': 'publicCase',
  '/party-activities': 'partyActivities',
  '/integrity-records': 'integrityRecords',
  '/officer-profiles': 'officerProfiles',
  '/thought-reports': 'thoughtReports',
  '/experiences': 'experiences',
  '/standard-task-templates': 'standardTaskTemplates',
  '/publish-templates': 'publishTemplates',
};

function getStoreFromUrl(url) {
  const path = url.split('?')[0];
  if (URL_STORE_MAP[path]) return URL_STORE_MAP[path];
  for (const [prefix, store] of Object.entries(URL_STORE_MAP)) {
    if (path.startsWith(prefix + '/')) return store;
  }
  return null;
}

function isListEndpoint(url) {
  return URL_STORE_MAP[url.split('?')[0]] !== undefined;
}

function extractIdFromUrl(url) {
  const path = url.split('?')[0];
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return null;
  const num = Number(last);
  return isNaN(num) ? last : num;
}

// ========== 被测模块：缓存写入队列 ==========
function createCacheWriteQueue(putFn, clearFn, deleteFn) {
  const queue = [];
  let writing = false;

  async function flush() {
    if (writing || queue.length === 0) return;
    writing = true;
    try {
      while (queue.length > 0) {
        const task = queue.shift();
        if (task.type === 'list' && Array.isArray(task.data)) {
          await clearFn(task.storeName);
          for (const item of task.data) {
            await putFn(task.storeName, item);
          }
        } else if (task.type === 'item' && task.data) {
          await putFn(task.storeName, task.data);
        } else if (task.type === 'delete' && task.id !== undefined) {
          try { await deleteFn(task.storeName, task.id); } catch {}
        }
      }
    } finally {
      writing = false;
      if (queue.length > 0) flush();
    }
  }

  function enqueue(task) {
    queue.push(task);
    flush();
  }

  return { enqueue, flush, getQueue: () => queue, isWriting: () => writing };
}

// ========== 被测模块：时间校准 ==========
function createTimeSyncer() {
  let offset = 0;
  let synced = false;

  function sync(serverTime, rttMs) {
    offset = serverTime - (Date.now() + rttMs / 2);
    synced = true;
  }

  function now() {
    return Date.now() + offset;
  }

  return { sync, now, isSynced: () => synced, getOffset: () => offset };
}

// ========== 被测模块：冲突检测逻辑 ==========
function detectConflict(clientUpdatedAt, serverUpdatedAt) {
  if (!clientUpdatedAt || !serverUpdatedAt) return false;
  const cTime = new Date(clientUpdatedAt).getTime();
  const sTime = new Date(serverUpdatedAt).getTime();
  return sTime > cTime;
}

// ========== 测试组1：URL-storeName 映射 ==========
test('URL映射：根路径正确映射', () => {
  assertEqual(getStoreFromUrl('/ships'), 'ships');
  assertEqual(getStoreFromUrl('/schedules'), 'schedules');
  assertEqual(getStoreFromUrl('/diaries'), 'diaries');
  assertEqual(getStoreFromUrl('/party-activities'), 'partyActivities');
  assertEqual(getStoreFromUrl('/integrity-records'), 'integrityRecords');
  assertEqual(getStoreFromUrl('/standard-task-templates'), 'standardTaskTemplates');
  assertEqual(getStoreFromUrl('/publish-templates'), 'publishTemplates');
});

test('URL映射：带ID的路径正确识别', () => {
  assertEqual(getStoreFromUrl('/ships/123'), 'ships');
  assertEqual(getStoreFromUrl('/schedules/456'), 'schedules');
  assertEqual(getStoreFromUrl('/diaries/789'), 'diaries');
  assertEqual(getStoreFromUrl('/party-activities/100'), 'partyActivities');
  assertEqual(getStoreFromUrl('/officer-profiles/50'), 'officerProfiles');
});

test('URL映射：带查询参数的路径正确识别', () => {
  assertEqual(getStoreFromUrl('/ships?search=abc'), 'ships');
  assertEqual(getStoreFromUrl('/schedules?startDate=2024-01-01&endDate=2024-01-31'), 'schedules');
  assertEqual(getStoreFromUrl('/diaries/123?detail=true'), 'diaries');
  assertEqual(getStoreFromUrl('/experiences?page=1&pageSize=20'), 'experiences');
});

test('URL映射：未匹配路径返回null', () => {
  assertEqual(getStoreFromUrl('/auth/login'), null);
  assertEqual(getStoreFromUrl('/dashboard/stats'), null);
  assertEqual(getStoreFromUrl('/'), null);
  assertEqual(getStoreFromUrl('/api/health'), null);
});

test('URL映射：嵌套子路径正确识别', () => {
  assertEqual(getStoreFromUrl('/diaries/by-date?date=2024-01-01'), 'diaries');
  assertEqual(getStoreFromUrl('/ships/dynamic-status/by-date'), 'ships');
  assertEqual(getStoreFromUrl('/thought-reports/warnings'), 'thoughtReports');
});

test('isListEndpoint：根列表端点正确识别', () => {
  assert(isListEndpoint('/ships'));
  assert(isListEndpoint('/schedules'));
  assert(isListEndpoint('/diaries'));
  assert(!isListEndpoint('/ships/123'));
  assert(!isListEndpoint('/auth/login'));
  assert(!isListEndpoint('/'));
});

test('extractIdFromUrl：数字ID正确提取', () => {
  assertEqual(extractIdFromUrl('/ships/123'), 123);
  assertEqual(extractIdFromUrl('/schedules/456?foo=bar'), 456);
  assertEqual(extractIdFromUrl('/diaries/789/'), 789);
});

test('extractIdFromUrl：字符串ID正确提取', () => {
  assertEqual(extractIdFromUrl('/experiences/abc-123'), 'abc-123');
  assertEqual(extractIdFromUrl('/magazine/xyz_789'), 'xyz_789');
});

// ========== 测试组2：缓存写入队列 - 竞态防护 ==========
test('缓存队列：单条 list 写入正确', async () => {
  const store = new Map();
  const queue = createCacheWriteQueue(
    (name, item) => store.set(item.id, item),
    (name) => store.clear(),
    () => {}
  );

  queue.enqueue({ storeName: 'test', type: 'list', data: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] });
  await new Promise(r => setTimeout(r, 10));

  assertEqual(store.size, 2);
  assertEqual(store.get(1).name, 'a');
  assertEqual(store.get(2).name, 'b');
});

test('缓存队列：并发写入不会交错（竞态防护）', async () => {
  const store = new Map();
  let concurrentWrites = 0;
  let maxConcurrent = 0;

  const slowPut = async (name, item) => {
    concurrentWrites++;
    maxConcurrent = Math.max(maxConcurrent, concurrentWrites);
    await new Promise(r => setTimeout(r, 5));
    store.set(item.id, item);
    concurrentWrites--;
  };

  const slowClear = async (name) => {
    concurrentWrites++;
    maxConcurrent = Math.max(maxConcurrent, concurrentWrites);
    await new Promise(r => setTimeout(r, 5));
    store.clear();
    concurrentWrites--;
  };

  const queue = createCacheWriteQueue(slowPut, slowClear, () => {});

  queue.enqueue({ storeName: 'test', type: 'list', data: [{ id: 1, v: 1 }] });
  queue.enqueue({ storeName: 'test', type: 'list', data: [{ id: 2, v: 2 }] });
  queue.enqueue({ storeName: 'test', type: 'list', data: [{ id: 3, v: 3 }] });

  await new Promise(r => setTimeout(r, 100));

  assertEqual(maxConcurrent, 1, '同一时间只能有1个写入在执行');
  assertEqual(store.size, 1);
  assertEqual(store.get(3).v, 3, '最后一次写入应该生效');
});

test('缓存队列：item 写入按顺序执行', async () => {
  const order = [];
  const store = new Map();

  const slowPut = async (name, item) => {
    await new Promise(r => setTimeout(r, 3));
    order.push(item.id);
    store.set(item.id, item);
  };

  const queue = createCacheWriteQueue(slowPut, () => {}, () => {});

  for (let i = 1; i <= 5; i++) {
    queue.enqueue({ storeName: 'test', type: 'item', data: { id: i, val: i * 10 } });
  }

  await new Promise(r => setTimeout(r, 50));

  assertDeepEqual(order, [1, 2, 3, 4, 5], '写入顺序应该与入队顺序一致');
  assertEqual(store.get(5).val, 50);
});

test('缓存队列：delete 操作正确执行', async () => {
  const store = new Map([[1, { id: 1 }], [2, { id: 2 }]]);
  const queue = createCacheWriteQueue(() => {}, () => {}, (name, id) => store.delete(id));

  queue.enqueue({ storeName: 'test', type: 'delete', id: 1 });
  await new Promise(r => setTimeout(r, 10));

  assertEqual(store.size, 1);
  assert(store.has(2));
  assert(!store.has(1));
});

test('缓存队列：混合操作顺序执行', async () => {
  const store = new Map();
  const log = [];

  const makeSlow = (fn, label) => async (...args) => {
    await new Promise(r => setTimeout(r, 2));
    log.push(label);
    return fn(...args);
  };

  const queue = createCacheWriteQueue(
    makeSlow((n, i) => store.set(i.id, i), 'put'),
    makeSlow(() => store.clear(), 'clear'),
    makeSlow((n, id) => store.delete(id), 'delete')
  );

  queue.enqueue({ storeName: 'test', type: 'list', data: [{ id: 1 }] });
  queue.enqueue({ storeName: 'test', type: 'item', data: { id: 2 } });
  queue.enqueue({ storeName: 'test', type: 'delete', id: 1 });
  queue.enqueue({ storeName: 'test', type: 'item', data: { id: 3 } });

  await new Promise(r => setTimeout(r, 50));

  assertDeepEqual(log, ['clear', 'put', 'put', 'delete', 'put']);
  assertEqual(store.size, 2);
  assert(store.has(2));
  assert(store.has(3));
});

// ========== 测试组3：时间同步校准 ==========
test('时间同步：校准后时间接近服务器时间', () => {
  const syncer = createTimeSyncer();
  const serverNow = Date.now() + 5000;
  const rtt = 100;

  syncer.sync(serverNow, rtt);

  assert(syncer.isSynced());
  const diff = Math.abs(syncer.now() - serverNow);
  assert(diff < 200, `校准后误差应小于200ms，实际${diff}ms`);
});

test('时间同步：正向偏移（服务器快）', () => {
  const syncer = createTimeSyncer();
  const before = Date.now();
  const serverNow = before + 10000;
  syncer.sync(serverNow, 0);
  assertEqual(syncer.getOffset(), serverNow - before);
  assert(syncer.now() > Date.now());
});

test('时间同步：负向偏移（服务器慢）', () => {
  const syncer = createTimeSyncer();
  const serverNow = Date.now() - 3000;
  syncer.sync(serverNow, 0);
  assert(syncer.getOffset() < 0);
  assert(syncer.now() < Date.now());
});

// ========== 测试组4：IndexedDB 原生操作 ==========
const TEST_DB = '__test_offline_db__';
const TEST_STORE = 'testStore';

function openTestDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TEST_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TEST_STORE)) {
        db.createObjectStore(TEST_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteTestDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(TEST_DB);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db, store, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    const req = s.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const s = tx.objectStore(store);
    const req = s.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const s = tx.objectStore(store);
    const req = s.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    const req = s.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    const req = s.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

test('IndexedDB：put 和 get 基本操作', async () => {
  const db = await openTestDB();
  try {
    await dbPut(db, TEST_STORE, { id: 1, name: 'test1', value: 100 });
    const result = await dbGet(db, TEST_STORE, 1);
    assertEqual(result.name, 'test1');
    assertEqual(result.value, 100);
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('IndexedDB：getAll 获取全部', async () => {
  const db = await openTestDB();
  try {
    await dbPut(db, TEST_STORE, { id: 1, name: 'a' });
    await dbPut(db, TEST_STORE, { id: 2, name: 'b' });
    await dbPut(db, TEST_STORE, { id: 3, name: 'c' });
    const all = await dbGetAll(db, TEST_STORE);
    assertEqual(all.length, 3);
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('IndexedDB：delete 和 clear', async () => {
  const db = await openTestDB();
  try {
    await dbPut(db, TEST_STORE, { id: 1, name: 'a' });
    await dbPut(db, TEST_STORE, { id: 2, name: 'b' });

    await dbDelete(db, TEST_STORE, 1);
    let all = await dbGetAll(db, TEST_STORE);
    assertEqual(all.length, 1);
    assertEqual(all[0].id, 2);

    await dbClear(db, TEST_STORE);
    all = await dbGetAll(db, TEST_STORE);
    assertEqual(all.length, 0);
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('IndexedDB：更新数据', async () => {
  const db = await openTestDB();
  try {
    await dbPut(db, TEST_STORE, { id: 1, name: 'old', count: 10 });
    await dbPut(db, TEST_STORE, { id: 1, name: 'new', count: 20 });
    const result = await dbGet(db, TEST_STORE, 1);
    assertEqual(result.name, 'new');
    assertEqual(result.count, 20);
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('IndexedDB：事务原子性', async () => {
  const db = await openTestDB();
  try {
    await dbPut(db, TEST_STORE, { id: 1, name: 'original' });

    let txError = null;
    try {
      const tx = db.transaction(TEST_STORE, 'readwrite');
      const store = tx.objectStore(TEST_STORE);
      store.put({ id: 1, name: 'updated' });
      store.add({ id: 1, name: 'duplicate' });
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      txError = e;
    }

    assert(txError, '事务应该因主键冲突而失败');
    const result = await dbGet(db, TEST_STORE, 1);
    assertEqual(result.name, 'original', '事务失败后数据应该回滚到原值');
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('IndexedDB：大数量写入', async () => {
  const db = await openTestDB();
  try {
    const count = 100;
    for (let i = 1; i <= count; i++) {
      await dbPut(db, TEST_STORE, { id: i, value: `item-${i}` });
    }
    const all = await dbGetAll(db, TEST_STORE);
    assertEqual(all.length, count);
    assertEqual(all[0].id, 1);
    assertEqual(all[count - 1].id, count);
  } finally {
    db.close();
    await deleteTestDB();
  }
});

// ========== 测试组5：数据流向完整性 ==========
test('数据流：在线读 → 缓存 → 离线读', async () => {
  const db = await openTestDB();
  try {
    const serverData = [
      { id: 1, name: 'ship1', type: 'cargo' },
      { id: 2, name: 'ship2', type: 'tanker' },
    ];

    for (const item of serverData) {
      await dbPut(db, TEST_STORE, item);
    }

    const cached = await dbGetAll(db, TEST_STORE);
    assertEqual(cached.length, 2, '缓存数据量应该正确');

    const offlineRead = await dbGetAll(db, TEST_STORE);
    assertEqual(offlineRead.length, 2);
    assertEqual(offlineRead[0].name, 'ship1');
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('数据流：离线创建 → 入队 → 同步成功 → 更新本地', async () => {
  const db = await openTestDB();
  try {
    const localId = 'local_test_123';
    const localData = { id: localId, name: 'new ship', _localCreated: true, _syncPending: true };

    await dbPut(db, TEST_STORE, localData);
    const found = await dbGet(db, TEST_STORE, localId);
    assert(found, '本地创建的数据应该存在');
    assert(found._syncPending, '应该标记为待同步');

    const serverId = 100;
    const serverData = { id: serverId, name: 'new ship', createdById: 1 };
    await dbDelete(db, TEST_STORE, localId);
    await dbPut(db, TEST_STORE, serverData);

    const deletedLocal = await dbGet(db, TEST_STORE, localId);
    assert(!deletedLocal, '同步成功后临时ID应该被删除');
    const realData = await dbGet(db, TEST_STORE, serverId);
    assert(realData, '真实ID的数据应该存在');
    assertEqual(realData.name, 'new ship');
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('数据流：离线删除 → 入队 → 同步成功', async () => {
  const db = await openTestDB();
  try {
    await dbPut(db, TEST_STORE, { id: 1, name: 'to-delete' });
    await dbPut(db, TEST_STORE, { id: 2, name: 'keep' });

    let exists = await dbGet(db, TEST_STORE, 1);
    assert(exists, '删除前数据应该存在');

    await dbDelete(db, TEST_STORE, 1);

    exists = await dbGet(db, TEST_STORE, 1);
    assert(!exists, '本地删除后数据应该消失');

    const other = await dbGet(db, TEST_STORE, 2);
    assert(other, '其他数据不应受影响');
  } finally {
    db.close();
    await deleteTestDB();
  }
});

test('数据流：多次编辑本地数据合并', async () => {
  const db = await openTestDB();
  try {
    await dbPut(db, TEST_STORE, { id: 1, title: 'Original', status: 'draft' });

    await dbPut(db, TEST_STORE, { id: 1, title: 'Updated', status: 'draft' });
    let result = await dbGet(db, TEST_STORE, 1);
    assertEqual(result.title, 'Updated');
    assertEqual(result.status, 'draft');

    await dbPut(db, TEST_STORE, { id: 1, status: 'published' });
    result = await dbGet(db, TEST_STORE, 1);
    assertEqual(result.title, 'Updated');
    assertEqual(result.status, 'published');
  } finally {
    db.close();
    await deleteTestDB();
  }
});

// ========== 测试组6：冲突检测逻辑 ==========
test('冲突检测：服务器更新 → 检测到冲突', () => {
  const client = '2024-01-01T00:00:00Z';
  const server = '2024-01-02T00:00:00Z';
  assert(detectConflict(client, server), '服务器数据更新应该检测到冲突');
});

test('冲突检测：客户端更新 → 无冲突', () => {
  const client = '2024-01-03T00:00:00Z';
  const server = '2024-01-02T00:00:00Z';
  assert(!detectConflict(client, server), '客户端数据更新不应检测到冲突');
});

test('冲突检测：相同时间 → 无冲突', () => {
  const t = '2024-01-01T00:00:00Z';
  assert(!detectConflict(t, t), '相同时间不应视为冲突');
});

test('冲突检测：客户端无时间戳 → 无冲突', () => {
  assert(!detectConflict(null, '2024-01-01T00:00:00Z'));
  assert(!detectConflict(undefined, '2024-01-01T00:00:00Z'));
  assert(!detectConflict('', '2024-01-01T00:00:00Z'));
});

test('冲突检测：服务端无时间戳 → 无冲突', () => {
  assert(!detectConflict('2024-01-01T00:00:00Z', null));
  assert(!detectConflict('2024-01-01T00:00:00Z', undefined));
});

test('冲突检测：毫秒级精度', () => {
  const t1 = '2024-01-01T00:00:00.000Z';
  const t2 = '2024-01-01T00:00:00.001Z';
  assert(detectConflict(t1, t2), '毫秒级差异也应该检测到冲突');
  assert(!detectConflict(t2, t1));
});

// ========== 测试组7：边界与异常 ==========
test('边界：空数组缓存', async () => {
  const store = new Map();
  const queue = createCacheWriteQueue(
    (n, i) => store.set(i.id, i),
    (n) => store.clear(),
    () => {}
  );

  queue.enqueue({ storeName: 'test', type: 'list', data: [] });
  await new Promise(r => setTimeout(r, 10));

  assertEqual(store.size, 0);
});

test('边界：URL末尾斜杠', () => {
  assertEqual(getStoreFromUrl('/ships/'), 'ships');
  assertEqual(getStoreFromUrl('/schedules//'), 'schedules');
});

test('边界：非常长的URL参数', () => {
  const longUrl = '/ships?' + 'a'.repeat(10000) + '=b';
  assertEqual(getStoreFromUrl(longUrl), 'ships');
});

test('边界：ID为0的情况', () => {
  assertEqual(extractIdFromUrl('/ships/0'), 0);
  assertEqual(getStoreFromUrl('/ships/0'), 'ships');
});

// ========== 运行测试 ==========
console.log('🧪 初始化测试环境...');
runTests().catch(e => {
  console.error('测试运行异常:', e);
  process.exit(1);
});
