<template>
  <div class="sanlv-container">
    <!-- 标题栏 -->
    <div class="sanlv-header">
      <h1>📊 三率指数分析</h1>
      <p class="subtitle">
        Step 1 · 先导入「三率评分规则」；Step 2 · 再导入单船某月「三率月报」。
        两份表都导入成功后，下一步自动分析薄弱项和改进建议（等陈先生贴两份表的真实数据格式后开发分析引擎）。
      </p>
      <el-button link @click="goBackToolbox">← 返回工具箱</el-button>
    </div>

    <!-- Tabs: 两个入口 -->
    <el-tabs v-model="activeTab" type="border-card" class="sanlv-tabs">
      <!-- ================== Tab 1: 评分规则导入 ================== -->
      <el-tab-pane label="📘 ① 导入三率评分规则" name="rule">
        <div class="tab-inner">
          <div class="tip">
            <el-alert type="info" :closable="false" show-icon>
              <template #title>
                支持三种方式导入：<b>Excel(.xlsx / .xls)</b> · <b>CSV 文件</b> · <b>直接粘贴文本(TSV/CSV)</b>
                &nbsp;&nbsp;导入后请务必先「预览解析结果」，确认格式无误后再点击「保存为新规则版本」。
              </template>
            </el-alert>
          </div>

          <el-form label-width="100px" class="meta-form">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="12">
                <el-form-item label="规则名称">
                  <el-input v-model="ruleForm.ruleName" placeholder="例：2026年版三率评分标准（试行）" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="6">
                <el-form-item label="版本号">
                  <el-input v-model="ruleForm.ruleVersion" placeholder="例：v2026.08" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="6">
                <el-form-item label="适用年份">
                  <el-input-number v-model="ruleForm.ruleYear" :min="2020" :max="2100" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="备注说明">
                  <el-input v-model="ruleForm.ruleRemark" type="textarea" :rows="2" placeholder="非必填，可填本版规则的特殊说明" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <ImportUploader
            title="上传评分规则 Excel/CSV"
            paste-tip="粘贴评分规则表格（Tab分隔，可从 Excel/WPS 整表复制）"
            @preview-request="onRulePreviewRequest"
            @file-change="ruleForm.fileName = $event?.name || ''"
          />

          <div class="actions-bar" v-if="rulePreview.matrix.length">
            <el-tag type="success" v-if="!rulePreview.error">
              ✅ 解析成功：表头 {{ rulePreview.headers.length }} 列，数据 {{ rulePreview.totalRows }} 行
              <template v-if="rulePreview.sourceName">，文件：{{ rulePreview.sourceName }}</template>
            </el-tag>
            <el-tag type="danger" v-else>❌ 解析失败：{{ rulePreview.error || '未知错误' }}</el-tag>
            <el-space style="margin-left: auto;">
              <el-button type="primary" :disabled="!!rulePreview.error || rulePreview.totalRows <= 0" @click="doRuleSave">
                💾 保存为新规则版本
              </el-button>
            </el-space>
          </div>

          <DataPreview
            v-if="rulePreview.matrix.length"
            :headers="rulePreview.headers"
            :rows="rulePreview.matrix.slice(0, 20)"
            :total-rows="rulePreview.matrix.length"
          />

          <div class="history-section">
            <h3>📚 已保存的规则版本</h3>
            <el-table :data="ruleList.items" stripe size="default" v-loading="ruleList.loading" style="width:100%">
              <el-table-column label="#" type="index" width="50" />
              <el-table-column label="生效">
                <template #default="{row}">
                  <el-tag v-if="row.isCurrent" type="success" effect="dark" round>当前生效</el-tag>
                  <el-tag v-else type="info" round>历史</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="ruleName" label="规则名称" min-width="220" />
              <el-table-column prop="ruleVersion" label="版本号" width="120" />
              <el-table-column prop="ruleYear" label="适用年" width="80" />
              <el-table-column label="条目数" width="90">
                <template #default="{row}">{{ arrayLen(row.items) }}</template>
              </el-table-column>
              <el-table-column label="上传者" width="120">
                <template #default="{row}">{{ row.user?.realName || row.user?.username || '—' }}</template>
              </el-table-column>
              <el-table-column prop="createdAt" label="创建时间" width="160">
                <template #default="{row}">{{ fmtDate(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{row}">
                  <el-button link type="primary" size="small" v-if="!row.isCurrent" @click="setRuleCurrent(row.id)">设为当前</el-button>
                  <el-button link type="danger" size="small" @click="deleteRule(row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- ================== Tab 2: 船舶三率月报导入 ================== -->
      <el-tab-pane label="📗 ② 导入船舶三率月报" name="report">
        <div class="tab-inner">
          <div class="tip">
            <el-alert type="info" :closable="false" show-icon>
              <template #title>
                导入某一艘船某一个月的三率评分月报。支持：<b>Excel(.xlsx / .xls)</b> · <b>CSV 文件</b> · <b>粘贴文本</b>
                &nbsp;&nbsp;船名、月份是必填的；系统会根据文件内容尝试自动识别，请核对后再保存。
              </template>
            </el-alert>
          </div>

          <el-form label-width="110px" class="meta-form">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="8">
                <el-form-item label="船舶名称" required>
                  <el-input v-model="reportForm.shipName" placeholder="例：华川" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="8">
                <el-form-item label="统计月份" required>
                  <el-date-picker
                    v-model="reportForm.reportMonth"
                    type="month"
                    value-format="YYYY-MM"
                    placeholder="选择月份"
                    style="width: 100%;"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="8">
                <el-form-item label="绑定评分规则">
                  <el-select v-model="reportForm.ruleId" placeholder="(可选)关联哪套评分规则" clearable style="width:100%">
                    <el-option
                      v-for="r in ruleList.items"
                      :key="r.id"
                      :label="`${r.ruleName}${r.isCurrent ? ' [当前生效]' : ''}`"
                      :value="r.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :xs="24" :sm="6">
                <el-form-item label="总分">
                  <el-input-number v-model="reportForm.totalScore" :precision="2" :step="0.5" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="6">
                <el-form-item label="合格线">
                  <el-input-number v-model="reportForm.passScore" :precision="2" :step="0.5" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="4">
                <el-form-item label="三率1名">
                  <el-input v-model="reportForm.labelRate1" placeholder="如：合规率" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="2">
                <el-form-item label="数值">
                  <el-input-number v-model="reportForm.threeRate1" :precision="2" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="4">
                <el-form-item label="三率2名">
                  <el-input v-model="reportForm.labelRate2" placeholder="如：出勤率" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="2">
                <el-form-item label="数值">
                  <el-input-number v-model="reportForm.threeRate2" :precision="2" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <ImportUploader
            title="上传船舶三率月报 Excel/CSV"
            paste-tip="粘贴月报表格（从 Excel/WPS 整表复制后直接粘贴到下方文本框）"
            @preview-request="onReportPreviewRequest"
            @file-change="reportForm.fileName = $event?.name || ''"
          />

          <div class="actions-bar" v-if="reportPreview.matrix.length">
            <el-tag type="success" v-if="!reportPreview.error">
              ✅ 解析成功：表头 {{ reportPreview.headers.length }} 列，数据 {{ reportPreview.totalRows }} 行
              <template v-if="reportPreview.sourceName">，文件：{{ reportPreview.sourceName }}</template>
            </el-tag>
            <el-tag type="danger" v-else>❌ 解析失败：{{ reportPreview.error || '未知错误' }}</el-tag>
            <el-space style="margin-left: auto;">
              <el-button type="primary" :disabled="!!reportPreview.error || !canSaveReport" @click="doReportSave">
                💾 保存本月月报
              </el-button>
            </el-space>
          </div>

          <DataPreview
            v-if="reportPreview.matrix.length"
            :headers="reportPreview.headers"
            :rows="reportPreview.matrix.slice(0, 20)"
            :total-rows="reportPreview.matrix.length"
          />

          <div class="history-section">
            <h3>📚 已保存的月报（最近 30 条）</h3>
            <el-table :data="reportList.items" stripe size="default" v-loading="reportList.loading" style="width:100%">
              <el-table-column label="#" type="index" width="50" />
              <el-table-column prop="shipName" label="船舶" width="120" />
              <el-table-column prop="reportMonth" label="月份" width="110" />
              <el-table-column label="三率总分" width="110">
                <template #default="{row}">
                  <span v-if="row.totalScore != null" :class="{'bad-score': row.passScore!=null && row.totalScore < row.passScore}">
                    {{ row.totalScore }}<small v-if="row.passScore!=null"> / {{row.passScore}}</small>
                  </span>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column label="三率分项" min-width="240">
                <template #default="{row}">
                  <el-tag v-if="row.labelRate1 || row.threeRate1 != null" size="small" style="margin-right:4px;">
                    {{ row.labelRate1 || '三率1' }}: {{ row.threeRate1 ?? '—' }}
                  </el-tag>
                  <el-tag v-if="row.labelRate2 || row.threeRate2 != null" size="small" type="warning" style="margin-right:4px;">
                    {{ row.labelRate2 || '三率2' }}: {{ row.threeRate2 ?? '—' }}
                  </el-tag>
                  <el-tag v-if="row.labelRate3 || row.threeRate3 != null" size="small" type="danger">
                    {{ row.labelRate3 || '三率3' }}: {{ row.threeRate3 ?? '—' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="规则版本" min-width="180">
                <template #default="{row}">{{ row.rule?.ruleName || '(未关联)' }}</template>
              </el-table-column>
              <el-table-column label="上传者" width="100">
                <template #default="{row}">{{ row.user?.realName || '—' }}</template>
              </el-table-column>
              <el-table-column prop="createdAt" label="上传时间" width="160">
                <template #default="{row}">{{ fmtDate(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{row}">
                  <el-button link type="danger" size="small" @click="deleteReport(row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { api } = useApi();
const ElMessage = (window as any).ElMessage || { success: console.log, error: console.error, warning: console.warn };

const activeTab = ref<'rule' | 'report'>('rule');
const todayYM = computed(() => {
  // 安全：客户端渲染后才计算；SSR 返回 null
  return null as unknown as string;
});

// ============ 评分规则 ============
const ruleForm = reactive({
  fileContent: '' as string,
  fileName: '' as string,
  text: '' as string,
  ruleName: '',
  ruleVersion: '',
  ruleYear: null as number | null,
  ruleRemark: '',
  sourceType: 'excel' as 'excel' | 'csv' | 'paste',
  isCurrent: true,
});

const rulePreview = reactive<{
  headers: string[];
  matrix: any[][];
  totalRows: number;
  sourceName?: string;
  error?: string;
}>({
  headers: [],
  matrix: [],
  totalRows: 0,
});

const ruleList = reactive<{
  loading: boolean;
  items: any[];
  total: number;
}>({ loading: false, items: [], total: 0 });

// ============ 月报 ============
const reportForm = reactive({
  fileContent: '' as string,
  fileName: '' as string,
  text: '' as string,
  sourceType: 'excel' as 'excel' | 'csv' | 'paste',
  shipName: '',
  reportMonth: '' as string,
  reportYear: null as number | null,
  ruleId: null as number | null,
  totalScore: null as number | null,
  passScore: null as number | null,
  labelRate1: '',
  threeRate1: null as number | null,
  labelRate2: '',
  threeRate2: null as number | null,
  labelRate3: '',
  threeRate3: null as number | null,
});

const reportPreview = reactive<{
  headers: string[];
  matrix: any[][];
  totalRows: number;
  sourceName?: string;
  sheetName?: string;
  error?: string;
  detected?: any;
}>({
  headers: [],
  matrix: [],
  totalRows: 0,
});

const reportList = reactive<{ loading: boolean; items: any[]; total: number }>({
  loading: false,
  items: [],
  total: 0,
});

const canSaveReport = computed(
  () =>
    reportPreview.totalRows > 0 &&
    !reportPreview.error &&
    reportForm.shipName.trim() !== '' &&
    /^\d{4}-\d{2}$/.test(reportForm.reportMonth),
);

// ============ 事件 ============
function goBackToolbox() {
  // 按三层兜底来
  const targetPath = '/toolbox';
  let watchdogFired = false;
  const watchdog = setTimeout(() => {
    watchdogFired = true;
    window.location.href = targetPath;
  }, 1500);
  try {
    router.push(targetPath)
      .then(() => { if (!watchdogFired) clearTimeout(watchdog); })
      .catch(() => { if (!watchdogFired) { clearTimeout(watchdog); window.location.href = targetPath; } });
  } catch {
    if (!watchdogFired) { clearTimeout(watchdog); window.location.href = targetPath; }
  }
}

async function onRulePreviewRequest(req: any) {
  ruleForm.fileContent = req.fileContent || '';
  ruleForm.fileName = req.fileName || '';
  ruleForm.text = req.text || '';
  ruleForm.sourceType = req.fileContent ? 'excel' : 'paste';

  const res = await api.sanlvRules.preview({
    fileContent: req.fileContent,
    fileName: req.fileName,
    text: req.text,
  });
  rulePreview.headers = (res as any).headers || [];
  rulePreview.matrix = (res as any).matrix || [];
  rulePreview.totalRows = (res as any).totalRows ?? 0;
  rulePreview.sourceName = (res as any).sourceName;
  rulePreview.error = (res as any).error;
  if ((res as any).error) ElMessage.error('预览解析失败：' + (res as any).error);
  else ElMessage.success(`解析成功，共 ${rulePreview.totalRows} 行数据（仅预览前 20 行）`);
}

async function doRuleSave() {
  try {
    const res: any = await api.sanlvRules.import({
      fileContent: ruleForm.fileContent,
      fileName: ruleForm.fileName,
      text: ruleForm.text,
      sourceType: ruleForm.sourceType,
      sourceName: ruleForm.fileName,
      ruleName: ruleForm.ruleName,
      ruleVersion: ruleForm.ruleVersion,
      ruleYear: ruleForm.ruleYear,
      ruleRemark: ruleForm.ruleRemark,
      isCurrent: ruleForm.isCurrent,
    });
    ElMessage.success(`✅ 评分规则导入成功！版本ID=${res.ruleId}，共写入 ${res.importSummary?.totalRows ?? 0} 条评分项目`);
    resetRuleForm();
    await loadRuleList();
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || String(e)));
  }
}

function resetRuleForm() {
  ruleForm.fileContent = '';
  ruleForm.fileName = '';
  ruleForm.text = '';
  ruleForm.ruleName = '';
  ruleForm.ruleVersion = '';
  rulePreview.headers = [];
  rulePreview.matrix = [];
  rulePreview.totalRows = 0;
  rulePreview.error = undefined;
  rulePreview.sourceName = undefined;
}

async function loadRuleList() {
  ruleList.loading = true;
  try {
    const res: any = await api.sanlvRules.list();
    ruleList.items = res.items || [];
    ruleList.total = res.total || 0;
  } finally {
    ruleList.loading = false;
  }
}

async function setRuleCurrent(id: number) {
  try {
    await api.sanlvRules.setCurrent(id);
    ElMessage.success('已设为当前生效版本');
    await loadRuleList();
  } catch (e: any) {
    ElMessage.error('操作失败：' + (e?.message || String(e)));
  }
}

async function deleteRule(id: number) {
  try {
    await api.sanlvRules.remove(id);
    ElMessage.success('已删除');
    await loadRuleList();
  } catch (e: any) {
    ElMessage.error('删除失败：' + (e?.message || String(e)));
  }
}

async function onReportPreviewRequest(req: any) {
  reportForm.fileContent = req.fileContent || '';
  reportForm.fileName = req.fileName || '';
  reportForm.text = req.text || '';
  reportForm.sourceType = req.fileContent ? 'excel' : 'paste';

  const res: any = await api.sanlvReports.preview({
    fileContent: req.fileContent,
    fileName: req.fileName,
    text: req.text,
  });
  reportPreview.headers = res.headers || [];
  reportPreview.matrix = res.matrix || [];
  reportPreview.totalRows = res.totalRows ?? 0;
  reportPreview.sourceName = res.sourceName;
  reportPreview.sheetName = res.sheetName;
  reportPreview.error = res.error;
  reportPreview.detected = res.detected || {};

  // 自动回填识别到的字段（仅当用户还没填时）
  const d = reportPreview.detected;
  if (d && d.shipName && !reportForm.shipName) reportForm.shipName = d.shipName;
  if (d && d.reportMonth && !reportForm.reportMonth) reportForm.reportMonth = d.reportMonth;
  if (d && d.reportYear && reportForm.reportYear == null) reportForm.reportYear = d.reportYear;
  if (d && d.totalScore != null && reportForm.totalScore == null) reportForm.totalScore = d.totalScore;
  if (d && d.passScore != null && reportForm.passScore == null) reportForm.passScore = d.passScore;
  if (d && d.labelRate1 && !reportForm.labelRate1) reportForm.labelRate1 = d.labelRate1;
  if (d && d.rate1 != null && reportForm.threeRate1 == null) reportForm.threeRate1 = d.rate1;
  if (d && d.labelRate2 && !reportForm.labelRate2) reportForm.labelRate2 = d.labelRate2;
  if (d && d.rate2 != null && reportForm.threeRate2 == null) reportForm.threeRate2 = d.rate2;

  if (res.error) ElMessage.error('预览解析失败：' + res.error);
  else {
    let msg = `✅ 解析成功，共 ${reportPreview.totalRows} 行`;
    if (d?.shipName) msg += ` · 船名已自动填「${d.shipName}」`;
    if (d?.reportMonth) msg += ` · 月份「${d.reportMonth}」`;
    msg += '。请核对表单中的船名、月份和三率分数是否正确。';
    ElMessage.success(msg);
  }
}

async function doReportSave() {
  if (!reportForm.shipName.trim()) return ElMessage.warning('请先填写船舶名称');
  if (!/^\d{4}-\d{2}$/.test(reportForm.reportMonth)) return ElMessage.warning('请选择正确的统计月份（YYYY-MM）');
  try {
    const year = parseInt(reportForm.reportMonth.slice(0, 4), 10);
    const res: any = await api.sanlvReports.import({
      fileContent: reportForm.fileContent,
      fileName: reportForm.fileName,
      text: reportForm.text,
      sourceType: reportForm.sourceType,
      sourceName: reportForm.fileName,

      shipName: reportForm.shipName.trim(),
      reportMonth: reportForm.reportMonth,
      reportYear: reportForm.reportYear ?? year,
      ruleId: reportForm.ruleId,
      totalScore: reportForm.totalScore,
      passScore: reportForm.passScore,
      labelRate1: reportForm.labelRate1,
      threeRate1: reportForm.threeRate1,
      labelRate2: reportForm.labelRate2,
      threeRate2: reportForm.threeRate2,
      labelRate3: reportForm.labelRate3,
      threeRate3: reportForm.threeRate3,
    });
    ElMessage.success(`✅ 月报导入成功！月报ID=${res.reportId}，共 ${res.importSummary?.totalRows ?? 0} 条评分明细`);
    resetReportForm();
    await loadReportList();
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || String(e)));
  }
}

function resetReportForm() {
  reportForm.fileContent = '';
  reportForm.fileName = '';
  reportForm.text = '';
  reportPreview.headers = [];
  reportPreview.matrix = [];
  reportPreview.totalRows = 0;
  reportPreview.error = undefined;
  reportPreview.detected = {};
  reportForm.totalScore = null;
  reportForm.passScore = null;
  reportForm.labelRate1 = reportForm.labelRate2 = reportForm.labelRate3 = '';
  reportForm.threeRate1 = reportForm.threeRate2 = reportForm.threeRate3 = null;
}

async function loadReportList() {
  reportList.loading = true;
  try {
    const res: any = await api.sanlvReports.list();
    reportList.items = res.items || [];
    reportList.total = res.total || 0;
  } finally {
    reportList.loading = false;
  }
}

async function deleteReport(id: number) {
  try {
    await api.sanlvReports.remove(id);
    ElMessage.success('已删除');
    await loadReportList();
  } catch (e: any) {
    ElMessage.error('删除失败：' + (e?.message || String(e)));
  }
}

// ============ 工具 ============
function arrayLen(arr: any) {
  if (!Array.isArray(arr)) {
    try { return Array.isArray(JSON.parse(arr || '[]')) ? JSON.parse(arr).length : 0; }
    catch { return 0; }
  }
  return arr.length;
}
function fmtDate(s: any) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d as any)) return String(s).slice(0, 16);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
    + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

// ============ 子组件 ============
// --- 导入上传器（三合一：文件选择 + 拖拽 + 粘贴）---
const ImportUploader = {
  props: {
    title: { type: String, required: true },
    pasteTip: { type: String, default: '' },
  },
  emits: ['preview-request', 'file-change'],
  setup(props, ctx) {
    const inputEl = ref<HTMLInputElement | null>(null);
    const pasteText = ref('');
    const importMode = ref<'file' | 'paste'>('file');
    const fileInfo = ref('');

    async function readFileAsBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(((e.target?.result as string) || '').split(',')[1] || '');
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });
    }

    async function onFilesChosen(files: FileList | File[]) {
      const file = Array.from(files)[0];
      if (!file) return;
      const okExt = /\.(xlsx|xls|csv)$/i.test(file.name);
      if (!okExt) return ElMessage.warning('文件格式仅支持 .xlsx / .xls / .csv');
      fileInfo.value = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
      ctx.emit('file-change', file);
      try {
        const base64 = await readFileAsBase64(file);
        ctx.emit('preview-request', {
          fileContent: base64,
          fileName: file.name,
          text: '',
        });
      } catch (e: any) {
        ElMessage.error('文件读取失败：' + (e?.message || String(e)));
      }
    }

    function doPasteRequest() {
      const t = pasteText.value.trim();
      if (!t) return ElMessage.warning('请先粘贴表格内容');
      ctx.emit('preview-request', {
        fileContent: '',
        fileName: '',
        text: t,
      });
    }

    // 全局拖拽支持
    let dragCounter = 0;
    function onWinDrag(e: DragEvent) { e.preventDefault(); }
    function onWinDrop(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) onFilesChosen(e.dataTransfer.files);
    }

    onMounted(() => {
      window.addEventListener('dragover', onWinDrag);
      window.addEventListener('drop', onWinDrop);
    });

    return { inputEl, pasteText, importMode, fileInfo, onFilesChosen, doPasteRequest, onWinDrag, onWinDrop };
  },
  template: `
    <div class="import-uploader">
      <div class="uploader-title">📥 {{ title }}</div>

      <el-radio-group v-model="importMode" size="default" style="margin-bottom:12px;">
        <el-radio-button label="file">📎 上传文件 / 拖拽到窗口任意位置</el-radio-button>
        <el-radio-button label="paste">📋 粘贴文本（TSV / CSV）</el-radio-button>
      </el-radio-group>

      <div v-if="importMode === 'file'" class="upload-dropzone"
        @click="inputEl && inputEl.click()"
        @dragover.prevent
        @drop.prevent="onFilesChosen($event.dataTransfer?.files || [])">
        <input ref="inputEl" type="file" accept=".xlsx,.xls,.csv" style="display:none"
          @change="onFilesChosen($event.target.files || [])" />
        <div class="dz-icon">☁️</div>
        <div class="dz-main">点击选择 Excel / CSV 文件，或直接把文件拖拽到浏览器窗口内任意位置</div>
        <div class="dz-sub">支持：.xlsx / .xls / .csv（文件大小建议 ≤ 10MB）</div>
        <div class="dz-file" v-if="fileInfo">✅ 已选文件：{{ fileInfo }}</div>
      </div>

      <div v-else class="paste-zone">
        <div style="margin-bottom:8px;font-weight:600;">{{ pasteTip || '直接粘贴表格内容：' }}</div>
        <el-input
          v-model="pasteText"
          type="textarea"
          :rows="8"
          placeholder="从 Excel/WPS/飞书表格/Google Sheet 选中区域 → Ctrl+C → 回到这里 Ctrl+V 直接粘贴&#10;支持 Tab 分隔 (TSV) / 逗号分隔 (CSV)"
        />
        <el-button type="primary" plain style="margin-top:10px;" @click="doPasteRequest">🔍 预览解析结果</el-button>
      </div>
    </div>
  `,
};

// --- 数据预览表格 ---
const DataPreview = {
  props: {
    headers: { type: Array as () => string[], required: true },
    rows: { type: Array as () => any[][], required: true },
    totalRows: { type: Number, default: 0 },
  },
  setup(props) {
    return {
      displayHeaders: computed(() => (props.headers.length ? props.headers : (props.rows[0] || []).map((_, i) => `第${i+1}列`))),
    };
  },
  template: `
    <div class="data-preview">
      <div class="pv-head">
        🔍 预览：<b>前 {{ rows.length }} 行</b>
        <span v-if="totalRows > rows.length"> · （原表共 {{ totalRows+1 }} 行，完整数据已保存到后端）</span>
      </div>
      <div class="pv-wrap">
        <el-table :data="rows.map((r,idx) => Object.assign({ __idx: idx }, headers.reduce((o,h,i)=>(o[h||('col_'+i)] = r[i], o), {})))"
          border stripe size="small" max-height="360" style="width:100%">
          <el-table-column label="#" width="50" type="index" />
          <el-table-column v-for="(h, i) in displayHeaders" :key="i"
            :prop="h || ('col_'+i)" :label="h || ('第'+(i+1)+'列')"
            min-width="120" show-overflow-tooltip />
        </el-table>
      </div>
    </div>
  `,
};

// ============ 初始化（严格铁律 N5：非确定性放 onMounted）============
onMounted(async () => {
  ruleForm.ruleYear = new Date().getFullYear();
  reportForm.reportYear = new Date().getFullYear();
  const d = new Date();
  reportForm.reportMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  try { ElMessage = (window as any).ElMessage || ElMessage; } catch {}
  await loadRuleList();
  await loadReportList();
});
</script>

<style scoped>
.sanlv-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
.sanlv-header {
  display: flex; flex-direction: column; gap: 6px;
  padding: 18px 22px; border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #e0e7ff 100%);
  border: 1px solid #bfdbfe; margin-bottom: 20px; position: relative;
}
.sanlv-header h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
.sanlv-header .subtitle { margin: 0; color: #1e40af; font-size: 13px; line-height: 1.5; }
.sanlv-header > a { position: absolute; right: 18px; top: 22px; }

.sanlv-tabs :deep(.el-tabs__content) { padding: 4px 0 0; }
.tab-inner { display: flex; flex-direction: column; gap: 16px; }
.tip { margin-bottom: 4px; }
.meta-form {
  background: #fff; padding: 14px 18px; border-radius: 12px;
  border: 1px solid #e5e7eb;
}
.actions-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  background: #fafafa; border: 1px dashed #d1d5db; border-radius: 10px;
}
.history-section { margin-top: 8px; }
.history-section h3 { margin: 22px 0 10px; font-size: 16px; color: #111827; }

.bad-score { color: #dc2626; font-weight: 600; }

/* --- 导入上传器 --- */
.import-uploader {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 18px;
}
.uploader-title { font-weight: 600; font-size: 15px; margin-bottom: 10px; color: #111827; }
.upload-dropzone {
  border: 2px dashed #93c5fd; border-radius: 12px; padding: 28px 20px;
  text-align: center; background: #f8fafc; cursor: pointer; transition: .2s;
}
.upload-dropzone:hover { background: #eff6ff; border-color: #3b82f6; }
.dz-icon { font-size: 40px; margin-bottom: 4px; }
.dz-main { font-weight: 600; color: #1e3a8a; margin-bottom: 4px; }
.dz-sub { color: #64748b; font-size: 12px; margin-bottom: 10px; }
.dz-file { color: #16a34a; margin-top: 8px; font-weight: 500; }
.paste-zone { }

/* --- 数据预览 --- */
.data-preview { margin-top: 6px; }
.pv-head { padding: 8px 12px; background: #fef3c7; border-radius: 8px 8px 0 0; font-size: 13px; color: #92400e; }
.pv-wrap { border: 1px solid #fcd34d; border-top: 0; border-radius: 0 0 8px 8px; overflow: auto; max-height: 400px; background: #fff; }

@media (max-width: 768px) {
  .sanlv-container { padding: 14px; }
  .sanlv-header { padding: 12px 14px; }
  .sanlv-header h1 { font-size: 20px; }
  .sanlv-header > a { position: static; display: inline-block; margin-top: 6px; }
}
</style>
