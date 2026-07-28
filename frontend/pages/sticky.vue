<template>
  <div class="sticky-note" :style="{ backgroundColor: note.color }">
    <div class="sticky-header" @mousedown="startDrag">
      <input 
        v-model="note.title" 
        class="sticky-title"
        placeholder="标题"
        @input="saveNote"
      />
      <div class="sticky-actions">
        <el-color-picker 
          v-model="note.color" 
          size="small"
          :predefine="colors"
          @change="saveNote"
        />
        <el-button text @click="close">×</el-button>
      </div>
    </div>
    
    <textarea 
      v-model="note.content"
      class="sticky-content"
      placeholder="写下你的想法..."
      @input="saveNote"
    />
    
    <div class="sticky-footer">
      <span class="sticky-time">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';

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

// 预设颜色
const colors = [
  '#fef3cd', // 黄色
  '#cce5ff', // 蓝色
  '#d4edda', // 绿色
  '#f8d7da', // 粉色
  '#ffe4c4', // 橙色
];

// 默认便签数据
const createDefaultNote = (id?: string): StickyNote => ({
  id: id || generateId(),
  title: '',
  content: '',
  color: '#fef3cd',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  position: { x: 0, y: 0 },
});

const note = ref<StickyNote>(createDefaultNote());
const noteId = ref<string | null>(null);

// 生成唯一ID
function generateId(): string {
  return `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取所有便签
function getAllNotes(): StickyNote[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 保存所有便签
function saveAllNotes(notes: StickyNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// 保存当前便签
function saveNote() {
  note.value.updatedAt = Date.now();
  const notes = getAllNotes();
  const index = notes.findIndex(n => n.id === noteId.value);
  
  if (index >= 0) {
    notes[index] = { ...note.value };
  } else {
    notes.push({ ...note.value });
    noteId.value = note.value.id;
  }
  
  saveAllNotes(notes);
}

// 删除便签
function deleteNote() {
  const notes = getAllNotes().filter(n => n.id !== noteId.value);
  saveAllNotes(notes);
}

// 关闭当前便签
function close() {
  if (note.value.title || note.value.content) {
    saveNote();
  }
  window.close();
}

// 格式化时间
const formattedTime = computed(() => {
  const date = new Date(note.value.updatedAt);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
});

// 拖拽功能
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function startDrag(e: MouseEvent) {
  // 只在点击 header 时拖动
  if ((e.target as HTMLElement).closest('.sticky-actions') || 
      (e.target as HTMLElement).closest('.sticky-title') ||
      (e.target as HTMLElement).closest('.sticky-content')) {
    return;
  }
  
  isDragging = true;
  dragOffsetX = e.clientX;
  dragOffsetY = e.clientY;
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(e: MouseEvent) {
  if (!isDragging) return;
  
  const deltaX = e.clientX - dragOffsetX;
  const deltaY = e.clientY - dragOffsetY;
  
  window.moveTo(
    window.screenX + deltaX,
    window.screenY + deltaY
  );
  
  dragOffsetX = e.clientX;
  dragOffsetY = e.clientY;
}

function stopDrag() {
  isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// 初始化
onMounted(() => {
  // 从 URL 参数获取便签 ID
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  if (id) {
    // 加载现有便签
    noteId.value = id;
    const notes = getAllNotes();
    const existingNote = notes.find(n => n.id === id);
    if (existingNote) {
      note.value = { ...existingNote };
    } else {
      noteId.value = id;
      note.value.id = id;
    }
  } else {
    // 创建新便签
    noteId.value = note.value.id;
    saveNote();
  }
  
  // 恢复窗口位置
  if (note.value.position.x || note.value.position.y) {
    window.moveTo(note.value.position.x, note.value.position.y);
  }
});

// 页面卸载时保存位置
watch(() => note.value.position, (newPos) => {
  // 窗口位置会在关闭时通过 window.screenX/Y 获取
}, { deep: true });

// 监听窗口关闭事件
window.addEventListener('beforeunload', () => {
  note.value.position = { x: window.screenX, y: window.screenY };
  if (note.value.title || note.value.content) {
    saveNote();
  }
});
</script>

<style scoped>
.sticky-note {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

.sticky-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: move;
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.sticky-title {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  outline: none;
  padding: 4px;
}

.sticky-title::placeholder {
  color: #999;
}

.sticky-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sticky-content {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-size: 13px;
  line-height: 1.6;
  color: #444;
  padding: 12px 16px;
  outline: none;
  font-family: inherit;
}

.sticky-content::placeholder {
  color: #aaa;
}

.sticky-footer {
  padding: 6px 12px;
  text-align: right;
  background: rgba(0, 0, 0, 0.03);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.sticky-time {
  font-size: 11px;
  color: #888;
}
</style>
