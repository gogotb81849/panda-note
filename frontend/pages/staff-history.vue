<template>
  <div class="staff-history-page">
    <div class="toolbar">
      <div class="flex items-center justify-between">
        <el-select 
          v-model="selectedShipId" 
          placeholder="选择船舶" 
          clearable
          class="w-64"
          @change="loadByShip"
        >
          <el-option 
            v-for="ship in ships" 
            :key="ship.id" 
            :label="ship.cnShipName" 
            :value="ship.id"
          />
        </el-select>
        <el-button type="primary" @click="showCreate = true">添加履历</el-button>
      </div>
    </div>

    <div class="table-container">
      <el-table :data="staffHistoryList" stripe class="w-full">
        <el-table-column prop="postName" label="岗位" />
        <el-table-column prop="staffName" label="人员姓名" />
        <el-table-column prop="startDate" label="开始日期">
          <template #default="{ row }">{{ formatDate(row.startDate) }}</template>
        </el-table-column>
        <el-table-column prop="endDate" label="结束日期">
          <template #default="{ row }">{{ row.endDate ? formatDate(row.endDate) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="handoverNote" label="交接备注" show-overflow-tooltip />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog 
      v-model="showCreate" 
      :title="editingId ? '编辑履历' : '添加履历'"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="船舶">
          <el-select v-model="formData.shipId" placeholder="选择船舶" class="w-full">
            <el-option 
              v-for="ship in ships" 
              :key="ship.id" 
              :label="ship.cnShipName" 
              :value="ship.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="formData.postName" placeholder="请输入岗位" />
        </el-form-item>
        <el-form-item label="人员姓名">
          <el-input v-model="formData.staffName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker 
            v-model="formData.startDate" 
            type="date" 
            placeholder="选择日期" 
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker 
            v-model="formData.endDate" 
            type="date" 
            placeholder="选择日期" 
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="交接备注">
          <el-input v-model="formData.handoverNote" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';
import type { StaffHistory, Ship, CreateStaffHistoryRequest } from '~/types';

const api = useApi();
const ships = ref<Ship[]>([]);
const staffHistoryList = ref<StaffHistory[]>([]);
const selectedShipId = ref<number | null>(null);
const showCreate = ref(false);
const editingId = ref<number | null>(null);

const formData = ref<Partial<CreateStaffHistoryRequest>>({
  shipId: undefined,
  postName: '',
  staffName: '',
  startDate: '',
  endDate: undefined,
  handoverNote: '',
});

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN');
};

const loadData = async () => {
  try {
    ships.value = await api.ships.getAll() as Ship[];
    if (selectedShipId.value) {
      staffHistoryList.value = await api.staffHistory.getByShipId(selectedShipId.value) as StaffHistory[];
    } else {
      staffHistoryList.value = await api.staffHistory.getAll() as StaffHistory[];
    }
  } catch (e) {
    console.error('加载数据失败', e);
  }
};

const loadByShip = async (shipId: number | null) => {
  if (shipId) {
    staffHistoryList.value = await api.staffHistory.getByShipId(shipId) as StaffHistory[];
  } else {
    staffHistoryList.value = await api.staffHistory.getAll() as StaffHistory[];
  }
};

const handleEdit = (row: StaffHistory) => {
  editingId.value = row.id;
  formData.value = {
    shipId: row.shipId,
    postName: row.postName,
    staffName: row.staffName,
    startDate: row.startDate.split('T')[0],
    endDate: row.endDate ? row.endDate.split('T')[0] : undefined,
    handoverNote: row.handoverNote,
  };
  showCreate.value = true;
};

const handleDelete = async (row: StaffHistory) => {
  try {
    await api.staffHistory.delete(row.id);
    await loadData();
  } catch (e) {
    console.error('删除失败', e);
  }
};

const handleSave = async () => {
  try {
    if (editingId.value) {
      await api.staffHistory.update(editingId.value, formData.value as any);
    } else {
      await api.staffHistory.create(formData.value as CreateStaffHistoryRequest);
    }
    showCreate.value = false;
    editingId.value = null;
    formData.value = {
      shipId: undefined,
      postName: '',
      staffName: '',
      startDate: '',
      endDate: undefined,
      handoverNote: '',
    };
    await loadData();
  } catch (e) {
    console.error('保存失败', e);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.staff-history-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
}

.toolbar {
  margin-bottom: 16px;
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-container {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
}
</style>
