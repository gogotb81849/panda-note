<template>
  <div class="space-y-6">
    <div class="glass-card p-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-[#1A1A1A]">
          {{ isEdit ? '编辑台账' : '新建台账' }}
        </h2>
        <el-button @click="goBack">返回</el-button>
      </div>
    </div>

    <el-form :model="form" label-width="120px" class="space-y-6">
      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold mb-4">基本信息</h3>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8">
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
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="所属船舶">
              <el-select v-model="form.shipId" placeholder="选择船舶" style="width: 100%" @change="onShipChange">
                <el-option
                  v-for="ship in ships"
                  :key="ship.id"
                  :label="ship.cnShipName"
                  :value="ship.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="一级分类" required>
              <el-select v-model="form.firstType" placeholder="选择分类" style="width: 100%" @change="onFirstTypeChange">
                <el-option
                  v-for="type in firstTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="二级分类" required>
              <el-select v-model="form.secondType" placeholder="选择分类" style="width: 100%" @change="onSecondTypeChange">
                <el-option
                  v-for="type in filteredSecondTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="优先级（四象限）">
              <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
                <el-option label="🔴 重要紧急" value="urgent_important" />
                <el-option label="🟡 重要不紧急" value="important" />
                <el-option label="🔵 紧急不重要" value="urgent" />
                <el-option label="🟢 不紧急不重要" value="normal" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
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
          <el-col :xs="24" :sm="12" :md="12">
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
          <el-col :xs="24" :sm="12" :md="12">
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
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="glass-card p-6">
            <h3 class="text-lg font-semibold mb-4">事件详情</h3>
            <el-form-item>
              <el-input
                v-model="form.eventDetail"
                type="textarea"
                :rows="10"
                placeholder="请输入事件详情..."
                class="handwriting-input"
              />
            </el-form-item>
          </div>
        </div>
        
        <div class="lg:col-span-1">
          <div class="glass-card p-6">
            <h3 class="text-lg font-semibold mb-4">在岗人员</h3>
            <div v-if="onboardStaff.length > 0" class="space-y-2">
              <div v-for="staff in onboardStaff" :key="staff.id" class="p-3 bg-[#E8F0F6] rounded-lg">
                <div class="font-medium">{{ staff.staffName }}</div>
                <div class="text-sm text-[#808080]">{{ staff.postName }}</div>
              </div>
            </div>
            <div v-else class="text-[#808080] text-center py-4">
              暂无在岗人员信息
            </div>
            
            <hr class="my-4" />
            
            <h3 class="text-lg font-semibold mb-4">SOP流程</h3>
            <div v-if="currentSop" class="space-y-2">
              <div class="font-medium text-[#5B7FA6]">{{ currentSop.flowName }}</div>
              <div class="text-sm text-[#4A4A4A] whitespace-pre-wrap">{{ fillStaffNames(currentSop.flowContent) }}</div>
            </div>
            <div v-else class="text-[#808080] text-center py-4">
              暂无匹配的SOP流程
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="flex justify-end gap-4">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" @click="handleSave" :loading="loading">
            {{ isEdit ? '保存修改' : '创建台账' }}
          </el-button>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Schedule, Ship, DictCategory, StaffHistory, SopFlow } from '~/types'

const api = useApi()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const ships = ref<Ship[]>([])
const firstTypes = ref<DictCategory[]>([])
const secondTypes = ref<DictCategory[]>([])
const filteredSecondTypes = computed(() => {
  if (!form.value.firstType) {
    return []
  }
  const firstType = firstTypes.value.find(ft => ft.categoryName === form.value.firstType)
  if (firstType) {
    return secondTypes.value.filter(st => st.parentId === firstType.id)
  }
  return []
})
const staffHistories = ref<StaffHistory[]>([])
const sopFlows = ref<SopFlow[]>([])

const form = ref({
  recordDate: new Date().toISOString().split('T')[0],
  shipId: undefined as number | undefined,
  firstType: '',
  secondType: '',
  standardFlowId: undefined as number | undefined,
  eventDetail: '',
  startTime: undefined as string | undefined,
  endTime: undefined as string | undefined,
  finishStatus: 'pending' as const,
  priority: 'normal' as const,
  assignedToId: undefined as number | undefined,
})

const selectedShip = computed(() => ships.value.find(s => s.id === form.value.shipId))
const currentSop = computed(() => {
  if (!form.value.firstType || !form.value.secondType) return null
  return sopFlows.value.find(
    s => s.firstType === form.value.firstType && s.secondType === form.value.secondType
  )
})

const onboardStaff = computed(() => {
  if (!form.value.shipId || !form.value.recordDate) return []
  const recordDate = new Date(form.value.recordDate)
  return staffHistories.value.filter(sh => {
    if (sh.shipId !== form.value.shipId) return false
    const startDate = new Date(sh.startDate)
    const endDate = sh.endDate ? new Date(sh.endDate) : null
    return startDate <= recordDate && (!endDate || endDate >= recordDate)
  })
})

const loadData = async () => {
  try {
    const [shipsData, firstTypesData, secondTypesData, historiesData, sopsData] = await Promise.all([
      api.ships.getAll(),
      api.dict.getFirstTypes(),
      api.dict.getSecondTypes(),
      api.staffHistory.getAll(),
      api.sopFlow.getAll(),
    ])
    ships.value = shipsData
    firstTypes.value = firstTypesData
    secondTypes.value = secondTypesData
    staffHistories.value = historiesData
    sopFlows.value = sopsData

    if (isEdit.value && route.params.id) {
      const schedule = await api.schedules.getOne(Number(route.params.id))
      form.value = {
        recordDate: schedule.recordDate.split('T')[0],
        shipId: schedule.shipId,
        firstType: schedule.firstType,
        secondType: schedule.secondType,
        standardFlowId: schedule.standardFlowId,
        eventDetail: schedule.eventDetail || '',
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        finishStatus: schedule.finishStatus,
        priority: schedule.priority,
        assignedToId: schedule.assignedToId,
      }
    }
  } catch (error) {
    ElMessage.error('加载数据失败')
  }
}

const onShipChange = () => {
  // 船舶变更时自动刷新在岗人员
}

const onFirstTypeChange = () => {
  form.value.secondType = ''
  form.value.standardFlowId = undefined
}

const onSecondTypeChange = () => {
  if (currentSop.value) {
    form.value.standardFlowId = currentSop.value.id
  }
}

const fillStaffNames = (content: string) => {
  let result = content
  onboardStaff.value.forEach(staff => {
    const placeholder = `${staff.postName}`
    const replacement = `${staff.postName}（${staff.staffName}）`
    result = result.replace(new RegExp(placeholder, 'g'), replacement)
  })
  return result
}

const handleSave = async () => {
  if (!form.value.recordDate || !form.value.firstType || !form.value.secondType) {
    ElMessage.warning('请填写必填项')
    return
  }

  loading.value = true
  try {
    if (isEdit.value && route.params.id) {
      await api.schedules.update(Number(route.params.id), form.value)
      ElMessage.success('修改成功')
    } else {
      await api.schedules.create(form.value)
      ElMessage.success('创建成功')
    }
    
    // 如果标记为完成，自动生成公共案例
    if (form.value.finishStatus === 'completed' && form.value.eventDetail) {
      try {
        // 提取分类，脱敏处理
        const caseContent = form.value.eventDetail.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '***')
        await api.publicCase.create({
          caseType: form.value.secondType,
          caseContent: caseContent,
        })
      } catch (e) {
        // 静默失败
      }
    }
    
    router.push('/')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  loadData()
})
</script>
