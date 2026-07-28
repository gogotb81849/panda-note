<template>
  <div class="menu-config-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">菜单权限配置</h2>
        <p class="page-subtitle">配置各角色在左侧导航栏中可见的菜单项</p>
      </div>
      <div class="header-actions">
        <el-button @click="seedDefaults" :loading="seeding">恢复默认配置</el-button>
        <el-button type="primary" @click="saveAll" :loading="saving">保存全部</el-button>
      </div>
    </div>

    <!-- 角色选择标签 -->
    <el-tabs v-model="activeRole" @tab-change="onRoleChange">
      <el-tab-pane
        v-for="(label, role) in roleLabels"
        :key="role"
        :label="label"
        :name="role"
      />
    </el-tabs>

    <!-- 菜单配置表格 -->
    <div class="menu-table-container">
      <el-table :data="menuList" style="width: 100%" v-loading="loading" border stripe>
        <el-table-column prop="menuKey" label="路由路径" width="180">
          <template #default="{ row }">
            <code class="route-path">{{ row.menuKey }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="菜单名称" width="160" />
        <el-table-column prop="icon" label="图标" width="120">
          <template #default="{ row }">
            <span class="icon-name">{{ row.icon }}</span>
          </template>
        </el-table-column>
        <el-table-column label="可见性" width="120" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.enabled"
              active-color="#13ce66"
              inactive-color="#ff4949"
              @change="onToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.changed" type="warning" size="small">已修改</el-tag>
            <el-tag v-else type="success" size="small">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="120" align="center">
          <template #default="{ row }">
            <el-input-number
              v-model="row.sortOrder"
              :min="0"
              :max="99"
              size="small"
              controls-position="right"
              @change="onToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">
            <span class="menu-desc">{{ getMenuDescription(row.menuKey) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 模块功能配置（工作台组件可见性） -->
    <div class="module-section">
      <h3 class="section-title">工作台模块可见性</h3>
      <p class="section-desc">控制各角色在工作台首页看到的组件模块</p>

      <el-table :data="moduleList" style="width: 100%" border stripe>
        <el-table-column prop="moduleKey" label="模块标识" width="180">
          <template #default="{ row }">
            <code class="route-path">{{ row.moduleKey }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="模块名称" width="160" />
        <el-table-column label="可见性" width="120" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.enabled"
              active-color="#13ce66"
              inactive-color="#ff4949"
              @change="onToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.changed" type="warning" size="small">已修改</el-tag>
            <el-tag v-else type="success" size="small">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">
            <span class="menu-desc">{{ row.description }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: 'auth',
})

const api = useApi()

// 角色标签
const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  company_admin: '油轮船管部',
  general_manager: '总管团队',
  shore_crew_supervisor: '岸基船工主管',
  shore_marine_supervisor: '岸基海务主管',
  shore_engineer_supervisor: '岸基机务主管',
  shore_electric_supervisor: '岸基电气主管',
  ship_political_instructor: '船舶政委',
}

const activeRole = ref('ship_political_instructor')
const loading = ref(false)
const saving = ref(false)
const seeding = ref(false)

// 菜单列表
const menuList = reactive<Array<{ menuKey: string; label: string; icon: string; enabled: boolean; sortOrder: number; changed: boolean; _original: boolean }>>([])

// 模块列表（工作台组件可见性）
const moduleList = reactive<Array<{ moduleKey: string; label: string; description: string; enabled: boolean; changed: boolean; _original: boolean }>>([])

// 角色对应的默认模块可见性
const defaultModules: Record<string, string[]> = {
  admin: ['flipboard', 'publish'],
  shore_crew_supervisor: ['flipboard', 'publish'],
  ship_political_instructor: [],
  shore_marine_supervisor: [],
  shore_engineer_supervisor: [],
  shore_electric_supervisor: [],
  general_manager: [],
  company_admin: [],
}

// 所有可用模块
const allModules = [
  { moduleKey: 'flipboard', label: '船舶动态看板', description: '显示所有船舶的实时动态状态（仅岸基主管可见）' },
  { moduleKey: 'publish', label: '发布模板管理', description: '任务发布模板管理入口（仅船工主管可见）' },
]

const getMenuDescription = (menuKey: string): string => {
  const descriptions: Record<string, string> = {
    '/': '工作台首页',
    '/publish-v2': '创建和管理任务发布（收集表、拍照打卡等）',
    '/dashboard': '船舶任务数据看板（仅岸基主管）',
    '/diary': '航海/船管日记',
    '/schedule': '日程和工作安排管理',
    '/tasks': '工作任务管理',
    '/gantt': '任务甘特图视图',
    '/crew-list': '船员信息管理',
    '/staff-assignments': '人员派任管理',
    '/sop-flow': '标准操作流程',
    '/public-case': '公共案例知识库',
    '/experiences': '经验分享社区',
    '/files': '共享文件管理',
    '/ai-report': 'AI智能简报',
    '/port-check': '抵港前检查',
    '/staff-history': '人员任职履历',
    '/party-activities': '党建活动管理（三会一课）',
    '/thought-reports': '船员思想动态报告',
    '/integrity-records': '廉洁监督台账',
    '/officer-profiles': '政委履职档案',
    '/admin': '系统管理后台',
  }
  return descriptions[menuKey] || ''
}

// 加载菜单配置
const loadMenus = async () => {
  loading.value = true
  try {
    const data = await api.menuConfig.getAllRoleMenus()
    const roleMenus = data[activeRole.value] || []
    menuList.length = 0
    menuList.push(...roleMenus.map((m: any) => ({
      ...m,
      changed: false,
      _original: m.enabled,
    })))

    // 加载模块可见性
    const enabledModules = defaultModules[activeRole.value] || []
    moduleList.length = 0
    moduleList.push(...allModules.map(m => ({
      ...m,
      enabled: enabledModules.includes(m.moduleKey),
      changed: false,
      _original: enabledModules.includes(m.moduleKey),
    })))
  } catch (error) {
    console.error('加载菜单配置失败', error)
    ElMessage.error('加载菜单配置失败')
  } finally {
    loading.value = false
  }
}

const onRoleChange = () => {
  loadMenus()
}

const onToggle = (row: any) => {
  row.changed = row.enabled !== row._original
}

// 保存当前角色的菜单配置
const saveAll = async () => {
  saving.value = true
  try {
    const menus = menuList.map(m => ({
      menuKey: m.menuKey,
      enabled: m.enabled,
      sortOrder: m.sortOrder,
    }))
    await api.menuConfig.updateRoleMenus(activeRole.value, menus)
    ElMessage.success(`「${roleLabels[activeRole.value]}」菜单配置已保存`)

    // 更新原始状态
    menuList.forEach(m => {
      m._original = m.enabled
      m.changed = false
    })
    moduleList.forEach(m => {
      m._original = m.enabled
      m.changed = false
    })
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 恢复默认配置
const seedDefaults = async () => {
  seeding.value = true
  try {
    await api.menuConfig.seedDefaultMenus()
    ElMessage.success('已恢复默认菜单配置')
    await loadMenus()
  } catch (error) {
    console.error('恢复默认配置失败', error)
    ElMessage.error('恢复失败，请重试')
  } finally {
    seeding.value = false
  }
}

onMounted(() => {
  loadMenus()
})
</script>

<style scoped>
.menu-config-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.menu-table-container {
  margin-bottom: 32px;
}

.route-path {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
}

.icon-name {
  color: #999;
  font-size: 13px;
}

.menu-desc {
  font-size: 13px;
  color: #999;
}

.module-section {
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.section-desc {
  font-size: 14px;
  color: #999;
  margin: 0 0 16px;
}
</style>