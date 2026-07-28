<template>
  <div class="dict-page">
    <div class="flex h-full flex-col">
      <!-- 顶部 Tab 切换 -->
      <div class="bg-white border-b border-gray-200">
        <div class="flex items-center gap-4 px-4 py-3">
          <el-button text @click="goBack" class="p-1">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <h2 class="text-lg font-semibold text-gray-800">分类与任务库</h2>
        </div>
        <el-tabs v-model="activeTab" class="px-4">
          <el-tab-pane label="分类管理" name="categories">
            <!-- 分类管理操作 -->
            <div class="flex gap-2 pb-2">
              <el-button type="primary" size="small" @click="addRoleCategory">
                添加用户类别
              </el-button>
              <el-button size="small" @click="showPermissionDialog = true">
                编辑权限
              </el-button>
              <el-button size="small" type="success" plain @click="showImportDialog('category')">
                批量导入分类
              </el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane label="标准任务库" name="taskTemplates">
            <div class="flex gap-2 pb-2">
              <el-button type="primary" size="small" @click="addTaskTemplate">
                添加任务模板
              </el-button>
              <el-button size="small" type="success" plain @click="showImportDialog('template')">
                批量导入任务
              </el-button>
              <el-button size="small" @click="loadTaskTemplates">
                刷新
              </el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 内容区域 -->
      <div class="flex-1 overflow-hidden">

        <!-- 分类管理 Tab -->
        <div v-show="activeTab === 'categories'" class="flex h-full">
          <!-- 左侧：用户类别 + 分类树 -->
          <div class="w-96 bg-white border-r border-gray-200 flex flex-col">

            <!-- 用户类别筛选 -->
            <div class="px-4 py-2 border-b border-gray-100">
              <el-select v-model="selectedRoleFilter" placeholder="全部类别" size="small" clearable class="w-full" @change="filterByRole">
                <el-option label="全部类别" value="" />
                <el-option label="船工主管" value="shore_crew_supervisor" />
                <el-option label="船舶政委" value="ship_political_instructor" />
                <el-option label="海务主管" value="shore_marine_supervisor" />
                <el-option label="机务主管" value="shore_engineer_supervisor" />
              </el-select>
            </div>

            <!-- 分类树 -->
            <div class="flex-1 overflow-y-auto p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-gray-600">分类列表</span>
                <el-button type="primary" size="small" @click="addFirstType" :disabled="!selectedRoleFilter && selectedRoleFilter !== ''">
                  添加一级分类
                </el-button>
              </div>
              <!-- P3-1: 分类空状态引导 -->
              <div v-if="treeData.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg class="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p class="text-sm mb-3">还没有分类</p>
                <el-button type="primary" size="small" @click="addFirstType">添加第一个分类</el-button>
              </div>
              <el-tree
                v-else
                :data="treeData"
                :props="treeProps"
                node-key="id"
                :expand-on-click-node="false"
                :default-expand-all="true"
                :highlight-current="true"
                draggable
                :allow-drag="allowDrag"
                :allow-drop="allowDrop"
                @node-click="handleNodeClick"
                @node-drop="handleNodeDrop"
              >
                <template #default="{ node, data }">
                  <div class="custom-tree-node flex items-center justify-between w-full">
                    <span class="flex items-center">
                      <span class="mr-2">
                        <svg v-if="data.categoryType === 'first_type'" class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                        <svg v-else class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 00-1.414 1.414zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                        </svg>
                      </span>
                      {{ node.label }}
                      <span class="text-xs text-gray-400 ml-2">排序: {{ data.sortOrder }}</span>
                      <el-tag v-if="data.role" size="small" class="ml-2" :type="getRoleTagType(data.role)">
                        {{ getRoleLabel(data.role) }}
                      </el-tag>
                      <span v-if="draggingNode?.id === data.id" class="text-xs text-blue-500 ml-2">
                        {{ isCopyMode ? '(复制)' : '(移动)' }}
                      </span>
                    </span>
                    <span class="flex gap-1">
                      <el-button size="small" text @click.stop="editNode(data)">编辑</el-button>
                      <el-button v-if="data.categoryType === 'first_type'" size="small" text type="primary" @click.stop="addSecondType(data)">添加二级</el-button>
                      <el-button size="small" text type="danger" @click.stop="deleteNode(data)">删除</el-button>
                    </span>
                  </div>
                </template>
              </el-tree>
            </div>
          </div>

          <!-- 右侧详情区域 -->
          <div class="flex-1 bg-gray-50 p-8 overflow-y-auto">
            <div v-if="!selectedNode" class="flex flex-col items-center justify-center h-full text-gray-400">
              <svg class="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <p class="text-lg">请从左侧选择一个分类</p>
            </div>
            <div v-else class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 class="text-xl font-semibold text-gray-800 mb-2">
                {{ selectedNode.categoryType === 'first_type' ? '一级分类详情' : '二级分类详情' }}
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">分类名称</label>
                  <p class="text-lg text-gray-800">{{ selectedNode.categoryName }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">排序</label>
                  <p class="text-lg text-gray-800">{{ selectedNode.sortOrder }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">用户类别</label>
                  <el-tag v-if="selectedNode.role" :type="getRoleTagType(selectedNode.role)">
                    {{ getRoleLabel(selectedNode.role) }}
                  </el-tag>
                  <span v-else class="text-gray-400">全局共享</span>
                </div>
                <div v-if="selectedNode.categoryType === 'second_type'">
                  <label class="block text-sm font-medium text-gray-600 mb-1">所属一级分类</label>
                  <p class="text-lg text-gray-800">{{ parentCategory?.categoryName || '-' }}</p>
                </div>
              </div>
              <div class="mt-6 flex gap-3">
                <el-button type="primary" @click="editNode(selectedNode)">编辑</el-button>
                <el-button v-if="selectedNode.categoryType === 'first_type'" type="success" @click="addSecondType(selectedNode)">添加二级分类</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 任务库管理 Tab -->
        <div v-show="activeTab === 'taskTemplates'" class="flex h-full">
          <!-- 左侧：分类筛选 -->
          <div class="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-3">按一级分类筛选</h4>
            <el-radio-group v-model="selectedFirstTypeFilter" class="flex flex-col gap-2">
              <el-radio value="" label="全部">全部 ({{ taskTemplates.length }})</el-radio>
              <el-radio v-for="ft in uniqueFirstTypes" :key="ft" :value="ft" :label="ft">
                {{ ft }} ({{ taskTemplates.filter(t => t.firstType === ft).length }})
              </el-radio>
            </el-radio-group>
          </div>

          <!-- 右侧：任务库列表 -->
          <div class="flex-1 bg-gray-50 p-6 overflow-y-auto">
            <div v-if="filteredTaskTemplates.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
              <svg class="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p class="text-lg mb-4">暂无任务模板</p>
              <el-button type="primary" @click="addTaskTemplate">添加第一个任务模板</el-button>
            </div>
            <div v-else>
              <el-table :data="filteredTaskTemplates" style="width: 100%" stripe>
                <el-table-column prop="firstType" label="一级分类" width="150">
                  <template #default="scope">
                    <el-tag size="small" type="primary">{{ scope.row.firstType }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="secondType" label="二级分类" width="150">
                  <template #default="scope">
                    <el-tag size="small" type="success">{{ scope.row.secondType }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="title" label="任务标题" min-width="150" />
                <el-table-column prop="eventDetail" label="任务详情" min-width="200" show-overflow-tooltip />
                <el-table-column prop="priority" label="优先级" width="100">
                  <template #default="scope">
                    <el-tag size="small" :type="getPriorityTagType(scope.row.priority)">
                      {{ getPriorityLabel(scope.row.priority) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
                <el-table-column label="操作" width="180" fixed="right">
                  <template #default="scope">
                    <el-button size="small" @click="editTaskTemplate(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" text @click="deleteTaskTemplate(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分类编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="分类名称">
          <el-input v-model="form.categoryName" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="用户类别">
          <el-select v-model="form.role" placeholder="选择用户类别（为空表示全局共享）" clearable class="w-full">
            <el-option label="全局共享" :value="undefined" />
            <el-option label="船工主管" value="shore_crew_supervisor" />
            <el-option label="船舶政委" value="ship_political_instructor" />
            <el-option label="海务主管" value="shore_marine_supervisor" />
            <el-option label="机务主管" value="shore_engineer_supervisor" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- 任务模板编辑弹窗 -->
    <el-dialog v-model="taskTemplateDialogVisible" :title="taskTemplateDialogTitle" width="600px">
      <el-form :model="taskTemplateForm" label-width="100px">
        <el-form-item label="一级分类">
          <el-select v-model="taskTemplateForm.firstType" placeholder="请选择或输入一级分类" filterable allow-create class="w-full">
            <el-option v-for="ft in firstTypes" :key="ft.id" :label="ft.categoryName" :value="ft.categoryName" />
          </el-select>
        </el-form-item>
        <el-form-item label="二级分类">
          <el-select v-model="taskTemplateForm.secondType" placeholder="请选择或输入二级分类" filterable allow-create class="w-full">
            <el-option
              v-for="st in filteredSecondTypes"
              :key="st.id"
              :label="st.categoryName"
              :value="st.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="任务标题">
          <el-input v-model="taskTemplateForm.title" placeholder="请输入任务标题（可选）" />
        </el-form-item>
        <el-form-item label="任务详情">
          <el-input v-model="taskTemplateForm.eventDetail" type="textarea" :rows="3" placeholder="请输入任务详情（可选）" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="taskTemplateForm.priority" class="w-full">
            <el-option label="普通" value="normal" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="taskTemplateForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskTemplateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTaskTemplate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" :title="importDialogTitle" width="700px" @close="closeImportDialog">
      <!-- 导入结果展示 -->
      <div v-if="importResult" class="import-result">
        <div class="result-summary">
          <div class="result-item success">
            <span class="result-icon">✓</span>
            <span class="result-text">成功导入 <strong>{{ importResult.success }}</strong> 条</span>
          </div>
          <div v-if="importResult.failed > 0" class="result-item failed">
            <span class="result-icon">✕</span>
            <span class="result-text">导入失败 <strong>{{ importResult.failed }}</strong> 条</span>
          </div>
        </div>

        <div v-if="importResult.errors.length > 0" class="result-errors">
          <div class="errors-title">失败详情：</div>
          <div class="errors-list">
            <div v-for="(error, idx) in importResult.errors" :key="idx" class="error-item">
              <span class="error-line">第 {{ idx + 1 }} 条</span>
              <span class="error-msg">{{ error }}</span>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <el-button type="primary" @click="closeImportDialog">完成</el-button>
        </div>
      </div>

      <!-- 导入输入区域 -->
      <div v-else class="mb-4">
        <div class="text-sm text-gray-600 mb-2">
          <template v-if="importDialogType === 'category'">
            <p><strong>导入格式：</strong>每行一条记录，使用逗号分隔字段</p>
            <p class="mt-1">格式：<code>一级分类,二级分类,排序</code></p>
            <p class="mt-1 text-xs">示例：</p>
            <pre class="bg-gray-100 p-2 rounded mt-1 text-xs">
船舶安全,消防检查,1
船舶安全,救生设备,2
劳动纪律,考勤管理,3
            </pre>
          </template>
          <template v-else>
            <p><strong>导入格式：</strong>每行一条记录，使用逗号分隔字段</p>
            <p class="mt-1">格式：<code>一级分类,二级分类,任务标题,任务详情,优先级</code></p>
            <p class="mt-1 text-xs">示例：</p>
            <pre class="bg-gray-100 p-2 rounded mt-1 text-xs">
船舶安全,消防检查,月度消防检查,完成全船消防设备检查并记录,normal
船舶安全,救生设备,救生艇检查,检查救生艇、救生筏、救生衣状态,high
劳动纪律,考勤管理,月度考勤,整理并记录本月船员出勤情况,normal
            </pre>
          </template>
        </div>
        <el-input v-model="importText" type="textarea" :rows="12" placeholder="请输入导入内容..." />
      </div>
      <template v-if="!importResult" #footer>
        <el-button @click="closeImportDialog">取消</el-button>
        <el-button type="primary" @click="handleImport">确认导入</el-button>
      </template>
    </el-dialog>

    <!-- 用户权限管理弹窗 -->
    <el-dialog v-model="showPermissionDialog" title="编辑用户分类权限" width="700px">
      <div class="permission-dialog-content">
        <p class="text-sm text-gray-500 mb-4">选择用户并设置其可编辑的一二级分类权限</p>

        <el-form label-width="100px">
          <el-form-item label="选择用户">
            <el-select v-model="permissionForm.userId" placeholder="请选择用户" filterable class="w-full" @change="loadUserPermissions">
              <el-option v-for="user in userList" :key="user.id" :label="user.name || user.workId" :value="user.id" />
            </el-select>
          </el-form-item>
        </el-form>

        <div v-if="permissionForm.userId" class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-700">可编辑分类列表</span>
            <el-switch v-model="permissionForm.canEditAll" active-text="允许编辑全部" />
          </div>

          <div v-if="!permissionForm.canEditAll" class="permission-tree border rounded-lg p-4 max-h-80 overflow-y-auto">
            <div v-for="firstType in filteredFirstTypes" :key="firstType.id" class="mb-2">
              <label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <el-checkbox v-model="permissionForm.editableCategoryIds" :value="firstType.id" />
                <span class="font-medium">{{ firstType.categoryName }}</span>
                <el-tag v-if="firstType.role" size="small" :type="getRoleTagType(firstType.role)">
                  {{ getRoleLabel(firstType.role) }}
                </el-tag>
              </label>
              <div class="ml-6 mt-1">
                <label v-for="secondType in firstType.children" :key="secondType.id" class="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                  <el-checkbox v-model="permissionForm.editableCategoryIds" :value="secondType.id" />
                  <span>{{ secondType.categoryName }}</span>
                </label>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-gray-500">用户默认可以编辑所有分类</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPermissionDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUserPermissions">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import type { DictCategory } from '~/types';

const api = useApi();
const router = useRouter();

// Tab 切换
const activeTab = ref<'categories' | 'taskTemplates'>('categories');

// 分类管理相关
const loading = ref(false);
const firstTypes = ref<DictCategory[]>([]);
const selectedNode = ref<DictCategory | null>(null);
const selectedRoleFilter = ref('');

const treeProps = {
  children: 'children',
  label: 'categoryName',
};

const treeData = computed(() => {
  let data = firstTypes.value.map(firstType => ({
    ...firstType,
    children: firstType.children || [],
  }));

  if (selectedRoleFilter.value) {
    data = data.filter(item => item.role === selectedRoleFilter.value);
  }

  return data;
});

const parentCategory = computed(() => {
  if (!selectedNode.value || selectedNode.value.categoryType === 'first_type') {
    return null;
  }
  return firstTypes.value.find(f => f.id === selectedNode.value?.parentId);
});

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formType = ref<'addFirst' | 'editFirst' | 'addSecond' | 'editSecond'>('addFirst');
const editingItem = ref<DictCategory | null>(null);
const selectedParentId = ref<number | null>(null);

const form = ref({
  categoryName: '',
  sortOrder: 0,
  role: undefined as string | undefined,
});

// 拖拽相关
const draggingNode = ref<DictCategory | null>(null);
const isCopyMode = ref(false);

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Alt') {
    isCopyMode.value = true;
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Alt') {
    isCopyMode.value = false;
  }
};

// 任务库管理相关
const taskTemplates = ref<any[]>([]);
const selectedFirstTypeFilter = ref('');

const uniqueFirstTypes = computed(() => {
  const set = new Set(taskTemplates.value.map(t => t.firstType).filter(Boolean));
  return Array.from(set);
});

const filteredTaskTemplates = computed(() => {
  if (!selectedFirstTypeFilter.value) {
    return taskTemplates.value;
  }
  return taskTemplates.value.filter(t => t.firstType === selectedFirstTypeFilter.value);
});

const filteredSecondTypes = computed(() => {
  if (!taskTemplateForm.value.firstType) {
    // 显示所有可用的二级分类
    return firstTypes.value.flatMap(ft => (ft as any).children || []);
  }
  const first = firstTypes.value.find(ft => ft.categoryName === taskTemplateForm.value.firstType);
  return first ? ((first as any).children || []) : [];
});

const taskTemplateDialogVisible = ref(false);
const taskTemplateDialogTitle = ref('');
const isEditingTaskTemplate = ref(false);
const editingTaskTemplateId = ref<number | null>(null);

const taskTemplateForm = ref({
  firstType: '',
  secondType: '',
  title: '',
  eventDetail: '',
  priority: 'normal',
  sortOrder: 0,
});

// 批量导入相关
const importDialogVisible = ref(false);
const importDialogType = ref<'category' | 'template'>('category');
const importText = ref('');
const importResult = ref<{
  success: number;
  failed: number;
  errors: string[];
} | null>(null);

const importDialogTitle = computed(() =>
  importDialogType.value === 'category' ? '批量导入分类' : '批量导入任务模板'
);

// 权限管理相关
const showPermissionDialog = ref(false);
const userList = ref<any[]>([]);
const permissionForm = ref({
  userId: null as number | null,
  canEditAll: true,
  editableCategoryIds: [] as number[],
});

const filteredFirstTypes = computed(() => {
  return selectedRoleFilter.value
    ? firstTypes.value.filter(f => f.role === selectedRoleFilter.value)
    : firstTypes.value;
});

onMounted(() => {
  loadData();
  loadUserList();
  loadTaskTemplates();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});

const goBack = () => {
  router.push('/admin');
};

const filterByRole = () => {
  // treeData computed 会自动处理筛选
};

const loadData = async () => {
  loading.value = true;
  try {
    const [firstTypesList, allSecondTypes] = await Promise.all([
      api.dict.getFirstTypes(),
      api.dict.getSecondTypes(),
    ]);

    firstTypes.value = firstTypesList.map(first => ({
      ...first,
      children: allSecondTypes.filter(second => second.parentId === first.id),
    }));
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const loadUserList = async () => {
  try {
    const res = await api.accounts.list({ page: 1, pageSize: 1000 });
    userList.value = res.list || res;
  } catch (error) {
    console.error('加载用户列表失败', error);
  }
};

const loadUserPermissions = async () => {
  if (!permissionForm.value.userId) return;
  try {
    const permissions = await api.staffAssignments.getDiaryPermission(permissionForm.value.userId);
    permissionForm.value.canEditAll = permissions.canEditAll ?? true;
    permissionForm.value.editableCategoryIds = permissions.editableCategoryIds || [];
  } catch (error) {
    console.error('加载用户权限失败', error);
    permissionForm.value.canEditAll = true;
    permissionForm.value.editableCategoryIds = [];
  }
};

const saveUserPermissions = async () => {
  if (!permissionForm.value.userId) {
    ElMessage.warning('请选择用户');
    return;
  }

  try {
    await api.dict.updateUserPermissions({
      userId: permissionForm.value.userId,
      canEditAll: permissionForm.value.canEditAll,
      editableCategoryIds: permissionForm.value.editableCategoryIds,
    });
    ElMessage.success('权限设置已保存');
    showPermissionDialog.value = false;
  } catch (error) {
    console.error('保存权限失败', error);
    ElMessage.error('保存权限失败');
  }
};

// ============== 分类节点操作 ==============

const handleNodeClick = (data: DictCategory) => {
  selectedNode.value = data;
};

const addRoleCategory = () => {
  ElMessageBox.prompt('请输入用户类别名称（如：船舶政委、船工主管等）', '添加用户类别', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: '例如：船舶政委',
    inputValidator: (value: string) => {
      if (!value.trim()) return '类别名称不能为空';
      return true;
    },
  }).then(({ value }) => {
    ElMessage.success(`已添加用户类别：${value}，请在添加分类时选择该类别`);
  }).catch(() => {});
};

const addFirstType = () => {
  formType.value = 'addFirst';
  editingItem.value = null;
  selectedParentId.value = null;
  dialogTitle.value = '添加一级分类';
  form.value = { categoryName: '', sortOrder: 0, role: selectedRoleFilter.value || undefined };
  dialogVisible.value = true;
};

const addSecondType = (parent: DictCategory) => {
  formType.value = 'addSecond';
  editingItem.value = null;
  selectedParentId.value = parent.id;
  dialogTitle.value = `添加二级分类 - ${parent.categoryName}`;
  form.value = { categoryName: '', sortOrder: 0, role: parent.role };
  dialogVisible.value = true;
};

const editNode = (item: DictCategory) => {
  formType.value = item.categoryType === 'first_type' ? 'editFirst' : 'editSecond';
  editingItem.value = item;
  selectedParentId.value = item.parentId || null;
  dialogTitle.value = item.categoryType === 'first_type' ? '编辑一级分类' : '编辑二级分类';
  form.value = {
    categoryName: item.categoryName,
    sortOrder: item.sortOrder,
    role: item.role || undefined,
  };
  dialogVisible.value = true;
};

const deleteNode = async (item: DictCategory) => {
  const isFirst = item.categoryType === 'first_type';
  const childCount = isFirst ? (item as any).children?.length || 0 : 0;

  let message = '确定要删除吗？';
  if (isFirst && childCount > 0) {
    message = `确定要删除吗？该分类下有 ${childCount} 个二级分类也会受到影响`;
  }

  try {
    await ElMessageBox.confirm(message, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await api.dict.delete(item.id);
    ElMessage.success('删除成功');
    if (selectedNode.value?.id === item.id) {
      selectedNode.value = null;
    }
    await loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const handleSave = async () => {
  if (!form.value.categoryName) {
    ElMessage.warning('请输入分类名称');
    return;
  }

  try {
    if (editingItem.value) {
      await api.dict.update(editingItem.value.id, {
        categoryName: form.value.categoryName,
        sortOrder: form.value.sortOrder,
        role: form.value.role,
      });
      ElMessage.success('更新成功');
    } else {
      const isFirst = formType.value === 'addFirst';
      await api.dict.create({
        categoryType: isFirst ? 'first_type' : 'second_type',
        categoryName: form.value.categoryName,
        sortOrder: form.value.sortOrder,
        role: form.value.role,
        parentId: isFirst ? undefined : selectedParentId.value || undefined,
      });
      ElMessage.success('添加成功');
    }
    dialogVisible.value = false;
    await loadData();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

// ============== 任务库操作 ==============

const loadTaskTemplates = async () => {
  try {
    const data = await api.standardTaskTemplates.getAll();
    taskTemplates.value = Array.isArray(data) ? data : (data as any).list || [];
  } catch (error) {
    console.error('加载任务库失败', error);
    taskTemplates.value = [];
  }
};

const addTaskTemplate = () => {
  isEditingTaskTemplate.value = false;
  editingTaskTemplateId.value = null;
  taskTemplateDialogTitle.value = '添加任务模板';
  taskTemplateForm.value = {
    firstType: selectedFirstTypeFilter.value || '',
    secondType: '',
    title: '',
    eventDetail: '',
    priority: 'normal',
    sortOrder: 0,
  };
  taskTemplateDialogVisible.value = true;
};

const editTaskTemplate = (row: any) => {
  isEditingTaskTemplate.value = true;
  editingTaskTemplateId.value = row.id;
  taskTemplateDialogTitle.value = '编辑任务模板';
  taskTemplateForm.value = {
    firstType: row.firstType,
    secondType: row.secondType,
    title: row.title || '',
    eventDetail: row.eventDetail || '',
    priority: row.priority || 'normal',
    sortOrder: row.sortOrder || 0,
  };
  taskTemplateDialogVisible.value = true;
};

const deleteTaskTemplate = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除此任务模板吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await api.standardTaskTemplates.delete(row.id);
    ElMessage.success('删除成功');
    await loadTaskTemplates();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const handleSaveTaskTemplate = async () => {
  if (!taskTemplateForm.value.firstType || !taskTemplateForm.value.secondType) {
    ElMessage.warning('请填写一级分类和二级分类');
    return;
  }

  try {
    if (isEditingTaskTemplate.value && editingTaskTemplateId.value) {
      await api.standardTaskTemplates.update(editingTaskTemplateId.value, taskTemplateForm.value);
      ElMessage.success('更新成功');
    } else {
      await api.standardTaskTemplates.create(taskTemplateForm.value);
      ElMessage.success('添加成功');
    }
    taskTemplateDialogVisible.value = false;
    await loadTaskTemplates();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

// ============== 批量导入 ==============

const showImportDialog = (type: 'category' | 'template') => {
  importDialogType.value = type;
  importText.value = '';
  importDialogVisible.value = true;
};

const handleImport = async () => {
  const text = importText.value.trim();
  if (!text) {
    ElMessage.warning('请输入导入内容');
    return;
  }

  try {
    let result;
    if (importDialogType.value === 'category') {
      result = await api.dict.importFromText(text);
    } else {
      result = await api.standardTaskTemplates.importFromText(text);
    }

    const success = result?.success || 0;
    const failed = result?.failed || 0;
    const errors = result?.errors || [];

    // 保存导入结果用于展示
    importResult.value = { success, failed, errors };

    // 刷新数据
    if (importDialogType.value === 'category') {
      await loadData();
    } else {
      await loadTaskTemplates();
    }

    // 清空输入框
    importText.value = '';
  } catch (error) {
    ElMessage.error('导入失败');
    console.error(error);
  }
};

const closeImportDialog = () => {
  importDialogVisible.value = false;
  importResult.value = null;
  importText.value = '';
};

// ============== 工具方法 ==============

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    shore_crew_supervisor: '船工主管',
    ship_political_instructor: '船舶政委',
    shore_marine_supervisor: '海务主管',
    shore_engineer_supervisor: '机务主管',
  };
  return map[role] || role;
};

const getRoleTagType = (role: string) => {
  const map: Record<string, string> = {
    shore_crew_supervisor: 'primary',
    ship_political_instructor: 'success',
    shore_marine_supervisor: 'warning',
    shore_engineer_supervisor: 'info',
  };
  return map[role] || '';
};

const getPriorityLabel = (priority: string) => {
  const map: Record<string, string> = {
    normal: '普通',
    high: '高',
    urgent: '紧急',
  };
  return map[priority] || priority;
};

const getPriorityTagType = (priority: string) => {
  const map: Record<string, string> = {
    normal: 'info',
    high: 'warning',
    urgent: 'danger',
  };
  return map[priority] || '';
};

// ====== 拖拽相关方法 ======
const allowDrag = (node: any) => {
  return true;
};

const allowDrop = (draggingNode: any, dropNode: any, type: 'prev' | 'inner' | 'next') => {
  if (dropNode.data.categoryType === 'second_type' && type === 'inner') {
    return false;
  }
  return true;
};

const handleNodeDrop = async (draggingNodeData: any, dropNodeData: any, dropType: 'prev' | 'inner' | 'next', event: DragEvent) => {
  const dragged = draggingNodeData.data as DictCategory;
  const dropped = dropNodeData.data as DictCategory;

  try {
    if (isCopyMode.value) {
      const copyData: any = {
        categoryType: dragged.categoryType,
        categoryName: dragged.categoryName + ' (副本)',
        sortOrder: dropped.sortOrder + (dropType === 'next' ? 1 : 0),
        role: dragged.role,
      };

      if (dragged.categoryType === 'second_type') {
        if (dropType === 'inner' && dropped.categoryType === 'first_type') {
          copyData.parentId = dropped.id;
        } else {
          copyData.parentId = dropped.parentId;
        }
      } else if (dropType === 'inner' && dropped.categoryType === 'first_type') {
        copyData.categoryType = 'second_type';
        copyData.parentId = dropped.id;
      }

      await api.dict.create(copyData);
      ElMessage.success('已复制分类');
    } else {
      const updateData: any = {
        sortOrder: dropped.sortOrder + (dropType === 'next' ? 1 : 0),
      };

      if (dragged.categoryType === 'second_type') {
        if (dropType === 'inner' && dropped.categoryType === 'first_type') {
          updateData.parentId = dropped.id;
        } else {
          updateData.parentId = dropped.parentId;
        }
      } else if (dropType === 'inner' && dropped.categoryType === 'first_type') {
        updateData.parentId = dropped.id;
        updateData.categoryType = 'second_type';
      } else if (dragged.categoryType === 'first_type' && dropType !== 'inner') {
        updateData.parentId = null;
      }

      await api.dict.update(dragged.id, updateData);
      ElMessage.success('已移动分类');
    }

    await loadData();
  } catch (error) {
    console.error('拖拽操作失败', error);
    ElMessage.error('拖拽操作失败');
  }

  isCopyMode.value = false;
};
</script>

<style scoped>
.dict-page {
  height: 100%;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.permission-dialog-content {
  padding: 8px 0;
}

.permission-tree {
  background: #fafafa;
}

/* 批量导入结果展示样式 */
.import-result {
  padding: 8px 0;
}

.result-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.result-item.success .result-icon {
  color: #67c23a;
  font-size: 18px;
  font-weight: bold;
}

.result-item.failed .result-icon {
  color: #f56c6c;
  font-size: 18px;
  font-weight: bold;
}

.result-item strong {
  font-size: 18px;
  font-weight: 600;
}

.result-errors {
  margin-bottom: 20px;
}

.errors-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.errors-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
  background: #fff5f5;
}

.error-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid #fef0f0;
}

.error-item:last-child {
  border-bottom: none;
}

.error-line {
  color: #909399;
  min-width: 60px;
  font-weight: 500;
}

.error-msg {
  color: #f56c6c;
  flex: 1;
}

.result-actions {
  text-align: center;
  padding-top: 12px;
}
</style>
