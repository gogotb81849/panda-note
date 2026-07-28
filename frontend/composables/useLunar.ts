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

// 二十四节气
const solarTermNames = [
  '小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨',
  '立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑',
  '白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'
]

const solarTermBase = [
  [0,21208],[42467,611],[42467,611],[42367,611],[42367,611],[42367,611],[42367,611],
  [42367,611],[42367,611],[42367,611],[42367,611],[42367,611]
]

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

  function getLunarInfo(date: Date) {
    const lunar = toLunar(date)
    const lunarMonthName = getLunarMonthName(lunar.month, lunar.isLeap)
    const lunarDayName = getLunarDayName(lunar.day)
    const ganZhi = getGanZhi(lunar.year)
    const animal = getAnimal(lunar.year)
    const lunarFestival = getLunarFestival(lunar.month, lunar.day, lunar.isLeap, lunar.year)
    const solarFestival = getSolarFestival(date.getMonth() + 1, date.getDate())

    const holiday = lunarFestival || solarFestival || ''
    const lunarStr = `${lunarMonthName}${lunarDayName}`
    const solarTerm = '' // 节气计算较复杂，暂时留空

    return {
      lunar: lunarStr,
      ganZhi,
      animal,
      holiday,
      solarTerm,
      lunarYear: lunar.year,
      lunarMonth: lunar.month,
      lunarDay: lunar.day,
      isLeap: lunar.isLeap,
    }
  }

  return {
    getLunarDate,
    getLunarInfo,
  }
}
