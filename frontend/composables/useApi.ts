import type { Schedule, Ship, CreateScheduleRequest, DictCategory, StaffHistory, SopFlow, PublicCase, OperationLog, CreateStaffHistoryRequest, UpdateStaffHistoryRequest, CreateSopFlowRequest, UpdateSopFlowRequest, CreatePublicCaseRequest, PublishTemplate, CreatePublishTemplateRequest, UpdatePublishTemplateRequest, ShipTask, ShipDynamicStatus, Experience, CreateExperienceRequest, RateExperienceRequest, CommentExperienceRequest, TaskNode, CreateTaskRequest, UpdateTaskRequest, FileRecord, CreateFileRecordRequest, UpdateFileRecordRequest, CreatePortCheckTemplateRequest, UpdatePortCheckTaskRequest, PartyActivity, CreatePartyActivityRequest, PartyActivityStatistics, ThoughtReport, CreateThoughtReportRequest, ThoughtReportWarning, IntegrityRecord, CreateIntegrityRecordRequest, OfficerProfile, OfficerEvaluation, OfficerMentorship, OfficerStats, StaffAssignment, CreateStaffAssignmentRequest } from '~/types';
import { ElMessage } from 'element-plus';
import { indexedDBManager } from './useIndexedDB';

// URL路径到IndexedDB storeName的映射（离线缓存支持）
const URL_STORE_MAP: Record<string, string> = {
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

function getStoreFromUrl(url: string): string | null {
  const path = url.split('?')[0];
  if (URL_STORE_MAP[path]) return URL_STORE_MAP[path];
  for (const [prefix, store] of Object.entries(URL_STORE_MAP)) {
    if (path.startsWith(prefix + '/')) return store;
  }
  return null;
}

function isListEndpoint(url: string): boolean {
  return URL_STORE_MAP[url.split('?')[0]] !== undefined;
}

function extractIdFromUrl(url: string): string | number | null {
  const path = url.split('?')[0];
  const segments = path.split('/');
  const last = segments[segments.length - 1];
  if (!last) return null;
  const num = Number(last);
  return isNaN(num) ? last : num;
}

function isNetworkError(error: any): boolean {
  const status = error?.response?.status || error?.status || error?.statusCode;
  return !status || status === 0 || status >= 500;
}

let _dbReady = false;
async function ensureDb(): Promise<boolean> {
  if (_dbReady) return true;
  if (process.server) return false;
  try {
    await indexedDBManager.init();
    _dbReady = true;
    return true;
  } catch {
    return false;
  }
}

interface CacheWriteTask {
  storeName: string;
  type: 'list' | 'item' | 'delete';
  data?: any;
  id?: any;
}

interface CacheEntry {
  key: string;
  storeName: string;
  timestamp: number;
  hitCount: number;
}

const _cacheWriteQueue: CacheWriteTask[] = [];
let _cacheWriting = false;
const _cacheMeta: Map<string, CacheEntry> = new Map();
const MAX_CACHE_ENTRIES = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_META_STORAGE_KEY = 'panda_cache_meta';
const TIME_SYNC_INTERVAL = 30 * 60 * 1000;

// ========== 缓存预加载策略 ==========
interface PreloadConfig {
  enabled: boolean;
  priority: number;
  endpoint: string;
  condition?: () => boolean;
}

const PRELOAD_CONFIGS: PreloadConfig[] = [
  { enabled: true, priority: 1, endpoint: '/ships' },
  { enabled: true, priority: 2, endpoint: '/schedules' },
  { enabled: true, priority: 3, endpoint: '/diaries' },
  { enabled: true, priority: 4, endpoint: '/staff-history' },
  { enabled: true, priority: 5, endpoint: '/sop-flow' },
];

let _preloading = false;

export async function preloadCache(): Promise<{ loaded: number; failed: number }> {
  if (_preloading || process.server) return { loaded: 0, failed: 0 };
  _preloading = true;

  let loaded = 0;
  let failed = 0;

  try {
    const dbOk = await ensureDb();
    if (!dbOk) return { loaded: 0, failed: 0 };

    // 按优先级排序
    const configs = PRELOAD_CONFIGS
      .filter(c => c.enabled && (!c.condition || c.condition()))
      .sort((a, b) => a.priority - b.priority);

    for (const config of configs) {
      try {
        const storeName = getStoreFromUrl(config.endpoint);
        if (!storeName) continue;

        // 检查缓存是否已存在且未过期
        if (!isCacheExpired(storeName)) {
          loaded++;
          continue;
        }

        // 预加载数据
        const result = await fetch(config.endpoint).catch(() => null);
        if (result && Array.isArray(result)) {
          queueCacheWrite({ storeName, type: 'list', data: result });
          loaded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { loaded, failed };
  } finally {
    _preloading = false;
  }
}

function loadCacheMeta() {
  if (process.server) return;
  try {
    const stored = localStorage.getItem(CACHE_META_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach(entry => {
          _cacheMeta.set(entry.key, entry);
        });
      }
    }
  } catch (e) {
    console.warn('[useApi] 加载缓存元数据失败', e);
  }
}

function saveCacheMeta() {
  if (process.server) return;
  try {
    const entries = Array.from(_cacheMeta.values());
    localStorage.setItem(CACHE_META_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('[useApi] 保存缓存元数据失败', e);
  }
}

loadCacheMeta();

async function flushCacheQueue() {
  if (_cacheWriting || _cacheWriteQueue.length === 0) return;
  _cacheWriting = true;
  try {
    const dbOk = await ensureDb();
    if (!dbOk) { _cacheWriteQueue.length = 0; return; }
    while (_cacheWriteQueue.length > 0) {
      const task = _cacheWriteQueue.shift()!;
      try {
        if (task.type === 'list' && Array.isArray(task.data)) {
          await indexedDBManager.clear(task.storeName);
          for (const item of task.data) {
            await indexedDBManager.put(task.storeName, item);
          }
          _cacheMeta.set(task.storeName, {
            key: task.storeName,
            storeName: task.storeName,
            timestamp: Date.now(),
            hitCount: 1,
          });
        } else if (task.type === 'item' && task.data) {
          await indexedDBManager.put(task.storeName, task.data);
          const existing = _cacheMeta.get(task.storeName);
          if (existing) {
            existing.timestamp = Date.now();
            existing.hitCount++;
          } else {
            _cacheMeta.set(task.storeName, {
              key: task.storeName,
              storeName: task.storeName,
              timestamp: Date.now(),
              hitCount: 1,
            });
          }
        } else if (task.type === 'delete' && task.id !== undefined) {
          try { await indexedDBManager.delete(task.storeName, task.id); } catch {}
        }
      } catch {}
    }
    await evictCacheIfNeeded();
  } finally {
    _cacheWriting = false;
  }
}

async function evictCacheIfNeeded() {
  if (_cacheMeta.size <= MAX_CACHE_ENTRIES) return;

  const expired = Array.from(_cacheMeta.values())
    .filter(e => Date.now() - e.timestamp > CACHE_TTL_MS)
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const entry of expired) {
    try {
      await indexedDBManager.clear(entry.storeName);
      _cacheMeta.delete(entry.key);
    } catch {}
  }

  if (_cacheMeta.size > MAX_CACHE_ENTRIES) {
    const lru = Array.from(_cacheMeta.values())
      .sort((a, b) => a.hitCount - b.hitCount || a.timestamp - b.timestamp)
      .slice(0, _cacheMeta.size - MAX_CACHE_ENTRIES);

    for (const entry of lru) {
      try {
        await indexedDBManager.clear(entry.storeName);
        _cacheMeta.delete(entry.key);
      } catch {}
    }
  }

  saveCacheMeta();
}

function queueCacheWrite(task: CacheWriteTask) {
  if (process.server) return;
  _cacheWriteQueue.push(task);
  flushCacheQueue();
  setTimeout(saveCacheMeta, 0);
}

function isCacheExpired(storeName: string): boolean {
  const entry = _cacheMeta.get(storeName);
  if (!entry) return true;
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

function incrementCacheHit(storeName: string): void {
  const entry = _cacheMeta.get(storeName);
  if (entry) {
    entry.hitCount++;
  }
}

let _timeOffset = 0;
let _timeSynced = false;
let _timeSyncTimer: any = null;

/** 重置 API 内部状态（用于测试） */
export function resetApiState() {
  _timeSynced = false;
  _timeOffset = 0;
  if (_timeSyncTimer) {
    clearInterval(_timeSyncTimer);
    _timeSyncTimer = null;
  }
  _pendingRequests.clear();
  _cacheMeta.clear();
  _cacheWriteQueue.length = 0;
  resetCacheStats();
  _dbReady = false;
}

async function syncServerTime(apiBase: string, token?: string) {
  if (_timeSynced || process.server) return;
  try {
    const t0 = Date.now();
    const res = await $fetch(`${apiBase}/sync/server-time`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const t1 = Date.now();
    const serverTime = (res as any)?.data?.serverTime;
    if (serverTime) {
      const rtt = t1 - t0;
      _timeOffset = serverTime - (t0 + rtt / 2);
      _timeSynced = true;
    }
  } catch {
  }
}

function startPeriodicTimeSync(apiBase: string, token?: string) {
  if (_timeSyncTimer || process.server) return;
  _timeSyncTimer = setInterval(() => {
    if (navigator.onLine) {
      _timeSynced = false;
      syncServerTime(apiBase, token);
    }
  }, TIME_SYNC_INTERVAL);
}

function getAdjustedTime(): number {
  return Date.now() + _timeOffset;
}

// ========== 请求去重机制 ==========
const _pendingRequests = new Map<string, Promise<any>>();

function getPendingKey(url: string, options: any): string {
  // 仅对 GET 请求去重，key 包含 url + 排序后的参数
  const method = (options.method?.toUpperCase() || 'GET');
  if (method !== 'GET') return '';
  const bodyKey = options.body ? JSON.stringify(options.body) : '';
  return `${url}|${bodyKey}`;
}

function cleanupPendingRequest(key: string) {
  _pendingRequests.delete(key);
}

// ========== 缓存统计 ==========
interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  networkRequests: number;
  networkErrors: number;
  offlineFallbacks: number;
  totalResponseTime: number;
  bytesSaved: number;
  lastResetTime: number;
}

const _cacheStats: CacheStats = {
  totalRequests: 0,
  cacheHits: 0,
  networkRequests: 0,
  networkErrors: 0,
  offlineFallbacks: 0,
  totalResponseTime: 0,
  bytesSaved: 0,
  lastResetTime: Date.now(),
};

function recordCacheHit(storeName: string, data: any[]) {
  _cacheStats.cacheHits++;
  // 估算节省流量：每个对象平均 500B
  const estimatedSize = data.length * 500;
  _cacheStats.bytesSaved += estimatedSize;
}

function recordNetworkRequest(durationMs: number) {
  _cacheStats.networkRequests++;
  _cacheStats.totalResponseTime += durationMs;
}

function recordNetworkError() {
  _cacheStats.networkErrors++;
}

function recordOfflineFallback() {
  _cacheStats.offlineFallbacks++;
}

export function getCacheStats(): CacheStats & {
  hitRate: number;
  avgResponseTime: number;
  estimatedKbSaved: number;
} {
  const total = _cacheStats.totalRequests;
  return {
    ..._cacheStats,
    hitRate: total > 0 ? Math.round((_cacheStats.cacheHits / total) * 1000) / 10 : 0,
    avgResponseTime: _cacheStats.networkRequests > 0 ? Math.round(_cacheStats.totalResponseTime / _cacheStats.networkRequests) : 0,
    estimatedKbSaved: Math.round(_cacheStats.bytesSaved / 1024),
  };
}

export function resetCacheStats() {
  _cacheStats.totalRequests = 0;
  _cacheStats.cacheHits = 0;
  _cacheStats.networkRequests = 0;
  _cacheStats.networkErrors = 0;
  _cacheStats.offlineFallbacks = 0;
  _cacheStats.totalResponseTime = 0;
  _cacheStats.bytesSaved = 0;
  _cacheStats.lastResetTime = Date.now();
}

/** 清理缓存元数据（用于测试或手动刷新） */
export function clearCacheMeta() {
  _cacheMeta.clear();
  _cacheWriteQueue.length = 0;
  if (process.client) {
    try {
      localStorage.removeItem(CACHE_META_STORAGE_KEY);
    } catch {}
  }
}

/**
 * 统一错误码到友好消息的映射
 * 前端专用，只包含需要向用户展示的错误
 */
const ErrorMessageMap: Record<string, string> = {
  // 400xxx: 参数错误
  '400001': '参数无效，请检查输入',
  '400002': '缺少必要参数',
  '400003': '参数类型错误',
  '400004': '参数值超出范围',
  '400101': '日期格式无效',
  '400102': '日期范围无效',

  // 401xxx: 认证错误
  '401001': '未提供认证令牌',
  '401002': '认证令牌无效',
  '401003': '登录已过期，请重新登录',
  '401004': '用户名或密码错误',
  '401005': '账户已被锁定，请稍后再试',
  '401006': '账户已被禁用',

  // 403xxx: 权限错误
  '403001': '您没有执行此操作的权限',
  '403002': '您的角色无权执行此操作',
  '403003': '该资源不属于您，无权操作',
  '403004': '此操作不被允许',

  // 404xxx: 资源不存在
  '404000': '请求的资源不存在',
  '404001': '用户不存在',
  '404002': '船舶不存在',
  '404003': '日记不存在',
  '404004': '日程不存在',
  '404005': '任务不存在',
  '404006': '文件不存在',
  '404007': '经验分享不存在',
  '404008': '党建活动不存在',
  '404009': '船员不存在',

  // 409xxx: 冲突错误
  '409001': '数据已存在，请勿重复创建',
  '409002': '相同数据已存在',
  '409003': '状态转换无效',

  // 422xxx: 业务逻辑错误
  '422000': '业务处理失败',
  '422001': '该日期的日记已存在',
  '422002': '日程已完成，无需重复操作',
  '422003': '状态流转无效',
  '422004': '当前状态下不允许此操作',

  // 500xxx: 服务器错误
  '500000': '服务器内部错误，请稍后再试',
  '500001': '数据库操作失败',
  '500002': '外部服务调用失败',
  '500003': '文件上传失败',
};

/**
 * 归一化错误消息：NestJS ValidationPipe 返回的 message 常为 string[]，需转为单字符串
 * 同时兼容 object（取 message 字段）、其他类型转字符串
 */
function normalizeMessage(raw: any): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => normalizeMessage(item))
      .filter(Boolean)
      .join('；');
  }
  if (typeof raw === 'object') {
    // 常见结构：{ message: 'xxx' } 或 { constraints: { ... } }
    if (raw.message) return normalizeMessage(raw.message);
    if (raw.constraints) {
      return Object.values(raw.constraints)
        .map((v) => String(v))
        .join('；');
    }
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }
  try { return String(raw); } catch { return ''; }
}

/**
 * 根据错误码获取友好消息
 */
function getFriendlyMessage(code: string | undefined, defaultMessage: any): string {
  if (code && ErrorMessageMap[code]) {
    return ErrorMessageMap[code];
  }
  return normalizeMessage(defaultMessage) || '请求失败';
}

export const useApi = () => {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();

  // SSR端使用完整URL（服务器内部访问localhost），浏览器端使用相对路径（通过Nuxt代理）
  const apiBase = process.server ? config.public.apiBase : '/api';

  const apiFetch = async (url: string, options: any = {}) => {
    const method = (options.method?.toUpperCase() || 'GET');
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const storeName = getStoreFromUrl(url);
    const isOffline = process.client && !navigator.onLine;

    _cacheStats.totalRequests++;

    // 首次请求时同步服务器时间（用于冲突检测时间校准）
    if (process.client && !_timeSynced && !isOffline && authStore.token) {
      syncServerTime(apiBase, authStore.token);
      startPeriodicTimeSync(apiBase, authStore.token);
    }

    // 离线读：从本地缓存读取（仅列表端点返回数组，单条端点尝试按日期/ID匹配）
    if (process.client && !isWrite && storeName && isOffline) {
      const dbOk = await ensureDb();
      if (dbOk) {
        try {
          // 仅列表端点（URL_STORE_MAP 中直接存在的路径）直接返回 getAll 数组
          if (isListEndpoint(url)) {
            const local = await indexedDBManager.getAll<any>(storeName);
            if (local && local.length > 0) {
              incrementCacheHit(storeName);
              recordCacheHit(storeName, local);
              recordOfflineFallback();
              return local;
            }
          } else {
            // 单条端点：尝试从缓存中按条件匹配（如 by-date 按 date 字段，/:id 按 id 字段）
            const local = await indexedDBManager.getAll<any>(storeName);
            if (local && local.length > 0) {
              let matched: any = null;
              const id = extractIdFromUrl(url);
              // 按日期查询：/diaries/by-date?date=xxx
              if (url.includes('/by-date')) {
                const queryDate = new URLSearchParams(url.split('?')[1] || '').get('date');
                if (queryDate) {
                  const targetDate = new Date(queryDate);
                  targetDate.setHours(0, 0, 0, 0);
                  const targetTs = targetDate.getTime();
                  for (const item of local) {
                    if (item.date) {
                      const itemDate = new Date(item.date);
                      itemDate.setHours(0, 0, 0, 0);
                      if (itemDate.getTime() === targetTs) {
                        matched = item;
                        break;
                      }
                    }
                  }
                }
              } else if (id !== null) {
                // 按 ID 查询：/diaries/:id
                matched = local.find((item: any) => String(item.id) === String(id));
              }
              if (matched) {
                incrementCacheHit(storeName);
                recordOfflineFallback();
                return matched;
              }
            }
          }
        } catch {}
      }
    }

    // 在线但缓存未过期：优先读缓存（仅列表端点，单条端点强制走网络，避免按日期/ID匹配不精确导致的问题）
    if (process.client && !isWrite && storeName && !isOffline && !isCacheExpired(storeName) && isListEndpoint(url)) {
      const dbOk = await ensureDb();
      if (dbOk) {
        try {
          const local = await indexedDBManager.getAll<any>(storeName);
          if (local && local.length > 0) {
            incrementCacheHit(storeName);
            recordCacheHit(storeName, local);
            return local;
          }
        } catch {}
      }
    }

    // 离线写：写入本地并入队
    if (process.client && isWrite && storeName && isOffline) {
      const dbOk = await ensureDb();
      if (dbOk) {
        try {
          const { useSyncQueue } = await import('./useSyncQueue');
          const syncQueue = useSyncQueue();
          if (method === 'POST') {
            const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const tempData = { ...(options.body || {}), id: tempId, _localCreated: true, _syncPending: true };
            await indexedDBManager.put(storeName, tempData);
            await syncQueue.enqueue(storeName, 'create', tempId, options.body);
            return tempData;
          } else if (method === 'PUT' || method === 'PATCH') {
            const id = extractIdFromUrl(url);
            if (id !== null) {
              const existing = await indexedDBManager.get(storeName, id);
              const updated = { ...(existing || {}), ...options.body };
              await indexedDBManager.put(storeName, updated);
              await syncQueue.enqueue(storeName, 'update', id, options.body);
              return updated;
            }
          } else if (method === 'DELETE') {
            const id = extractIdFromUrl(url);
            if (id !== null) {
              try { await indexedDBManager.delete(storeName, id); } catch {}
              await syncQueue.enqueue(storeName, 'delete', id);
              return { success: true };
            }
          }
        } catch {}
      }
    }

    // 请求去重：相同 GET 请求合并为同一个 Promise
    const pendingKey = getPendingKey(url, options);
    if (pendingKey && _pendingRequests.has(pendingKey)) {
      return _pendingRequests.get(pendingKey)!;
    }

    const requestStart = Date.now();
    const networkPromise = (async () => {
      try {
        const result = await $fetch(`${apiBase}${url}`, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
          },
        });

        recordNetworkRequest(Date.now() - requestStart);

        // 读操作成功后缓存到本地（串行写入队列，避免竞态）
        if (process.client && !isWrite && storeName && isListEndpoint(url) && Array.isArray(result)) {
          queueCacheWrite({ storeName, type: 'list', data: result });
        }

        // 写操作成功后更新本地缓存 + 让缓存元数据过期（强制下次列表请求走网络刷新）
        if (process.client && isWrite && storeName) {
          // 让缓存立即过期：删除该 store 的 meta，下次读就会走网络
          _cacheMeta.delete(storeName);
          saveCacheMeta();

          if (result && !Array.isArray(result)) {
            if (method === 'POST') {
              queueCacheWrite({ storeName, type: 'item', data: result });
            } else if (method === 'PUT' || method === 'PATCH') {
              const id = extractIdFromUrl(url);
              if (id !== null) {
                (async () => {
                  const dbOk = await ensureDb();
                  if (!dbOk) return;
                  try {
                    const existing = await indexedDBManager.get(storeName, id);
                    queueCacheWrite({ storeName, type: 'item', data: { ...(existing || {}), ...result } });
                  } catch {}
                })();
              }
            } else if (method === 'DELETE') {
              const id = extractIdFromUrl(url);
              if (id !== null) {
                queueCacheWrite({ storeName, type: 'delete', id });
              }
            }
          }
        }

        return result;
      } catch (error: any) {
        recordNetworkError();
        throw error;
      } finally {
        cleanupPendingRequest(pendingKey);
      }
    })();

    if (pendingKey) {
      _pendingRequests.set(pendingKey, networkPromise);
    }

    try {
      return await networkPromise;
    } catch (error: any) {
      // 网络失败时降级读本地（列表端点返回数组，单条端点按条件匹配）
      if (process.client && !isWrite && storeName && isNetworkError(error)) {
        const dbOk = await ensureDb();
        if (dbOk) {
          try {
            const local = await indexedDBManager.getAll<any>(storeName);
            if (local && local.length > 0) {
              if (isListEndpoint(url)) {
                return local;
              }
              // 单条端点：尝试按条件匹配
              let matched: any = null;
              const id = extractIdFromUrl(url);
              if (url.includes('/by-date')) {
                const queryDate = new URLSearchParams(url.split('?')[1] || '').get('date');
                if (queryDate) {
                  const targetDate = new Date(queryDate);
                  targetDate.setHours(0, 0, 0, 0);
                  const targetTs = targetDate.getTime();
                  for (const item of local) {
                    if (item.date) {
                      const itemDate = new Date(item.date);
                      itemDate.setHours(0, 0, 0, 0);
                      if (itemDate.getTime() === targetTs) {
                        matched = item;
                        break;
                      }
                    }
                  }
                }
              } else if (id !== null) {
                matched = local.find((item: any) => String(item.id) === String(id));
              }
              if (matched) return matched;
            }
          } catch {}
        }
      }

      const status = error?.response?.status || error?.status || error?.statusCode;
      const responseData = error?.response?._data || error?.data || {};
      const code = responseData.code !== undefined && responseData.code !== null ? String(responseData.code) : undefined;
      const serverMessage = responseData.message || error?.message;
      const silent = options.silent === true;

      const friendlyMessage = getFriendlyMessage(code, serverMessage || '请求失败');

      if (status === 401 || code?.startsWith('401')) {
        authStore.logout();
        if (process.client && !silent) ElMessage.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      if (status === 403 || code?.startsWith('403')) {
        if (process.client && !silent) ElMessage.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      if (status === 404 || code?.startsWith('404')) {
        if (process.client && !silent) ElMessage.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      if (status === 409 || code?.startsWith('409')) {
        if (process.client && !silent) ElMessage.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      if (status === 422 || code?.startsWith('422')) {
        if (process.client && !silent) ElMessage.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      if (status === 500 || code?.startsWith('500')) {
        if (process.client && !silent) ElMessage.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      // 其他错误，统一提示（注意：必须包装为字符串Error，避免把原始responseData的message数组透传到上层）
      const finalMessage = normalizeMessage(friendlyMessage) || normalizeMessage(serverMessage) || '请求失败';
      if (process.client) {
        ElMessage.error(finalMessage);
      }
      throw new Error(finalMessage);
    }
  };

  return {
    ships: {
      getAll: () => apiFetch('/ships'),
      getOne: (id: number) => apiFetch(`/ships/${id}`),
      getTimeline: (id: number) => apiFetch(`/ships/${id}/timeline`),
      getAnalysis: (id: number) => apiFetch(`/ships/${id}/analysis`),
      getDynamicStatusByDate: (dayOffset: number = 0) => apiFetch(`/ships/dynamic-status/by-date?dayOffset=${dayOffset}`),
      create: (data: Partial<Ship>) => apiFetch('/ships', { method: 'POST', body: data }),
      update: (id: number, data: Partial<Ship>) => apiFetch(`/ships/${id}`, { method: 'PATCH', body: data }),
      // 解析粘贴的船舶报告文本（预览，不写库）
      parseReport: (text: string) => apiFetch('/ships/parse-report', { method: 'POST', body: { text } }),
      // 确认后批量更新船舶动态字段
      batchUpdateDynamic: (updates: Array<{ shipId: number; parsed: any }>) => apiFetch('/ships/batch-dynamic', { method: 'POST', body: { updates } }),
      // 解析粘贴的政委报告文本（预览，不写库）
      parsePoliticalReport: (text: string) => apiFetch('/ships/parse-political-report', { method: 'POST', body: { text } }),
      // 确认后批量更新政委报告字段
      batchUpdatePolitical: (updates: Array<{ shipId: number; parsed: any }>) => apiFetch('/ships/batch-political', { method: 'POST', body: { updates } }),
      delete: (id: number) => apiFetch(`/ships/${id}`, { method: 'DELETE' }),
      clearData: (shipIds: number[]) => apiFetch('/ships/clear-data', { method: 'POST', body: { shipIds } }),
      uploadPhoto: (id: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return $fetch(`${apiBase}/ships/${id}/photo`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
          },
        });
      },
      deletePhoto: (id: number) => apiFetch(`/ships/${id}/photo`, { method: 'DELETE' }),
    },

    schedules: {
      getAll: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return apiFetch(`/schedules?${params.toString()}`);
      },
      getOne: (id: number) => apiFetch(`/schedules/${id}`),
      create: (data: CreateScheduleRequest) => apiFetch('/schedules', { method: 'POST', body: data }),
      update: (id: number, data: Partial<CreateScheduleRequest>) =>
        apiFetch(`/schedules/${id}`, { method: 'PATCH', body: data }),
      delete: (id: number) => apiFetch(`/schedules/${id}`, { method: 'DELETE' }),
      // 分类统计
      getDailyStats: (date: string) => apiFetch(`/schedules/stats/daily?date=${date}`),
      getStatsByShip: (startDate: string, endDate: string) => apiFetch(`/schedules/stats/by-ship?startDate=${startDate}&endDate=${endDate}`),
      getTrendStats: (startDate: string, endDate: string) => apiFetch(`/schedules/stats/trend?startDate=${startDate}&endDate=${endDate}`),
      getStatsByUser: (userId: number, startDate: string, endDate: string) => apiFetch(`/schedules/stats/by-user?userId=${userId}&startDate=${startDate}&endDate=${endDate}`),
      // 分类字典
      getDictCategories: (type?: string, parentId?: number) => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (parentId !== undefined) params.append('parentId', String(parentId));
        return apiFetch(`/schedules/dict/categories?${params.toString()}`);
      },
      // 批量创建
      bulkCreate: (items: any[]) => apiFetch('/schedules/bulk-create', { method: 'POST', body: { items } }),
    },

    dict: {
      getFirstTypes: (role?: string) => {
        const params = role ? `?role=${role}` : '';
        return apiFetch(`/dict/first-types${params}`);
      },
      getSecondTypes: (parentId?: number, role?: string) => {
        const params = new URLSearchParams();
        if (parentId !== undefined) params.append('parentId', String(parentId));
        if (role) params.append('role', role);
        const query = params.toString();
        return apiFetch(`/dict/second-types${query ? '?' + query : ''}`);
      },
      create: (data: Partial<DictCategory>) => apiFetch('/dict', { method: 'POST', body: data }),
      update: (id: number, data: Partial<DictCategory>) => apiFetch(`/dict/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/dict/${id}`, { method: 'DELETE' }),
      updateUserPermissions: (data: { userId: number; canEditAll: boolean; editableCategoryIds: number[] }) => apiFetch('/dict/user-permissions', { method: 'POST', body: data }),
      // 批量导入
      batchCreate: (items: any[]) => apiFetch('/dict/batch', { method: 'POST', body: { items } }),
      importFromText: (text: string) => apiFetch('/dict/import', { method: 'POST', body: { text } }),
    },

    // 标准任务库
    standardTaskTemplates: {
      getAll: () => apiFetch('/standard-task-templates'),
      getByCategory: (firstType: string) => apiFetch(`/standard-task-templates/by-category?firstType=${encodeURIComponent(firstType)}`),
      getOne: (id: number) => apiFetch(`/standard-task-templates/${id}`),
      create: (data: any) => apiFetch('/standard-task-templates', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/standard-task-templates/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/standard-task-templates/${id}`, { method: 'DELETE' }),
      batchCreate: (items: any[]) => apiFetch('/standard-task-templates/batch', { method: 'POST', body: { items } }),
      importFromText: (text: string) => apiFetch('/standard-task-templates/import', { method: 'POST', body: { text } }),
    },

    diary: {
      getAll: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return apiFetch(`/diaries?${params.toString()}`);
      },
      getByDate: (date: string) => apiFetch(`/diaries/by-date?date=${date}`),
      getOne: (id: number) => apiFetch(`/diaries/${id}`),
      create: (data: any) => apiFetch('/diaries', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/diaries/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/diaries/${id}`, { method: 'DELETE' }),
      // 关联日程
      getRelatedSchedules: (diaryId: number) => apiFetch(`/diaries/${diaryId}/schedules`),
      addRelatedSchedules: (diaryId: number, scheduleIds: number[]) => apiFetch(`/diaries/${diaryId}/schedules`, { method: 'POST', body: { scheduleIds } }),
      removeRelatedSchedule: (diaryId: number, scheduleId: number) => apiFetch(`/diaries/${diaryId}/schedules/${scheduleId}`, { method: 'DELETE' }),
      getTodaySchedulesAvailable: (date?: string) => {
        const params = date ? `?date=${date}` : '';
        return apiFetch(`/diaries/today/schedules-available${params}`);
      },
      // 权限信息
      getByPermission: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return apiFetch(`/diaries/by-permission?${params.toString()}`);
      },
      getPermissionInfo: () => apiFetch('/diaries/permission-info'),
      // 双视角查询
      getByShipView: (shipId: number) => apiFetch(`/diaries/ship-view/${shipId}`),
      getByPersonalView: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return apiFetch(`/diaries/personal-view?${params.toString()}`);
      },
    },

    staffHistory: {
      getAll: () => apiFetch('/staff-history'),
      getByShipId: (shipId: number) => apiFetch(`/staff-history/ship/${shipId}`),
      getCurrentStaff: (shipId: number, date?: string) => {
        const params = date ? `?date=${date}` : '';
        return apiFetch(`/staff-history/current/${shipId}${params}`);
      },
      create: (data: CreateStaffHistoryRequest) => apiFetch('/staff-history', { method: 'POST', body: data }),
      update: (id: number, data: UpdateStaffHistoryRequest) => apiFetch(`/staff-history/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/staff-history/${id}`, { method: 'DELETE' }),
    },

    sopFlow: {
      getAll: () => apiFetch('/sop-flow'),
      getByType: (firstType?: string, secondType?: string) => {
        const params = new URLSearchParams();
        if (firstType) params.append('firstType', firstType);
        if (secondType) params.append('secondType', secondType);
        return apiFetch(`/sop-flow/type?${params.toString()}`);
      },
      getOne: (id: number) => apiFetch(`/sop-flow/${id}`),
      create: (data: CreateSopFlowRequest) => apiFetch('/sop-flow', { method: 'POST', body: data }),
      update: (id: number, data: UpdateSopFlowRequest) => apiFetch(`/sop-flow/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/sop-flow/${id}`, { method: 'DELETE' }),
    },

    publicCase: {
      getAll: (caseType?: string) => {
        const params = caseType ? `?caseType=${caseType}` : '';
        return apiFetch(`/public-case${params}`);
      },
      getOne: (id: number) => apiFetch(`/public-case/${id}`),
      create: (data: CreatePublicCaseRequest) => apiFetch('/public-case', { method: 'POST', body: data }),
      delete: (id: number) => apiFetch(`/public-case/${id}`, { method: 'DELETE' }),
    },

    operationLog: {
      getAll: (page = 1, pageSize = 20) => {
        return apiFetch(`/operation-log?page=${page}&pageSize=${pageSize}`);
      },
    },

    aiBrief: {
      generate: (date: string) => apiFetch(`/ai-brief/generate?date=${date}`),
      generateRange: (startDate: string, endDate: string, type: string) => 
        apiFetch(`/ai-brief/generate-range?startDate=${startDate}&endDate=${endDate}&type=${type}`),
    },

    aiCategorization: {
      suggest: (content: string, role?: string) => apiFetch('/ai-categorization/suggest', { 
        method: 'POST', 
        body: { content, role } 
      }),
      suggestExperience: (title: string, content: string) => apiFetch('/ai-categorization/suggest-experience', {
        method: 'POST',
        body: { title, content }
      }),
    },

    sync: {
      sync: (data: any) => apiFetch('/sync', { method: 'POST', body: data }),
    },

    ports: {
      getAll: (search?: string) => {
        const params = search ? `?search=${search}` : '';
        return apiFetch(`/ports${params}`);
      },
      getOne: (id: number) => apiFetch(`/ports/${id}`),
      create: (data: any) => apiFetch('/ports', { method: 'POST', body: data }),
    },
    port: {
      getAll: (search?: string) => {
        const params = search ? `?search=${search}` : '';
        return apiFetch(`/ports${params}`);
      },
      getOne: (id: number) => apiFetch(`/ports/${id}`),
    },

    publishTemplates: {
      create: (data: CreatePublishTemplateRequest) => apiFetch('/publish-templates', { method: 'POST', body: data }),
      list: () => apiFetch('/publish-templates'),
      get: (id: number) => apiFetch(`/publish-templates/${id}`),
      update: (id: number, data: UpdatePublishTemplateRequest) => apiFetch(`/publish-templates/${id}`, { method: 'PUT', body: data }),
      remove: (id: number) => apiFetch(`/publish-templates/${id}`, { method: 'DELETE' }),
      saveAsDraft: (id: number) => apiFetch(`/publish-templates/${id}/draft`, { method: 'POST' }),
      publish: (id: number) => apiFetch(`/publish-templates/${id}/publish`, { method: 'POST' }),
    },

    shipTasks: {
      list: (shipId?: number, templateType?: string) => {
        const params = new URLSearchParams();
        if (shipId) params.append('shipId', String(shipId));
        if (templateType) params.append('templateType', templateType);
        const query = params.toString();
        return apiFetch(`/ship-tasks${query ? '?' + query : ''}`);
      },
      update: (id: number, data: any) => apiFetch(`/ship-tasks/${id}`, { method: 'PUT', body: data }),
      trigger: (templateId: number, shipId?: number) => {
        const params = new URLSearchParams();
        params.append('templateId', String(templateId));
        if (shipId) params.append('shipId', String(shipId));
        return apiFetch(`/ship-tasks/trigger?${params.toString()}`, { method: 'POST' });
      },
    },

    experiences: {
      getAll: (params?: { category?: string; keyword?: string; sortField?: string; sortOrder?: string; page?: number; pageSize?: number }) => {
        const urlParams = new URLSearchParams();
        if (params?.category) urlParams.append('category', params.category);
        if (params?.keyword) urlParams.append('keyword', params.keyword);
        if (params?.sortField) urlParams.append('sortField', params.sortField);
        if (params?.sortOrder) urlParams.append('sortOrder', params.sortOrder);
        if (params?.page) urlParams.append('page', String(params.page));
        if (params?.pageSize) urlParams.append('pageSize', String(params.pageSize));
        const query = urlParams.toString();
        return apiFetch(`/experiences${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/experiences/${id}`),
      create: (data: CreateExperienceRequest) => apiFetch('/experiences', { method: 'POST', body: data }),
      update: (id: number, data: Partial<CreateExperienceRequest>) => apiFetch(`/experiences/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/experiences/${id}`, { method: 'DELETE' }),
      rate: (id: number, data: RateExperienceRequest) => apiFetch(`/experiences/${id}/rate`, { method: 'POST', body: data }),
      like: (id: number) => apiFetch(`/experiences/${id}/like`, { method: 'POST' }),
      comment: (id: number, data: { content: string; parentId?: number; replyToUserId?: number }) => apiFetch(`/experiences/${id}/comment`, { method: 'POST', body: data }),
      deleteComment: (experienceId: number, commentId: number) => apiFetch(`/experiences/${experienceId}/comment/${commentId}`, { method: 'DELETE' }),
      // 分类目录
      getCategories: () => apiFetch('/experiences/categories/tree'),
      createCategory: (data: { name: string; icon?: string; color?: string; parentId?: number; sortOrder?: number }) => apiFetch('/experiences/categories', { method: 'POST', body: data }),
      updateCategory: (id: number, data: { name?: string; icon?: string; color?: string; sortOrder?: number; isExpanded?: boolean }) => apiFetch(`/experiences/categories/${id}`, { method: 'PUT', body: data }),
      deleteCategory: (id: number) => apiFetch(`/experiences/categories/${id}`, { method: 'DELETE' }),
      // 权限管理
      getUserPermissions: () => apiFetch('/experiences/permissions/user'),
      getAllPermissions: () => apiFetch('/experiences/permissions/all'),
      grantPermission: (data: { userId: number; permissionType: string; reason?: string; expiresAt?: string }) => apiFetch('/experiences/permissions/grant', { method: 'POST', body: data }),
      revokePermission: (data: { userId: number; permissionType: string }) => apiFetch('/experiences/permissions/revoke', { method: 'POST', body: data }),
      checkPermission: (type: string) => apiFetch(`/experiences/permissions/check?type=${type}`),
    },

    tasks: {
      getTree: () => apiFetch('/tasks/tree'),
      create: (data: CreateTaskRequest) => apiFetch('/tasks', { method: 'POST', body: data }),
      update: (id: number, data: UpdateTaskRequest) => apiFetch(`/tasks/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
    },

    files: {
      getAll: (category?: string, isPublic?: string) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (isPublic) params.append('isPublic', isPublic);
        const query = params.toString();
        return apiFetch(`/files${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/files/${id}`),
      create: (data: CreateFileRecordRequest) => apiFetch('/files', { method: 'POST', body: data }),
      update: (id: number, data: UpdateFileRecordRequest) => apiFetch(`/files/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/files/${id}`, { method: 'DELETE' }),
      download: (id: number) => apiFetch(`/files/${id}/download`, { method: 'POST' }),
      upload: (file: File, description?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (description) formData.append('description', description);
        return $fetch(`${apiBase}/files/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
          },
        });
      },
    },

    portCheck: {
      createTemplate: (data: CreatePortCheckTemplateRequest) => apiFetch('/port-check/templates', { method: 'POST', body: data }),
      listTemplates: () => apiFetch('/port-check/templates'),
      updateTemplate: (id: number, data: any) => apiFetch(`/port-check/templates/${id}`, { method: 'PUT', body: data }),
      listShipTasks: () => apiFetch('/port-check/ship-tasks'),
      updateTask: (id: number, data: UpdatePortCheckTaskRequest) => apiFetch(`/port-check/ship-tasks/${id}`, { method: 'PUT', body: data }),
      getDynamicStatus: () => apiFetch('/ships/dynamic-status'),
    },

    partyActivities: {
      getAll: (activityType?: string, shipId?: number, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (activityType) params.append('activityType', activityType);
        if (shipId) params.append('shipId', String(shipId));
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString();
        return apiFetch(`/party-activities${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/party-activities/${id}`),
      create: (data: CreatePartyActivityRequest) => apiFetch('/party-activities', { method: 'POST', body: data }),
      delete: (id: number) => apiFetch(`/party-activities/${id}`, { method: 'DELETE' }),
      getStatistics: () => apiFetch('/party-activities/statistics'),
    },

    thoughtReports: {
      getAll: (status?: string, concernLevel?: string, shipId?: number) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (concernLevel) params.append('concernLevel', concernLevel);
        if (shipId) params.append('shipId', String(shipId));
        const query = params.toString();
        return apiFetch(`/thought-reports${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/thought-reports/${id}`),
      create: (data: CreateThoughtReportRequest) => apiFetch('/thought-reports', { method: 'POST', body: data }),
      updateStatus: (id: number, status: string) => apiFetch(`/thought-reports/${id}/status`, { method: 'PUT', body: { status } }),
      close: (id: number) => apiFetch(`/thought-reports/${id}/close`, { method: 'PUT' }),
      getWarnings: () => apiFetch('/thought-reports/warnings'),
    },

    integrityRecords: {
      getAll: (category?: string, riskLevel?: string, status?: string, shipId?: number) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (riskLevel) params.append('riskLevel', riskLevel);
        if (status) params.append('status', status);
        if (shipId) params.append('shipId', String(shipId));
        const query = params.toString();
        return apiFetch(`/integrity-records${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/integrity-records/${id}`),
      create: (data: CreateIntegrityRecordRequest) => apiFetch('/integrity-records', { method: 'POST', body: data }),
      updateStatus: (id: number, status: string) => apiFetch(`/integrity-records/${id}/status`, { method: 'PUT', body: { status } }),
      getHighRisk: () => apiFetch('/integrity-records/high-risk'),
    },

    officerProfiles: {
      getAll: () => apiFetch('/officer-profiles'),
      getOne: (id: number) => apiFetch(`/officer-profiles/${id}`),
      refreshStats: (id: number) => apiFetch(`/officer-profiles/${id}/refresh-stats`, { method: 'POST' }),
      getEvaluations: () => apiFetch('/officer-profiles/evaluations') as Promise<OfficerEvaluation[]>,
      getMentorships: () => apiFetch('/officer-profiles/mentorships') as Promise<OfficerMentorship[]>,
    },

    meetingRecords: {
      create: (data: { title?: string; meetingDate?: string }) => apiFetch('/meeting-records', { method: 'POST', body: data }),
      list: () => apiFetch('/meeting-records'),
      getOne: (id: number) => apiFetch(`/meeting-records/${id}`),
      uploadRecording: async (id: number, formData: FormData) => {
        // File upload needs special handling - don't use apiFetch which sets JSON content-type
        const response = await $fetch(`${apiBase}/meeting-records/${id}/upload-recording`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
          },
        });
        return response;
      },
      transcribe: (id: number, transcript: string) => apiFetch(`/meeting-records/${id}/transcribe`, { method: 'POST', body: { transcript } }),
      summarize: (id: number, summary: string, actionItems?: any) => apiFetch(`/meeting-records/${id}/summarize`, { method: 'POST', body: { summary, actionItems } }),
      processRecording: (id: number) => apiFetch(`/meeting-records/${id}/process-recording`, { method: 'POST' }),
      delete: (id: number) => apiFetch(`/meeting-records/${id}`, { method: 'DELETE' }),
    },

    staffAssignments: {
      getAll: () => apiFetch('/staff-assignments'),
      getByUserId: (userId: number) => apiFetch(`/staff-assignments/user/${userId}`),
      getByShipId: (shipId: number) => apiFetch(`/staff-assignments/ship/${shipId}`),
      getCurrent: (userId: number) => apiFetch(`/staff-assignments/user/${userId}/current`),
      getHistory: (userId: number) => apiFetch(`/staff-assignments/user/${userId}/history`),
      getDiaryPermission: (userId: number) => apiFetch(`/staff-assignments/user/${userId}/permission`),
      getCurrentShipStaff: (shipId: number) => apiFetch(`/staff-assignments/ship/${shipId}/current-staff`),
      create: (data: CreateStaffAssignmentRequest) => apiFetch('/staff-assignments', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/staff-assignments/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/staff-assignments/${id}`, { method: 'DELETE' }),
      checkOut: (id: number, data: { endDate: string; reason?: string }) => apiFetch(`/staff-assignments/${id}/checkout`, { method: 'POST', body: data }),
      startLeave: (id: number, data: { startDate: string; endDate?: string; reason?: string }) => apiFetch(`/staff-assignments/${id}/leave`, { method: 'POST', body: data }),
      endLeave: (id: number) => apiFetch(`/staff-assignments/${id}/end-leave`, { method: 'POST' }),
      initializeFromShips: () => apiFetch('/staff-assignments/initialize-from-ships', { method: 'POST' }),
    },

    accounts: {
      list: (params: { page: number; pageSize: number; search?: string; role?: string; teamCode?: string }) => {
        const q = new URLSearchParams();
        q.append('page', String(params.page));
        q.append('limit', String(params.pageSize));
        if (params.search) q.append('search', params.search);
        if (params.role) q.append('role', params.role);
        if (params.teamCode) q.append('teamCode', params.teamCode);
        return apiFetch(`/accounts?${q.toString()}`);
      },
      getOne: (id: number) => apiFetch(`/accounts/${id}`),
      create: (data: any) => apiFetch('/accounts', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/accounts/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/accounts/${id}`, { method: 'DELETE' }),
      resetPassword: (id: number, data: { newPassword: string }) => apiFetch(`/accounts/${id}/reset-password`, { method: 'POST', body: data }),
      changePassword: (data: { oldPassword: string; newPassword: string }) => apiFetch('/accounts/change-password', { method: 'POST', body: data }),
      lookup: (workId: string) => apiFetch('/accounts/lookup', { method: 'POST', body: { workId } }),
      batchImport: (formData: FormData) => {
        return $fetch(`${apiBase}/accounts/batch-import`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
          },
        });
      },
      getRoles: () => apiFetch('/accounts/roles'),
    },

    fileCollections: {
      list: (teamCode?: string, status?: string) => {
        const params = new URLSearchParams();
        if (teamCode) params.append('teamCode', teamCode);
        if (status) params.append('status', status);
        const query = params.toString();
        return apiFetch(`/file-collections${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/file-collections/${id}`),
      create: (data: any) => apiFetch('/file-collections', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/file-collections/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/file-collections/${id}`, { method: 'DELETE' }),
      submit: (id: number, formData: FormData) => {
        return $fetch(`${apiBase}/file-collections/${id}/submit`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
          },
        });
      },
      downloadAll: (id: number) => apiFetch(`/file-collections/${id}/download-all`, { method: 'POST' }),
      remind: (id: number, shipIds?: number[]) => apiFetch(`/file-collections/${id}/remind`, { method: 'POST', body: { shipIds } }),
    },

    userManagement: {
      listUsers: (params: { page: number; pageSize: number; search?: string }) => {
        const q = new URLSearchParams();
        q.append('page', String(params.page));
        q.append('limit', String(params.pageSize));
        if (params.search) q.append('search', params.search);
        return apiFetch(`/admin/users?${q.toString()}`);
      },
      getUser: (id: number) => apiFetch(`/admin/users/${id}`),
      createUser: (data: any) => apiFetch('/admin/users', { method: 'POST', body: data }),
      updateUser: (id: number, data: any) => apiFetch(`/admin/users/${id}`, { method: 'PUT', body: data }),
      deleteUser: (id: number) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
      resetPassword: (id: number, data: { newPassword: string }) => apiFetch(`/admin/users/${id}/reset-password`, { method: 'POST', body: data }),
      assignRoles: (id: number, data: { roles: string[] }) => apiFetch(`/admin/users/${id}/roles`, { method: 'POST', body: data }),
      getRoles: () => apiFetch('/admin/users/roles'),
    },

    diaries: {
      getAll: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString();
        return apiFetch(`/diaries${query ? '?' + query : ''}`);
      },
      getByPermission: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString();
        return apiFetch(`/diaries/by-permission${query ? '?' + query : ''}`);
      },
      getPermissionInfo: () => apiFetch('/diaries/permission-info'),
      getByDate: (date: string) => apiFetch(`/diaries/by-date?date=${date}`),
      getOne: (id: number) => apiFetch(`/diaries/${id}`),
      create: (data: any) => apiFetch('/diaries', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/diaries/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/diaries/${id}`, { method: 'DELETE' }),
    },

    crew: {
      getAll: (search?: string, status?: string, shipId?: number) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        if (shipId) params.append('shipId', String(shipId));
        const query = params.toString();
        return apiFetch(`/crew${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/crew/${id}`),
      create: (data: any) => apiFetch('/crew', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/crew/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/crew/${id}`, { method: 'DELETE' }),
      getUpcomingBirthdays: (days?: number) => {
        const params = new URLSearchParams();
        if (days) params.append('days', String(days));
        const query = params.toString();
        return apiFetch(`/crew/birthdays?${query}`);
      },
      getBirthdaysByMonth: (year?: number, month?: number) => {
        const params = new URLSearchParams();
        if (year) params.append('year', String(year));
        if (month) params.append('month', String(month));
        const query = params.toString();
        return apiFetch(`/crew/birthdays/calendar?${query}`);
      },
      getTodayBirthdays: () => apiFetch('/crew/birthdays/today'),
    },

    healthReport: {
      getDashboard: (month: string) => apiFetch(`/health-report/dashboard?month=${month}`),
      upload: (formData: FormData) => {
        return $fetch(`${apiBase}/health-report/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
          },
        });
      },
      downloadTemplate: () => apiFetch('/health-report/download-template'),
      getShipDetail: (uploadId: number) => apiFetch(`/health-report/ship-detail?uploadId=${uploadId}`),
      saveNote: (uploadId: number, note: string) => apiFetch('/health-report/save-note', { method: 'POST', body: { uploadId, note } }),
      getUnsubmittedShips: (month: string) => apiFetch(`/health-report/unsubmitted?month=${month}`),
      generateReport: (month: string) => apiFetch('/health-report/generate-report', { method: 'POST', body: { month } }),
      getExportSummaryUrl: (month: string) => `${apiBase}/health-report/export-summary?month=${month}`,
      getExportAbnormalUrl: (month: string) => `${apiBase}/health-report/export-abnormal?month=${month}`,
      urgeSubmit: (shipId: number, month: string) => apiFetch('/health-report/urge-submit', { method: 'POST', body: { shipId, month } }),
      urgeBatch: (month: string) => apiFetch('/health-report/urge-batch', { method: 'POST', body: { month } }),
      getPrevMonthAbnormal: (shipId: number, month: string) => apiFetch(`/health-report/prev-month-abnormal?shipId=${shipId}&month=${month}`),
    },

    partyConfig: {
      listShips: () => apiFetch('/party-config/ships'),
      getShip: (shipId: number) => apiFetch(`/party-config/ship/${shipId}`),
      updateShip: (shipId: number, config: any) => apiFetch(`/party-config/ship/${shipId}`, { method: 'PUT', body: config }),
    },

    // 菜单配置（角色权限管理）
    menuConfig: {
      /** 获取当前用户角色的菜单列表 */
      getMyMenus: () => apiFetch('/menu-config/my'),
      /** 管理员获取所有角色的菜单配置 */
      getAllRoleMenus: () => apiFetch('/menu-config/admin/all'),
      /** 管理员更新指定角色的菜单配置 */
      updateRoleMenus: (role: string, menus: { menuKey: string; enabled: boolean; sortOrder?: number }[]) =>
        apiFetch(`/menu-config/admin/role/${role}`, { method: 'PUT', body: menus }),
      /** 管理员初始化默认菜单 */
      seedDefaultMenus: () => apiFetch('/menu-config/admin/seed', { method: 'PUT' }),
    },

    // 看板统计
    dashboard: {
      getScheduleStats: (date: string) => apiFetch(`/dashboard/schedule-stats?date=${date}`),
      getDiarySupplement: (date: string) => apiFetch(`/dashboard/diary-supplement?date=${date}`),
      getTrend: (endDate: string, dataSource: string = 'schedule') => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return apiFetch(`/dashboard/trend?startDate=${startDate}&endDate=${endDate}&dataSource=${dataSource}`);
      },
      getStats: (date: string, dataSource: string = 'diary') => apiFetch(`/dashboard/stats?date=${date}&dataSource=${dataSource}`),
      exportExcel: (date: string) => apiFetch(`/dashboard/export-excel?date=${date}`),
    },

    appeal: {
      getAll: (filters?: { status?: string; priority?: string; category?: string; shipId?: number; search?: string }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.priority) params.append('priority', filters.priority);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.shipId) params.append('shipId', String(filters.shipId));
        if (filters?.search) params.append('search', filters.search);
        const query = params.toString();
        return apiFetch(`/appeal${query ? '?' + query : ''}`);
      },
      getOne: (id: number) => apiFetch(`/appeal/${id}`),
      create: (data: any) => apiFetch('/appeal', { method: 'POST', body: data }),
      update: (id: number, data: any) => apiFetch(`/appeal/${id}`, { method: 'PUT', body: data }),
      updateStatus: (id: number, data: { status: string; response?: string; respondedBy?: number }) => apiFetch(`/appeal/${id}/status`, { method: 'PUT', body: data }),
      delete: (id: number) => apiFetch(`/appeal/${id}`, { method: 'DELETE' }),
      getStats: () => apiFetch('/appeal/stats'),
    },

    // 数据迁移
    migration: {
      preview: (teamCode: string) => apiFetch(`/migration/preview?teamCode=${teamCode}`),
      execute: (teamCode: string) => apiFetch('/migration/execute', { method: 'POST', body: { teamCode } }),
    },

    // 任务到期提醒Webhook
    notification: {
      // 获取Webhook配置列表
      getWebhooks: () => apiFetch('/notification/webhooks'),
      // 获取单个Webhook配置
      getWebhook: (id: number) => apiFetch(`/notification/webhooks/${id}`),
      // 创建Webhook配置
      createWebhook: (data: any) => apiFetch('/notification/webhooks', { method: 'POST', body: data }),
      // 更新Webhook配置
      updateWebhook: (id: number, data: any) => apiFetch(`/notification/webhooks/${id}`, { method: 'PUT', body: data }),
      // 删除Webhook配置
      deleteWebhook: (id: number) => apiFetch(`/notification/webhooks/${id}`, { method: 'DELETE' }),
      // 获取发送日志
      getWebhookLogs: (id: number, page = 1, pageSize = 20) => apiFetch(`/notification/webhooks/${id}/logs?page=${page}&pageSize=${pageSize}`),
      // 发送测试消息
      sendTestMessage: (id: number) => apiFetch(`/notification/webhooks/${id}/test`, { method: 'POST' }),
      // 手动触发检查
      checkReminders: () => apiFetch('/notification/check-reminders', { method: 'POST' }),
    },

    // 杂志编排
    magazine: {
      // 获取杂志模板列表
      getTemplates: () => apiFetch('/magazine/templates'),
      // 获取杂志列表
      getAll: (teamCode?: string) => {
        return apiFetch('/magazine');
      },
      // 获取杂志详情
      getById: (id: string) => apiFetch(`/magazine/${id}`),
      // 创建杂志
      create: (data: any) => apiFetch('/magazine', { method: 'POST', body: data }),
      // 更新杂志
      update: (id: string, data: any) => apiFetch(`/magazine/${id}`, { method: 'PUT', body: data }),
      // 删除杂志
      delete: (id: string) => apiFetch(`/magazine/${id}`, { method: 'DELETE' }),
      // 创建版块
      createSection: (magazineId: string, section: any) => apiFetch(`/magazine/${magazineId}/sections`, { method: 'POST', body: section }),
      // 更新版块
      updateSection: (magazineId: string, sectionId: string, section: any) => apiFetch(`/magazine/${magazineId}/sections/${sectionId}`, { method: 'PUT', body: section }),
      // 删除版块
      deleteSection: (magazineId: string, sectionId: string) => apiFetch(`/magazine/${magazineId}/sections/${sectionId}`, { method: 'DELETE' }),
      // 添加文章
      addArticle: (sectionId: string, article: any) => apiFetch(`/magazine/sections/${sectionId}/articles`, { method: 'POST', body: article }),
      // 更新文章
      updateArticle: (magazineId: string, articleId: string, article: any) => apiFetch(`/magazine/${magazineId}/articles/${articleId}`, { method: 'PUT', body: article }),
      // 删除文章
      deleteArticle: (magazineId: string, articleId: string) => apiFetch(`/magazine/${magazineId}/articles/${articleId}`, { method: 'DELETE' }),
      // 分配文章到版块
      assignArticle: (articleId: string, sectionId: string) => apiFetch(`/magazine/articles/${articleId}/assign`, { method: 'POST', body: { sectionId } }),
      // 批量导入文章
      importArticles: (sectionId: string, articles: any[]) => apiFetch(`/magazine/sections/${sectionId}/articles/import`, { method: 'POST', body: { articles } }),
      // AI分类所有文章
      classifyArticles: (magazineId: string) => apiFetch(`/magazine/${magazineId}/articles/classify`, { method: 'POST' }),
      // 获取分类建议
      getSuggestions: (magazineId: string) => apiFetch(`/magazine/${magazineId}/articles/suggestions`),
      // AI自动分配
      autoAllocate: (magazineId: string) => apiFetch(`/magazine/${magazineId}/articles/auto-allocate`, { method: 'POST' }),
      // 获取单篇文章AI建议
      getArticleSuggestion: (articleId: string) => apiFetch(`/magazine/articles/${articleId}/suggestion`),
      // 生成PDF
      generatePdf: (id: string) => apiFetch(`/magazine/${id}/generate-pdf`, { method: 'POST' }),
      
      // AI文字处理
      aiCheckText: (text: string) => apiFetch('/magazine/ai/check', { method: 'POST', body: { text } }) as Promise<{
        errors: Array<{
          position: { start: number; end: number };
          type: 'spelling' | 'grammar' | 'style';
          message: string;
          suggestions: string[];
          confidence: number;
        }>;
      }>,
      aiPolishText: (text: string) => apiFetch('/magazine/ai/polish', { method: 'POST', body: { text } }) as Promise<{
        result: string;
        changes: Array<{
          original: string;
          polished: string;
          reason: string;
        }>;
      }>,
      aiExpandText: (text: string, targetLength?: number) => apiFetch('/magazine/ai/expand', { method: 'POST', body: { text, targetLength } }) as Promise<{
        result: string;
        addedContent: string;
      }>,
      aiCondenseText: (text: string, targetLength?: number) => apiFetch('/magazine/ai/condense', { method: 'POST', body: { text, targetLength } }) as Promise<{
        result: string;
        removedContent: string;
      }>,
      aiRewriteText: (text: string, style?: string) => apiFetch('/magazine/ai/rewrite', { method: 'POST', body: { text, style } }) as Promise<{
        result: string;
        styleChanges: string[];
      }>,
      aiSuggestTitles: (text: string) => apiFetch('/magazine/ai/suggest-titles', { method: 'POST', body: { text } }) as Promise<{
        titles: Array<{
          title: string;
          style: 'formal' | 'creative' | 'question';
          reason: string;
        }>;
      }>,
    },

    // 导出原始 apiFetch 供直接使用
    apiFetch,

    // 船舶笔记（AI分析数据源）
    shipNotes: {
      getAll: () => apiFetch('/ship-notes'),
      getByShipId: (shipId: number, params?: { keyword?: string; tag?: string; sortBy?: string; sortOrder?: string }) => {
        const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
        return apiFetch(`/ship-notes/ship/${shipId}${qs}`);
      },
      getTagsByShipId: (shipId: number) => apiFetch(`/ship-notes/ship/${shipId}/tags`),
      getAIAnalysis: (shipId: number) => apiFetch(`/ship-notes/ship/${shipId}/ai-analysis`),
      getOne: (id: number) => apiFetch(`/ship-notes/${id}`),
      create: (data: { shipId: number; userId: number; content: string; source?: string; tags?: string[] }) => apiFetch('/ship-notes', { method: 'POST', body: data }),
      update: (id: number, data: { content?: string; tags?: string[]; starLevel?: number; isPinned?: boolean; sortOrder?: number }) => apiFetch(`/ship-notes/${id}`, { method: 'PUT', body: data }),
      setPinned: (id: number, isPinned: boolean) => apiFetch(`/ship-notes/${id}/pin`, { method: 'PUT', body: { isPinned } }),
      setStar: (id: number, starLevel: number) => apiFetch(`/ship-notes/${id}/star`, { method: 'PUT', body: { starLevel } }),
      moveOrder: (id: number, direction: string, shipId: number) => apiFetch(`/ship-notes/${id}/move`, { method: 'PUT', body: { direction, shipId } }),
      delete: (id: number) => apiFetch(`/ship-notes/${id}`, { method: 'DELETE' }),
    },

    // 日记行级块（日记/待办/备忘混排）
    diaryBlocks: {
      getByDiaryId: (diaryId: number) => apiFetch(`/diary-blocks/by-diary/${diaryId}`),
      getByShipId: (shipId: number) => apiFetch(`/diary-blocks/by-ship/${shipId}`),
      getOne: (id: number) => apiFetch(`/diary-blocks/${id}`),
      create: (data: {
        diaryId: number;
        sortOrder?: number;
        blockType?: 'diary' | 'todo' | 'memo' | 'image' | 'file' | 'link';
        content: string;
        todoStatus?: string;
        todoDueDate?: string;
        metaJson?: string;
        scheduleId?: number;
      }) => apiFetch('/diary-blocks', { method: 'POST', body: data, silent: true }),
      update: (id: number, data: {
        sortOrder?: number;
        blockType?: 'diary' | 'todo' | 'memo' | 'image' | 'file' | 'link';
        content?: string;
        todoStatus?: string;
        todoDueDate?: string;
        metaJson?: string;
        scheduleId?: number;
        userManuallyChangedType?: boolean;
      }) => apiFetch(`/diary-blocks/${id}`, { method: 'PUT', body: data, silent: true }),
      remove: (id: number) => apiFetch(`/diary-blocks/${id}`, { method: 'DELETE' }),
      reorder: (diaryId: number, orderedIds: number[]) =>
        apiFetch(`/diary-blocks/reorder/${diaryId}`, { method: 'POST', body: { orderedIds } }),
      retrain: () => apiFetch('/diary-blocks/retrain', { method: 'POST' }),
    },

    // 工具箱
    toolbox: {
      /**
       * PDF智能双轨压缩
       * @param file PDF文件
       * @returns 压缩结果
       */
      compressPdf: (file: File) => {
        return new Promise<{
          result: string;
          method: 'image' | 'adobe' | 'original';
          compressionRate: string;
          originalSize: number;
          compressedSize: number;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const base64 = (e.target?.result as string).split(',')[1] || '';
              const result: any = await apiFetch('/toolbox/compress/pdf', {
                method: 'POST',
                body: {
                  fileName: file.name,
                  pdfBase64: base64,
                },
              });
              resolve(result);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('文件读取失败'));
          reader.readAsDataURL(file);
        });
      },

      /**
       * 图片压缩
       * @param file 图片文件
       * @param options 压缩选项 { quality: 1-100, maxWidth: 最大宽度 }
       * @returns 压缩结果
       */
      compressImage: (
        file: File,
        options: { quality?: number; maxWidth?: number } = {},
      ) => {
        const { quality = 80, maxWidth = 1920 } = options;
        return new Promise<{
          result: string;
          method: string;
          compressionRate: string;
          originalSize: number;
          compressedSize: number;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const base64 = (e.target?.result as string).split(',')[1] || '';
              const result: any = await apiFetch('/toolbox/compress/image', {
                method: 'POST',
                body: {
                  fileName: file.name,
                  imageBase64: base64,
                  quality,
                  maxWidth,
                },
              });
              resolve(result);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('文件读取失败'));
          reader.readAsDataURL(file);
        });
      },
    },
  };
};
