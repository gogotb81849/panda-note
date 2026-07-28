/**
 * 性能监控工具
 * 监控请求耗时、同步耗时、缓存命中率等关键指标
 */

import { ref } from 'vue';

export interface PerformanceMetrics {
  // 请求指标
  requestCount: number;
  requestDurations: number[];
  avgRequestDuration: number;
  maxRequestDuration: number;
  minRequestDuration: number;

  // 同步指标
  syncCount: number;
  syncDurations: number[];
  avgSyncDuration: number;
  syncSuccessCount: number;
  syncFailureCount: number;

  // 缓存指标
  cacheHitCount: number;
  cacheMissCount: number;
  cacheHitRate: number;

  // 离线指标
  offlineDuration: number;
  offlineCount: number;

  // 资源指标
  lastReportTime: number;
}

const MAX_SAMPLES = 100;

const metrics = ref<PerformanceMetrics>({
  requestCount: 0,
  requestDurations: [],
  avgRequestDuration: 0,
  maxRequestDuration: 0,
  minRequestDuration: 0,

  syncCount: 0,
  syncDurations: [],
  avgSyncDuration: 0,
  syncSuccessCount: 0,
  syncFailureCount: 0,

  cacheHitCount: 0,
  cacheMissCount: 0,
  cacheHitRate: 0,

  offlineDuration: 0,
  offlineCount: 0,

  lastReportTime: Date.now(),
});

let offlineStartTime: number | null = null;

function updateAvg(durations: number[]): number {
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

function addSample(durations: number[], duration: number): number[] {
  const updated = [...durations, duration];
  if (updated.length > MAX_SAMPLES) {
    return updated.slice(-MAX_SAMPLES);
  }
  return updated;
}

export function usePerformanceMonitor() {
  return {
    metrics,

    // 记录请求耗时
    recordRequest(duration: number, success: boolean = true) {
      metrics.value.requestCount++;
      metrics.value.requestDurations = addSample(metrics.value.requestDurations, duration);
      metrics.value.avgRequestDuration = updateAvg(metrics.value.requestDurations);
      metrics.value.maxRequestDuration = Math.max(...metrics.value.requestDurations);
      metrics.value.minRequestDuration = metrics.value.requestDurations.length > 0
        ? Math.min(...metrics.value.requestDurations)
        : 0;
    },

    // 记录同步耗时
    recordSync(duration: number, success: boolean) {
      metrics.value.syncCount++;
      metrics.value.syncDurations = addSample(metrics.value.syncDurations, duration);
      metrics.value.avgSyncDuration = updateAvg(metrics.value.syncDurations);
      if (success) {
        metrics.value.syncSuccessCount++;
      } else {
        metrics.value.syncFailureCount++;
      }
    },

    // 记录缓存命中/未命中
    recordCacheHit() {
      metrics.value.cacheHitCount++;
      updateCacheHitRate();
    },

    recordCacheMiss() {
      metrics.value.cacheMissCount++;
      updateCacheHitRate();
    },

    // 记录离线状态变化
    recordOfflineStart() {
      offlineStartTime = Date.now();
      metrics.value.offlineCount++;
    },

    recordOfflineEnd() {
      if (offlineStartTime) {
        const duration = Date.now() - offlineStartTime;
        metrics.value.offlineDuration += duration;
        offlineStartTime = null;
      }
    },

    // 获取性能报告
    getReport(): Record<string, any> {
      const now = Date.now();
      const report = {
        generatedAt: new Date().toISOString(),
        period: `${Math.round((now - metrics.value.lastReportTime) / 1000)}s`,
        requests: {
          total: metrics.value.requestCount,
          avgDuration: `${metrics.value.avgRequestDuration}ms`,
          maxDuration: `${metrics.value.maxRequestDuration}ms`,
          minDuration: `${metrics.value.minRequestDuration}ms`,
        },
        sync: {
          total: metrics.value.syncCount,
          avgDuration: `${metrics.value.avgSyncDuration}ms`,
          successRate: metrics.value.syncCount > 0
            ? `${Math.round((metrics.value.syncSuccessCount / metrics.value.syncCount) * 100)}%`
            : 'N/A',
        },
        cache: {
          hitRate: `${metrics.value.cacheHitRate}%`,
          hits: metrics.value.cacheHitCount,
          misses: metrics.value.cacheMissCount,
        },
        offline: {
          count: metrics.value.offlineCount,
          totalDuration: `${Math.round(metrics.value.offlineDuration / 1000)}s`,
        },
      };

      metrics.value.lastReportTime = now;
      return report;
    },

    // 重置指标
    reset() {
      metrics.value = {
        requestCount: 0,
        requestDurations: [],
        avgRequestDuration: 0,
        maxRequestDuration: 0,
        minRequestDuration: 0,

        syncCount: 0,
        syncDurations: [],
        avgSyncDuration: 0,
        syncSuccessCount: 0,
        syncFailureCount: 0,

        cacheHitCount: 0,
        cacheMissCount: 0,
        cacheHitRate: 0,

        offlineDuration: 0,
        offlineCount: 0,

        lastReportTime: Date.now(),
      };
      offlineStartTime = null;
    },

    // 导出为JSON
    exportMetrics(): string {
      return JSON.stringify({
        ...metrics.value,
        generatedAt: new Date().toISOString(),
      }, null, 2);
    },
  };
}

function updateCacheHitRate() {
  const total = metrics.value.cacheHitCount + metrics.value.cacheMissCount;
  if (total > 0) {
    metrics.value.cacheHitRate = Math.round((metrics.value.cacheHitCount / total) * 1000) / 10;
  }
}

// 全局性能监控实例
let monitorInstance: ReturnType<typeof usePerformanceMonitor> | null = null;

export function getPerformanceMonitor(): ReturnType<typeof usePerformanceMonitor> {
  if (!monitorInstance) {
    monitorInstance = usePerformanceMonitor();
  }
  return monitorInstance;
}
