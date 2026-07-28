const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

const chinaPorts = [
  { name: '上海', english: 'Shanghai', country: '中国', pinyin: 'SH' },
  { name: '宁波舟山', english: 'Ningbo Zhoushan', country: '中国', pinyin: 'NBZS' },
  { name: '深圳', english: 'Shenzhen', country: '中国', pinyin: 'SZ' },
  { name: '广州', english: 'Guangzhou', country: '中国', pinyin: 'GZ' },
  { name: '青岛', english: 'Qingdao', country: '中国', pinyin: 'QD' },
  { name: '天津', english: 'Tianjin', country: '中国', pinyin: 'TJ' },
  { name: '大连', english: 'Dalian', country: '中国', pinyin: 'DL' },
  { name: '厦门', english: 'Xiamen', country: '中国', pinyin: 'XM' },
  { name: '福州', english: 'Fuzhou', country: '中国', pinyin: 'FZ' },
  { name: '海口', english: 'Haikou', country: '中国', pinyin: 'HK' },
  { name: '湛江', english: 'Zhanjiang', country: '中国', pinyin: 'ZJ' },
  { name: '珠海', english: 'Zhuhai', country: '中国', pinyin: 'ZH' },
  { name: '汕头', english: 'Shantou', country: '中国', pinyin: 'ST' },
  { name: '北海', english: 'Beihai', country: '中国', pinyin: 'BH' },
  { name: '防城港', english: 'Fangchenggang', country: '中国', pinyin: 'FCG' },
  { name: '钦州', english: 'Qinzhou', country: '中国', pinyin: 'QZ' },
  { name: '温州', english: 'Wenzhou', country: '中国', pinyin: 'WZ' },
  { name: '台州', english: 'Taizhou', country: '中国', pinyin: 'TZ' },
  { name: '连云港', english: 'Lianyungang', country: '中国', pinyin: 'LYG' },
  { name: '烟台', english: 'Yantai', country: '中国', pinyin: 'YT' },
  { name: '威海', english: 'Weihai', country: '中国', pinyin: 'WH' },
  { name: '秦皇岛', english: 'Qinhuangdao', country: '中国', pinyin: 'QHD' },
  { name: '营口', english: 'Yingkou', country: '中国', pinyin: 'YK' },
  { name: '锦州', english: 'Jinzhou', country: '中国', pinyin: 'JZ' },
  { name: '丹东', english: 'Dandong', country: '中国', pinyin: 'DD' },
  { name: '南通', english: 'Nantong', country: '中国', pinyin: 'NT' },
  { name: '张家港', english: 'Zhangjiagang', country: '中国', pinyin: 'ZJG' },
  { name: '江阴', english: 'Jiangyin', country: '中国', pinyin: 'JY' },
  { name: '常熟', english: 'Changshu', country: '中国', pinyin: 'CS' },
  { name: '太仓', english: 'Taicang', country: '中国', pinyin: 'TC' },
  { name: '镇江', english: 'Zhenjiang', country: '中国', pinyin: 'ZJ' },
  { name: '南京', english: 'Nanjing', country: '中国', pinyin: 'NJ' },
  { name: '芜湖', english: 'Wuhu', country: '中国', pinyin: 'WH' },
  { name: '马鞍山', english: 'Maanshan', country: '中国', pinyin: 'MAS' },
  { name: '铜陵', english: 'Tongling', country: '中国', pinyin: 'TL' },
  { name: '安庆', english: 'Anqing', country: '中国', pinyin: 'AQ' },
  { name: '九江', english: 'Jiujiang', country: '中国', pinyin: 'JJ' },
  { name: '黄石', english: 'Huangshi', country: '中国', pinyin: 'HS' },
  { name: '武汉', english: 'Wuhan', country: '中国', pinyin: 'WH' },
  { name: '岳阳', english: 'Yueyang', country: '中国', pinyin: 'YY' },
  { name: '城陵矶', english: 'Chenglingji', country: '中国', pinyin: 'CLJ' },
];

const southeastAsiaPorts = [
  { name: '新加坡', english: 'Singapore', country: '新加坡', pinyin: 'XJP' },
  { name: '巴生', english: 'Port Klang', country: '马来西亚', pinyin: 'BS' },
  { name: '丹绒帕拉帕斯', english: 'Tanjung Pelepas', country: '马来西亚', pinyin: 'TJPLP' },
  { name: '槟城', english: 'Penang', country: '马来西亚', pinyin: 'BC' },
  { name: '马尼拉', english: 'Manila', country: '菲律宾', pinyin: 'MNL' },
  { name: '宿务', english: 'Cebu', country: '菲律宾', pinyin: 'SW' },
  { name: '雅加达', english: 'Jakarta', country: '印度尼西亚', pinyin: 'YJD' },
  { name: '泗水', english: 'Surabaya', country: '印度尼西亚', pinyin: 'SS' },
  { name: '海防', english: 'Hai Phong', country: '越南', pinyin: 'HF' },
  { name: '胡志明', english: 'Ho Chi Minh City', country: '越南', pinyin: 'HZM' },
  { name: '岘港', english: 'Da Nang', country: '越南', pinyin: 'XG' },
  { name: '曼谷', english: 'Bangkok', country: '泰国', pinyin: 'MG' },
  { name: '林查班', english: 'Laem Chabang', country: '泰国', pinyin: 'LCB' },
];

const eastAsiaPorts = [
  { name: '东京', english: 'Tokyo', country: '日本', pinyin: 'DJ' },
  { name: '横滨', english: 'Yokohama', country: '日本', pinyin: 'HY' },
  { name: '名古屋', english: 'Nagoya', country: '日本', pinyin: 'MGW' },
  { name: '大阪', english: 'Osaka', country: '日本', pinyin: 'DB' },
  { name: '神户', english: 'Kobe', country: '日本', pinyin: 'SH' },
  { name: '釜山', english: 'Busan', country: '韩国', pinyin: 'FS' },
  { name: '仁川', english: 'Incheon', country: '韩国', pinyin: 'RC' },
  { name: '蔚山', english: 'Ulsan', country: '韩国', pinyin: 'WS' },
];

const middleEastPorts = [
  { name: '迪拜', english: 'Dubai', country: '阿联酋', pinyin: 'DB' },
  { name: '杰布阿里', english: 'Jebel Ali', country: '阿联酋', pinyin: 'JBAL' },
  { name: '阿布扎比', english: 'Abu Dhabi', country: '阿联酋', pinyin: 'ABZB' },
  { name: '吉达', english: 'Jeddah', country: '沙特阿拉伯', pinyin: 'JD' },
  { name: '多哈', english: 'Doha', country: '卡塔尔', pinyin: 'DH' },
  { name: '科威特', english: 'Kuwait', country: '科威特', pinyin: 'KWT' },
];

const southAsiaPorts = [
  { name: '孟买', english: 'Mumbai', country: '印度', pinyin: 'MM' },
  { name: '加尔各答', english: 'Kolkata', country: '印度', pinyin: 'JGED' },
  { name: '科伦坡', english: 'Colombo', country: '斯里兰卡', pinyin: 'KLP' },
  { name: '卡拉奇', english: 'Karachi', country: '巴基斯坦', pinyin: 'KLQ' },
];

const europePorts = [
  { name: '鹿特丹', english: 'Rotterdam', country: '荷兰', pinyin: 'LTD' },
  { name: '安特卫普', english: 'Antwerp', country: '比利时', pinyin: 'ATWP' },
  { name: '汉堡', english: 'Hamburg', country: '德国', pinyin: 'HB' },
  { name: '不来梅哈芬', english: 'Bremerhaven', country: '德国', pinyin: 'BLMHF' },
  { name: '勒阿弗尔', english: 'Le Havre', country: '法国', pinyin: 'LHF' },
  { name: '马赛', english: 'Marseille', country: '法国', pinyin: 'MS' },
  { name: '伦敦', english: 'London', country: '英国', pinyin: 'LD' },
  { name: '费利克斯托', english: 'Felixstowe', country: '英国', pinyin: 'FLKST' },
  { name: '巴塞罗那', english: 'Barcelona', country: '西班牙', pinyin: 'BXLN' },
  { name: '热那亚', english: 'Genoa', country: '意大利', pinyin: 'RNY' },
  { name: '圣彼得堡', english: 'St. Petersburg', country: '俄罗斯', pinyin: 'STP' },
];

const africaPorts = [
  { name: '德班', english: 'Durban', country: '南非', pinyin: 'DB' },
  { name: '开普敦', english: 'Cape Town', country: '南非', pinyin: 'KPD' },
  { name: '拉各斯', english: 'Lagos', country: '尼日利亚', pinyin: 'LGS' },
  { name: '亚历山大', english: 'Alexandria', country: '埃及', pinyin: 'YLDG' },
  { name: '塞得港', english: 'Port Said', country: '埃及', pinyin: 'SDG' },
];

const americasPorts = [
  { name: '洛杉矶', english: 'Los Angeles', country: '美国', pinyin: 'LSJ' },
  { name: '长滩', english: 'Long Beach', country: '美国', pinyin: 'CT' },
  { name: '西雅图', english: 'Seattle', country: '美国', pinyin: 'XYT' },
  { name: '纽约', english: 'New York', country: '美国', pinyin: 'NY' },
  { name: '休斯顿', english: 'Houston', country: '美国', pinyin: 'XSD' },
  { name: '温哥华', english: 'Vancouver', country: '加拿大', pinyin: 'WH' },
  { name: '蒙特利尔', english: 'Montreal', country: '加拿大', pinyin: 'MTEL' },
  { name: '里约热内卢', english: 'Rio de Janeiro', country: '巴西', pinyin: 'LYRL' },
  { name: '桑托斯', english: 'Santos', country: '巴西', pinyin: 'STS' },
];

const oceaniaPorts = [
  { name: '悉尼', english: 'Sydney', country: '澳大利亚', pinyin: 'XN' },
  { name: '墨尔本', english: 'Melbourne', country: '澳大利亚', pinyin: 'MBE' },
  { name: '布里斯班', english: 'Brisbane', country: '澳大利亚', pinyin: 'BLSB' },
  { name: '奥克兰', english: 'Auckland', country: '新西兰', pinyin: 'AKL' },
];

const allPorts = [
  ...chinaPorts,
  ...southeastAsiaPorts,
  ...eastAsiaPorts,
  ...middleEastPorts,
  ...southAsiaPorts,
  ...europePorts,
  ...africaPorts,
  ...americasPorts,
  ...oceaniaPorts,
];

async function main() {
  console.log('开始导入世界港口数据...');
  
  for (const port of allPorts) {
    await prisma.port.upsert({
      where: { name_country: { name: port.name, country: port.country } },
      update: {
        english: port.english,
        pinyin: port.pinyin,
      },
      create: {
        name: port.name,
        english: port.english,
        country: port.country,
        pinyin: port.pinyin,
      },
    });
  }

  console.log('成功导入 ' + allPorts.length + ' 个世界港口数据');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
