import { ElMessage } from 'element-plus';

export interface VersionRecord {
  id: number;
  teamCode: string;
  entityType: string;
  entityId: number;
  version: number;
  snapshot: Record<string, any>;
  changes: Record<string, any>;
  changeSummary: string;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface VersionDiffResult {
  versionA: number;
  versionB: number;
  additions: Record<string, any>;
  deletions: Record<string, any>;
  modifications: Record<string, { old: any; new: any }>;
}

export function useVersionHistory() {
  const api = useApi();
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const apiBase = process.server ? config.public.apiBase : '/api';

  const apiFetch = async (url: string, options: any = {}) => {
    return $fetch(`${apiBase}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 获取实体的所有版本
   */
  const getVersions = async (entityType: string, entityId: number): Promise<VersionRecord[]> => {
    try {
      return await apiFetch(`/version-history/${entityType}/${entityId}`);
    } catch (error: any) {
      ElMessage.error(error?.message || '获取版本历史失败');
      return [];
    }
  };

  /**
   * 获取指定版本详情
   */
  const getVersion = async (
    entityType: string,
    entityId: number,
    version: number,
  ): Promise<VersionRecord | null> => {
    try {
      return await apiFetch(`/version-history/${entityType}/${entityId}/${version}`);
    } catch (error: any) {
      ElMessage.error(error?.message || '获取版本详情失败');
      return null;
    }
  };

  /**
   * 创建新版本
   */
  const createVersion = async (
    entityType: string,
    entityId: number,
    data: {
      snapshot: Record<string, any>;
      changes?: Record<string, any>;
      changeSummary?: string;
    },
  ): Promise<VersionRecord | null> => {
    try {
      return await apiFetch(`/version-history`, {
        method: 'POST',
        body: {
          entityType,
          entityId,
          snapshot: data.snapshot,
          changes: data.changes || {},
          changeSummary: data.changeSummary || '',
        },
      });
    } catch (error: any) {
      ElMessage.error(error?.message || '创建版本失败');
      return null;
    }
  };

  /**
   * 恢复到指定版本
   */
  const restoreVersion = async (
    entityType: string,
    entityId: number,
    version: number,
  ): Promise<VersionRecord | null> => {
    try {
      return await apiFetch(
        `/version-history/${entityType}/${entityId}/${version}/restore`,
        { method: 'POST' },
      );
    } catch (error: any) {
      ElMessage.error(error?.message || '恢复版本失败');
      return null;
    }
  };

  /**
   * 比较两个版本的差异
   */
  const diffVersions = async (
    entityType: string,
    entityId: number,
    versionA: number,
    versionB: number,
  ): Promise<VersionDiffResult | null> => {
    try {
      return await apiFetch(
        `/version-history/${entityType}/${entityId}/diff?versionA=${versionA}&versionB=${versionB}`,
      );
    } catch (error: any) {
      ElMessage.error(error?.message || '版本对比失败');
      return null;
    }
  };

  return {
    getVersions,
    getVersion,
    createVersion,
    restoreVersion,
    diffVersions,
  };
}
