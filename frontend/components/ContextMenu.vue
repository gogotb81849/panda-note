<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="fixed z-[3000] min-w-[160px] rounded-lg bg-white border border-gray-200 shadow-lg py-1"
      :style="menuPosition"
      @click.stop
    >
      <template v-for="(item, index) in items" :key="index">
        <!-- 分隔线 -->
        <div v-if="item.divider" class="h-px bg-gray-200 my-1" />

        <!-- 普通菜单项 -->
        <div
          v-else
          class="context-menu-item relative px-3 py-1.5 text-sm cursor-pointer transition-colors duration-150 flex items-center gap-2"
          :class="{
            'text-gray-400 cursor-not-allowed': item.disabled,
            'hover:bg-gray-100': !item.disabled,
          }"
          @mouseenter="!item.disabled && handleMouseEnter(index)"
          @mouseleave="handleMouseLeave(index)"
          @click="!item.disabled && handleItemClick(item)"
        >
          <!-- 图标 -->
          <el-icon v-if="item.icon" class="w-4 h-4 flex-shrink-0">
            <component :is="item.icon" />
          </el-icon>

          <!-- 文本 -->
          <span class="flex-1">{{ item.label }}</span>

          <!-- 快捷键提示 -->
          <span v-if="item.shortcut" class="text-xs text-gray-400 ml-4">
            {{ item.shortcut }}
          </span>

          <!-- 子菜单箭头 -->
          <el-icon
            v-if="item.children?.length"
            class="w-3 h-3 ml-2 text-gray-400 flex-shrink-0"
          >
            <ArrowRight />
          </el-icon>
        </div>

        <!-- 子菜单 -->
        <div
          v-if="item.children?.length && activeSubmenu === index"
          ref="submenuRefs"
          class="fixed z-[3001] min-w-[160px] rounded-lg bg-white border border-gray-200 shadow-lg py-1"
          :style="getSubmenuPosition(index)"
          @mouseenter="handleSubmenuEnter(index)"
          @mouseleave="handleSubmenuLeave(index)"
        >
          <template v-for="(child, childIndex) in item.children" :key="`${index}-${childIndex}`">
            <!-- 子菜单分隔线 -->
            <div v-if="child.divider" class="h-px bg-gray-200 my-1" />

            <!-- 子菜单项 -->
            <div
              v-else
              class="context-menu-item px-3 py-1.5 text-sm cursor-pointer transition-colors duration-150 flex items-center gap-2 hover:bg-gray-100"
              :class="{
                'text-gray-400 cursor-not-allowed': child.disabled,
                'hover:bg-gray-100': !child.disabled,
              }"
              @click="!child.disabled && handleSubItemClick(item, child)"
            >
              <el-icon v-if="child.icon" class="w-4 h-4 flex-shrink-0">
                <component :is="child.icon" />
              </el-icon>
              <span class="flex-1">{{ child.label }}</span>
            </div>
          </template>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'

// 菜单项接口
export interface MenuItem {
  label?: string
  icon?: string
  disabled?: boolean
  divider?: boolean
  shortcut?: string
  children?: MenuItem[]
  action?: () => void
  [key: string]: any
}

// Props
const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: MenuItem[]
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// 状态
const menuRef = ref<HTMLElement | null>(null)
const submenuRefs = ref<HTMLElement[]>([])
const activeSubmenu = ref<number | null>(null)
const closeTimer = ref<number | null>(null)

// 菜单位置样式 - 使用响应式ref替代computed避免DOM时机问题
const menuPosition = ref<{ left: string; top: string }>({
  left: `${props.x}px`,
  top: `${props.y}px`,
})

const submenuPositions = ref<Record<number, { left: string; top: string }>>({})

// 计算边界调整后的位置
const calculatePosition = (x: number, y: number, width: number, height: number) => {
  let adjustedX = x
  let adjustedY = y
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (adjustedX + width > viewportWidth) {
    adjustedX = viewportWidth - width - 8
  }
  if (adjustedY + height > viewportHeight) {
    adjustedY = viewportHeight - height - 8
  }
  adjustedX = Math.max(8, adjustedX)
  adjustedY = Math.max(8, adjustedY)

  return { left: `${adjustedX}px`, top: `${adjustedY}px` }
}

// 获取子菜单位置
const getSubmenuPosition = (index: number) => {
  return submenuPositions.value[index] || { left: '0', top: '0' }
}

// 监听 visible 变化，计算菜单位置
watch(() => props.visible, async (val) => {
  if (val) {
    // 初始位置使用props
    menuPosition.value = { left: `${props.x}px`, top: `${props.y}px` }
    // 等待DOM渲染后计算边界
    await nextTick()
    if (menuRef.value) {
      const menuWidth = menuRef.value.offsetWidth || 160
      const menuHeight = menuRef.value.offsetHeight || 0
      menuPosition.value = calculatePosition(props.x, props.y, menuWidth, menuHeight)
    }
  } else {
    activeSubmenu.value = null
    submenuPositions.value = {}
  }
})

// 监听 activeSubmenu 变化，计算子菜单位置
watch(activeSubmenu, async (val) => {
  if (val !== null) {
    await nextTick()
    const menuItem = document.querySelectorAll('.context-menu-item')[val]
    if (menuItem) {
      const rect = menuItem.getBoundingClientRect()
      let left = rect.right + 4
      let top = rect.top

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const submenuWidth = 160
      const submenuHeight = 100

      if (left + submenuWidth > viewportWidth) {
        left = rect.left - submenuWidth - 4
      }
      if (top + submenuHeight > viewportHeight) {
        top = viewportHeight - submenuHeight - 8
      }
      top = Math.max(8, top)

      submenuPositions.value[val] = { left: `${left}px`, top: `${top}px` }
    }
  } else {
    submenuPositions.value = {}
  }
})

// 清除关闭定时器
const clearCloseTimer = () => {
  if (closeTimer.value) {
    clearTimeout(closeTimer.value)
    closeTimer.value = null
  }
}

// 处理鼠标进入菜单项
const handleMouseEnter = (index: number) => {
  clearCloseTimer()
  const item = props.items[index]
  if (item?.children?.length) {
    activeSubmenu.value = index
  } else {
    activeSubmenu.value = null
  }
}

// 处理鼠标离开菜单项
const handleMouseLeave = (_index: number) => {
  // 延迟关闭，给子菜单留出时间
  closeTimer.value = window.setTimeout(() => {
    activeSubmenu.value = null
  }, 200)
}

// 子菜单 mouseenter - 阻止关闭
const handleSubmenuEnter = (_index: number) => {
  clearCloseTimer()
}

// 子菜单 mouseleave
const handleSubmenuLeave = (_index: number) => {
  closeTimer.value = window.setTimeout(() => {
    activeSubmenu.value = null
  }, 200)
}

// 点击菜单项
const handleItemClick = (item: MenuItem) => {
  if (item.children?.length) return
  if (item.action) {
    item.action()
  }
  emit('close')
}

// 点击子菜单项
const handleSubItemClick = (_parentItem: MenuItem, child: MenuItem) => {
  if (child.action) {
    child.action()
  }
  emit('close')
}

// 点击外部关闭
const handleGlobalClick = (e: MouseEvent) => {
  if (!props.visible) return
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    // 检查是否在子菜单内
    const isSubmenu = submenuRefs.value.some((el) => el && el.contains(e.target as Node))
    if (!isSubmenu) {
      emit('close')
    }
  }
}

// ESC 键关闭
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.visible) {
    emit('close')
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('mousedown', handleGlobalClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleGlobalClick)
  document.removeEventListener('keydown', handleKeydown)
  clearCloseTimer()
})
</script>
