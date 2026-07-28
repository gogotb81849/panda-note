<template>
  <div class="section-manager">
    <div class="section-list">
      <div v-for="section in sections" :key="section.id" class="section-item">
        <div class="section-header">
          <div class="section-info">
            <el-input
              v-if="editingId === section.id"
              v-model="editingName"
              size="small"
              @blur="handleSaveEdit(section)"
              @keyup.enter="handleSaveEdit(section)"
              ref="editInput"
            />
            <span v-else class="section-name" @dblclick="startEdit(section)">
              {{ section.name }}
            </span>
            <el-tag size="small" type="info">{{ getLayoutLabel(section.layout) }}</el-tag>
          </div>
          <div class="section-actions">
            <el-dropdown trigger="click">
              <el-button size="small" text>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="startEdit(section)">重命名</el-dropdown-item>
                  <el-dropdown-item @click="changeLayout(section, 'single-column')">单栏布局</el-dropdown-item>
                  <el-dropdown-item @click="changeLayout(section, 'two-column')">双栏布局</el-dropdown-item>
                  <el-dropdown-item @click="changeLayout(section, 'three-column')">三栏布局</el-dropdown-item>
                  <el-dropdown-item divided @click="handleDelete(section.id)" style="color: var(--color-danger)">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <div class="section-stats">
          <span class="stat">
            <el-icon><Document /></el-icon>
            {{ section.articles?.length || 0 }} 篇
          </span>
          <span class="stat">
            <el-icon><Coin /></el-icon>
            第 {{ section.pageStart }}-{{ section.pageEnd }} 页
          </span>
        </div>
      </div>

      <div v-if="sections.length === 0" class="empty-state">
        <el-empty description="暂无版块" />
      </div>
    </div>

    <div class="add-section">
      <el-input v-model="newSectionName" placeholder="新版块名称" size="default">
        <template #append>
          <el-button @click="handleAdd" :disabled="!newSectionName.trim()">
            <el-icon><Plus /></el-icon>
          </el-button>
        </template>
      </el-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MoreFilled, Document, Coin, Plus } from '@element-plus/icons-vue'

interface Section {
  id: string
  name: string
  layout: string
  pageStart: number
  pageEnd: number
  articles?: any[]
}

const props = defineProps<{
  sections: Section[]
}>()

const emit = defineEmits(['add', 'update', 'delete'])

const newSectionName = ref('')
const editingId = ref<string | null>(null)
const editingName = ref('')

const getLayoutLabel = (layout: string) => {
  const labels: Record<string, string> = {
    'single-column': '单栏',
    'two-column': '双栏',
    'three-column': '三栏',
  }
  return labels[layout] || layout
}

const handleAdd = () => {
  if (!newSectionName.value.trim()) {
    ElMessage.warning('请输入版块名称')
    return
  }
  emit('add', {
    name: newSectionName.value.trim(),
    layout: 'single-column',
  })
  newSectionName.value = ''
}

const startEdit = (section: Section) => {
  editingId.value = section.id
  editingName.value = section.name
}

const handleSaveEdit = (section: Section) => {
  if (editingName.value.trim()) {
    emit('update', section.id, { name: editingName.value.trim() })
  }
  editingId.value = null
}

const changeLayout = (section: Section, layout: string) => {
  emit('update', section.id, { layout })
}

const handleDelete = (sectionId: string) => {
  emit('delete', sectionId)
}
</script>

<style scoped>
.section-manager {
  padding: 16px;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.section-item {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-name {
  font-weight: 600;
  cursor: pointer;
}

.section-name:hover {
  color: var(--color-primary);
}

.section-actions {
  display: flex;
  gap: 4px;
}

.section-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-state {
  padding: 20px;
}

.add-section {
  display: flex;
  gap: 8px;
}
</style>
