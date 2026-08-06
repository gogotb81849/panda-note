import { ref, computed } from 'vue';
import { useApi } from '~/composables/useApi';
import type { StaffAssignment, DiaryPermissionInfo } from '~/types';
import { ElMessage } from 'element-plus';

export const useStaffAssignment = () => {
  const api = useApi();
  const assignments = ref<StaffAssignment[]>([]);
  const currentAssignment = ref<StaffAssignment | null>(null);
  const permissionInfo = ref<DiaryPermissionInfo | null>(null);
  const loading = ref(false);

  /**
   * 加载所有派任记录
   */
  const loadAll = async () => {
    loading.value = true;
    try {
      const result = await api.staffAssignments.getAll() as StaffAssignment[];
      const list = Array.isArray(result) ? result : [];
      // 关键防御：把后端 JSON 返回的 id/shipId/userId 全部统一转 number
      // 避免 Prisma bigint 或其他序列化器把 number 字段变成字符串
      assignments.value = list.map((a: any) => ({
        ...a,
        id: Number(a.id),
        shipId: Number(a.shipId),
        userId: Number(a.userId),
        teamCode: a.teamCode || String(a.teamCode || ''),
        startDate: a.startDate ? String(a.startDate) : '',
        endDate: a.endDate ? String(a.endDate) : null,
        status: a.status || 'active',
        ship: a.ship
          ? { ...a.ship, id: Number(a.ship.id), cnShipName: a.ship.cnShipName || '' }
          : undefined,
        user: a.user
          ? { ...a.user, id: Number(a.user.id) }
          : undefined,
      }));
    } catch (e) {
      console.error('加载派任记录失败', e);
      assignments.value = [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取用户当前派任状态
   */
  const loadCurrent = async (userId: number) => {
    try {
      currentAssignment.value = await api.staffAssignments.getCurrent(userId) as StaffAssignment | null;
    } catch (e) {
      console.error('获取当前派任状态失败', e);
      currentAssignment.value = null;
    }
  };

  /**
   * 获取用户派任历史
   */
  const loadHistory = async (userId: number) => {
    try {
      assignments.value = await api.staffAssignments.getHistory(userId) as StaffAssignment[];
    } catch (e) {
      console.error('获取派任历史失败', e);
    }
  };

  /**
   * 获取用户日记权限信息
   */
  const loadPermissionInfo = async (userId: number) => {
    try {
      permissionInfo.value = await api.staffAssignments.getDiaryPermission(userId) as DiaryPermissionInfo;
    } catch (e) {
      console.error('获取权限信息失败', e);
    }
  };

  /**
   * 创建派任记录（上船）
   */
  const createAssignment = async (data: {
    userId: number;
    shipId: number;
    startDate: string;
    sourceCompany?: string;
    assignmentNo?: string;
  }) => {
    try {
      const result = await api.staffAssignments.create(data);
      ElMessage.success('派任记录创建成功');
      await loadAll();
      return result;
    } catch (e) {
      ElMessage.error('创建派任记录失败');
      throw e;
    }
  };

  /**
   * 下船登记
   */
  const checkOut = async (id: number, endDate: string, reason?: string) => {
    try {
      const result = await api.staffAssignments.checkOut(id, { endDate, reason });
      ElMessage.success('下船登记成功');
      await loadAll();
      return result;
    } catch (e) {
      ElMessage.error('下船登记失败');
      throw e;
    }
  };

  /**
   * 休假登记
   */
  const startLeave = async (id: number, startDate: string, endDate?: string, reason?: string) => {
    try {
      const result = await api.staffAssignments.startLeave(id, { startDate, endDate, reason });
      ElMessage.success('休假登记成功');
      await loadAll();
      return result;
    } catch (e) {
      ElMessage.error('休假登记失败');
      throw e;
    }
  };

  /**
   * 销假
   */
  const endLeave = async (id: number) => {
    try {
      const result = await api.staffAssignments.endLeave(id);
      ElMessage.success('销假成功');
      await loadAll();
      return result;
    } catch (e) {
      ElMessage.error('销假失败');
      throw e;
    }
  };

  /**
   * 删除派任记录
   */
  const deleteAssignment = async (id: number) => {
    try {
      await api.staffAssignments.delete(id);
      ElMessage.success('删除成功');
      await loadAll();
    } catch (e) {
      ElMessage.error('删除失败');
      throw e;
    }
  };

  /**
   * 状态显示
   */
  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: '在船',
      leave: '休假',
      ended: '已结束',
    };
    return map[status] || status;
  };

  const statusType = (status: string) => {
    const map: Record<string, string> = {
      active: 'success',
      leave: 'warning',
      ended: 'info',
    };
    return map[status] || '';
  };

  return {
    assignments,
    currentAssignment,
    permissionInfo,
    loading,
    loadAll,
    loadCurrent,
    loadHistory,
    loadPermissionInfo,
    createAssignment,
    checkOut,
    startLeave,
    endLeave,
    deleteAssignment,
    statusLabel,
    statusType,
  };
};
