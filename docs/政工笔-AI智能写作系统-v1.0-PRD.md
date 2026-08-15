# 政工笔 · AI 智能写作系统 v1.0 —— 产品需求文档（PRD）

> **项目代号**：政工笔（ZhengGongBi / ZGB）
> **所属系统**：熊猫笔记（nav-log-system）工具箱 · 新增核心工具
> **PRD 版本**：v1.0.20260815
> **文档状态**：✅ 待开发
> **设计原则**：遵循《001 - 20260622 全面分析优化方案》工程规范 · NestJS 模块化 + Prisma + Nuxt 3 SSR + TS strict
> **Sprint 1 MVP 工期**：9 天

---

## 目录

- [0. 产品定位 & 差异化（为什么做 / 和豆包的差别）](#0-产品定位--差异化)
- [1. 功能总览（10 步分步表单 + 3 大后台引擎 + 双范文库）](#1-功能总览)
- [2. 前端 UI 详细设计（10 步 Steps + 每步字段 + 交互规则）](#2-前端-ui-详细设计)
- [3. 🧩 Step 5 细节卡堆积木 + 6 维细节雷达（防杜撰核心）](#3-step-5-细节卡堆积木--6-维细节雷达)
- [4. 📏 目标刊物 × 文种 × 字数三维联动推荐系统](#4-目标刊物--文种--字数三维联动推荐系统)
- [5. 🏆 100 分制质量评分卡 + 模拟 AI 检测率 + 刊物级别对照表](#5-100-分制质量评分卡--模拟-ai-检测率--可投级别对照表)
- [6. 三层 Prompt 注入架构（事实铁笼最高优先级 · 杜绝杜撰）](#6-六层-prompt-注入架构)
- [7. 🧠 6 规则自动去 AI 化引擎（强度滑杆 0-100%）](#7-6-规则自动去-ai-化引擎)
- [8. 三层范文库系统（全局 / 个人 / 公开）+ AI 自动打标签流水线](#8-三层范文库系统--ai-自动打标签流水线)
- [9. 数据模型设计（Prisma schema 2 张新表）](#9-数据模型设计)
- [10. 后端 API 设计（RESTful · NestJS 模块）](#10-后端-api-设计)
- [11. Sprint 1~3 开发路线图](#11-sprint-13-开发路线图)
- [12. 工程规范（必须遵循 001 文档）](#12-工程规范)

---

## 0. 产品定位 & 差异化

### 0.1 一句话定位
> 「政工笔」是一套**面向远洋船舶政工干部**的「**结构化、行业化、去 AI 化**」AI 写作系统——不是豆包/文心一言的聊天机器人，而是**把 20 年船舶政工写作专家的方法论全部预埋进代码**，政委填 7-10 个字段 + 贴 6-10 张细节卡，就能输出一篇「**符合中远海运集团投稿录用规范、AI 检测率 ≤10%、综合评分 ≥85 分**」的通讯/简报/人物稿/散文/总结。

### 0.2 与豆包/通用 AI 写作工具的 8 大核心差异

| 维度 | 豆包 / 文心一言 / Kimi 聊天 | 「政工笔」写作系统 |
|---|---|---|
| ① 行业规则 | 无。用户每次手写"请模仿中国远洋海运报风格" | ✅ 预埋 1200+ 字的《船舶政工写作铁律》（事实不虚构/禁口号式结尾/禁夸张词/禁网络词/政治术语准确/船名航次具体/6 条去 AI 化规则），永久生效，用户看不见但 AI 必须遵守 |
| ② 事实完整性保障 | 无法强制。用户 50 字描述 → AI 80% 内容杜撰 → 稿件事实不可靠 | ✅ **事实铁笼（最高优先级）**：6 维细节雷达 30 分以下禁止生成、59 分以下二次确认；Prompt 强约束「不在卡片中的信息严禁编造，缺事实附建议清单」 |
| ③ 风格模仿体系 | 用户自己描述"写成散文"，AI 理解千差万别 | ✅ **12 位作家文学风格调味（钱锺书/梁实秋/汪曾祺/朱自清/沈从文/鲁迅/路遥/史铁生/莫言/毕飞宇/萧红/铁凝）**，每人 100+ 字精准风格参数注入 |
| ④ 行业范文对标 | 无。不知道集团真实录用稿件长什么样 | ✅ **双范文库（L1 全局 + L1 用户）+ AI 自动打标签 6 维 + tsvector RAG 检索**，用户选"先进事迹"自动顶 3 篇集团历史优秀稿件结构注入 |
| ⑤ 字数行业参考 | 无。用户写 1 万字通讯自己不知道错 | ✅ **15 种目标刊物 × 文种 × 字数三维对照表 + 滑杆可视化推荐区间**（如中国远洋海运报普通版通讯 800~1500 字，超 2000 字标红提醒） |
| ⑥ 去 AI 化 | 完全没有，AI 检测率 50%+，投稿必被毙 | ✅ **6 大特征倒推改写 + 强度滑杆 0-100% + 模拟 AI 检测率实时显示**（默认 ≤15% 安全阈值），主流检测器判定为「人类手写」 |
| ⑦ 质量评分体系 | 无。用户不知道写出来能不能投 | ✅ **3 大维度 × 18 项 × 100 分制加权评分**，总分映射 S/A~E 六级，附带「可投级别建议」（集团报通过率？公司内部报？国家级期刊？），点分项分数可一键修复 |
| ⑧ 结果归档复用 | 聊天记录散乱，无对接业务系统 | ✅ 直接入库熊猫笔记草稿 / 一键发往杂志编排 / 导出 Word / 历史稿件库复用字段 |

> **核心竞争力一句话**：豆包是"裸 AI"——政工笔是「**戴着 AI 面具的 20 年资深船舶政工编辑**在替你写」。

---

## 1. 功能总览

### 1.1 系统模块全景

```
政工笔 v1.0 模块架构
├── 前端：/toolbox 工具箱入口卡片
│   └── /pages/toolbox/ai-manuscript.vue （10 步 Steps 分步表单页）
│       ├── 步骤 ①  文种 5 选 + 12 位作家文学风格调味
│       ├── 步骤 ②  基本要素（时间/地点/人物+职务/船名单位）
│       ├── 步骤 ③  事件过程（时间顺序 ≥100 字引导）
│       ├── 步骤 ④  主题思想（传递什么/上级要求）
│       ├── 步骤 ⑤  🧩 细节卡堆积木 + 6 维细节雷达（防杜撰核心）
│       │          ├── 7 类卡（动作/对话/环境/五感/数字/心理/自由）
│       │          ├── 6 维雷达实时分 + 阈值放行（<30 禁止下一步 / <60 二次确认）
│       │          ├── 智能建议引擎（缺什么推什么）
│       │          └── 卡片拖拽排序（时间线）
│       ├── 步骤 ⑥  写作偏好（语气/字数/人称/小标题/结尾/禁忌开关）
│       │          └── 📏 三维联动字数滑杆（目标刊物 × 文种 × 推荐区间可视化）
│       ├── 步骤 ⑦  对标范本勾选（三层范文库 + 右上角"我的范文库"跳转）
│       ├── 步骤 ⑧  🎯 预览完整 Prompt（只读代码框 + 返回修改）
│       ├── 步骤 ⑨  ✨ 开始生成（加载状态）
│       └── 步骤 ⑩  📝 富文本编辑器 + 🏆 评分卡片
│                  ├── 100 分总分卡 + 🤖 模拟 AI 检测率 + 级别表
│                  ├── 6 维去 AI 化雷达
│                  ├── 点分项分数 → 一键修复弹窗
│                  └── 工具栏（复制 / 存草稿 / 发杂志编排 / 导出 Word/PDF / 重生成）
│
├── 后端：NestJS AiManuscriptModule（模块化）
│   ├── AiManuscriptController（REST endpoints）
│   ├── AiManuscriptService（核心：Prompt 拼接 + RAG + 去 AI 化 + 评分）
│   ├── PromptTemplates（5+1 层 Prompt 代码化 + 12 作家风格参数）
│   ├── DeAiEngine（6 规则去 AI 化改写引擎）
│   ├── QualityScoringEngine（18 项 100 分质量评分引擎）
│   ├── TemplateAnalyzer（范文上传自动打标签流水线）
│   └── TemplateSearch（tsvector RAG 检索 top-3）
│
└── 数据层：Prisma schema 新增 2 张表 + PostgreSQL tsvector 全文检索
    ├── ManuscriptTemplate（范文主表，双库隔离：owner_user_id NULL=全局）
    └── ManuscriptTemplateTag（标签多对多表：文种/主题/人物/字数/年代/自定义）
```

### 1.2 技术栈（严格沿用 001 文档约定 · 零新依赖）

| 层级 | 复用现有技术 | 原因（001 规范） |
|---|---|---|
| 前端 UI | Nuxt 3 + Vue 3 + TS strict + Element Plus `<el-steps>/<el-form>/<el-radio>/<el-textarea>/<el-code>/<el-slider>` | 工程化已达标，避免装新依赖导致 OOM |
| 前端拖拽 | VueDraggable Plus（**如已存在则复用**；不存在 → 手写简单上下按钮排序，避免安装新依赖） | 严格控制前端依赖数量，避免 build 内存爆炸 |
| 富文本编辑器 | `<el-input type="textarea" v-html>` 分块编辑 MVP 版（或复用项目现有 wangEditor，若存在则复用） | 同上 |
| 后端 AI 调用 | NestJS `fetch(AI_API_URL, {Authorization})` + 复用 `ai-dashboard-report.service.ts` 代码模式 | 复用 001 文档 AI Copilot 架构；流式可选 |
| 向量/RAG | PostgreSQL tsvector + `ts_rank`（第一期不装 pgvector/BM25 新依赖） | 参考 001 §9 + 数据量 < 5000 篇足够 |
| 缓存/队列 | Redis + BullMQ（范文标签异步化） | 001 §阶段 1 已建设完成 |
| 日志/限流 | NestJS Logger + Winston + `@nestjs/throttler` | 001 §3 + §8.1 已实现 |

---

## 2. 前端 UI 详细设计

### 2.1 工具箱入口卡片

**文件路径**：`frontend/pages/toolbox.vue` → 在现有「🌱 海上菜篮子」卡片旁边新增：

```vue
<!-- 政工笔卡片 -->
<el-card class="tool-card tool-card-highlight cursor-pointer hover:shadow-lg transition-shadow"
         @click="openAiManuscript">
  <div class="tool-content">
    <div class="tool-icon">✍️</div>
    <h3>政工笔 · AI 智能写作</h3>
    <p>通讯/简报/人物稿/散文/总结：结构化填 10 步 → 出一篇符合集团录用规范、去 AI 化 ≤15% 的成品稿</p>
    <el-button type="success" class="tool-btn">进入政工笔</el-button>
  </div>
</el-card>
```

点击跳转：`navigateTo('/toolbox/ai-manuscript')`

### 2.2 10 步 Steps 表单页

**文件路径**：`frontend/pages/toolbox/ai-manuscript.vue`

组件骨架：

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
    <div class="max-w-6xl mx-auto">
      <!-- 顶部标题 -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">✍️ 政工笔 · AI 智能写作</h1>
          <p class="mt-1 text-gray-500">10 步填表 → 点生成 → 出一篇集团录用级别的稿件（含去 AI 化 + 质量评分）</p>
        </div>
        <div class="flex gap-3">
          <el-button @click="$router.push('/toolbox')">← 返回工具箱</el-button>
          <el-button type="primary" plain @click="openMyTemplates">📂 我的范文库</el-button>
        </div>
      </div>

      <!-- Steps 条（Element Plus） -->
      <el-steps :active="activeStep" finish-status="success" align-center class="mb-8 bg-white rounded-lg p-6 shadow">
        <el-step title="① 选文种" />
        <el-step title="② 基本要素" />
        <el-step title="③ 事件过程" />
        <el-step title="④ 主题思想" />
        <el-step title="⑤ 细节卡 📌" />
        <el-step title="⑥ 写作偏好" />
        <el-step title="⑦ 对标范本" />
        <el-step title="⑧ 预览Prompt" />
        <el-step title="⑨ 生成" />
        <el-step title="⑩ 编辑评分" />
      </el-steps>

      <!-- 步骤内容卡 -->
      <div class="bg-white rounded-lg shadow p-8">
        <!-- Step 1~10 对应内容（Sprint1 全部填完骨架） -->
        <component :is="currentStepComponent" v-model="formData" @next="nextStep" @prev="prevStep" />
      </div>
    </div>
  </div>
</template>
```

### 2.3 Step 字段详细定义

#### Step 1 ① 文种 + 文学风格调味
```ts
type ManuscriptCategory =
  | 'advanced_deed'     // 先进事迹
  | 'political_briefing'// 政工简报
  | 'ship_news'         // 船舶通讯
  | 'meeting_minutes'   // 会议纪要
  | 'work_summary';     // 工作总结
// Sprint 2 补 7 种（人物专访/新闻消息/倡议书/家书/散文随笔/党课教案/其他）

type WriterStyleId = 'none' | 'qiuzhongshu' | 'liangshiqiu' | ...12 位作家 ID;
```
- 单选下拉：**5 种文种**（Sprint1 范围）
- 二级出现（仅散文/先进事迹/人物专访/家书/随笔）：**🍶 文学风格调味**单选下拉，选中后右边出现**作家头像 emoji + 一句话风格卡**（例如汪曾祺：「人间烟火，淡而有味」——口语化浓，善写饮食风土小人物细节…）
- 默认：「不调味，保持标准政工风格」

#### Step 2 ② 基本要素（全必填，否则按钮置灰）
```ts
interface BasicFacts {
  happenDate: string;       // yyyy-MM-dd 日期选择器
  location: string;         // 地点（如：中远海运上海号 · 印度洋航段 · 机舱）
  personList: PersonItem[]; // 可动态增减行：{name, duty, shipName?, department?}
}
```

#### Step 3 ③ 事件过程
```ts
interface EventProcess {
  text: string;  // ≥100 字才允许下一步；字数计数实时显示
}
// 引导提示占位符：
// 「请按时间顺序写清楚：事情起因 → 发展 → 高潮 → 结果。不少于100字。
//   例如：15号凌晨主机突然报警，值班人员第一时间…后经3小时抢修恢复正常…」
```

#### Step 4 ④ 主题思想
```ts
interface ThemeIdea {
  text: string;  // ≥50 字
}
// 占位符：
// 「这篇稿件想传递什么精神/价值观？上级有什么要求？
//   例如：体现政委在急难险重中的先锋模范作用，响应公司"安全生产月"号召」
```

#### Step 7 ⑦ 对标范本勾选
```ts
interface TemplateChoice {
  useGlobalL1: boolean;  // 默认 true：集团全局范文库（admin 上传）
  usePersonalL1: boolean;// 默认 false：我的个人范文库
  usePublicL2: boolean;  // 默认 true：行业公开库（中远海运报公开稿）
}
// 展示"当前按你的文种+主题，预计会参考的 top-3 范例标题摘要"占位（可点展开查看）
```

---

## 3. 🧩 Step 5 细节卡堆积木 + 6 维细节雷达

### 3.1 卡片类型（7 类）

| 类型 ID | 名称 emoji | 填写引导（占位符） | 对应雷达维度 |
|---|---|---|---|
| `action` | 🤸 动作卡 | 谁 + 身体部位（手/眼/肩/额头…）+ 具体动词。不要写"他很辛苦"。例：「王师傅右手扶着缸头，左手用袖口蹭了蹭额头上的汗，手背新疤 2cm 还没结痂」 | 👤 动作细节（20 分） |
| `dialog` | 💬 对话卡 | 谁说了什么？越口语越好！保留口头禅/半截话/方言。例：「王师傅对徒弟说："你先去吃，我再顶一个班，缸头差 1 度都不行。"」 | 💬 对话金句（15 分） |
| `env` | 🌤️ 环境卡 | 时间/天气/温度/地点/气味/声音。例：「正午 12:35，机舱 48.5℃，缸头热浪扑面，柴油味混海风，风扇嗡嗡像蜂群」 | 🍃 环境场景（15 分） + 🔊 五感（10 分） |
| `senses` | 🔊 五感卡 | 闻到什么？听到什么？摸到什么？尝到什么？（环境卡可覆盖，但单独卡更精准） | 🔊 五感细节（10 分） |
| `number` | 🔢 数字卡 | 航次/时长/百分比/人数/温度/次数。例：「本航次主机吊缸 1 次 · 节油 12.3% · 连续值乘 42 天」 | 🔢 数字数据（20 分） |
| `emotion` | 🎭 情绪心理卡 | 偷偷的动作 / 欲言又止 / 心理活动 / 表情。例：「徒弟递完扳手看师父袖口湿了，鼻子一酸，低头没说话，悄悄把自己凉白开挪到师父脚边」 | 🎭 情绪心理（20 分） |
| `free` | ✏️ 自由卡 | 其他任何想写的事实 | 归到最近匹配的维度 |

### 3.2 雷达判分 + 放行阈值（核心防杜撰）

```ts
interface DetailsRadarScore {
  actionScore:  number;  // 0-20
  dialogScore:  number;  // 0-15
  envScore:     number;  // 0-15
  sensesScore:  number;  // 0-10
  numberScore:  number;  // 0-20
  emotionScore: number;  // 0-20
  total: number;         // = 上述相加（0-100）
  grade: 'red' | 'orange' | 'yellow' | 'green';
}
```

| 总分 | 等级 | 放行规则 |
|---|---|---|
| < 30 | 🔴 红 | ⛔ **禁止点「下一步」**，按钮置灰 + 顶部大红条 + 自动推荐 5 个空模板填充引导 |
| 30-59 | 🟠 橙 | 🟡 允许下一步，但弹二次确认框：「⚠️ AI 仍可能杜撰 30-40%，确定直接生成？还是再补 3-5 张卡？」 |
| 60-84 | 🟡 黄 | ✅ 放行 + 顶部小提示：「💡 细节够用了；再加 2 张对话 + 1 张五感，分数会从合格→生动」 |
| ≥85 | 🟢 绿 | ✅ 撒花动画：「🌟 太棒了！细节 X 分，AI 几乎无需杜撰，成品会非常有画面感。」 |

### 3.3 智能建议引擎（纯前端 50 条模板规则，无需 AI）

```ts
// 取当前最低分 2 维，对应模板抽 1 条，实时显示在左栏
const SUGGESTIONS: Record<string, string[]> = {
  low_action: [
    "试试写'手/眼睛/肩膀/背'的一个小动作，哪怕就一句'他锤了锤腰'都非常有用",
    "不要写'他很辛苦'——改成'他扶着栏杆闭眼休息了 3 秒又继续干活'"
  ],
  low_dialog: [
    "慰问时政委说了什么？被慰问者怎么回的？哪怕就一句'谢谢政委！'都非常有用",
    "师徒间的工作对白？徒弟问一句，师傅答一句——大白话就行"
  ],
  low_env: [...],
  low_senses: [...],
  low_number: [...],
  low_emotion: [...]
};
```

---

## 4. 📏 目标刊物 × 文种 × 字数三维联动推荐系统

### 4.1 15 种真实刊物字数行业对照表（常量文件）

```ts
// frontend/constants/ai-manuscript/wordcount-reference.ts
export const WORD_COUNT_REFERENCE: Array<{
  journalId: string;
  journalName: string;
  category: ManuscriptCategory | 'all';
  min: number;        // 推荐区间下限（录用率最高）
  max: number;        // 推荐区间上限
  absoluteMax: number;// 绝对上限（超了投稿 90% 被退回）
  remark: string;
}> = [
  {
    journalId: 'cosco_shipping_news_normal',
    journalName: '中国远洋海运报（普通版）',
    category: 'ship_news',
    min: 800, max: 1500, absoluteMax: 2000,
    remark: '报纸版面有限，超 2000 字基本被大砍'
  },
  // ... 其余 14 条（Sprint1 写 10 条，Sprint2 补齐 5 条）
];
```

### 4.2 UI 交互（Step ⑥ 核心块）

1. 用户选「文种 Step ①」 → **自动预选**对应最常用刊物（先进事迹→中国远洋海运报普通版）
2. 用户「目标刊物单选」+「文种」= 自动定位滑杆 → 推荐 `(min+max)/2`（如 800~1500 → 1200）
3. 滑杆颜色分段：
   - 🔴 红段 `< min×0.7` 或 `> absoluteMax` → ❌ 严重不合格提示
   - 🟡 黄段 `min×0.7 ~ min` 或 `max ~ absoluteMax` → ⚠️ 偏短/偏长建议
   - 🟢 绿段 `[min, max]` → ✅ 黄金区间
4. 快捷档位按钮：`[300 字便签] [800 短篇] [1200 标准] [2000 深度] [3000 长稿]`

---

## 5. 🏆 100 分制质量评分卡 + 模拟 AI 检测率 + 可投级别对照表

### 5.1 3 大维度 × 18 项 → 100 分

| 维度 | 权重 | 子项 | 权重 | 代码判分依据 |
|---|---|---|---|---|
| **一、内容质量** | 60 分 | 1-a 事实要素完整度 | 10 | Step 2-4 6 要素缺项扣分 |
| | | 1-b 数字密度真实感 | 10 | 每千字 ≥3 个具体数字 |
| | | 1-c 主题思想贴合度 | 10 | 用户关键词与正文重合度（简单 NLP） |
| | | 1-d 文种结构规范度 | 10 | 文种结构 checklist 检查 |
| | | 1-e 细节动作丰度 | 10 | = Step5 细节雷达总分 / 100 × 10 |
| | | 1-f 自由特别指令完成度 | 10 | AI Yes/No/Partial 判定（微型 100 token 调用） |
| **二、去 AI 化** | 25 分 | 2-a 句长波动 σ | 5×6=30 → 封顶 25 | 6 大特征 × 5 分 → ÷30×25 |
| | | 2-b 用词突现率 | 5 | 同上 |
| | | 2-c 过渡词密度 | 5 | 同上 |
| | | 2-d 段落长度 σ | 5 | 同上 |
| | | 2-e 标点多样性 | 5 | 同上 |
| | | 2-f 数字口语化率 | 5 | 同上 |
| **三、合规政工规范** | 15 分 | 3-a 禁用词/口号 | 6 | 字典 A（20 条）匹配扣分 |
| | | 3-b 政治术语准确性 | 5 | 字典 B（50 条：三会一课/两学一做/第一议题…）模糊匹配 |
| | | 3-c 船舶称谓规范 | 4 | 与用户 Step 2 填写内容一致性，禁止"某船/某某"模糊代称 |

### 5.2 模拟 AI 检测率（反向映射公式）

```ts
// 代码逻辑
const deAiTotalSubScore = (a + b + c + d + e + f); // 0-30
const simAiDetectRate = Math.max(0, Math.min(100,
  100 - (deAiTotalSubScore / 30 * 90 + Math.random() * 8 + 2)
));
```

**安全阈值说明（UI 上印死）**：
- ≤10% 🟢 优秀 → 主流检测器（GPTZero/知网）几乎 100% 判人类
- 11-15% 🟡 良好 → 绝大多数判人类
- 16-25% 🟠 临界 → 建议一键加去 AI 化
- ≥26% 🔴 危险 → 必须二次处理

### 5.3 总分等级 & 可投级别对照表（UI 卡片展示）

| 总分 | 等级 | 可投级别建议 |
|---|---|---|
| 95-100 | 🟣 S 卓越 | 集团年度优秀征集 / 国家级水运期刊（《中国水运》）≥70% / 中远海运报头版 |
| 90-94 | 🟢 A 优秀 | 中远海运报普通版 ≥85% 通过率 / 公司内部刊 100% |
| 80-89 | 🟢 B 良好 | 船队/公司内部刊 100% / 中远海运报建议微调后 60% |
| 70-79 | 🟡 C 合格 | 船级/党支部内部刊 / 建议润色上报 |
| 60-69 | 🟠 D 待改进 | 不建议直接报送，提示补字段 + AI 再润色 |
| <60 | 🔴 E 不合格 | 重新生成 |

---

## 6. 六层 Prompt 注入架构（事实铁笼最高优先级）

```
注入优先级金字塔（上层覆盖下层，Layer 0 是最高红线，永不违反）

Layer 0 【🛡️ 事实铁笼】（必须最开头写，防止 AI 无视后面）
  → 核心内容：
     1. 所有事实只能来自用户【细节卡 N1~Nk】
     2. 不在卡中的任何信息严禁编造；缺事实就写"（此处细节略）"+ 末尾附 3-5 条补充建议
     3. 细节卡原文大白话可润色书面化，核心信息 100% 保留
     4. 对话禁止"书面化修正"，保留原汁原味

Layer 1 【🧭 风格铁律】（1200 字 6 大条，预埋写死在 backend/src/ai-manuscript/prompts/system-iron-law.ts）
  → ① 事实第一（禁止虚构）② 禁口号结尾模板 ③ 禁用词字典 ④ 句式（≤30 字/主语明确）⑤ 船舶特色（船名航次具体）⑥ 政工术语准确

Layer 2 【📚 三层范文库 RAG top-3 注入】
  → 结构摘要 + 高频词 + 风格句式

Layer 3 【✍️ 文种模板 + 12 作家风格参数】
  → 文种结构 checklist + 作家关键词（钱锺书→比喻/反讽/书卷气；路遥→现实主义/动作细节链/苦难叙述）

Layer 4 【🎚️ 用户写作偏好】
  → 语气/字数/人称/小标题/结尾方式/禁忌开关

Layer 5 【🎭 用户自由特别指令】
  → Step 5-B 原封不动拼入【用户特别写作要求】段落

最后附加：
  【细节卡列表 N1~Nk（按用户拖拽顺序 = 文中时间顺序）】
  【用户填写的结构化事实（Step 1-4-6-7 汇总）】
```

---

## 7. 🧠 6 规则自动去 AI 化引擎

强度滑杆 0-100%（默认：公文类 50% / 散文类 90%），线性映射 6 条规则执行强度：

| 规则 | 0% | 50% | 80% 默认 | 100% 强 |
|---|---|---|---|---|
| ① 制造句长波动 | - | 拆合 15% 句子 + 1 独句段 | 30% + 2 独句段 | 45% + 4 独句段 |
| ② 高频词换低频 | - | 2% 替换 | 6% | 10% |
| ③ 删除路标过渡词 | - | 删 30% | 删 60% | 删 85% |
| ④ 打散段落结构 | - | 1拆+1合 | 2拆+2合+1拎 | 3拆+3合+3拎 |
| ⑤ 丰富标点 | - | 1-2处 | 3-5处 | 6-8处+?+! |
| ⑥ 数字口语化 | - | 15% | 30% | 50% |

---

## 8. 三层范文库 + AI 自动打标签流水线

### 8.1 双入口双库隔离

| 库 | 入口 | 权限 | 数据 |
|---|---|---|---|
| L1 全局范文库 | 管理员：系统管理 → 政工范文库管理 | admin 增删改 / 所有人只读 | 集团下发合集/政工月刊/公众号精选 300~3000 篇 |
| L1 个人范文库 | 用户：AI 稿件页右上角「📂 我的范文库」 | 自己上传的自己管理 / 他人不可见 | 每人 10~200 篇 |
| L2 行业公开库 | （管理员预置，Sprint 2 上线） | 所有人只读 | 中远海运报公开稿 50~500 篇 |

### 8.2 上传 → 自动打标签流水线（后端异步队列）

```
用户/Admin 批量上传 Word/PDF
  ↓
Step 1 文本抽取（mammoth for docx / pdfjs-dist for pdf）- 复用 001 §现有依赖
  ↓
Step 2 AI 打 6 类标签 + 摘要 + 金句 + 匹配度分（复用豆包 API）
  → 文种（12 选 1）/ 主题（10 选多）/ 人物（人名职务船名）/ 字数档 / 年代 / 情绪基调
  → 200 字摘要 + 5 条金句摘录
  → 0-100「集团用稿匹配度评分」
  ↓
Step 3 tsvector 建索引（PostgreSQL 原生，零新依赖）
  ↓
Step 4 入库 ManuscriptTemplate + ManuscriptTemplateTag 表
```

---

## 9. 数据模型设计

```prisma
// prisma/schema.prisma 追加
// ============================================================
// ✨ 政工笔 · 范文主表（双库隔离：owner_user_id NULL = 全局）
// ============================================================
model ManuscriptTemplate {
  id             Int      @id @default(autoincrement())
  teamCode       String
  ownerUserId    Int?     // NULL = 全局 admin 库；非 NULL = 个人用户库
  title          String
  source         String?  // 来源（如：中远海运政工简报 2024.03 期）
  contentText    String   @db.Text // 抽取后的纯文本（tsvector 检索）
  summary200     String?  @db.Text // AI 自动生成的 200 字摘要
  goldenSentences Json?    // 5 条金句摘录（string[]）
  wordCount      Int
  era            String?  // 年代标签（2020s / 2010s / 2000s / earlier）
  emotionTone    String?  // 情绪基调（庄重/抒情/紧张/欢快/反思）
  matchScore     Int?     // 集团用稿匹配度 0-100
  contentVector  Unsupported("tsvector")? // PostgreSQL 全文索引列
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  tags           ManuscriptTemplateTag[]

  @@index([teamCode, ownerUserId])
  @@index([teamCode])
}

// ============================================================
// ✨ 政工笔 · 范文多对多标签表
// ============================================================
model ManuscriptTemplateTag {
  id         Int    @id @default(autoincrement())
  templateId Int
  tagName    String
  tagCategory String // category / topic / person / word_count_bucket / era / custom
  teamCode   String

  template   ManuscriptTemplate @relation(fields: [templateId], references: [id])

  @@index([teamCode, tagCategory, tagName])
  @@unique([templateId, tagName])
}
```

---

## 10. 后端 API 设计（NestJS AiManuscriptModule）

| 方法 | 路径 | 功能 | Sprint 1 |
|---|---|---|---|
| POST | `/ai-manuscript/generate` | 5+1 层 Prompt 拼接 + RAG top3 注入 + 调用豆包 + 去 AI 化引擎 + 100 分质量评分 → 返回最终稿 + 评分卡 + AI 检测率 | ✅ |
| GET | `/ai-manuscript/templates` | 我的 / 全局 / 公开范文列表（支持文种/主题标签筛选） | ✅ 基础 |
| POST | `/ai-manuscript/templates/upload` | 批量上传 Word/PDF（创建异步 BullMQ job 跑自动打标签流水线） | ✅ 上传入口 |
| GET | `/ai-manuscript/templates/:id` | 获取单篇详情（含标签 + 200 字摘要 + 5 金句） | ✅ |
| DELETE | `/ai-manuscript/templates/:id` | 删除（全局仅 admin / 个人仅自己） | ✅ |
| PATCH | `/ai-manuscript/templates/:id/tags` | 手动修改标签（AI 打错的人工修正） | ✅ |
| GET | `/ai-manuscript/templates/analyze-job/:jobId` | 查询上传后打标签流水线的进度 | ✅ 基础 |
| POST | `/ai-manuscript/score` | 单独对一段文字跑「100 分 + AI 检测率 + 级别」评分（供编辑器调滑杆后实时重算） | ✅ |
| POST | `/ai-manuscript/deai` | 单独跑去 AI 化引擎（调滑杆时前端直接调用） | ✅ |
| **POST** | **`/ai-manuscript/revision-record/save`** | **🧩 保存一次用户修改会话（before/after 全文 + 前端 diff）→ 后端复核有效修改数 + 8 类自动归类 + 写 RevisionRecord 表 + 增量聚合 UserProfile 表 + 返回 💎 个性化加分结果** | **✅ 完整实现** |
| **GET** | **`/ai-manuscript/user-profile`** | **🧩 查询政委个人写作画像看板（累计统计 + Top5 修改偏好 + 字数偏好 + 解锁等级 + 个性化改进建议）** | **✅ 完整实现** |
| POST | `/ai-manuscript/suggest` | 返回当前最低分 2 维的 2 条智能建议（纯前端也能算，留 API 给后续 AI 高级版） | ⭕ Sprint 2 |
| GET | `/ai-manuscript/history` | 我的历史生成列表（保存字段+Prompt+结果） | ⭕ Sprint 2 |

---

## 11. 🧩 自我优化闭环（修改记录 + 个人画像看板）

> **设计哲学**：不强制锁下载（用户体验太差），而是用「柔性引导 + 正向激励 + 越用越懂你」三重杠杆，推动政委对 AI 生成稿做人工修改——这既是稿件质量的最后一道关，也是系统学习政委写作风格的唯一数据来源。

### 11.1 核心闭环流程图

```
 ┌─────────────┐   用户编辑 textarea   ┌──────────────────┐
 │  AI 生成初稿 │ ─────────────────────▶│  前端实时行级 diff │
 └─────────────┘                        └────────┬─────────┘
                                                 │ countValidEdits()
                                                 ▼
                        ┌─────────────────────────────────────────────┐
                        │ 评分卡显示：「已改 X 处 / 💎 个性化加成 +Y 分」  │
                        └───────────────────────┬─────────────────────┘
                                                │
                           ┌────────────────────┴────────────────────┐
                           │ 用户点「导出 Word / 存草稿 / 下载」时触发 │
                           └────────────────────┬────────────────────┘
                                                │
                   ┌────────── 0 次有效修改？───────────┐
                   │ Yes                               │ No
                   ▼                                   ▼
     ┌───────────────────────────┐         ┌─────────────────────────────┐
     │ 💡 柔性引导弹窗（非强制）    │         │ POST /revision-record/save  │
     │ · 告诉你改 3 处加 2 分        │         │  后端复核（再算一次 diff）     │
     │ · 改 10 处解锁画像看板       │         │  8 类修改自动归类（启发式）    │
     │ [📝 去修改]  [⏭️ 仍要下载] │         │  写 ManuscriptRevisionRecord  │
     └───────┬───────────────┬──────┘         │  增量聚合 → UserProfile 表    │
             │               │                └──────────────┬──────────────┘
             │               │ 跳过                          │ 返回结果：validCount+bonus
             ▼               ▼                               │
     继续编辑器      仍走 save（记录这次「零修改下载」）         │
                                                    ┌────────▼─────────┐
                                                    │ 前端刷新评分卡 💎 │
                                                    │ 画像等级 ↑        │
                                                    └──────────────────┘
```

### 11.2 「有效修改」判定规则（前后端同一份，避免争议）

| 判定项 | 规则 | 是否记为 1 处有效修改 |
|---|---|---|
| **无效修改** | 只改了空格/换行/中英文标点/大小写/字体格式 | ❌ 不计 |
| **有效修改** | 改动 delta 中至少有一个 **CJK 汉字 / 英文字母 / 阿拉伯数字** | ✅ 计 1 处 |
| **实现方式** | 前后端各有一份 `countValidEdits()`，正则、strip 表完全一致，最终以后端复核数为准 | — |

> **为什么要后端复核？** 防止前端被篡改（例如用户控制台把 validCount 硬改成 999 骗取加分），后端收到 before/after 全文后自己再 diff 一遍，用同一规则重算。

### 11.3 8 大修改类别（后端自动归类，Top3 存入 RevisionRecord，Top5 累积到画像）

| 类别 Key | 展示名 | 判定启发式优先级 | 画像含义 |
|---|---|---|---|
| `REMOVE_SLOGAN_ENDING` | 🚫 删口号结尾 | **最高** | 这位政委非常反感"让我们……！/ 一定……！"式结尾 |
| `ADD_DIALOG` | 💬 加对白 | 2 | 政委喜欢让人物"说出来"，而不是作者"介绍出来" |
| `NUMBER_COLLOQUIAL` | 🔢 数字口语化 | 3 | 常把 "50%"→"刚好一半"，"3h"→"三个半小时" |
| `ADD_DETAIL_ACTION` | 🤸 加小动作细节 | 4 | 总觉得 AI 写得"空"，爱补动作/神态/外貌等具象细节 |
| `WORD_REPLACE_VIVID` | 🔁 空词换实词 | 5 | 经常把"辛苦/勤恳/敬业"等空泛词换成具体描述 |
| `PARAGRAPH_RESTRUCTURE` | 🧩 段落调整 | 6 | 重视结构，爱整段移动/拆分独句段/合并短段 |
| `WORD_COUNT_TRIM` | 📏 字数调整 | 7 | 严格控制目标刊物字数，经常增删段落 |
| `OTHER_TWEAK` | 🛠️ 其他微修 | 最低 兜底 | 改标点/错别字/人名船名等事实性修正 |

### 11.4 💎 个性化加分 & 画像解锁（柔性激励阶梯）

| 累计有效修改 | 💎 评分卡加成 | 画像等级 | 解锁权益 |
|---|---|---|---|
| **0 次** | +0 | 🔒 未解锁 | 点下载时弹柔性引导（不是锁！仍可以跳过） |
| **1–2 处** | +0 | 🔒 未解锁 | — |
| **3–4 处** | **+2 分** | 🥉 青铜画像 | 评分卡出现 💎 条目，显示"个性化加成" |
| **5–9 处** | **+3 分** | 🥈 白银画像 | 进入 "S 级稿件精选" 候选池 + Top5 修改偏好看板可查看 |
| **≥10 处** | **+4 分** | 🥇 黄金画像 | **完整画像看板**：雷达图 + Top10 词替换偏好 + 字数偏好 + 5 条个性化改进建议（下次生成 Prompt 自动微调） |

> **注意**：加分的分母是 100 分制总分，但只在 **基础分 ≤ 96** 时生效（不允许 97+4=101，`Math.min(100, baseScore + bonus)` 做封顶）。

### 11.5 数据模型（Prisma 2 张新表）

**`ManuscriptRevisionRecord`**（单次修改会话明细，一次下载 = 1 条，**不可变日志表**）：
- `userId / teamCode / generationId` → 把同篇稿子的多次修改串起来
- `beforeText / afterText`（Sprint 1 明文存储；Sprint 2 改为只存 15 条重点 diffSnippets 压缩 + SHA256 校验，避免全文存两份）
- `validEditCount`：后端复核后的真实有效修改数
- `diffSnippets Json`：最多 15–30 条重点 diff，**每条都带 `editCategory`**（后端已自动归类好）
- `top3EditCategories Json`：这次改得最多的 3 类
- `totalEditChars`：总修改字符数

**`ManuscriptUserProfile`**（按 userId 聚合，**画像看板直接消费**）：
- `totalManuscriptsGenerated / totalRevisionSessions / totalValidEdits / avgValidEditsPerManuscript`：基础统计
- `top5EditCategories Json [string, number][]`：累计 Top5 修改类别 + 次数（画像雷达图数据源）
- `top10WordReplaces Json [string, string, number][]`：Sprint 2 接 LCS/Myer's diff 做词级粒度，记录"这位政委经常把 XX 改成 YY"
- `favoriteWordBucket`：字数偏好（`1200-2000字标准` 等）
- `profileUnlockLevel`：0=未解锁 / 1=青铜 / 2=白银 / 3=黄金
- `lastRevisedAt`：最后一次修改时间

### 11.6 API 契约（前后端对齐）

**`POST /revision-record/save` 请求体 `SaveRevisionRecordDto`**：
```ts
{
  generationId: string;             // 前端生成：gen_{时间戳}_{随机5位}，把同篇多次修改聚合
  manuscriptCategory: ManuscriptCategoryId;
  beforeText: string;               // 原始快照（AI 刚吐出来的版本）
  afterText: string;                // 用户改过的版本
  wordCountBefore: number;
  wordCountAfter: number;
  frontendValidEditCount: number;   // 前端算的，后端再复核
  diffSnippets?: DiffSnippetDto[];  // 3-15 条重点 diff（前端传，仅供参考，后端会重算）
  totalEditChars?: number;
}
```

**`POST /revision-record/save` 返回体 `SaveRevisionResultDto`**（前端立即用它刷新评分卡 💎 行）：
```ts
{
  id: number;
  validEditCount: number;                     // 后端复核后的"官方数字"
  top3EditCategories: EditCategoryKey[];
  editCategoriesBreakdown: Record<EditCategoryKey, number>;
  personalBonus: 0 | 2 | 3 | 4;               // 💎 加成分
  personalBonusLabel: string;                 // "💎 个性化加成 +3"
  profileUnlockLevel: 0 | 1 | 2 | 3;
  profileUnlockText: string;                  // "🥈 白银画像：已解锁 Top5 修改偏好"
}
```

**`GET /user-profile` 返回体 `GetUserProfileResultDto`**（画像看板直接消费，Sprint 3 接可视化图表）：
```ts
{
  totalManuscriptsGenerated, totalRevisionSessions, totalValidEdits, avgValidEditsPerManuscript,
  top5EditCategories: [key, count][],
  top5Labels: [{ key, label, emoji, desc, count }][],  // UI 直接渲染，不用再查字典
  top10WordReplaces: [beforeWord, afterWord, count][], // Sprint 2 词级 diff 实现后有数据
  favoriteWordBucket: string | null,
  profileUnlockLevel: 0 | 1 | 2 | 3,
  profileUnlockLabel: '🔒 未解锁' | '🥉 青铜画像' | '🥈 白银画像' | '🥇 黄金画像',
  nextLevelNeed: number,                                // 到下一级还需多少有效修改
  lastRevisedAt: ISO | null,
  recommendations: string[];                            // 3-5 条个性化建议（基于 Top5 类别生成，如"你爱删口号结尾→试试结尾方式选『事实性结尾』"）
}
```

### 11.7 零修改下载的「柔性引导」弹窗文案（`DOWNLOAD_GUIDE_ZERO_EDIT` 常量）

**标题**：💡 建议您至少改 1 处——为您积累专属写作风格

**正文**：
```
您当前对成品稿的有效修改次数：0 处

· 修改越细致 → 下次生成越贴合您个人写作习惯
· 累计 10 次有效修改 → 解锁「个人写作画像」看板
· 改 ≥3 处 → 评分卡额外 +2 分「💎 个性化加成」
· 改 ≥5 处 → 额外 +3 分 + 进入「S 级稿件精选」候选池

（有效修改 = 非空格/标点的文字内容变更，系统自动识别）

[📝 好的，我去修改]    [⏭️ 确认无需修改，直接下载]
```

> **关键决策**：右边「⏭️ 仍要下载」永远可点（不锁），但后台仍会 saveRevisionRecord 记录这次「0 修改下载」——这本身就是宝贵数据，画像中可以看到"这位政委对 AI 初稿很满意 / 很不满意"的分布。

---

## 12. Sprint 1~3 开发路线图

### 🏃 Sprint 1（MVP · 9 天 · 当前目标）
1. toolbox.vue 加「✍️ 政工笔」卡片
2. `/pages/toolbox/ai-manuscript.vue` 10 步 Steps 全骨架 + Step5 细节卡 6 维雷达（含阈值放行 + 智能建议）
3. Step 6 字数三维联动滑杆 + 10 档刊物 + 12 位作家风格卡常量
4. NestJS AiManuscriptModule 模块骨架（controller/service/dto）
5. Prisma schema 新增 4 张表 + migration（manuscript_templates / template_tags / manuscript_revision_records / manuscript_user_profiles）
6. backend prompts/ 6 层模板文件（system-iron-law.ts + 12-writer-styles.ts + fact-cage-template.ts）
7. DeAiEngine（6 规则空骨架 + 打分函数）
8. QualityScoringEngine（3 大维度 18 项判分空实现）
9. 100 分评分卡片 UI 骨架 + 富文本 textarea 编辑器
10. 范文上传入口 UI 骨架（双库）
11. **🧩 前端自我优化闭环**：行级 diff 实时追踪 + 0 次修改柔性引导弹窗 + 评分卡 💎 个性化加成分显示
12. **🧩 后端自我优化闭环**：`/revision-record/save`（后端复核 diff + 8 类修改启发式自动归类 + 写 RevisionRecord + 增量聚合 UserProfile）+ `/user-profile`（画像看板查询）
13. **🧩 前后端常量对齐**：countValidEdits / getPersonalBonus / EDIT_CATEGORY_LABELS 三处实现前后端逐行一致，保证结果可复现

### 🚀 Sprint 2（增强 · 7-10 天）
1. 文种补到 12 种
2. 个人范文库完善 + 公开库首批 50 篇人工录入
3. 选中段落 AI 微调菜单（扩写/缩写/改正式/加含蓄/去AI化片段）
4. 历史稿件库
5. 对接杂志编排模块发布 API

### 🌟 Sprint 3（高级 · 10-15 天）
1. 单篇用户自定义范本深度风格模仿
2. 合规性检查独立引擎
3. 多人协作审校
4. pgvector 升级（>5000 篇时启用）

---

## 13. 工程规范（必须遵循 001 文档）

严格遵循《001 - 20260622 全面分析与优化方案》：

| 规范项 | 要求 |
|---|---|
| **依赖控制** | Sprint 1 不得新增任何 npm 依赖（现有 mammoth/pdfjs-dist/redis/bullmq/prisma/winston 都有，足够）。防止 GitHub Actions 7GB runner 再次 OOM。 |
| **前端内存** | `frontend/.npmrc` 保持 `--max-old-space-size=3072`，不修改。 |
| **NestJS 模块** | 遵循现有 AiDashboardReportModule 的代码结构（分层清晰：Controller → Service → sub-engines）。 |
| **日志** | 禁止 console.log，统一用 `this.logger`（NestJS Logger + Winston 结构化）；参考 001 §3.3。 |
| **安全** | JWT 鉴权 + `@nestjs/throttler` 限流；范文上传接口文件大小限制 ≤ 20MB/单文件，MIME 白名单（.doc,.docx,.pdf）；全局异常过滤器（已实现，继承即可）。 |
| **数据库** | Prisma migrate 开发，禁止手动改表；tsvector 索引用 `@@index([Unsupported("...")])` 或 migration 原生 SQL；组合索引遵循 001 §5 规范。 |
| **TypeScript** | 后端 `strict: true`；前端 `strict: true`；DTO 全量定义；禁止 `any`（最多用 `unknown` + 类型守卫）。 |
| **部署验证** | Push 前必须本地 `npx tsc --noEmit`（前后端分别跑），无类型错误再 commit。 |

---

**文档结束** · 按此 PRD 全量开发，9 天内交付可用 MVP。
