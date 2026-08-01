<template>
  <div class="staff-assignments-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-select
            v-model="selectedShipId"
            placeholder="选择船舶"
            clearable
            class="w-48"
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
            v-if="activeTab === 'list'"
            v-model="filterStatus"
            placeholder="状态筛选"
            clearable
            class="w-36"
            @change="filterByShip"
          >
            <el-option label="在船" value="active" />
            <el-option label="休假" value="leave" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button v-if="activeTab !== 'history'" type="warning" @click="showQuickReplaceDialog">
            更换政委
          </el-button>
          <el-button v-if="activeTab === 'list'" type="primary" @click="showCreateDialog">上船登记</el-button>
          <el-button v-if="activeTab === 'history'" type="primary" @click="showHistoryCreate = true">添加履历</el-button>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="staff-tabs" @tab-change="onTabChange">
      <el-tab-pane label="甘特图视图" name="gantt">
        <!-- 甘特图颜色图例 -->
        <div class="gantt-legend">
          <span class="legend-item"><span class="legend-color" style="background:#67c23a"></span>≤6月 正常</span>
          <span class="legend-item"><span class="legend-color" style="background:#e6a23c"></span>6-8月 关注</span>
          <span class="legend-item"><span class="legend-color" style="background:#f89a3c"></span>8-10月 预警</span>
          <span class="legend-item"><span class="legend-color" style="background:#f56c6c"></span>10-11月 极限</span>
          <span class="legend-item"><span class="legend-color" style="background:#ad0606"></span>>11月 违规</span>
          <span class="legend-item"><span class="legend-color" style="background:#b0b0b0"></span>已下船</span>
          <span class="legend-item"><span class="legend-color" style="background:#e6a23c;background-image:repeating-linear-gradient(45deg,#fff 0,#fff 2px,transparent 2px,transparent 6px)"></span>休假</span>
        </div>
        <!-- 甘特图组件 -->
        <StaffGanttChart
          :ships="ships"
          :assignments="filteredAssignments as any"
          :loading="loading"
          @bar-click="onBarClick"
        />
      </el-tab-pane>

      <el-tab-pane label="派任列表视图" name="list">
        <!-- 派任记录表格 -->
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
      </el-tab-pane>

      <el-tab-pane label="任职履历视图" name="history">
        <!-- 任职履历表格 -->
        <div class="table-container">
          <el-table :data="staffHistoryList" stripe class="w-full" v-loading="historyLoading">
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
                <el-button size="small" @click="handleHistoryEdit(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleHistoryDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ====== Popover 编辑菜单（甘特图点击色条后弹出）====== -->
    <div
      v-if="popoverVisible"
      class="gantt-popover-overlay"
      @click="closePopover"
    >
      <div
        class="gantt-popover"
        :style="{ top: popoverY + 'px', left: popoverX + 'px' }"
        @click.stop
      >
        <div class="popover-header">
          <span class="popover-title">{{ popoverAssignment?.user?.realName || '未指派' }}</span>
          <span class="popover-ship">{{ popoverAssignment?.ship?.cnShipName }}</span>
        </div>
        <div class="popover-info">
          <div>上船日期：{{ formatDate(popoverAssignment?.startDate) }}</div>
          <div v-if="popoverAssignment?.endDate">下船日期：{{ formatDate(popoverAssignment?.endDate) }}</div>
          <div v-else>在船天数：{{ getDaysOnBoard(popoverAssignment) }} 天</div>
          <div>状态：{{ statusLabel(popoverAssignment?.status) }}</div>
        </div>
        <div class="popover-actions">
          <el-button size="small" @click="handleEdit(popoverAssignment!)">编辑</el-button>
          <el-button
            v-if="popoverAssignment?.status === 'active' && !popoverAssignment?.endDate"
            size="small"
            type="primary"
            @click="handleCheckout(popoverAssignment!)"
          >下船</el-button>
          <el-button
            v-if="popoverAssignment?.status === 'active'"
            size="small"
            type="warning"
            @click="handleLeave(popoverAssignment!)"
          >休假</el-button>
          <el-button
            v-if="popoverAssignment?.status === 'leave'"
            size="small"
            type="success"
            @click="handleEndLeave(popoverAssignment!)"
          >销假</el-button>
          <el-button size="small" type="info" @click="showProfileCard">个人卡片</el-button>
          <el-button size="small" type="danger" @click="handleDelete(popoverAssignment!)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- ====== 个人卡片（建设中）====== -->
    <el-dialog v-model="profileCardVisible" title="政委个人卡片" width="480px">
      <div class="profile-card-building">
        <el-avatar :size="64" icon="UserFilled" />
        <div class="profile-name">{{ popoverAssignment?.user?.realName || '未知' }}</div>
        <div class="profile-info">
          <p>船舶：{{ popoverAssignment?.ship?.cnShipName || '-' }}</p>
          <p>上船日期：{{ formatDate(popoverAssignment?.startDate) }}</p>
          <p>来源公司：{{ popoverAssignment?.sourceCompany || '-' }}</p>
          <p>派任编号：{{ popoverAssignment?.assignmentNo || '-' }}</p>
        </div>
        <el-alert title="建设中" description="政委个人卡片功能正在开发中，后续将完善履职档案、考核记录、传帮带等信息。" type="info" :closable="false" show-icon class="mt-4" />
      </div>
    </el-dialog>

    <!-- ====== 创建/编辑派任对话框 ====== -->
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

    <!-- ====== 下船对话框 ====== -->
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

    <!-- ====== 休假对话框 ====== -->
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

    <!-- ====== 一键更换政委对话框 ====== -->
    <el-dialog v-model="showReplaceDialog" title="一键更换政委" width="560px" @closed="resetReplaceForm">
      <el-alert
        title="此操作将自动完成：旧政委下船 → 新政委上船（两条独立派任记录）"
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <el-form :model="replaceForm" label-width="110px">
        <el-form-item label="选择船舶" required>
          <el-select v-model="replaceForm.shipId" placeholder="请选择要更换政委的船舶" class="w-full" @change="onReplaceShipChange">
            <el-option
              v-for="ship in ships"
              :key="ship.id"
              :label="ship.cnShipName"
              :value="ship.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="当前在任政委" v-if="replaceForm.currentAssignment">
          <el-tag type="success" size="large">
            {{ replaceForm.currentAssignment.user?.realName || '未知' }}
          </el-tag>
          <span class="text-gray-400 ml-2 text-sm">
            上船日期：{{ formatDate(replaceForm.currentAssignment.startDate) }}
          </span>
        </el-form-item>
        <el-form-item v-else-if="replaceForm.shipId">
          <el-tag type="info" size="large">该船舶当前无在任政委，只需执行新政委上船</el-tag>
        </el-form-item>
        <el-divider content-position="left">旧政委下船</el-divider>
        <el-form-item label="下船日期" required>
          <el-date-picker
            v-model="replaceForm.checkoutDate"
            type="date"
            placeholder="选择下船日期"
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="下船原因">
          <el-input v-model="replaceForm.checkoutReason" type="textarea" :rows="2" placeholder="如：休假换班、公休" />
        </el-form-item>
        <el-divider content-position="left">新政委上船</el-divider>
        <el-form-item label="新政委" required>
          <el-select v-model="replaceForm.newUserId" placeholder="选择新政委" class="w-full" filterable>
            <el-option
              v-for="user in availableNewUsers"
              :key="user.id"
              :label="user.realName"
              :value="user.id"
            >
              <span>{{ user.realName }}</span>
              <span v-if="userCurrentShipMap[user.id]" class="text-gray-400 ml-2 text-xs">
                当前在：{{ userCurrentShipMap[user.id] }}
              </span>
              <span v-else class="text-green-500 ml-2 text-xs">（待派）</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="上船日期" required>
          <el-date-picker
            v-model="replaceForm.boardDate"
            type="date"
            placeholder="选择上船日期"
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="派任编号">
          <el-input v-model="replaceForm.assignmentNo" placeholder="请输入派任编号（可选）" />
        </el-form-item>
        <el-form-item label="公司名称">
          <el-select v-model="replaceForm.sourceCompany" placeholder="选择公司" class="w-full" clearable>
            <el-option label="上海" value="上海" />
            <el-option label="大连" value="大连" />
            <el-option label="广州" value="广州" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReplaceDialog = false">取消</el-button>
        <el-button type="primary" :loading="replacing" @click="submitReplace">确认更换</el-button>
      </template>
    </el-dialog>

    <!-- ====== 任职履历创建/编辑对话框 ====== -->
    <el-dialog
      v-model="showHistoryCreate"
      :title="historyEditingId ? '编辑履历' : '添加履历'"
      width="500px"
    >
      <el-form :model="historyFormData" label-width="100px">
        <el-form-item label="船舶">
          <el-select v-model="historyFormData.shipId" placeholder="选择船舶" class="w-full">
            <el-option
              v-for="ship in ships"
              :key="ship.id"
              :label="ship.cnShipName"
              :value="ship.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="historyFormData.postName" placeholder="请输入岗位" />
        </el-form-item>
        <el-form-item label="人员姓名">
          <el-input v-model="historyFormData.staffName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="historyFormData.startDate"
            type="date"
            placeholder="选择日期"
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="historyFormData.endDate"
            type="date"
            placeholder="选择日期（可选）"
            class="w-full"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="交接备注">
          <el-input v-model="historyFormData.handoverNote" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHistoryCreate = false">取消</el-button>
        <el-button type="primary" @click="handleHistorySave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';
import { useStaffAssignment } from '~/composables/useStaffAssignment';
import type { StaffAssignment, Ship, User, StaffHistory, CreateStaffHistoryRequest } from '~/types';
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

// ====== Tab 切换 ======
const activeTab = ref('gantt');

// ====== 船舶 + 用户 + 派任数据 ======
const ships = ref<Ship[]>([]);
const users = ref<User[]>([]);
const selectedShipId = ref<number | null>(null);
const filterStatus = ref<string>('');

// ====== 任职履历数据 ======
const staffHistoryList = ref<StaffHistory[]>([]);
const historyLoading = ref(false);
const showHistoryCreate = ref(false);
const historyEditingId = ref<number | null>(null);
const historyFormData = ref<Partial<CreateStaffHistoryRequest>>({
  shipId: undefined,
  postName: '',
  staffName: '',
  startDate: '',
  endDate: undefined,
  handoverNote: '',
});

// ====== 创建/编辑派任对话框 ======
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

// ====== 下船对话框 ======
const showCheckoutDialog = ref(false);
const checkoutForm = ref({ id: 0, endDate: '', reason: '' });

// ====== 休假对话框 ======
const showLeaveDialog = ref(false);
const leaveForm = ref({ id: 0, startDate: '', endDate: '', reason: '' });

// ====== 一键更换政委 ======
const showReplaceDialog = ref(false);
const replacing = ref(false);
const replaceForm = ref({
  shipId: undefined as number | undefined,
  currentAssignment: null as StaffAssignment | null,
  checkoutDate: '',
  checkoutReason: '',
  newUserId: undefined as number | undefined,
  boardDate: '',
  assignmentNo: '',
  sourceCompany: '',
});

// ====== Popover 编辑菜单 ======
const popoverVisible = ref(false);
const popoverX = ref(0);
const popoverY = ref(0);
const popoverAssignment = ref<StaffAssignment | null>(null);

// ====== 个人卡片 ======
const profileCardVisible = ref(false);

// ====== 计算属性 ======
const userCurrentShipMap = computed<Record<number, string>>(() => {
  const map: Record<number, string> = {};
  assignments.value.forEach(a => {
    if (a.status === 'active' && !a.endDate && a.userId) {
      map[a.userId] = a.ship?.cnShipName || '';
    }
  });
  return map;
});

const availableNewUsers = computed(() => {
  return users.value.filter(u => {
    if (replaceForm.value.currentAssignment && replaceForm.value.currentAssignment.userId === u.id) {
      return false;
    }
    return true;
  });
});

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

// ====== 工具函数 ======
const formatDate = (date?: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

function getDaysOnBoard(assignment?: StaffAssignment | null): number {
  if (!assignment?.startDate) return 0;
  const start = new Date(assignment.startDate).getTime();
  const end = assignment.endDate ? new Date(assignment.endDate).getTime() : Date.now();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

// ====== 数据加载 ======
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

const loadStaffHistory = async () => {
  historyLoading.value = true;
  try {
    if (selectedShipId.value) {
      staffHistoryList.value = await api.staffHistory.getByShipId(selectedShipId.value) as StaffHistory[];
    } else {
      staffHistoryList.value = await api.staffHistory.getAll() as StaffHistory[];
    }
  } catch (e) {
    console.error('加载任职履历失败', e);
  } finally {
    historyLoading.value = false;
  }
};

// ====== Tab 切换处理 ======
const onTabChange = (name: string | number) => {
  if (name === 'history') {
    loadStaffHistory();
  }
};

// ====== 甘特图点击色条 ======
const onBarClick = (payload: { assignment: StaffAssignment; event: MouseEvent }) => {
  popoverAssignment.value = payload.assignment;
  // 定位 Popover
  const x = Math.min(payload.event.clientX - 120, window.innerWidth - 280);
  const y = Math.min(payload.event.clientY + 10, window.innerHeight - 320);
  popoverX.value = Math.max(10, x);
  popoverY.value = Math.max(10, y);
  popoverVisible.value = true;
};

const closePopover = () => {
  popoverVisible.value = false;
};

const showProfileCard = () => {
  popoverVisible.value = false;
  profileCardVisible.value = true;
};

// ====== 派任操作（复用原有逻辑）======
const showCreateDialog = () => {
  editingId.value = null;
  showDialog.value = true;
};

const handleEdit = (row: StaffAssignment) => {
  popoverVisible.value = false;
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
  popoverVisible.value = false;
  try {
    await ElMessageBox.confirm('确定删除该派任记录吗？', '提示', { type: 'warning' });
    await deleteAssignment(row.id);
  } catch (e) {
    // User cancelled or error
  }
};

const handleCheckout = (row: StaffAssignment) => {
  popoverVisible.value = false;
  checkoutForm.value = { id: row.id, endDate: '', reason: '' };
  showCheckoutDialog.value = true;
};

const handleLeave = (row: StaffAssignment) => {
  popoverVisible.value = false;
  leaveForm.value = { id: row.id, startDate: '', endDate: '', reason: '' };
  showLeaveDialog.value = true;
};

const handleEndLeave = async (row: StaffAssignment) => {
  popoverVisible.value = false;
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
  if (activeTab.value === 'history') {
    loadStaffHistory();
  }
};

// ====== 一键更换政委 ======
const onReplaceShipChange = async (shipId: number) => {
  replaceForm.value.currentAssignment = null;
  if (!shipId) return;
  try {
    const staffList = await api.staffAssignments.getCurrentShipStaff(shipId) as StaffAssignment[];
    if (staffList && staffList.length > 0) {
      const activeOne = staffList.find((a: StaffAssignment) => a.status === 'active' && !a.endDate) || staffList[0];
      replaceForm.value.currentAssignment = activeOne;
    }
  } catch (e) {
    console.warn('获取船舶当前政委失败', e);
  }
};

const showQuickReplaceDialog = () => {
  if (selectedShipId.value) {
    replaceForm.value.shipId = selectedShipId.value;
    onReplaceShipChange(selectedShipId.value);
  }
  showReplaceDialog.value = true;
};

const resetReplaceForm = () => {
  replaceForm.value = {
    shipId: undefined,
    currentAssignment: null,
    checkoutDate: '',
    checkoutReason: '',
    newUserId: undefined,
    boardDate: '',
    assignmentNo: '',
    sourceCompany: '',
  };
};

const submitReplace = async () => {
  const { shipId, currentAssignment, checkoutDate, checkoutReason, newUserId, boardDate, assignmentNo, sourceCompany } = replaceForm.value;

  if (!shipId) { ElMessage.warning('请选择船舶'); return; }
  if (!newUserId) { ElMessage.warning('请选择新政委'); return; }
  if (!boardDate) { ElMessage.warning('请填写上船日期'); return; }
  if (currentAssignment && !checkoutDate) { ElMessage.warning('有当前在任政委，请填写下船日期'); return; }

  const currentShipOfNew = userCurrentShipMap.value[newUserId];
  if (currentShipOfNew) {
    try {
      await ElMessageBox.confirm(
        `新政委当前正任职于【${currentShipOfNew}】，是否先将其从该船下船，再派到所选船舶？`,
        '需要先从原船下船',
        { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消' }
      );
    } catch { return; }
  }

  replacing.value = true;
  try {
    if (currentShipOfNew) {
      const newUserAssignments = assignments.value.filter(
        a => a.userId === newUserId && a.status === 'active' && !a.endDate
      );
      for (const a of newUserAssignments) {
        await api.staffAssignments.checkOut(a.id, { endDate: checkoutDate || boardDate, reason: '换船派任' });
      }
    }
    if (currentAssignment) {
      await api.staffAssignments.checkOut(currentAssignment.id, {
        endDate: checkoutDate,
        reason: checkoutReason || '换班',
      });
    }
    await createAssignment({
      userId: newUserId,
      shipId,
      startDate: boardDate,
      sourceCompany: sourceCompany || undefined,
      assignmentNo: assignmentNo || undefined,
    });
    ElMessage.success('政委更换完成！已生成两条独立派任记录');
    showReplaceDialog.value = false;
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    replacing.value = false;
  }
};

// ====== 任职履历操作 ======
const handleHistoryEdit = (row: StaffHistory) => {
  historyEditingId.value = row.id;
  historyFormData.value = {
    shipId: row.shipId,
    postName: row.postName,
    staffName: row.staffName,
    startDate: row.startDate.split('T')[0],
    endDate: row.endDate ? row.endDate.split('T')[0] : undefined,
    handoverNote: row.handoverNote,
  };
  showHistoryCreate.value = true;
};

const handleHistoryDelete = async (row: StaffHistory) => {
  try {
    await ElMessageBox.confirm('确定删除该履历记录吗？', '提示', { type: 'warning' });
    await api.staffHistory.delete(row.id);
    await loadStaffHistory();
  } catch (e) {
    // cancelled or error
  }
};

const handleHistorySave = async () => {
  try {
    if (historyEditingId.value) {
      await api.staffHistory.update(historyEditingId.value, historyFormData.value as any);
    } else {
      await api.staffHistory.create(historyFormData.value as CreateStaffHistoryRequest);
    }
    showHistoryCreate.value = false;
    historyEditingId.value = null;
    historyFormData.value = {
      shipId: undefined,
      postName: '',
      staffName: '',
      startDate: '',
      endDate: undefined,
      handoverNote: '',
    };
    await loadStaffHistory();
  } catch (e) {
    console.error('保存失败', e);
  }
};

// ====== 初始化 ======
onMounted(async () => {
  await Promise.all([
    loadAll(),
    loadShips(),
    loadUsers(),
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

.staff-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.staff-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
}

.table-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

.text-gray-400 {
  color: #9ca3af;
}

.mb-4 {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.text-sm {
  font-size: 12px;
}

.text-green-500 {
  color: #67c23a;
}

.gap-2 {
  gap: 8px;
}

/* 甘特图图例 */
.gantt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.legend-color {
  display: inline-block;
  width: 16px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #dcdfe6;
}

/* Popover 编辑菜单 */
.gantt-popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
}

.gantt-popover {
  position: fixed;
  width: 240px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 2001;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.popover-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.popover-ship {
  font-size: 12px;
  color: #909399;
}

.popover-info {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  margin-bottom: 10px;
}

.popover-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 个人卡片（建设中） */
.profile-card-building {
  text-align: center;
  padding: 16px;
}

.profile-name {
  font-size: 18px;
  font-weight: 600;
  margin-top: 12px;
  color: #303133;
}

.profile-info {
  text-align: left;
  margin-top: 16px;
  font-size: 14px;
  color: #606266;
  line-height: 2;
}

.mt-4 {
  margin-top: 16px;
}
</style>
