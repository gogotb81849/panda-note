<template>
  <el-dialog
    v-model="visible"
    title="日历设置"
    width="520px"
    :close-on-click-modal="true"
    append-to-body
    custom-class="hw-settings-dialog"
  >
    <div class="hw-settings">

      <!-- ========== 区块 1：显示设置 ========== -->
      <div class="setting-block">
        <div class="block-title">
          <span class="block-icon block-icon-display"><el-icon><Monitor /></el-icon></span>
          <span>显示设置</span>
        </div>
        <div class="block-body">
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">显示农历</div>
              <div class="sr-desc">在月、年、日视图中显示农历日期与节日</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.showLunar" />
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">显示周数</div>
              <div class="sr-desc">月视图左侧显示该周是当年第几周</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.showWeekNumber" />
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">周一开始</div>
              <div class="sr-desc">把周一当作一周的第一天（默认周日）</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.weekStartMonday" />
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">月份水印</div>
              <div class="sr-desc">月视图中央显示大号半透明的月份数字</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.showTodayWatermark" />
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 区块 2：默认提醒 ========== -->
      <div class="setting-block">
        <div class="block-title">
          <span class="block-icon block-icon-remind"><el-icon><Bell /></el-icon></span>
          <span>默认提醒</span>
        </div>
        <div class="block-body">
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">新建日程默认添加提醒</div>
              <div class="sr-desc">新建日程时自动加入以下提醒方案</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.autoAddReminder" />
            </div>
          </div>
          <div class="setting-row" v-if="local.autoAddReminder">
            <div class="sr-left">
              <div class="sr-name">默认提醒时间</div>
              <div class="sr-desc">日程开始前多久提醒</div>
            </div>
            <div class="sr-right">
              <el-select v-model="local.defaultReminder" size="default" style="width: 160px">
                <el-option label="5 分钟前" value="5m" />
                <el-option label="15 分钟前" value="15m" />
                <el-option label="30 分钟前" value="30m" />
                <el-option label="1 小时前" value="1h" />
                <el-option label="1 天前" value="1d" />
                <el-option label="3 天前" value="3d" />
              </el-select>
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">全天日程默认提醒</div>
              <div class="sr-desc">全天事件在当天几点提醒</div>
            </div>
            <div class="sr-right">
              <el-time-picker
                v-model="local.allDayReminderTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
                style="width: 160px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 区块 3：休班与节假日 ========== -->
      <div class="setting-block">
        <div class="block-title">
          <span class="block-icon block-icon-holiday"><el-icon><Calendar /></el-icon></span>
          <span>休班与节假日</span>
        </div>
        <div class="block-body">
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">显示法定休班标记</div>
              <div class="sr-desc">在对应日期右上角标记「休」「班」小角标</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.showHolidayTags" />
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">高亮农历初一/十五</div>
              <div class="sr-desc">把农历初一、十五的日期数字显示为红色</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.highlightFirstFifteen" />
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-left">
              <div class="sr-name">显示三伏与节气标签</div>
              <div class="sr-desc">在日期格下方显示初伏/中伏/末伏和 24 节气</div>
            </div>
            <div class="sr-right">
              <el-switch v-model="local.showFuAndSolar" />
            </div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="confirm">保存设置</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { Monitor, Bell, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

export interface ScheduleSettingsModel {
  showLunar: boolean
  showWeekNumber: boolean
  weekStartMonday: boolean
  showTodayWatermark: boolean
  autoAddReminder: boolean
  defaultReminder: string
  allDayReminderTime: string
  showHolidayTags: boolean
  highlightFirstFifteen: boolean
  showFuAndSolar: boolean
}

const DEFAULT_SETTINGS: ScheduleSettingsModel = {
  showLunar: true,
  showWeekNumber: true,
  weekStartMonday: false,
  showTodayWatermark: true,
  autoAddReminder: true,
  defaultReminder: '15m',
  allDayReminderTime: '09:00',
  showHolidayTags: true,
  highlightFirstFifteen: true,
  showFuAndSolar: true,
}

interface Props {
  modelValue: boolean
  settings?: Partial<ScheduleSettingsModel> | null
}

const props = withDefaults(defineProps<Props>(), { settings: null })

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', settings: ScheduleSettingsModel): void
}>()

const api = useApi()

const visible = ref(false)
// 用一个本地 reactive 承接 settings props，在打开时同步
const local = reactive<ScheduleSettingsModel>({ ...DEFAULT_SETTINGS })

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
    if (v) {
      Object.assign(local, DEFAULT_SETTINGS, props.settings ?? {})
    }
  },
  { immediate: true },
)
watch(visible, (v) => emit('update:modelValue', v))

const saving = ref(false)

async function confirm() {
  saving.value = true
  try {
    // 优先调用后端 API，失败则静默
    try {
      await api.scheduleSettings.update({ ...local })
    } catch (err) {
      console.warn('[SettingsDialog] 云端保存失败（仅本地生效）:', err)
    }
    emit('saved', { ...local })
    ElMessage.success('设置已保存')
    visible.value = false
  } finally {
    saving.value = false
  }
}
</script>

<style>
.hw-settings-dialog .el-dialog__body { padding: 18px 22px 6px; }
.hw-settings-dialog .el-dialog__footer { padding-top: 6px; }
</style>

<style scoped>
.hw-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 区块卡片（华为风 3 区块） */
.setting-block {
  background: #ffffff;
  border: 1px solid var(--color-border-light, #ebeef5);
  border-radius: 10px;
  overflow: hidden;
}
.block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.block-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}
.block-icon-display { background: #409eff; }
.block-icon-remind  { background: #e6a23c; }
.block-icon-holiday { background: #67c23a; }

.block-body {
  padding: 4px 16px;
}

/* 单行设置 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  gap: 16px;
}
.setting-row:last-child { border-bottom: none; }

.sr-left {
  flex: 1;
  min-width: 0;
}
.sr-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
}
.sr-desc {
  font-size: 11px;
  color: #909399;
  margin-top: 3px;
  line-height: 1.5;
}
.sr-right {
  flex-shrink: 0;
}
</style>
