<template>
  <el-dialog
    v-model="visible"
    title="标题管理"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="title-manager">
      <!-- 添加新标题 -->
      <div class="add-section">
        <el-form :model="form" label-width="80px" size="small">
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="用户类别">
                <el-select v-model="form.role" placeholder="选择类别" style="width: 100%">
                  <el-option
                    v-for="r in userRoles"
                    :key="r.value"
                    :label="r.label"
                    :value="r.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="一级分类">
                <el-input v-model="form.categoryFirst" placeholder="如：航行安全" />
              </el-form-item>
            </el-col>
            <el-col :span="8" style="display: flex; align-items: flex-end;">
              <el-button type="primary" @click="addTitle" style="width: 100%">添加</el-button>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="16">
              <el-form-item label="二级标题">
                <el-input v-model="form.categorySecond" placeholder="如：狭水道航行" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="form.description" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- 拖拽提示 -->
      <div class="drag-hint">
        <el-icon><InfoFilled /></el-icon>
        <span>拖拽标题可移动到不同分类或类别（按住ALT键为复制，不按ALT为剪切移动）</span>
      </div>

      <!-- 标题列表 - 按用户类别分组 -->
      <div class="title-list">
        <h3 class="list-title">当前标题体系</h3>
        <div v-for="(roleData, roleKey) in groupedByRole" :key="roleKey" class="role-group">
          <!-- 用户类别头部（可展开/折叠） -->
          <div class="role-header" @click="toggleRole(roleKey)" @dragover.prevent="onDragOverRole($event, roleKey)" @drop="onDropToRole($event, roleKey)">
            <el-icon :style="{ transform: collapsedRoles.has(roleKey) ? 'rotate(-90deg)' : '' }">
              <ArrowRight />
            </el-icon>
            <span class="role-name">{{ getRoleLabel(roleKey) }}</span>
            <el-tag size="small" type="warning">{{ countRoleItems(roleKey) }} 项</el-tag>
          </div>

          <!-- 用户类别下的分类 -->
          <el-collapse-transition>
            <div v-show="!collapsedRoles.has(roleKey)" class="role-content">
              <div v-for="(subs, category) in roleData.categories" :key="category" class="category-group">
                <div class="category-header" @click="toggleCategory(roleKey, category)">
                  <el-icon :style="{ transform: collapsedCategories.has(`${roleKey}||${category}`) ? 'rotate(-90deg)' : '' }">
                    <ArrowRight />
                  </el-icon>
                  <span class="category-name">{{ category }}</span>
                  <el-tag size="small" type="info">{{ subs.length }} 项</el-tag>
                </div>
                <el-collapse-transition>
                  <div v-show="!collapsedCategories.has(`${roleKey}||${category}`)" class="subcategory-list"
                    @dragover.prevent="onDragOverCategory($event, roleKey, category)"
                    @drop="onDropToCategory($event, roleKey, category)">
                    <div v-for="item in subs" :key="item.id"
                      class="subcategory-item"
                      :class="{ 'dragging': dragState.draggingItem?.id === item.id, 'drop-target': dragState.dropTarget === item.id }"
                      draggable="true"
                      @dragstart="onDragStart($event, item)"
                      @dragend="onDragEnd"
                      @dragover.prevent="onDragOverItem($event, item)"
                      @dragleave="onDragLeaveItem"
                      @drop="onDropToItem($event, item)">
                      <el-icon class="drag-handle"><Rank /></el-icon>
                      <span class="subcategory-name">{{ item.categorySecond }}</span>
                      <span v-if="item.description" class="subcategory-desc">{{ item.description }}</span>
                      <div class="item-actions">
                        <el-icon class="action-icon" @click="editTitle(item)"><Edit /></el-icon>
                        <el-icon class="action-icon danger" @click="deleteTitle(item.id)"><Delete /></el-icon>
                      </div>
                    </div>
                  </div>
                </el-collapse-transition>
              </div>
            </div>
          </el-collapse-transition>
        </div>
        <div v-if="Object.keys(groupedByRole).length === 0" class="empty-tips">
          <el-empty description="暂无标题，请添加" :image-size="80" />
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑标题" width="400px" append-to-body>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="用户类别">
          <el-select v-model="editForm.role" placeholder="选择类别" style="width: 100%">
            <el-option
              v-for="r in userRoles"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="一级分类">
          <el-input v-model="editForm.categoryFirst" />
        </el-form-item>
        <el-form-item label="二级标题">
          <el-input v-model="editForm.categorySecond" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="editForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="loadSystemTitles">加载系统预设</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowRight, Rank, Edit, Delete, InfoFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'refresh'])

const authStore = useAuthStore()
const visible = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })
const editVisible = ref(false)

// 用户类别配置
const userRoles = [
  { value: 'shore_crew_supervisor', label: '船工主管' },
  { value: 'ship_political_instructor', label: '船舶政委' },
  { value: 'shore_marine_supervisor', label: '海务主管' },
  { value: 'shore_engineer_supervisor', label: '机务主管' },
  { value: 'shore_electric_supervisor', label: '电气主管' },
]

const getRoleLabel = (role: string) => {
  const found = userRoles.find(r => r.value === role)
  return found ? found.label : role
}

const form = ref({ role: 'shore_crew_supervisor', categoryFirst: '', categorySecond: '', description: '' })
const editForm = ref({ id: 0, role: '', categoryFirst: '', categorySecond: '', description: '' })

// 标题数据（从API加载）
const titles = ref<any[]>([])
const collapsedRoles = ref<Set<string>>(new Set())
const collapsedCategories = ref<Set<string>>(new Set())

// 按用户类别 + 一级分类分组
const groupedByRole = computed(() => {
  const grouped: Record<string, { categories: Record<string, any[]> }> = {}
  for (const t of titles.value) {
    const role = t.role || authStore.user?.role || 'shore_crew_supervisor'
    if (!grouped[role]) {
      grouped[role] = { categories: {} }
    }
    const cat = t.categoryFirst
    if (!grouped[role].categories[cat]) {
      grouped[role].categories[cat] = []
    }
    grouped[role].categories[cat].push(t)
  }
  return grouped
})

const countRoleItems = (role: string) => {
  const roleData = groupedByRole.value[role]
  if (!roleData) return 0
  let count = 0
  for (const subs of Object.values(roleData.categories)) {
    count += subs.length
  }
  return count
}

// 拖拽状态
const dragState = ref({
  draggingItem: null as any,
  isCopyMode: false,
  dropTarget: null as number | null,
})

// 加载标题 - 加载所有角色的标题
const loadTitles = async () => {
  try {
    const allTitles: any[] = []
    // 遍历所有角色加载标题
    for (const role of userRoles) {
      try {
        const res = await $fetch('/api/title', {
          headers: { Authorization: `Bearer ${authStore.token}` },
          query: { role: role.value }
        })
        for (const [cat, subs] of Object.entries(res as Record<string, any[]>)) {
          for (const s of subs) {
            allTitles.push({
              id: s.id,
              role: role.value,
              categoryFirst: cat,
              categorySecond: s.title,
              description: s.description,
            })
          }
        }
      } catch (e) {
        // 某些角色可能没有权限，跳过
      }
    }
    titles.value = allTitles
  } catch (e) {
    console.error('加载标题失败', e)
  }
}

// 添加标题
const addTitle = async () => {
  if (!form.value.categoryFirst || !form.value.categorySecond) {
    ElMessage.warning('请填写一级分类和二级标题')
    return
  }
  try {
    await $fetch('/api/title', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        categoryFirst: form.value.categoryFirst,
        categorySecond: form.value.categorySecond,
        description: form.value.description,
        role: form.value.role
      }
    })
    ElMessage.success('添加成功')
    form.value = { role: authStore.user?.role || 'shore_crew_supervisor', categoryFirst: '', categorySecond: '', description: '' }
    await loadTitles()
    emit('refresh')
  } catch (e: any) {
    console.error('添加失败', e)
    ElMessage.error(e.message || '添加失败，请重试')
  }
}

// 编辑标题
const editTitle = (item: any) => {
  editForm.value = { ...item }
  editVisible.value = true
}

const saveEdit = async () => {
  try {
    await $fetch(`/api/title/${editForm.value.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        categoryFirst: editForm.value.categoryFirst,
        categorySecond: editForm.value.categorySecond,
        description: editForm.value.description,
        role: editForm.value.role,
      }
    })
    editVisible.value = false
    await loadTitles()
    emit('refresh')
  } catch (e) {
    console.error('保存失败', e)
  }
}

// 删除标题
const deleteTitle = async (id: number) => {
  try {
    await $fetch(`/api/title/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await loadTitles()
    emit('refresh')
  } catch (e) {
    console.error('删除失败', e)
  }
}

// 加载系统预设
const loadSystemTitles = async () => {
  try {
    await $fetch('/api/title/init', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await loadTitles()
    emit('refresh')
  } catch (e) {
    console.error('加载系统预设失败', e)
  }
}

const toggleRole = (role: string) => {
  if (collapsedRoles.value.has(role)) {
    collapsedRoles.value.delete(role)
  } else {
    collapsedRoles.value.add(role)
  }
}

const toggleCategory = (role: string, cat: string) => {
  const key = `${role}||${cat}`
  if (collapsedCategories.value.has(key)) {
    collapsedCategories.value.delete(key)
  } else {
    collapsedCategories.value.add(key)
  }
}

// ========== 拖拽相关 ==========

const onDragStart = (event: DragEvent, item: any) => {
  dragState.value.draggingItem = item
  // 检测ALT键状态
  dragState.value.isCopyMode = event.altKey
  event.dataTransfer!.effectAllowed = dragState.value.isCopyMode ? 'copy' : 'move'
  event.dataTransfer!.setData('text/plain', JSON.stringify(item))

  // 添加ALT键监听
  document.addEventListener('keydown', onAltKeyDown)
  document.addEventListener('keyup', onAltKeyUp)
}

const onAltKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Alt' && dragState.value.draggingItem) {
    dragState.value.isCopyMode = true
  }
}

const onAltKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Alt' && dragState.value.draggingItem) {
    dragState.value.isCopyMode = false
  }
}

const onDragEnd = () => {
  dragState.value.draggingItem = null
  dragState.value.dropTarget = null
  document.removeEventListener('keydown', onAltKeyDown)
  document.removeEventListener('keyup', onAltKeyUp)
}

const onDragOverItem = (event: DragEvent, targetItem: any) => {
  dragState.value.dropTarget = targetItem.id
  event.dataTransfer!.dropEffect = dragState.value.isCopyMode ? 'copy' : 'move'
}

const onDragLeaveItem = () => {
  dragState.value.dropTarget = null
}

const onDragOverRole = (event: DragEvent, role: string) => {
  event.dataTransfer!.dropEffect = dragState.value.isCopyMode ? 'copy' : 'move'
}

const onDragOverCategory = (event: DragEvent, role: string, category: string) => {
  event.dataTransfer!.dropEffect = dragState.value.isCopyMode ? 'copy' : 'move'
}

// 执行移动或复制操作
const executeMoveOrCopy = async (item: any, targetRole: string, targetCategory: string) => {
  if (!item) return

  try {
    if (dragState.value.isCopyMode) {
      // 复制模式
      await $fetch('/api/title/copy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: {
          id: item.id,
          categoryFirst: targetCategory,
          role: targetRole,
        }
      })
      ElMessage.success(`已复制到 ${getRoleLabel(targetRole)} > ${targetCategory}`)
    } else {
      // 移动模式
      await $fetch('/api/title/move', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: {
          id: item.id,
          categoryFirst: targetCategory,
          role: targetRole,
        }
      })
      ElMessage.success(`已移动到 ${getRoleLabel(targetRole)} > ${targetCategory}`)
    }
    await loadTitles()
    emit('refresh')
  } catch (e: any) {
    console.error('拖拽操作失败', e)
    ElMessage.error('拖拽操作失败: ' + (e.message || '未知错误'))
  } finally {
    dragState.value.draggingItem = null
    dragState.value.dropTarget = null
  }
}

// 放到某个二级标题上（插入到该标题前面）
const onDropToItem = async (event: DragEvent, targetItem: any) => {
  event.stopPropagation()
  const dragged = dragState.value.draggingItem
  if (!dragged || dragged.id === targetItem.id) return

  await executeMoveOrCopy(dragged, targetItem.role, targetItem.categoryFirst)
}

// 放到某个用户类别上（添加到该类别的最后一个分类，或第一个分类）
const onDropToRole = async (event: DragEvent, targetRole: string) => {
  const dragged = dragState.value.draggingItem
  if (!dragged) return

  const roleData = groupedByRole.value[targetRole]
  if (!roleData) return

  // 放到该角色的第一个分类
  const categories = Object.keys(roleData.categories)
  if (categories.length > 0) {
    await executeMoveOrCopy(dragged, targetRole, categories[0])
  } else {
    // 如果该角色没有分类，提示用户先创建分类
    ElMessage.warning('该类别下暂无分类，请先添加分类')
  }
}

// 放到某个一级分类上
const onDropToCategory = async (event: DragEvent, targetRole: string, targetCategory: string) => {
  const dragged = dragState.value.draggingItem
  if (!dragged) return

  await executeMoveOrCopy(dragged, targetRole, targetCategory)
}

const handleClose = () => {
  emit('refresh')
}

onMounted(() => {
  loadTitles()
})
</script>

<style scoped>
.title-manager {
  max-height: 600px;
  overflow-y: auto;
}

.add-section {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.drag-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: #ecf5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #409eff;
}

.drag-hint .el-icon {
  font-size: 16px;
}

.list-title {
  font-size: 16px;
  margin: 0 0 16px 0;
  color: #303133;
}

/* 用户类别层级 */
.role-group {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.role-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.role-header:hover {
  background: linear-gradient(135deg, #fde2e2 0%, #fcd4d4 100%);
}

.role-header .el-icon {
  transition: transform 0.2s;
  font-size: 16px;
}

.role-name {
  font-weight: 700;
  color: #303133;
  flex: 1;
  font-size: 15px;
}

.role-content {
  padding: 8px;
  background: #fafafa;
}

/* 一级分类层级 */
.category-group {
  margin-bottom: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f0f2f5;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.category-header:hover {
  background: #e8eaed;
}

.category-header .el-icon {
  transition: transform 0.2s;
}

.category-name {
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.subcategory-list {
  padding-left: 28px;
}

/* 二级标题 */
.subcategory-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  transition: all 0.2s;
  border-radius: 4px;
}

.subcategory-item:last-child {
  border-bottom: none;
}

.subcategory-item:hover {
  background: #f5f7fa;
}

.subcategory-item.dragging {
  opacity: 0.5;
  background: #ecf5ff;
}

.subcategory-item.drop-target {
  border-top: 2px solid #409eff;
}

.drag-handle {
  cursor: grab;
  color: #909399;
}

.drag-handle:active {
  cursor: grabbing;
}

.subcategory-name {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

.subcategory-desc {
  font-size: 12px;
  color: #909399;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.action-icon {
  cursor: pointer;
  color: #909399;
  font-size: 16px;
}

.action-icon:hover {
  color: #409eff;
}

.action-icon.danger:hover {
  color: #f56c6c;
}

.empty-tips {
  padding: 40px 0;
  text-align: center;
}
</style>