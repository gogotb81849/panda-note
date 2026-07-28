<template>
  <div class="public-case-page">
    <div class="toolbar">
      <div class="flex items-center justify-between">
        <el-select 
          v-model="selectedType" 
          placeholder="选择分类筛选" 
          clearable
          class="w-64"
          @change="loadData"
        >
          <el-option label="全部" value="" />
          <el-option 
            v-for="cat in firstTypes" 
            :key="cat.categoryName" 
            :label="cat.categoryName" 
            :value="cat.categoryName"
          />
        </el-select>
        <el-button type="primary" @click="showCreate = true">添加案例</el-button>
      </div>
    </div>

    <div class="content-container">
      <el-card 
        v-for="item in publicCaseList" 
        :key="item.id" 
        class="mb-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <el-tag type="warning">{{ item.caseType }}</el-tag>
            </div>
            <p class="text-[#4A4A4A] whitespace-pre-wrap">{{ item.caseContent }}</p>
            <p class="text-xs text-[#808080] mt-2">
              创建时间: {{ formatDate(item.createdAt) }}
            </p>
          </div>
          <el-button size="small" type="danger" @click="handleDelete(item)">删除</el-button>
        </div>
      </el-card>
    </div>

    <!-- 创建对话框 -->
    <el-dialog 
      v-model="showCreate" 
      title="添加案例"
      width="600px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="案例类型">
          <el-select v-model="formData.caseType" placeholder="选择类型" class="w-full">
            <el-option 
              v-for="cat in firstTypes" 
              :key="cat.categoryName" 
              :label="cat.categoryName" 
              :value="cat.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="案例内容">
          <el-input v-model="formData.caseContent" type="textarea" :rows="10" placeholder="请输入案例内容" />
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
import type { PublicCase, DictCategory, CreatePublicCaseRequest } from '~/types';

const api = useApi();
const publicCaseList = ref<PublicCase[]>([]);
const firstTypes = ref<DictCategory[]>([]);
const selectedType = ref<string>('');
const showCreate = ref(false);

const formData = ref<Partial<CreatePublicCaseRequest>>({
  caseType: '',
  caseContent: '',
});

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN');
};

const loadData = async () => {
  try {
    firstTypes.value = await api.dict.getFirstTypes() as DictCategory[];
    if (selectedType.value) {
      publicCaseList.value = await api.publicCase.getAll(selectedType.value) as PublicCase[];
    } else {
      publicCaseList.value = await api.publicCase.getAll() as PublicCase[];
    }
  } catch (e) {
    console.error('加载数据失败', e);
  }
};

const handleDelete = async (row: PublicCase) => {
  try {
    await api.publicCase.delete(row.id);
    await loadData();
  } catch (e) {
    console.error('删除失败', e);
  }
};

const handleSave = async () => {
  if (!formData.value.caseType) {
    ElMessage.warning('案例类型不能为空');
    return;
  }
  if (!formData.value.caseContent) {
    ElMessage.warning('案例内容不能为空');
    return;
  }
  try {
    await api.publicCase.create(formData.value as CreatePublicCaseRequest);
    showCreate.value = false;
    formData.value = {
      caseType: '',
      caseContent: '',
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
.public-case-page {
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
