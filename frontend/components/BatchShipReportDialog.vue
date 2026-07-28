<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="activeTab === 'ship' ? '批量粘贴船舶报告' : '批量粘贴政委报告'"
    width="92%"
    top="3vh"
    class="batch-report-dialog"
  >
    <div class="batch-report-body">
      <!-- 书签切换 -->
      <div class="report-tabs">
        <div
          class="report-tab"
          :class="{ 'report-tab--active': activeTab === 'ship' }"
          @click="switchTab('ship')"
        >🚢 船舶报告</div>
        <div
          class="report-tab"
          :class="{ 'report-tab--active': activeTab === 'political' }"
          @click="switchTab('political')"
        >📋 政委报告</div>
      </div>

      <!-- 操作提示 -->
      <div class="report-tip">
        <strong>使用说明：</strong>
        <template v-if="activeTab === 'ship'">
          从微信群复制的船舶报告，直接粘贴到下方文本框（可一次粘贴二三十条船，连在一起即可）。点击「解析预览」后系统会自动按船名切分，匹配本团队的船舶。确认后批量更新各船的动态字段（航次/位置/ETA/天气/风浪等）。
        </template>
        <template v-else>
          从微信群复制的政委报告，直接粘贴到下方文本框（可一次粘贴多条船的政委信息）。点击「解析预览」后系统会自动按船名切分，提取政委递交的离岗/到岗/人员变更等信息。确认后批量更新。
        </template>
      </div>

      <!-- 粘贴区 -->
      <div class="paste-section">
        <div class="paste-header">
          <span class="paste-title">📋 粘贴区</span>
          <div class="paste-actions">
            <el-button type="primary" :loading="parsing" @click="parseReport">
              <el-icon><MagicStick /></el-icon> 解析预览
            </el-button>
            <el-button @click="reportText = ''; parseResult = null">清空</el-button>
          </div>
        </div>
        <el-input
          v-model="reportText"
          type="textarea"
          :rows="14"
          :placeholder="activeTab === 'ship' 
            ? '在此粘贴微信船舶报告，可一次粘贴多条船。例如：\n\n鲸鱼座（V178 GMT+8）\n满载（惠州-CHIBA)\n目前状态位置：中国南海东行航行' 
            : '在此粘贴微信政委报告，可一次粘贴多条船。例如：\n\n鲸鱼座\n政委：胡伟森\n今日动态：顺利离岗\n天气：晴\n海况：3级\n备注：无异常'"
          class="paste-textarea"
        />
        <div class="paste-footer" v-if="reportText">
          <span>字数：{{ reportText.length }}</span>
          <span v-if="parseResult" class="parse-mode-tag">
            解析方式：{{ parseResult.mode === 'ai' ? 'AI解析' : '正则解析' }}
          </span>
        </div>
      </div>

      <!-- 解析结果 -->
      <div v-if="parseResult && parseResult.items && parseResult.items.length > 0" class="parse-result-section">
        <div class="result-header">
          <span class="result-title">解析结果</span>
          <div class="result-summary">
            共 <strong>{{ parseResult.summary.total }}</strong> 艘船，
            <span class="matched-count">匹配成功 {{ parseResult.summary.matched }}</span>，
            <span class="unmatched-count">未匹配 {{ parseResult.summary.unmatched }}</span>
          </div>
          <div class="result-actions">
            <el-checkbox v-model="selectAllMatched">全选匹配</el-checkbox>
            <el-button type="success" :loading="batchSaving" :disabled="selectedCount === 0" @click="confirmBatchUpdate">
              确认更新 {{ selectedCount }} 艘船舶动态
            </el-button>
          </div>
        </div>

        <!-- 未匹配提示 -->
        <el-alert
          v-if="parseResult.summary.unmatched > 0"
          type="warning"
          :closable="false"
          class="unmatched-alert"
        >
          有 {{ parseResult.summary.unmatched }} 艘船未匹配，可能是船名与系统不一致或格式异常，请检查后手动处理。
        </el-alert>

        <!-- 船舶列表 -->
        <div class="ship-list">
          <div
            v-for="(item, idx) in parseResult.items"
            :key="idx"
            class="ship-item"
            :class="{ 'ship-item--unmatched': !item.matched, 'ship-item--selected': item.matched && item.selected }"
          >
            <div class="ship-item-header">
              <el-checkbox v-if="item.matched" v-model="item.selected" />
              <el-icon v-else><WarningFilled /></el-icon>
              <span class="ship-name">{{ item.shipName || item.parsed.shipName }}</span>
              <el-tag v-if="item.matched" type="success" size="small">已匹配</el-tag>
              <el-tag v-else type="danger" size="small">未匹配</el-tag>
              <span class="ship-voyage" v-if="item.parsed.voyage">{{ item.parsed.voyage }}</span>
            </div>

            <!-- 船舶报告字段 -->
            <div v-if="item.matched && activeTab === 'ship'" class="ship-fields">
              <span class="field"><em>载货</em>{{ item.parsed.cargoStatus || '-' }}</span>
              <span class="field"><em>出发港</em>{{ item.parsed.departurePort || '-' }}</span>
              <span class="field"><em>目的港</em>{{ item.parsed.etaPort || '-' }}</span>
              <span class="field"><em>位置</em>{{ item.parsed.currentLocation || '-' }}</span>
              <span class="field"><em>能见度</em>{{ item.parsed.visibility || '-' }}</span>
              <span class="field"><em>气温</em>{{ item.parsed.temperature || '-' }}</span>
              <span class="field"><em>风</em>{{ (item.parsed.windDirection || '') + (item.parsed.windForce || '') || '-' }}</span>
              <span class="field"><em>浪</em>{{ item.parsed.waveLevel || '-' }}</span>
              <span class="field"><em>时区</em>{{ item.parsed.timezone || '-' }}</span>
              <span class="field"><em>ETA</em>{{ item.parsed.eta || '-' }} {{ item.parsed.etaTimezone || '' }}</span>
            </div>

            <!-- 政委报告字段 -->
            <div v-if="item.matched && activeTab === 'political'" class="ship-fields">
              <span class="field"><em>航次</em>{{ item.parsed.voyage || '-' }}</span>
              <span class="field"><em>状态</em>{{ item.parsed.status || '-' }}</span>
              <span class="field"><em>位置</em>{{ item.parsed.location || '-' }}</span>
              <span class="field"><em>目的港</em>{{ item.parsed.etaPort || '-' }}</span>
              <span class="field"><em>ETA</em>{{ item.parsed.eta || '-' }}</span>
              <span class="field"><em>离岗时间</em>{{ item.parsed.leaveTime || '-' }}</span>
              <span class="field"><em>天气</em>{{ item.parsed.weather || '-' }}</span>
              <span class="field"><em>海况</em>{{ item.parsed.seaCondition || '-' }}</span>
              <span class="field"><em>人员变更</em>{{ item.parsed.staffChange || '-' }}</span>
              <span class="field"><em>备注</em>{{ item.parsed.remark || '-' }}</span>
            </div>

            <div v-if="item.parsed.otherNotes" class="ship-note"><em>其它说明：</em>{{ item.parsed.otherNotes }}</div>
            <div v-if="item.parsed.focusPoints" class="ship-note"><em>关注重点：</em>{{ item.parsed.focusPoints }}</div>
          </div>
        </div>

        <div class="confirm-bar">
          <el-button type="success" size="large" :loading="batchSaving" :disabled="selectedCount === 0" @click="confirmBatchUpdate">
            <el-icon><Check /></el-icon> 确认更新 {{ selectedCount }} 艘船舶动态
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, Check, WarningFilled } from '@element-plus/icons-vue'
import { useApi } from '~/composables/useApi'

const api = useApi()

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['update:visible', 'success'])

const activeTab = ref<'ship' | 'political'>('ship')
const reportText = ref('')
const parsing = ref(false)
const parseResult = ref<any>(null)
const batchSaving = ref(false)

// 切换书签时清空内容
function switchTab(tab: 'ship' | 'political') {
  if (tab !== activeTab.value) {
    activeTab.value = tab
    reportText.value = ''
    parseResult.value = null
  }
}

// 弹窗关闭时重置
watch(() => props.visible, (val) => {
  if (!val) {
    activeTab.value = 'ship'
    reportText.value = ''
    parseResult.value = null
  }
})

// 全选/反选匹配的船
const selectAllMatched = computed({
  get() {
    const matched = parseResult.value?.items?.filter((i: any) => i.matched) || []
    return matched.length > 0 && matched.every((i: any) => i.selected)
  },
  set(val: boolean) {
    if (parseResult.value?.items) {
      parseResult.value.items.forEach((item: any) => {
        if (item.matched) item.selected = val
      })
    }
  },
})

const selectedCount = computed(() => {
  return parseResult.value?.items?.filter((i: any) => i.matched && i.selected).length || 0
})

// 解析粘贴的报告（船舶报告/政委报告）
async function parseReport() {
  const text = reportText.value.trim()
  if (!text) {
    ElMessage.warning(activeTab.value === 'ship' ? '请先粘贴船舶报告内容' : '请先粘贴政委报告内容')
    return
  }
  parsing.value = true
  parseResult.value = null
  try {
    const apiMethod = activeTab.value === 'ship' ? api.ships.parseReport : api.ships.parsePoliticalReport
    const result = await apiMethod(text)
    if (result.success && result.items && result.items.length > 0) {
      result.items.forEach((item: any) => {
        item.selected = item.matched
      })
      parseResult.value = result
      if (result.summary.unmatched > 0) {
        ElMessage.warning(`解析完成：${result.summary.matched} 艘匹配，${result.summary.unmatched} 艘未匹配`)
      } else {
        ElMessage.success(`解析完成，共 ${result.summary.matched} 艘船匹配成功`)
      }
    } else {
      ElMessage.warning(result.message || '未能解析出船舶信息，请检查文本格式')
    }
  } catch (e: any) {
    ElMessage.error('解析失败：' + (e.message || '请稍后重试'))
  } finally {
    parsing.value = false
  }
}

// 确认批量更新
async function confirmBatchUpdate() {
  if (!parseResult.value) return
  const selectedItems = parseResult.value.items.filter((i: any) => i.matched && i.selected)
  if (selectedItems.length === 0) {
    ElMessage.warning('请至少选择一艘船进行更新')
    return
  }

  const reportType = activeTab.value === 'ship' ? '船舶动态信息' : '政委报告信息'
  try {
    await ElMessageBox.confirm(
      `确认将解析出的${reportType}更新到 ${selectedItems.length} 艘船？`,
      '确认更新',
      { type: 'warning' }
    )
  } catch {
    return
  }

  batchSaving.value = true
  try {
    const updates = selectedItems.map((item: any) => ({
      shipId: item.shipId,
      parsed: item.parsed,
    }))
    const apiMethod = activeTab.value === 'ship' ? api.ships.batchUpdateDynamic : api.ships.batchUpdatePolitical
    const result = await apiMethod(updates)
    if (result.success) {
      ElMessage.success(`更新完成：成功 ${result.summary.success} 艘，失败 ${result.summary.failed} 艘`)
      emit('success')
      emit('update:visible', false)
      parseResult.value = null
      reportText.value = ''
    } else {
      ElMessage.error('更新失败')
    }
  } catch (e: any) {
    ElMessage.error('更新失败：' + (e.message || '请稍后重试'))
  } finally {
    batchSaving.value = false
  }
}
</script>

<style scoped>
.batch-report-body {
  max-height: 82vh;
  overflow-y: auto;
  padding: 0 4px;
}

.report-tabs {
  display: flex;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 3px;
}

.report-tab {
  flex: 1;
  padding: 10px 16px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.report-tab:hover {
  color: #409eff;
}

.report-tab--active {
  background: #409eff;
  color: #fff;
}

.report-tip {
  margin-bottom: 14px;
  padding: 10px 14px;
  background: #ecf5ff;
  border-left: 3px solid #409eff;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.paste-section {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}
.paste-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.paste-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}
.paste-actions {
  display: flex;
  gap: 8px;
}
.paste-textarea :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.7;
}
.paste-footer {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 16px;
}
.parse-mode-tag {
  color: #409eff;
}

.parse-result-section {
  margin-top: 16px;
}
.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.result-title {
  font-weight: 600;
  font-size: 15px;
}
.result-summary {
  font-size: 13px;
  color: #606266;
}
.matched-count { color: #67c23a; font-weight: 600; }
.unmatched-count { color: #f56c6c; font-weight: 600; }
.result-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.unmatched-alert {
  margin-bottom: 12px;
}

.ship-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 10px;
}
.ship-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fff;
}
.ship-item--unmatched {
  border-color: #fde2e2;
  background: #fef0f0;
}
.ship-item--selected {
  border-color: #b3e19d;
  background: #f0f9eb;
}
.ship-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.ship-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.ship-voyage {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}
.ship-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 3px 10px;
  font-size: 12px;
  color: #606266;
}
.field em {
  color: #909399;
  font-style: normal;
  margin-right: 4px;
}
.ship-note {
  font-size: 12px;
  color: #606266;
  margin-top: 4px;
  line-height: 1.5;
}
.ship-note em {
  color: #909399;
  font-style: normal;
}

.confirm-bar {
  margin-top: 16px;
  text-align: center;
}
</style>
