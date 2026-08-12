<template>
  <el-dialog
    v-model="visible"
    title="跳转日期"
    width="420px"
    :close-on-click-modal="true"
    align-center
    append-to-body
    custom-class="hw-jump-dialog"
  >
    <div class="jump-body">
      <!-- 三列滚轮：年 / 月 / 日 -->
      <div class="roller-wrap">
        <!-- 年列 -->
        <div class="roller-col">
          <div class="roller-header">年</div>
          <div class="roller-viewport" ref="yearViewportRef" @scroll="onYearScroll">
            <div class="roller-pad-top"></div>
            <div
              v-for="y in yearRange"
              :key="y"
              class="roller-item"
              :class="{ active: y === pickYear }"
              @click="pickYear = y; scrollToItem('year', y)"
            >{{ y }}</div>
            <div class="roller-pad-bottom"></div>
          </div>
        </div>
        <!-- 月列 -->
        <div class="roller-col">
          <div class="roller-header">月</div>
          <div class="roller-viewport" ref="monthViewportRef" @scroll="onMonthScroll">
            <div class="roller-pad-top"></div>
            <div
              v-for="m in 12"
              :key="m"
              class="roller-item"
              :class="{ active: m === pickMonth }"
              @click="pickMonth = m; scrollToItem('month', m)"
            >{{ m }}月</div>
            <div class="roller-pad-bottom"></div>
          </div>
        </div>
        <!-- 日列 -->
        <div class="roller-col">
          <div class="roller-header">日</div>
          <div class="roller-viewport" ref="dayViewportRef" @scroll="onDayScroll">
            <div class="roller-pad-top"></div>
            <div
              v-for="d in daysInPickMonth"
              :key="d"
              class="roller-item"
              :class="{ active: d === pickDay }"
              @click="pickDay = Math.min(d, daysInPickMonth); scrollToItem('day', pickDay)"
            >{{ d }}</div>
            <div class="roller-pad-bottom"></div>
          </div>
        </div>
        <!-- 中央高亮线（华为风：两条灰线夹住中间一行） -->
        <div class="roller-highlight"></div>
      </div>

      <!-- 底部预览 + 农历显示 -->
      <div class="preview-row">
        <div class="preview-date">
          {{ pickYear }}年{{ pickMonth }}月{{ pickDay }}日
          <span class="preview-week">{{ WEEK_CN[previewWeekday] }}</span>
        </div>
        <div class="preview-right">
          <el-checkbox v-model="showLunar" size="small">显示农历</el-checkbox>
        </div>
      </div>
      <div v-if="showLunar" class="lunar-row">
        <span class="lunar-text">农历 {{ previewLunar }}</span>
        <span v-if="previewFestival" class="lunar-festival">{{ previewFestival }}</span>
        <span v-if="previewFu" class="lunar-fu">{{ previewFu }}</span>
        <span v-if="previewSolar" class="lunar-solar">{{ previewSolar }}</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="confirm">跳转到该日</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useLunar } from '~/composables/useLunar'

interface Props {
  modelValue: boolean
  initialDate?: Date | null
}

const props = withDefaults(defineProps<Props>(), { initialDate: null })
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', dateStr: string): void
}>()

const { getLunarInfo } = useLunar()
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

// 滚轮选择值
const now = new Date()
const pickYear = ref(props.initialDate?.getFullYear() ?? now.getFullYear())
const pickMonth = ref((props.initialDate?.getMonth() ?? now.getMonth()) + 1)
const pickDay = ref(props.initialDate?.getDate() ?? now.getDate())
const showLunar = ref(true)

// 年份范围：1970 ~ 2099
const yearRange = computed(() => {
  const list: number[] = []
  for (let y = 1970; y <= 2099; y++) list.push(y)
  return list
})

// 选中年月对应的天数
const daysInPickMonth = computed(() => {
  return new Date(pickYear.value, pickMonth.value, 0).getDate()
})
// 防止跨月日数溢出（如 1月31 切到 2月）
watch([pickYear, pickMonth], () => {
  if (pickDay.value > daysInPickMonth.value) pickDay.value = daysInPickMonth.value
})

// 预览信息
const previewDate = computed(() => new Date(pickYear.value, pickMonth.value - 1, pickDay.value))
const previewWeekday = computed(() => previewDate.value.getDay())
const previewLunarInfo = computed(() => showLunar.value ? getLunarInfo(previewDate.value) : null)
const previewLunar = computed(() => previewLunarInfo.value?.lunar ?? '')
const previewFestival = computed(() => previewLunarInfo.value?.holiday ?? '')
const previewFu = computed(() => previewLunarInfo.value?.fu ?? '')
const previewSolar = computed(() => previewLunarInfo.value?.solarTerm ?? '')

// 滚轮 refs
const yearViewportRef = ref<HTMLElement | null>(null)
const monthViewportRef = ref<HTMLElement | null>(null)
const dayViewportRef = ref<HTMLElement | null>(null)
const ITEM_HEIGHT = 36

// 初始化时将滚轮滚动到当前选择
watch(visible, async (v) => {
  if (v) {
    if (props.initialDate) {
      pickYear.value = props.initialDate.getFullYear()
      pickMonth.value = props.initialDate.getMonth() + 1
      pickDay.value = props.initialDate.getDate()
    }
    await nextTick()
    scrollToItem('year', pickYear.value, true)
    scrollToItem('month', pickMonth.value, true)
    scrollToItem('day', pickDay.value, true)
  }
})

function scrollToItem(kind: 'year' | 'month' | 'day', value: number, instant = false) {
  let refEl: HTMLElement | null = null
  let index = 0
  if (kind === 'year') { refEl = yearViewportRef.value; index = yearRange.value.indexOf(value) }
  else if (kind === 'month') { refEl = monthViewportRef.value; index = value - 1 }
  else { refEl = dayViewportRef.value; index = value - 1 }
  if (!refEl || index < 0) return
  const topPad = (refEl.clientHeight / 2) - (ITEM_HEIGHT / 2)
  const target = Math.max(0, index * ITEM_HEIGHT - topPad)
  refEl.scrollTo({ top: target, behavior: instant ? 'auto' : 'smooth' })
}

// 滚动停止时根据 scrollTop 反算选中项（简单防抖）
let scrollTimers: Record<string, any> = {}
function onScroll(kind: 'year' | 'month' | 'day') {
  if (scrollTimers[kind]) clearTimeout(scrollTimers[kind])
  scrollTimers[kind] = setTimeout(() => {
    const refEl = kind === 'year' ? yearViewportRef.value : kind === 'month' ? monthViewportRef.value : dayViewportRef.value
    if (!refEl) return
    const topPad = (refEl.clientHeight / 2) - (ITEM_HEIGHT / 2)
    const idx = Math.round((refEl.scrollTop + topPad) / ITEM_HEIGHT)
    if (kind === 'year') {
      pickYear.value = yearRange.value[Math.min(Math.max(idx, 0), yearRange.value.length - 1)] ?? pickYear.value
    } else if (kind === 'month') {
      pickMonth.value = Math.min(Math.max(idx + 1, 1), 12)
    } else {
      pickDay.value = Math.min(Math.max(idx + 1, 1), daysInPickMonth.value)
    }
  }, 80)
}
function onYearScroll() { onScroll('year') }
function onMonthScroll() { onScroll('month') }
function onDayScroll() { onScroll('day') }

function confirm() {
  const y = pickYear.value
  const m = String(pickMonth.value).padStart(2, '0')
  const d = String(pickDay.value).padStart(2, '0')
  emit('confirm', `${y}-${m}-${d}`)
  visible.value = false
}
</script>

<style>
.hw-jump-dialog .el-dialog__body { padding: 16px 20px 8px; }
</style>

<style scoped>
.jump-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 三列滚轮容器 */
.roller-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  height: 220px;
  position: relative;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}
.roller-col {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #f0f0f0;
}
.roller-col:last-child { border-right: none; }
.roller-header {
  padding: 6px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.roller-viewport {
  flex: 1;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  position: relative;
}
.roller-viewport::-webkit-scrollbar { display: none; }
.roller-pad-top,
.roller-pad-bottom { height: calc(50% - 18px); scroll-snap-align: start; }
.roller-item {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #606266;
  cursor: pointer;
  scroll-snap-align: center;
  transition: color 0.15s, font-weight 0.15s;
}
.roller-item.active {
  color: #f56c6c;
  font-weight: 700;
  font-size: 17px;
}
/* 中央高亮指示框（两条水平线夹中间） */
.roller-highlight {
  position: absolute;
  left: 0; right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 36px;
  border-top: 1px solid #f56c6c60;
  border-bottom: 1px solid #f56c6c60;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(253,236,236,0.2) 0%, transparent 50%, rgba(253,236,236,0.2) 100%);
}

/* 预览 + 农历行 */
.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  border-top: 1px dashed #ebeef5;
}
.preview-date {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}
.preview-week {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}
.lunar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 8px;
  font-size: 12px;
  color: #606266;
  flex-wrap: wrap;
}
.lunar-festival { color: #f56c6c; font-weight: 600; background: #fdecec; padding: 1px 6px; border-radius: 3px; }
.lunar-fu { color: #f56c6c; font-weight: 600; background: #fdecec; padding: 1px 6px; border-radius: 3px; }
.lunar-solar { color: #67c23a; font-weight: 600; background: #f2f6ec; padding: 1px 6px; border-radius: 3px; }
</style>
