export interface GanttShipStatus {
  shipId: number;
  shipName: string;
  status: 'completed' | 'overdue' | 'pending' | 'in_progress';
  completedAt: string | null;
}

export interface GanttTaskItem {
  id: number;
  title: string;
  category?: string;
  category2?: string;
  status: string;
  priority: string;
  dueDate: string | null;
  ganttStartDate: string | null;
  ganttEndDate: string | null;
  targetCount: number | null;
  ganttMode: string | null;
  completedCount: number;
  progress: number;
  isOverdue: boolean;
  children: GanttTaskItem[];
  assignedTo?: { id: number; realName: string } | null;
}

export interface GanttDataResponse {
  tasks: GanttTaskItem[];
  dateRange: { start: string; end: string };
}

export const useGantt = () => {
  const api = useApi();

  const fetchGanttData = async (startDate: string, endDate: string): Promise<GanttDataResponse> => {
    // useApi doesn't have gantt, so we call the API directly
    const config = useRuntimeConfig();
    const authStore = useAuthStore();
    return await $fetch(`${config.public.apiBase}/tasks/gantt?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  const getTaskProgress = async (taskId: number) => {
    const config = useRuntimeConfig();
    const authStore = useAuthStore();
    return await $fetch(`${config.public.apiBase}/tasks/${taskId}/progress`, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  const getShipTaskStatus = async (taskId: number): Promise<GanttShipStatus[]> => {
    const config = useRuntimeConfig();
    const authStore = useAuthStore();
    return await $fetch(`${config.public.apiBase}/tasks/${taskId}/ship-status`, {
      headers: {
        Authorization: authStore.token ? `Bearer ${authStore.token}` : undefined,
      },
    });
  };

  const exportGanttData = async (startDate: string, endDate: string) => {
    const data = await fetchGanttData(startDate, endDate);
    // 生成 CSV
    const headers = ['任务名称', '分类', '状态', '优先级', '进度%', '截止日期', '是否逾期'];
    const rows = [headers.join(',')];

    const flattenTasks = (tasks: GanttTaskItem[], depth = 0) => {
      for (const task of tasks) {
        const prefix = '  '.repeat(depth);
        const row = [
          `"${prefix}${task.title}"`,
          `"${task.category || ''}"`,
          `"${task.status}"`,
          `"${task.priority}"`,
          `${task.progress}`,
          `"${task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : ''}"`,
          `"${task.isOverdue ? '是' : '否'}"`,
        ];
        rows.push(row.join(','));
        flattenTasks(task.children, depth + 1);
      }
    };

    flattenTasks(data.tasks);

    const csvContent = '\uFEFF' + rows.join('\n'); // BOM for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `甘特图_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    fetchGanttData,
    getTaskProgress,
    getShipTaskStatus,
    exportGanttData,
  };
};
