<template>
  <div class="staff-assignments-page">
    <div class="toolbar">
      <div class="flex items-center justify-between">
        <el-select 
          v-model="selectedShipId" 
          placeholder="选择船舶" 
          clearable
          class="w-64"
          @change="filterByShip"
        >
          <el-option 
            v-for="ship in ships" 
            :key="ship.id" 
            :label="ship.cnShipName" 
            :value="ship.id"
          />
        </el-select>
        <el-select 
          v-model="filterStatus" 
          placeholder="状态筛选" 
          clearable
          class="w-40 ml-2"
          @change="filterByShip"
        >
          <el-option label="在船" value="active" />
          <el-option label="休假" value="leave" />
          <el-option label="已结束" value="ended" />
        </el-select>
        <el-button type="primary" @click="showCreateDialog">上船登记</el-button>
      </div>
    </div>

    <!-- 当前派任状态卡片 -->
    <div class="status-cards" v-if="currentAssignment || permissionInfo">
      <el-card class="status-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>我的当前状态</span>
            <el-tag :type="statusType(permissionInfo?.isOnLeave ? 'leave' : permissionInfo?.isOnBoard ? 'active' : 'ended')">
              {{ statusLabel(permissionInfo?.isOnLeave ? 'leave' : permissionInfo?.isOnBoard ? 'active' : 'ended') }}
            </el-tag>
          </div>
        </template>
        <div v-if="currentAssignment">
          <el-descriptions :column="2" size="small">
            <el-descriptions-item label="船舶">{{ currentAssignment.ship?.cnShipName }}</el-descriptions-item>
            <el-descriptions-item label="上船日期">{{ formatDate(currentAssignment.startDate) }}</el-descriptions-item>
            <el-descriptions-item label="派任编号">{{ currentAssignment.assignmentNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="公司名称">{{ currentAssignment.sourceCompany || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div v-else class="text-gray-400">当前无派任记录</div>
      </el-card>

      <el-card class="status-card" shadow="hover">
        <template #header>
          <span>日记可见范围</span>
        </template>
        <div v-if="permissionInfo">
          <el-descriptions :column="1" size="small">
            <el-descriptions-item label="当前船舶日记">
              {{ permissionInfo.currentShipId ? '可见' : '无' }}
            </el-descriptions-item>
            <el-descriptions-item label="历史船舶日记">
              仅自己撰写的日记（{{ permissionInfo.historyShipIds.length }} 艘船舶）
            </el-descriptions-item>
            <el-descriptions-item label="自己的日记">
              所有船舶可见
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>
    </div>

    <!-- 派任记录列表 -->
    <div class="table-container">
      <el-table :data="filteredAssignments" stripe class="w-full" v-loading="loading">
        <el-table-column prop="user.realName" label="政委姓名" />
        <el-table-column prop="ship.cnShipName" label="船舶" />
        <el-table-column prop="assignmentNo" label="派任编号" width="120" />
        <el-table-column prop="startDate" label="上船日期" width="120">
          <template #default="{ row }">{{ formatDate(row.startDate) }}</template>
        </el-table-column>
        <el-table-column prop="endDate" label="下船日期" width="120">
          <template #default="{ row }">{{ row.endDate ? formatDate(row.endDate) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="sourceCompany" label="公司名称" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleCheckout(row)" v-if="row.status === 'active' && !row.endDate">
              下船
            </el-button>
            <el-button size="small" type="warning" @click="handleLeave(row)" v-if="row.status === 'active'">
              休假
            </el-button>
            <el-button size="small" type="success" @click="handleEndLeave(row)" v-if="row.status === 'leave'">
              销假
            </el-button>
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog 
      v-model="showDialog" 
      :title="dialogTitle"
      width="550px"
      @closed="resetForm"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="选择政委">
          <el-select v-model="formData.userId" placeholder="选择政委" class="w-full" :disabled="!!editingId">
            <el-option 
              v-for="user in users" 
              :key="user.id" 
              :label="user.realName" 
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择船舶">
          <el-select v-model="formData.shipId" placeholder="选择船舶" class="w-full">
            <el-option 
              v-for="ship in ships" 
              :key="ship.id" 
              :label="ship.cnShipName" 
              :value="ship.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="上船日期">
          <el-date-picker 
            v-model="formData.startDate" 
            type="date" 
            placeholder="选择日期" 
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="下船日期">
          <el-date-picker 
            v-model="formData.endDate" 
            type="date" 
            placeholder="选择日期（可选）" 
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="派任编号">
          <el-input v-model="formData.assignmentNo" placeholder="请输入派任编号" />
        </el-form-item>
        <el-form-item label="公司名称">
          <el-select v-model="formData.sourceCompany" placeholder="选择公司" class="w-full" clearable>
            <el-option label="上海" value="上海" />
            <el-option label="大连" value="大连" />
            <el-option label="广州" value="广州" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 下船对话框 -->
    <el-dialog v-model="showCheckoutDialog" title="下船登记" width="450px">
      <el-form :model="checkoutForm" label-width="80px">
        <el-form-item label="下船日期">
          <el-date-picker 
            v-model="checkoutForm.endDate" 
            type="date" 
            placeholder="选择日期" 
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="checkoutForm.reason" type="textarea" :rows="3" placeholder="请输入下船原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCheckoutDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCheckout">确认下船</el-button>
      </template>
    </el-dialog>

    <!-- 休假对话框 -->
    <el-dialog v-model="showLeaveDialog" title="休假登记" width="450px">
      <el-form :model="leaveForm" label-width="80px">
        <el-form-item label="开始日期">
          <el-date-picker 
            v-model="leaveForm.startDate" 
            type="date" 
            placeholder="选择日期" 
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker 
            v-model="leaveForm.endDate" 
            type="date" 
            placeholder="选择日期（可选）" 
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="leaveForm.reason" type="textarea" :rows="3" placeholder="请输入休假原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLeaveDialog = false">取消</el-button>
        <el-button type="warning" @click="submitLeave">确认休假</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';
import { useStaffAssignment } from '~/composables/useStaffAssignment';
import type { StaffAssignment, Ship, User } from '~/types';
import { ElMessage, ElMessageBox } from 'element-plus';

definePageMeta({
  middleware: ['auth'],
})

const api = useApi();
const { 
  assignments, loading, loadAll, 
  createAssignment, checkOut, startLeave, endLeave, deleteAssignment,
  statusLabel, statusType
} = useStaffAssignment();

const ships = ref<Ship[]>([]);
const users = ref<User[]>([]);
const currentAssignment = ref<StaffAssignment | null>(null);
const permissionInfo = ref<any>(null);
const selectedShipId = ref<number | null>(null);
const filterStatus = ref<string>('');

const showDialog = ref(false);
const editingId = ref<number | null>(null);
const dialogTitle = computed(() => editingId.value ? '编辑派任记录' : '上船登记');

const formData = ref({
  userId: undefined as number | undefined,
  shipId: undefined as number | undefined,
  startDate: '',
  endDate: '',
  assignmentNo: '',
  sourceCompany: '',
  remark: '',
});

const showCheckoutDialog = ref(false);
const checkoutForm = ref({ id: 0, endDate: '', reason: '' });

const showLeaveDialog = ref(false);
const leaveForm = ref({ id: 0, startDate: '', endDate: '', reason: '' });

const filteredAssignments = computed(() => {
  let result = assignments.value;
  if (selectedShipId.value) {
    result = result.filter(a => a.shipId === selectedShipId.value);
  }
  if (filterStatus.value) {
    result = result.filter(a => a.status === filterStatus.value);
  }
  return result;
});

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const loadShips = async () => {
  try {
    ships.value = await api.ships.getAll() as Ship[];
  } catch (e) {
    console.error('加载船舶列表失败', e);
  }
};

const loadUsers = async () => {
  try {
    const response = await api.userManagement.listUsers({ page: 1, pageSize: 200 }) as any;
    const allUsers = response?.users || response || [];
    users.value = allUsers.filter((u: User) => u.role === 'ship_political_instructor');
  } catch (e) {
    console.error('加载用户列表失败', e);
    users.value = [];
  }
};

const loadCurrentInfo = async () => {
  const authStore = useAuthStore();
  try {
    currentAssignment.value = await api.staffAssignments.getCurrent(authStore.user?.id) as StaffAssignment | null;
    permissionInfo.value = await api.staffAssignments.getDiaryPermission(authStore.user?.id);
  } catch (e) {
    console.error('加载当前状态失败', e);
  }
};

const showCreateDialog = () => {
  editingId.value = null;
  showDialog.value = true;
};

const handleEdit = (row: StaffAssignment) => {
  editingId.value = row.id;
  formData.value = {
    userId: row.userId,
    shipId: row.shipId,
    startDate: row.startDate.split('T')[0],
    endDate: row.endDate ? row.endDate.split('T')[0] : '',
    assignmentNo: row.assignmentNo || '',
    sourceCompany: row.sourceCompany || '',
    remark: row.remark || '',
  };
  showDialog.value = true;
};

const handleDelete = async (row: StaffAssignment) => {
  try {
    await ElMessageBox.confirm('确定删除该派任记录吗？', '提示', { type: 'warning' });
    await deleteAssignment(row.id);
  } catch (e) {
    // User cancelled or error
  }
};

const handleCheckout = (row: StaffAssignment) => {
  checkoutForm.value = { id: row.id, endDate: '', reason: '' };
  showCheckoutDialog.value = true;
};

const handleLeave = (row: StaffAssignment) => {
  leaveForm.value = { id: row.id, startDate: '', endDate: '', reason: '' };
  showLeaveDialog.value = true;
};

const handleEndLeave = async (row: StaffAssignment) => {
  try {
    await ElMessageBox.confirm('确认销假？', '提示', { type: 'info' });
    await endLeave(row.id);
  } catch (e) {
    // User cancelled or error
  }
};

const submitCheckout = async () => {
  if (!checkoutForm.value.endDate) {
    ElMessage.warning('请选择下船日期');
    return;
  }
  try {
    await checkOut(checkoutForm.value.id, checkoutForm.value.endDate, checkoutForm.value.reason);
    showCheckoutDialog.value = false;
    await loadCurrentInfo();
  } catch (e) {
    // Error handled in composable
  }
};

const submitLeave = async () => {
  if (!leaveForm.value.startDate) {
    ElMessage.warning('请选择休假开始日期');
    return;
  }
  try {
    await startLeave(
      leaveForm.value.id, 
      leaveForm.value.startDate, 
      leaveForm.value.endDate || undefined,
      leaveForm.value.reason
    );
    showLeaveDialog.value = false;
    await loadCurrentInfo();
  } catch (e) {
    // Error handled in composable
  }
};

const handleSave = async () => {
  if (!formData.value.userId || !formData.value.shipId || !formData.value.startDate) {
    ElMessage.warning('请填写必填项');
    return;
  }
  try {
    if (editingId.value) {
      await api.staffAssignments.update(editingId.value, {
        endDate: formData.value.endDate || null,
        sourceCompany: formData.value.sourceCompany,
        assignmentNo: formData.value.assignmentNo,
        remark: formData.value.remark,
      });
      ElMessage.success('更新成功');
    } else {
      await createAssignment(formData.value as any);
    }
    showDialog.value = false;
    await loadCurrentInfo();
  } catch (e) {
    // Error handled in composable
  }
};

const resetForm = () => {
  editingId.value = null;
  formData.value = {
    userId: undefined,
    shipId: undefined,
    startDate: '',
    endDate: '',
    assignmentNo: '',
    sourceCompany: '',
    remark: '',
  };
};

const filterByShip = () => {
  // Computed property handles filtering
};

onMounted(async () => {
  await Promise.all([
    loadAll(),
    loadShips(),
    loadUsers(),
    loadCurrentInfo(),
  ]);
});
</script>

<style scoped>
.staff-assignments-page {
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

.status-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.status-card {
  background-color: white;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-container {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

.text-gray-400 {
  color: #9ca3af;
}
</style>
