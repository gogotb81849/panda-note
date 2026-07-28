/**
 * 农历公历转换工具
 * 基于1900-2100年的农历数据
 */

// 农历数据表 (1900-2100)
// 每个值表示一年的农历信息
// 第1-4位: 闰月月份(0表示无闰月)
// 第5-16位: 12/13个月的大小月(1为大月30天,0为小月29天)
// 第17-24位: 春节对应的公历日期(月日)

const LUNAR_INFO: number[] = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d260, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520, // 2100
];

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const MONTHS_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const DAYS_CN = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

// 农历节日
const LUNAR_HOLIDAYS: Record<string, string> = {
  '正月初一': '春节',
  '正月初二': '春节',
  '正月初三': '春节',
  '正月初四': '春节',
  '正月初五': '破五',
  '正月初六': '马日',
  '正月初七': '人日',
  '正月初八': '谷日',
  '正月初九': '天公诞',
  '正月初十': '石头节',
  '正月十五': '元宵',
  '正月十六': '走百病',
  '二月初二': '龙抬头',
  '三月初三': '上巳节',
  '五月初五': '端午',
  '七月初七': '七夕',
  '七月十五': '中元',
  '八月十五': '中秋',
  '九月初九': '重阳',
  '腊月初八': '腊八',
  '腊月二十三': '小年',
  '腊月二十四': '小年',
  '腊月二十九': '除夕',
  '腊月三十': '除夕',
};

// 公历节日
const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '04-01': '愚人节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '12-25': '圣诞节',
};

/**
 * 获取农历年份的天数
 */
function lunarYearDays(year: number): number {
  let sum = 348; // 29 * 12 = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[year - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(year);
}

/**
 * 获取闰月天数
 */
function leapDays(year: number): number {
  if (leapMonth(year)) {
    return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}

/**
 * 获取闰月月份
 */
function leapMonth(year: number): number {
  return LUNAR_INFO[year - 1900] & 0xf;
}

/**
 * 获取农历月份天数
 */
function monthDays(year: number, month: number): number {
  if (month > 12 || month < 1) return -1;
  return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 公历转农历
 * @param date 公历日期
 * @returns 农历信息
 */
export function solar2lunar(date: Date): {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  yearCyl: number; // 年柱
  monthCyl: number; // 月柱
  dayCyl: number; // 日柱
  animal: string;
  gzYear: string; // 干支年
  gzMonth: string; // 干支月
  gzDay: string; // 干支日
  monthCN: string; // 农历月中文
  dayCN: string; // 农历日中文
  fullDateCN: string; // 完整农历日期
  holiday?: string; // 节日
} | null {
  if (date.getFullYear() < 1900 || date.getFullYear() > 2100) {
    return null;
  }

  const baseDate = new Date(1900, 0, 31); // 1900年1月31日 农历正月初一
  let offset = Math.floor((date.getTime() - baseDate.getTime()) / 86400000);

  let lunarYear = 1900;
  let daysInYear = 0;

  // 计算农历年
  for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear++) {
    daysInYear = lunarYearDays(lunarYear);
    offset -= daysInYear;
  }

  if (offset < 0) {
    offset += daysInYear;
    lunarYear--;
  }

  // 计算农历月和日
  const leap = leapMonth(lunarYear);
  let lunarMonth = 1;
  let daysInMonth = 0;
  let isLeap = false;

  for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
    // 闰月
    if (leap > 0 && lunarMonth === (leap + 1) && !isLeap) {
      --lunarMonth;
      isLeap = true;
      daysInMonth = leapDays(lunarYear);
    } else {
      daysInMonth = monthDays(lunarYear, lunarMonth);
    }

    if (isLeap && lunarMonth === (leap + 1)) {
      isLeap = false;
    }

    offset -= daysInMonth;
  }

  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      --lunarMonth;
    }
  }

  if (offset < 0) {
    offset += daysInMonth;
    --lunarMonth;
  }

  const lunarDay = offset + 1;

  // 计算干支
  const yearCyl = lunarYear - 1864; // 甲子年
  const monthCyl = (lunarYear - 1864) * 12 + lunarMonth + 11;
  
  // 计算日干支
  const dayCyl = Math.floor((date.getTime() - new Date(1900, 0, 31).getTime()) / 86400000) + 40;

  // 生肖
  const animal = ANIMALS[(lunarYear - 4) % 12];

  // 干支
  const gzYear = TIAN_GAN[yearCyl % 10] + DI_ZHI[yearCyl % 12];
  const gzMonth = TIAN_GAN[monthCyl % 10] + DI_ZHI[monthCyl % 12];
  const gzDay = TIAN_GAN[dayCyl % 10] + DI_ZHI[dayCyl % 12];

  // 中文
  const monthCN = (isLeap ? '闰' : '') + MONTHS_CN[lunarMonth - 1] + '月';
  const dayCN = DAYS_CN[lunarDay - 1];
  const fullDateCN = gzYear + '年 ' + monthCN + dayCN;

  // 节日
  let holiday: string | undefined;
  const md = (isLeap ? '闰' : '') + MONTHS_CN[lunarMonth - 1] + '月' + dayCN;
  if (LUNAR_HOLIDAYS[md]) {
    holiday = LUNAR_HOLIDAYS[md];
  }

  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap,
    yearCyl,
    monthCyl,
    dayCyl,
    animal,
    gzYear,
    gzMonth,
    gzDay,
    monthCN,
    dayCN,
    fullDateCN,
    holiday,
  };
}

/**
 * 从身份证号提取公历生日
 * @param idNumber 身份证号（18位）
 * @returns 公历生日字符串 YYYY-MM-DD，失败返回null
 */
export function extractBirthdayFromIdNumber(idNumber: string): string | null {
  if (!idNumber || idNumber.length !== 18) {
    return null;
  }

  const year = parseInt(idNumber.substring(6, 10), 10);
  const month = parseInt(idNumber.substring(10, 12), 10);
  const day = parseInt(idNumber.substring(12, 14), 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const birthday = new Date(year, month - 1, day);
  const y = birthday.getFullYear();
  const m = String(birthday.getMonth() + 1).padStart(2, '0');
  const d = String(birthday.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * 获取农历生日字符串
 * @param solarDate 公历生日 YYYY-MM-DD
 * @returns 农历生日字符串 MM-DD（用于每年匹配）
 */
export function getLunarBirthday(solarDate: string): string {
  const parts = solarDate.split('-');
  if (parts.length !== 3) return '';

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month, day);
  const lunar = solar2lunar(date);

  if (!lunar) return '';

  return `${String(lunar.lunarMonth).padStart(2, '0')}-${String(lunar.lunarDay).padStart(2, '0')}`;
}

/**
 * 获取农历节日
 * @param date 公历日期
 * @returns 节日名称，无节日返回空字符串
 */
export function getLunarHoliday(date: Date): string {
  const lunar = solar2lunar(date);
  if (!lunar) return '';

  const md = (lunar.isLeap ? '闰' : '') + MONTHS_CN[lunar.lunarMonth - 1] + '月' + lunar.dayCN;
  return LUNAR_HOLIDAYS[md] || '';
}

/**
 * 获取公历节日
 * @param date 公历日期
 * @returns 节日名称，无节日返回空字符串
 */
export function getSolarHoliday(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;
  return SOLAR_HOLIDAYS[key] || '';
}

/**
 * 获取某年的公历生日
 * @param solarBirthday 公历生日 YYYY-MM-DD
 * @param targetYear 目标年份
 * @returns 目标年份的公历生日日期
 */
export function getSolarBirthdayInYear(solarBirthday: string, targetYear: number): Date | null {
  const parts = solarBirthday.split('-');
  if (parts.length !== 3) return null;

  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  return new Date(targetYear, month, day);
}

/**
 * 获取某年的农历生日对应的公历日期（近似）
 * @param lunarBirthday 农历生日 MM-DD
 * @param targetYear 目标年份
 * @returns 公历日期
 */
export function getLunarBirthdayInYear(lunarBirthday: string, targetYear: number): Date | null {
  const parts = lunarBirthday.split('-');
  if (parts.length !== 2) return null;

  const lunarMonth = parseInt(parts[0], 10);
  const lunarDay = parseInt(parts[1], 10);

  // 从正月初一开始推算
  // 查找target年的春节日期
  // 简化处理：使用基准年份推算
  const baseDate = new Date(1900, 0, 31); // 1900年正月初一

  // 计算农历正月初一对应的公历日期
  let offset = 0;
  for (let y = 1900; y < targetYear; y++) {
    offset += lunarYearDays(y);
  }

  // 加上月份和日
  const leap = leapMonth(targetYear);
  for (let m = 1; m < lunarMonth; m++) {
    if (leap > 0 && m === (leap + 1)) {
      offset += leapDays(targetYear);
    }
    offset += monthDays(targetYear, m);
  }
  offset += lunarDay - 1;

  return new Date(baseDate.getTime() + offset * 86400000);
}

/**
 * 获取即将过生日的船员列表
 * @param crewMembers 船员列表
 * @param daysAhead 提前天数
 * @returns 即将过生日的船员信息
 */
export function getUpcomingBirthdays(
  crewMembers: Array<{
    name: string;
    birthdaySolar: string;
    birthdayLunar: string;
  }>,
  daysAhead: number = 7
): Array<{
  crew: typeof crewMembers[0];
  solarDate?: Date;
  lunarDate?: Date;
  daysUntilSolar: number;
  daysUntilLunar: number;
  type: 'solar' | 'lunar';
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: Array<{
    crew: typeof crewMembers[0];
    solarDate?: Date;
    lunarDate?: Date;
    daysUntilSolar: number;
    daysUntilLunar: number;
    type: 'solar' | 'lunar';
  }> = [];

  crewMembers.forEach(crew => {
    // 公历生日
    if (crew.birthdaySolar) {
      const solarThisYear = getSolarBirthdayInYear(crew.birthdaySolar, today.getFullYear());
      if (solarThisYear) {
        const daysUntil = Math.ceil((solarThisYear.getTime() - today.getTime()) / 86400000);
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          result.push({
            crew,
            solarDate: solarThisYear,
            daysUntilSolar: daysUntil,
            daysUntilLunar: -1,
            type: 'solar',
          });
        }
      }
    }

    // 农历生日
    if (crew.birthdayLunar) {
      const lunarThisYear = getLunarBirthdayInYear(crew.birthdayLunar, today.getFullYear());
      if (lunarThisYear) {
        const daysUntil = Math.ceil((lunarThisYear.getTime() - today.getTime()) / 86400000);
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          result.push({
            crew,
            lunarDate: lunarThisYear,
            daysUntilSolar: -1,
            daysUntilLunar: daysUntil,
            type: 'lunar',
          });
        }
      }
    }
  });

  return result.sort((a, b) => {
    const daysA = a.type === 'solar' ? a.daysUntilSolar : a.daysUntilLunar;
    const daysB = b.type === 'solar' ? b.daysUntilSolar : b.daysUntilLunar;
    return daysA - daysB;
  });
}
