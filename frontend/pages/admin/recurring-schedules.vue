<template>
  <div class="recurring-schedule-page">
    <div class="page-header">
      <h1>定期任务管理</h1>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建定期任务
      </el-button>
    </div>

    <el-table :data="templates" v-loading="loading" stripe>
      <el-table-column prop="templateName" label="模板名称" min-width="150" />
      <el-table-column prop="firstType" label="一级分类" width="120" />
      <el-table-column prop="secondType" label="二级分类" width="120" />
      <el-table-column label="执行频率" width="120">
        <template #default="{ row }">
          <el-tag :type="getFrequencyTagType(row.frequency)">
            {{ getFrequencyLabel(row.frequency) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行时间" width="100">
        <template #default="{ row }">
          {{ formatExecuteTime(row) }}
        </template>
      </el-table-column>
      <el-table-column prop="ship.cnShipName" label="指定船舶" width="120">
        <template #default="{ row }">
          {{ row.ship?.cnShipName || '所有船舶' }}
        </template>
      </el-table-column>
      <el-table-column prop="assignedTo.realName" label="负责人" width="100">
        <template #default="{ row }">
          {{ row.assignedTo?.realName || '未指定' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="下次执行" width="160">
        <template #default="{ row }">
          {{ row.nextExecuteAt ? formatDate(row.nextExecuteAt) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="editTemplate(row)">编辑</el-button>
          <el-button size="small" :type="row.isActive ? 'danger' : 'success'" @click="toggleStatus(row)">
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" type="danger" @click="deleteTemplate(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑定期任务' : '新建定期任务'"
      width="600px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="form.templateName" placeholder="如：周一安全例会" />
        </el-form-item>
        <el-form-item label="一级分类" required>
          <el-select v-model="form.firstType" placeholder="选择一级分类" style="width: 100%">
            <el-option
              v-for="type in firstTypes"
              :key="type.id"
              :label="type.categoryName"
              :value="type.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="二级分类" required>
          <el-select v-model="form.secondType" placeholder="选择二级分类" style="width: 100%">
            <el-option
              v-for="type in filteredSecondTypes"
              :key="type.id"
              :label="type.categoryName"
              :value="type.categoryName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="任务详情">
          <el-input
            v-model="form.eventDetail"
            type="textarea"
            :rows="3"
            placeholder="输入任务详情（可选）"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option label="普通" value="normal" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行频率" required>
          <el-select v-model="form.frequency" style="width: 100%">
            <el-option label="每天" value="daily" />
            <el-option label="每周" value="weekly" />
            <el-option label="每月" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.frequency === 'weekly'" label="星期" required>
          <el-select v-model="form.dayOfWeek" style="width: 100%">
            <el-option label="周日" :value="0" />
            <el-option label="周一" :value="1" />
            <el-option label="周二" :value="2" />
            <el-option label="周三" :value="3" />
            <el-option label="周四" :value="4" />
            <el-option label="周五" :value="5" />
            <el-option label="周六" :value="6" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.frequency === 'monthly'" label="日期" required>
          <el-input-number v-model="form.dayOfMonth" :min="1" :max="31" style="width: 100%" />
        </el-form-item>
        <el-form-item label="执行时间" required>
          <el-time-picker
            v-model="form.executeTime"
            format="HH:mm"
            value-format="HH:mm"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="指定船舶">
          <el-select v-model="form.shipId" placeholder="不选则应用于所有船舶" clearable style="width: 100%">
            <el-option
              v-for="ship in ships"
              :key="ship.id"
              :label="ship.cnShipName"
              :value="ship.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="form.assignedToId" placeholder="不选则不指定负责人" clearable style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="user.realName"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Ship, DictCategory } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)

const templates = ref<any[]>([])
const ships = ref<Ship[]>([])
const users = ref<any[]>([])
const firstTypes = ref<DictCategory[]>([])
const secondTypes = ref<DictCategory[]>([])

const form = ref({
  templateName: '',
  firstType: '',
  secondType: '',
  eventDetail: '',
  priority: 'normal',
  frequency: 'weekly',
  dayOfWeek: 1,
  dayOfMonth: 1,
  executeTime: '09:00',
  shipId: null as number | null,
  assignedToId: null as number | null,
  isActive: true,
})

const filteredSecondTypes = computed(() => {
  if (!form.value.firstType) return secondTypes.value
  return secondTypes.value.filter(s => s.parent?.categoryName === form.value.firstType)
})

const loadTemplates = async () => {
  loading.value = true
  try {
    const response = await api.recurringSchedules.getAll()
    templates.value = response.data || response
  } catch (error) {
    ElMessage.error('加载定期任务失败')
  } finally {
    loading.value = false
  }
}

const loadShips = async () => {
  try {
    const response = await api.ships.getAll()
    ships.value = response.data || response
  } catch (error) {
    console.error('加载船舶失败', error)
  }
}

const loadUsers = async () => {
  try {
    const response = await api.users.getAll()
    users.value = response.data || response
  } catch (error) {
    console.error('加载用户失败', error)
  }
}

const loadCategories = async () => {
  try {
    const firstResponse = await api.dict.getFirstTypes()
    firstTypes.value = firstResponse.data || firstResponse

    const secondResponse = await api.dict.getSecondTypes()
    secondTypes.value = secondResponse.data || secondResponse
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  editingId.value = null
  form.value = {
    templateName: '',
    firstType: '',
    secondType: '',
    eventDetail: '',
    priority: 'normal',
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    executeTime: '09:00',
    shipId: null,
    assignedToId: null,
    isActive: true,
  }
  dialogVisible.value = true
}

const editTemplate = (template: any) => {
  isEdit.value = true
  editingId.value = template.id
  form.value = {
    templateName: template.templateName,
    firstType: template.firstType,
    secondType: template.secondType,
    eventDetail: template.eventDetail || '',
    priority: template.priority,
    frequency: template.frequency,
    dayOfWeek: template.dayOfWeek || 1,
    dayOfMonth: template.dayOfMonth || 1,
    executeTime: template.executeTime,
    shipId: template.shipId,
    assignedToId: template.assignedToId,
    isActive: template.isActive,
  }
  dialogVisible.value = true
}

const saveTemplate = async () => {
  if (!form.value.templateName || !form.value.firstType || !form.value.secondType) {
    ElMessage.warning('请填写必填项')
    return
  }

  saving.value = true
  try {
    if (isEdit.value && editingId.value) {
      await api.recurringSchedules.update(editingId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await api.recurringSchedules.create(form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadTemplates()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (template: any) => {
  try {
    await api.recurringSchedules.update(template.id, {
      isActive: !template.isActive,
    })
    ElMessage.success(template.isActive ? '已禁用' : '已启用')
    loadTemplates()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const deleteTemplate = async (template: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个定期任务吗？', '确认删除', {
      type: 'warning',
    })
    await api.recurringSchedules.delete(template.id)
    ElMessage.success('删除成功')
    loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const getFrequencyLabel = (frequency: string) => {
  const labels: Record<string, string> = {
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
  }
  return labels[frequency] || frequency
}

const getFrequencyTagType = (frequency: string) => {
  const types: Record<string, string> = {
    daily: 'danger',
    weekly: 'warning',
    monthly: 'info',
  }
  return types[frequency] || ''
}

const formatExecuteTime = (template: any) => {
  if (template.frequency === 'weekly') {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${days[template.dayOfWeek]} ${template.executeTime}`
  }
  if (template.frequency === 'monthly') {
    return `${template.dayOfMonth}号 ${template.executeTime}`
  }
  return template.executeTime
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadTemplates()
  loadShips()
  loadUsers()
  loadCategories()
})
</script>

<style scoped>
.recurring-schedule-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>
