import { ref, onUnmounted } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '~/stores/auth';
import { indexedDBManager } from './useIndexedDB';
import { createModuleLogger } from './useDebugLogger';

const logger = createModuleLogger('RealtimeSync');

export type DataChangeType = 'created' | 'updated' | 'deleted';

export interface DataChangeEvent {
  type: DataChangeType;
  entity: string;
  id: string | number;
  data?: Record<string, any>;
  timestamp: string;
  source?: string;
}

let socket: Socket | null = null;
const isConnected = ref(false);
const pendingChanges = ref<DataChangeEvent[]>([]);

export function useRealtimeSync() {
  const authStore = useAuthStore();

  async function connect() {
    if (socket?.connected || !authStore.token) return;

    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase as string;
    const wsUrl = apiBase.replace(/^http/, 'ws');

    socket = io(`${wsUrl}/realtime`, {
      auth: { token: authStore.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      isConnected.value = true;
      logger.info('Realtime socket connected');
      processPendingChanges();
    });

    socket.on('disconnect', () => {
      isConnected.value = false;
      logger.warn('Realtime socket disconnected');
    });

    socket.on('data_change', async (event: DataChangeEvent) => {
      await handleDataChange(event);
    });

    socket.on('connect_error', (error) => {
      logger.error('Realtime connection error', error);
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected.value = false;
    }
  }

  async function handleDataChange(event: DataChangeEvent) {
    try {
      if (!isConnected.value) {
        pendingChanges.value.push(event);
        return;
      }

      logger.debug(`Received ${event.type} event for ${event.entity}/${event.id}`);

      const storeName = getStoreName(event.entity);
      if (!storeName) {
        logger.warn(`Unknown entity: ${event.entity}`);
        return;
      }

      switch (event.type) {
        case 'created':
        case 'updated':
          if (event.data) {
            await indexedDBManager.put(storeName, event.data);
            logger.debug(`Updated local data: ${storeName}/${event.id}`);
          }
          break;

        case 'deleted':
          await indexedDBManager.delete(storeName, event.id);
          logger.debug(`Deleted local data: ${storeName}/${event.id}`);
          break;
      }

      window.dispatchEvent(new CustomEvent(`realtime:${event.entity}:${event.type}`, {
        detail: event,
      }));
    } catch (error) {
      logger.error(`Failed to handle data change: ${error}`);
    }
  }

  async function processPendingChanges() {
    if (pendingChanges.value.length === 0) return;

    logger.info(`Processing ${pendingChanges.value.length} pending changes`);
    const changes = [...pendingChanges.value];
    pendingChanges.value = [];

    for (const event of changes) {
      await handleDataChange(event);
    }
  }

  function getStoreName(entity: string): string | null {
    // store 名必须与 useApi.ts 中 URL_STORE_MAP 的 value 一致（驼峰命名）
    const mapping: Record<string, string> = {
      ship: 'ships',
      ships: 'ships',
      schedule: 'schedules',
      schedules: 'schedules',
      diary: 'diaries',
      diaries: 'diaries',
      task: 'tasks',
      tasks: 'tasks',
      staff: 'staffHistory',
      staff_history: 'staffHistory',
      staffHistory: 'staffHistory',
      sop_flow: 'sopFlow',
      sopFlow: 'sopFlow',
      sopflow: 'sopFlow',
      public_case: 'publicCase',
      publicCase: 'publicCase',
      party_activity: 'partyActivities',
      party_activities: 'partyActivities',
      partyActivities: 'partyActivities',
      integrity_record: 'integrityRecords',
      integrity_records: 'integrityRecords',
      integrityRecords: 'integrityRecords',
      officer_profile: 'officerProfiles',
      officer_profiles: 'officerProfiles',
      officerProfiles: 'officerProfiles',
      thought_report: 'thoughtReports',
      thought_reports: 'thoughtReports',
      thoughtReports: 'thoughtReports',
      experience: 'experiences',
      experiences: 'experiences',
      file: 'fileRecords',
      files: 'fileRecords',
      file_record: 'fileRecords',
      file_records: 'fileRecords',
      fileRecords: 'fileRecords',
      health_report: 'healthReports',
      health_reports: 'healthReports',
      standard_task_template: 'standardTaskTemplates',
      standard_task_templates: 'standardTaskTemplates',
      publish_template: 'publishTemplates',
      publish_templates: 'publishTemplates',
    };
    return mapping[entity.toLowerCase()] || null;
  }

  onUnmounted(() => {
    // 不在这里断开，由页面生命周期管理
  });

  return {
    connect,
    disconnect,
    isConnected,
    pendingChanges,
    socket,
  };
}
