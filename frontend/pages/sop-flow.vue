<template>
  <div class="sop-flow-page">
    <div class="toolbar">
      <div class="flex items-center justify-between">
        <div class="flex-1"></div>
        <el-button type="primary" @click="showCreate = true">添加流程</el-button>
      </div>
    </div>

    <div class="content-container">
      <el-card 
        v-for="item in sopFlowList" 
        :key="item.id" 
        class="mb-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-lg font-semibold">{{ item.flowName }}</h3>
              <el-tag v-if="item.firstType" size="small">{{ item.firstType }}</el-tag>
              <el-tag v-if="item.secondType" type="success" size="small">{{ item.secondType }}</el-tag>
            </div>
            <p class="text-[#4A4A4A] whitespace-pre-wrap">{{ item.flowContent }}</p>
            <p class="text-xs text-[#808080] mt-2">
              更新时间: {{ formatDate(item.updatedAt) }}
            </p>
          </div>
          <div class="flex gap-2">
            <el-button size="small" @click="handleEdit(item)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(item)">删除</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog 
      v-model="showCreate" 
      :title="editingId ? '编辑流程' : '添加流程'"
      width="600px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="流程名称">
          <el-input v-model="formData.flowName" placeholder="请输入流程名称" />
        </el-form-item>
        <el-form-item label="一级分类">
          <el-select v-model="formData.firstType" placeholder="选择分类" class="w-full" clearable>
            <el-option 
              v-for="cat in firstTypes" 
              :key="cat.categoryName" 
              :label="cat.categoryName" 
              :value="cat.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="二级分类">
          <el-select v-model="formData.secondType" placeholder="选择分类" class="w-full" clearable>
            <el-option 
              v-for="cat in secondTypes" 
              :key="cat.categoryName" 
              :label="cat.categoryName" 
              :value="cat.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="流程内容">
          <el-input v-model="formData.flowContent" type="textarea" :rows="8" placeholder="请输入流程内容" />
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
import { ElMessage } from 'element-plus';
import { useApi } from '~/composables/useApi';
import type { SopFlow, DictCategory, CreateSopFlowRequest } from '~/types';

const api = useApi();
const sopFlowList = ref<SopFlow[]>([]);
const firstTypes = ref<DictCategory[]>([]);
const secondTypes = ref<DictCategory[]>([]);
const showCreate = ref(false);
const editingId = ref<number | null>(null);

const formData = ref<Partial<CreateSopFlowRequest>>({
  flowName: '',
  flowContent: '',
  firstType: undefined,
  secondType: undefined,
});

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN');
};

const loadData = async () => {
  try {
    sopFlowList.value = await api.sopFlow.getAll() as SopFlow[];
    firstTypes.value = await api.dict.getFirstTypes() as DictCategory[];
    secondTypes.value = await api.dict.getSecondTypes() as DictCategory[];
  } catch (e) {
    console.error('加载数据失败', e);
  }
};

const handleEdit = (row: SopFlow) => {
  editingId.value = row.id;
  formData.value = {
    flowName: row.flowName,
    flowContent: row.flowContent,
    firstType: row.firstType,
    secondType: row.secondType,
  };
  showCreate.value = true;
};

const handleDelete = async (row: SopFlow) => {
  try {
    await api.sopFlow.delete(row.id);
    await loadData();
  } catch (e) {
    console.error('删除失败', e);
  }
};

const handleSave = async () => {
  if (!formData.value.flowName) {
    ElMessage.warning('流程名称不能为空');
    return;
  }
  try {
    if (editingId.value) {
      await api.sopFlow.update(editingId.value, formData.value as any);
    } else {
      await api.sopFlow.create(formData.value as CreateSopFlowRequest);
    }
    showCreate.value = false;
    editingId.value = null;
    formData.value = {
      flowName: '',
      flowContent: '',
      firstType: undefined,
      secondType: undefined,
    };
    await loadData();
    ElMessage.success('保存成功');
  } catch (e) {
    console.error('保存失败', e);
    const error = e as any;
    ElMessage.error('保存失败: ' + (error.data?.message || error.message || '未知错误'));
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.sop-flow-page {
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

.content-container {
  flex: 1;
  overflow: auto;
}
</style>
