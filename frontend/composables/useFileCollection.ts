import JSZip from 'jszip';
import { ElMessage } from 'element-plus';

export const useFileCollection = () => {
  const api = useApi();
  const authStore = useAuthStore();

  /**
   * 获取所有船舶列表
   */
  const getShips = async () => {
    return await api.ships.getAll();
  };

  /**
   * 获取收集任务列表
   */
  const getCollections = async (status?: string, page?: number, pageSize?: number) => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (page) params.page = String(page);
    if (pageSize) params.pageSize = String(pageSize);

    const queryString = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections${queryString ? '?' + queryString : ''}`, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 创建收集任务
   */
  const createCollection = async (data: {
    title: string;
    description?: string;
    targetShips: Array<{ shipId: number; shipName: string }>;
    fileType?: string;
    namingRule?: string;
    maxSize?: number;
    deadline: string;
  }) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections`, {
      method: 'POST',
      body: data,
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 获取任务详情
   */
  const getCollectionDetail = async (id: number) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${id}`, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 提交文件
   */
  const submitFile = async (collectionId: number, data: {
    shipId: number;
    fileId: number;
    fileName: string;
  }) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${collectionId}/submit`, {
      method: 'POST',
      body: data,
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 获取未提交的船舶列表
   */
  const getUnsubmittedShips = async (collectionId: number) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${collectionId}/unsubmitted`, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 获取催收列表
   */
  const getRemindList = async (collectionId: number) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${collectionId}/remind`, {
      method: 'POST',
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 驳回提交
   */
  const rejectSubmission = async (collectionId: number, submissionId: number, reason: string) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${collectionId}/reject/${submissionId}`, {
      method: 'POST',
      body: { reason },
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 更新任务
   */
  const updateCollection = async (id: number, data: any) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${id}`, {
      method: 'PUT',
      body: data,
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 删除任务
   */
  const deleteCollection = async (id: number) => {
    return await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  /**
   * 批量下载（前端JSZip打包）
   */
  const downloadAllFiles = async (collectionId: number, taskTitle: string) => {
    try {
      // 获取文件列表
      const files = await $fetch(`${useRuntimeConfig().public.apiBase}/file-collections/${collectionId}/download-all`, {
        headers: {
          Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
        },
      }) as any[];

      if (!files || files.length === 0) {
        ElMessage.warning('暂无可下载的文件');
        return;
      }

      ElMessage.info('正在打包文件，请稍候...');

      const zip = new JSZip();
      const apiBase = useRuntimeConfig().public.apiBase;

      // 逐个下载文件并添加到zip
      for (const file of files) {
        try {
          const response = await fetch(`${apiBase}/files/${file.fileId}/stream`, {
            headers: {
              Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
            },
          });
          if (response.ok) {
            const blob = await response.blob();
            zip.file(file.renamedName || file.fileName, blob);
          }
        } catch (e) {
          console.warn(`下载文件失败: ${file.fileName}`, e);
        }
      }

      // 生成zip并触发下载
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${taskTitle}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      ElMessage.success('文件打包下载完成');
    } catch (error) {
      console.error('批量下载失败', error);
      ElMessage.error('批量下载失败，请稍后重试');
    }
  };

  /**
   * 获取可用命名变量
   */
  const getAvailableVariables = () => {
    return [
      { key: '{shipName}', label: '船舶名称', example: '新金洋' },
      { key: '{shipCode}', label: '船舶编号', example: '001' },
      { key: '{submitter}', label: '提交人', example: '张三' },
      { key: '{date}', label: '提交日期', example: '20260615' },
      { key: '{fileType}', label: '文件类型', example: 'pdf' },
      { key: '{taskName}', label: '任务名称', example: '月度报告' },
    ];
  };

  /**
   * 状态标签映射
   */
  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: '进行中',
      closed: '已关闭',
    };
    return map[status] || status;
  };

  const statusTagType = (status: string) => {
    const map: Record<string, string> = {
      active: 'success',
      closed: 'info',
    };
    return map[status] || '';
  };

  const submissionStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      submitted: '已提交',
      rejected: '已驳回',
    };
    return map[status] || status;
  };

  const submissionStatusTagType = (status: string) => {
    const map: Record<string, string> = {
      submitted: 'success',
      rejected: 'danger',
    };
    return map[status] || '';
  };

  return {
    getShips,
    getCollections,
    createCollection,
    getCollectionDetail,
    submitFile,
    getUnsubmittedShips,
    getRemindList,
    rejectSubmission,
    updateCollection,
    deleteCollection,
    downloadAllFiles,
    getAvailableVariables,
    statusLabel,
    statusTagType,
    submissionStatusLabel,
    submissionStatusTagType,
  };
};