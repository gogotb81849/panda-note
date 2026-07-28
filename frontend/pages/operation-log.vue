<template>
  <div class="operation-log-page">
    <div class="page-header">
      <div class="flex items-center gap-3">
        <el-button text @click="navigateTo('/admin')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2 class="page-title">操作日志</h2>
      </div>
    </div>
    <div class="content-container">
      <el-table :data="logs" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="操作人" width="120">
          <template #default="{ row }">
            {{ row.user?.realName || row.user?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="operationType" label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getOperationTypeTag(row.operationType)">
              {{ getOperationTypeName(row.operationType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operationContent" label="操作内容" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP地址" width="150" />
        <el-table-column prop="createdAt" label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-center">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import type { OperationLog } from '~/types';

definePageMeta({
  middleware: ['auth'],
})

const api = useApi();
const loading = ref(false);
const logs = ref<OperationLog[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const loadData = async () => {
  loading.value = true;
  try {
    const result = await api.operationLog.getAll(currentPage.value, pageSize.value);
    logs.value = result.data;
    total.value = result.total;
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const getOperationTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    'create': '创建',
    'update': '更新',
    'delete': '删除',
    'login': '登录',
    'export': '导出',
  };
  return typeMap[type] || type;
};

const getOperationTypeTag = (type: string) => {
  const tagMap: Record<string, any> = {
    'create': 'success',
    'update': 'primary',
    'delete': 'danger',
    'login': 'info',
    'export': 'warning',
  };
  return tagMap[type] || '';
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.operation-log-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}

.content-container {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
}
</style>
