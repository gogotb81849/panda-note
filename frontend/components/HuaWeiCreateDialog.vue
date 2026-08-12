<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="720px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 一句话智能创建输入区 -->
    <div class="smart-create-section">
      <div class="smart-create-title">
        <el-icon><MagicStick /></el-icon>
        一句话智能创建
      </div>
      <div class="smart-create-input-row">
        <el-input
          v-model="smartText"
          placeholder="例如：明天下午3点在4号会议室开会"
          clearable
          @keyup.enter="handleSmartParse"
        />
        <el-button
          type="primary"
          :loading="smartParsing"
          :disabled="!smartText.trim()"
          @click="handleSmartParse"
        >
          智能解析
        </el-button>
      </div>
      <div v-if="smartParsedHint" class="smart-parsed-hint">
        <el-icon><InfoFilled /></el-icon>
        {{ smartParsedHint }}
      </div>
    </div>

    <el-divider content-position="left">或手动填写</el-divider>

    <!-- 表单区 -->
    <el-form :model="form" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="登记日期" required>
            <el-date-picker
              v-model="form.recordDate"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属船舶">
            <el-select v-model="form.shipId" placeholder="选择船舶" clearable style="width: 100%">
              <el-option
                v-for="ship in ships"
                :key="ship.id"
                :label="ship.cnShipName"
                :value="ship.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="一级分类" required>
            <el-select
              v-model="form.firstType"
              placeholder="选择分类"
              style="width: 100%"
              @change="onFirstTypeChange"
            >
              <el-option
                v-for="t in firstTypes"
                :key="t.id"
                :label="t.categoryName"
                :value="t.categoryName"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="二级分类" required>
            <el-select
              v-model="form.secondType"
              placeholder="选择分类"
              style="width: 100%"
              :disabled="!form.firstType"
            >
              <el-option
                v-for="t in filteredSecondTypes"
                :key="t.id"
                :label="t.categoryName"
                :value="t.categoryName"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="优先级">
            <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
              <el-option label="🔴 重要紧急" value="urgent_important" />
              <el-option label="🟡 重要不紧急" value="important" />
              <el-option label="🔵 紧急不重要" value="urgent" />
              <el-option label="🟢 不紧急不重要" value="normal" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="form.finishStatus" placeholder="选择状态" style="width: 100%">
              <el-option label="待处理" value="pending" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="开始时间">
            <el-date-picker
              v-model="form.startTime"
              type="datetime"
              placeholder="选择时间"
              style="width: 100%"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间">
            <el-date-picker
              v-model="form.endTime"
              type="datetime"
              placeholder="选择时间"
              style="width: 100%"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="事件详情">
        <el-input
          v-model="form.eventDetail"
          type="textarea"
          :rows="4"
          placeholder="请输入事件详情..."
        />
      </el-form-item>

      <!-- 提醒设置 -->
      <el-form-item label="提醒">
        <div class="reminder-row">
          <el-checkbox v-model="enableReminder">启用提醒</el-checkbox>
          <template v-if="enableReminder">
            <el-input-number
              v-model="remindBefore"
              :min="1"
              :max="999"
              size="small"
              style="margin-left: 12px; width: 110px"
            />
            <el-select v-model="remindUnit" size="small" style="margin-left: 8px; width: 90px">
              <el-option label="分钟前" value="minute" />
              <el-option label="小时前" value="hour" />
              <el-option label="天前" value="day" />
            </el-select>
            <el-checkbox v-model="isImportant" size="small" style="margin-left: 12px">
              重要提醒
            </el-checkbox>
          </template>
        </div>
      </el-form-item>

      <!-- 重要日标记 -->
      <el-form-item label="重要日">
        <div class="important-row">
          <el-checkbox v-model="markAsImportant">标记为重要日</el-checkbox>
          <template v-if="markAsImportant">
            <el-select
              v-model="importantRepeatType"
              size="small"
              style="margin-left: 12px; width: 120px"
            >
              <el-option label="不重复" value="none" />
              <el-option label="每年重复" value="yearly" />
              <el-option label="每月重复" value="monthly" />
              <el-option label="每周重复" value="weekly" />
            </el-select>
          </template>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MagicStick, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Ship, DictCategory, Priority, Schedule } from '~/types'

interface Props {
  modelValue: boolean
  isEdit?: boolean
  editSchedule?: Schedule | null
  ships: Ship[]
  firstTypes: DictCategory[]
  secondTypes: DictCategory[]
  defaultDate?: string // YYYY-MM-DD
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
  editSchedule: null,
  defaultDate: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
}>()

const api = useApi()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const dialogTitle = computed(() => (props.isEdit ? '编辑日程' : '新建日程'))

const saving = ref(false)
const smartParsing = ref(false)
const smartText = ref('')
const smartParsedHint = ref('')

const enableReminder = ref(false)
const remindBefore = ref(10)
const remindUnit = ref<'minute' | 'hour' | 'day'>('minute')
const isImportant = ref(false)

const markAsImportant = ref(false)
const importantRepeatType = ref<'none' | 'yearly' | 'monthly' | 'weekly'>('none')

const form = ref({
  recordDate: '',
  shipId: undefined as number | undefined,
  firstType: '',
  secondType: '',
  priority: 'normal' as Priority,
  finishStatus: 'pending',
  startTime: '',
  endTime: '',
  eventDetail: '',
})

// 二级分类联动
const filteredSecondTypes = computed(() => {
  if (!form.value.firstType) return []
  const firstTypeItem = props.firstTypes.find(ft => ft.categoryName === form.value.firstType)
  if (!firstTypeItem) return []
  return props.secondTypes.filter(st => st.parentId === firstTypeItem.id)
})

const onFirstTypeChange = () => {
  form.value.secondType = ''
}

// 监听弹窗打开，重置或填充表单
watch(
  () => props.modelValue,
  v => {
    if (!v) return
    smartText.value = ''
    smartParsedHint.value = ''
    enableReminder.value = false
    remindBefore.value = 10
    remindUnit.value = 'minute'
    isImportant.value = false
    markAsImportant.value = false
    importantRepeatType.value = 'none'

    if (props.isEdit && props.editSchedule) {
      const s = props.editSchedule
      form.value = {
        recordDate: s.recordDate ? s.recordDate.split('T')[0] : '',
        shipId: s.shipId ?? undefined,
        firstType: s.firstType || '',
        secondType: s.secondType || '',
        priority: s.priority || 'normal',
        finishStatus: s.finishStatus || 'pending',
        startTime: formatDateTimeForDisplay(s.startTime),
        endTime: formatDateTimeForDisplay(s.endTime),
        eventDetail: s.eventDetail || '',
      }
    } else {
      const today = props.defaultDate || new Date().toISOString().split('T')[0]
      form.value = {
        recordDate: today,
        shipId: undefined,
        firstType: '',
        secondType: '',
        priority: 'normal',
        finishStatus: 'pending',
        startTime: '',
        endTime: '',
        eventDetail: '',
      }
    }
  },
)

function formatDateTimeForDisplay(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return ''
  try {
    const date = new Date(dateTimeStr)
    if (isNaN(date.getTime())) return ''
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
  } catch {
    return ''
  }
}

function formatDateTimeForApi(dateTimeStr: string): string {
  if (!dateTimeStr) return ''
  return dateTimeStr.replace(' ', 'T')
}

// 一句话智能解析
const handleSmartParse = async () => {
  const text = smartText.value.trim()
  if (!text) {
    ElMessage.warning('请输入要解析的内容')
    return
  }
  smartParsing.value = true
  smartParsedHint.value = ''
  try {
    const result: any = await api.schedules.smartParse(text)
    if (!result || !result.matched) {
      smartParsedHint.value = '未能识别出日期/时间，请尝试更明确的表述，如"明天下午3点开会"'
      return
    }
    // 填充表单
    if (result.recordDate) form.value.recordDate = result.recordDate
    if (result.startTime) form.value.startTime = result.startTime
    if (result.endTime) form.value.endTime = result.endTime
    if (result.eventDetail) form.value.eventDetail = result.eventDetail

    const parts: string[] = []
    if (result.recordDate) parts.push(`日期：${result.recordDate}`)
    if (result.startTime) parts.push(`开始：${result.startTime}`)
    if (result.endTime) parts.push(`结束：${result.endTime}`)
    if (result.eventDetail) parts.push(`事件：${result.eventDetail}`)
    smartParsedHint.value = `已解析并填入表单 → ${parts.join('，')}`
    ElMessage.success('智能解析成功，请补充分类后保存')
  } catch (err: any) {
    ElMessage.error('智能解析失败：' + (err?.message || '未知错误'))
  } finally {
    smartParsing.value = false
  }
}

const handleSave = async () => {
  if (!form.value.firstType || !form.value.secondType) {
    ElMessage.warning('请填写必填项（一级分类、二级分类）')
    return
  }
  if (!form.value.recordDate) {
    ElMessage.warning('请选择登记日期')
    return
  }

  const dataToSave: any = {
    ...form.value,
    startTime: form.value.startTime ? formatDateTimeForApi(form.value.startTime) : null,
    endTime: form.value.endTime ? formatDateTimeForApi(form.value.endTime) : null,
  }

  saving.value = true
  try {
    let savedScheduleId: number | null = null
    if (props.isEdit && props.editSchedule) {
      await api.schedules.update(props.editSchedule.id, dataToSave)
      savedScheduleId = props.editSchedule.id
      ElMessage.success('更新成功')
    } else {
      const created: any = await api.schedules.create(dataToSave)
      savedScheduleId = created?.id ?? null
      ElMessage.success('创建成功')
    }

    // 提醒设置
    if (enableReminder.value && savedScheduleId) {
      try {
        await api.scheduleReminders.create({
          scheduleId: savedScheduleId,
          remindBefore: remindBefore.value,
          remindUnit: remindUnit.value,
          isImportant: isImportant.value,
        })
      } catch (err) {
        // 提醒创建失败不阻断主流程
        console.warn('提醒创建失败', err)
      }
    }

    // 重要日标记
    if (markAsImportant.value) {
      try {
        await api.importantDates.create({
          name: form.value.eventDetail || form.value.secondType || '重要日',
          date: form.value.recordDate,
          repeatType: importantRepeatType.value,
          description: form.value.eventDetail || '',
        })
      } catch (err) {
        console.warn('重要日创建失败', err)
      }
    }

    visible.value = false
    emit('saved')
  } catch (err: any) {
    ElMessage.error('保存失败：' + (err?.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  smartText.value = ''
  smartParsedHint.value = ''
}
</script>

<style scoped>
.smart-create-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #ecf5ff 100%);
  border: 1px solid #d9ecff;
  border-radius: 8px;
  padding: 12px 16px;
}

.smart-create-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.smart-create-input-row {
  display: flex;
  gap: 8px;
}

.smart-parsed-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-success);
}

.reminder-row,
.important-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}
</style>
