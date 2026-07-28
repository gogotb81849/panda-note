import { ElMessage } from 'element-plus';

export const useAccount = () => {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();

  const apiBase = process.server ? config.public.apiBase : '/api';

  const apiFetch = async (url: string, options: any = {}) => {
    try {
      return await $fetch(`${apiBase}${url}`, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
        },
      });
    } catch (error: any) {
      const status = error?.response?.status || error?.status || error?.statusCode;
      const message = error?.response?._data?.message || error?.message || '请求失败';

      if (status === 401) {
        authStore.logout();
        if (process.client) {
          ElMessage.error('登录已过期，请重新登录');
        }
        throw new Error('登录已过期');
      }

      if (status === 403) {
        if (process.client) {
          ElMessage.error('没有操作权限');
        }
        throw new Error('没有操作权限');
      }

      if (process.client) {
        ElMessage.error(message || '网络请求失败，请稍后重试');
      }
      throw error;
    }
  };

  // 检查是否为全局管理员
  const isGlobalAdmin = computed(() => {
    return authStore.user?.role === 'admin';
  });

  // 检查是否为船工主管
  const isCrewSupervisor = computed(() => {
    return authStore.user?.role === 'shore_crew_supervisor';
  });

  // 检查是否有账号管理权限
  const canManageAccounts = computed(() => {
    return isGlobalAdmin.value || isCrewSupervisor.value;
  });

  // 获取账号列表
  const getAccounts = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    teamCode?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.teamCode) query.append('teamCode', params.teamCode);
    return apiFetch(`/accounts?${query.toString()}`);
  };

  // 获取账号详情
  const getAccount = async (id: number) => {
    return apiFetch(`/accounts/${id}`);
  };

  // 创建账号
  const createAccount = async (data: {
    username: string;
    password?: string;
    realName: string;
    teamCode: string;
    role: string;
    roles?: string[];
    staffId?: string;
    idCardLast6?: string;
  }) => {
    return apiFetch('/accounts', {
      method: 'POST',
      body: data,
    });
  };

  // 更新账号
  const updateAccount = async (id: number, data: {
    realName?: string;
    teamCode?: string;
    role?: string;
    roles?: string[];
    staffId?: string;
  }) => {
    return apiFetch(`/accounts/${id}`, {
      method: 'PUT',
      body: data,
    });
  };

  // 删除账号
  const deleteAccount = async (id: number) => {
    return apiFetch(`/accounts/${id}`, {
      method: 'DELETE',
    });
  };

  // 重置密码
  const resetPassword = async (id: number, newPassword: string) => {
    return apiFetch(`/accounts/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  };

  // 锁定账号
  const lockAccount = async (id: number, durationHours: number = 24) => {
    return apiFetch(`/accounts/${id}/lock`, {
      method: 'POST',
      body: { durationHours },
    });
  };

  // 解锁账号
  const unlockAccount = async (id: number) => {
    return apiFetch(`/accounts/${id}/unlock`, {
      method: 'POST',
    });
  };

  // 工号查找用户名
  const lookupByStaffId = async (staffId: string) => {
    return apiFetch('/accounts/lookup', {
      method: 'POST',
      body: { staffId },
    });
  };

  // 批量导入
  const batchImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // 文件上传不需要 JSON content-type
    return await $fetch(`${apiBase}/accounts/batch-import`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  // 获取可用角色
  const getAvailableRoles = async () => {
    return apiFetch('/accounts/roles');
  };

  // 修改自己的密码
  const changeOwnPassword = async (currentPassword: string, newPassword: string) => {
    return apiFetch('/accounts/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  };

  return {
    isGlobalAdmin,
    isCrewSupervisor,
    canManageAccounts,
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    resetPassword,
    lockAccount,
    unlockAccount,
    lookupByStaffId,
    batchImport,
    getAvailableRoles,
    changeOwnPassword,
  };
};
