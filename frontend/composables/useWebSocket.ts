import { ref, onUnmounted, type Ref } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '~/stores/auth';

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'comment_added'
  | 'warning_triggered'
  | 'meeting_processed'
  | 'system_message';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
  read: boolean;
}

let socket: Socket | null = null;
const notifications: Ref<Notification[]> = ref([]);
const isConnected = ref(false);
const unreadCount = ref(0);

const typeLabels: Record<NotificationType, string> = {
  task_assigned: '任务分配',
  task_updated: '任务更新',
  comment_added: '新评论',
  warning_triggered: '预警触发',
  meeting_processed: '会议纪要',
  system_message: '系统消息',
};

export function useWebSocket() {
  const authStore = useAuthStore();

  function connect() {
    if (socket?.connected || !authStore.token) return;

    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase as string;
    // 将 http://host:port 转为 ws://host:port
    const wsUrl = apiBase.replace(/^http/, 'ws');

    socket = io(`${wsUrl}/notifications`, {
      auth: { token: authStore.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      isConnected.value = true;
    });

    socket.on('disconnect', () => {
      isConnected.value = false;
    });

    socket.on('notification', (data: Omit<Notification, 'id' | 'read'>) => {
      const notification: Notification = {
        ...data,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        read: false,
      };
      notifications.value.unshift(notification);
      unreadCount.value++;
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected.value = false;
    }
  }

  function markAsRead(id: string) {
    const n = notifications.value.find(n => n.id === id);
    if (n) {
      n.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  function markAllAsRead() {
    notifications.value.forEach(n => (n.read = true));
    unreadCount.value = 0;
  }

  function clearNotifications() {
    notifications.value = [];
    unreadCount.value = 0;
  }

  function getNotificationsByType(type: NotificationType): Notification[] {
    return notifications.value.filter(n => n.type === type);
  }

  function getTypeLabel(type: NotificationType): string {
    return typeLabels[type] || type;
  }

  onUnmounted(() => {
    // 不在这里断开，由页面生命周期管理
  });

  return {
    connect,
    disconnect,
    socket,
    notifications,
    isConnected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getNotificationsByType,
    getTypeLabel,
  };
}
