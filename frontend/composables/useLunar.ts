import { computed, ref } from 'vue'

// 农历数据（1900-2100年）
const lunarInfo: number[] = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x0a576,0x0a4d0,
  0x0e250,0x1d4b6,0x0d250,0x0d520,0x0dd40,0x0b5a0,0x05b60,0x055d0,0x049a0,0x0a5d0,
  0x15175,0x052b0,0x0a930,0x07935,0x06aa0,0x0ad50,0x05b54,0x04b60,0x0a6e0,0x0a4e0,
  0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,
  0x0d250,0x0d520,0x0dd40,0x0b5a0,0x05b60,0x055d0,0x049a0,0x0a5d0,0x15175,0x052b0,
  0x0a930,0x07935,0x06aa0,0x0ad50,0x05b54,0x04b60,0x0a6e0,0x0a4e0,0x0d260,0x0ea65,
  0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,
  0x0dd40,0x0b5a0,0x05b60,0x055d0,0x049a0,0x0a5d0,0x15175,0x052b0,0x0a930,0x07935,
  0x06aa0,0x0ad50,0x05b54,0x04b60,0x0a6e0,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,
  0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd40,0x0b5a0,
]

const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','']
const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']
const nStr1 = ['日','一','二','三','四','五','六','七','八','九','十']
const nStr2 = ['初','十','廿','']
const monthName = ['正','二','三','四','五','六','七','八','九','十','冬','腊']

// 二十四节气名称（按公历月份顺序，每月2个）
const solarTermNames = [
  '小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨',
  '立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑',
  '白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'
]

// 24 节气 C 值表（20世纪 / 21世纪），用于寿星通用公式
// 公式: Y * 0.2422 + C - floor(Y/4) - floor((Y-1)/4)（结果取整数日 = 当月节气日）
// 节气序号 0-23 对应小寒..冬至；按月份 + 上/下节气排列
// C 值来源：[20世纪, 21世纪]，参考《新编万年历》
const solarTermCValues: Array<[number, number]> = [
  [5.4055, 5.4055],   // 小寒 1月
  [20.12, 20.12],     // 大寒 1月
  [4.1549, 3.87],     // 立春 2月（21世纪修正）
  [19.0198, 18.73],   // 雨水 2月
  [6.2322, 5.63],     // 惊蛰 3月
  [20.946, 20.646],   // 春分 3月
  [5.528, 4.81],      // 清明 4月
  [20.332, 20.1],     // 谷雨 4月
  [6.318, 5.52],      // 立夏 5月
  [21.232, 21.04],    // 小满 5月
  [6.5, 5.678],       // 芒种 6月
  [22.028, 21.87],    // 夏至 6月
  [7.928, 7.108],     // 小暑 7月
  [23.232, 22.83],    // 大暑 7月
  [8.428, 7.5],       // 立秋 8月
  [23.628, 23.13],    // 处暑 8月
  [8.528, 7.646],     // 白露 9月
  [23.928, 23.45],    // 秋分 9月
  [9.328, 8.318],     // 寒露 10月
  [24.028, 23.438],   // 霜降 10月
  [8.328, 7.438],     // 立冬 11月
  [22.828, 22.36],    // 小雪 11月
  [7.628, 7.18],      // 大雪 12月
  [22.728, 21.94],    // 冬至 12月
]

// 计算某年的 24 节气日期表（返回 24 个 Date 对象，对应序号 0..23）
function computeSolarTermsOfYear(year: number): Date[] {
  const result: Date[] = []
  const century = year >= 2000 ? 1 : 0
  for (let i = 0; i < 24; i++) {
    const month = Math.floor(i / 2) + 1 // 1..12
    const c = solarTermCValues[i][century]
    // 公式: Y * 0.2422 + C - floor(Y/4) - floor((Y-1)/4)
    // 其中 Y 是年份后两位
    const y2 = year % 100
    let day = Math.floor(y2 * 0.2422 + c - Math.floor(y2 / 4) - Math.floor((y2 - 1) / 4))
    // 21世纪某些节气有特殊修正，简化处理：限制在 1-31 之间
    if (day < 1) day = 1
    if (day > 31) day = 30
    result.push(new Date(year, month - 1, day))
  }
  return result
}

// 缓存：年份 -> Map<"MM-DD", 节气名>
const solarTermCache = new Map<number, Map<string, string>>()

function getSolarTermMap(year: number): Map<string, string> {
  if (solarTermCache.has(year)) return solarTermCache.get(year)!
  const terms = computeSolarTermsOfYear(year)
  const map = new Map<string, string>()
  terms.forEach((d, i) => {
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map.set(key, solarTermNames[i])
  })
  solarTermCache.set(year, map)
  return map
}

// 获取指定日期的节气名（无则返回空串）
function getSolarTermByDate(date: Date): string {
  const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return getSolarTermMap(date.getFullYear()).get(key) || ''
}

// 节日
const festivals: Record<string, string> = {
  '0101': '元旦',
  '0214': '情人节',
  '0308': '妇女节',
  '0312': '植树节',
  '0401': '愚人节',
  '0501': '劳动节',
  '0504': '青年节',
  '0601': '儿童节',
  '0701': '建党节',
  '0801': '建军节',
  '0910': '教师节',
  '1001': '国庆节',
  '1011': '双十一',
  '1225': '圣诞节',
}

// 农历节日
const lunarFestivals: Record<string, string> = {
  '0101': '春节',
  '0115': '元宵节',
  '0202': '龙抬头',
  '0505': '端午节',
  '0707': '七夕节',
  '0715': '中元节',
  '0815': '中秋节',
  '0909': '重阳节',
  '1208': '腊八节',
  '1223': '小年',
  '0000': '除夕', // 特殊处理
}

function lYearDays(y: number) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    if ((lunarInfo[y - 1900] & i) !== 0) sum += 1
  }
  return sum + leapDays(y)
}

function leapMonth(y: number) {
  return lunarInfo[y - 1900] & 0xf
}

function leapDays(y: number) {
  if (leapMonth(y) !== 0) {
    return (lunarInfo[y - 1900] & 0x10000) !== 0 ? 30 : 29
  }
  return 0
}

function monthDays(y: number, m: number) {
  return (lunarInfo[y - 1900] & (0x10000 >> m)) === 0 ? 29 : 30
}

function toLunar(objDate: Date) {
  const baseDate = new Date(1900, 0, 31)
  let offset = Math.floor((objDate.getTime() - baseDate.getTime()) / 86400000)

  const year = objDate.getFullYear()
  const month = objDate.getMonth() + 1
  const day = objDate.getDate()

  let i, leap = 0
  let temp = 0
  for (i = 1900; i < 2101 && offset > 0; i++) {
    temp = lYearDays(i)
    offset -= temp
  }
  if (offset < 0) {
    offset += temp
    i--
  }

  const lunarYear = i
  leap = leapMonth(i)
  let isLeap = false

  for (i = 1; i < 13 && offset > 0; i++) {
    if (leap > 0 && i === (leap + 1) && !isLeap) {
      --i
      isLeap = true
      temp = leapDays(lunarYear)
    } else {
      temp = monthDays(lunarYear, i)
    }
    if (isLeap && i === (leap + 1)) isLeap = false
    offset -= temp
  }

  if (offset === 0 && leap > 0 && i === leap + 1) {
    if (isLeap) {
      isLeap = false
    } else {
      isLeap = true
      --i
    }
  }

  if (offset < 0) {
    offset += temp
    --i
  }

  const lunarMonth = i
  const lunarDay = offset + 1

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap: isLeap,
  }
}

function getLunarMonthName(m: number, isLeap: boolean) {
  const name = (isLeap ? '闰' : '') + monthName[m - 1] + '月'
  return name
}

function getLunarDayName(d: number) {
  if (d === 10) return '初十'
  if (d === 20) return '二十'
  if (d === 30) return '三十'
  const ten = Math.floor(d / 10)
  const one = d % 10
  return nStr2[ten] + nStr1[one]
}

function getGanZhi(year: number) {
  return Gan[(year - 4) % 10] + Zhi[(year - 4) % 12]
}

function getAnimal(year: number) {
  return Animals[(year - 4) % 12]
}

// 获取农历节日
function getLunarFestival(month: number, day: number, isLeap: boolean, lunarYear: number) {
  const key = String(month).padStart(2, '0') + String(day).padStart(2, '0')
  if (isLeap) return ''
  if (lunarFestivals[key]) return lunarFestivals[key]
  // 除夕：腊月最后一天
  if (month === 12) {
    const daysInMonth = monthDays(lunarYear, 12)
    if (day === daysInMonth) return '除夕'
  }
  return ''
}

// 获取公历节日
function getSolarFestival(month: number, day: number) {
  const key = String(month).padStart(2, '0') + String(day).padStart(2, '0')
  return festivals[key] || ''
}

// 历史事件纪念日（按月-日 → 事件名）【华为风格短版，≤6字】
// 来源：船舶政工系统常用纪念日
const historicalEvents: Record<string, string> = {
  '0207': '二七大罢工',
  '0308': '妇女节',
  '0312': '孙中山逝世',
  '0314': '马克思逝世',
  '0424': '中国航天日',
  '0504': '五四运动',
  '0505': '马克思诞辰',
  '0601': '儿童节',
  '0701': '建党纪念日',
  '0707': '七七事变',
  '0801': '建军节',
  '0815': '日本投降日',
  '0903': '抗战胜利纪念',
  '0909': '毛泽东逝世',
  '0918': '九一八事变',
  '0930': '烈士纪念日',
  '1001': '国庆节',
  '1010': '辛亥革命',
  '1019': '抗美援朝',
  '1112': '孙中山诞辰',
  '1201': '世界艾滋病',
  '1209': '一二九运动',
  '1213': '南京大屠杀',
  '1226': '毛泽东诞辰',
}

// ===== 三伏天数据（按"夏至三庚便入伏"的实际公开数据维护2024-2030） =====
// 每10天一个庚日。简化为每年的 [初伏日, 中伏日, 末伏日] 三元组，格式 MMDD
const SANFU_DATA: Record<number, [string, string, string]> = {
  2024: ['0715', '0725', '0814'],
  2025: ['0720', '0730', '0819'],
  2026: ['0716', '0726', '0814'], // ← 与华为截图8月14日"末伏"对得上
  2027: ['0721', '0731', '0820'],
  2028: ['0716', '0726', '0815'],
  2029: ['0720', '0730', '0819'],
  2030: ['0715', '0725', '0814'],
}

/**
 * 获得指定日期的三伏标签（初伏 / 中伏 / 末伏 / 空串）
 * 范围未命中时，按 7月中旬/下旬、8月中旬估算（兜底）
 */
function getSanFu(date: Date): string {
  const y = date.getFullYear()
  const md = `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const data = SANFU_DATA[y]
  if (data) {
    const [s1, s2, s3] = data
    const num = parseInt(md, 10)
    const start1 = parseInt(s1, 10)
    const start2 = parseInt(s2, 10)
    const start3 = parseInt(s3, 10)
    // 初伏：10天；中伏：20天（多数年）；末伏：10天
    if (num >= start1 && num < start2) return '初伏'
    if (num >= start2 && num < start3) return '中伏'
    if (num >= start3 && num < start3 + 10) return '末伏'
    return ''
  }
  // 兜底近似：7.12初伏/7.22中伏/8.11末伏
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (m === 7 && d >= 12 && d < 22) return '初伏'
  if (m === 7 && d >= 22) return '中伏'
  if (m === 8 && d < 11) return '中伏'
  if (m === 8 && d >= 11 && d < 21) return '末伏'
  return ''
}

// 获取历史事件纪念日
function getHistoricalEvent(month: number, day: number): string {
  const key = String(month).padStart(2, '0') + String(day).padStart(2, '0')
  return historicalEvents[key] || ''
}

// 法定节假日与调休数据（按年份维护，参考国务院放假安排）
// 字段：'holiday' = 法定假日；'workday' = 周末调休上班；未列入的按周末默认判断
// 维护说明：每年国务院发布放假安排后追加新一年数据
interface HolidayEntry {
  type: 'holiday' | 'workday'
  name?: string // 假日名称
}
const holidayData: Record<string, Record<string, HolidayEntry>> = {
  '2024': {
    '0101': { type: 'holiday', name: '元旦' },
    '0210': { type: 'holiday', name: '春节' },
    '0211': { type: 'holiday', name: '春节' },
    '0212': { type: 'holiday', name: '春节' },
    '0213': { type: 'holiday', name: '春节' },
    '0214': { type: 'holiday', name: '春节' },
    '0215': { type: 'holiday', name: '春节' },
    '0216': { type: 'holiday', name: '春节' },
    '0217': { type: 'holiday', name: '春节' },
    '0204': { type: 'workday' }, // 春节调休上班
    '0218': { type: 'workday' }, // 春节调休上班
    '0404': { type: 'holiday', name: '清明节' },
    '0405': { type: 'holiday', name: '清明节' },
    '0406': { type: 'holiday', name: '清明节' },
    '0407': { type: 'workday' }, // 清明调休上班
    '0501': { type: 'holiday', name: '劳动节' },
    '0502': { type: 'holiday', name: '劳动节' },
    '0503': { type: 'holiday', name: '劳动节' },
    '0504': { type: 'holiday', name: '劳动节' },
    '0505': { type: 'holiday', name: '劳动节' },
    '0428': { type: 'workday' }, // 五一调休上班
    '0511': { type: 'workday' }, // 五一调休上班
    '0610': { type: 'holiday', name: '端午节' },
    '0611': { type: 'holiday', name: '端午节' },
    '0612': { type: 'holiday', name: '端午节' },
    '0915': { type: 'holiday', name: '中秋节' },
    '0916': { type: 'holiday', name: '中秋节' },
    '0917': { type: 'holiday', name: '中秋节' },
    '0914': { type: 'workday' }, // 中秋调休上班
    '0929': { type: 'workday' }, // 国庆调休上班
    '0930': { type: 'workday' }, // 国庆调休上班
    '1001': { type: 'holiday', name: '国庆节' },
    '1002': { type: 'holiday', name: '国庆节' },
    '1003': { type: 'holiday', name: '国庆节' },
    '1004': { type: 'holiday', name: '国庆节' },
    '1005': { type: 'holiday', name: '国庆节' },
    '1006': { type: 'holiday', name: '国庆节' },
    '1007': { type: 'holiday', name: '国庆节' },
    '1012': { type: 'workday' }, // 国庆调休上班
  },
  '2025': {
    '0101': { type: 'holiday', name: '元旦' },
    '0128': { type: 'holiday', name: '春节' },
    '0129': { type: 'holiday', name: '春节' },
    '0130': { type: 'holiday', name: '春节' },
    '0131': { type: 'holiday', name: '春节' },
    '0201': { type: 'holiday', name: '春节' },
    '0202': { type: 'holiday', name: '春节' },
    '0203': { type: 'holiday', name: '春节' },
    '0204': { type: 'holiday', name: '春节' },
    '0126': { type: 'workday' }, // 春节调休上班
    '0208': { type: 'workday' }, // 春节调休上班
    '0404': { type: 'holiday', name: '清明节' },
    '0405': { type: 'holiday', name: '清明节' },
    '0406': { type: 'holiday', name: '清明节' },
    '0501': { type: 'holiday', name: '劳动节' },
    '0502': { type: 'holiday', name: '劳动节' },
    '0503': { type: 'holiday', name: '劳动节' },
    '0504': { type: 'holiday', name: '劳动节' },
    '0505': { type: 'holiday', name: '劳动节' },
    '0427': { type: 'workday' }, // 五一调休上班
    '0531': { type: 'holiday', name: '端午节' },
    '0601': { type: 'holiday', name: '端午节' },
    '0602': { type: 'holiday', name: '端午节' },
    '1001': { type: 'holiday', name: '国庆节' },
    '1002': { type: 'holiday', name: '国庆节' },
    '1003': { type: 'holiday', name: '国庆节' },
    '1004': { type: 'holiday', name: '国庆节' },
    '1005': { type: 'holiday', name: '国庆节' },
    '1006': { type: 'holiday', name: '中秋国庆' }, // 中秋国庆连休
    '1007': { type: 'holiday', name: '国庆节' },
    '1008': { type: 'holiday', name: '国庆节' },
    '0928': { type: 'workday' }, // 国庆调休上班
    '1011': { type: 'workday' }, // 国庆调休上班
  },
  '2026': {
    '0101': { type: 'holiday', name: '元旦' },
    '0102': { type: 'holiday', name: '元旦' },
    '0103': { type: 'holiday', name: '元旦' },
    // 2026 春节：2 月 17 日（农历正月初一）
    '0217': { type: 'holiday', name: '春节' },
    '0218': { type: 'holiday', name: '春节' },
    '0219': { type: 'holiday', name: '春节' },
    '0220': { type: 'holiday', name: '春节' },
    '0221': { type: 'holiday', name: '春节' },
    '0222': { type: 'holiday', name: '春节' },
    '0223': { type: 'holiday', name: '春节' },
    '0224': { type: 'holiday', name: '春节' },
    '0215': { type: 'workday' }, // 春节调休上班
    '0228': { type: 'workday' }, // 春节调休上班
    '0405': { type: 'holiday', name: '清明节' },
    '0406': { type: 'holiday', name: '清明节' },
    '0407': { type: 'holiday', name: '清明节' },
    '0501': { type: 'holiday', name: '劳动节' },
    '0502': { type: 'holiday', name: '劳动节' },
    '0503': { type: 'holiday', name: '劳动节' },
    '0504': { type: 'holiday', name: '劳动节' },
    '0505': { type: 'holiday', name: '劳动节' },
    '0426': { type: 'workday' }, // 五一调休上班
    '0509': { type: 'workday' }, // 五一调休上班
    '0619': { type: 'holiday', name: '端午节' },
    '0620': { type: 'holiday', name: '端午节' },
    '0621': { type: 'holiday', name: '端午节' },
    '0925': { type: 'holiday', name: '中秋节' },
    '0926': { type: 'holiday', name: '中秋节' },
    '1001': { type: 'holiday', name: '国庆节' },
    '1002': { type: 'holiday', name: '国庆节' },
    '1003': { type: 'holiday', name: '国庆节' },
    '1004': { type: 'holiday', name: '国庆节' },
    '1005': { type: 'holiday', name: '国庆节' },
    '1006': { type: 'holiday', name: '国庆节' },
    '1007': { type: 'holiday', name: '国庆节' },
    '1008': { type: 'holiday', name: '国庆节' },
    '0927': { type: 'workday' }, // 国庆调休上班（占位，以国务院公告为准）
    '1010': { type: 'workday' }, // 国庆调休上班（占位，以国务院公告为准）
  },
}

// 获取指定日期的休班类型
// 返回：{ isHoliday: boolean, isWorkday: boolean, name: string }
// 优先级：holidayData > 周末默认判断 > 工作日
function getHolidayInfo(date: Date): { isHoliday: boolean; isWorkday: boolean; name: string } {
  const yearStr = String(date.getFullYear())
  const mdKey = `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const yearData = holidayData[yearStr]
  if (yearData && yearData[mdKey]) {
    const entry = yearData[mdKey]
    return {
      isHoliday: entry.type === 'holiday',
      isWorkday: entry.type === 'workday',
      name: entry.name || '',
    }
  }
  // 默认：周末休班
  const dow = date.getDay()
  return {
    isHoliday: dow === 0 || dow === 6,
    isWorkday: false,
    name: '',
  }
}

export function useLunar() {
  function getLunarDate(date: Date) {
    const lunar = toLunar(date)
    const lunarMonthName = getLunarMonthName(lunar.month, lunar.isLeap)
    const lunarDayName = getLunarDayName(lunar.day)
    const ganZhi = getGanZhi(lunar.year)
    const animal = getAnimal(lunar.year)
    const lunarFestival = getLunarFestival(lunar.month, lunar.day, lunar.isLeap, lunar.year)
    const solarFestival = getSolarFestival(date.getMonth() + 1, date.getDate())

    const holiday = lunarFestival || solarFestival || ''
    const lunarStr = `${lunarMonthName}${lunarDayName}`

    // 农历月日格式 如 0101 用于匹配节日
    const md = String(lunar.month).padStart(2, '0') + String(lunar.day).padStart(2, '0')

    return {
      lunar: lunarStr,
      ganZhi,
      animal,
      holiday,
      md,
      lunarYear: lunar.year,
      lunarMonth: lunar.month,
      lunarDay: lunar.day,
      isLeap: lunar.isLeap,
    }
  }

  // 完整农历信息（含节气、三伏、历史事件、休班标记），供华为日历组件使用
  function getLunarInfo(date: Date) {
    const lunar = toLunar(date)
    const lunarMonthName = getLunarMonthName(lunar.month, lunar.isLeap)
    const lunarDayName = getLunarDayName(lunar.day)
    const ganZhi = getGanZhi(lunar.year)
    const animal = getAnimal(lunar.year)
    const lunarFestival = getLunarFestival(lunar.month, lunar.day, lunar.isLeap, lunar.year)
    const solarFestival = getSolarFestival(date.getMonth() + 1, date.getDate())
    const solarTerm = getSolarTermByDate(date)
    const historicalEvent = getHistoricalEvent(date.getMonth() + 1, date.getDate())
    const fu = getSanFu(date)
    const holidayInfo = getHolidayInfo(date)

    const holiday = lunarFestival || solarFestival || ''
    const lunarStr = `${lunarMonthName}${lunarDayName}`
    const isFirstOrFifteen = lunar.day === 1 || lunar.day === 15

    return {
      lunar: lunarStr,
      ganZhi,
      animal,
      holiday,             // 节日（公历+农历）
      solarTerm,           // 24节气
      historicalEvent,     // 历史事件纪念日（短版）
      fu,                  // 三伏：初伏/中伏/末伏
      isFirstOrFifteen,    // 是否农历初一或十五（月视图日期数字标红用）
      isHoliday: holidayInfo.isHoliday, // 休
      isWorkday: holidayInfo.isWorkday, // 调休上班
      holidayName: holidayInfo.name,    // 假日名称
      lunarYear: lunar.year,
      lunarMonth: lunar.month,
      lunarDay: lunar.day,
      isLeap: lunar.isLeap,
    }
  }

  // 月格主显示文案：节日 > 三伏 > 节气 > 历史事件 > 初一显示月名 > 农历日
  // 并返回文案类型（华为月视图用 caption 类型决定灰底条颜色/是否显示）
  type CaptionType = 'festival' | 'fu' | 'solarTerm' | 'historical' | 'lunarDay' | 'lunarMonth'
  interface CaptionResult {
    text: string
    type: CaptionType
  }
  function getDayCaption(date: Date): string
  function getDayCaption(date: Date, withType: true): CaptionResult
  function getDayCaption(date: Date, withType = false): any {
    const info = getLunarInfo(date)
    let text = ''
    let type: CaptionType = 'lunarDay'

    if (info.holiday)      { text = info.holiday;      type = 'festival' }
    else if (info.fu)      { text = info.fu;          type = 'fu' }
    else if (info.solarTerm)     { text = info.solarTerm;     type = 'solarTerm' }
    else if (info.historicalEvent) { text = info.historicalEvent; type = 'historical' }
    else if (info.lunarDay === 1) {
      const lunar = toLunar(date)
      text = getLunarMonthName(lunar.month, lunar.isLeap)
      type = 'lunarMonth'
    } else {
      text = info.lunar
      type = 'lunarDay'
    }

    return withType ? { text, type } : text
  }

  // 计算指定日期是当年第几周（按 ISO 8601 标准，周一为一周开始）
  function getWeekOfYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  return {
    getLunarDate,
    getLunarInfo,
    getDayCaption,
    getWeekOfYear,
  }
}
