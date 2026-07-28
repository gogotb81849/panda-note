import { ref, computed } from 'vue';
import { indexedDBManager } from './useIndexedDB';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  stack?: string;
  traceId?: string;
  /** 代码位置，格式: 文件路径:行号 或 函数名 */
  source?: string;
  /** 操作耗时(ms) */
  duration?: number;
  /** 环境上下文: 在线状态/当前路由/用户ID等 */
  context?: Record<string, any>;
}

const MAX_LOG_ENTRIES = 2000;
const DEBUG_FLAG_KEY = 'panda_debug_enabled';
const LOGS_STORE_NAME = 'debugLogs';

/** 常见错误模式 -> 定位提示 的映射，用于快速排障 */
const ErrorCodeMap: Record<string, { source: string; suggestion: string }> = {
  'IDB_INIT_FAILED': {
    source: 'composables/useIndexedDB.ts:init()',
    suggestion: '检查浏览器是否禁用 IndexedDB，或存储空间已满',
  },
  'IDB_DATA_CLONE_ERR': {
    source: 'composables/useIndexedDB.ts:put() / useSyncQueue.ts:saveQueue()',
    suggestion: '保存的数据包含函数/Symbol/Proxy等不可结构化克隆的对象，需序列化为纯对象',
  },
  'IDB_VERSION_ERR': {
    source: 'composables/useIndexedDB.ts:onupgradeneeded',
    suggestion: '数据库版本升级失败，尝试清除站点数据后重试',
  },
  'IDB_QUOTA_EXCEEDED': {
    source: 'composables/useIndexedDB.ts:put() / putAll()',
    suggestion: '浏览器存储空间已满，请清理本地数据或增加磁盘空间',
  },
  'IDB_TRANSACTION_ABORTED': {
    source: 'composables/useIndexedDB.ts 任意事务操作',
    suggestion: 'IndexedDB 事务被中断，通常因并发写入或存储空间不足，建议重试',
  },
  'SYNC_QUEUE_SAVE_FAILED': {
    source: 'composables/useSyncQueue.ts:saveQueue()',
    suggestion: '同步队列保存失败，检查 IndexedDB 可用性',
  },
  'SYNC_CONFLICT_DETECTED': {
    source: 'composables/useSyncQueue.ts:executeSyncItem()',
    suggestion: '服务器与本地数据冲突，建议检查冲突记录并手动解决',
  },
  'SYNC_NETWORK_TIMEOUT': {
    source: 'composables/useSyncQueue.ts:processQueue()',
    suggestion: '同步请求超时，网络可能不稳定，将自动重试',
  },
  'SYNC_AUTH_FAILED': {
    source: 'composables/useSyncQueue.ts:executeSyncItem()',
    suggestion: '同步时认证失败，Token 可能已过期，请重新登录',
  },
  'SYNC_SERVER_ERROR': {
    source: 'composables/useSyncQueue.ts:executeSyncItem()',
    suggestion: '同步时服务器返回 500 错误，请联系管理员或稍后重试',
  },
  'API_OFFLINE_FALLBACK': {
    source: 'composables/useApi.ts:apiFetch()',
    suggestion: '网络请求失败，已降级读取本地缓存',
  },
  'API_AUTH_EXPIRED': {
    source: 'composables/useApi.ts:apiFetch()',
    suggestion: '登录令牌过期，系统已自动登出，请重新登录',
  },
  'API_RATE_LIMITED': {
    source: 'composables/useApi.ts:apiFetch()',
    suggestion: '请求过于频繁，已被限流，请稍后再试',
  },
  'API_CORS_ERROR': {
    source: 'composables/useApi.ts:apiFetch() / 网络层',
    suggestion: '跨域请求被阻止，检查后端 CORS 配置或网络代理设置',
  },
  'API_JSON_PARSE_ERROR': {
    source: 'composables/useApi.ts:apiFetch() / $fetch',
    suggestion: '服务器返回非 JSON 数据，可能是网关错误或 HTML 错误页',
  },
  'CACHE_TTL_EXPIRED': {
    source: 'composables/useApi.ts:isCacheExpired()',
    suggestion: '本地缓存已过期，将重新从服务器获取',
  },
  'TIME_SYNC_FAILED': {
    source: 'composables/useApi.ts:syncServerTime()',
    suggestion: '服务器时间同步失败，离线编辑的时间戳可能存在偏差',
  },
  'VALIDATION_FAILED': {
    source: '页面表单校验 / API 参数校验',
    suggestion: '输入数据格式不正确，请检查必填项和数据类型',
  },
  'OFFLINE_SAVE_FAILED': {
    source: 'composables/useApi.ts:apiFetch() 离线写入分支',
    suggestion: '离线保存失败，IndexedDB 可能不可用，请检查浏览器设置',
  },
};

function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function captureContext(): Record<string, any> {
  if (process.server) return { env: 'server' };
  return {
    env: 'client',
    online: navigator.onLine,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : '',
  };
}

class DebugLogger {
  public logs = ref<DebugLogEntry[]>([]);
  public enabled = ref(false);
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage() {
    if (process.server) return;

    try {
      this.enabled.value = localStorage.getItem(DEBUG_FLAG_KEY) === 'true';

      // 从 IndexedDB 加载日志
      await indexedDBManager.init();
      const stored = await indexedDBManager.getAll<DebugLogEntry>(LOGS_STORE_NAME);
      if (stored && stored.length > 0) {
        // 按时间排序，保留最新的
        this.logs.value = stored
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-MAX_LOG_ENTRIES);
      }
    } catch (e) {
      console.warn('[DebugLogger] 从 IndexedDB 加载日志失败:', e);
      // 降级：尝试从 localStorage 加载旧数据
      try {
        const oldStored = localStorage.getItem('panda_debug_logs');
        if (oldStored) {
          const parsed = JSON.parse(oldStored);
          if (Array.isArray(parsed)) {
            this.logs.value = parsed.slice(-MAX_LOG_ENTRIES);
          }
        }
      } catch {}
    }

    this.initialized = true;
  }

  private async saveToStorage() {
    if (process.server || !this.enabled.value) return;

    try {
      await indexedDBManager.init();
      // 批量保存所有日志
      const logsToSave = this.logs.value.slice(-MAX_LOG_ENTRIES);
      // 先清空旧数据
      await indexedDBManager.clear(LOGS_STORE_NAME);
      // 逐条保存
      for (const log of logsToSave) {
        await indexedDBManager.put(LOGS_STORE_NAME, log);
      }
    } catch (e) {
      console.warn('[DebugLogger] 保存日志到 IndexedDB 失败:', e);
      // 降级：保存到 localStorage
      try {
        localStorage.setItem('panda_debug_logs_backup', JSON.stringify(this.logs.value.slice(-100)));
      } catch {}
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled.value = enabled;
    if (process.client) {
      localStorage.setItem(DEBUG_FLAG_KEY, String(enabled));
    }
  }

  toggleEnabled() {
    this.setEnabled(!this.enabled.value);
    return this.enabled.value;
  }

  private addLog(level: LogLevel, module: string, message: string, data?: any, meta?: Partial<DebugLogEntry>) {
    if (!this.enabled.value && level === 'debug') return;

    const entry: DebugLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      level,
      module,
      message,
      data: data !== undefined ? this.safeSerialize(data) : undefined,
      context: captureContext(),
      ...meta,
    };

    if (level === 'error') {
      if (data instanceof Error) {
        entry.stack = data.stack;
      } else {
        const err = new Error();
        entry.stack = err.stack;
      }
      // 尝试自动识别错误码并附加定位信息
      const detected = this.detectErrorCode(message, data);
      if (detected && !entry.source) {
        entry.source = detected.source;
        entry.data = entry.data || {};
        if (typeof entry.data === 'object') {
          entry.data._suggestion = detected.suggestion;
        }
      }
    }

    this.logs.value.push(entry);

    if (this.logs.value.length > MAX_LOG_ENTRIES) {
      this.logs.value = this.logs.value.slice(-MAX_LOG_ENTRIES);
    }

    const prefix = `[${module}]`;
    const suffix = entry.source ? ` (${entry.source})` : '';
    switch (level) {
      case 'debug':
        console.debug(prefix, message + suffix, data !== undefined ? data : '');
        break;
      case 'info':
        console.info(prefix, message + suffix, data !== undefined ? data : '');
        break;
      case 'warn':
        console.warn(prefix, message + suffix, data !== undefined ? data : '');
        break;
      case 'error':
        console.error(prefix, message + suffix, data !== undefined ? data : '');
        break;
    }

    // 异步保存到 IndexedDB，不阻塞主流程
    this.saveToStorage().catch(() => {});
  }

  private detectErrorCode(message: string, data: any): { source: string; suggestion: string } | null {
    const text = `${message} ${typeof data === 'string' ? data : ''}`.toUpperCase();
    for (const [code, info] of Object.entries(ErrorCodeMap)) {
      if (text.includes(code.replace(/_/g, ' ')) || text.includes(code)) {
        return info;
      }
    }
    if (text.includes('DATA CLONE') || text.includes('DATACLONE') || text.includes('STRUCTURED CLONE')) {
      return ErrorCodeMap['IDB_DATA_CLONE_ERR'];
    }
    if (text.includes('INDEXEDDB') && text.includes('OPEN')) {
      return ErrorCodeMap['IDB_INIT_FAILED'];
    }
    if (text.includes('QUOTA') || text.includes('STORAGE FULL') || text.includes('DISK FULL')) {
      return ErrorCodeMap['IDB_QUOTA_EXCEEDED'];
    }
    if (text.includes('TRANSACTION') && (text.includes('ABORT') || text.includes('INTERRUPT'))) {
      return ErrorCodeMap['IDB_TRANSACTION_ABORTED'];
    }
    if (text.includes('CONFLICT')) {
      return ErrorCodeMap['SYNC_CONFLICT_DETECTED'];
    }
    if (text.includes('TIMEOUT') || text.includes('ETIMEDOUT')) {
      return ErrorCodeMap['SYNC_NETWORK_TIMEOUT'];
    }
    if (text.includes('UNAUTHORIZED') || (text.includes('AUTH') && text.includes('FAIL'))) {
      return ErrorCodeMap['SYNC_AUTH_FAILED'];
    }
    if (text.includes('500') || text.includes('INTERNAL SERVER ERROR')) {
      return ErrorCodeMap['SYNC_SERVER_ERROR'];
    }
    if (text.includes('RATE LIMIT') || text.includes('TOO MANY REQUESTS') || text.includes('429')) {
      return ErrorCodeMap['API_RATE_LIMITED'];
    }
    if (text.includes('CORS') || text.includes('CROSS-ORIGIN') || text.includes('ACCESS-CONTROL')) {
      return ErrorCodeMap['API_CORS_ERROR'];
    }
    if (text.includes('JSON') && (text.includes('PARSE') || text.includes('SYNTAX') || text.includes('UNEXPECTED TOKEN'))) {
      return ErrorCodeMap['API_JSON_PARSE_ERROR'];
    }
    if (text.includes('OFFLINE') || text.includes('NETWORK') || text.includes('FETCH') || text.includes('NET::ERR')) {
      return ErrorCodeMap['API_OFFLINE_FALLBACK'];
    }
    if (text.includes('VALIDATION') || text.includes('INVALID') || text.includes('REQUIRED')) {
      return ErrorCodeMap['VALIDATION_FAILED'];
    }
    return null;
  }

  private safeSerialize(data: any): any {
    try {
      if (data instanceof Error) {
        return {
          name: data.name,
          message: data.message,
          stack: data.stack,
        };
      }
      if (typeof data === 'object' && data !== null) {
        const seen = new WeakSet();
        return JSON.parse(JSON.stringify(data, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
          }
          return value;
        }));
      }
      return data;
    } catch {
      return String(data);
    }
  }

  debug(module: string, message: string, data?: any, meta?: Partial<DebugLogEntry>) {
    this.addLog('debug', module, message, data, meta);
  }

  info(module: string, message: string, data?: any, meta?: Partial<DebugLogEntry>) {
    this.addLog('info', module, message, data, meta);
  }

  warn(module: string, message: string, data?: any, meta?: Partial<DebugLogEntry>) {
    this.addLog('warn', module, message, data, meta);
  }

  error(module: string, message: string, data?: any, meta?: Partial<DebugLogEntry>) {
    this.addLog('error', module, message, data, meta);
  }

  async clearLogs() {
    this.logs.value = [];
    if (process.client) {
      try {
        await indexedDBManager.clear(LOGS_STORE_NAME);
      } catch (e) {
        console.warn('[DebugLogger] 清除 IndexedDB 日志失败:', e);
      }
      localStorage.removeItem('panda_debug_logs');
      localStorage.removeItem('panda_debug_logs_backup');
    }
  }

  getLogsByModule(module: string): DebugLogEntry[] {
    return this.logs.value.filter(l => l.module === module);
  }

  getLogsByLevel(level: LogLevel): DebugLogEntry[] {
    return this.logs.value.filter(l => l.level === level);
  }

  getErrorLogs(): DebugLogEntry[] {
    return this.logs.value.filter(l => l.level === 'error');
  }

  /** 按 traceId 追踪一次完整操作链路 */
  getTrace(traceId: string): DebugLogEntry[] {
    return this.logs.value.filter(l => l.traceId === traceId);
  }

  exportLogs(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      totalCount: this.logs.value.length,
      errorCount: this.getErrorLogs().length,
      logs: this.logs.value,
    };
    return JSON.stringify(data, null, 2);
  }

  /** 导出带错误定位和修复建议的诊断报告 */
  exportDiagnosticReport(): string {
    const errors = this.getErrorLogs();
    const grouped = new Map<string, DebugLogEntry[]>();
    for (const e of errors) {
      const key = e.source || e.module || 'unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    }

    const sections: string[] = [];
    sections.push(`# 熊猫笔记 诊断报告`);
    sections.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`错误总数: ${errors.length}`);
    sections.push(`涉及模块: ${grouped.size}`);
    sections.push('');

    for (const [source, items] of grouped) {
      sections.push(`## ${source}`);
      sections.push(`出现次数: ${items.length}`);
      const suggestion = items[0].data?._suggestion || '暂无自动修复建议';
      sections.push(`建议: ${suggestion}`);
      sections.push('');
      for (const item of items.slice(-3)) {
        sections.push(`- [${new Date(item.timestamp).toLocaleString('zh-CN')}] ${item.message}`);
        if (item.traceId) sections.push(`  traceId: ${item.traceId}`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  downloadLogs() {
    const content = this.exportLogs();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `熊猫笔记_调试日志_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** 包装异步操作，自动记录性能、错误和链路 */
  async withTrace<T>(
    module: string,
    operation: string,
    fn: () => Promise<T>,
    options: { traceId?: string; source?: string } = {}
  ): Promise<T> {
    const traceId = options.traceId || generateTraceId();
    const start = Date.now();
    this.info(module, `${operation} 开始`, { traceId }, { traceId, source: options.source });

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(module, `${operation} 完成`, { traceId, duration }, { traceId, duration, source: options.source });
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      this.error(module, `${operation} 失败`, { traceId, duration, error: error?.message }, { traceId, duration, source: options.source });
      throw error;
    }
  }

  get recentErrors() {
    return computed(() => this.getErrorLogs().slice(-20).reverse());
  }

  get errorCount() {
    return computed(() => this.getErrorLogs().length);
  }

  get totalCount() {
    return computed(() => this.logs.value.length);
  }
}

let loggerInstance: DebugLogger | null = null;

export function useDebugLogger() {
  if (!loggerInstance) {
    loggerInstance = new DebugLogger();
  }
  return loggerInstance;
}

export function createModuleLogger(moduleName: string) {
  const logger = useDebugLogger();
  return {
    debug: (message: string, data?: any, meta?: Partial<DebugLogEntry>) => logger.debug(moduleName, message, data, meta),
    info: (message: string, data?: any, meta?: Partial<DebugLogEntry>) => logger.info(moduleName, message, data, meta),
    warn: (message: string, data?: any, meta?: Partial<DebugLogEntry>) => logger.warn(moduleName, message, data, meta),
    error: (message: string, data?: any, meta?: Partial<DebugLogEntry>) => logger.error(moduleName, message, data, meta),
    withTrace: <T>(operation: string, fn: () => Promise<T>, options?: { traceId?: string; source?: string }) =>
      logger.withTrace(moduleName, operation, fn, options),
  };
}
