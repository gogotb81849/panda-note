import { Injectable, Logger } from '@nestjs/common';
import * as OpenCC from 'opencc-js';

// 繁体→简体 转换器（用于船名简繁匹配）
// opencc-js: from='t'(繁体) to='cn'(简体)
const t2sConverter = OpenCC.Converter({ from: 't', to: 'cn' });
function toSimplified(s: string): string {
  if (!s) return s;
  try { return t2sConverter(s); } catch { return s; }
}

/**
 * 船舶报告解析服务
 * 解析船工主管粘贴的微信船舶报告文本，提取结构化字段
 * 优先使用豆包AI解析，AI不可用时用正则兜底
 */
@Injectable()
export class ShipReportParseService {
  private readonly logger = new Logger(ShipReportParseService.name);
  private readonly API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly API_KEY = process.env.AI_API_KEY;
  private readonly ENDPOINT_ID = process.env.AI_ENDPOINT_ID;

  /**
   * 解析船舶报告文本（可能包含多条船）
   * @param text 用户粘贴的原始文本
   * @returns 解析结果数组
   */
  async parseReport(text: string): Promise<{ success: boolean; data: any[]; message?: string; mode?: 'ai' | 'regex' }> {
    if (!text || !text.trim()) {
      return { success: false, data: [], message: '文本内容为空' };
    }

    // 优先 AI 解析
    if (this.API_KEY && this.ENDPOINT_ID && !this.API_KEY.startsWith('please-replace')) {
      const aiResult = await this.parseByAI(text);
      if (aiResult.success && aiResult.data.length > 0) {
        return { success: true, data: aiResult.data, mode: 'ai' };
      }
      this.logger.warn(`AI解析失败或无结果，回退正则解析: ${aiResult.message}`);
    }

    // 正则兜底
    const regexResult = this.parseByRegex(text);
    return { success: regexResult.length > 0, data: regexResult, mode: 'regex', message: regexResult.length === 0 ? '未能解析出任何船舶信息' : undefined };
  }

  /**
   * AI 解析（豆包/火山引擎方舟）
   */
  private async parseByAI(text: string): Promise<{ success: boolean; data: any[]; message?: string }> {
    const messages = [
      {
        role: 'system',
        content: `你是专业的船舶动态报告解析助手。用户会粘贴一段或多段微信里复制的船舶报告，每段对应一艘船。请提取每艘船的结构化字段。

字段说明：
- shipName: 船名（中文）
- voyage: 航次（如 V178）
- timezone: 船舶当前时区（如 GMT+8）
- cargoStatus: 载货状态（满载/空载/压载/半载等）
- departurePort: 出发港
- etaPort: 目的港（ETA对应港口）
- currentLocation: 当前状态位置（如"中国南海东行航行"）
- currentStatus: 船舶状态码，仅限：voyage(航行中)/anchored(锚泊)/arrived(抵港/到港未靠泊)/berthed(靠泊)。判定规则：航行/在航→voyage；锚泊/抛锚→anchored；抵港/到港/抵达/到达但未靠泊→arrived；靠泊/在港靠泊/alongside→berthed
- visibility: 能见度
- temperature: 气温（数字）
- windDirection: 风向（如 西南风）
- windForce: 风力（如 7级）
- waveLevel: 浪级（如 5级）
- eta: ETA时间，转成 ISO 8601 格式（如 2026-07-31T08:00:00）。若带时区则按该时区转UTC
- etaTimezone: ETA所在时区（如 GMT+9）
- otherNotes: 其它说明原文
- focusPoints: 关注重点原文

要求：
1. 返回 JSON 数组，每个元素是一艘船
2. 字段无法识别则设为 null，不要编造
3. 只输出 JSON，不要任何解释文字`,
      },
      {
        role: 'user',
        content: `请解析以下船舶报告文本：

${text}

返回 JSON 数组格式：
[
  {
    "shipName": "鲸鱼座",
    "voyage": "V178",
    "timezone": "GMT+8",
    "cargoStatus": "满载",
    "departurePort": "惠州",
    "etaPort": "CHIBA",
    "currentLocation": "中国南海东行航行",
    "currentStatus": "voyage",
    "visibility": "7",
    "temperature": "26",
    "windDirection": "西南风",
    "windForce": "7级",
    "waveLevel": "5级",
    "eta": "2026-07-31T08:00:00+09:00",
    "etaTimezone": "GMT+9",
    "otherNotes": "无演习计划及停车计划，抵港无大石油公司检查。",
    "focusPoints": "做好航行值班、PSC检查准备工作。"
  }
]`,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          model: this.ENDPOINT_ID,
          messages,
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, data: [], message: `AI服务调用失败: ${response.status}` };
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';

      // 提取 JSON 数组
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return { success: true, data: parsed };
        }
      }
      // 尝试单个对象
      const objMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const parsed = JSON.parse(objMatch[0]);
        return { success: true, data: [parsed] };
      }
      return { success: false, data: [], message: 'AI返回格式异常' };
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.logger.error('AI解析船舶报告失败', error);
      return { success: false, data: [], message: error.message || 'AI服务调用失败' };
    }
  }

  /**
   * 正则兜底解析（按固定格式）
   * 示例格式：
   * 鲸鱼座（V178 GMT+8）
   * 满载（惠州-CHIBA)
   * 目前状态位置：中国南海东行航行
   * 能见度：7；气温 26；西南风7级，浪5级
   * 其它说明:...
   * ETA：2026-07-31 0800LT （GMT+9）
   * 关注重点:...
   */
  private parseByRegex(text: string): any[] {
    const results: any[] = [];
    // 按空行或"船名（航次"行分割多船
    // 识别新船起始行：船名（航次 时区）
    const shipHeaderRe = /^(.{2,12})[（(]\s*(V\d+|v\d+)\s*([^)）]*)[)）]/m;

    const blocks = this.splitByShipBlocks(text);

    for (const block of blocks) {
      const parsed = this.parseSingleBlock(block);
      if (parsed && parsed.shipName) {
        results.push(parsed);
      }
    }
    return results;
  }

  /** 按船舶起始行切分多船文本块 */
  private splitByShipBlocks(text: string): string[] {
    const lines = text.split(/\r?\n/);
    const blocks: string[] = [];
    let current: string[] = [];

    // 船名起始行特征：含中文船名 + （V数字
    const isShipStart = (line: string) => /.{2,12}[（(]\s*V\d+/i.test(line);

    for (const line of lines) {
      if (isShipStart(line) && current.length > 0) {
        blocks.push(current.join('\n'));
        current = [];
      }
      current.push(line);
    }
    if (current.length > 0) blocks.push(current.join('\n'));
    return blocks;
  }

  /** 解析单船文本块 */
  private parseSingleBlock(block: string): any | null {
    const result: any = { currentStatus: 'voyage' };

    // 船名 + 航次 + 时区：鲸鱼座（V178 GMT+8）
    const headerMatch = block.match(/^(.{2,12})[（(]\s*(V\d+|v\d+)\s*([^)）]*)[)）]/m);
    if (!headerMatch) return null;
    result.shipName = headerMatch[1].trim();
    result.voyage = headerMatch[2].toUpperCase();
    const tzInHeader = headerMatch[3]?.trim();
    if (tzInHeader && /GMT|UTC/i.test(tzInHeader)) {
      result.timezone = tzInHeader;
    }

    // 载货状态 + 港口：满载（惠州-CHIBA)
    const cargoMatch = block.match(/(满载|空载|压载|半载|重载|轻载)[（(]\s*([^）)]*?)[）)]/);
    if (cargoMatch) {
      result.cargoStatus = cargoMatch[1];
      const ports = cargoMatch[2].split(/[-—–]/).map(s => s.trim()).filter(Boolean);
      if (ports.length >= 2) {
        result.departurePort = ports[0];
        result.etaPort = ports[ports.length - 1];
      } else if (ports.length === 1) {
        result.etaPort = ports[0];
      }
    } else {
      // 单独找载货状态
      const cargoOnly = block.match(/(满载|空载|压载|半载|重载|轻载)/);
      if (cargoOnly) result.cargoStatus = cargoOnly[1];
    }

    // 目前状态位置
    const locMatch = block.match(/目前状态位置[：:]\s*(.+)/);
    if (locMatch) {
      result.currentLocation = locMatch[1].trim();
      if (/航行|在航/.test(locMatch[1])) result.currentStatus = 'voyage';
      else if (/锚泊|抛锚/.test(locMatch[1])) result.currentStatus = 'anchored';
      else if (/靠泊|在港靠泊|alongside/i.test(locMatch[1])) result.currentStatus = 'berthed';
      else if (/抵港|到港|抵达|到达/.test(locMatch[1])) result.currentStatus = 'arrived';
    }

    // 能见度/气温/风/浪：能见度：7；气温 26；西南风7级，浪5级
    const visMatch = block.match(/能见度[：:]\s*(\d+(?:\.\d+)?)/);
    if (visMatch) result.visibility = visMatch[1];

    const tempMatch = block.match(/气温[：:]\s*(\d+(?:\.\d+)?)/);
    if (tempMatch) result.temperature = tempMatch[1];

    const windMatch = block.match(/([东南西北西]+风)\s*(\d+)\s*级/);
    if (windMatch) {
      result.windDirection = windMatch[1];
      result.windForce = `${windMatch[2]}级`;
    }

    const waveMatch = block.match(/浪\s*(\d+)\s*级/);
    if (waveMatch) result.waveLevel = `${waveMatch[1]}级`;

    // ETA：2026-07-31 0800LT （GMT+9）
    const etaMatch = block.match(/ETA[：:]\s*(\d{4}-\d{1,2}-\d{1,2})\s+(\d{2,4})\s*(?:LT|当地时间)?\s*[（(]?\s*(GMT[+\-]\d+|UTC[+\-]\d+)?/i);
    if (etaMatch) {
      const dateStr = etaMatch[1];
      const timeStr = etaMatch[2];
      const tz = etaMatch[3];
      if (tz) result.etaTimezone = tz;
      // 组装 ISO
      const hh = timeStr.length === 4 ? timeStr.slice(0, 2) : timeStr.slice(0, 2);
      const mm = timeStr.length === 4 ? timeStr.slice(2) : (timeStr.slice(3, 5) || '00');
      result.eta = `${dateStr}T${hh}:${mm}:00`;
    }

    // 其它说明
    const otherMatch = block.match(/其它说明\s*[：:]\s*(.+)/);
    if (otherMatch) result.otherNotes = otherMatch[1].trim();

    // 关注重点
    const focusMatch = block.match(/关注重点\s*[：:]\s*(.+)/);
    if (focusMatch) result.focusPoints = focusMatch[1].trim();

    return result.shipName ? result : null;
  }

  /**
   * 解析政委报告文本（可能包含多条船）
   * @param text 用户粘贴的原始文本
   * @returns 解析结果数组
   */
  async parsePoliticalReport(text: string): Promise<{ success: boolean; data: any[]; message?: string; mode?: 'ai' | 'regex' }> {
    if (!text || !text.trim()) {
      return { success: false, data: [], message: '文本内容为空' };
    }

    if (this.API_KEY && this.ENDPOINT_ID && !this.API_KEY.startsWith('please-replace')) {
      const aiResult = await this.parsePoliticalByAI(text);
      if (aiResult.success && aiResult.data.length > 0) {
        return { success: true, data: aiResult.data, mode: 'ai' };
      }
      this.logger.warn(`政委报告AI解析失败，回退正则解析: ${aiResult.message}`);
    }

    const regexResult = this.parsePoliticalByRegex(text);
    return { success: regexResult.length > 0, data: regexResult, mode: 'regex', message: regexResult.length === 0 ? '未能解析出任何政委报告信息' : undefined };
  }

  /**
   * AI 解析政委报告
   */
  private async parsePoliticalByAI(text: string): Promise<{ success: boolean; data: any[]; message?: string }> {
    const messages = [
      {
        role: 'system',
        content: `你是专业的船舶政委报告解析助手。用户会粘贴一段或多段微信里复制的政委报告，每段对应一艘船。请提取每艘船的结构化字段。

实际报告示例格式：
- "V211航次2026年7月27日0754LT（东5.5区）离泊SIKKA B泊位，ETA惠州8月11日0900LT。"
- "2026年7月26日1518靠泊泉州港。"
- "334航次，7月25日1000LT靠泊锦州502#泊位装货。"
- "2026年7月23日1130LT韩国DAESAN锚地开航，下航次加拿大温哥华"

字段说明：
- shipName: 船名（中文）
- politicalOfficer: 政委姓名（如"政委：胡伟森"）
- voyage: 航次（如"334航次""V211航次"）
- location: 当前位置描述（如"靠泊泉州港""新加坡排污水和加淡水"）
- status: 状态描述（如"顺利离岗""到港""航行中""靠泊中"，从描述中提取简短状态）
- eta: 预计抵港时间（如"8月4日""8月11日0900LT"）
- etaPort: 目的港（如"惠州""大连""加拿大温哥华"）
- leaveTime: 离岗/开航时间（如"7月23日1130LT"）
- weather: 天气（如"晴""多云""阴天"等，没有则为null）
- seaCondition: 海况（如"3级""良好"等，没有则为null）
- staffChange: 人员变更（如"张三接替李四""无变更"等，没有则为null）
- remark: 备注/说明（其他补充信息）

要求：
1. 返回 JSON 数组，每个元素是一艘船
2. 字段无法识别则设为 null，不要编造
3. 只输出 JSON，不要任何解释文字
4. location和status不要重复，location是位置描述，status是状态判断`,
      },
      {
        role: 'user',
        content: `请解析以下政委报告文本：

${text}

返回 JSON 数组格式：
[
  {
    "shipName": "珊瑚座",
    "politicalOfficer": null,
    "voyage": "V211航次",
    "location": "离泊SIKKA B泊位",
    "status": "离泊",
    "eta": "8月11日0900LT",
    "etaPort": "惠州",
    "leaveTime": "2026年7月27日0754LT",
    "weather": null,
    "seaCondition": null,
    "staffChange": null,
    "remark": "东5.5区"
  }
]`,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          model: this.ENDPOINT_ID,
          messages,
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, data: [], message: `AI服务调用失败: ${response.status}` };
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';

      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return { success: true, data: parsed };
        }
      }
      const objMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const parsed = JSON.parse(objMatch[0]);
        return { success: true, data: [parsed] };
      }
      return { success: false, data: [], message: 'AI返回格式异常' };
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.logger.error('AI解析政委报告失败', error);
      return { success: false, data: [], message: error.message || 'AI服务调用失败' };
    }
  }

  /**
   * 正则兜底解析政委报告
   * 实际格式示例：
   * 珊瑚座
   * V211航次2026年7月27日0754LT（东5.5区）离泊SIKKA B泊位，ETA惠州8月11日0900LT。
   * 连杉湖
   * 2026年7月26日1518靠泊泉州港。
   * 秋池
   * 334航次，7月25日1000LT靠泊锦州502#泊位装货。
   */
  private parsePoliticalByRegex(text: string): any[] {
    const results: any[] = [];
    const shipNames = ['孔雀座', '河池', '海豚座', '远玉河', '秀池', '連樂湖', '珊瑚座', '远菊湾', '连柏湖', '远莲湾', '连欢湖', '楠林湾', '桦林湾', '連桂湖', '梅林湾', '贵池', '天鹅座', '桐林灣', '白鹭座', '榕林湾', '连松湖', '华川', '鲸鱼座', '連囍湖', '连杉湖', '業池', '远兰湾', '麒麟座', '山鹰座', '远晶河', '华池', '连杨湖', '秋池', '智能云帆'];

    const shipNamesSimple = shipNames.map(n => toSimplified(n));

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let currentShip: any = null;
    let inShipBlock = false;

    for (const line of lines) {
      const lineSimple = toSimplified(line);
      let matchedShip = '';
      for (let i = 0; i < shipNames.length; i++) {
        if (line.includes(shipNames[i]) || lineSimple.includes(shipNamesSimple[i])) {
          matchedShip = shipNames[i];
          break;
        }
      }
      if (matchedShip) {
        if (currentShip && currentShip.shipName) {
          extractStatusFromDescription(currentShip);
          results.push(currentShip);
        }
        currentShip = { shipName: matchedShip };
        inShipBlock = true;
        continue;
      }

      if (!inShipBlock || !currentShip) continue;

      const zhRegex = (key: string, field: string) => {
        const match = line.match(new RegExp(`(${key})[：:]\\s*(.+)`));
        if (match) currentShip[field] = match[2].trim();
      };

      zhRegex('政委', 'politicalOfficer');
      zhRegex('今日动态|状态|动态', 'status');
      zhRegex('天气', 'weather');
      zhRegex('海况', 'seaCondition');
      zhRegex('离岗时间|离岗', 'leaveTime');
      zhRegex('到岗时间|到岗|抵港时间|抵港', 'arrivalTime');
      zhRegex('人员变更|人员变动', 'staffChange');
      zhRegex('备注|说明', 'remark');

      const voyageMatch = line.match(/([A-Z]?\d+航次)/);
      if (voyageMatch) currentShip.voyage = voyageMatch[1];

      const etaMatch = line.match(/ETA\s*([^，。,]+)/);
      if (etaMatch) {
        const etaParts = etaMatch[1].split(/\s+/);
        if (etaParts.length >= 2) {
          currentShip.etaPort = etaParts[0];
          currentShip.eta = etaParts.slice(1).join(' ');
        } else {
          currentShip.eta = etaMatch[1];
        }
      }

      const etaChineseMatch = line.match(/预计\s*([^\s]+)\s*抵达/);
      if (etaChineseMatch) {
        currentShip.eta = etaChineseMatch[1];
      }

      const portMatch = line.match(/下航次\s*([^，。,]+)/);
      if (portMatch) currentShip.etaPort = portMatch[1];

      const leaveTimeMatch = line.match(/(\d{4}年)?\d{1,2}月\d{1,2}日\s*\d{4}?\s*?(LT)?/);
      if (leaveTimeMatch && !currentShip.leaveTime) {
        currentShip.leaveTime = leaveTimeMatch[0].trim();
      }

      if (!currentShip.location) {
        currentShip.location = line;
      }
    }

    if (currentShip && currentShip.shipName) {
      extractStatusFromDescription(currentShip);
      results.push(currentShip);
    }

    return results;
  }
}

function extractStatusFromDescription(ship: any) {
  if (!ship.location) return;
  
  const loc = ship.location;
  
  if (loc.includes('靠泊') || loc.includes('靠妥') || loc.includes('靠')) {
    ship.status = '靠泊';
  } else if (loc.includes('离泊') || loc.includes('离港')) {
    ship.status = '离泊';
  } else if (loc.includes('开航')) {
    ship.status = '开航';
  } else if (loc.includes('抵达') || loc.includes('到港')) {
    ship.status = '抵达';
  } else if (loc.includes('抛锚')) {
    ship.status = '抛锚';
  } else if (loc.includes('装货') || loc.includes('卸货')) {
    ship.status = loc.includes('装货') ? '装货中' : '卸货中';
  } else if (loc.includes('补给')) {
    ship.status = '补给中';
  } else if (loc.includes('航行')) {
    ship.status = '航行中';
  }
}
