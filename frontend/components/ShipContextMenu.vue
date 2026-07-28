<template>
  <Teleport to="body">
    <!-- 主菜单 -->
    <div
      v-if="visible"
      ref="menuRef"
      class="ship-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <!-- 表头右键菜单 -->
      <template v-if="type === 'header' && column">
        <!-- 排序 -->
        <div class="menu-section">
          <div class="menu-item" @click="$emit('sortAsc')">
            <span class="icon">↑</span> 升序排列
          </div>
          <div class="menu-item" @click="$emit('sortDesc')">
            <span class="icon">↓</span> 降序排列
          </div>
        </div>

        <div class="menu-divider" />

        <!-- 筛选 -->
        <div class="menu-section">
          <div 
            class="menu-item filter-trigger" 
            @mouseenter="showFilterPanel = true" 
            @mouseleave="startHideFilterPanel"
          >
            <span class="icon">▼</span> 筛选
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="menu-divider" />

        <!-- 清除筛选 -->
        <div class="menu-section">
          <div class="menu-item" @click="$emit('clearFilter')" v-if="hasActiveFilter">
            <span class="icon">✕</span> 清除筛选
          </div>
        </div>

        <div class="menu-divider" />

        <!-- 列宽 -->
        <div class="menu-section">
          <div class="menu-item" @click="$emit('autoFitColumn')">
            <span class="icon"></span> 自动调整列宽
          </div>
        </div>

        <div class="menu-divider" />

        <!-- 冻结列 -->
        <div class="menu-section">
          <div class="menu-item" @click="$emit('fixColumnLeft')">
            <span class="icon">◧</span> 冻结到左侧
          </div>
          <div class="menu-item" @click="$emit('fixColumnRight')">
            <span class="icon">◨</span> 冻结到右侧
          </div>
          <div class="menu-item" @click="$emit('unfixColumn')" v-if="getFixedStatus(column)">
            <span class="icon">◇</span> 取消冻结
          </div>
        </div>

        <div class="menu-divider" />

        <!-- 列显示 -->
        <div class="menu-section">
          <div class="menu-item" @click="$emit('hideCurrentColumn')">
            <span class="icon">🙈</span> 隐藏当前列
          </div>
          <div class="menu-item" @click="$emit('showAllColumns')">
            <span class="icon"></span> 显示所有列
          </div>
          <div class="menu-item" @click="$emit('resetColumns')">
            <span class="icon">↺</span> 重置列设置
          </div>
        </div>
      </template>

      <!-- 行右键菜单 -->
      <template v-if="type === 'row' && row">
        <div class="menu-section">
          <div class="menu-item" @click="$emit('editRow', row)">
            <span class="icon"></span> 编辑本行
          </div>
          <div class="menu-item" @click="$emit('copyRow', row)">
            <span class="icon">☷</span> 复制整行数据
          </div>
          <div class="menu-item" @click="$emit('copyCellValue', row, column)" v-if="column?.property">
            <span class="icon">⊡</span> 复制单元格值
          </div>
        </div>

        <div class="menu-divider" />

        <div class="menu-section">
          <div class="menu-item danger" @click="$emit('deleteRow', row)">
            <span class="icon">✕</span> 删除本行
          </div>
        </div>
      </template>
    </div>

    <!-- 筛选子菜单（独立定位，使用 fixed） -->
    <div
      v-if="visible && type === 'header' && showFilterPanel && column"
      ref="filterMenuRef"
      class="filter-submenu"
      :style="filterMenuStyle"
      @click.stop
      @mouseenter="cancelHideFilterPanel"
      @mouseleave="startHideFilterPanel"
    >
      <div class="filter-header">{{ column.label }}</div>
      <div class="filter-search">
        <el-input
          v-model="filterSearchText"
          placeholder="搜索..."
          size="small"
          clearable
        />
      </div>
      <div class="filter-actions">
        <el-button size="small" text @click="selectAllFilters">全选</el-button>
        <el-button size="small" text @click="clearAllFilters">全不选</el-button>
        <el-button size="small" text type="primary" @click="confirmFilter">确定</el-button>
      </div>
      <div class="filter-list">
        <el-checkbox
          v-for="option in filteredFilterOptions"
          :key="option.value"
          v-model="option.checked"
          :label="option.value"
        >
          {{ option.label || '-' }}
        </el-checkbox>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  type: 'header' | 'row'
  column: any
  row: any
  columnOptions: { value: string; label: string }[]
  visibleColumns: string[]
  fixedColumns: Record<string, 'left' | 'right' | ''>
  allData: any[]
  activeFilters: Record<string, string[]>
}>()

const emit = defineEmits<{
  close: []
  sortAsc: []
  sortDesc: []
  clearFilter: []
  fixColumnLeft: []
  fixColumnRight: []
  unfixColumn: []
  autoFitColumn: []
  hideCurrentColumn: []
  toggleColumnVisibility: [columnValue: string]
  showAllColumns: []
  resetColumns: []
  editRow: [row: any]
  copyRow: [row: any]
  copyCellValue: [row: any, column: any]
  deleteRow: [row: any]
  applyColumnFilter: [prop: string, values: string[]]
}>()

const menuRef = ref<HTMLElement | null>(null)
const filterMenuRef = ref<HTMLElement | null>(null)
const showFilterPanel = ref(false)
const filterSearchText = ref('')
const filterOptions = ref<{ value: string; label: string; checked: boolean }[]>([])
let hideTimer: any = null

const getFixedStatus = (column: any): 'left' | 'right' | '' => {
  if (!column || !column.property) return ''
  return props.fixedColumns[column.property] || ''
}

const hasActiveFilter = computed(() => {
  if (!props.column?.property) return false
  const filters = props.activeFilters[props.column.property]
  return filters && filters.length > 0
})

// 计算筛选子菜单位置
const filterMenuStyle = computed(() => {
  return {
    left: (props.x + 190) + 'px',
    top: props.y + 'px'
  }
})

// 获取当前列的筛选项
const initFilterOptions = () => {
  if (!props.column?.property) return
  
  const values = new Set<string>()
  props.allData.forEach((row: any) => {
    const value = row[props.column.property]
    if (value !== undefined && value !== null && value !== '') {
      values.add(String(value))
    }
  })
  
  const currentFilters = props.activeFilters[props.column.property] || []
  const allSelected = currentFilters.length === 0
  
  filterOptions.value = Array.from(values).map(v => ({
    value: v,
    label: v,
    checked: allSelected || currentFilters.includes(v)
  }))
  
  filterSearchText.value = ''
}

watch(() => props.column?.property, () => {
  initFilterOptions()
})

watch(() => props.visible, (newVal) => {
  if (newVal && props.type === 'header') {
    initFilterOptions()
  } else if (!newVal) {
    showFilterPanel.value = false
  }
})

const filteredFilterOptions = computed(() => {
  if (!filterSearchText.value) return filterOptions.value
  const search = filterSearchText.value.toLowerCase()
  return filterOptions.value.filter(opt => 
    opt.value.toLowerCase().includes(search)
  )
})

const selectAllFilters = () => {
  filterOptions.value.forEach(opt => opt.checked = true)
}

const clearAllFilters = () => {
  filterOptions.value.forEach(opt => opt.checked = false)
}

const confirmFilter = () => {
  if (!props.column?.property) return
  
  const selectedValues = filterOptions.value
    .filter(opt => opt.checked)
    .map(opt => opt.value)
  
  if (selectedValues.length === filterOptions.value.length || selectedValues.length === 0) {
    emit('applyColumnFilter', props.column.property, [])
  } else {
    emit('applyColumnFilter', props.column.property, selectedValues)
  }
  showFilterPanel.value = false
}

const startHideFilterPanel = () => {
  hideTimer = setTimeout(() => {
    showFilterPanel.value = false
  }, 200)
}

const cancelHideFilterPanel = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}
</script>

<style scoped>
.ship-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 6px 0;
  border: 1px solid #e8e8e8;
}

.menu-section {
  padding: 0 6px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  white-space: nowrap;
  position: relative;
}

.menu-item:hover {
  background: #f0f5ff;
  color: #1890ff;
}

.menu-item.danger {
  color: #ff4d4f;
}

.menu-item.danger:hover {
  background: #fff1f0;
  color: #ff4d4f;
}

.menu-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 4px 0;
}

.icon {
  width: 16px;
  text-align: center;
  display: inline-block;
}

.arrow-icon {
  margin-left: auto;
  font-size: 12px;
}

/* 筛选子菜单 */
.filter-submenu {
  position: fixed;
  min-width: 240px;
  max-height: 350px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8e8e8;
  padding: 8px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
}

.filter-header {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  padding: 4px 8px 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.filter-search {
  margin-bottom: 8px;
}

.filter-search :deep(.el-input) {
  width: 100%;
}

.filter-actions {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  justify-content: space-between;
}

.filter-actions .el-button {
  padding: 0 8px;
  font-size: 12px;
}

.filter-list {
  overflow-y: auto;
  max-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filter-list :deep(.el-checkbox) {
  margin: 0;
  padding: 4px 8px;
  border-radius: 4px;
  height: 28px;
}

.filter-list :deep(.el-checkbox:hover) {
  background: #f5f7fa;
}

.filter-list :deep(.el-checkbox__label) {
  font-size: 13px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>