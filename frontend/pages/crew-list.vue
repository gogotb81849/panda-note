<template>
  <div class="crew-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2 class="page-title">当前在船人员名单</h2>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="addRow">
          <el-icon><Plus /></el-icon>
          添加人员
        </el-button>
        <el-button size="small" @click="showColumnManager">
          <el-icon><Setting /></el-icon>
          列管理
        </el-button>
        <el-button size="small" @click="importCSV">
          <el-icon><Upload /></el-icon>
          导入
        </el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      :data="crewList"
      border
      stripe
      class="simple-crew-table"
      size="small"
      @row-click="handleRowClick"
    >
      <el-table-column type="index" label="序号" width="60" align="center" fixed="left" />
      
      <!-- 固定7列 -->
      <el-table-column v-for="col in visibleCoreColumns" :key="col.key" :prop="col.key" :label="col.label" :width="col.width" :min-width="col.minWidth" :fixed="col.fixed || false" align="center">
        <template #default="{ row }">
          <!-- 编辑模式 -->
          <template v-if="row.editing">
            <template v-if="col.key === 'idNumber'">
              <el-input v-model="row.idNumber" size="small" placeholder="18位身份证号" @blur="formatIdNumber(row)" />
            </template>
            <template v-else-if="col.key === 'boardDate' || col.key === 'offDate'">
              <el-date-picker
                v-model="row[col.key]"
                type="date"
                value-format="YYYY-MM-DD"
                size="small"
                style="width: 100%"
                placeholder="YYYY-MM-DD"
              />
            </template>
            <template v-else>
              <el-input v-model="row[col.key]" size="small" />
            </template>
          </template>
          <!-- 显示模式 -->
          <template v-else>
            <template v-if="col.key === 'idNumber'">
              <span>{{ formatDisplayId(row.idNumber) }}</span>
            </template>
            <template v-else-if="col.key === 'boardDate' || col.key === 'offDate'">
              <span :class="{ 'off-dated': col.key === 'offDate' && row.offDate }">{{ formatDate(row[col.key]) }}</span>
            </template>
            <template v-else>
              <span>{{ row[col.key] || '-' }}</span>
            </template>
          </template>
        </template>
      </el-table-column>

      <!-- 扩展列 -->
      <el-table-column
        v-for="col in visibleCustomColumns"
        :key="col.key"
        :prop="col.key"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth || 120"
        align="center"
      >
        <template #default="{ row }">
          <template v-if="row.editing">
            <el-input v-model="row[col.key]" size="small" />
          </template>
          <template v-else>
            <span>{{ row[col.key] || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{ row }">
          <template v-if="row.editing">
            <el-button type="primary" link size="small" @click.stop="saveRow(row)">保存</el-button>
            <el-button link size="small" @click.stop="cancelEdit(row)">取消</el-button>
          </template>
          <template v-else>
            <el-button type="primary" link size="small" @click.stop="startEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click.stop="deleteRow(row)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 列管理对话框 -->
    <el-dialog v-model="columnManagerVisible" title="列管理" width="500px">
      <div class="column-manager">
        <div class="column-list">
          <div v-for="(col, idx) in customColumns" :key="col.key" class="column-item">
            <div class="column-move-btns">
              <el-button size="small" text :disabled="idx === 0" @click="moveColumnUp(idx)">
                <el-icon><Top /></el-icon>
              </el-button>
              <el-button size="small" text :disabled="idx === customColumns.length - 1" @click="moveColumnDown(idx)">
                <el-icon><Bottom /></el-icon>
              </el-button>
            </div>
            <el-input v-model="col.label" size="small" placeholder="列名" style="width: 120px" />
            <el-input-number v-model="col.width" :min="80" :max="300" :step="10" size="small" />
            <el-switch v-model="col.visible" size="small" />
            <el-button type="danger" link size="small" @click="removeColumn(col.key)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="add-column-row">
          <el-button type="primary" size="small" @click="addColumn">
            <el-icon><Plus /></el-icon>
            添加列
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="columnManagerVisible = false">关闭</el-button>
        <el-button type="primary" @click="saveColumns">保存列配置</el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog v-model="importVisible" title="导入CSV" width="500px">
      <div class="import-area">
        <el-alert title="支持从Excel导出的CSV文件" type="info" :closable="false" style="margin-bottom: 12px">
          列名自动匹配：姓名/船名/身份证/职务等
        </el-alert>
        <el-upload
          drag
          :auto-upload="false"
          :on-change="handleFileSelect"
          :limit="1"
          accept=".csv,.xlsx,.xls"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽文件到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">支持 CSV / Excel 文件</div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Setting, Upload, Delete, UploadFilled, Top, Bottom } from '@element-plus/icons-vue';

// ===== 核心列定义（固定7列，不可删除） =====
const coreColumns = [
  { key: 'shipName', label: '船名', width: 140 },
  { key: 'name', label: '姓名', width: 100 },
  { key: 'position', label: '职务', width: 120 },
  { key: 'idNumber', label: '身份证', width: 180 },
  { key: 'boardDate', label: '上船日期', width: 140 },
  { key: 'offDate', label: '下船日期', width: 140 },
];

// ===== 自定义列 =====
interface CustomColumn {
  key: string;
  label: string;
  width: number;
  visible: boolean;
}

const customColumns = ref<CustomColumn[]>([]);
const columnManagerVisible = ref(false);
const importVisible = ref(false);

const visibleCoreColumns = computed(() => coreColumns);
const visibleCustomColumns = computed(() => customColumns.value.filter(c => c.visible));

// ===== 数据 =====
interface CrewRow {
  id?: number;
  shipName: string;
  name: string;
  position: string;
  idNumber: string;
  boardDate: string;
  offDate: string;
  [key: string]: any;
  editing?: boolean;
  _original?: any;
}

const crewList = ref<CrewRow[]>([]);

// ===== 数据持久化 =====
const loadData = () => {
  const saved = sessionStorage.getItem('crewList');
  if (saved) {
    try { crewList.value = JSON.parse(saved); } catch { crewList.value = []; }
  }
  const savedCols = sessionStorage.getItem('crewColumns');
  if (savedCols) {
    try { customColumns.value = JSON.parse(savedCols); } catch { customColumns.value = []; }
  }
};

const saveData = () => {
  const data = crewList.value.map(({ _original, editing, ...rest }) => rest);
  sessionStorage.setItem('crewList', JSON.stringify(data));
};

// ===== 行操作 =====
const addRow = () => {
  const newRow: CrewRow = { shipName: '', name: '', position: '', idNumber: '', boardDate: '', offDate: '', editing: true };
  customColumns.value.forEach(col => { newRow[col.key] = ''; });
  crewList.value.push(newRow);
};

const startEdit = (row: CrewRow) => {
  row._original = { ...row };
  row.editing = true;
};

const saveRow = (row: CrewRow) => {
  if (!row.name.trim()) { ElMessage.warning('姓名不能为空'); return; }
  if (!row.position) { ElMessage.warning('请填写职务'); return; }
  formatIdNumber(row); // 保存时再次格式化身份证
  row.editing = false;
  delete row._original;
  try {
    saveData();
    ElMessage.success('保存成功');
  } catch (error: any) {
    ElMessage.error('保存失败: ' + (error.data?.message || error.message || '未知错误'))
  }
};

const cancelEdit = (row: CrewRow) => {
  if (row.id && row._original) {
    Object.assign(row, row._original);
  } else {
    const idx = crewList.value.indexOf(row);
    if (idx > -1) crewList.value.splice(idx, 1);
  }
  row.editing = false;
  delete row._original;
};

const deleteRow = async (row: CrewRow) => {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.name || '该人员'} 吗？`, '提示', { type: 'warning' });
    const idx = crewList.value.indexOf(row);
    if (idx > -1) crewList.value.splice(idx, 1);
    saveData();
    ElMessage.success('删除成功');
  } catch { /* 取消 */ }
};

const handleRowClick = (row: CrewRow) => {
  // 点击行不触发编辑，避免误操作
};

// ===== 身份证格式化 =====
const formatIdNumber = (row: CrewRow) => {
  if (!row.idNumber) return;
  // 1. 去掉前后的 ' 和 " 字符（Excel 常见）
  let id = row.idNumber.replace(/^['"]+|['"]+$/g, '');
  // 2. 去掉空格
  id = id.replace(/\s+/g, '');
  // 3. 全角转半角
  id = id.replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  // 4. 只保留数字和X
  id = id.replace(/[^0-9Xx]/g, '');
  // 5. 小写x转大写X
  id = id.replace(/x/g, 'X');
  row.idNumber = id;
};

const formatDisplayId = (id: string): string => {
  if (!id || id.length < 7) return '-';
  return id.substring(0, 3) + '********' + id.substring(id.length - 4);
};

// ===== 日期格式化 =====
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  // 尝试解析各种格式
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr; // 无法解析则原样显示
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ===== 列管理 =====
const showColumnManager = () => {
  columnManagerVisible.value = true;
};

const moveColumnUp = (idx: number) => {
  if (idx > 0) {
    [customColumns.value[idx], customColumns.value[idx - 1]] = [customColumns.value[idx - 1], customColumns.value[idx]];
  }
};

const moveColumnDown = (idx: number) => {
  if (idx < customColumns.value.length - 1) {
    [customColumns.value[idx], customColumns.value[idx + 1]] = [customColumns.value[idx + 1], customColumns.value[idx]];
  }
};

const addColumn = () => {
  const key = 'custom_' + Date.now();
  customColumns.value.push({ key, label: '新列', width: 120, visible: true });
};

const removeColumn = (key: string) => {
  customColumns.value = customColumns.value.filter(c => c.key !== key);
  // 从所有行数据中删除该列
  crewList.value.forEach(row => { delete row[key]; });
};

const saveColumns = () => {
  sessionStorage.setItem('crewColumns', JSON.stringify(customColumns.value));
  columnManagerVisible.value = false;
  ElMessage.success('列配置已保存');
};

// ===== 导入CSV =====
const importCSV = () => {
  importVisible.value = true;
};

const handleFileSelect = (file: any) => {
  const rawFile = file.raw;
  if (!rawFile) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { ElMessage.warning('文件为空'); return; }

      const headers = parseCSVLine(lines[0]);
      // 列名映射
      const colMap: Record<string, string> = {};
      const keyMap: Record<string, string> = {
        '船名': 'shipName', '姓名': 'name', '职务': 'position',
        '身份证': 'idNumber', '身份证号': 'idNumber',
        '上船日期': 'boardDate', '上船时间': 'boardDate',
        '下船日期': 'offDate', '下船时间': 'offDate',
      };

      headers.forEach((h, i) => {
        const clean = h.trim();
        if (keyMap[clean]) {
          colMap[clean] = keyMap[clean];
        }
      });

      const newRows: CrewRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: CrewRow = { shipName: '', name: '', position: '', idNumber: '', boardDate: '', offDate: '' };

        headers.forEach((h, idx) => {
          const key = colMap[h.trim()];
          if (key && values[idx]) {
            let val = values[idx].trim();
            // 去掉 ' 前缀
            val = val.replace(/^['"]+/, '');
            if (key === 'idNumber') {
              // 清理身份证号
              val = val.replace(/[^0-9Xx]/g, '').replace(/x/g, 'X');
            }
            row[key] = val;
          }
        });

        if (row.name) newRows.push(row);
      }

      crewList.value = [...crewList.value, ...newRows];
      saveData();
      ElMessage.success(`成功导入 ${newRows.length} 条数据`);
      importVisible.value = false;
    } catch (err) {
      console.error(err);
      ElMessage.error('导入失败，请检查文件格式');
    }
  };
  reader.readAsText(rawFile, 'UTF-8');
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
};

onMounted(() => { loadData(); });
</script>

<style scoped>
.crew-list-page {
  padding: 16px;
  background-color: var(--color-bg-secondary, #f5f7fa);
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary, #303133);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.simple-crew-table {
  background-color: white;
  border-radius: 8px;
}

.simple-crew-table :deep(.el-table__row) {
  cursor: default;
}

.simple-crew-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}

.off-dated {
  color: #909399;
  text-decoration: line-through;
}

/* 列管理 */
.column-manager {
  max-height: 400px;
  overflow-y: auto;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid #ebeef5;
}

.column-move-btns {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.drag-handle {
  cursor: move;
  color: #909399;
}

.add-column-row {
  margin-top: 12px;
  text-align: center;
}

/* 导入 */
.import-area {
  padding: 8px 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
