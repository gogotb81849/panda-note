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
        </div>
        <div class="toolbar-right">
          <el-button type="warning" @click="showQuickReplaceDialog">
            下船交接
          </el-button>
          <el-button type="primary" @click="showCreateDialog">上船登记</el-button>
        </div>
      </div>
    </div>

    <!-- O4: 轮换预警看板 -->
    <div class="warning-dashboard">
      <el-card
        class="warning-card card-danger"
        shadow="hover"
        @click="onWarningClick('overdue')"
      >
        <div class="card-left">
          <div class="card-icon">🚨</div>
        </div>
        <div class="card-body">
          <div class="card-count">{{ warningStats.overdue.length }}</div>
          <div class="card-title">超期 / 违规</div>
          <div class="card-sub">在船超过10个月（极限/违规）</div>
          <div v-if="warningStats.overdue.length" class="card-names">
            {{ warningStats.overdue.slice(0,3).map(a => a.user?.realName).join('、') }}{{ warningStats.overdue.length > 3 ? ' 等' : '' }}
          </div>
        </div>
      </el-card>

      <el-card
        class="warning-card card-warn"
        shadow="hover"
        @click="onWarningClick('expiring30')"
      >
        <div class="card-left">
          <div class="card-icon">⚠️</div>
        </div>
        <div class="card-body">
          <div class="card-count">{{ warningStats.expiring30.length }}</div>
          <div class="card-title">30天内到预警</div>
          <div class="card-sub">距满8个月不足30天，需尽快安排换班</div>
          <div v-if="warningStats.expiring30.length" class="card-names">
            {{ warningStats.expiring30.slice(0,3).map(a => a.user?.realName).join('、') }}{{ warningStats.expiring30.length > 3 ? ' 等' : '' }}
          </div>
        </div>
      </el-card>

      <el-card
        class="warning-card card-notice"
        shadow="hover"
        @click="onWarningClick('expiring60')"
      >
        <div class="card-left">
          <div class="card-icon">📌</div>
        </div>
        <div class="card-body">
          <div class="card-count">{{ warningStats.expiring60.length }}</div>
          <div class="card-title">60天内到期</div>
          <div class="card-sub">距关注期/预警期还有60天内</div>
          <div v-if="warningStats.expiring60.length" class="card-names">
            {{ warningStats.expiring60.slice(0,3).map(a => a.user?.realName).join('、') }}{{ warningStats.expiring60.length > 3 ? ' 等' : '' }}
          </div>
        </div>
      </el-card>

      <el-card
        class="warning-card card-vacant"
        shadow="hover"
        @click="onWarningClick('vacant')"
      >
        <div class="card-left">
          <div class="card-icon">🆘</div>
        </div>
        <div class="card-body">
          <div class="card-count">{{ warningStats.vacantShipIds.length }}</div>
          <div class="card-title">政委空缺船舶</div>
          <div class="card-sub">当前无活跃在任政委的船舶</div>
          <div v-if="warningStats.vacantShipIds.length" class="card-names">
            {{ vacantShipNames.slice(0,3).join('、') }}{{ vacantShipNames.length > 3 ? ' 等' : '' }}
          </div>
        </div>
      </el-card>
    </div>

    <!-- 甘特图视图 -->
    <div class="gantt-section">
      <!-- 甘特图颜色图例 -->
      <div class="gantt-legend">
        <span class="legend-item">
          <span class="legend-gradient" style="background:linear-gradient(to right,#67c23a 0%,#67c23a 45%,#e6a23c 65%,#f89a3c 80%,#f56c6c 92%,#ad0606 100%)"></span>
          在船渐变（绿→红）
        </span>
        <span class="legend-item"><span class="legend-color" style="background:#67c23a"></span>≤6月 正常</span>
        <span class="legend-item"><span class="legend-color" style="background:#f89a3c"></span>8月 预警</span>
        <span class="legend-item"><span class="legend-color" style="background:#ad0606"></span>>11月 违规</span>
        <span class="legend-item"><span class="legend-color" style="background:#b8b8b8"></span>已下船</span>
        <span class="legend-item"><span class="legend-color" style="background:#e6a23c;background-image:repeating-linear-gradient(45deg,#fff 0,#fff 2px,transparent 2px,transparent 6px)"></span>休假</span>
      </div>
      <!-- 甘特图组件 -->
      <StaffGanttChart
        :ships="ships"
        :assignments="filteredAssignments as any"
        :vacant-ship-ids="warningStats.vacantShipIds"
        :loading="loading"
        @bar-click="onBarClick"
        @empty-click="onEmptyClick"
      />
    </div>

    <!-- ====== 政委卡片（甘特图点击色条后弹出）====== -->
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
        <div class="popover-card-header">
          <el-avatar :size="40" icon="UserFilled" class="popover-avatar" />
          <div class="popover-card-title">
            <span class="popover-name">{{ popoverAssignment?.user?.realName || '未指派' }}</span>
            <span class="popover-ship">{{ popoverAssignment?.ship?.cnShipName }}</span>
          </div>
          <el-tag
            :type="popoverAssignment?.status === 'active' ? 'success' : popoverAssignment?.status === 'leave' ? 'warning' : 'info'"
            size="small"
          >{{ statusLabel(popoverAssignment?.status) }}</el-tag>
        </div>
        <div class="popover-card-info">
          <div class="info-row"><span class="info-label">上船日期</span><span class="info-value">{{ formatDate(popoverAssignment?.startDate) }}</span></div>
          <div v-if="popoverAssignment?.endDate" class="info-row"><span class="info-label">下船日期</span><span class="info-value">{{ formatDate(popoverAssignment?.endDate) }}</span></div>
          <div v-else class="info-row"><span class="info-label">在船天数</span><span class="info-value">{{ getDaysOnBoard(popoverAssignment) }} 天</span></div>
        </div>
        <div class="popover-card-actions">
          <el-button
            v-if="popoverAssignment?.status === 'active' && !popoverAssignment?.endDate"
            type="primary"
            size="small"
            class="action-primary"
            @click="handleReplaceFromPopover"
          >下船交接</el-button>
          <el-button size="small" @click="handleEdit(popoverAssignment!)">编辑</el-button>
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
          <el-select v-model="formData.userId" placeholder="选择政委" class="w-full" :disabled="!!editingId" filterable>
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="user.realName"
              :value="user.id"
            >
              <div class="user-option">
                <span class="user-name">{{ user.realName }}</span>
                <el-tag
                  v-if="userMetaMap[user.id]"
                  :type="userMetaMap[user.id].currentStatus === 'on_board' ? 'danger' : userMetaMap[user.id].currentStatus === 'on_leave' ? 'warning' : 'success'"
                  size="small"
                  effect="plain"
                >
                  {{ userMetaMap[user.id].statusLabel }}
                  <span v-if="userMetaMap[user.id].currentStatus === 'on_board' && userMetaMap[user.id].currentShipName">
                    · {{ userMetaMap[user.id].currentShipName }}
                  </span>
                </el-tag>
                <span v-if="userMetaMap[user.id]?.totalAssignments > 0" class="user-meta-chip">
                  派任{{ userMetaMap[user.id].totalAssignments }}次
                </span>
                <span v-if="userMetaMap[user.id]?.avgDaysOnBoard > 0" class="user-meta-chip">
                  平均{{ userMetaMap[user.id].avgDaysOnBoard }}天
                </span>
                <span v-if="userMetaMap[user.id] && userMetaMap[user.id].lastOffDays > 0" class="user-meta-chip">
                  下船{{ userMetaMap[user.id].lastOffDays }}天
                </span>
                <span v-else-if="userMetaMap[user.id] && userMetaMap[user.id].lastOffDays === -2" class="user-meta-chip">
                  新人
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="选择船舶">
          <el-select v-model="formData.shipId" placeholder="选择船舶" class="w-full">
            <el-option
              v-for="ship in ships"
              :key="ship.id"
              :label="ship.cnShipName"
              :value="ship.id"
            >
              <div class="ship-option">
                <span class="ship-name">{{ ship.cnShipName }}</span>
                <el-tag v-if="warningStats.vacantShipIds.includes(ship.id)" type="danger" size="small" effect="plain">空缺</el-tag>
                <el-tag v-else type="success" size="small" effect="plain">在任</el-tag>
              </div>
            </el-option>
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
          <!-- O5: 里程碑日期提示 -->
          <div v-if="milestoneDates" class="milestone-hint">
            <div class="milestone-title">📅 派任里程碑预估（以上船日期起算）：</div>
            <div class="milestone-row">
              <span class="ms-dot ms-normal"></span><span class="ms-label">满6个月关注起：</span><b>{{ milestoneDates.m6 }}</b>
            </div>
            <div class="milestone-row">
              <span class="ms-dot ms-warn"></span><span class="ms-label">满8个月预警起：</span><b>{{ milestoneDates.m8 }}</b>
            </div>
            <div class="milestone-row">
              <span class="ms-dot ms-limit"></span><span class="ms-label">满10个月极限点：</span><b>{{ milestoneDates.m10 }}</b>
            </div>
          </div>
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

    <!-- ====== 下船交接对话框 ====== -->
    <el-dialog v-model="showReplaceDialog" title="下船交接" width="560px" @closed="resetReplaceForm">
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
              <div class="user-option">
                <span class="user-name">{{ user.realName }}</span>
                <el-tag
                  v-if="userMetaMap[user.id]"
                  :type="userMetaMap[user.id].currentStatus === 'on_board' ? 'danger' : userMetaMap[user.id].currentStatus === 'on_leave' ? 'warning' : 'success'"
                  size="small"
                  effect="plain"
                >
                  {{ userMetaMap[user.id].statusLabel }}
                  <span v-if="userMetaMap[user.id].currentStatus === 'on_board' && userMetaMap[user.id].currentShipName">
                    · {{ userMetaMap[user.id].currentShipName }}
                  </span>
                </el-tag>
                <span v-if="userMetaMap[user.id]?.totalAssignments > 0" class="user-meta-chip">
                  派任{{ userMetaMap[user.id].totalAssignments }}次
                </span>
                <span v-if="userMetaMap[user.id]?.avgDaysOnBoard > 0" class="user-meta-chip">
                  平均{{ userMetaMap[user.id].avgDaysOnBoard }}天
                </span>
                <span v-if="userMetaMap[user.id] && userMetaMap[user.id].lastOffDays > 0" class="user-meta-chip">
                  下船{{ userMetaMap[user.id].lastOffDays }}天
                </span>
                <span v-else-if="userMetaMap[user.id] && userMetaMap[user.id].lastOffDays === -2" class="user-meta-chip">
                  新人
                </span>
              </div>
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
          <div v-if="replaceForm.boardDate" class="milestone-hint">
            <div class="milestone-title">📅 里程碑预估：</div>
            <div class="milestone-row">
              <span class="ms-dot ms-normal"></span> 关注 {{ addMonths(replaceForm.boardDate, 6) }} ·
              <span class="ms-dot ms-warn"></span> 预警 {{ addMonths(replaceForm.boardDate, 8) }} ·
              <span class="ms-dot ms-limit"></span> 极限 {{ addMonths(replaceForm.boardDate, 10) }}
            </div>
          </div>
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
        <el-button type="primary" :loading="replacing" @click="submitReplace">确认下船交接</el-button>
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
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useApi } from '~/composables/useApi';
import { useStaffAssignment } from '~/composables/useStaffAssignment';
import type { StaffAssignment, Ship, User, StaffHistory, CreateStaffHistoryRequest } from '~/types';
import { ElMessage, ElMessageBox } from 'element-plus';

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute();

const api = useApi();
const {
  assignments, loading, loadAll,
  createAssignment, checkOut, startLeave, endLeave, deleteAssignment,
  statusLabel, statusType
} = useStaffAssignment();

// ====== 船舶 + 用户 + 派任数据 ======
const ships = ref<Ship[]>([]);
const users = ref<User[]>([]);
const selectedShipId = ref<number | null>(null);

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
  if (selectedShipId.value) {
    return assignments.value.filter(a => a.shipId === selectedShipId.value);
  }
  return assignments.value;
});

// ====== 工具函数 ======
const formatDate = (date?: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 给模板用的月份偏移工具（replace dialog 里程碑）
function addMonths(dateStr: string, m: number): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  d.setMonth(d.getMonth() + m)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getDaysOnBoard(assignment?: StaffAssignment | null): number {
  if (!assignment?.startDate) return 0;
  const start = new Date(assignment.startDate).getTime();
  const end = assignment.endDate ? new Date(assignment.endDate).getTime() : Date.now();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

// ====== 轮换预警看板 O4 ======
interface WarningStats {
  overdue: StaffAssignment[]  // >300天 极限/违规
  expiring30: StaffAssignment[] // 距今天<=30天满8个月（180+30*8？还是距endDate<30? 我们按startDate + 240天(8个月)在30天内算30天内到期）
  expiring60: StaffAssignment[] // startDate + 210天(7个月)在60天内，即未来60天内进入关注/预警期
  vacantShipIds: number[] // 船舶无active政委
}

const DAY = 1000 * 60 * 60 * 24

const warningStats = computed<WarningStats>(() => {
  const now = Date.now()
  const activeOnBoard: StaffAssignment[] = []
  assignments.value.forEach(a => {
    if (a.status === 'active' && !a.endDate) activeOnBoard.push(a)
  })

  const overdue: StaffAssignment[] = []
  const expiring30: StaffAssignment[] = []
  const expiring60: StaffAssignment[] = []

  activeOnBoard.forEach(a => {
    const days = getDaysOnBoard(a)
    if (days > 300) overdue.push(a)
    // 6个月=180天 关注期开始，距离满8个月(240天) <30天 → 30天内进入预警期 → 30天内到期
    const daysTo240 = 240 - days
    if (daysTo240 > 0 && daysTo240 <= 30) expiring30.push(a)
    // 距离满6个月(180天) <60天且>30天 → 60天内进入关注期
    const daysTo180 = 180 - days
    if ((daysTo180 > 0 && daysTo180 <= 60) || (daysTo240 > 30 && daysTo240 <= 60)) {
      if (!expiring30.includes(a)) expiring60.push(a)
    }
  })

  const occupiedShipIds = new Set<number>()
  activeOnBoard.forEach(a => occupiedShipIds.add(a.shipId))
  const vacantShipIds = ships.value
    .filter(s => !occupiedShipIds.has(s.id))
    .map(s => s.id)

  return { overdue, expiring30, expiring60, vacantShipIds }
})

const vacantShipNames = computed(() =>
  ships.value
    .filter(s => warningStats.value.vacantShipIds.includes(s.id))
    .map(s => s.cnShipName)
)

// 点击预警卡片：一键筛选到对应船舶/人员
const onWarningClick = (type: 'overdue' | 'expiring30' | 'expiring60' | 'vacant') => {
  const stats = warningStats.value
  if (type === 'vacant') {
    // 不筛选船舶，保持全部显示以让用户扫空缺
    selectedShipId.value = null
    return
  }
  const list = stats[type]
  if (list.length === 1) {
    selectedShipId.value = list[0].shipId
  } else {
    selectedShipId.value = null
  }
}

// ====== 里程碑日期提示 (O5): 根据startDate计算6/8/10个月节点 ======
const milestoneDates = computed(() => {
  const sd = formData.value.startDate
  if (!sd) return null
  const d = new Date(sd)
  if (isNaN(d.getTime())) return null
  function addMonths(base: Date, m: number): string {
    const x = new Date(base)
    x.setMonth(x.getMonth() + m)
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
  }
  return {
    m6: addMonths(d, 6),
    m8: addMonths(d, 8),
    m10: addMonths(d, 10),
  }
})

// ====== 人才池富状态 (O6): 每位用户的历史派任统计 ======
interface UserPoolMeta {
  currentStatus: 'on_board' | 'on_leave' | 'idle'
  statusLabel: string
  lastOffDays: number // 上次下船距今天数，-1表示仍在船或无记录
  totalAssignments: number
  avgDaysOnBoard: number
  currentShipName?: string
}

const userMetaMap = computed<Record<number, UserPoolMeta>>(() => {
  const result: Record<number, UserPoolMeta> = {}
  const now = Date.now()
  users.value.forEach(u => {
    const userAssignments = assignments.value
      .filter(a => a.userId === u.id)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))

    let currentStatus: UserPoolMeta['currentStatus'] = 'idle'
    let statusLabel = '待派'
    let currentShipName: string | undefined
    let lastOffDays = -1

    const active = userAssignments.find(a => a.status === 'active' && !a.endDate)
    const onLeave = userAssignments.find(a => a.status === 'leave')
    if (active) {
      currentStatus = 'on_board'
      statusLabel = '在船'
      currentShipName = active.ship?.cnShipName
    } else if (onLeave) {
      currentStatus = 'on_leave'
      statusLabel = '休假中'
    } else {
      // 取最后一个ended记录计算lastOffDays
      const lastEnded = userAssignments.find(a => a.status === 'ended' || a.endDate)
      if (lastEnded?.endDate) {
        lastOffDays = Math.floor((now - new Date(lastEnded.endDate).getTime()) / DAY)
      } else {
        lastOffDays = -2 // 从未派任
      }
    }

    const totalAssignments = userAssignments.length
    let totalDays = 0
    userAssignments.forEach(a => { totalDays += getDaysOnBoard(a as any) })
    const avgDaysOnBoard = totalAssignments > 0 ? Math.floor(totalDays / totalAssignments) : 0

    result[u.id] = { currentStatus, statusLabel, lastOffDays, totalAssignments, avgDaysOnBoard, currentShipName }
  })
  return result
})

// ====== 数据加载 ======
const loadShips = async () => {
  try {
    const result = await api.ships.getAll() as Ship[];
    ships.value = Array.isArray(result) ? result : [];
  } catch (e) {
    console.error('加载船舶列表失败', e);
    ships.value = [];
  }
};

const loadUsers = async () => {
  try {
    const response = await api.userManagement.listUsers({ page: 1, pageSize: 200 }) as any;
    const allUsers = response?.users || response || [];
    users.value = Array.isArray(allUsers) ? allUsers.filter((u: User) => u.role === 'ship_political_instructor') : [];
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

// 甘特图空白区域点击 → 直接上船登记（预填船舶）
const onEmptyClick = (payload: { shipId: number; date: string }) => {
  editingId.value = null;
  formData.value = {
    userId: undefined,
    shipId: payload.shipId,
    startDate: payload.date,
    endDate: '',
    assignmentNo: '',
    sourceCompany: '',
    remark: '',
  };
  showDialog.value = true;
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
  // === O1: 前端日期先后校验 ===
  if (formData.value.startDate && formData.value.endDate) {
    const s = new Date(formData.value.startDate).getTime();
    const e = new Date(formData.value.endDate).getTime();
    if (isNaN(s) || isNaN(e)) { ElMessage.warning('日期格式不正确'); return; }
    if (s > e) { ElMessage.warning('上船日期不能晚于下船日期，请检查后重试'); return; }
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
  // 筛选由 computed 属性自动处理
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

// 从甘特图 popover 触发换班：自动带入当前船舶
const handleReplaceFromPopover = () => {
  const a = popoverAssignment.value;
  if (!a?.shipId) return;
  popoverVisible.value = false;
  replaceForm.value.shipId = a.shipId;
  onReplaceShipChange(a.shipId);
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

  // === O2: 换班窗口校验 - 新政委上船日期 >= 旧政委下船日期 ===
  if (currentAssignment && checkoutDate && boardDate) {
    const out = new Date(checkoutDate).getTime();
    const b = new Date(boardDate).getTime();
    if (isNaN(out) || isNaN(b)) { ElMessage.warning('日期格式不正确'); return; }
    if (b < out) {
      try {
        await ElMessageBox.confirm(
          `新政委上船日期（${boardDate}）早于旧政委下船日期（${checkoutDate}），该时段内可能同时出现两位在船政委。是否仍继续？`,
          '存在派任时间重叠',
          { type: 'warning', confirmButtonText: '仍继续', cancelButtonText: '取消' }
        );
      } catch { return; }
    }
  }

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
  // 从URL读取shipId参数并自动筛选（从船舶管理页面跳转过来时使用）
  const urlShipId = route.query.shipId;
  if (urlShipId) {
    const numId = Number(urlShipId);
    if (!isNaN(numId)) {
      await nextTick();
      selectedShipId.value = numId;
      filterByShip();
      const ship = ships.value.find((s: Ship) => s.id === numId);
      if (ship) {
        ElMessage.info(`已定位到船舶：${ship.cnShipName}，可点击上方"上船登记"按钮指派政委`);
      }
    }
  }
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

.legend-gradient {
  display: inline-block;
  width: 48px;
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
  width: 280px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  padding: 0;
  z-index: 2001;
  overflow: hidden;
}

.popover-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%);
  border-bottom: 1px solid #ebeef5;
}

.popover-avatar {
  flex-shrink: 0;
  background: #409eff;
}

.popover-card-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.popover-ship {
  font-size: 12px;
  color: #909399;
}

.popover-card-info {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  line-height: 2;
}

.info-label {
  color: #909399;
}

.info-value {
  color: #303133;
  font-weight: 500;
}

.popover-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
}

.popover-card-actions .action-primary {
  flex: 1 1 100%;
  margin-bottom: 4px;
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

/* === O4: 轮换预警看板 === */
.warning-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.warning-card {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px 8px;
  position: relative;
  overflow: hidden;
}

.warning-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
}

.warning-card :deep(.el-card__body) {
  display: flex;
  padding: 14px 12px;
  gap: 12px;
  align-items: flex-start;
}

.card-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  font-size: 24px;
}

.card-danger .card-left { background: rgba(245,108,108,0.12); }
.card-warn .card-left { background: rgba(230,162,60,0.12); }
.card-notice .card-left { background: rgba(64,158,255,0.12); }
.card-vacant .card-left { background: rgba(217,119,6,0.12); }

.card-body {
  flex: 1;
  min-width: 0;
}

.card-count {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 2px;
}
.card-danger .card-count { color: #ad0606; }
.card-warn .card-count { color: #e6a23c; }
.card-notice .card-count { color: #409eff; }
.card-vacant .card-count { color: #d97706; }

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.card-sub {
  font-size: 11px;
  color: #909399;
  line-height: 1.4;
  margin-bottom: 4px;
}

.card-names {
  font-size: 11px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === O5: 里程碑日期提示 === */
.milestone-hint {
  margin-top: 8px;
  padding: 10px 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
}

.milestone-title {
  font-size: 12px;
  color: #409eff;
  font-weight: 600;
  margin-bottom: 6px;
}

.milestone-row {
  font-size: 12px;
  color: #606266;
  line-height: 1.9;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ms-label {
  color: #606266;
}

.ms-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ms-normal { background: #67c23a; }
.ms-warn { background: #f89a3c; }
.ms-limit { background: #f56c6c; }

/* === O6: 人才池富状态 === */
.user-option, .ship-option {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 2px 0;
}

.user-name, .ship-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  margin-right: 4px;
}

.user-meta-chip {
  display: inline-block;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  background: #f4f4f5;
  color: #909399;
  font-size: 10px;
  border-radius: 9px;
  white-space: nowrap;
}
</style>
