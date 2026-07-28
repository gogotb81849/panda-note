<template>
  <div class="sticky-list-page">
    <div class="flex h-full flex-col">
      <!-- 顶部栏 -->
      <div class="bg-white border-b border-gray-200">
        <div class="flex items-center gap-4 px-4 py-3">
          <el-button text @click="goBack" class="p-1">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <h2 class="text-lg font-semibold text-gray-800">便利贴管理</h2>
          <div class="flex-1" />
          <el-button type="primary" @click="openNewSticky">
            <el-icon><Plus /></el-icon>
            新建便利贴
          </el-button>
        </div>
      </div>

      <!-- 便利贴列表 -->
      <div class="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div v-if="notes.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
          <svg class="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p class="text-lg mb-4">还没有便利贴</p>
          <el-button type="primary" @click="openNewSticky">创建第一个便利贴</el-button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div 
            v-for="sticky in notes" 
            :key="sticky.id"
            class="sticky-card cursor-pointer transition-transform hover:scale-105"
            :style="{ backgroundColor: sticky.color }"
            @click="openSticky(sticky.id)"
          >
            <div class="sticky-card-header">
              <span class="sticky-card-title">{{ sticky.title || '无标题' }}</span>
              <el-button 
                text 
                size="small" 
                class="delete-btn"
                @click.stop="deleteSticky(sticky.id)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="sticky-card-content">
              {{ sticky.content || '空白便签' }}
            </div>
            <div class="sticky-card-footer">
              <span class="sticky-card-time">{{ formatDate(sticky.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Plus, Delete } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  position: { x: number; y: number };
}

const STORAGE_KEY = 'sticky_notes';
const router = useRouter();

const notes = ref<StickyNote[]>([]);

// 获取所有便签
function getAllNotes(): StickyNote[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 加载便签列表
function loadNotes() {
  notes.value = getAllNotes().sort((a, b) => b.updatedAt - a.updatedAt);
}

// 打开新便签
function openNewSticky() {
  window.open(
    '/sticky',
    '便利贴',
    'width=300,height=350,resizable=yes,menubar=no'
  );
}

// 打开指定便签
function openSticky(id: string) {
  window.open(
    `/sticky?id=${id}`,
    `便利贴_${id}`,
    'width=300,height=350,resizable=yes,menubar=no'
  );
}

// 删除便签
async function deleteSticky(id: string) {
  try {
    await ElMessageBox.confirm('确定要删除这个便利贴吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const notes = getAllNotes().filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    loadNotes();
    ElMessage.success('已删除');
  } catch {
    // 用户取消
  }
}

// 格式化日期
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

// 返回上一页
function goBack() {
  router.back();
}

onMounted(() => {
  loadNotes();
  
  // 监听存储变化，以便在其他窗口关闭便签后刷新列表
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      loadNotes();
    }
  });
});
</script>

<style scoped>
.sticky-list-page {
  height: 100%;
}

.sticky-card {
  min-height: 120px;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

.sticky-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.sticky-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  color: #666;
}

.sticky-card:hover .delete-btn {
  opacity: 1;
}

.sticky-card-content {
  flex: 1;
  font-size: 12px;
  color: #555;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.sticky-card-footer {
  margin-top: 8px;
  text-align: right;
}

.sticky-card-time {
  font-size: 11px;
  color: #999;
}
</style>
