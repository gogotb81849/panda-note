import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDebugLogger, createModuleLogger } from '~/composables/useDebugLogger';

describe('DebugLogger (调试日志)', () => {
  let logger: ReturnType<typeof useDebugLogger>;

  beforeEach(() => {
    logger = useDebugLogger();
    logger.clearLogs();
    logger.setEnabled(true);
    vi.clearAllMocks();
  });

  it('应该能记录不同级别的日志', () => {
    logger.info('TestModule', 'info message');
    logger.warn('TestModule', 'warn message');
    logger.error('TestModule', 'error message');

    expect(logger.logs.value.length).toBe(3);
    expect(logger.logs.value[0].level).toBe('info');
    expect(logger.logs.value[1].level).toBe('warn');
    expect(logger.logs.value[2].level).toBe('error');
  });

  it('debug 级别在默认未启用时不应记录', () => {
    logger.setEnabled(false);
    logger.debug('TestModule', 'debug message');
    expect(logger.logs.value.length).toBe(0);
  });

  it('应该自动捕获环境上下文', () => {
    logger.info('TestModule', 'context test');
    const entry = logger.logs.value[0];
    expect(entry.context).toBeDefined();
    expect(entry.context?.env).toBeDefined();
  });

  it('错误日志应该自动识别常见错误模式并附加定位信息', () => {
    logger.error('TestModule', 'DataCloneError: could not be cloned');
    const entry = logger.logs.value[0];
    expect(entry.source).toBeDefined();
    expect(entry.source).toContain('useIndexedDB.ts');
    expect(entry.data).toBeDefined();
    expect(entry.data._suggestion).toContain('序列化');
  });

  it('应该能按模块过滤日志', () => {
    logger.info('ModuleA', 'msg A');
    logger.info('ModuleB', 'msg B');
    const moduleALogs = logger.getLogsByModule('ModuleA');
    expect(moduleALogs.length).toBe(1);
    expect(moduleALogs[0].message).toBe('msg A');
  });

  it('应该能按级别过滤日志', () => {
    logger.info('Test', 'info');
    logger.warn('Test', 'warn');
    logger.error('Test', 'error');
    expect(logger.getLogsByLevel('error').length).toBe(1);
    expect(logger.getLogsByLevel('warn').length).toBe(1);
  });

  it('withTrace 应该记录操作开始、完成和耗时', async () => {
    const result = await logger.withTrace('TestModule', 'test-op', async () => {
      await new Promise(r => setTimeout(r, 10));
      return 42;
    });

    expect(result).toBe(42);
    const traceLogs = logger.logs.value.filter(l => l.traceId);
    expect(traceLogs.length).toBe(2);
    expect(traceLogs[0].message).toContain('开始');
    expect(traceLogs[1].message).toContain('完成');
    expect(traceLogs[1].duration).toBeGreaterThanOrEqual(0);
  });

  it('withTrace 失败时应该记录错误', async () => {
    await expect(logger.withTrace('TestModule', 'fail-op', async () => {
      throw new Error('trace error');
    })).rejects.toThrow('trace error');

    const traceLogs = logger.logs.value.filter(l => l.traceId);
    expect(traceLogs.length).toBe(2);
    expect(traceLogs[1].level).toBe('error');
    expect(traceLogs[1].message).toContain('失败');
  });

  it('应该能按 traceId 追踪完整链路', async () => {
    const traceId = 'test-trace-001';
    await logger.withTrace('Mod', 'op1', async () => 'r1', { traceId });
    await logger.withTrace('Mod', 'op2', async () => 'r2', { traceId });

    const trace = logger.getTrace(traceId);
    expect(trace.length).toBe(4);
  });

  it('createModuleLogger 应该创建模块级日志器', () => {
    const modLogger = createModuleLogger('MyModule');
    modLogger.info('hello');
    expect(logger.logs.value.length).toBe(1);
    expect(logger.logs.value[0].module).toBe('MyModule');
  });

  it('诊断报告应该包含错误统计和修复建议', () => {
    logger.error('SyncQueue', 'SYNC_QUEUE_SAVE_FAILED: something');
    logger.error('SyncQueue', 'SYNC_QUEUE_SAVE_FAILED: again');
    const report = logger.exportDiagnosticReport();
    expect(report).toContain('错误总数: 2');
    expect(report).toContain('useSyncQueue.ts');
    expect(report).toContain('建议:');
  });

  it('日志数量超过上限时应自动淘汰旧日志', () => {
    for (let i = 0; i < 2010; i++) {
      logger.info('Test', `msg ${i}`);
    }
    expect(logger.logs.value.length).toBeLessThanOrEqual(2000);
  });

  it('导出日志应为有效 JSON', () => {
    logger.info('Test', 'export test');
    const exported = logger.exportLogs();
    const parsed = JSON.parse(exported);
    expect(parsed.totalCount).toBe(1);
    expect(Array.isArray(parsed.logs)).toBe(true);
  });
});
