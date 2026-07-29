<template>
  <div class="work-log-page">
    <ViewSwitcher
      v-if="isPoliticalInstructor"
      ref="viewSwitcherRef"
      :available-ships="availableShips"
      :current-ship-id="currentShipId"
      :current-user-id="authStore.user?.id"
      @view-change="handleViewChange"
      @ship-change="handleShipChange"
    />

    <!-- 顶部日期选择器 -->
    <div class="date-selector">
      <button class="nav-btn" @click="prevDay">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <div class="date-display" @click="showDatePicker = true">
        <div class="date-main">{{ selectedDateLabel }}</div>
        <div class="date-sub">{{ lunarInfo.lunar }} {{ lunarInfo.holiday || '' }}</div>
      </div>
      <button class="nav-btn" @click="nextDay">
        <el-icon><ArrowRight /></el-icon>
      </button>
      <button class="today-btn" @click="goToday">今天</button>
    </div>

    <!-- 日期选择弹窗 -->
    <el-dialog v-model="showDatePicker" title="选择日期" width="360px" :close-on-click-modal="true">
      <el-calendar v-model="tempDate" />
      <template #footer>
        <el-button @click="showDatePicker = false">取消</el-button>
        <el-button type="primary" @click="confirmDate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 日记编辑器 -->
    <div class="diary-section">
      <div class="section-header">
        <span class="section-title">📝 {{ isPoliticalInstructor ? '航海日志' : '工作日记' }}</span>
      </div>
      <div class="diary-content">
        <template v-if="isPoliticalInstructor">
          <div class="info-bar">
            <div class="info-row">
              <div class="info-group">
                <label class="info-label">出发港</label>
                <el-select v-model="diaryForm.departurePort" placeholder="出发港" size="small" filterable>
                  <el-option v-for="port in ports" :key="'dep-' + port.id" :label="`${port.name}${port.enName ? ` (${port.enName})` : ''}`" :value="port.name" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">目的港</label>
                <el-select v-model="diaryForm.arrivalPort" placeholder="目的港" size="small" filterable>
                  <el-option v-for="port in ports" :key="'arr-' + port.id" :label="`${port.name}${port.enName ? ` (${port.enName})` : ''}`" :value="port.name" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">出发日期时间</label>
                <el-date-picker
                  v-model="diaryForm.departureTime"
                  type="datetime"
                  placeholder="选择时间"
                  size="small"
                  style="width: 100%"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DD HH:mm:ss"
                />
              </div>
              <div class="info-group">
                <label class="info-label">是否放海港区</label>
                <el-select v-model="diaryForm.isFreePortZone" placeholder="请选择" size="small">
                  <el-option label="是" value="true" />
                  <el-option label="否" value="false" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">是否战区</label>
                <el-select v-model="diaryForm.isWarZone" placeholder="请选择" size="small">
                  <el-option label="是" value="true" />
                  <el-option label="否" value="false" />
                </el-select>
              </div>
            </div>
            <div class="info-row mt-2">
              <div class="info-group">
                <label class="info-label">时区</label>
                <el-select v-model="diaryForm.timezone" placeholder="时区" size="small">
                  <el-option label="UTC+0 格林威治" value="UTC+0" />
                  <el-option label="UTC+8 北京时间" value="UTC+8" />
                  <el-option label="UTC+9 东京时间" value="UTC+9" />
                  <el-option label="UTC+1 欧洲中部" value="UTC+1" />
                  <el-option label="UTC-5 纽约时间" value="UTC-5" />
                  <el-option label="UTC+5:30 印度时间" value="UTC+5:30" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">天气</label>
                <el-select v-model="diaryForm.weather" placeholder="天气" size="small">
                  <el-option label="晴" value="晴" />
                  <el-option label="多云" value="多云" />
                  <el-option label="阴" value="阴" />
                  <el-option label="小雨" value="小雨" />
                  <el-option label="中雨" value="中雨" />
                  <el-option label="大雨" value="大雨" />
                  <el-option label="暴雨" value="暴雨" />
                  <el-option label="雾" value="雾" />
                  <el-option label="雪" value="雪" />
                  <el-option label="雷阵雨" value="雷阵雨" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">海况</label>
                <el-select v-model="diaryForm.seaCondition" placeholder="海况" size="small">
                  <el-option label="平静" value="平静" />
                  <el-option label="轻浪" value="轻浪" />
                  <el-option label="中浪" value="中浪" />
                  <el-option label="大浪" value="大浪" />
                  <el-option label="巨浪" value="巨浪" />
                  <el-option label="狂浪" value="狂浪" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">今日动态</label>
                <el-select v-model="diaryForm.dynamicStatus" placeholder="动态" size="small">
                  <el-option label="航行中" value="航行中" />
                  <el-option label="靠泊中" value="靠泊中" />
                  <el-option label="锚泊中" value="锚泊中" />
                  <el-option label="在港" value="在港" />
                  <el-option label="修船" value="修船" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">船舶位置</label>
                <el-input v-model="diaryForm.shipPosition" placeholder="经纬度位置" size="small" />
              </div>
            </div>
          </div>
        </template>

        <!-- 非政委表单 -->
        <template v-else>
          <div class="info-bar">
            <div class="info-row">
              <div class="info-group">
                <label class="info-label">天气</label>
                <el-select v-model="diaryForm.weather" placeholder="天气" size="small">
                  <el-option label="☀ 晴" value="晴" />
                  <el-option label="☁ 多云" value="多云" />
                  <el-option label="☂ 阴" value="阴" />
                  <el-option label="🌦 小雨" value="小雨" />
                  <el-option label="🌧 中雨" value="中雨" />
                  <el-option label="🌧 大雨" value="大雨" />
                  <el-option label="🌧 暴雨" value="暴雨" />
                  <el-option label="🌫 雾" value="雾" />
                  <el-option label="❄ 雪" value="雪" />
                  <el-option label="⛈ 雷阵雨" value="雷阵雨" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">今日动态</label>
                <el-select v-model="diaryForm.dynamicStatus" placeholder="今日动态" size="small">
                  <el-option label="在公司" value="在公司" />
                  <el-option label="出差访船" value="出差访船" />
                  <el-option label="出差路上" value="出差路上" />
                  <el-option label="培训" value="培训" />
                  <el-option label="开会" value="开会" />
                  <el-option label="休假" value="休假" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </div>
              <div class="info-group">
                <label class="info-label">船舶</label>
                <div v-if="detectedShipName" class="ship-name-badge" title="自动识别船舶">
                  <el-tag type="primary" size="small" effect="light">🚢 {{ detectedShipName }}</el-tag>
                </div>
                <div v-else class="ship-name-hint text-xs text-gray-400">
                  输入船名将自动识别
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 日记编辑器 -->
        <div class="diary-editor">
          <el-input v-model="diaryForm.content" type="textarea" :rows="15" placeholder="记录今天的工作内容..." />
        </div>

        <!-- 保存按钮 -->
        <div class="diary-actions">
          <el-button type="primary" @click="saveDiary" :loading="diarySaving">保存日记</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Schedule, Ship } from '~/types'
import { useLunar } from '~/composables/useLunar'
import ViewSwitcher from '~/components/ViewSwitcher.vue'

definePageMeta({
  middleware: ['auth'],
})

useHead({
  title: '工作日志 - 熊猫笔记',
})

const api = useApi()
const authStore = useAuthStore()
const { getLunarDate } = useLunar()

const selectedDate = ref(new Date())
const tempDate = ref(new Date())
const showDatePicker = ref(false)

const schedules = ref<Schedule[]>([])
const ships = ref<Ship[]>([])
const ports = ref<{ id: number; name: string }[]>([])
const availableShips = ref<any[]>([])
const currentShipId = ref<number | null>(null)
const currentView = ref<'ship' | 'personal'>('ship')

const viewSwitcherRef = ref<InstanceType<typeof ViewSwitcher> | null>(null)

const diaryForm = ref({
  content: '',
  relatedScheduleIds: [] as number[],
  weather: '',
  seaCondition: '',
  dynamicStatus: '',
  departurePort: '',
  arrivalPort: '',
  departureTime: '',
  isFreePortZone: '',
  isWarZone: '',
  timezone: '',
  shipPosition: '',
  shipName: '',
})
const diarySaving = ref(false)
const currentDiaryId = ref<number | null>(null)

const isPoliticalInstructor = computed(() => {
  return authStore.userRole === 'ship_political_instructor'
})

const selectedDateLabel = computed(() => {
  const d = selectedDate.value
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
})

const selectedDateStr = computed(() => {
  return formatDate(selectedDate.value)
})

const lunarInfo = computed(() => {
  try {
    const lunar = getLunarDate(selectedDate.value)
    return {
      lunar: lunar?.lunar || '',
      holiday: lunar?.holiday || '',
    }
  } catch {
    return { lunar: '', holiday: '' }
  }
})

const detectedShipName = computed(() => {
  const content = diaryForm.value.content || ''
  if (!content || !ships.value || ships.value.length === 0) {
    return diaryForm.value.shipName || ''
  }
  for (const ship of ships.value) {
    if (ship.cnShipName && content.includes(ship.cnShipName)) {
      return ship.cnShipName
    }
    if (ship.enShipName && content.toLowerCase().includes(ship.enShipName.toLowerCase())) {
      return ship.cnShipName
    }
  }
  return diaryForm.value.shipName || ''
})

const daySchedules = computed(() => {
  const dateStr = formatDate(selectedDate.value)
  return schedules.value.filter(s => {
    const sDate = formatDate(new Date(s.recordDate))
    return sDate === dateStr
  })
})

const availableSchedules = computed(() => {
  return daySchedules.value.filter(s => s.finishStatus === 'completed')
})

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const prevDay = () => {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d
}

const nextDay = () => {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d
}

const goToday = () => {
  selectedDate.value = new Date()
}

const confirmDate = () => {
  selectedDate.value = tempDate.value
  showDatePicker.value = false
}

const isScheduleSelected = (schedule: any) => {
  const id = schedule.id || schedule.scheduleId
  return diaryForm.value.relatedScheduleIds.includes(id)
}

const toggleScheduleRelation = (schedule: any) => {
  const id = schedule.id || schedule.scheduleId
  const index = diaryForm.value.relatedScheduleIds.indexOf(id)
  if (index > -1) {
    diaryForm.value.relatedScheduleIds.splice(index, 1)
  } else {
    diaryForm.value.relatedScheduleIds.push(id)
  }
}

const selectAllSchedules = () => {
  diaryForm.value.relatedScheduleIds = availableSchedules.value.map(s => s.id).filter(Boolean) as number[]
}

const isValidDateStr = (val: any) => {
  if (!val) return false
  if (typeof val !== 'string') return false
  const d = new Date(val)
  return !isNaN(d.getTime())
}

const saveDiary = async () => {
  if (!diaryForm.value.content.trim() && diaryForm.value.relatedScheduleIds.length === 0) {
    ElMessage.warning('请输入日记内容或关联日程')
    return
  }

  diarySaving.value = true
  try {
    const content = diaryForm.value.content || ''
    // 自动从内容识别船名（优先使用用户手动输入的）
    const autoShipName = detectedShipName.value || ''
    const finalShipName = diaryForm.value.shipName || autoShipName

    const diaryData: any = {
      content,
      relatedScheduleIds: diaryForm.value.relatedScheduleIds || [],
    }
    // 仅在创建时传 date，更新时不传（避免 UpdateDiaryDto 无 date 字段导致 whitelist 剥离）
    if (!currentDiaryId.value) {
      diaryData.date = selectedDateStr.value
    }
    // 仅当有有效值时才传，避免 undefined 或 Invalid Date
    if (diaryForm.value.weather) diaryData.weather = diaryForm.value.weather
    if (diaryForm.value.seaCondition) diaryData.seaCondition = diaryForm.value.seaCondition
    if (diaryForm.value.dynamicStatus) diaryData.dynamicStatus = diaryForm.value.dynamicStatus
    if (diaryForm.value.departurePort) diaryData.departurePort = diaryForm.value.departurePort
    if (diaryForm.value.arrivalPort) diaryData.arrivalPort = diaryForm.value.arrivalPort
    if (isValidDateStr(diaryForm.value.departureTime)) diaryData.departureTime = diaryForm.value.departureTime
    if (diaryForm.value.timezone) diaryData.timezone = diaryForm.value.timezone
    if (diaryForm.value.shipPosition) diaryData.shipPosition = diaryForm.value.shipPosition
    if (finalShipName) diaryData.shipName = finalShipName
    // 布尔字段：仅当有明确值（true/false 非空字符串）时才传
    if (diaryForm.value.isFreePortZone === 'true' || diaryForm.value.isFreePortZone === 'false') {
      diaryData.isFreePortZone = diaryForm.value.isFreePortZone === 'true'
    }
    if (diaryForm.value.isWarZone === 'true' || diaryForm.value.isWarZone === 'false') {
      diaryData.isWarZone = diaryForm.value.isWarZone === 'true'
    }

    let result: any
    if (currentDiaryId.value) {
      result = await api.diary.update(currentDiaryId.value, diaryData)
      ElMessage.success('日记已更新')
    } else {
      result = await api.diary.create(diaryData)
      if (result?.id !== undefined) {
        currentDiaryId.value = result.id
      }
      ElMessage.success('日记已保存')
    }
    // 保存成功后刷新当日日记
    await loadDiary()
  } catch (error: any) {
    // 归一化错误消息：NestJS ValidationPipe 常返回 message: string[]，避免传给 ElMessage 导致 startsWith 报错
    const pickMsg = (raw: any): string => {
      if (raw === undefined || raw === null) return '';
      if (typeof raw === 'string') return raw;
      if (Array.isArray(raw)) return raw.map(pickMsg).filter(Boolean).join('；');
      if (typeof raw === 'object') {
        if (raw.message) return pickMsg(raw.message);
        if (raw.constraints) return Object.values(raw.constraints).map(String).join('；');
        try { return JSON.stringify(raw); } catch { return String(raw); }
      }
      try { return String(raw); } catch { return ''; }
    };
    const msg = pickMsg(error?.data?.message || error?.response?._data?.message) || pickMsg(error?.message) || '保存失败';
    console.error('[saveDiary] 保存失败', error, { diaryData: error?.config?.data });
    ElMessage.error(msg);
  } finally {
    diarySaving.value = false
  }
}

const loadSchedules = async () => {
  try {
    const response = await api.get('/schedule', {
      params: {
        startDate: selectedDateStr.value,
        endDate: selectedDateStr.value,
      },
    })
    schedules.value = response.data || response
  } catch (error) {
    console.error('加载日程失败', error)
  }
}

const loadDiary = async () => {
  try {
    const diaryResp = await api.diary.getByDate(selectedDateStr.value)
    // 兼容兜底：如果缓存策略异常返回了数组，从数组中匹配日期
    let diary: any = diaryResp
    if (Array.isArray(diaryResp)) {
      const targetDate = new Date(selectedDateStr.value)
      targetDate.setHours(0, 0, 0, 0)
      const targetTs = targetDate.getTime()
      diary = diaryResp.find((item: any) => {
        if (!item.date) return false
        const d = new Date(item.date)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === targetTs
      }) || null
    }
    if (diary) {
      currentDiaryId.value = diary.id
      diaryForm.value = {
        content: diary.content || '',
        relatedScheduleIds: diary.relatedScheduleIds || [],
        weather: diary.weather || '',
        seaCondition: diary.seaCondition || '',
        dynamicStatus: diary.dynamicStatus || '',
        departurePort: diary.departurePort || '',
        arrivalPort: diary.arrivalPort || '',
        departureTime: diary.departureTime || '',
        isFreePortZone: diary.isFreePortZone ? 'true' : 'false',
        isWarZone: diary.isWarZone ? 'true' : 'false',
        timezone: diary.timezone || '',
        shipPosition: diary.shipPosition || '',
        shipName: diary.shipName || '',
      }
    } else {
      currentDiaryId.value = null
      diaryForm.value = {
        content: '',
        relatedScheduleIds: [],
        weather: '',
        seaCondition: '',
        dynamicStatus: '',
        departurePort: '',
        arrivalPort: '',
        departureTime: '',
        isFreePortZone: '',
        isWarZone: '',
        timezone: '',
        shipPosition: '',
        shipName: '',
      }
    }
  } catch (error) {
    currentDiaryId.value = null
    diaryForm.value = {
      content: '',
      relatedScheduleIds: [],
      weather: '',
      seaCondition: '',
      dynamicStatus: '',
      departurePort: '',
      arrivalPort: '',
      departureTime: '',
      isFreePortZone: '',
      isWarZone: '',
      timezone: '',
      shipPosition: '',
      shipName: '',
    }
  }
}

const loadShips = async () => {
  try {
    ships.value = await api.ships.getAll()
  } catch {
    ships.value = []
  }
}

const loadPorts = async () => {
  try {
    ports.value = await api.port.getAll()
  } catch {
    ports.value = []
  }
}

const loadAvailableShips = async () => {
  try {
    const permission = await api.diary.getPermissionInfo()
    const historyShipIds = permission.historyShipIds || []
    const currentShipIdVal = permission.currentShipId
    
    if (currentShipIdVal) {
      currentShipId.value = currentShipIdVal
    }
    
    const allShips = await api.ships.getAll()
    const shipSet = new Set([currentShipIdVal, ...historyShipIds])
    availableShips.value = allShips.filter(s => shipSet.has(s.id))
    
    if (availableShips.value.length === 0) {
      availableShips.value = allShips.slice(0, 10)
    }
    
    await nextTick()
    if (viewSwitcherRef.value && currentShipId.value) {
      viewSwitcherRef.value.setSelectedShip(currentShipId.value)
    }
  } catch (e) {
    console.error('加载可用船舶失败', e)
    availableShips.value = ships.value
  }
}

const handleViewChange = async (data: { view: string; shipId: number | null }) => {
  currentView.value = data.view as 'ship' | 'personal'
  currentShipId.value = data.shipId
  await loadDiary()
}

const handleShipChange = (shipId: number) => {
  currentShipId.value = shipId
}

watch(selectedDate, () => {
  loadSchedules()
  loadDiary()
})

onMounted(async () => {
  await Promise.all([
    loadSchedules(),
    loadDiary(),
    loadShips(),
    loadPorts(),
  ])
  if (isPoliticalInstructor.value) {
    await loadAvailableShips()
  }
})
</script>

<style scoped>
.work-log-page {
  padding: 16px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 16px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.date-display {
  flex: 1;
  text-align: center;
  cursor: pointer;
}

.date-main {
  font-size: 20px;
  font-weight: 600;
}

.date-sub {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 2px;
}

.today-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.today-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.diary-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #f8f9fa;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.diary-content {
  padding: 16px;
}

.info-bar {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.info-group {
  flex: 1;
  min-width: 120px;
}

.info-label {
  display: block;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.ship-select {
  width: 140px;
}

.relation-section {
  margin-bottom: 16px;
}

.relation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
}

.empty-text-small {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 12px;
}

.relation-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.relation-item:hover {
  border-color: #409eff;
}

.relation-item.is-selected {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.check-icon {
  font-size: 14px;
}

.relation-summary {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.diary-editor {
  margin-bottom: 16px;
}

.diary-editor .el-textarea__inner {
  border-radius: 8px;
}

.diary-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .date-selector {
    padding: 12px;
  }

  .date-main {
    font-size: 18px;
  }

  .info-row {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .info-group {
    flex: 1 1 28%;
    min-width: 0;
  }

  .relation-list {
    flex-direction: column;
  }

  .relation-item {
    width: 100%;
  }

  .work-log-page {
    /* 给手机底部固定导航栏留足够空间，避免保存按钮被遮挡 */
    padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
  }

  .diary-actions {
    padding-bottom: 12px;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .work-log-page {
    padding: 12px;
    max-width: 100%;
    /* 给平板竖屏底部固定导航栏留足够空间 */
    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px));
  }

  .date-selector {
    padding: 12px 16px;
    gap: 10px;
  }

  .date-main {
    font-size: 18px;
  }

  .date-sub {
    font-size: 12px;
  }

  .diary-content {
    padding: 12px;
  }

  .info-bar {
    padding: 12px;
    margin-bottom: 12px;
  }

  .info-row {
    gap: 10px;
  }

  .info-group {
    flex: 1;
    min-width: 150px;
  }

  .diary-actions {
    padding-bottom: 12px;
  }
}
</style>
