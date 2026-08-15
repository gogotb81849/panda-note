// ============================================================
// 政工笔 · AI 智能写作 —— 前端常量集合 v1.0
// 包含：① 12 位作家文学风格调味卡
//       ② 15 种目标刊物字数行业对照表（三维联动推荐系统）
//       ③ 文种定义（Sprint 1 先 5 种，Sprint 2 补齐 12 种）
//       ④ 7 类细节卡类型定义
//       ⑤ 100 分制等级 & 可投级别对照表
// ============================================================

// ============================================================
// 1. 12 位作家 · 文学风格调味卡
// ============================================================
export type WriterStyleId =
  | 'none'
  | 'qiuzhongshu' | 'liangshiqiu' | 'wangzengqi' | 'zhuziqing'
  | 'shencongwen' | 'luxun' | 'luyao' | 'shitiesheng'
  | 'moyan' | 'bifeiyu' | 'xiaohong' | 'tiening';

export interface WriterStyleCard {
  id: WriterStyleId;
  name: string;                // 作家姓名
  era: string;                 // 生卒 / 时代说明
  gender: 'male' | 'female';
  avatar: string;              // emoji 头像（不装新依赖，用 emoji 代替图片）
  oneLiner: string;            // 【一句话风格卡】（UI 下拉时显示，核心）
  styleKeywords: string[];     // 注入 Prompt 用的关键词数组
  fitCategories: ManuscriptCategoryId[]; // 适配的文种
}

export const WRITER_STYLES: WriterStyleCard[] = [
  {
    id: 'none', name: '不调味（标准政工风格）', era: '—', gender: 'male',
    avatar: '📋',
    oneLiner: '保持政工文书的正式稳健，不额外加入任何文学修辞。',
    styleKeywords: ['正式公文', '稳健平实', '结构规范', '无文学修辞'],
    fitCategories: ['political_briefing', 'work_summary', 'meeting_minutes']
  },
  {
    id: 'qiuzhongshu', name: '钱锺书', era: '1910-1998', gender: 'male',
    avatar: '🎩',
    oneLiner: '「讽刺尖新，比喻智巧」——用新奇隐喻揭人性，不动声色带学者幽默，书卷气浓但不晦涩。',
    styleKeywords: ['智性比喻', '反讽', '双关', '书卷气', '冷幽默', '学者视角'],
    fitCategories: ['ship_news', 'work_summary']
  },
  {
    id: 'liangshiqiu', name: '梁实秋', era: '1903-1987', gender: 'male',
    avatar: '🍵',
    oneLiner: '「雅舍闲适，娓娓清谈」——日常小事写得有滋味，如与老友聊天，引中外名言点缀，文字温润干净。',
    styleKeywords: ['恬淡闲适', '引经据典', '不疾不徐', '清谈体', '温润'],
    fitCategories: ['advanced_deed', 'ship_news']
  },
  {
    id: 'wangzengqi', name: '汪曾祺', era: '1920-1997', gender: 'male',
    avatar: '🥟',
    oneLiner: '「人间烟火，淡而有味」——口语化浓，善写风土饮食小人物细节，无华丽辞藻，读着暖融融。',
    styleKeywords: ['口语化', '细节铺陈', '白描', '风俗描写', '短句', '无形容词堆砌'],
    fitCategories: ['advanced_deed', 'ship_news']
  },
  {
    id: 'zhuziqing', name: '朱自清', era: '1898-1948', gender: 'male',
    avatar: '🌿',
    oneLiner: '「真挚恳切，结构谨严」——抒情不靠口号，靠白描动作（如《背影》），结构规整，中文写作教科书级。',
    styleKeywords: ['真挚抒情', '白描动作', '首尾呼应', '结构严谨', '无虚浮之词'],
    fitCategories: ['advanced_deed']
  },
  {
    id: 'shencongwen', name: '沈从文', era: '1902-1988', gender: 'male',
    avatar: '🏞️',
    oneLiner: '「湘西诗化，美而不浮」——自然意象（水/风/黄昏）烘托气氛，语言如诗，节奏慢意境美。',
    styleKeywords: ['诗化语言', '自然意象烘托', '节奏舒缓', '乡土气息', '意境先行'],
    fitCategories: ['ship_news']
  },
  {
    id: 'luxun', name: '鲁迅', era: '1881-1936', gender: 'male',
    avatar: '🗡️',
    oneLiner: '「匕首投枪，入木三分」——短句有力，直击本质，反语对比写时弊，批评反思类段落的天花板。',
    styleKeywords: ['短句', '反语', '对比', '直击本质', '反思批判'],
    fitCategories: ['work_summary']
  },
  {
    id: 'luyao', name: '路遥', era: '1949-1992', gender: 'male',
    avatar: '🛠️',
    oneLiner: '「苦难中见理想，平凡中见伟大」——现实主义写普通人奋斗，用具体劳动动作链堆出"辛苦"，绝不说"他很累"。',
    styleKeywords: ['现实主义', '动作细节链', '物质生活细节', '苦难叙述', '理想主义抒情'],
    fitCategories: ['advanced_deed', 'ship_news']
  },
  {
    id: 'shitiesheng', name: '史铁生', era: '1951-2010', gender: 'male',
    avatar: '🕯️',
    oneLiner: '「哲思沉郁，娓娓追问」——叙事穿插命运/时间/亲情的哲学思考，语气平静但有重量。',
    styleKeywords: ['哲思', '追问意义', '平静语气', '记忆闪回', '亲情描写'],
    fitCategories: ['advanced_deed']
  },
  {
    id: 'moyan', name: '莫言', era: '1955-', gender: 'male',
    avatar: '🎆',
    oneLiner: '「天马行空，感官炸裂」——五感通感+夸张，嗅觉听觉触觉全开，大场面浓烈紧张感拉满。',
    styleKeywords: ['五感通感', '浓烈细节', '夸张修辞', '大场面', '民间叙事'],
    fitCategories: ['ship_news']
  },
  {
    id: 'bifeiyu', name: '毕飞宇', era: '1964-', gender: 'male',
    avatar: '🔍',
    oneLiner: '「冷静克制，手术刀式」——中国作协副主席系，一句话串2-3微动作，慢镜头回放，动词精准。',
    styleKeywords: ['微动作链', '心理白描', '冷静克制', '慢镜头', '精准动词'],
    fitCategories: ['advanced_deed']
  },
  {
    id: 'xiaohong', name: '萧红', era: '1911-1942', gender: 'female',
    avatar: '❄️',
    oneLiner: '「荒凉之中藏温热，碎片叙事见命运」——民国四大才女之一，季节/天气/荒凉环境衬托境遇，女性视角细腻，句子像冬天玻璃上的水汽。',
    styleKeywords: ['环境烘托', '女性视角', '碎片叙事', '凄清基调', '季节感'],
    fitCategories: ['advanced_deed', 'ship_news']
  },
  {
    id: 'tiening', name: '铁凝', era: '1957-', gender: 'female',
    avatar: '💎',
    oneLiner: '「日常之中见深意，温婉大气不矫情」——中国文联主席+作协主席，擅长写普通人的善意和成长，语言扎实厚重，没有华丽辞藻但情感力透纸背，非常适配政工"正能量但不空洞"的需求。',
    styleKeywords: ['日常化叙事', '女性善意', '扎实厚重', '点到为止', '温暖底色'],
    fitCategories: ['advanced_deed', 'political_briefing', 'ship_news', 'work_summary']
  }
];

// ============================================================
// 2. 文种定义（Sprint 1 先上 5 种最高频）
// ============================================================
export type ManuscriptCategoryId =
  | 'advanced_deed'      // 先进事迹
  | 'political_briefing' // 政工简报
  | 'ship_news'          // 船舶通讯
  | 'meeting_minutes'    // 会议纪要
  | 'work_summary';      // 工作总结

export const CATEGORIES_SPRINT1: Array<{
  id: ManuscriptCategoryId;
  name: string;
  icon: string;
  desc: string;
  defaultJournalId: string; // 默认预选的目标刊物
  recommendWriterStyle: WriterStyleId[]; // 推荐的作家调味
}> = [
  {
    id: 'advanced_deed',
    name: '先进事迹 / 人物稿',
    icon: '🏅',
    desc: '劳模、优秀党员、岗位能手、好人好事类人物特写',
    defaultJournalId: 'cosco_shipping_news_normal',
    recommendWriterStyle: ['wangzengqi', 'zhuziqing', 'luyao', 'bifeiyu', 'tiening']
  },
  {
    id: 'political_briefing',
    name: '政工简报 / 党建动态',
    icon: '📢',
    desc: '三会一课、主题党日、学习教育、支部动态简报',
    defaultJournalId: 'cosco_shipping_political_briefing',
    recommendWriterStyle: ['tiening', 'none']
  },
  {
    id: 'ship_news',
    name: '船舶通讯 / 新闻报道',
    icon: '🚢',
    desc: '船舶动态、生产作业、应急处置、港口见闻类通讯稿',
    defaultJournalId: 'cosco_shipping_news_normal',
    recommendWriterStyle: ['liangshiqiu', 'wangzengqi', 'shencongwen', 'moyan', 'tiening']
  },
  {
    id: 'meeting_minutes',
    name: '会议纪要',
    icon: '📝',
    desc: '支委会、船员大会、专题部署等会议纪要',
    defaultJournalId: 'ship_branch_briefing',
    recommendWriterStyle: ['none']
  },
  {
    id: 'work_summary',
    name: '工作总结 / 述职报告',
    icon: '📊',
    desc: '月度/季度/年度工作总结、个人述职、专项汇报',
    defaultJournalId: 'fleet_company_journal',
    recommendWriterStyle: ['qiuzhongshu', 'luxun', 'tiening']
  }
];

// ============================================================
// 3. 15 种目标刊物 · 字数行业对照表（三维联动滑杆的数据源）
// ============================================================
export interface JournalWordCountRef {
  journalId: string;
  journalName: string;
  category: ManuscriptCategoryId | 'all';
  min: number;          // 推荐区间下限（录用率最高）
  max: number;          // 推荐区间上限
  absoluteMax: number;  // 绝对上限，超了 90% 被退回
  remark: string;
}

export const JOURNAL_WORDCOUNT_REF: JournalWordCountRef[] = [
  {
    journalId: 'cosco_shipping_news_normal',
    journalName: '📰 中国远洋海运报（普通版）',
    category: 'ship_news',
    min: 800, max: 1500, absoluteMax: 2000,
    remark: '报纸版面有限，超 2000 字基本会被编辑大砍。90% 以上录用稿在 800~1500 字。'
  },
  {
    journalId: 'cosco_shipping_news_frontpage',
    journalName: '📰 中国远洋海运报（头版/特稿）',
    category: 'ship_news',
    min: 1500, max: 2500, absoluteMax: 3000,
    remark: '头版篇幅稍宽，但极少超过 3000 字。'
  },
  {
    journalId: 'cosco_shipping_political_briefing',
    journalName: '📚 中远海运政工简报（集团月刊）',
    category: 'political_briefing',
    min: 600, max: 1200, absoluteMax: 1800,
    remark: '简报要精炼，超 1800 不合体例。'
  },
  {
    journalId: 'cosco_shipping_political_feature',
    journalName: '📚 中远海运政工简报（专题专稿）',
    category: 'advanced_deed',
    min: 1500, max: 2500, absoluteMax: 3500,
    remark: '专稿可稍长，但仍忌空洞。'
  },
  {
    journalId: 'china_water_transport_news',
    journalName: '📰 中国水运报',
    category: 'ship_news',
    min: 1000, max: 2000, absoluteMax: 3000,
    remark: ''
  },
  {
    journalId: 'china_transport_news',
    journalName: '📰 中国交通报',
    category: 'ship_news',
    min: 1200, max: 2200, absoluteMax: 3500,
    remark: ''
  },
  {
    journalId: 'fleet_company_journal',
    journalName: '🚢 船队 / 公司内部月刊',
    category: 'all',
    min: 500, max: 2000, absoluteMax: 3000,
    remark: '内部刊物相对宽松。'
  },
  {
    journalId: 'ship_branch_briefing',
    journalName: '⛴️ 单船 / 党支部简报',
    category: 'meeting_minutes',
    min: 300, max: 800, absoluteMax: 1200,
    remark: '短平快，不宜超过 1200 字。'
  },
  {
    journalId: 'family_letter_essay',
    journalName: '🧧 家书 / 生活随笔',
    category: 'ship_news',
    min: 500, max: 1500, absoluteMax: 2500,
    remark: '太长没人看。'
  },
  {
    journalId: 'national_waterway_journal',
    journalName: '🏛️ 国家级水运期刊（如《中国水运》）',
    category: 'ship_news',
    min: 2500, max: 4000, absoluteMax: 6000,
    remark: '期刊可长，超 6000 字通常分两期刊载。'
  },
  {
    journalId: 'work_summary_report',
    journalName: '📑 工作总结 / 述职报告',
    category: 'work_summary',
    min: 2000, max: 4000, absoluteMax: 6000,
    remark: '专项总结可 2000，年度述职 3000-4000。'
  },
  {
    journalId: 'advanced_deed_speech',
    journalName: '🎖️ 先进事迹（演讲版 / 上报版）',
    category: 'advanced_deed',
    min: 1500, max: 3000, absoluteMax: 4500,
    remark: '演讲 5 分钟 ≈ 1500 字，上报材料 3000 字最佳。'
  },
  {
    journalId: 'party_class_teaching',
    journalName: '💼 党课教案（主题教育）',
    category: 'political_briefing',
    min: 3000, max: 5000, absoluteMax: 8000,
    remark: '含讲解内容，字数可稍多。'
  },
  {
    journalId: 'initiative_praise_letter',
    journalName: '✍️ 倡议书 / 表扬信',
    category: 'political_briefing',
    min: 300, max: 800, absoluteMax: 1200,
    remark: '越短越有力量。'
  },
  {
    journalId: 'character_profile',
    journalName: '💬 人物专访 / 特写',
    category: 'advanced_deed',
    min: 1200, max: 2500, absoluteMax: 4000,
    remark: ''
  }
];

// 快捷档位按钮（UI 上直接点）
export const WORDCOUNT_PRESETS: Array<{ label: string; value: number }> = [
  { label: '300 字 · 便签级', value: 300 },
  { label: '800 字 · 短篇', value: 800 },
  { label: '1200 字 · 标准', value: 1200 },
  { label: '2000 字 · 深度', value: 2000 },
  { label: '3000 字 · 长稿', value: 3000 }
];

// ============================================================
// 4. 7 类细节卡类型定义（Step 5 堆积木用）
// ============================================================
export type DetailCardTypeId =
  | 'action'   // 🤸 动作
  | 'dialog'   // 💬 对话
  | 'env'      // 🌤️ 环境
  | 'senses'   // 🔊 五感
  | 'number'   // 🔢 数字
  | 'emotion'  // 🎭 情绪心理
  | 'free';    // ✏️ 自由

export interface DetailCardType {
  id: DetailCardTypeId;
  emoji: string;
  label: string;
  placeholder: string;       // textarea placeholder
  radarDim: keyof DetailsRadarScore; // 影响哪个雷达维度
  btnColor: string;          // Element Plus type: primary/success/warning/danger/info
}

export const DETAIL_CARD_TYPES: DetailCardType[] = [
  {
    id: 'action', emoji: '🤸', label: '动作卡',
    placeholder: '【谁 + 身体部位 + 具体动词】——不要写"他很辛苦"。例：王师傅右手扶缸头，左手袖口蹭额头上的汗，手背新疤 2cm 还没结痂。',
    radarDim: 'actionScore', btnColor: 'primary'
  },
  {
    id: 'dialog', emoji: '💬', label: '对话卡',
    placeholder: '【谁说了什么】——越口语越好！口头禅/半截话/方言都保留。例：王师傅对徒弟说："你先去吃，我再顶一个班，缸头差1度都不行。"',
    radarDim: 'dialogScore', btnColor: 'success'
  },
  {
    id: 'env', emoji: '🌤️', label: '环境卡',
    placeholder: '【时间/天气/温度/地点/气味/声音】。例：正午12:35，机舱48.5℃，缸头热浪扑面，柴油味混海风，风扇嗡嗡像蜂群。',
    radarDim: 'envScore', btnColor: 'warning'
  },
  {
    id: 'senses', emoji: '🔊', label: '五感卡',
    placeholder: '【闻到/听到/摸到/尝到/看到】。例："鼻尖一股铁锈味混柴油味" / "对讲机滋滋响，盖过主机嗡鸣" / "栏杆烫得缩手"。',
    radarDim: 'sensesScore', btnColor: 'info'
  },
  {
    id: 'number', emoji: '🔢', label: '数字卡',
    placeholder: '【航次/时长/百分比/人数/温度/次数】。例：本航次主机吊缸1次 / 节油12.3% / 连续值乘42天。',
    radarDim: 'numberScore', btnColor: 'danger'
  },
  {
    id: 'emotion', emoji: '🎭', label: '情绪心理卡',
    placeholder: '【偷偷的动作 / 欲言又止 / 心理活动 / 表情】。例：徒弟递完扳手看师父袖口湿了，鼻子一酸，低头没说话，悄悄把凉白开挪到师父脚边。',
    radarDim: 'emotionScore', btnColor: 'primary'
  },
  {
    id: 'free', emoji: '✏️', label: '自由卡',
    placeholder: '【其他任何想让 AI 知道的真实事实】——不拘形式，有什么写什么。',
    radarDim: 'actionScore', btnColor: ''
  }
];

// ============================================================
// 5. 6 维细节雷达评分规则 & 建议模板
// ============================================================
export interface DetailsRadarScore {
  actionScore:  number;  // 0-20
  dialogScore:  number;  // 0-15
  envScore:     number;  // 0-15
  sensesScore:  number;  // 0-10
  numberScore:  number;  // 0-20
  emotionScore: number;  // 0-20
  total: number;         // = 上述相加（0-100）
  grade: 'red' | 'orange' | 'yellow' | 'green';
}

export const RADAR_SMART_SUGGESTIONS: Record<string, string[]> = {
  low_action: [
    "试试写一个『手/眼睛/肩膀/背/腰』的小动作——哪怕就一句『他锤了锤腰』都比空写『他很辛苦』强 10 倍！",
    "想一想：主角拿工具时是『抓/握/捏/攥』？扶栏杆时是哪只手？坐下时是猛坐还是慢慢落？",
    "参考路遥/毕飞宇风格：把一个大动作拆成 2-3 个微动作连起来写。"
  ],
  low_dialog: [
    "师徒间的工作对白？哪怕就一句师傅纠正徒弟错误的话——大白话最有用！",
    "慰问时政委说过什么？被慰问者怎么回的？哪怕一句『谢谢政委！』都画龙点睛。",
    "大家常说的口头禅、玩笑话、喊号子？直接写出来，AI 会帮你自然融入。"
  ],
  low_env: [
    "这件事发生在什么时辰？日出/正午/黄昏/深夜？当时的天气（风/浪/雨/雪）？",
    "如果在机舱：温度多少度？风扇声大不大？柴油味浓不浓？",
    "如果靠港：哪个港口？码头边飘着什么味（海腥/煤/集装箱冷柜味）？"
  ],
  low_senses: [
    "鼻子闻到了什么？（柴油味/饭菜香/海风/铁锈味/西瓜的甜香…）",
    "耳朵听到了什么？（主机嗡嗡/海浪拍船/对讲机滋滋/工友喊号子/警铃…）",
    "用手摸到了什么感觉？（缸头烫得缩手/冰凉的栏杆/粘了满手油/钞票被汗水浸软…）"
  ],
  low_number: [
    "这件事干了几个小时？（精确到半小时，如 3.5 小时不是『大半天』）",
    "涉及多少人？/节约了多少燃油（百分比也行）？/巡检了多少个点？",
    "温度/速度/距离/次数——任何数字都比形容词更有说服力。"
  ],
  low_emotion: [
    "有没有『欲言又止』的时刻？（张了张嘴没说话/话到嘴边又咽回去）",
    "有没有『偷偷的小动作』？（偷偷看一眼照片/悄悄挪了挪水杯/背过身擦眼泪）",
    "有没有旁观者的反应来侧面衬托？（政委拍肩膀没说话/徒弟红了眼睛/路过的水手竖大拇指）"
  ]
};

// ============================================================
// 6. 100 分制等级 & 可投级别对照表（评分卡用）
// ============================================================
export const SCORE_GRADE_TABLE: Array<{
  min: number; max: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  color: string; // tailwind bg / text 类名片段
  advice: string;
}> = [
  { min: 95, max: 100, grade: 'S', label: '卓越', color: 'purple',
    advice: '集团年度优秀稿件征集 / 国家级水运期刊通过率≥70% / 中远海运报头版推荐' },
  { min: 90, max: 94, grade: 'A', label: '优秀', color: 'green',
    advice: '中国远洋海运报普通版通过率≥85% / 公司/船队内部刊物100%可用' },
  { min: 80, max: 89, grade: 'B', label: '良好', color: 'emerald',
    advice: '船队/公司内部刊物100%可用 / 中远海运报普通版建议微调后投递' },
  { min: 70, max: 79, grade: 'C', label: '合格', color: 'yellow',
    advice: '单船/党支部内部刊物100%可用 / 上报公司建议先润色' },
  { min: 60, max: 69, grade: 'D', label: '待改进', color: 'orange',
    advice: '不建议直接报送 → 补字段 / AI 再润色 / 手动修改 5-8 处细节' },
  { min: 0,  max: 59, grade: 'E', label: '不合格', color: 'red',
    advice: '建议重新生成 → 检查：要素完整性 / 细节卡丰富度 / 自由指令是否写清楚' }
];

export const AI_DETECT_RATE_THRESHOLDS = [
  { max: 10,  label: '🟢 优秀（主流检测器几乎100%判人类手写）', color: 'green' },
  { max: 15,  label: '🟡 良好（绝大多数情况判为人类）',         color: 'yellow' },
  { max: 25,  label: '🟠 临界（建议一键加强去AI化）',           color: 'orange' },
  { max: 100, label: '🔴 危险（检测器大概率判AI，必须处理）',   color: 'red' }
];

// ============================================================
// 7. 自我优化闭环：有效修改判定规则 + 💎个性化加分规则 + 8 类修改分类
// ============================================================

/**
 * 8 大修改类别（revision 自动归类，前后端共用一份字典）
 * 后续画像看板："这位政委最爱做的修改——加动作细节 / 删口号结尾"
 */
export type EditCategoryKey =
  | 'ADD_DETAIL_ACTION'     // ① 加小动作细节（把"他很辛苦"→"手背上2cm新疤还没结痂"）
  | 'ADD_DIALOG'            // ② 加对白（增加人物对话）
  | 'REMOVE_SLOGAN_ENDING'  // ③ 删口号式结尾（AI 最喜欢写的"让我们……！"/"一定会……！"）
  | 'WORD_REPLACE_VIVID'    // ④ 空词换实词（"辛苦/任劳任怨/兢兢业业"→具体动作/对白）
  | 'PARAGRAPH_RESTRUCTURE' // ⑤ 段落调整（整段移动、合并、拆分、加独句段）
  | 'WORD_COUNT_TRIM'       // ⑥ 字数删减/扩充（整句删去以适配目标刊物字数）
  | 'NUMBER_COLLOQUIAL'     // ⑦ 数字口语化（"约 50%"→"刚好一半"）
  | 'OTHER_TWEAK';          // ⑧ 其他（改标点、错别字、人名/船名等）

export const EDIT_CATEGORY_LABELS: Record<EditCategoryKey, { label: string; emoji: string; desc: string }> = {
  ADD_DETAIL_ACTION:    { label: '加小动作细节', emoji: '🤸', desc: '你经常觉得 AI 写得太"空"，喜欢补动作、神态、外貌等具象细节' },
  ADD_DIALOG:           { label: '加对白',       emoji: '💬', desc: '你喜欢让人物"说出来"而不是作者"介绍出来"' },
  REMOVE_SLOGAN_ENDING: { label: '删口号结尾',   emoji: '🚫', desc: '你严格拒绝"让我们……！""一定会……！"这类空喊口号' },
  WORD_REPLACE_VIVID:   { label: '空词换实词',   emoji: '🔁', desc: '你经常把"辛苦/勤恳/敬业"这类空泛词换成真实描述' },
  PARAGRAPH_RESTRUCTURE:{ label: '段落调整',     emoji: '🧩', desc: '你重视结构，常移动段落、拆长段为独句段' },
  WORD_COUNT_TRIM:      { label: '字数调整',     emoji: '📏', desc: '你严格控制目标字数，经常增删段落以适配目标刊物' },
  NUMBER_COLLOQUIAL:    { label: '数字口语化',   emoji: '🔢', desc: '你喜欢把干巴巴的数字换成生活化表达（如"一半""三个半小时"）' },
  OTHER_TWEAK:          { label: '其他微修',     emoji: '🛠️', desc: '标点/错别字/人名船名等事实修正' }
};

/**
 * 有效修改判定规则（前后端同一份，避免前后端计数不一致）
 * 「无效修改」= 纯空格/标点/换行/大小写 改动，不记为 1 处有效修改
 * 「有效修改」= 改动内容中至少有一个 CJK 汉字 / 英文单词
 */
export function countValidEdits(
  diffs: Array<{ type: 'insert' | 'delete' | 'replace'; before?: string; after?: string }>
): { count: number; validDiffs: typeof diffs } {
  const HAS_VALID_CHAR = /[\u4e00-\u9fa5A-Za-z0-9]/; // 只要有汉字/英文/数字就算有效
  let count = 0;
  const validDiffs: typeof diffs = [];
  for (const d of diffs) {
    const before = d.before ?? '';
    const after = d.after ?? '';
    // 跳过完全一样
    if (before === after) continue;
    // 去掉空格/标点/换行后，检查有没有有效字符
    const strip = (s: string) => s.replace(/[\s，。！？、；：""''（）《》…—·\-,.!?;:()<>"'_/\\\[\]{}@#$%^&*+=`~|]/g, '');
    const strippedDelta = (d.type === 'insert' || d.type === 'replace') ? strip(after) : strip(before);
    if (!HAS_VALID_CHAR.test(strippedDelta)) continue;
    count++;
    validDiffs.push(d);
  }
  return { count, validDiffs };
}

/**
 * 💎 个性化加成规则（柔性激励：不是强锁，而是正向加分）
 *  ┌───────────────┬───────────────┬─────────────────────────────────────────┐
 *  │ 有效修改次数  │ 额外加分      │ 解锁权益                                 │
 *  ├───────────────┼───────────────┼─────────────────────────────────────────┤
 *  │ 0 次          │ +0            │ 弹窗柔性提示去修改                       │
 *  │ 1-2 处        │ +0            │ —                                        │
 *  │ 3-4 处        │ +2            │ 💎 个性化加成 +2                        │
 *  │ 5-9 处        │ +3            │ 💎 个性化加成 +3 + 进入 S 级稿件候选池   │
 *  │ ≥10 处        │ +4            │ 💎 个性化加成 +4 + 解锁个人画像看板      │
 *  └───────────────┴───────────────┴─────────────────────────────────────────┘
 */
export function getPersonalBonus(validEditCount: number): {
  bonus: 0 | 2 | 3 | 4;
  label: string;
  unlockLevel: 0 | 1 | 2 | 3; // 画像解锁等级
  unlockText: string;
} {
  if (validEditCount >= 10) return { bonus: 4, label: '💎 个性化加成 +4', unlockLevel: 3, unlockText: '🎉 黄金级画像：已解锁完整个人写作偏好分析' };
  if (validEditCount >= 5)  return { bonus: 3, label: '💎 个性化加成 +3', unlockLevel: 2, unlockText: '🥈 白银级画像：已解锁 Top5 修改偏好 / 进入 S 级稿候选池' };
  if (validEditCount >= 3)  return { bonus: 2, label: '💎 个性化加成 +2', unlockLevel: 1, unlockText: '🥉 青铜级画像：再改 7 处即可解锁完整个人画像看板' };
  return { bonus: 0, label: '', unlockLevel: 0, unlockText: '改满 3 处可解锁个性化加分，满 10 处解锁个人画像看板 ✨' };
}

/**
 * 柔性引导弹窗文案（用户 0 次修改点下载时弹）
 */
export const DOWNLOAD_GUIDE_ZERO_EDIT = {
  title: '💡 建议您至少改 1 处——为您积累专属写作风格',
  intro: (validEditCount: number) => `您当前对成品稿的有效修改次数：${validEditCount} 处`,
  bullets: [
    '· 修改越细致 → 下次生成越贴合您个人写作习惯',
    '· 累计 10 次有效修改 → 解锁「个人写作画像」看板',
    '· 改 ≥3 处 → 评分卡额外 +2 分「💎 个性化加成」',
    '· 改 ≥5 处 → 额外 +3 分 + 进入「S 级稿件精选」候选池'
  ],
  hint: '（有效修改 = 非空格/标点的文字内容变更，系统自动识别）',
  btnGoEdit: '📝 好的，我去修改',
  btnSkip:   '⏭️  确认无需修改，直接下载'
};
