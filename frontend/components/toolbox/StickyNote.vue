<template>
  <div 
    class="sticky-note"
    :style="{ left: position.x + 'px', top: position.y + 'px', backgroundColor: note.color }"
    @mousedown="startDrag"
  >
    <div class="note-header" @mousedown.stop="startDrag">
      <span class="note-title">便利贴</span>
      <div class="note-actions">
        <el-color-picker 
          v-model="note.color" 
          size="small"
          :predefine="colors"
          @mousedown.stop
        />
        <button class="close-btn" @click="closeNote" @mousedown.stop>
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>
    <div class="note-body">
      <textarea 
        v-model="note.content" 
        placeholder="在这里记录..."
        @input="saveToLocalStorage"
        @mousedown.stop
      />
    </div>
    <div class="note-footer">
      <span class="note-time">{{ formatTime(note.updatedAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  id: string
}>()

const emit = defineEmits<{
  (e: 'close', id: string): void
}>()

interface NoteData {
  id: string
  content: string
  color: string
  position: { x: number; y: number }
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'sticky-notes'

const colors = [
  '#ffeb3b', // 黄色
  '#ff9800', // 橙色
  '#e91e63', // 粉色
  '#9c27b0', // 紫色
  '#4caf50', // 绿色
  '#03a9f4', // 蓝色
  '#ffffff', // 白色
]

const note = reactive<NoteData>({
  id: props.id,
  content: '',
  color: '#ffeb3b',
  position: { x: 100, y: 100 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const position = ref({ x: 100, y: 100 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const loadFromLocalStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const notes: NoteData[] = JSON.parse(data)
      const existingNote = notes.find(n => n.id === props.id)
      if (existingNote) {
        note.content = existingNote.content
        note.color = existingNote.color
        note.position = existingNote.position
        note.createdAt = existingNote.createdAt
        note.updatedAt = existingNote.updatedAt
        position.value = { ...existingNote.position }
      } else {
        // 新建便签，随机位置
        position.value = {
          x: Math.random() * (window.innerWidth - 300) + 50,
          y: Math.random() * (window.innerHeight - 400) + 50
        }
        note.position = { ...position.value }
      }
    } else {
      // 首次创建，随机位置
      position.value = {
        x: Math.random() * (window.innerWidth - 300) + 50,
        y: Math.random() * (window.innerHeight - 400) + 50
      }
      note.position = { ...position.value }
    }
  } catch (error) {
    console.error('加载便利贴失败:', error)
    position.value = { x: 100, y: 100 }
    note.position = { ...position.value }
  }
}

const saveToLocalStorage = () => {
  try {
    note.updatedAt = new Date().toISOString()
    const data = localStorage.getItem(STORAGE_KEY)
    const notes: NoteData[] = data ? JSON.parse(data) : []
    
    const idx = notes.findIndex(n => n.id === props.id)
    if (idx >= 0) {
      notes[idx] = { ...note }
    } else {
      notes.push({ ...note })
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch (error) {
    console.error('保存便利贴失败:', error)
  }
}

const startDrag = (e: MouseEvent) => {
  if ((e.target as HTMLElement).tagName === 'TEXTAREA' || 
      (e.target as HTMLElement).tagName === 'EL-COLOR-PICKER') {
    return
  }
  
  isDragging.value = true
  dragOffset.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  position.value = {
    x: Math.max(0, Math.min(e.clientX - dragOffset.value.x, window.innerWidth - 260)),
    y: Math.max(0, Math.min(e.clientY - dragOffset.value.y, window.innerHeight - 300))
  }
}

const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    note.position = { ...position.value }
    saveToLocalStorage()
  }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const closeNote = () => {
  emit('close', props.id)
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadFromLocalStorage()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.sticky-note {
  position: fixed;
  width: 260px;
  min-height: 200px;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  cursor: move;
  transition: box-shadow 0.2s;
}

.sticky-note:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  cursor: move;
}

.note-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.note-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.note-body {
  flex: 1;
  padding: 12px;
}

.note-body textarea {
  width: 100%;
  height: 140px;
  border: none;
  background: transparent;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.8);
  font-family: inherit;
  outline: none;
}

.note-body textarea::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.note-footer {
  padding: 6px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.note-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
}

:deep(.el-color-picker) {
  cursor: pointer;
}
</style>
