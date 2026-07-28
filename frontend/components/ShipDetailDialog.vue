<template>
  <el-dialog
    v-model="dialogVisible"
    width="900px"
    top="5vh"
    :close-on-click-modal="false"
    :show-close="true"
    @close="handleClose"
  >
    <template #header>
      <div class="dialog-header">
        <span class="ship-name-cn">{{ shipDetail?.cnShipName || ship?.shipName || '船舶详情' }}</span>
        <span class="ship-name-en">{{ shipDetail?.enShipName || '' }}</span>
      </div>
    </template>

    <div v-loading="loadingDetail" class="ship-detail">
      <!-- 船舶基本信息（紧凑） -->
      <div v-if="shipDetail" class="ship-info-compact">
        <div class="info-row">
          <span class="info-cell"><em>船旗国</em>{{ shipDetail.flagCountry || '-' }}</span>
          <span class="info-cell"><em>船型</em>{{ shipDetail.shipType || '-' }}</span>
          <span class="info-cell"><em>载重吨</em>{{ shipDetail.deadweightTonnage || '-' }}</span>
          <span class="info-cell"><em>建造</em>{{ shipDetail.factoryDate || '-' }}</span>
          <span class="info-cell"><em>贸易</em>{{ shipDetail.tradeType || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-cell"><em>登记港</em>{{ shipDetail.portRegistry || '-' }}</span>
          <span class="info-cell"><em>派遣</em>{{ shipDetail.sendCompany || '-' }}</span>
          <span class="info-cell"><em>航次</em>{{ shipDetail.currentVoyage || '-' }}</span>
          <span class="info-cell"><em>位置</em>{{ shipDetail.currentLocation || '-' }}</span>
          <span class="info-cell"><em>ETA</em>{{ formatETA(shipDetail.eta) }}</span>
        </div>
        <div class="supervisor-row">
          <span class="sv-cell"><em>海务</em>{{ shipDetail.marineSupervisor || '-' }}</span>
          <span class="sv-cell"><em>机务</em>{{ shipDetail.engineerSupervisor || '-' }}</span>
          <span class="sv-cell"><em>电气</em>{{ shipDetail.electricSupervisor || '-' }}</span>
          <span class="sv-cell"><em>船工</em>{{ shipDetail.crewSupervisor || '-' }}</span>
          <span class="sv-cell"><em>政委</em>{{ shipDetail.politicalInstructor || shipDetail.politicalOfficerName || '-' }}</span>
        </div>
      </div>

      <!-- 书签切换：船舶报告 / 政委报告 / 交流记录 -->
      <div class="report-tabs">
        <div
          class="report-tab"
          :class="{ 'report-tab--active': activeTab === 'report' }"
          @click="activeTab = 'report'"
        >🚢 船舶报告</div>
        <div
          class="report-tab"
          :class="{ 'report-tab--active': activeTab === 'political' }"
          @click="activeTab = 'political'"
        >🧑‍✈️ 政委报告</div>
        <div
          class="report-tab"
          :class="{ 'report-tab--active': activeTab === 'notes' }"
          @click="activeTab = 'notes'"
        >📝 交流记录</div>
      </div>

      <!-- 交流记录区域 -->
      <div class="notes-section" v-show="activeTab === 'notes'">
        <div class="section-header">
          <h4 class="section-title">📝 交流记录</h4>
          <el-button type="primary" size="small" :loading="analyzing" @click="analyzeNotes">
            <el-icon><MagicStick /></el-icon> AI分析
          </el-button>
        </div>

        <!-- 筛选工具栏 -->
        <div class="notes-filter-bar">
          <el-input
            v-model="filterKeyword"
            size="small"
            placeholder="🔍 搜索关键词..."
            clearable
            style="width: 180px"
            @input="debouncedLoadNotes"
          />
          <el-select
            v-model="filterTag"
            size="small"
            placeholder="标签筛选"
            clearable
            style="width: 140px"
            @change="loadNotes"
          >
            <el-option v-for="tag in allTags" :key="tag" :label="tag" :value="tag" />
          </el-select>
          <el-select v-model="sortBy" size="small" style="width: 120px" @change="loadNotes">
            <el-option label="按时间" value="time" />
            <el-option label="按星级" value="star" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </div>

        <!-- AI分析结果 -->
        <div v-if="aiAnalysis" class="ai-analysis-result" v-html="aiAnalysis"></div>

        <!-- 历史笔记 -->
        <div class="notes-history" v-if="notes.length > 0">
          <div
            v-for="note in notes"
            :key="note.id"
            class="note-item"
            :class="{ 'note-item--diary': note.source === 'diary', 'note-item--pinned': note.isPinned }"
          >
            <div class="note-meta">
              <span class="note-pin-icon" v-if="note.isPinned" title="已置顶">📌</span>
              <span class="note-time">{{ formatNoteTime(note.createdAt) }}</span>
              <span class="note-source" :class="getSourceClass(note.source)">
                {{ getSourceLabel(note.source) }}
              </span>
              <span class="note-stars" v-if="note.source !== 'diary'">
                <el-rate
                  v-model="note.starLevel"
                  size="small"
                  :max="5"
                  :show-text="false"
                  @change="(val: number) => handleStarChange(note.id, val)"
                />
              </span>
              <div class="note-actions" v-if="note.source !== 'diary'">
                <el-button size="small" text @click="moveNote(note.id, 'top')" title="置顶">
                  ⬆️置顶
                </el-button>
                <el-button size="small" text @click="moveNote(note.id, 'up')" title="上移">
                  ↑
                </el-button>
                <el-button size="small" text @click="moveNote(note.id, 'down')" title="下移">
                  ↓
                </el-button>
                <el-button size="small" text type="primary" @click="openEditDialog(note)">编辑</el-button>
                <el-button size="small" text type="danger" @click="deleteNote(note.id)">删除</el-button>
              </div>
            </div>
            <div class="note-tags" v-if="note.tags && note.tags.length > 0">
              <el-tag
                v-for="tag in note.tags"
                :key="tag"
                size="small"
                type="info"
                effect="light"
                style="margin-right: 4px; margin-bottom: 2px"
              >
                {{ tag }}
              </el-tag>
            </div>
            <div class="note-content">{{ note.content }}</div>
          </div>
        </div>

        <div v-else-if="!loadingNotes" class="notes-empty">
          暂无记录
        </div>

        <!-- 输入区域 -->
        <div class="notes-input">
          <el-input
            v-model="newNoteContent"
            type="textarea"
            :rows="5"
            placeholder="在此粘贴微信聊天记录、会议纪要等与船舶相关的内容，Ctrl+Enter快速保存..."
            @keydown.ctrl.enter="saveNote"
          />
          <div class="input-hint">
            <div class="input-tags">
              <el-input
                v-model="newNoteTags"
                size="small"
                placeholder="标签（逗号分隔）"
                style="width: 200px"
              />
            </div>
            <div class="input-actions">
              <span class="hint-text">Ctrl+Enter 快速保存</span>
              <el-button type="primary" size="small" :loading="saving" @click="saveNote">保存</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 船舶报告区域（只读显示，粘贴操作在独立的批量粘贴入口完成） -->
      <div class="notes-section" v-show="activeTab === 'report'">
        <!-- 船舶报告 -->
        <div class="section-header">
          <h4 class="section-title">🚢 船舶报告</h4>
          <div class="report-hint">
            <span v-if="shipDetail?.dynamicUpdatedAt">
              最近更新：{{ formatNoteTime(shipDetail.dynamicUpdatedAt) }}
              <el-tag size="small" type="warning" style="margin-left: 6px">船工主管粘贴</el-tag>
            </span>
          </div>
        </div>

        <div v-if="hasDynamicData" class="dynamic-display">
          <div class="dynamic-grid">
            <div class="dyn-cell"><em>航次</em><span>{{ shipDetail?.currentVoyage || '-' }}</span></div>
            <div class="dyn-cell"><em>载货状态</em><span>{{ shipDetail?.cargoStatus || '-' }}</span></div>
            <div class="dyn-cell"><em>出发港</em><span>{{ shipDetail?.departurePort || '-' }}</span></div>
            <div class="dyn-cell"><em>目的港</em><span>{{ shipDetail?.etaPort || '-' }}</span></div>
            <div class="dyn-cell dyn-cell--wide"><em>当前状态/位置</em><span>{{ shipDetail?.currentLocation || '-' }}</span></div>
            <div class="dyn-cell"><em>ETA</em><span>{{ formatETA(shipDetail?.eta) }}</span></div>
            <div class="dyn-cell"><em>能见度</em><span>{{ shipDetail?.visibility || '-' }}</span></div>
            <div class="dyn-cell"><em>气温</em><span>{{ shipDetail?.temperature || '-' }}</span></div>
            <div class="dyn-cell"><em>风向风力</em><span>{{ (shipDetail?.windDirection || '') + (shipDetail?.windForce || '') || '-' }}</span></div>
            <div class="dyn-cell"><em>浪级</em><span>{{ shipDetail?.waveLevel || '-' }}</span></div>
            <div class="dyn-cell"><em>时区</em><span>{{ shipDetail?.timezone || '-' }}</span></div>
          </div>
          <div v-if="shipDetail?.focusPoints" class="dyn-note"><em>关注重点：</em>{{ shipDetail.focusPoints }}</div>
          <div v-if="shipDetail?.otherNotes" class="dyn-note"><em>其它说明：</em>{{ shipDetail.otherNotes }}</div>
        </div>

        <div v-else class="dynamic-empty">
          <div class="dynamic-empty-icon">🚢</div>
          <div class="dynamic-empty-text">暂无船舶报告数据</div>
          <div class="dynamic-empty-tip">请通过首页「批量粘贴船舶报告」功能导入微信报告，数据将自动分发至各船。</div>
        </div>
      </div>

      <!-- 政委报告区域（独立标签页） -->
      <div class="notes-section" v-show="activeTab === 'political'">
        <div class="section-header">
          <h4 class="section-title">🧑‍✈️ 政委报告</h4>
          <div class="report-hint">
            <span v-if="shipDetail?.politicalReport?.updatedAt">
              最近更新：{{ formatNoteTime(shipDetail.politicalReport.updatedAt) }}
              <el-tag size="small" type="success" style="margin-left: 6px">政委日记</el-tag>
            </span>
          </div>
        </div>

        <div v-if="shipDetail?.politicalReport && shipDetail.politicalReport.updatedAt" class="dynamic-display">
          <div class="political-report-content">
            <div v-if="shipDetail?.politicalReport?.voyage" class="political-row">
              <span class="political-label">航次</span>
              <span class="political-value">{{ shipDetail.politicalReport.voyage }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.location" class="political-row political-row--main">
              <span class="political-label">动态描述</span>
              <span class="political-value">{{ shipDetail.politicalReport.location }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.status" class="political-row">
              <span class="political-label">状态</span>
              <span class="political-value political-value--status">{{ shipDetail.politicalReport.status }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.etaPort" class="political-row">
              <span class="political-label">目的港</span>
              <span class="political-value">{{ shipDetail.politicalReport.etaPort }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.eta" class="political-row">
              <span class="political-label">ETA</span>
              <span class="political-value">{{ shipDetail.politicalReport.eta }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.leaveTime" class="political-row">
              <span class="political-label">离岗时间</span>
              <span class="political-value">{{ shipDetail.politicalReport.leaveTime }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.weather" class="political-row">
              <span class="political-label">天气</span>
              <span class="political-value">{{ shipDetail.politicalReport.weather }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.seaCondition" class="political-row">
              <span class="political-label">海况</span>
              <span class="political-value">{{ shipDetail.politicalReport.seaCondition }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.staffChange" class="political-row">
              <span class="political-label">人员变更</span>
              <span class="political-value">{{ shipDetail.politicalReport.staffChange }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.focusPoints" class="political-row">
              <span class="political-label">关注重点</span>
              <span class="political-value">{{ shipDetail.politicalReport.focusPoints }}</span>
            </div>
            <div v-if="shipDetail?.politicalReport?.otherNotes" class="political-row">
              <span class="political-label">备注</span>
              <span class="political-value">{{ shipDetail.politicalReport.otherNotes }}</span>
            </div>
          </div>
        </div>

        <div v-else class="dynamic-empty">
          <div class="dynamic-empty-icon">🧑‍✈️</div>
          <div class="dynamic-empty-text">暂无政委报告数据</div>
          <div class="dynamic-empty-tip">请通过首页「批量粘贴政委报告」功能导入微信报告。</div>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- 编辑笔记对话框 -->
  <el-dialog v-model="editDialogVisible" title="编辑笔记" width="500px" top="10vh">
    <el-form :model="editForm" label-position="top">
      <el-form-item label="内容">
        <el-input v-model="editForm.content" type="textarea" :rows="8" placeholder="笔记内容..." />
      </el-form-item>
      <el-form-item label="标签（逗号分隔）">
        <el-input v-model="editForm.tagsText" placeholder="例如：微信记录,会议纪要,安全检查" />
      </el-form-item>
      <el-form-item label="星级">
        <el-rate v-model="editForm.starLevel" :max="5" />
      </el-form-item>
      <el-form-item label="置顶">
        <el-switch v-model="editForm.isPinned" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="savingEdit" @click="saveEdit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { MagicStick } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ShipDynamicStatus } from '~/types'

const props = defineProps<{
  visible: boolean
  ship: ShipDynamicStatus | null
}>()

const emit = defineEmits(['update:visible', 'refresh'])

const api = useApi()
const authStore = useAuthStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val)
})

const shipDetail = ref<any>(null)
const loadingDetail = ref(false)
const notes = ref<any[]>([])
const loadingNotes = ref(false)
const newNoteContent = ref('')
const newNoteTags = ref('')
const saving = ref(false)
const analyzing = ref(false)
const aiAnalysis = ref('')

// 船舶报告书签相关状态
const activeTab = ref<'report' | 'political' | 'notes'>('report')

// 当前船舶动态数据来源与更新时间（从 shipDetail 读取，展示"谁最新以谁为准"）
const lastDynamicUpdate = computed(() => shipDetail.value?.dynamicUpdatedAt || '')
const lastDynamicSource = computed(() => shipDetail.value?.dynamicSource || '')
// 是否有动态数据（用于显示空状态提示）
const hasDynamicData = computed(() => {
  const d = shipDetail.value
  if (!d) return false
  return !!(d.currentVoyage || d.cargoStatus || d.departurePort || d.etaPort ||
    d.currentLocation || d.eta || d.visibility || d.temperature ||
    d.windDirection || d.windForce || d.waveLevel || d.timezone ||
    d.focusPoints || d.otherNotes)
})

// 筛选与排序
const filterKeyword = ref('')
const filterTag = ref('')
const sortBy = ref<'time' | 'star' | 'custom'>('time')
const allTags = ref<string[]>([])

// 编辑对话框
const editDialogVisible = ref(false)
const savingEdit = ref(false)
const editForm = ref({
  id: 0,
  content: '',
  tagsText: '',
  starLevel: 0,
  isPinned: false,
})

let debounceTimer: any = null

watch(() => props.visible, (val) => {
  if (val && props.ship) {
    loadShipDetail(props.ship.shipId)
    loadNotes(props.ship.shipId)
    loadTags(props.ship.shipId)
    aiAnalysis.value = ''
    filterKeyword.value = ''
    filterTag.value = ''
    sortBy.value = 'time'
    activeTab.value = 'report'
  }
  if (!val) {
    newNoteContent.value = ''
    newNoteTags.value = ''
    aiAnalysis.value = ''
    shipDetail.value = null
  }
})

async function loadShipDetail(shipId: number) {
  loadingDetail.value = true
  try {
    shipDetail.value = await api.ships.getOne(shipId)
  } catch (e: any) {
    console.error('加载船舶详情失败', e)
  } finally {
    loadingDetail.value = false
  }
}

async function loadNotes(shipId?: number) {
  const sid = shipId || props.ship?.shipId
  if (!sid) return
  loadingNotes.value = true
  try {
    const params: any = { sortBy: sortBy.value }
    if (filterKeyword.value) params.keyword = filterKeyword.value
    if (filterTag.value) params.tag = filterTag.value
    notes.value = await api.shipNotes.getByShipId(sid, params)
  } catch (e: any) {
    console.error('加载笔记失败', e)
  } finally {
    loadingNotes.value = false
  }
}

function debouncedLoadNotes() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    loadNotes()
  }, 300)
}

async function loadTags(shipId: number) {
  try {
    allTags.value = await api.shipNotes.getTagsByShipId(shipId)
  } catch (e: any) {
    console.error('加载标签失败', e)
  }
}

async function saveNote() {
  const content = newNoteContent.value.trim()
  if (!content || !props.ship) return

  saving.value = true
  try {
    const tags = newNoteTags.value
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
    
    await api.shipNotes.create({
      shipId: props.ship.shipId,
      userId: authStore.user?.id || 1,
      content,
      source: 'manual',
      tags: tags.length > 0 ? tags : undefined,
    })
    newNoteContent.value = ''
    newNoteTags.value = ''
    await loadNotes(props.ship!.shipId)
    await loadTags(props.ship!.shipId)
    ElMessage.success('笔记已保存')
  } catch (e: any) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteNote(noteId: number) {
  try {
    await ElMessageBox.confirm('确定删除这条笔记吗？', '确认删除', { type: 'warning' })
    await api.shipNotes.delete(noteId)
    await loadNotes(props.ship!.shipId)
    await loadTags(props.ship!.shipId)
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

async function handleStarChange(id: number, val: number) {
  try {
    await api.shipNotes.setStar(id, val)
  } catch (e: any) {
    ElMessage.error('设置星级失败')
    loadNotes()
  }
}

async function moveNote(id: number, direction: 'up' | 'down' | 'top' | 'bottom') {
  try {
    await api.shipNotes.moveOrder(id, direction, props.ship!.shipId)
    sortBy.value = 'custom'
    await loadNotes()
  } catch (e: any) {
    ElMessage.error('移动失败')
  }
}

function openEditDialog(note: any) {
  editForm.value = {
    id: note.id,
    content: note.content || '',
    tagsText: (note.tags || []).join(', '),
    starLevel: note.starLevel || 0,
    isPinned: note.isPinned || false,
  }
  editDialogVisible.value = true
}

async function saveEdit() {
  if (!editForm.value.content.trim()) {
    ElMessage.warning('内容不能为空')
    return
  }
  savingEdit.value = true
  try {
    const tags = editForm.value.tagsText
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
    
    await api.shipNotes.update(editForm.value.id, {
      content: editForm.value.content,
      tags,
      starLevel: editForm.value.starLevel,
      isPinned: editForm.value.isPinned,
    })
    editDialogVisible.value = false
    await loadNotes(props.ship!.shipId)
    await loadTags(props.ship!.shipId)
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error('保存失败')
  } finally {
    savingEdit.value = false
  }
}

async function analyzeNotes() {
  if (!props.ship) return
  analyzing.value = true
  aiAnalysis.value = ''
  try {
    const result = await api.shipNotes.getAIAnalysis(props.ship.shipId)
    if (result.success) {
      aiAnalysis.value = result.analysis
    } else {
      ElMessage.warning(result.message || '暂无数据可分析')
    }
  } catch (e: any) {
    ElMessage.error('AI分析失败：' + (e.message || '请稍后重试'))
  } finally {
    analyzing.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
}

function getSourceLabel(source: string): string {
  if (source === 'diary') return '📖 日记关联'
  if (source === 'manual') return '✍️ 手动录入'
  if (source === 'wechat') return '💬 微信记录'
  if (source === 'meeting') return '📋 会议纪要'
  return '📝 其他'
}

function getSourceClass(source: string): string {
  if (source === 'diary') return 'note-source--diary'
  if (source === 'manual') return 'note-source--manual'
  return 'note-source--other'
}

function formatETA(eta: any): string {
  if (!eta) return '-'
  const date = new Date(eta)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

function formatNoteTime(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

function diff(a: any, b: any): boolean {
  const va = String(a || '').trim()
  const vb = String(b || '').trim()
  return va && vb && va !== vb
}
</script>

<style scoped>
/* 对话框头部：船名突出 */
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ship-name-cn {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.ship-name-en {
  font-size: 13px;
  color: #909399;
  font-weight: 400;
}

.ship-detail {
  padding: 4px 0;
  max-height: 75vh;
  overflow-y: auto;
}

/* 船舶基本信息 - 紧凑布局 */
.ship-info-compact {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-bottom: 6px;
}

.info-row:last-of-type {
  margin-bottom: 8px;
}

.info-cell {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
}

.info-cell em {
  font-style: normal;
  color: #909399;
  font-size: 11px;
  margin-right: 3px;
}

.supervisor-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
}

.sv-cell {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
}

.sv-cell em {
  font-style: normal;
  color: #909399;
  font-size: 11px;
  margin-right: 3px;
}

/* 交流记录区域 - 占大部分空间 */
.notes-section {
  flex: 1;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

/* AI分析结果 */
.ai-analysis-result {
  background: linear-gradient(135deg, #f0f9ff 0%, #e8f4ff 100%);
  border: 1px solid #d0e8ff;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.7;
  color: #303133;
}

.ai-analysis-result :deep(h4) {
  font-size: 14px;
  font-weight: 700;
  color: #00508E;
  margin: 8px 0 4px 0;
}

.ai-analysis-result :deep(strong) {
  color: #00508E;
}

/* 笔记区域 */
.notes-history {
  max-height: 340px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.notes-empty {
  text-align: center;
  padding: 30px;
  color: #c0c4cc;
  font-size: 13px;
}

.note-item {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.note-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.note-item--pinned {
  background: #fff7e6;
  border-left: 3px solid #faad14;
}

.note-item--diary {
  background: #fdf6ec;
  border-left: 3px solid #e6a23c;
}

.note-item:last-child {
  margin-bottom: 0;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.note-pin-icon {
  font-size: 14px;
}

.note-time {
  font-size: 12px;
  color: #909399;
}

.note-source {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.note-source--diary {
  background: #fdf6ec;
  color: #e6a23c;
}

.note-source--manual {
  background: #ecf5ff;
  color: #409eff;
}

.note-source--other {
  background: #f0f2f5;
  color: #909399;
}

.note-stars {
  margin-left: 4px;
}

.note-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
}

.note-tags {
  margin-bottom: 6px;
}

.note-content {
  font-size: 13px;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 筛选工具栏 */
.notes-filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 0;
  align-items: center;
  flex-wrap: wrap;
}

.notes-input {
  position: relative;
}

.input-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.input-tags {
  flex: 1;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hint-text {
  font-size: 12px;
  color: #909399;
}

/* 书签切换 */
.report-tabs {
  display: flex;
  gap: 4px;
  margin: 12px 0 0;
  border-bottom: 1px solid #ebeef5;
}
.report-tab {
  padding: 8px 16px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  user-select: none;
}
.report-tab:hover {
  color: #409eff;
}
.report-tab--active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 600;
}

/* 船舶报告动态数据展示 */
.dynamic-display {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 14px;
}
.dynamic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px 14px;
}
.dyn-cell {
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dyn-cell--wide {
  grid-column: 1 / -1;
}
.dyn-cell em {
  font-style: normal;
  color: #909399;
  font-size: 11px;
}
.dyn-cell span {
  color: #303133;
  word-break: break-word;
}

.data-diff {
  color: #f56c6c !important;
  font-weight: 600;
  background: #fef0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.political-report-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid #e6f7ff;
}

.political-report-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.political-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}

.political-row--main {
  background: #fffbe6;
  padding: 10px 12px;
  border-radius: 6px;
  margin: -4px -12px;
}

.political-label {
  font-size: 12px;
  color: #909399;
  min-width: 60px;
  flex-shrink: 0;
  padding-top: 2px;
}

.political-value {
  font-size: 13px;
  color: #303133;
  flex: 1;
  word-break: break-word;
  line-height: 1.5;
}

.political-value--status {
  color: #409eff;
  font-weight: 600;
}

.dyn-note {
  font-size: 13px;
  color: #606266;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #dcdfe6;
  line-height: 1.6;
}
.dyn-note em {
  color: #909399;
  font-style: normal;
  margin-right: 4px;
}
.dynamic-empty {
  text-align: center;
  padding: 40px 20px;
}
.dynamic-empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}
.dynamic-empty-text {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}
.dynamic-empty-tip {
  font-size: 12px;
  color: #c0c4cc;
  line-height: 1.6;
}
</style>
