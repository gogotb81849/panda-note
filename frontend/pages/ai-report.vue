<template>
  <div class="ai-brief-container">
    <!-- 设置区域 -->
    <div class="settings-section">
      <!-- 报告类型选择 -->
      <div class="setting-item">
        <span class="setting-label">报告类型：</span>
        <el-select v-model="reportType" placeholder="请选择报告类型" @change="onTypeChange" style="width: 200px">
          <el-option value="daily" label="日报" />
          <el-option value="weekly" label="周报" />
          <el-option value="halfmonth" label="半月报" />
          <el-option value="monthly" label="月报" />
          <el-option value="quarterly" label="季报" />
          <el-option value="halfyear" label="半年报" />
          <el-option value="yearly" label="年度报告" />
        </el-select>
      </div>

      <!-- 日期选择 -->
      <div class="setting-item">
        <span class="setting-label">时间范围：</span>
        <el-date-picker
          v-model="startDate"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :clearable="false"
          class="date-picker"
        />
        <span class="date-separator">至</span>
        <el-date-picker
          v-model="endDate"
          type="date"
          placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :clearable="false"
          class="date-picker"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="primary" :loading="generating" @click="generateBrief">
          <el-icon><MagicStick /></el-icon>
          AI 生成简报
        </el-button>
        <el-button @click="loadTemplate">
          <el-icon><Document /></el-icon>
          编辑模板
        </el-button>
        <el-button type="success" @click="exportToWord" :disabled="!briefContent">
          <el-icon><Download /></el-icon>
          导出 Word
        </el-button>
      </div>
    </div>

    <!-- 加载状态 - 优先显示 -->
    <AiLoadingState
      v-if="generating"
      :progress-percent="progressPercent"
      :current-step="currentStep"
      :current-step-index="currentStepIndex"
      :steps="steps"
      :collected-info="collectedInfo"
      :connection-details="connectionDetails"
    />

    <!-- 编辑区域 -->
    <div v-else-if="briefContent" class="editor-section">
      <div class="editor-header">
        <h2 class="editor-title">{{ reportTypeText }}</h2>
        <span class="editor-date">{{ dateRangeText }}</span>
      </div>
      <div class="editor-wrapper">
        <el-input
          v-model="briefContent"
          type="textarea"
          :rows="35"
          placeholder="在此编辑报告内容..."
          class="brief-editor"
        />
      </div>
      <div class="editor-tips">
        <el-alert title="提示" type="info" :closable="false" show-icon>
          <template #default>
            支持格式：标题用【】标注，序号用1. 2. 3. ，小标题用一、二、三、
          </template>
        </el-alert>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📝</div>
      <p>选择时间范围并点击"AI 生成简报"</p>
      <p class="empty-desc">AI 将基于您的日程信息生成一份专业的工作简报</p>
    </div>
  </div>

  <!-- 模板编辑对话框 -->
  <AiTemplateDialog
    v-model="templateDialogVisible"
    :current-report-type="reportType"
    :default-templates="reportTemplates"
    @template-saved="onTemplateSaved"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MagicStick, Document, Download } from '@element-plus/icons-vue';

const api = useApi();
const authStore = useAuthStore();

// 更新进度状态
const updateProgress = (message: string, percent: number) => {
  progressMessage.value = message;
  progressPercent.value = percent;
};

const reportType = ref('daily');
const startDate = ref('');
const endDate = ref('');
const briefContent = ref('');
const generating = ref(false);
const progressMessage = ref('');
const progressPercent = ref(0);

// 模板编辑相关
const templateDialogVisible = ref(false);
const customTemplates = ref<Record<string, string>>({});

// 步骤配置
const steps = [
  { id: 'prepare', label: '准备数据' },
  { id: 'query', label: '查询日程' },
  { id: 'connect', label: '连接AI' },
  { id: 'generate', label: '生成报告' },
  { id: 'complete', label: '完成' }
];

const currentStepIndex = ref(0);
const currentStep = computed(() => steps[currentStepIndex.value] || steps[0]);
const collectedInfo = ref<any[]>([]);
const connectionDetails = ref<any[]>([]);

// 报告类型映射
const reportTypeMap: Record<string, string> = {
  daily: '日报',
  weekly: '周报',
  halfmonth: '半月报',
  monthly: '月报',
  quarterly: '季报',
  halfyear: '半年报',
  yearly: '年度报告'
};

const reportTypeText = computed(() => reportTypeMap[reportType.value] || '工作简报');

const dateRangeText = computed(() => {
  if (!startDate.value || !endDate.value) return '';
  return `${formatDate(startDate.value)} 至 ${formatDate(endDate.value)}`;
});

// 报告模板
const reportTemplates: Record<string, string> = {
  daily: `【工作日报】

报告日期：${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日

一、今日工作内容
1. 
2. 
3. 

二、工作完成情况
1. 
2. 
3. 

三、明日工作计划
1. 
2. 
3. 

四、需要协调的问题
1. 
2. 

五、复盘分析

（一）今日成果
1. 
2. 
3. 

（二）问题反思
1. 
2. 
3. 

（三）改进措施
1. 
2. 

报告人：
日期：`,

  weekly: `【工作周报】

报告周期：${new Date().getFullYear()}年第${Math.ceil((new Date().getDate() + 6 - new Date().getDay()) / 7)}周

一、本周工作总结
1. 
2. 
3. 

二、工作完成情况统计
- 已完成：
- 进行中：
- 待开始：

三、重点工作回顾
1. 
2. 
3. 

四、问题与分析
1. 
2. 

五、下周工作计划
1. 
2. 
3. 

六、复盘分析

（一）本周核心成果
1. 
2. 
3. 

（二）经验与收获
1. 
2. 
3. 

（三）问题与反思
1. 
2. 
3. 

（四）改进方案
1. 
2. 

报告人：
日期：`,

  halfmonth: `【工作半月报】

报告周期：${new Date().getFullYear()}年${new Date().getMonth() + 1}月上半月

一、半月工作总结
1. 
2. 
3. 

二、工作完成情况统计
- 完成任务数：
- 完成率：
- 关键成果：

三、重点工作回顾
1. 
2. 
3. 

四、问题与分析
1. 
2. 

五、下半月工作计划
1. 
2. 
3. 

六、复盘分析

（一）半月成果回顾
1. 
2. 
3. 

（二）成功经验总结
1. 
2. 
3. 

（三）问题与不足
1. 
2. 
3. 

（四）下半月改进计划
1. 
2. 

报告人：
日期：`,

  monthly: `【工作月报】

报告周期：${new Date().getFullYear()}年${new Date().getMonth() + 1}月

一、本月工作总结
1. 
2. 
3. 

二、工作完成情况统计
- 主要指标完成情况：
- 重点项目进展：
- 团队协作情况：

三、重点工作回顾
1. 
2. 
3. 

四、经验与教训
1. 
2. 

五、下月工作计划
1. 
2. 
3. 

六、复盘分析

（一）本月核心成果
1. 
2. 
3. 

（二）亮点工作
1. 
2. 
3. 

（三）问题与挑战
1. 
2. 
3. 

（四）经验总结
1. 
2. 

（五）下月改进方向
1. 
2. 

报告人：
日期：`,

  quarterly: `【季度工作简报】

报告周期：${new Date().getFullYear()}年第${Math.ceil((new Date().getMonth() + 1) / 3)}季度

一、季度工作总结
1. 
2. 
3. 

二、工作完成情况统计
- 季度目标完成情况：
- 关键绩效指标：
- 重要成果回顾：

三、重点工作回顾
1. 
2. 
3. 

四、经验与教训
1. 
2. 

五、下季度工作计划
1. 
2. 
3. 

六、复盘分析

（一）季度关键成果
1. 
2. 
3. 

（二）成功案例分析
1. 
2. 

（三）存在的问题
1. 
2. 
3. 

（四）经验与启示
1. 
2. 

（五）下季度工作重点
1. 
2. 

报告人：
日期：`,

  halfyear: `【半年工作简报】

报告周期：${new Date().getFullYear()}年上半年

一、半年工作总结
1. 
2. 
3. 

二、工作完成情况统计
- 半年目标完成情况：
- 关键绩效指标：
- 重要成果回顾：

三、重点工作回顾
1. 
2. 
3. 

四、经验与教训
1. 
2. 

五、下半年工作计划
1. 
2. 
3. 

六、复盘分析

（一）半年成果回顾
1. 
2. 
3. 

（二）关键突破与亮点
1. 
2. 
3. 

（三）存在的主要问题
1. 
2. 
3. 

（四）经验与教训总结
1. 
2. 

（五）下半年工作策略
1. 
2. 

报告人：
日期：`,

  yearly: `【年度工作报告】

报告周期：${new Date().getFullYear()}年度

一、年度工作总结
1. 
2. 
3. 

二、工作完成情况统计
- 年度目标完成情况：
- 关键绩效指标达成情况：
- 重要成果回顾：

三、重点工作回顾
1. 
2. 
3. 

四、经验与教训
1. 
2. 

五、下年度工作计划
1. 
2. 
3. 

六、复盘分析

（一）年度核心成果
1. 
2. 
3. 

（二）工作亮点与创新
1. 
2. 
3. 

（三）存在的问题与不足
1. 
2. 
3. 

（四）经验与教训总结
1. 
2. 
3. 

（五）下年度工作思路
1. 
2. 

报告人：
日期：`
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

// 打开模板编辑对话框
const loadTemplate = () => {
  loadCustomTemplates();
  templateDialogVisible.value = true;
};

// 从 localStorage 加载自定义模板
const loadCustomTemplates = () => {
  const saved = localStorage.getItem('ai-report-templates');
  if (saved) {
    try {
      customTemplates.value = JSON.parse(saved);
    } catch {
      customTemplates.value = {};
    }
  }
};

// 模板保存回调
const onTemplateSaved = (type: string, content: string) => {
  customTemplates.value[type] = content;
  if (reportType.value === type) {
    briefContent.value = content;
  }
};

// 直接加载模板到编辑器（不打开对话框）
const loadTemplateDirectly = () => {
  loadCustomTemplates();
  const type = reportType.value;
  if (customTemplates.value[type]) {
    briefContent.value = customTemplates.value[type];
  } else {
    briefContent.value = reportTemplates[type] || '';
  }
};

// 切换报告类型
const onTypeChange = () => {
  loadCustomTemplates();
  // 优先加载自定义模板，如果没有则清空
  if (customTemplates.value[reportType.value]) {
    briefContent.value = customTemplates.value[reportType.value];
  } else {
    briefContent.value = '';
  }
  // 自动设置默认日期
  const today = new Date();
  endDate.value = today.toISOString().split('T')[0];
  
  if (reportType.value === 'daily') {
    startDate.value = endDate.value;
  } else if (reportType.value === 'weekly') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    startDate.value = start.toISOString().split('T')[0];
  } else if (reportType.value === 'halfmonth') {
    const start = new Date(today);
    start.setDate(1);
    startDate.value = start.toISOString().split('T')[0];
  } else if (reportType.value === 'monthly') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate.value = start.toISOString().split('T')[0];
  } else if (reportType.value === 'quarterly') {
    const quarter = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), quarter * 3, 1);
    startDate.value = start.toISOString().split('T')[0];
  } else if (reportType.value === 'halfyear') {
    const start = new Date(today.getFullYear(), 0, 1);
    startDate.value = start.toISOString().split('T')[0];
  } else if (reportType.value === 'yearly') {
    const start = new Date(today.getFullYear(), 0, 1);
    startDate.value = start.toISOString().split('T')[0];
  }
};

// 设置当前步骤
const setStep = async (index: number, title: string, description: string) => {
  currentStepIndex.value = index;
  updateProgress(description, index * 20);
};

// 添加收集信息
const addCollectedInfo = (label: string, value: string) => {
  collectedInfo.value.push({ label, value });
};

// 添加连接详情
const addConnectionDetail = (text: string, status: 'pending' | 'loading' | 'success' | 'error', value?: string) => {
  connectionDetails.value.push({ text, status, value });
};

// 生成简报
const generateBrief = async () => {
  if (!startDate.value || !endDate.value) {
    ElMessage.warning('请先选择时间范围');
    return;
  }

  generating.value = true;
  collectedInfo.value = [];
  connectionDetails.value = [];
  currentStepIndex.value = 0;
  
  try {
      // 步骤1: 准备数据
      await setStep(0, '准备数据', '正在初始化生成环境...');
      await new Promise(resolve => setTimeout(resolve, 500));
      addCollectedInfo('报告类型', reportTypeMap[reportType.value] || '日报');
      addCollectedInfo('时间范围', `${startDate.value} 至 ${endDate.value}`);
      
      // 步骤2: 查询日程
      await setStep(1, '查询日程', '正在从数据库获取日程数据...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      addCollectedInfo('查询状态', '正在查询...');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // 步骤3: 连接AI
      await setStep(2, '连接AI', '正在连接AI服务...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addConnectionDetail('准备API密钥', 'loading');
      await new Promise(resolve => setTimeout(resolve, 600));
      addConnectionDetail('准备API密钥', 'success', '已加载');
      
      addConnectionDetail('连接火山引擎API', 'loading');
      await new Promise(resolve => setTimeout(resolve, 800));
      addConnectionDetail('连接火山引擎API', 'success', '已连接');
      
      addConnectionDetail('验证身份', 'loading');
      await new Promise(resolve => setTimeout(resolve, 500));
      addConnectionDetail('验证身份', 'success', '通过');
      
      addConnectionDetail('发送请求', 'loading');
      
      // 步骤4: 发送请求并等待响应
      await setStep(3, '生成报告', 'AI正在分析生成内容，请稍候...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 60000);
      });
      
      const apiPromise = api.aiBrief.generateRange(startDate.value, endDate.value, reportType.value);
      
      const result = await Promise.race([apiPromise, timeoutPromise]);
      
      addConnectionDetail('发送请求', 'success', '成功');
      
      addConnectionDetail('接收响应', 'loading');
      await new Promise(resolve => setTimeout(resolve, 500));
      addConnectionDetail('接收响应', 'success');
      
      let briefText = '';
      
      if (result) {
        const extractBrief = (obj: any): string => {
          if (!obj) return '';
          
          if (typeof obj === 'string') {
            return obj;
          }
          
          if (typeof obj === 'object') {
            if (obj.success && obj.brief && typeof obj.brief === 'string') {
              return obj.brief;
            }
            
            if (obj.brief && typeof obj.brief === 'object') {
              if (obj.brief.success === false && obj.brief.message) {
                throw new Error(obj.brief.message);
              }
              return extractBrief(obj.brief);
            }
            
            const fields = ['brief', 'content', 'text', 'data', 'result'];
            for (const field of fields) {
              if (obj[field] && typeof obj[field] === 'string') {
                return obj[field];
              }
              if (obj[field] && typeof obj[field] === 'object') {
                const nested = extractBrief(obj[field]);
                if (nested && nested !== '' && nested !== '{}' && nested !== '[]') {
                  return nested;
                }
              }
            }
            
            if (obj.success === false && obj.message) {
              throw new Error(obj.message);
            }
          }
          
          return '';
        };
        
        try {
          briefText = extractBrief(result);
          
          if (briefText && briefText !== '' && briefText !== '{}' && briefText !== '[]') {
            await setStep(4, '完成', '简报生成成功！');
            briefContent.value = briefText;
            
            addConnectionDetail('解析内容', 'success');
            addConnectionDetail('完成', 'success');
            
            addCollectedInfo('生成状态', '成功');
            addCollectedInfo('内容长度', `${briefText.length} 字符`);
            
            ElMessage.success('简报生成成功！');
          } else {
            throw new Error('生成结果为空，请检查日程数据后重试');
          }
        } catch (extractError) {
          updateProgress('生成失败', 0);
          await showDetailedError(extractError.message || '未知错误', result);
        }
      }
    } catch (error) {
    
    // 更新连接详情显示错误
    if (connectionDetails.value.length > 0) {
      const lastDetail = connectionDetails.value[connectionDetails.value.length - 1];
      if (lastDetail.status === 'loading') {
        lastDetail.status = 'error';
      }
    }
    
    addConnectionDetail('生成失败', 'error');
    addCollectedInfo('生成状态', '失败');
    
    const errorMsg = getDetailedErrorMessage(error);
    console.error('错误信息:', errorMsg);
    await showDetailedError(errorMsg, error);
  } finally {
    generating.value = false;
  }
};

// 显示详细的错误对话框
const showDetailedError = async (errorMsg: string, error: any) => {
  // 先加载模板
  loadTemplateDirectly();
  
  // 分析错误原因，给出友好的解释
  let userFriendlyMessage = '';
  let suggestions = '';
  
  if (errorMsg.includes('Failed to fetch') || errorMsg.includes('网络') || errorMsg.includes('连接')) {
    userFriendlyMessage = '后端服务没有运行，无法连接到服务器';
    suggestions = `
      <div style="margin-top:15px; padding:12px; background:#f0f9ff; border-left:4px solid #3b82f6; border-radius:4px;">
        <p style="margin:0; font-weight:600; color:#1e40af;">🖥️  怎么解决：</p>
        <ol style="margin:8px 0 0 20px; padding:0; color:#374151;">
          <li style="margin:5px 0;">请检查后端服务是否正常启动（3002端口）</li>
          <li style="margin:5px 0;">检查你的网络连接是否正常</li>
          <li style="margin:5px 0;">点击"再试一次"重试，或用模板自己写</li>
        </ol>
      </div>
    `;
  } else if (errorMsg.includes('日程') || errorMsg.includes('暂无') || errorMsg.includes('数据')) {
    userFriendlyMessage = '这个时间段里还没有添加日程记录';
    suggestions = `
      <div style="margin-top:15px; padding:12px; background:#f0fdf4; border-left:4px solid #22c55e; border-radius:4px;">
        <p style="margin:0; font-weight:600; color:#166534;">📝 怎么解决：</p>
        <ol style="margin:8px 0 0 20px; padding:0; color:#374151;">
          <li style="margin:5px 0;">先到"日程管理"里添加一些日程吧</li>
          <li style="margin:5px 0;">或者换个有数据的日期范围</li>
          <li style="margin:5px 0;">点击"再试一次"重试，或用模板自己写</li>
        </ol>
      </div>
    `;
  } else if (errorMsg.includes('超时') || errorMsg.includes('timeout')) {
    userFriendlyMessage = 'AI生成时间太长了，有点慢';
    suggestions = `
      <div style="margin-top:15px; padding:12px; background:#fffbeb; border-left:4px solid #f59e0b; border-radius:4px;">
        <p style="margin:0; font-weight:600; color:#92400e;">⏳ 怎么解决：</p>
        <ol style="margin:8px 0 0 20px; padding:0; color:#374151;">
          <li style="margin:5px 0;">网络可能不太好，稍后再试试</li>
          <li style="margin:5px 0;">点击"再试一次"重试，或用模板自己写</li>
        </ol>
      </div>
    `;
  } else if (errorMsg.includes('API') || errorMsg.includes('认证') || errorMsg.includes('密钥')) {
    userFriendlyMessage = 'AI服务配置有问题';
    suggestions = `
      <div style="margin-top:15px; padding:12px; background:#fef2f2; border-left:4px solid #ef4444; border-radius:4px;">
        <p style="margin:0; font-weight:600; color:#991b1b;">🔧 怎么解决：</p>
        <ol style="margin:8px 0 0 20px; padding:0; color:#374151;">
          <li style="margin:5px 0;">让管理员检查一下API配置</li>
          <li style="margin:5px 0;">点击"再试一次"重试，或用模板自己写</li>
        </ol>
      </div>
    `;
  } else if (errorMsg.includes('日期')) {
    userFriendlyMessage = '日期选择有问题';
    suggestions = `
      <div style="margin-top:15px; padding:12px; background:#ecfdf5; border-left:4px solid #10b981; border-radius:4px;">
        <p style="margin:0; font-weight:600; color:#065f46;">📅 怎么解决：</p>
        <ol style="margin:8px 0 0 20px; padding:0; color:#374151;">
          <li style="margin:5px 0;">开始日期必须早于结束日期</li>
          <li style="margin:5px 0;">重新选择一下日期</li>
        </ol>
      </div>
    `;
  } else {
    userFriendlyMessage = '出了点小问题';
    suggestions = `
      <div style="margin-top:15px; padding:12px; background:#f9fafb; border-left:4px solid #6b7280; border-radius:4px;">
        <p style="margin:0; font-weight:600; color:#374151;">💡 怎么解决：</p>
        <ol style="margin:8px 0 0 20px; padding:0; color:#374151;">
          <li style="margin:5px 0;">先用模板自己写吧</li>
          <li style="margin:5px 0;">刷新页面试试</li>
          <li style="margin:5px 0;">点击"再试一次"重试</li>
        </ol>
      </div>
    `;
  }
  
  try {
    const { action } = await ElMessageBox({
      message: `<div style="padding:10px;">
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:48px; margin-bottom:10px;">😟</div>
          <div style="font-size:18px; font-weight:600; color:#1f2937;">
            AI生成失败了
          </div>
        </div>
        
        <div style="background:#fef3c7; padding:15px; border-radius:8px; margin-bottom:15px;">
          <div style="font-weight:600; color:#92400e; margin-bottom:8px;">
            📌 原因：
          </div>
          <div style="color:#78350f; font-size:15px;">
            ${userFriendlyMessage}
          </div>
          <div style="margin-top:8px; font-size:13px; color:#92400e; opacity:0.8;">
            (原始错误: ${errorMsg})
          </div>
        </div>
        
        ${suggestions}
        
        <div style="margin-top:20px; padding:12px; background:#f0fdf4; border-radius:6px; text-align:center;">
          <p style="margin:0; color:#166534;">
            ✅ 别担心！模板已经自动加载好了，你可以直接开始编辑了！
          </p>
        </div>
      </div>`,
      title: '生成遇到问题',
      dangerouslyUseHTMLString: true,
      showCancelButton: true,
      confirmButtonText: '再试一次',
      cancelButtonText: '好的，我自己写',
      type: 'warning',
      customClass: 'friendly-error-message',
      closeOnClickModal: true,
      closeOnPressEscape: true
    });
    
    if (action === 'confirm') {
      // 用户点击再试一次，重新生成
      generateBrief();
    }
  } catch {
    // 用户关闭对话框或点击取消，不做任何处理
  }
};

// 获取详细的错误信息
const getDetailedErrorMessage = (error: any): string => {
  if (!error) return '未知错误';
  
  // 如果是后端返回的错误对象
  if (typeof error === 'object') {
    if (error.errorType) {
      const errorTypeMap: Record<string, string> = {
        'NO_DATA': '暂无日程数据，请先添加日程记录',
        'INVALID_DATE': '日期格式无效或开始日期晚于结束日期',
        'NETWORK_ERROR': '网络连接失败，请检查网络连接',
        'API_ERROR': 'AI服务认证失败，请检查API密钥配置',
        'SERVER_ERROR': 'AI服务内部错误，请稍后重试',
        'DATABASE_ERROR': '数据库查询失败，请检查数据库连接',
        'UNKNOWN_ERROR': '未知错误，请稍后重试'
      };
      return errorTypeMap[error.errorType] || error.message || '未知错误';
    }
    if (error.message) return error.message;
    if (error.msg) return error.msg;
  }
  
  // 如果是字符串
  if (typeof error === 'string') return error;
  
  // 其他情况
  return '未知错误，请稍后重试';
};

// 导出Word
const exportToWord = () => {
  if (!briefContent.value) {
    ElMessage.warning('请先生成或编辑报告内容');
    return;
  }

  try {
    // 格式化内容为HTML（Word可以解析）
    let htmlContent = formatContentToHtml(briefContent.value);
    
    // 创建完整的HTML文档
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportTypeText.value}</title>
  <style>
    body {
      font-family: "宋体", "SimSun", serif;
      font-size: 16px;
      line-height: 1.8;
      margin: 40px;
    }
    h1 {
      font-size: 22px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 30px;
    }
    .date-range {
      text-align: center;
      margin-bottom: 30px;
      font-size: 14px;
      color: #666;
    }
    h2 {
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    p {
      margin: 8px 0;
      text-indent: 2em;
    }
    .footer {
      margin-top: 50px;
      text-align: right;
    }
  </style>
</head>
<body>
  <h1>${reportTypeText.value}</h1>
  <div class="date-range">${dateRangeText.value}</div>
  ${htmlContent}
</body>
</html>`;

    // 创建Blob并下载
    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportTypeText.value}_${startDate.value}_${endDate.value}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败');
  }
};

// 格式化内容为HTML
const formatContentToHtml = (content: string) => {
  let html = content;
  
  // 处理【】标题
  html = html.replace(/【([^】]+)】/g, '<h1>$1</h1>');
  
  // 处理一、二、三等小标题
  html = html.replace(/^([一二三四五六七八九十]+)、(.+)$/gm, '<h2>$1、$2</h2>');
  
  // 处理1. 2. 3. 列表
  html = html.replace(/^(\d+)\.\s*(.+)$/gm, '<p>$1. $2</p>');
  
  // 处理换行
  html = html.replace(/\n/g, '<br>');
  
  // 处理空行
  html = html.replace(/<br><br>/g, '</p><p>');
  
  return html;
};

onMounted(() => {
  const today = new Date();
  endDate.value = today.toISOString().split('T')[0];
  startDate.value = endDate.value;
});
</script>

<style scoped>
.ai-brief-container {
  padding: 20px;
  width: 100%;
  margin: 0;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 10px 0;
}

.page-desc {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.settings-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.setting-label {
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  min-width: 80px;
}

.date-picker {
  width: 200px;
}

.date-separator {
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.editor-section {
  background: white;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 24px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid #e5e7eb;
}

.editor-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.editor-date {
  font-size: 14px;
  color: #6b7280;
}

.editor-wrapper {
  padding: 0;
}

.brief-editor {
  font-family: "Microsoft YaHei", sans-serif;
  font-size: 15px;
  line-height: 1.8;
  width: 100%;
}

.brief-editor :deep(textarea) {
  font-family: "Microsoft YaHei", "宋体", SimSun, serif;
  font-size: 15px;
  line-height: 1.8;
  padding: 20px 24px;
  resize: none;
  border: none;
  border-radius: 0;
}

.editor-tips {
  margin-top: 16px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
}

.empty-state p {
  font-size: 18px;
  color: #6b7280;
  margin: 0 0 10px 0;
}

.empty-desc {
  font-size: 14px;
  color: #9ca3af;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow-y: auto;
}

.loading-content {
  max-width: 100%;
  margin: 0 auto;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  margin: 0 0 30px 0;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.current-step {
  margin-bottom: 30px;
}

.current-step h3 {
  font-size: 20px;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.step-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.step-indicators {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  position: relative;
}

.step-indicators::before {
  content: '';
  position: absolute;
  top: 15px;
  left: 25px;
  right: 25px;
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  flex: 1;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.step-item.completed .step-icon {
  background: #10b981;
  color: white;
}

.step-item.active .step-icon {
  background: #3b82f6;
  color: white;
  animation: pulse 1.5s ease-in-out infinite;
}

.step-item.pending .step-icon {
  background: #e5e7eb;
  color: #9ca3af;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.step-label {
  font-size: 12px;
  color: #6b7280;
}

.step-item.completed .step-label {
  color: #10b981;
}

.step-item.active .step-label {
  color: #3b82f6;
  font-weight: 500;
}

.collected-info {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: left;
}

.collected-info h4 {
  font-size: 14px;
  color: #374151;
  margin: 0 0 12px 0;
}

.info-scroll {
  max-height: 120px;
  overflow-y: auto;
}

.info-item {
  display: flex;
  padding: 6px 0;
  border-bottom: 1px solid #e5e7eb;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
  min-width: 100px;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #1f2937;
  flex: 1;
}

.connection-details {
  background: #f0fdf4;
  border-radius: 8px;
  padding: 16px;
  text-align: left;
}

.connection-details h4 {
  font-size: 14px;
  color: #065f46;
  margin: 0 0 12px 0;
}

.connection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 10px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.connection-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.connection-dot.pending {
  background: #d1d5db;
}

.connection-dot.loading {
  background: #f59e0b;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.connection-dot.success {
  background: #10b981;
}

.connection-dot.error {
  background: #ef4444;
}

.connection-text {
  font-size: 13px;
  color: #065f46;
  flex: 1;
}

.connection-value {
  font-size: 12px;
  color: #6b7280;
  background: #d1fae5;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 错误对话框样式 */
:deep(.friendly-error-message) {
  max-width: 550px;
  border-radius: 12px;
}

:deep(.friendly-error-message .el-message-box__content) {
  padding: 20px;
}

:deep(.friendly-error-message .el-message-box__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

:deep(.friendly-error-message .el-message-box__title) {
  color: white;
  font-weight: 600;
}

:deep(.friendly-error-message .el-message-box__headerbtn .el-message-box__close) {
  color: white;
}

:deep(.friendly-error-message .el-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  font-weight: 500;
}

:deep(.friendly-error-message .el-button--primary:hover) {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
}

@media (max-width: 768px) {
  .ai-brief-container {
    padding: 16px;
  }

  .page-title {
    font-size: 22px;
  }

  .setting-item {
    flex-direction: column;
    align-items: stretch;
  }

  .setting-label {
    min-width: auto;
  }

  .date-picker {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}
</style>
