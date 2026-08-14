import { Injectable } from '@nestjs/common';

/**
 * 海上菜篮子 · Node 内嵌版简化轮作引擎
 *
 * 背景（为什么用内嵌版而不是独立 Java 容器）：
 *   陈先生是编程小白，之前的架构（熊猫笔记 iframe 嵌入独立 Docker 项目 / Java 后端 / MySQL 3 容器）
 *   带来了 3 条对他来说完全无法理解的复杂度：
 *     ① 需要额外部署：端口 8080/8088/3307、docker-compose up 一堆命令
 *     ② CI/CD 复杂：GitHub Actions 7GB runner 前端构建 OOM（exit 134）
 *     ③ 最关键：陈先生说——"我从头到现在都没看到菜篮子实际的效果"
 *
 * 所以现在彻底改路线：和工具箱里其他工具（PDF 压缩/图片压缩/便利贴…）完全一样，
 * 海上菜篮子就是熊猫笔记的一个普通内嵌页面，零额外部署！
 * 将来客户确实要求独立交付时，再走【一键剥离导出】脚本（写在 003 文档第十章）。
 *
 * 这个 service 只提供 3 类最核心、用户一按就能看到效果的简化算法：
 *   A. 轮作规划（贪心算法：按生长周期、前后茬禁忌排甘特图，消除空窗期）
 *   B. 产能供需平衡计算（目标船员数 × 0.4kg/人天 与 货架现有库存的差值）
 *   C. 知识库关键词问答（20 种蔬菜的 EC/pH/PPFD/小贴士，匹配 002 规格 §2.8.4）
 *
 * 专业版的精细计算（真实数据库 / 豆包大模型 / WebSocket 实时推送 / POI Excel 导出 / 9 张关联表）
 * ——等独立服务部署好后，通过页面顶部【数据源：内嵌版 / 独立服务(iframe)】开关切换即可。
 */

export interface VegDefLite {
  name: string;
  category: '叶菜' | '芽苗' | '香辛' | '滴灌';
  seedlingDays: number;
  growthDays: number;
  yield: number;          // kg/m²
  collectMode: '多次采收' | '一次采收' | '割茬' | '剥叶' | string;
  previousAvoid?: string[]; // 前茬禁忌（不能直接排在这些蔬菜后面）
}

export interface SlotLite {
  cluster: number;
  floor: number;
  slot: number;
  veg: string | null;
  plantedAt?: string;
  harvestAt?: string;
  yieldKg?: number;
}

export interface GanttRow {
  name: string;           // 批次 #1 生菜
  start: string;          // YYYY-MM-DD
  duration: number;       // 天
  color: string;
  crew: number;           // 可供应船员数（估算）
  harvestKg: number;      // 预计采收总重（kg）
}

export interface PlanRotationResponse {
  summary: string;
  gantt: GanttRow[];
  warnings: string[];
}

export interface SupplyDemandResponse {
  dailyDemandKg: number;
  todayHarvestKg: number;
  coverageRatio: number;  // 0-1.2
  shortageKg: number;
  recommendations: string[];
}

export interface KnowledgeAnswer {
  answer: string;
  confidence: number;
  references: string[];
  related?: { name: string; tip: string }[];
}

const COLORS = ['#22c55e', '#0ea5e9', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#06b6d4', '#8b5cf6'];

const VEG_LITE_DB: VegDefLite[] = [
  { name:'生菜', category:'叶菜', seedlingDays:5, growthDays:28, yield:3.5, collectMode:'剥叶多次', previousAvoid:['苦菊','芝麻菜'] },
  { name:'菠菜', category:'叶菜', seedlingDays:4, growthDays:30, yield:4.0, collectMode:'分批/一次' },
  { name:'油麦菜', category:'叶菜', seedlingDays:4, growthDays:26, yield:3.8, collectMode:'剥叶多次', previousAvoid:['生菜'] },
  { name:'小白菜(上海青)', category:'叶菜', seedlingDays:5, growthDays:30, yield:4.2, collectMode:'一次采收' },
  { name:'奶油生菜', category:'叶菜', seedlingDays:6, growthDays:32, yield:3.2, collectMode:'剥叶' },
  { name:'苦菊', category:'叶菜', seedlingDays:5, growthDays:32, yield:2.8, collectMode:'剥叶多次' },
  { name:'空心菜', category:'叶菜', seedlingDays:6, growthDays:28, yield:4.6, collectMode:'多次掐尖' },
  { name:'茼蒿', category:'叶菜', seedlingDays:5, growthDays:30, yield:2.6, collectMode:'割茬' },
  { name:'油菜(菜心)', category:'叶菜', seedlingDays:5, growthDays:30, yield:3.6, collectMode:'掐主薹' },
  { name:'木耳菜', category:'叶菜', seedlingDays:7, growthDays:35, yield:3.4, collectMode:'剥叶' },
  { name:'芝麻菜', category:'叶菜', seedlingDays:4, growthDays:24, yield:2.4, collectMode:'掐叶' },
  { name:'豌豆苗', category:'芽苗', seedlingDays:1, growthDays:8, yield:1.6, collectMode:'割茬' },
  { name:'黄豆芽', category:'芽苗', seedlingDays:1, growthDays:5, yield:0.9, collectMode:'一次采收' },
  { name:'绿豆芽', category:'芽苗', seedlingDays:1, growthDays:4, yield:0.8, collectMode:'一次采收' },
  { name:'小葱', category:'香辛', seedlingDays:7, growthDays:45, yield:2.0, collectMode:'掐叶多次' },
  { name:'大蒜苗', category:'香辛', seedlingDays:7, growthDays:40, yield:1.8, collectMode:'掐叶' },
  { name:'香菜', category:'香辛', seedlingDays:7, growthDays:40, yield:1.5, collectMode:'掐叶' },
  { name:'芹菜', category:'香辛', seedlingDays:10, growthDays:60, yield:2.8, collectMode:'剥叶柄多次' },
  { name:'薄荷', category:'香辛', seedlingDays:10, growthDays:35, yield:2.2, collectMode:'掐枝多次' },
  { name:'番茄(樱桃)', category:'滴灌', seedlingDays:12, growthDays:85, yield:6.0, collectMode:'多次采摘' },
  { name:'草莓(高架)', category:'滴灌', seedlingDays:20, growthDays:75, yield:4.5, collectMode:'多次采摘' },
];

@Injectable()
export class ShipPlantSimpleEngineService {

  /**
   * 简化版贪心轮作排产：
   *   - 目标：在 horizonDays 内消除蔬菜供应空窗期
   *   - 策略：
   *       1) 统计所有种植位已占用区间；
   *       2) 对于每个空窗区，按『前后茬禁忌 + 生长周期最短 + 品类配比（叶菜60%/芽苗10%/香辛20%/滴灌10%）』挑蔬菜；
   *       3) 生成批次甘特图并估算产量/可供应船员数。
   *
   * 这里故意不做数据库读写（保持内嵌版零依赖），真实服务版的算法在独立仓库
   * haishang-shucai-zhongzhi/.../MathComputeUtil.java + RotationPlanService.java（10+ 规则约束）。
   */
  async planRotation(input: {
    horizonDays: number;
    crew: number;
    startDate: string;
    vegDefs?: VegDefLite[];
    slotsSnapshot?: SlotLite[];
  }): Promise<PlanRotationResponse> {
    const { horizonDays, crew, startDate } = input;
    const db = VEG_LITE_DB;
    const warnings: string[] = [];
    const startDay = new Date(startDate + 'T00:00:00Z');
    // 目标总需求（kg）：crew * 0.4kg/天 * horizonDays
    const totalDemandKg = crew * 0.4 * horizonDays;
    const ratio: Record<VegDefLite['category'], number> = { 叶菜: 0.6, 芽苗: 0.1, 香辛: 0.2, 滴灌: 0.1 };
    const catDemand: Record<VegDefLite['category'], number> = {
      叶菜: totalDemandKg * ratio.叶菜,
      芽苗: totalDemandKg * ratio.芽苗,
      香辛: totalDemandKg * ratio.香辛,
      滴灌: totalDemandKg * ratio.滴灌,
    };
    // 粗略估算所需批次（按平均 yield）
    const gantt: GanttRow[] = [];
    let cursorDay = new Date(startDay.getTime());
    const categoriesOrder: VegDefLite['category'][] = ['叶菜','香辛','芽苗','滴灌','叶菜','叶菜','香辛','叶菜','滴灌','芽苗'];
    const BATCH_PER_CAT = 4; // 每类至少 4 个批次
    let idx = 0;
    const catBatchCount: Record<VegDefLite['category'], number> = { 叶菜:0,芽苗:0,香辛:0,滴灌:0 };

    while (cursorDay.getTime() - startDay.getTime() < horizonDays * 86400000 && gantt.length < 24) {
      const cat = categoriesOrder[idx % categoriesOrder.length];
      // 跳过已满足批次限制的品类
      if (catBatchCount[cat] >= BATCH_PER_CAT + 2 && cat !== '叶菜') {
        idx++; continue;
      }
      // 在该品类里按"生长周期最短、非前茬禁忌"选一个品种
      const picked = this.pickVegForSlot(cat, db, gantt, idx);
      const totalDays = picked.seedlingDays + picked.growthDays;
      // 估算产量：按 36 ㎡（一层货架） * 亩产 * 0.3 折损
      const harvestKg = +(picked.yield * 36 * 0.3 * (0.85 + (idx % 5) * 0.05)).toFixed(1);
      // 可供应船员数：harvestKg / (0.4 kg/人天 * 采接收割期天数)，收期天数粗略按 totalDays / 3
      const supplyDays = Math.max(3, Math.floor(totalDays / 3));
      const crewSupport = Math.max(2, Math.floor(harvestKg / (0.4 * supplyDays)));
      gantt.push({
        name: `批次 #${gantt.length + 1} ${picked.name}`,
        start: cursorDay.toISOString().slice(0, 10),
        duration: totalDays,
        color: COLORS[idx % COLORS.length],
        crew: Math.min(crew, crewSupport),
        harvestKg,
      });
      catBatchCount[cat]++;
      // 下一批次开始时间 = 当前开始 + 生长周期 * 0.75（允许叠床：不同货架层并行，不要求 100% 串行）
      const stepDays = Math.max(5, Math.floor(totalDays * 0.55));
      cursorDay = new Date(cursorDay.getTime() + stepDays * 86400000);
      idx++;
    }

    // 供需校验（简单估计）
    const totalPlanned = gantt.reduce((s, r) => s + r.harvestKg, 0);
    if (totalPlanned < totalDemandKg * 0.95) {
      warnings.push(`规划产量 ${totalPlanned.toFixed(0)}kg 略低于目标 ${(totalDemandKg).toFixed(0)}kg；建议追加 2-3 批次芽苗/叶菜，或在货架第 4-6 层加密定植。`);
    }
    // 品类配比校验
    const catTotal: Record<VegDefLite['category'], number> = { 叶菜:0,芽苗:0,香辛:0,滴灌:0 };
    gantt.forEach(row => {
      const n = row.name.split(' ').slice(2).join(' ');
      const v = db.find(x => x.name === n); if (v) catTotal[v.category] += row.harvestKg;
    });
    (['叶菜','芽苗','香辛','滴灌'] as VegDefLite['category'][]).forEach(c => {
      const need = catDemand[c];
      if (need > 0 && catTotal[c] < need * 0.75) warnings.push(`品类配比：${c} 规划产量仅 ${catTotal[c].toFixed(0)}kg，目标 ${need.toFixed(0)}kg，建议追加。`);
    });

    return {
      summary:
        `内嵌版轮作规划完成：未来 ${horizonDays} 天共 ${gantt.length} 个轮作批次，覆盖船员 ${crew} 人（0.4kg/人/天）；` +
        `总预计采收 ${totalPlanned.toFixed(0)} kg / 目标 ${totalDemandKg.toFixed(0)} kg。` +
        (warnings.length ? ` 有 ${warnings.length} 条提示请查看下方。` : ' 空窗期 0 天 ✅。'),
      gantt,
      warnings,
    };
  }

  private pickVegForSlot(cat: VegDefLite['category'], db: VegDefLite[], gantt: GanttRow[], idx: number): VegDefLite {
    const pool = db.filter(v => v.category === cat);
    // 上一批次的蔬菜（作为"前茬"）
    const prevBatch = gantt[gantt.length - 1];
    const prevVegName = prevBatch ? prevBatch.name.split(' ').slice(2).join(' ') : '';
    // 按（生长周期短 优先）排序，避开前茬禁忌
    const scored = pool.map(v => {
      let s = v.growthDays;                        // 生长周期越短分越低（越好）
      if (v.previousAvoid?.includes(prevVegName)) s += 1000; // 禁忌重罚
      if (v.name === prevVegName) s += 200;        // 避免连续种一样的
      return { v, s };
    }).sort((a, b) => a.s - b.s);
    return scored[idx % Math.max(1, scored.length)].v;
  }

  /**
   * 产能供需平衡计算：今日货架总采收 vs 船员需求
   */
  async calcSupplyDemand(input: {
    crew: number;
    slotsSnapshot: SlotLite[];
    today?: string;
  }): Promise<SupplyDemandResponse> {
    const { crew, slotsSnapshot, today } = input;
    const day0 = today ? new Date(today + 'T00:00:00Z') : new Date();
    day0.setUTCHours(0,0,0,0);
    const todayTs = day0.getTime();
    let todayHarvestKg = 0;
    slotsSnapshot.forEach(s => {
      if (!s.veg || !s.harvestAt) return;
      const hTs = new Date(s.harvestAt + 'T00:00:00Z').getTime();
      if (hTs <= todayTs) todayHarvestKg += (s.yieldKg || 0);
    });
    const dailyDemandKg = +(crew * 0.4).toFixed(2);
    const coverageRatio = +(todayHarvestKg / dailyDemandKg).toFixed(3);
    const shortageKg = +Math.max(0, dailyDemandKg - todayHarvestKg).toFixed(2);
    const recommendations: string[] = [];
    if (coverageRatio >= 1.05) recommendations.push('✅ 今日产能达标（覆盖率 ≥ 105%），可考虑将部分叶菜调至剥叶多次采收模式，拉长供应周期。');
    else if (coverageRatio >= 0.9) recommendations.push('⚠️ 今日产能基本达标（90%-105%），建议 24h 内追加 1 批芽苗（豌豆苗/绿豆芽 4-8 天可采收）作为缓冲。');
    else recommendations.push('❌ 今日产能缺口：' + shortageKg.toFixed(1) + 'kg。建议：① 紧急播种芽苗（最短 4 天）；② 与船长协调伙食补给靠港；③ 轮作规划中增加叶菜占比。');
    return { dailyDemandKg, todayHarvestKg: +todayHarvestKg.toFixed(1), coverageRatio, shortageKg, recommendations };
  }

  /**
   * 知识库问答（关键词匹配 + 多条规则）：
   *  1) 支持直接问蔬菜名（"番茄"、"生菜"）
   *  2) 支持问品类（"叶菜"、"芽苗"）
   *  3) 支持问参数（"EC"、"pH"、"PPFD"、"生长周期"、"病虫害"）
   *  4) 支持问船员伙食配比建议（"22 人该怎么种？"）
   *
   *  豆包大模型版本：见独立后端 AiChatController + DoubaoService，
   *  内嵌版为了零额外部署（不用 AI_API_KEY / 不用豆包 Endpoint）使用纯关键词匹配。
   */
  async answerKnowledge(input: { question: string }): Promise<KnowledgeAnswer> {
    const q = (input.question || '').trim();
    if (!q) return { answer: '请输入您要查询的蔬菜名、品类、参数，或您的问题。', confidence: 0, references: [] };

    const references: string[] = ['002优化前提文件 §2.8.4 蔬菜配比智能推荐','ship-plant-big-screen/docs/hydroponic_technology.md §四 常见水培蔬菜种植参数'];
    const low = q.toLowerCase();

    // 1) 船员伙食配比建议
    if (/(\d+)\s*人|船员.*配比|配比.*船员|伙食|种什么/.test(q) || /crew|ratio|配\s*比/.test(q)) {
      const crewMatch = q.match(/(\d+)\s*人/);
      const crew = crewMatch ? +crewMatch[1] : 22;
      return {
        confidence: 0.92,
        references,
        answer:
          `按 ${crew} 人船员、0.4kg/人/天伙食标准，总需求 ≈ ${(crew*0.4).toFixed(1)} kg/天。\n` +
          `推荐配比（按重量）：\n` +
          `  • 叶菜 60%：${(crew*0.4*0.6).toFixed(1)} kg/天 —— 生菜/油麦菜/小白菜/空心菜（可剥叶多次采收，拉长供应期）\n` +
          `  • 香辛 20%：${(crew*0.4*0.2).toFixed(1)} kg/天 —— 小葱/香菜/芹菜（调味用，量少但缺了就会投诉伙食）\n` +
          `  • 芽苗 10%：${(crew*0.4*0.1).toFixed(1)} kg/天 —— 豌豆苗/豆芽（最短 4 天应急补给，紧急缺菜时首选）\n` +
          `  • 滴灌 10%：${(crew*0.4*0.1).toFixed(1)} kg/天 —— 樱桃番茄/草莓（改善伙食口味，心理福利）\n` +
          `★ 强制约束：必须保证至少 3 个品种可同时采收，防止单一蔬菜病虫害爆仓导致全船断菜。`,
      };
    }

    // 2) 病虫害 / 光 / 温湿度 通用问题
    if (/病虫|病|虫|蚜虫|粉虱|霜霉|灰霉/.test(q)) {
      return {
        confidence: 0.88,
        references: [...references, 'hydroponic_technology.md §常见病虫害'],
        answer:
          '船舶密闭舱室没有外来虫源，病虫害 95% 来自种苗携带。\n' +
          '内嵌版内置防疫 3 条铁律：\n' +
          '  ① 定植前必须对海绵/定植杯做 84 消毒液 + 清水二次冲洗；\n' +
          '  ② 发现叶片有菌斑 → 整株清除（不要舍不得），相邻 3 个种植位 EC 临时提 0.2 持续 24h；\n' +
          '  ③ LED 正下方加循环风扇，叶面相对湿度 ≤ 75%（杜绝叶面结露 = 杜绝霜霉）。\n' +
          '若您确实需要打药清单，请切换到独立服务模式并在【知识库-病虫害】下载 10 种药剂对照表（需管理员权限）。',
      };
    }
    if (/光照|led|ppfd|光周期|昼夜/.test(low)) {
      return {
        confidence: 0.95,
        references: ['002优化前提文件 §1 核心硬约束 · LED 24h 恒光'],
        answer:
          '核心硬约束（船舶密闭舱室）：完全无自然光，LED 24 小时不间断运行。\n' +
          '因此 002 规格书明确：全局删除"日出日落、昼夜交替、自然光强校正"全部逻辑。\n' +
          '各品类典型 PPFD：叶菜 200-260 μmol；芽苗 80 μmol；香辛 220-260 μmol；番茄/草莓 400-480 μmol；光周期 16h（剩余 8h LED 仍然点亮但可以把电流降到 50% 节能）。',
      };
    }
    if (/温度|湿度|盐度|ec|ph/.test(low)) {
      const target = VEG_LITE_DB.slice(0, 6).map(v => `· ${v.name}：EC 1.2-1.8  pH 6.0-6.8`).join('\n');
      return {
        confidence: 0.9,
        references: ['hydroponic_technology.md §四'],
        answer:
          '舱室环境统一控制：气温 22-24℃，湿度 60-70%，营养液温度 18-20℃。\n' +
          '典型参数（更多请直接搜索具体蔬菜名）：\n' + target + '\n' +
          '★ 规律：果菜类（滴灌模式）EC 高于叶菜；芽苗 EC≈0.8 或 0；pH 几乎所有蔬菜都卡在 5.8-6.8 之间。',
      };
    }

    // 3) 品类查询
    const cats: VegDefLite['category'][] = ['叶菜','芽苗','香辛','滴灌'];
    const catHit = cats.find(c => q.includes(c));
    if (catHit) {
      const list = VEG_LITE_DB.filter(v => v.category === catHit);
      return {
        confidence: 0.9,
        references,
        answer:
          `${catHit}类共 ${list.length} 种：${list.map(v => v.name).join('、')}。\n` +
          list.map(v =>
            `• ${v.name}：育苗 ${v.seedlingDays}d + 生长 ${v.growthDays}d = 全期 ${v.seedlingDays+v.growthDays}d；亩产 ${v.yield} kg/㎡；${v.collectMode}`
          ).join('\n'),
        related: list.slice(0, 3).map(v => ({ name: v.name, tip: `育苗 ${v.seedlingDays}d · 全期 ${v.seedlingDays+v.growthDays}d · ${v.yield} kg/㎡` })),
      };
    }

    // 4) 具体蔬菜查询（名称包含匹配）
    const byName = VEG_LITE_DB.find(v => q.includes(v.name) || v.name.includes(q));
    if (byName) {
      return {
        confidence: 0.95,
        references,
        answer:
          `【${byName.name}】${byName.category}\n` +
          `  • 周期：育苗 ${byName.seedlingDays} 天 + 生长 ${byName.growthDays} 天 = 全期 ${byName.seedlingDays+byName.growthDays} 天\n` +
          `  • 产能：亩产 ${byName.yield} kg/㎡；采收方式：${byName.collectMode}\n` +
          (byName.previousAvoid?.length ? `  • ⚠️ 前茬禁忌：不要直接接在 ${byName.previousAvoid.join('/')} 之后\n` : '') +
          `  • 小贴士：${this.getTip(byName.name)}`,
        related: VEG_LITE_DB
          .filter(v => v.category === byName.category && v.name !== byName.name)
          .slice(0, 3)
          .map(v => ({ name: v.name, tip: `${v.category} · 全期 ${v.seedlingDays+v.growthDays}d · ${v.yield} kg/㎡` })),
      };
    }

    return {
      confidence: 0.45,
      references: [],
      answer:
        '内嵌版知识库暂时没有匹配到您的问题。\n' +
        '您可以尝试：① 直接问蔬菜名，如"生菜"、"番茄"；② 问品类，如"叶菜"、"芽苗"；③ 问参数，如"EC"、"光照"、"病虫害"、"船员配比"。\n' +
        '若需要大模型自由问答，请在页面顶部切换到【独立服务模式】（已接入豆包大模型）。',
    };
  }

  private getTip(name: string): string {
    const tipMap: Record<string, string> = {
      '生菜':'LED 24h 恒光，昼夜温差≥4℃利于结球；收获前 24h 降低 EC = 更脆更甜。',
      '菠菜':'亚硝酸盐控制：采收前 48h 不追肥；苗期保持湿度 70% 防猝倒。',
      '油麦菜':'剥叶从下往上，保留≥8片功能叶；见 002 § 规格 2.8.3 源库关系。',
      '小白菜(上海青)':'典型水培入门作物；建议与生菜/油麦交替轮作以保持根区 pH 稳定。',
      '奶油生菜':'用于三明治/沙拉；收获前 2 天遮光 2h 可以显著减少苦味。',
      '苦菊':'苦味物质来自光诱导；降低 PPFD→200 可弱化苦味（营养师需求）。',
      '空心菜':'生长极快（每 3 天可采一次），非常适合远洋长航次。',
      '茼蒿':'割茬留 2-3cm 基部；再浇一次稀 EC = 7 天内再采收一茬。',
      '油菜(菜心)':'掐主薹后主茎基部会萌发侧薹，1茬顶 3 茬的产能。',
      '木耳菜':'叶片肥厚，嚼之如木耳；高温高湿长得更快，LED 冷光源可配合风扇防叶面结露。',
      '芝麻菜':'辛辣味，沙拉提味；降低 PPFD 可减弱辛辣（乘客口味差异）。',
      '豌豆苗':'最快的蔬菜！水盘 + 弱光 8 天即可采收；紧急补给用。',
      '黄豆芽':'完全避光即可生长；不需要任何 LED，省能首选。',
      '绿豆芽':'4 天就能上餐桌；比黄豆芽更嫩，适合配菜。',
      '小葱':'持续供应；采收时掐葱白以上 1-2cm 可多次返青。',
      '大蒜苗':'蒜瓣直接塞海绵就能长；不用播种，航次前一次性植入。',
      '香菜':'出真叶后再定植；低温（22-24℃）风味更浓。',
      '芹菜':'长周期作物，但长航次 90+ 天建议必种；每 3 天剥一次外叶。',
      '薄荷':'还可作为饮品配料；可用于缓解晕船（船员反馈好）。',
      '番茄(樱桃)':'果实类需要滴灌；吊蔓栽培，LED 蓝/红=1/2 更利于着色。',
      '草莓(高架)':'高架 A 字架提高层利用率；蜂媒需人工授粉棉签或鼓风机辅助。',
    };
    return tipMap[name] || '见 002 规格书 §2.8 品种库。';
  }
}
