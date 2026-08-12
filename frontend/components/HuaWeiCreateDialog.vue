<template>
  <el-dialog
    v-model="visible"
    :title="null"
    width="760px"
    :close-on-click-modal="false"
    custom-class="hw-create-dialog"
    @close="handleClose"
  >
    <!-- 自定义 Header：Tab 切换（日程 / 重要日） -->
    <template #header>
      <div class="hw-dialog-header">
        <div class="hw-tabs">
          <div
            class="hw-tab"
            :class="{ active: createMode === 'schedule' }"
            @click="createMode = 'schedule'"
          >日程</div>
          <div
            class="hw-tab"
            :class="{ active: createMode === 'important' }"
            @click="createMode = 'important'"
          >重要日</div>
        </div>
        <div class="hw-title-text">{{ dialogTitle }}</div>
      </div>
    </template>

    <!-- ========== 一句话智能创建（日程 Tab 时才显示） ========== -->
    <div v-if="createMode === 'schedule'" class="smart-create-section">
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

    <el-divider v-if="createMode === 'schedule'" content-position="left">详情</el-divider>

    <!-- ========== 表单区（分 Tab） ========== -->
    <el-form :model="form" label-width="90px" label-position="right" class="hw-form">

      <!-- ========== 重要日 Tab 专属表单 ========== -->
      <template v-if="createMode === 'important'">
        <el-form-item label="名称" required>
          <el-input v-model="importantForm.name" placeholder="如：结婚纪念日、生日" maxlength="30" show-word-limit />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="日期" required>
              <el-date-picker
                v-model="importantForm.date"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="重复">
              <el-select v-model="importantForm.repeatType" style="width: 100%">
                <el-option label="不重复" value="none" />
                <el-option label="每年重复" value="yearly" />
                <el-option label="每月重复" value="monthly" />
                <el-option label="每周重复" value="weekly" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地点">
          <el-input v-model="form.location" placeholder="地点 / 位置（可选）">
            <template #prefix>
              <el-icon><Location /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="importantForm.description" type="textarea" :rows="3" placeholder="备注（可选）" />
        </el-form-item>

        <!-- 重要日也能加提醒 -->
        <el-divider>提醒</el-divider>
        <el-form-item label="提醒">
          <ReminderChips v-model="reminders" />
        </el-form-item>
      </template>

      <!-- ========== 日程 Tab 专属表单 ========== -->
      <template v-else>
        <!-- 登记日期 + 全天开关 + 地点 -->
        <el-row :gutter="16">
          <el-col :span="9">
            <el-form-item label="登记日期" required>
              <el-date-picker
                v-model="form.recordDate"
                :type="form.allDay ? 'date' : 'date'"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="7">
            <el-form-item label="全天">
              <el-switch
                v-model="form.allDay"
                active-text="是"
                inactive-text="否"
                inline-prompt
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="地点">
              <el-input v-model="form.location" placeholder="地点 / 位置">
                <template #prefix>
                  <el-icon><Location /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 开始/结束时间（全天时切换为"日期选择"） -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                :type="form.allDay ? 'date' : 'datetime'"
                :placeholder="form.allDay ? '日期' : '日期时间'"
                style="width: 100%"
                :value-format="form.allDay ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                :type="form.allDay ? 'date' : 'datetime'"
                :placeholder="form.allDay ? '日期' : '日期时间'"
                style="width: 100%"
                :value-format="form.allDay ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 所属船舶 + 优先级 + 状态 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属船舶">
              <el-select v-model="form.shipId" placeholder="选择船舶（可选）" clearable style="width: 100%">
                <el-option
                  v-for="ship in ships"
                  :key="ship.id"
                  :label="ship.cnShipName"
                  :value="ship.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="优先级">
              <el-select v-model="form.priority" placeholder="优先级" style="width: 100%">
                <el-option label="🔴 重要紧急" value="urgent_important" />
                <el-option label="🟡 重要不紧急" value="important" />
                <el-option label="🔵 紧急不重要" value="urgent" />
                <el-option label="🟢 不紧急不重要" value="normal" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="状态">
              <el-select v-model="form.finishStatus" placeholder="状态" style="width: 100%">
                <el-option label="待处理" value="pending" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 一二级分类 -->
        <el-row :gutter="16">
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

        <!-- 事件详情 -->
        <el-form-item label="事件详情">
          <el-input
            v-model="form.eventDetail"
            type="textarea"
            :rows="3"
            placeholder="请输入事件详情..."
          />
        </el-form-item>

        <!-- 附件（华为风 +号添加附件 占位） -->
        <el-form-item label="附件">
          <div class="attachment-row">
            <div
              v-for="(file, idx) in attachments"
              :key="idx"
              class="attachment-chip"
            >
              <el-icon><Paperclip /></el-icon>
              <span class="at-name">{{ file.name }}</span>
              <el-button text size="small" type="danger" @click="attachments.splice(idx, 1)">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <el-button size="small" plain type="primary" @click="dummyAddAttachment">
              <el-icon><Plus /></el-icon>
              添加附件
            </el-button>
            <span class="at-hint">（待对接真实文件上传）</span>
          </div>
        </el-form-item>

        <!-- 华为风格提醒条 -->
        <el-divider>提醒</el-divider>
        <el-form-item label="提醒">
          <ReminderChips v-model="reminders" />
        </el-form-item>

        <!-- 重要日联动（日程底部快速标记） -->
        <el-divider>其它</el-divider>
        <el-form-item label="其它">
          <div class="important-row">
            <el-checkbox v-model="markAsImportant">
              <span style="color:#e6a23c">★</span> 同步创建为重要日
            </el-checkbox>
            <el-select
              v-if="markAsImportant"
              v-model="importantRepeatType"
              size="small"
              style="margin-left: 16px; width: 120px"
            >
              <el-option label="不重复" value="none" />
              <el-option label="每年重复" value="yearly" />
              <el-option label="每月重复" value="monthly" />
              <el-option label="每周重复" value="weekly" />
            </el-select>
          </div>
        </el-form-item>
      </template>
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
import { ref, computed, watch, defineComponent, h } from 'vue'
import { MagicStick, InfoFilled, Location, Paperclip, Close, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Ship, DictCategory, Priority, Schedule } from '~/types'

/* =========================================
 * 内部子组件：华为风「提醒条 chips」
 * 预设 + 自定义 + ×删除 + 添加提醒链接
 * ========================================= */
interface ReminderItem {
  before: number
  unit: 'minute' | 'hour' | 'day'
  isImportant?: boolean
}
const reminderPresets: { label: string; value: ReminderItem }[] = [
  { label: '5分钟前',  value: { before: 5,  unit: 'minute' } },
  { label: '10分钟前', value: { before: 10, unit: 'minute' } },
  { label: '15分钟前', value: { before: 15, unit: 'minute' } },
  { label: '30分钟前', value: { before: 30, unit: 'minute' } },
  { label: '1小时前',  value: { before: 1,  unit: 'hour' } },
  { label: '1天前',    value: { before: 1,  unit: 'day' } },
  { label: '3天前',    value: { before: 3,  unit: 'day' } },
]
function reminderToLabel(r: ReminderItem): string {
  const unitLabel = r.unit === 'minute' ? '分钟前' : r.unit === 'hour' ? '小时前' : '天前'
  return `${r.before}${unitLabel}`
}
function sameReminder(a: ReminderItem, b: ReminderItem) {
  return a.before === b.before && a.unit === b.unit
}

const ReminderChips = defineComponent({
  name: 'ReminderChips',
  props: { modelValue: { type: Array as () => ReminderItem[], required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const list = computed<ReminderItem[]>({
      get: () => props.modelValue ?? [],
      set: v => emit('update:modelValue', v),
    })
    const addReminder = (r: ReminderItem) => {
      if (!r.before) return
      if (list.value.some(x => sameReminder(x, r))) return
      list.value = [...list.value, r]
    }
    const removeAt = (idx: number) => {
      list.value = list.value.filter((_, i) => i !== idx)
    }
    return () => h('div', { class: 'hw-reminder-wrap' }, [
      // 已添加的 reminders
      ...list.value.map((r, idx) => h('div', { class: 'hw-reminder-chip', key: idx }, [
        h('span', { class: 'hrc-text' }, reminderToLabel(r)),
        h('span', {
          class: 'hrc-close',
          onClick: () => removeAt(idx),
        }, '×'),
      ])),
      // 添加提醒 下拉按钮
      h('el-dropdown', {
        trigger: 'click',
        onCommand: (cmd: string) => {
          if (cmd === 'custom') {
            const next = list.value.length > 0
              ? { before: (list.value[list.value.length - 1].before) + 10, unit: 'minute' as const }
              : { before: 10, unit: 'minute' as const }
            addReminder(next)
          } else {
            const preset = reminderPresets.find(p => p.label === cmd)
            if (preset) addReminder(preset.value)
          }
        },
      }, {
        default: () => h('el-button', { type: 'primary', link: true, size: 'small' }, () => [h(Plus, { size: 12 }), ' 添加提醒']),
        dropdown: () => h('el-dropdown-menu', null, [
          ...reminderPresets.map(p => h('el-dropdown-item', { command: p.label, key: p.label }, () => p.label)),
          h('el-dropdown-item', { command: 'custom', divided: true, key: 'custom' }, () => '自定义（递增）'),
        ]),
      }),
    ])
  },
})

/* =========================================
 * 主组件
 * ========================================= */
interface Props {
  modelValue: boolean
  isEdit?: boolean
  editSchedule?: Schedule | null
  ships: Ship[]
  firstTypes: DictCategory[]
  secondTypes: DictCategory[]
  defaultDate?: string
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

type CreateMode = 'schedule' | 'important'
const createMode = ref<CreateMode>('schedule')

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const dialogTitle = computed(() => {
  if (createMode.value === 'important') return props.isEdit ? '编辑重要日' : '新建重要日'
  return props.isEdit ? '编辑日程' : '新建日程'
})

const saving = ref(false)
const smartParsing = ref(false)
const smartText = ref('')
const smartParsedHint = ref('')

// 提醒 chips 数组（新）
const reminders = ref<ReminderItem[]>([])

const markAsImportant = ref(false)
const importantRepeatType = ref<'none' | 'yearly' | 'monthly' | 'weekly'>('none')

// 附件（新，仅本地占位）
const attachments = ref<{ name: string; size?: string }[]>([])
const dummyAddAttachment = () => {
  const candidates = ['会议纪要.pdf', '现场图片.jpg', '任务说明.docx']
  attachments.value.push({
    name: candidates[attachments.value.length % candidates.length],
    size: ((Math.random() * 2 + 0.1)).toFixed(1) + ' MB',
  })
}

// 日程表单（新增 location, allDay）
const form = ref({
  recordDate: '',
  allDay: false,
  location: '',
  shipId: undefined as number | undefined,
  firstType: '',
  secondType: '',
  priority: 'normal' as Priority,
  finishStatus: 'pending',
  startTime: '',
  endTime: '',
  eventDetail: '',
})

// 重要日表单（独立）
const importantForm = ref({
  name: '',
  date: '',
  repeatType: 'none' as 'none' | 'yearly' | 'monthly' | 'weekly',
  description: '',
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

// 监听弹窗打开
watch(
  () => props.modelValue,
  v => {
    if (!v) return
    smartText.value = ''
    smartParsedHint.value = ''
    reminders.value = []
    markAsImportant.value = false
    importantRepeatType.value = 'none'
    attachments.value = []

    if (props.isEdit && props.editSchedule) {
      // 编辑模式 → 默认切到日程
      createMode.value = 'schedule'
      const s = props.editSchedule
      form.value = {
        recordDate: s.recordDate ? s.recordDate.split('T')[0] : '',
        allDay: !!((s as any).allDay),
        location: (s as any).location || '',
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
        allDay: false,
        location: '',
        shipId: undefined,
        firstType: '',
        secondType: '',
        priority: 'normal',
        finishStatus: 'pending',
        startTime: '',
        endTime: '',
        eventDetail: '',
      }
      importantForm.value = {
        name: '',
        date: today,
        repeatType: 'none',
        description: '',
      }
    }
  },
  { immediate: true },
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
    if (result.recordDate) form.value.recordDate = result.recordDate
    if (result.startTime) form.value.startTime = result.startTime
    if (result.endTime) form.value.endTime = result.endTime
    if (result.eventDetail) form.value.eventDetail = result.eventDetail
    if (result.location) form.value.location = result.location

    const parts: string[] = []
    if (result.recordDate) parts.push(`日期：${result.recordDate}`)
    if (result.startTime) parts.push(`开始：${result.startTime}`)
    if (result.endTime) parts.push(`结束：${result.endTime}`)
    if (result.location) parts.push(`地点：${result.location}`)
    if (result.eventDetail) parts.push(`事件：${result.eventDetail}`)
    smartParsedHint.value = `已解析并填入表单 → ${parts.join('，')}`
    ElMessage.success('智能解析成功，请补充分类后保存')
  } catch (err: any) {
    console.error('[CreateDialog] smartParse 失败:', err)
    ElMessage.error('智能解析失败：' + (err?.message || '未知错误'))
  } finally {
    smartParsing.value = false
  }
}

const handleSave = async () => {
  // 保存：两种模式
  if (createMode.value === 'important') {
    // ====== 重要日模式 ======
    if (!importantForm.value.name || !importantForm.value.date) {
      ElMessage.warning('请填写必填项（名称、日期）')
      return
    }
    saving.value = true
    try {
      await api.importantDates.create({
        name: importantForm.value.name,
        date: importantForm.value.date,
        repeatType: importantForm.value.repeatType,
        description: importantForm.value.description || form.value.location || '',
      })
      // 重要日 reminders 也写入（scheduleReminders 没有 scheduleId，这里先忽略；若需要可以建一张单独的 important_date_reminders 表）
      ElMessage.success('重要日已创建')
      visible.value = false
      emit('saved')
    } catch (err: any) {
      ElMessage.error('保存失败：' + (err?.message || '未知错误'))
    } finally {
      saving.value = false
    }
    return
  }

  // ====== 日程模式 ======
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
    // 后端 CreateScheduleRequest 需要 title 字段，用二级分类或详情兜底
    title: form.value.secondType || form.value.eventDetail || '(未命名)',
    startTime: form.value.startTime ? formatDateTimeForApi(form.value.startTime) : null,
    endTime: form.value.endTime ? formatDateTimeForApi(form.value.endTime) : null,
  }
  // 后端可能没 location / allDay 字段；这些字段会被 JSON 序列化忽略掉通常不会报错；但为安全起见，若字段不存在于后端 schema，这里保持发送不删

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

    // 批量保存多条提醒（reminders 数组 -> scheduleReminders 表）
    if (savedScheduleId && reminders.value.length > 0) {
      try {
        for (const r of reminders.value) {
          await api.scheduleReminders.create({
            scheduleId: savedScheduleId,
            remindBefore: r.before,
            remindUnit: r.unit,
            isImportant: false,
          })
        }
      } catch (err) {
        console.warn('提醒创建失败', err)
      }
    }

    // 重要日标记（同步创建）
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
    console.error('[CreateDialog] handleSave 失败:', err)
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
/* 头部自定义样式 */
.hw-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 4px;
}
.hw-tabs {
  display: inline-flex;
  background: #f2f3f5;
  border-radius: 8px;
  padding: 3px;
}
.hw-tab {
  padding: 6px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #606266;
  transition: all 0.15s;
  user-select: none;
}
.hw-tab.active {
  background: #fff;
  color: #f56c6c;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.hw-title-text {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

/* 一句话智能创建 */
.smart-create-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #ecf5ff 100%);
  border: 1px solid #d9ecff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 6px;
}
.smart-create-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
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
  color: #67c23a;
}

/* 表单 */
.hw-form :deep(.el-form-item) {
  margin-bottom: 14px;
}
.attachment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}
.at-name {
  max-width: 180px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.at-hint {
  font-size: 11px;
  color: #909399;
}
.important-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}

/* ===== 华为风提醒条（内部组件用，必须 deep 或者 global） ===== */
</style>

<style>
/* Reminder chip 全局样式（不受 scoped 限制，穿透至子组件） */
.hw-reminder-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  min-height: 30px;
}
.hw-reminder-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  padding: 4px 10px 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  color: #606266;
  user-select: none;
  transition: all 0.15s;
}
.hw-reminder-chip:hover {
  background: #e8f2ff;
  border-color: #b3d8ff;
}
.hrc-text {
  font-weight: 500;
  color: #303133;
}
.hrc-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  border-radius: 50%;
  background: #c0c4cc;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}
.hrc-close:hover {
  background: #f56c6c;
}
</style>
