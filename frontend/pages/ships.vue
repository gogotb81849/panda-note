<template>
  <div class="ships-page">
    <div class="page-header">
      <el-button text @click="goBack" class="p-1">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h1 class="text-xl font-bold text-gray-800">船舶资料</h1>
    </div>

    <div class="content-area">
      <div class="toolbar">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-semibold text-gray-800">
              船舶列表
              <span v-if="selectedRows.length > 0" class="ml-2 text-sm text-gray-500">
                (已选 {{ selectedRows.length }} 项)
              </span>
              <span v-if="isEditing" class="ml-2 text-sm text-blue-500">
                · 编辑模式
              </span>
            </h3>
            <el-tabs v-model="viewMode" type="card" class="view-tabs">
              <el-tab-pane label="表格视图" name="table">
                <template #label>
                  <el-icon><Grid /></el-icon>
                  表格
                </template>
              </el-tab-pane>
              <el-tab-pane label="卡片视图" name="card">
                <template #label>
                  <el-icon><Grid /></el-icon>
                  卡片
                </template>
              </el-tab-pane>
            </el-tabs>
          </div>
          <div class="flex items-center gap-3">
            <template v-if="selectedRows.length > 0">
              <el-button size="small" type="warning" @click="batchClearData">
                <el-icon><Delete /></el-icon>
                清空数据
              </el-button>
              <el-button size="small" type="danger" @click="batchDelete">
                <el-icon><Delete /></el-icon>
                批量删除
              </el-button>
              <el-divider direction="vertical" />
            </template>
            
            <!-- 编辑模式切换按钮 -->
            <el-button
              :type="isEditing ? 'warning' : 'primary'"
              size="small"
              @click="toggleEditMode"
            >
              <el-icon><Edit /></el-icon>
              {{ isEditing ? '退出编辑' : '进入编辑' }}
            </el-button>
            
            <!-- 保存按钮（编辑模式下显示） -->
            <el-button
              v-if="isEditing"
              type="success"
              size="small"
              :loading="saving"
              @click="saveAllRows"
              :disabled="!hasChanges"
            >
              <el-icon><Check /></el-icon>
              保存全部
            </el-button>
            
            <!-- 取消编辑按钮（编辑模式下有修改时显示） -->
            <el-button
              v-if="isEditing && hasChanges"
              size="small"
              @click="cancelAllEdits"
            >
              <el-icon><Close /></el-icon>
              取消修改
            </el-button>
            
            <el-input
              v-model="searchText"
              placeholder="搜索..."
              size="small"
              clearable
              style="width: 200px"
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" size="small" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增船舶
            </el-button>
            <el-button size="small" @click="exportToExcel">
              <el-icon><Download /></el-icon>
              导出Excel
            </el-button>
            <el-button size="small" @click="loadShips">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="viewMode === 'table'" class="table-container" ref="tableContainerRef" @contextmenu="handleContainerContextMenu">
        <el-table
            ref="tableRef"
            :data="paginatedShips"
            style="width: 100%"
            class="!bg-transparent compact-table"
            border
            stripe
            v-loading="loading"
            resizable
            row-key="id"
            :row-class-name="getRowClassName"
            @selection-change="handleSelectionChange"
            @row-click="handleRowClick"
            @row-contextmenu="handleRowContextMenu"
        >
          <el-table-column
            type="selection"
            width="55"
            fixed
          />
          <el-table-column
            type="index"
            label="序号"
            width="80"
            align="center"
            fixed
            v-if="visibleColumns.includes('index')"
          >
            <template #header>
              <span>序号</span>
              <template v-if="ships.some(s => s.editing)">
                <div class="flex gap-1 justify-center mt-1">
                  <el-button
                    type="primary"
                    size="small"
                    @click="saveAllRows"
                  >
                    保存全部
                  </el-button>
                  <el-button
                    size="small"
                    @click="cancelAllEdits"
                  >
                    取消全部
                  </el-button>
                </div>
              </template>
            </template>
            <template #default="{ $index }">
              <span>{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="cnShipName"
            label="中文船名"
            min-width="160"
            :fixed="fixedColumns['cnShipName']"
            v-if="visibleColumns.includes('cnShipName')"
          >
            <template #default="{ row }">
              <span v-if="isEditing">
                <span
                  contenteditable="true"
                  @blur="onCellEdit(row, 'cnShipName', $event)"
                  class="editable-cell"
                  :data-original="row.cnShipName"
                >{{ row.cnShipName }}</span>
              </span>
              <span v-else class="ship-name-with-badges">
                <span>{{ row.cnShipName }}</span>
                <span
                  v-if="row.piracyZone"
                  class="region-badge region-piracy"
                  title="海盗区 - 高风险"
                >🏴‍☠️</span>
                <span
                  v-else-if="row.etaPortRegion === 'fiveEyes'"
                  class="region-badge region-five-eyes"
                  title="五眼联盟国家"
                >👁️</span>
                <span
                  v-else-if="row.etaPortRegion === 'europe'"
                  class="region-badge region-europe"
                  title="欧洲"
                >🇪🇺</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column
            prop="enShipName"
            label="英文船名"
            min-width="140"
            v-if="visibleColumns.includes('enShipName')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'enShipName', $event)"
                class="editable-cell"
              >{{ row.enShipName || '-' }}</span>
              <span v-else>{{ row.enShipName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="flagCountry"
            label="船旗国"
            min-width="100"
            v-if="visibleColumns.includes('flagCountry')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'flagCountry', $event)"
                class="editable-cell"
              >{{ row.flagCountry || '-' }}</span>
              <span v-else>{{ row.flagCountry || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="portRegistry"
            label="船籍港"
            min-width="100"
            v-if="visibleColumns.includes('portRegistry')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'portRegistry', $event)"
                class="editable-cell"
              >{{ row.portRegistry || '-' }}</span>
              <span v-else>{{ row.portRegistry || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="shipType"
            label="船型"
            min-width="100"
            v-if="visibleColumns.includes('shipType')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'shipType', $event)"
                class="editable-cell"
              >{{ row.shipType || '-' }}</span>
              <span v-else>{{ row.shipType || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="deadweightTonnage"
            label="载重吨"
            min-width="100"
            v-if="visibleColumns.includes('deadweightTonnage')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'deadweightTonnage', $event)"
                class="editable-cell"
              >{{ row.deadweightTonnage || '-' }}</span>
              <span v-else>{{ row.deadweightTonnage || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="factoryDate"
            label="出厂时间"
            min-width="100"
            v-if="visibleColumns.includes('factoryDate')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'factoryDate', $event)"
                class="editable-cell"
              >{{ row.factoryDate || '-' }}</span>
              <span v-else>{{ row.factoryDate || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="船龄"
            min-width="80"
            v-if="visibleColumns.includes('shipAge')"
          >
            <template #default="{ row }">
              <span>{{ calculateShipAge(row.factoryDate) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="teamDisplayName"
            label="所属团队"
            min-width="100"
            v-if="visibleColumns.includes('teamDisplayName')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'teamDisplayName', $event)"
                class="editable-cell"
              >{{ row.teamDisplayName || '-' }}</span>
              <span v-else>{{ row.teamDisplayName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="marineSupervisor"
            label="海务主管"
            min-width="100"
            v-if="visibleColumns.includes('marineSupervisor')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'marineSupervisor', $event)"
                class="editable-cell"
              >{{ row.marineSupervisor || '-' }}</span>
              <span v-else>{{ row.marineSupervisor || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="engineerSupervisor"
            label="机务主管"
            min-width="100"
            v-if="visibleColumns.includes('engineerSupervisor')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'engineerSupervisor', $event)"
                class="editable-cell"
              >{{ row.engineerSupervisor || '-' }}</span>
              <span v-else>{{ row.engineerSupervisor || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="electricSupervisor"
            label="电气主管"
            min-width="100"
            v-if="visibleColumns.includes('electricSupervisor')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'electricSupervisor', $event)"
                class="editable-cell"
              >{{ row.electricSupervisor || '-' }}</span>
              <span v-else>{{ row.electricSupervisor || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="crewSupervisor"
            label="船工主管"
            min-width="100"
            v-if="visibleColumns.includes('crewSupervisor')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'crewSupervisor', $event)"
                class="editable-cell"
              >{{ row.crewSupervisor || '-' }}</span>
              <span v-else>{{ row.crewSupervisor || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="politicalInstructor"
            label="船舶政委"
            min-width="120"
            v-if="visibleColumns.includes('politicalInstructor')"
          >
            <template #default="{ row }">
              <div class="instructor-cell">
                <span
                  v-if="isEditing"
                  contenteditable="true"
                  @blur="onCellEdit(row, 'politicalInstructor', $event)"
                  class="editable-cell"
                >{{ row.politicalInstructor || '-' }}</span>
                <span v-else>{{ row.politicalInstructor || '-' }}</span>
                <el-button size="small" link type="primary" @click="showInstructorHistory(row)">历史</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="instructorIdNumber"
            label="政委身份证号"
            min-width="180"
            v-if="visibleColumns.includes('instructorIdNumber')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'instructorIdNumber', $event)"
                class="editable-cell"
              >{{ row.instructorIdNumber || '-' }}</span>
              <span v-else>{{ maskIdNumber(row.instructorIdNumber) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="onBoardDate"
            label="上船时间"
            min-width="100"
            v-if="visibleColumns.includes('onBoardDate')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'onBoardDate', $event)"
                class="editable-cell"
              >{{ row.onBoardDate || '-' }}</span>
              <span v-else>{{ row.onBoardDate || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="daysOnBoard"
            label="在船天数"
            min-width="80"
            v-if="visibleColumns.includes('daysOnBoard')"
          >
            <template #default="{ row }">
              <span>{{ calculateDaysOnBoard(row.onBoardDate) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="sendCompany"
            label="派员公司"
            min-width="120"
            :fixed="fixedColumns['sendCompany']"
            v-if="visibleColumns.includes('sendCompany')"
          >
            <template #default="{ row }">
              <span
                v-if="isEditing"
                contenteditable="true"
                @blur="onCellEdit(row, 'sendCompany', $event)"
                class="editable-cell"
              >{{ row.sendCompany || '-' }}</span>
              <span v-else>{{ row.sendCompany || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="viewMode === 'table'" class="pagination-area">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredShips.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <div v-if="viewMode === 'card'" class="card-view-container">
        <ShipCardGroup :ships="ships" />
      </div>
    </div>

    <ShipContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :type="contextMenu.type"
      :column="contextMenu.column"
      :row="contextMenu.row"
      :column-options="columnOptions"
      :visible-columns="visibleColumns"
      :fixed-columns="fixedColumns"
      :all-data="ships"
      :active-filters="activeFilters"
      @close="contextMenu.visible = false"
      @sort-asc="sortAsc"
      @sort-desc="sortDesc"
      @clear-filter="clearFilter"
      @fix-column-left="fixColumnLeft"
      @fix-column-right="fixColumnRight"
      @unfix-column="unfixColumn"
      @auto-fit-column="autoFitColumn"
      @hide-current-column="hideCurrentColumn"
      @toggle-column-visibility="toggleColumnVisibility"
      @show-all-columns="showAllColumns"
      @reset-columns="resetColumns"
      @edit-row="editRow"
      @copy-row="copyRow"
      @copy-cell-value="copyCellValue"
      @delete-row="handleDelete"
      @apply-column-filter="applyColumnFilter"
    />

    <ShipAddDialog v-model="addDialogVisible" @save="saveNewShip" />

    <!-- 政委任职历史弹窗 -->
    <el-dialog v-model="instructorHistoryVisible" :title="`${currentShip?.cnShipName || ''} - 政委任职历史`" width="600px">
      <el-table :data="instructorHistoryList" border stripe>
        <el-table-column prop="staffName" label="政委姓名" min-width="100" />
        <el-table-column prop="startDate" label="上船时间" min-width="120" />
        <el-table-column prop="endDate" label="下船时间" min-width="120">
          <template #default="{ row }">
            {{ row.endDate || '至今' }}
          </template>
        </el-table-column>
        <el-table-column label="在船天数" min-width="80">
          <template #default="{ row }">
            {{ calculateStaffDays(row.startDate, row.endDate) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="instructorHistoryVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { Refresh, Plus, Search, Download, ArrowLeft, Edit, Check, Close, Grid } from '@element-plus/icons-vue';
import type { Ship } from '~/types';
import { useApi } from '~/composables/useApi';
import ShipContextMenu from '~/components/ShipContextMenu.vue';
import ShipCardGroup from '~/components/ShipCardGroup.vue';

definePageMeta({
  middleware: ['auth'],
})

const api = useApi();
const router = useRouter();

const tableRef = ref<any>(null);
const ships = ref<(Ship & { editing?: boolean; originalData?: Ship })[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(50);
const addDialogVisible = ref(false);
const sortProp = ref<string>('');
const sortOrder = ref<'ascending' | 'descending' | ''>('');
const searchText = ref('');
const selectedRows = ref<any[]>([]);
const viewMode = ref<'table' | 'card'>('table');

// 点击选中的行ID列表
const selectedIds = ref<Set<number>>(new Set());

// 政委任职历史相关
const instructorHistoryVisible = ref(false);
const instructorHistoryList = ref<any[]>([]);
const currentShip = ref<any>(null);

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: 'header' as 'header' | 'row',
  column: null as any,
  row: null as any
});

const activeFilters = ref<Record<string, string[]>>({});
const fixedColumns = ref<Record<string, 'left' | 'right' | ''>>({});

// 新增：编辑模式状态
const isEditing = ref(false);
const saving = ref(false);
const hasChanges = ref(false);
const autoSaveTimer = ref<number | null>(null);

// 可编辑的字段列表
const editableFields = [
  'cnShipName', 'enShipName', 'flagCountry', 'portRegistry', 'shipType',
  'deadweightTonnage', 'factoryDate', 'teamDisplayName', 'marineSupervisor',
  'engineerSupervisor', 'electricSupervisor', 'crewSupervisor',
  'politicalInstructor', 'instructorIdNumber', 'onBoardDate', 'sendCompany',
];

const columnOptions = [
  { value: 'index', label: '序号' },
  { value: 'cnShipName', label: '中文船名' },
  { value: 'enShipName', label: '英文船名' },
  { value: 'flagCountry', label: '船旗国' },
  { value: 'portRegistry', label: '船籍港' },
  { value: 'shipType', label: '船型' },
  { value: 'deadweightTonnage', label: '载重吨' },
  { value: 'factoryDate', label: '出厂时间' },
  { value: 'shipAge', label: '船龄' },
  { value: 'teamDisplayName', label: '所属团队' },
  { value: 'marineSupervisor', label: '海务主管' },
  { value: 'engineerSupervisor', label: '机务主管' },
  { value: 'electricSupervisor', label: '电气主管' },
  { value: 'crewSupervisor', label: '船工主管' },
  { value: 'politicalInstructor', label: '船舶政委' },
  { value: 'instructorIdNumber', label: '政委身份证号' },
  { value: 'onBoardDate', label: '上船时间' },
  { value: 'daysOnBoard', label: '在船天数' },
  { value: 'sendCompany', label: '派员公司' },
];

const defaultVisibleColumns = [
  'index',
  'cnShipName',
  'enShipName',
  'flagCountry',
  'portRegistry',
  'shipType',
  'deadweightTonnage',
  'factoryDate',
  'shipAge',
  'teamDisplayName',
  'marineSupervisor',
  'engineerSupervisor',
  'electricSupervisor',
  'crewSupervisor',
  'politicalInstructor',
  'instructorIdNumber',
  'onBoardDate',
  'daysOnBoard',
  'sendCompany',
];

const visibleColumns = ref<string[]>([...defaultVisibleColumns]);

const filteredShips = computed(() => {
  let result = [...ships.value];
  
  if (searchText.value) {
    const search = searchText.value.toLowerCase();
    result = result.filter(item => {
      return Object.values(item).some(val => 
        val && String(val).toLowerCase().includes(search)
      );
    });
  }
  
  Object.keys(activeFilters.value).forEach(key => {
    const filters = activeFilters.value[key];
    if (filters && filters.length > 0) {
      result = result.filter(item => {
        const value = item[key as keyof Ship];
        return filters.includes(value as string);
      });
    }
  });

  if (sortProp.value && sortOrder.value) {
    result.sort((a, b) => {
      const aVal = a[sortProp.value as keyof Ship];
      const bVal = b[sortProp.value as keyof Ship];
      if (sortOrder.value === 'ascending') {
        return (aVal || '') > (bVal || '') ? 1 : -1;
      } else {
        return (aVal || '') < (bVal || '') ? 1 : -1;
      }
    });
  }
  
  return result;
});

const paginatedShips = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredShips.value.slice(start, end);
});

const goBack = () => {
  router.push('/admin');
};

const loadShips = async () => {
  loading.value = true;
  try {
    const data = await api.ships.getAll();
    ships.value = (data as Ship[]).map(ship => {
      const copy = { ...ship };
      // 初始化 original_* 字段用于变更检测
      for (const field of editableFields) {
        (copy as any)['original_' + field] = ship[field as keyof Ship];
      }
      return copy;
    });
  } catch (error) {
    ElMessage.error('加载船舶列表失败');
  } finally {
    loading.value = false;
  }
};

// 切换编辑模式
const toggleEditMode = () => {
  if (isEditing.value) {
    // 退出编辑模式
    if (hasChanges.value) {
      ElMessageBox.confirm('有未保存的修改，确定要退出吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        cancelAllEdits();
        isEditing.value = false;
        hasChanges.value = false;
        clearAutoSaveTimer();
      }).catch(() => {});
    } else {
      isEditing.value = false;
      clearAutoSaveTimer();
    }
  } else {
    // 进入编辑模式
    isEditing.value = true;
    ElMessage.info('已进入编辑模式，点击单元格即可编辑，修改后会自动保存');
  }
};

// 单元格编辑处理
const onCellEdit = (row: any, field: string, event: Event) => {
  const target = event.target as HTMLElement;
  const newValue = target.textContent?.trim() || '';
  const oldValue = row[field];

  // 归一化：'-' 显示占位符视为空
  const normalizedNew = newValue === '-' ? '' : newValue;

  // 值未变化时不触发保存，避免点击但未修改导致不必要的请求
  if (normalizedNew === (oldValue ?? '')) return;

  // 更新数据
  row[field] = normalizedNew;

  // 标记有修改
  hasChanges.value = true;

  // 触发自动保存（3秒防抖）
  triggerAutoSave();
};

// 自动保存（防抖）
const triggerAutoSave = () => {
  clearAutoSaveTimer();
  autoSaveTimer.value = window.setTimeout(() => {
    saveAllRows();
  }, 3000);
};

// 清除自动保存定时器
const clearAutoSaveTimer = () => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value);
    autoSaveTimer.value = null;
  }
};

// 校验并格式化日期为 YYYY-MM-DD，返回 null 表示格式无效
const normalizeDate = (value: string | undefined | null): string | null => {
  if (!value || value === '-') return null;
  const trimmed = value.trim();
  // 已是 ISO 格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // 尝试解析
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  // 转为 ISO 格式
  return d.toISOString().split('T')[0];
};

const calculateShipAge = (factoryDate: string): string => {
  try {
    const year = parseInt(factoryDate);
    if (!isNaN(year)) {
      const currentYear = new Date().getFullYear();
      return (currentYear - year).toString() + '年';
    }
  } catch {
  }
  return '-';
};

// 身份证号脱敏显示
const maskIdNumber = (idNumber: string | undefined): string => {
  if (!idNumber || idNumber === '-') return '-';
  // 显示前3位和后4位，中间用*代替
  if (idNumber.length >= 7) {
    return idNumber.substring(0, 3) + '********' + idNumber.substring(idNumber.length - 4);
  }
  return idNumber;
};

// 计算在船天数
const calculateDaysOnBoard = (onBoardDate: string): string => {
  if (!onBoardDate) return '-';
  try {
    const start = new Date(onBoardDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? `${diffDays}天` : '-';
  } catch {
    return '-';
  }
};

// 计算人员任职天数
const calculateStaffDays = (startDate: string, endDate: string): string => {
  if (!startDate) return '-';
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? `${diffDays}天` : '-';
  } catch {
    return '-';
  }
};

// 显示政委任职历史
const showInstructorHistory = async (row: any) => {
  currentShip.value = row;
  try {
    const history = await api.staffHistory.getByShipId(row.id);
    instructorHistoryList.value = (history as any[])
      .filter((h: any) => h.postName === '政委')
      .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    instructorHistoryVisible.value = true;
  } catch (error) {
    ElMessage.error('加载政委任职历史失败');
  }
};

const getUniqueValues = (prop: string) => {
  const values = new Set<string>();
  ships.value.forEach(ship => {
    const value = ship[prop as keyof Ship];
    if (value) {
      values.add(value as string);
    }
  });
  return Array.from(values).map(v => ({ text: v, value: v }));
};

const handleFilter = (value: string, row: any, column: any) => {
  const prop = column.property;
  if (!activeFilters.value[prop]) {
    activeFilters.value[prop] = [];
  }
  const index = activeFilters.value[prop].indexOf(value);
  if (index > -1) {
    activeFilters.value[prop].splice(index, 1);
  } else {
    activeFilters.value[prop].push(value);
  }
  currentPage.value = 1;
  return true;
};

const handleSortChange = ({ prop, order }: any) => {
  sortProp.value = prop;
  sortOrder.value = order;
};

// 保留旧的编辑行方法（用于右键菜单）
const editRow = (row: any) => {
  if (!isEditing.value) {
    isEditing.value = true;
  }
  contextMenu.value.visible = false;
};

// 保存所有修改
const saveAllRows = async () => {
  if (!hasChanges.value) {
    return;
  }
  
  saving.value = true;
  clearAutoSaveTimer();
  
  // 收集所有有修改的行
  const changedRows = ships.value.filter(row => {
    // 检查是否有任何字段与原始数据不同
    return editableFields.some(field => {
      const original = (row as any)['original_' + field];
      return original !== undefined && row[field] !== original;
    });
  });
  
  if (changedRows.length === 0) {
    hasChanges.value = false;
    saving.value = false;
    return;
  }
  
  let successCount = 0;
  let failCount = 0;
  const instructorErrors: string[] = [];
  
  for (const row of changedRows) {
    try {
      // SQ4: 日期格式校验与统一
      const factoryDateNormalized = normalizeDate(row.factoryDate);
      const onBoardDateNormalized = normalizeDate(row.onBoardDate);
      
      if (row.factoryDate && factoryDateNormalized === null) {
        ElMessage.error(`船舶 ${row.cnShipName} 出厂时间格式无效`);
        failCount++;
        continue;
      }
      if (row.onBoardDate && onBoardDateNormalized === null) {
        ElMessage.error(`船舶 ${row.cnShipName} 上船时间格式无效`);
        failCount++;
        continue;
      }
      
      // SQ7: 只发送与 original_* 不同的字段
      const updateData: any = { id: row.id };
      for (const field of editableFields) {
        const original = (row as any)['original_' + field];
        if (original !== row[field]) {
          // 对日期字段使用标准化后的值
          if (field === 'factoryDate') {
            updateData[field] = factoryDateNormalized || '';
          } else if (field === 'onBoardDate') {
            updateData[field] = onBoardDateNormalized || '';
          } else {
            updateData[field] = row[field];
          }
        }
      }
      
      // SQ4: 更新行数据为标准化后的日期
      if (factoryDateNormalized !== null && row.factoryDate !== factoryDateNormalized) {
        row.factoryDate = factoryDateNormalized;
      }
      if (onBoardDateNormalized !== null && row.onBoardDate !== onBoardDateNormalized) {
        row.onBoardDate = onBoardDateNormalized;
      }
      
      // 检测政委信息变更
      const originalInstructor = (row as any)['original_politicalInstructor'];
      const originalOnBoardDate = (row as any)['original_onBoardDate'];
      if (originalInstructor !== undefined && (originalInstructor !== row.politicalInstructor || originalOnBoardDate !== row.onBoardDate)) {
        const newInstructor = row.politicalInstructor;
        const newOnBoardDate = row.onBoardDate;
        const oldInstructor = originalInstructor;
        const oldOnBoardDate = originalOnBoardDate;
        
        // SQ5: 收集政委历史操作错误，而非仅 console.error
        // 如果之前有政委，记录其下船
        if (oldInstructor && oldInstructor !== newInstructor) {
          try {
            const changeDate = newOnBoardDate || new Date().toISOString().split('T')[0];
            const currentRecords = await api.staffHistory.getCurrentStaff(row.id, changeDate);
            const oldInstructorRecord = (currentRecords as any[]).find((r: any) => r.postName === '政委' && r.staffName === oldInstructor && !r.endDate);
            
            if (oldInstructorRecord) {
              await api.staffHistory.update(oldInstructorRecord.id, { endDate: changeDate });
            } else {
              await api.staffHistory.create({
                shipId: row.id,
                postName: '政委',
                staffName: oldInstructor,
                startDate: oldOnBoardDate || changeDate,
                endDate: changeDate,
              });
            }
          } catch (e) {
            console.error('记录旧政委下船失败', e);
            instructorErrors.push(`${row.cnShipName}: 旧政委下船记录失败`);
          }
        }
        
        // 创建新政委的任职记录
        if (newInstructor) {
          try {
            const startDate = newOnBoardDate || new Date().toISOString().split('T')[0];
            await api.staffHistory.create({
              shipId: row.id,
              postName: '政委',
              staffName: newInstructor,
              startDate,
            });
          } catch (e) {
            console.error('创建新政委任职记录失败', e);
            instructorErrors.push(`${row.cnShipName}: 新政委任职记录创建失败`);
          }
        }
      }
      
      await api.ships.update(row.id, updateData);
      
      // 更新原始数据
      for (const field of editableFields) {
        (row as any)['original_' + field] = row[field];
      }
      
      successCount++;
    } catch (error) {
      console.error('保存失败:', error);
      failCount++;
    }
  }
  
  if (successCount > 0) {
    ElMessage.success(`成功保存 ${successCount} 条记录`);
  }
  if (failCount > 0) {
    ElMessage.error(`${failCount} 条记录保存失败`);
  }
  // SQ5: 提示政委历史操作失败详情
  if (instructorErrors.length > 0) {
    ElMessage.warning({
      message: `政委历史操作失败 (${instructorErrors.length} 条): ${instructorErrors.join('; ')}`,
      duration: 6000,
    });
  }
  
  hasChanges.value = false;
  saving.value = false;
};

const cancelAllEdits = () => {
  // 恢复原始数据
  for (const row of ships.value) {
    for (const field of editableFields) {
      const original = (row as any)['original_' + field];
      if (original !== undefined) {
        row[field] = original;
      }
    }
  }
  hasChanges.value = false;
  ElMessage.info('已取消所有修改');
};

const handleDelete = async (row: any) => {
  contextMenu.value.visible = false;
  if (!row || !row.id) {
    ElMessage.error('未找到要删除的记录');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定要删除 "${row.cnShipName || '该船舶'}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    await api.ships.delete(row.id);
    ElMessage.success('删除成功');
    loadShips();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const handleAdd = () => {
  addDialogVisible.value = true;
};

const saveNewShip = async (shipData: Partial<Ship>) => {
  // SQ1: cnShipName 必填校验
  if (!shipData.cnShipName || !shipData.cnShipName.trim()) {
    ElMessage.error('中文船名为必填项');
    return;
  }
  
  try {
    await api.ships.create(shipData);
    ElMessage.success('新增成功');
    addDialogVisible.value = false;
    loadShips();
  } catch (error) {
    ElMessage.error('新增失败');
  }
};

const handleSizeChange = () => {
  currentPage.value = 1;
};

const handleCurrentChange = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection;
};

// 处理行点击：切换选中状态
const handleRowClick = (row: any, column: any, event: MouseEvent) => {
  if (!row || !row.id) return;
  
  // 点击复选框时不重复处理
  const target = event.target as HTMLElement;
  if (target.closest('.el-checkbox')) {
    return;
  }
  
  // 同步切换 Element Plus 的复选框选中状态
  tableRef.value?.toggleRowSelection(row);
  
  // 同步更新 selectedIds
  if (selectedIds.value.has(row.id)) {
    selectedIds.value.delete(row.id);
  } else {
    selectedIds.value.add(row.id);
  }
  selectedIds.value = new Set(selectedIds.value);
};

// 检查行是否被点击选中
const isRowSelected = (row: any): boolean => {
  return row && row.id && selectedIds.value.has(row.id);
};

// 获取行的 class 名称
const getRowClassName = ({ row }: { row: any }): string => {
  return isRowSelected(row) ? 'selected-row' : '';
};

const exportToExcel = () => {
  if (filteredShips.value.length === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }

  try {
    const headers = columnOptions.map(col => col.label);
    const headerRow = headers.join(',');
    
    const rows = filteredShips.value.map(ship => {
      return columnOptions.map(col => {
        let value: string;
        if (col.value === 'shipAge') {
          value = calculateShipAge(ship.factoryDate);
        } else if (col.value === 'daysOnBoard') {
          value = calculateDaysOnBoard(ship.onBoardDate);
        } else {
          value = ship[col.value as keyof Ship];
          if (value === undefined || value === null) value = '';
        }
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',');
    });
    
    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `船舶资料_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

const batchDelete = async () => {
  if (selectedRows.value.length === 0) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    let successCount = 0;
    for (const row of selectedRows.value) {
      try {
        await api.ships.delete(row.id);
        successCount++;
      } catch {
      }
    }
    
    ElMessage.success(`成功删除 ${successCount} 条记录`);
    selectedRows.value = [];
    loadShips();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const batchClearData = async () => {
  if (selectedRows.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要清空选中的 ${selectedRows.value.length} 艘船舶的所有填报数据吗？\n将删除：日记、日程、船笔记等所有关联数据\n（船舶本身不会被删除）`,
      '清空数据',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false,
      }
    );

    const shipIds = selectedRows.value.map(r => r.id);
    const result: any = await api.ships.clearData(shipIds);

    if (result?.success) {
      ElMessage.success(
        `已清空 ${result.shipCount} 艘船舶数据：日记${result.diaryCount}条、日程${result.scheduleCount}条、船笔记${result.shipNoteCount}条`
      );
      selectedRows.value = [];
    } else {
      ElMessage.error(result?.message || '清空失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败');
    }
  }
};

// 容器右键菜单（仅处理表头右键，行右键交由 el-table 的 @row-contextmenu 处理）
const handleContainerContextMenu = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const headerCell = target.closest('th.el-table__cell');
  
  // 如果不是表头，不处理，让 el-table 的 @row-contextmenu 触发
  if (!headerCell) return;
  
  // 是表头右键，阻止默认行为并阻止冒泡，避免触发 @row-contextmenu
  event.preventDefault();
  event.stopPropagation();
  
  // 表头右键 - 通过 column 匹配列信息
  const th = headerCell as HTMLElement;
  const thText = th.textContent?.trim().replace(/[↓↑▼▲◁▷◆◇]/g, '') || '';
  
  let colOption = columnOptions.find(c => c.label === thText);
  if (!colOption) {
    colOption = columnOptions.find(c => thText.includes(c.label) || c.label.includes(thText));
  }
  if (!colOption) {
    const classList = th.className;
    const match = classList.match(/el-table-column--([\w]+)/);
    if (match) {
      colOption = columnOptions.find(c => c.value === match[1]);
    }
  }
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'header',
    column: colOption ? { property: colOption.value, label: colOption.label } : null,
    row: null
  };
};

// 行右键菜单（通过 el-table 的 @row-contextmenu 事件）
const handleRowContextMenu = (row: any, column: any, event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();

  // 获取当前右键的列信息
  const target = event.target as HTMLElement;
  const td = target.closest('td.el-table__cell');
  let col = null;
  
  if (td) {
    const classList = td.className;
    const match = classList.match(/el-table-column--([\w]+)/);
    if (match) {
      col = columnOptions.find(c => c.value === match[1]) || null;
    }
  }

  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'row',
    column: col ? { property: col.value, label: col.label } : null,
    row: row
  };
};

const sortAsc = () => {
  if (contextMenu.value.column?.property) {
    sortProp.value = contextMenu.value.column.property;
    sortOrder.value = 'ascending';
  }
  contextMenu.value.visible = false;
};

const sortDesc = () => {
  if (contextMenu.value.column?.property) {
    sortProp.value = contextMenu.value.column.property;
    sortOrder.value = 'descending';
  }
  contextMenu.value.visible = false;
};

const clearFilter = () => {
  if (contextMenu.value.column?.property) {
    delete activeFilters.value[contextMenu.value.column.property];
  }
  contextMenu.value.visible = false;
};

const applyColumnFilter = (prop: string, values: string[]) => {
  if (values.length === 0) {
    delete activeFilters.value[prop];
  } else {
    activeFilters.value[prop] = values;
  }
  currentPage.value = 1;
};

const hideCurrentColumn = () => {
  if (contextMenu.value.column?.property) {
    const index = visibleColumns.value.indexOf(contextMenu.value.column.property);
    if (index > -1) {
      visibleColumns.value.splice(index, 1);
    }
  }
  contextMenu.value.visible = false;
};

const toggleColumnVisibility = (columnValue: string) => {
  const index = visibleColumns.value.indexOf(columnValue);
  if (index === -1) {
    visibleColumns.value.push(columnValue);
  } else {
    visibleColumns.value.splice(index, 1);
  }
};

const showAllColumns = () => {
  visibleColumns.value = [...columnOptions.map(col => col.value)];
};

const resetColumns = () => {
  visibleColumns.value = [...defaultVisibleColumns];
  fixedColumns.value = {};
};

const fixColumnLeft = () => {
  if (contextMenu.value.column?.property) {
    fixedColumns.value[contextMenu.value.column.property] = 'left';
  }
  contextMenu.value.visible = false;
};

const fixColumnRight = () => {
  if (contextMenu.value.column?.property) {
    fixedColumns.value[contextMenu.value.column.property] = 'right';
  }
  contextMenu.value.visible = false;
};

const unfixColumn = () => {
  if (contextMenu.value.column?.property) {
    delete fixedColumns.value[contextMenu.value.column.property];
  }
  contextMenu.value.visible = false;
};

const autoFitColumn = () => {
  const prop = contextMenu.value.column?.property;
  const label = contextMenu.value.column?.label;
  if (!prop) {
    ElMessage.warning('未识别到列信息');
    return;
  }
  
  const tableEl = document.querySelector('.el-table') as HTMLElement;
  if (!tableEl) return;
  
  // 获取表格字体样式
  const style = getComputedStyle(tableEl);
  const fontSize = style.fontSize || '14px';
  const fontFamily = style.fontFamily || 'sans-serif';
  
  // 创建 canvas 测量文字
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.font = `${fontSize} ${fontFamily}`;
  
  // 计算标题宽度
  let maxWidth = ctx.measureText(label || prop).width;
  
  // 计算所有数据中该列的最大宽度
  ships.value.forEach((row: any) => {
    const value = row[prop];
    if (value !== undefined && value !== null && value !== '') {
      const text = String(value);
      const width = ctx.measureText(text).width;
      if (width > maxWidth) maxWidth = width;
    }
  });
  
  // 加 padding (左右各16px) + 排序图标空间
  const finalWidth = Math.max(maxWidth + 48, 60);
  
  // 查找所有表格容器（主表格+固定列）
  const containers = [
    ...tableEl.querySelectorAll('.el-table__header-wrapper .el-table__header'),
    ...tableEl.querySelectorAll('.el-table__body-wrapper .el-table__body'),
    ...tableEl.querySelectorAll('.el-table__fixed-header-wrapper .el-table__header'),
    ...tableEl.querySelectorAll('.el-table__fixed .el-table__body'),
    ...tableEl.querySelectorAll('.el-table__fixed-right .el-table__body'),
  ];
  
  // 通过 class 匹配列：el-table-column--{prop}
  const colClass = `el-table-column--${prop}`;
  containers.forEach(container => {
    const cells = container.querySelectorAll(`.${colClass}`);
    cells.forEach(cell => {
      (cell as HTMLElement).style.width = finalWidth + 'px';
      (cell as HTMLElement).style.minWidth = finalWidth + 'px';
      (cell as HTMLElement).style.maxWidth = finalWidth + 'px';
    });
  });
  
  // 设置 colgroup 中的 col
  const colgroups = tableEl.querySelectorAll('colgroup');
  colgroups.forEach(colgroup => {
    const cols = colgroup.querySelectorAll('col');
    cols.forEach((col: any) => {
      if (col.getAttribute('prop') === prop) {
        col.style.width = finalWidth + 'px';
      }
    });
  });
  
  ElMessage.success(`已调整"${label}"列宽为 ${finalWidth}px`);
  contextMenu.value.visible = false;
};

const copyRow = async (row: any) => {
  try {
    const rowData = { ...row };
    delete rowData.id;
    const text = JSON.stringify(rowData, null, 2);
    await navigator.clipboard.writeText(text);
    ElMessage.success('行数据已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败');
  }
  contextMenu.value.visible = false;
};

const copyCellValue = async (row: any, column: any) => {
  try {
    const value = row[column?.property];
    if (value !== undefined && value !== null) {
      await navigator.clipboard.writeText(String(value));
      ElMessage.success('单元格值已复制到剪贴板');
    }
  } catch {
    ElMessage.error('复制失败');
  }
  contextMenu.value.visible = false;
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

const closeMenuIfOutside = (event: MouseEvent) => {
  const menu = document.querySelector('.ship-context-menu');
  if (menu && !menu.contains(event.target as Node)) {
    closeContextMenu();
  }
};

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('mousedown', closeMenuIfOutside);
  clearAutoSaveTimer();
});

onMounted(() => {
  loadShips();
  document.addEventListener('mousedown', closeMenuIfOutside);
});
</script>

<style scoped>
.ships-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.toolbar {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.table-container {
  flex: 1;
  overflow: auto;
  margin-bottom: 16px;
}

.pagination-area {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

.table-container::-webkit-scrollbar {
  height: 12px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 紧凑表格样式 */
.compact-table :deep(.el-table__row) {
  height: 36px;
}

.compact-table :deep(.el-table__row td) {
  padding: 4px 0;
}

.compact-table :deep(.el-table__header th) {
  padding: 6px 0;
}

.compact-table :deep(.el-input__inner) {
  padding: 0 8px;
}

.compact-table :deep(.el-button--small) {
  padding: 2px 8px;
  height: 24px;
}

/* 政委单元格样式 */
.instructor-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 鼠标悬停样式 */
.compact-table :deep(.el-table__body tr:hover > td) {
  background-color: #c9d6e3 !important;
}

/* 隔行条纹悬停样式 */
.compact-table :deep(.el-table--striped .el-table__body tr.el-table__row--striped:hover > td) {
  background-color: #bdc8d4 !important;
}

/* 点击选中的行样式 */
.compact-table :deep(.el-table__body tr.selected-row > td) {
  background-color: #a3c2e8 !important;
}

/* 选中行悬停样式 */
.compact-table :deep(.el-table__body tr.selected-row:hover > td) {
  background-color: #8fb3d9 !important;
}

/* 选中行是条纹行的悬停样式 */
.compact-table :deep(.el-table__body tr.selected-row.el-table__row--striped:hover > td) {
  background-color: #8fb3d9 !important;
}

/* ====== 平板竖屏专属优化（对标飞书/钉钉表格） ====== */
.device-tablet.orientation-portrait .ships-page,
.tablet-screen.portrait .ships-page {
  padding: 8px !important;
  height: calc(100vh - 104px) !important; /* 48px header + 56px bottom nav */
  display: flex !important;
  flex-direction: column !important;
}

/* 页面头部紧凑 */
.device-tablet.orientation-portrait .ships-page .page-header,
.tablet-screen.portrait .ships-page .page-header {
  margin-bottom: 8px !important;
  padding: 0 4px !important;
}

.device-tablet.orientation-portrait .ships-page .page-header h1,
.tablet-screen.portrait .ships-page .page-header h1 {
  font-size: 17px !important;
}

/* ====== 手机端专属优化（≤768px） ====== */
@media (max-width: 768px) {
  .ships-page {
    padding: 8px;
  }

  .page-header {
    margin-bottom: 8px;
    padding: 8px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .page-header h1 {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  /* 工具栏紧凑布局 - 垂直堆叠 */
  .toolbar {
    margin-bottom: 8px;
  }

  /* 外层 flex 改为垂直布局 */
  .toolbar > .flex {
    flex-direction: column !important;
    gap: 8px !important;
    align-items: stretch !important;
  }

  /* 标题自适应 - 不换行 */
  .toolbar h3 {
    font-size: 15px;
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
    white-space: nowrap !important;
    overflow: visible !important;
    line-height: 1.4 !important;
  }

  .toolbar h3 .ml-2,
  .toolbar h3 span {
    display: inline !important;
    white-space: nowrap !important;
  }

  /* 按钮组改为2列网格布局 */
  .toolbar > .flex > .flex.items-center.gap-3 {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 6px !important;
    width: 100% !important;
  }

  /* el-divider 隐藏（移动端不需要垂直分割线） */
  .toolbar .el-divider--vertical {
    display: none !important;
  }

  /* 搜索框全宽并占整行 */
  .toolbar .el-input {
    width: 100% !important;
    max-width: 100% !important;
    grid-column: 1 / -1 !important;
  }

  /* 工具栏按钮触摸优化 */
  .toolbar .el-button {
    min-height: 40px !important;
    font-size: 13px !important;
    padding: 8px 12px !important;
    border-radius: 8px !important;
    justify-content: center !important;
  }

  /* 表格容器紧凑 */
  .table-container {
    margin-bottom: 8px;
  }

  /* 表格字体缩小 */
  .el-table {
    font-size: 12px;
  }

  .el-table .el-table__header th {
    font-size: 11px;
    padding: 8px 6px;
    min-height: 32px;
  }

  .el-table .el-table__body td {
    padding: 8px 6px;
    min-height: 36px;
  }

  /* 分页紧凑 */
  .pagination-area {
    padding-top: 8px;
  }

  .pagination-area :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
  }

  .pagination-area :deep(.el-pagination button),
  .pagination-area :deep(.el-pager li) {
    min-width: 28px;
    height: 28px;
    line-height: 28px;
    font-size: 12px;
  }

  .pagination-area :deep(.el-pagination__total),
  .pagination-area :deep(.el-pagination__sizes),
  .pagination-area :deep(.el-pagination__jump) {
    font-size: 12px;
  }

  /* 内容区紧凑 */
  .content-area {
    padding: 12px;
    border-radius: 8px;
  }
}

/* 返回按钮触摸优化 */
.device-tablet.orientation-portrait .ships-page .page-header .el-button,
.tablet-screen.portrait .ships-page .page-header .el-button {
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
}

/* 内容区占满空间 */
.device-tablet.orientation-portrait .ships-page .content-area,
.tablet-screen.portrait .ships-page .content-area {
  flex: 1 !important;
  min-height: 0 !important;
  padding: 10px !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* 工具栏紧凑 */
.device-tablet.orientation-portrait .ships-page .toolbar,
.tablet-screen.portrait .ships-page .toolbar {
  margin-bottom: 8px !important;
  flex-shrink: 0 !important;
}

.device-tablet.orientation-portrait .ships-page .toolbar h3,
.tablet-screen.portrait .ships-page .toolbar h3 {
  font-size: 14px !important;
}

/* 工具栏按钮触摸优化 */
.device-tablet.orientation-portrait .ships-page .toolbar .el-button,
.tablet-screen.portrait .ships-page .toolbar .el-button {
  padding: 8px 12px !important;
  min-height: 36px !important;
  font-size: 13px !important;
}

/* 工具栏输入框全宽 */
.device-tablet.orientation-portrait .ships-page .toolbar .el-input,
.tablet-screen.portrait .ships-page .toolbar .el-input {
  width: 100% !important;
  max-width: 100% !important;
}

/* 表格容器占满剩余空间 */
.device-tablet.orientation-portrait .ships-page .table-container,
.tablet-screen.portrait .ships-page .table-container {
  flex: 1 !important;
  min-height: 0 !important;
  overflow: auto !important;
  -webkit-overflow-scrolling: touch !important;
  margin-bottom: 8px !important;
}

/* 表格紧凑 */
.device-tablet.orientation-portrait .ships-page .el-table,
.tablet-screen.portrait .ships-page .el-table {
  font-size: 12px !important;
}

/* 表头触摸优化 */
.device-tablet.orientation-portrait .ships-page .el-table .el-table__header th,
.tablet-screen.portrait .ships-page .el-table .el-table__header th {
  font-size: 11px !important;
  padding: 8px 6px !important;
  min-height: 36px !important;
}

/* 表格行触摸优化 */
.device-tablet.orientation-portrait .ships-page .el-table .el-table__body td,
.tablet-screen.portrait .ships-page .el-table .el-table__body td {
  padding: 8px 6px !important;
  min-height: 40px !important;
}

/* 表格行高 */
.device-tablet.orientation-portrait .compact-table :deep(.el-table__row),
.tablet-screen.portrait .compact-table :deep(.el-table__row) {
  height: 40px !important;
}

.device-tablet.orientation-portrait .compact-table :deep(.el-table__row td),
.tablet-screen.portrait .compact-table :deep(.el-table__row td) {
  padding: 6px 4px !important;
}

/* 可编辑单元格触摸优化 */
.device-tablet.orientation-portrait .ships-page .editable-cell,
.tablet-screen.portrait .ships-page .editable-cell {
  padding: 4px 6px !important;
  min-height: 28px !important;
  display: inline-block !important;
  width: 100% !important;
}

/* 政委单元格触摸优化 */
.device-tablet.orientation-portrait .ships-page .instructor-cell,
.tablet-screen.portrait .ships-page .instructor-cell {
  gap: 6px !important;
}

.device-tablet.orientation-portrait .ships-page .instructor-cell .el-button,
.tablet-screen.portrait .ships-page .instructor-cell .el-button {
  padding: 4px 8px !important;
  min-height: 32px !important;
}

/* 分页区域触摸优化 */
.device-tablet.orientation-portrait .ships-page .pagination-area,
.tablet-screen.portrait .ships-page .pagination-area {
  flex-shrink: 0 !important;
  padding-top: 8px !important;
  display: flex !important;
  justify-content: center !important;
}

.device-tablet.orientation-portrait .ships-page .pagination-area :deep(.el-pagination),
.tablet-screen.portrait .ships-page .pagination-area :deep(.el-pagination) {
  flex-wrap: wrap !important;
  justify-content: center !important;
  gap: 6px !important;
}

.device-tablet.orientation-portrait .ships-page .pagination-area :deep(.el-pagination button),
.tablet-screen.portrait .ships-page .pagination-area :deep(.el-pagination button),
.device-tablet.orientation-portrait .ships-page .pagination-area :deep(.el-pager li),
.tablet-screen.portrait .ships-page .pagination-area :deep(.el-pager li) {
  min-width: 32px !important;
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
}

/* 右键菜单触摸优化 */
.device-tablet.orientation-portrait .ship-context-menu,
.tablet-screen.portrait .ship-context-menu {
  min-width: 200px !important;
  border-radius: 12px !important;
}

.device-tablet.orientation-portrait .ship-context-menu .menu-item,
.tablet-screen.portrait .ship-context-menu .menu-item {
  padding: 12px 16px !important;
  font-size: 14px !important;
  min-height: 44px !important;
}

/* 对话框触摸优化 */
.device-tablet.orientation-portrait .ships-page :deep(.el-dialog),
.tablet-screen.portrait .ships-page :deep(.el-dialog) {
  max-width: 90vw !important;
  width: 90vw !important;
}

.device-tablet.orientation-portrait .ships-page :deep(.el-dialog__header),
.tablet-screen.portrait .ships-page :deep(.el-dialog__header) {
  padding: 16px 20px !important;
}

.device-tablet.orientation-portrait .ships-page :deep(.el-dialog__body),
.tablet-screen.portrait .ships-page :deep(.el-dialog__body) {
  padding: 16px 20px !important;
}

.device-tablet.orientation-portrait .ships-page :deep(.el-dialog__footer),
.tablet-screen.portrait .ships-page :deep(.el-dialog__footer) {
  padding: 12px 20px !important;
}

/* 对话框按钮触摸优化 */
.device-tablet.orientation-portrait .ships-page :deep(.el-dialog .el-button),
.tablet-screen.portrait .ships-page :deep(.el-dialog .el-button) {
  padding: 10px 20px !important;
  min-height: 40px !important;
  font-size: 14px !important;
}

/* 表单触摸优化 */
.device-tablet.orientation-portrait .ships-page :deep(.el-form-item),
.tablet-screen.portrait .ships-page :deep(.el-form-item) {
  margin-bottom: 16px !important;
}

.device-tablet.orientation-portrait .ships-page :deep(.el-form-item__label),
.tablet-screen.portrait .ships-page :deep(.el-form-item__label) {
  font-size: 13px !important;
  margin-bottom: 6px !important;
}

/* 输入框触摸优化 */
.device-tablet.orientation-portrait .ships-page :deep(.el-input__inner),
.tablet-screen.portrait .ships-page :deep(.el-input__inner),
.device-tablet.orientation-portrait .ships-page :deep(.el-textarea__inner),
.tablet-screen.portrait .ships-page :deep(.el-textarea__inner) {
  min-height: 40px !important;
  font-size: 14px !important;
  padding: 8px 12px !important;
}

/* 下拉选择触摸优化 */
.device-tablet.orientation-portrait .ships-page :deep(.el-select),
.tablet-screen.portrait .ships-page :deep(.el-select) {
  min-height: 40px !important;
}

/* 日期选择触摸优化 */
.device-tablet.orientation-portrait .ships-page :deep(.el-date-editor),
.tablet-screen.portrait .ships-page :deep(.el-date-editor) {
  min-height: 40px !important;
}

/* 表格内按钮触摸优化 */
.device-tablet.orientation-portrait .ships-page .el-table .el-button--small,
.tablet-screen.portrait .ships-page .el-table .el-button--small {
  padding: 6px 10px !important;
  min-height: 32px !important;
  font-size: 12px !important;
}

/* 滚动条触摸优化 */
.device-tablet.orientation-portrait .ships-page .table-container::-webkit-scrollbar,
.tablet-screen.portrait .ships-page .table-container::-webkit-scrollbar {
  height: 10px !important;
  width: 10px !important;
}

.device-tablet.orientation-portrait .ships-page .table-container::-webkit-scrollbar-thumb,
.tablet-screen.portrait .ships-page .table-container::-webkit-scrollbar-thumb {
  border-radius: 5px !important;
}

/* 添加船舶对话框触摸优化 */
.device-tablet.orientation-portrait :deep(.ship-add-dialog),
.tablet-screen.portrait :deep(.ship-add-dialog) {
  max-height: 80vh !important;
}

/* 批量操作按钮触摸优化 */
.device-tablet.orientation-portrait .ships-page .toolbar .el-button--danger,
.tablet-screen.portrait .ships-page .toolbar .el-button--danger {
  min-height: 36px !important;
}

/* ====== 深度优化：空间利用率提升（对标飞书表格 v4） ====== */

/* 工具栏改为垂直堆叠布局 */
.device-tablet.orientation-portrait .ships-page .toolbar > div,
.tablet-screen.portrait .ships-page .toolbar > div {
  flex-direction: column !important;
  gap: 8px !important;
  align-items: stretch !important;
}

/* 工具栏标题行 */
.device-tablet.orientation-portrait .ships-page .toolbar h3,
.tablet-screen.portrait .ships-page .toolbar h3 {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
}

/* 按钮组改为网格布局 */
.device-tablet.orientation-portrait .ships-page .toolbar .flex.items-center.gap-3,
.tablet-screen.portrait .ships-page .toolbar .flex.items-center.gap-3 {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 6px !important;
}

/* 搜索框全宽 */
.device-tablet.orientation-portrait .ships-page .toolbar .el-input[style*="width: 200px"],
.tablet-screen.portrait .ships-page .toolbar .el-input[style*="width: 200px"] {
  width: 100% !important;
  grid-column: 1 / -1 !important;
}

/* 表格列头紧凑 */
.device-tablet.orientation-portrait .ships-page .el-table .el-table__header th,
.tablet-screen.portrait .ships-page .el-table .el-table__header th {
  font-size: 11px !important;
  padding: 6px 4px !important;
  min-height: 32px !important;
  line-height: 1.2 !important;
}

/* 表格行间距压缩 */
.device-tablet.orientation-portrait .ships-page .el-table__body tr,
.tablet-screen.portrait .ships-page .el-table__body tr {
  height: 36px !important;
}

.device-tablet.orientation-portrait .ships-page .el-table__body td,
.tablet-screen.portrait .ships-page .el-table__body td {
  padding: 4px 6px !important;
  font-size: 12px !important;
}

/* 表格单元格内容不换行 */
.device-tablet.orientation-portrait .ships-page .el-table .cell,
.tablet-screen.portrait .ships-page .el-table .cell {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* 操作列按钮紧凑 */
.device-tablet.orientation-portrait .ships-page .el-table .el-button--small,
.tablet-screen.portrait .ships-page .el-table .el-button--small {
  padding: 4px 8px !important;
  min-height: 28px !important;
  font-size: 11px !important;
  margin: 0 2px !important;
}

/* 表格内编辑输入框紧凑 */
.device-tablet.orientation-portrait .ships-page .el-table .el-input__inner,
.tablet-screen.portrait .ships-page .el-table .el-input__inner {
  min-height: 28px !important;
  padding: 4px 8px !important;
  font-size: 12px !important;
}

/* 表格内选择框紧凑 */
.device-tablet.orientation-portrait .ships-page .el-table .el-select,
.tablet-screen.portrait .ships-page .el-table .el-select {
  min-height: 28px !important;
}

.device-tablet.orientation-portrait .ships-page .el-table .el-select .el-input__inner,
.tablet-screen.portrait .ships-page .el-table .el-select .el-input__inner {
  min-height: 28px !important;
}

/* 分页紧凑 */
.device-tablet.orientation-portrait .ships-page .pagination-area :deep(.el-pagination),
.tablet-screen.portrait .ships-page .pagination-area :deep(.el-pagination) {
  gap: 4px !important;
  padding: 4px 0 !important;
}

.device-tablet.orientation-portrait .ships-page .pagination-area :deep(.el-pagination .el-pagination__sizes),
.tablet-screen.portrait .ships-page .pagination-area :deep(.el-pagination .el-pagination__sizes),
.device-tablet.orientation-portrait .ships-page .pagination-area :deep(.el-pagination .el-pagination__jump),
.tablet-screen.portrait .ships-page .pagination-area :deep(.el-pagination .el-pagination__jump) {
  display: none !important; /* 隐藏页数选择器和跳转，节省空间 */
}

/* 对话框全屏优化 */
.device-tablet.orientation-portrait .ships-page :deep(.el-dialog),
.tablet-screen.portrait .ships-page :deep(.el-dialog) {
  width: 95vw !important;
  max-width: 95vw !important;
  margin: 2vh auto !important;
  max-height: 96vh !important;
}

/* 对话框表单紧凑 */
.device-tablet.orientation-portrait .ships-page :deep(.el-form-item),
.tablet-screen.portrait .ships-page :deep(.el-form-item) {
  margin-bottom: 12px !important;
}

.device-tablet.orientation-portrait .ships-page :deep(.el-form-item__label),
.tablet-screen.portrait .ships-page :deep(.el-form-item__label) {
  font-size: 12px !important;
  margin-bottom: 4px !important;
}

/* 右键菜单位置优化（避免超出屏幕） */
.device-tablet.orientation-portrait .ship-context-menu,
.tablet-screen.portrait .ship-context-menu {
  position: fixed !important;
  z-index: 9999 !important;
}

/* 表格空状态优化 */
.device-tablet.orientation-portrait .ships-page .el-table__empty-block,
.tablet-screen.portrait .ships-page .el-table__empty-block {
  min-height: 200px !important;
}

.device-tablet.orientation-portrait .ships-page .el-table__empty-text,
.tablet-screen.portrait .ships-page .el-table__empty-text {
  font-size: 13px !important;
  color: #999 !important;
}

/* 加载状态优化 */
.device-tablet.orientation-portrait .ships-page .el-loading-spinner,
.tablet-screen.portrait .ships-page .el-loading-spinner {
  transform: scale(0.8) !important;
}

/* 视图切换标签样式 */
.view-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.view-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.view-tabs :deep(.el-tabs__item) {
  padding: 6px 12px;
  font-size: 13px;
}

.view-tabs :deep(.el-tabs__item.is-active) {
  color: #1890ff;
}

.card-view-container {
  flex: 1;
  overflow: auto;
  padding: 0;
  margin-top: 16px;
}

.card-view-container::-webkit-scrollbar {
  height: 12px;
}

.card-view-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.card-view-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 6px;
}

.card-view-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (max-width: 768px) {
  .view-tabs :deep(.el-tabs__item) {
    padding: 4px 8px;
    font-size: 12px;
  }
}

/* === 区域标识 === */
.ship-name-with-badges {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.region-badge {
  font-size: 14px;
  line-height: 1;
  cursor: help;
  flex-shrink: 0;
}
.region-piracy {
  animation: piracy-pulse 1.2s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(245, 34, 45, 0.6));
}
.region-five-eyes {
  animation: region-pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 0 2px rgba(64, 158, 255, 0.5));
}
.region-europe {
  animation: region-pulse 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 2px rgba(91, 140, 255, 0.5));
}
@keyframes piracy-pulse {
  0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 3px rgba(245, 34, 45, 0.6)); }
  50% { opacity: 0.7; transform: scale(1.15); filter: drop-shadow(0 0 6px rgba(245, 34, 45, 0.9)); }
}
@keyframes region-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(1.08); }
}
</style>
