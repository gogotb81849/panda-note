import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const shipsData = [
  { cnShipName: '孔雀座', enShipName: 'KONG QUE ZUO', flagCountry: 'SINGAPORE', factoryDate: '2011-06-27', deadweightTonnage: '75578', teamDisplayName: '白鹭座系列', tradeType: '外贸', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '李丹', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '马晶' },
  { cnShipName: '河池', enShipName: 'HE CHI', flagCountry: '上海', factoryDate: '2013-01-04', deadweightTonnage: '48698', teamDisplayName: '荣池系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '曾长成', engineerSupervisor: '涂建红', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '张惊雷' },
  { cnShipName: '海豚座', enShipName: 'HAI TUN ZUO', flagCountry: '上海', factoryDate: '2010-03-23', deadweightTonnage: '75571', teamDisplayName: '白鹭座系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '卢云集', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '黄小海' },
  { cnShipName: '远玉河', enShipName: 'YUAN YU HE', flagCountry: '上海', factoryDate: '2022-02-22', deadweightTonnage: '49842', teamDisplayName: '远玉河系列', tradeType: '内外贸兼营', sendCompany: '大连分公司', marineSupervisor: '曾长成', engineerSupervisor: '卢云集', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '沙学峰' },
  { cnShipName: '秀池', enShipName: 'XIU CHI', flagCountry: '上海', factoryDate: '2012-11-26', deadweightTonnage: '48781', teamDisplayName: '荣池系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '曾长成', engineerSupervisor: '涂建红', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '赵利林' },
  { cnShipName: '連樂湖', enShipName: 'LIAN LE HU', flagCountry: 'HONG KONG', factoryDate: '2017-08-01', deadweightTonnage: '49999', teamDisplayName: '連樂湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '刘雪松', engineerSupervisor: '卢云集', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '许国山' },
  { cnShipName: '珊瑚座', enShipName: 'SHAN HU ZUO', flagCountry: '上海', factoryDate: '2010-05-22', deadweightTonnage: '75596', teamDisplayName: '白鹭座系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '陈小平', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '陈达强' },
  { cnShipName: '远菊湾', enShipName: 'YUAN JU WAN', flagCountry: '中国洋浦港', factoryDate: '2021-01-12', deadweightTonnage: '109899', teamDisplayName: '远菊湾系列', tradeType: '内外贸兼营', sendCompany: '大连分公司', marineSupervisor: '刘雪松', engineerSupervisor: '易伟辉', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '赵靖涛' },
  { cnShipName: '连柏湖', enShipName: 'LIAN BAI HU', flagCountry: '中国洋浦港', factoryDate: '2018-03-26', deadweightTonnage: '72777', teamDisplayName: '连松湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '曾长成', engineerSupervisor: '李丹', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '高治国' },
  { cnShipName: '远莲湾', enShipName: 'YUAN LIAN WAN', flagCountry: '上海', factoryDate: '2019-12-03', deadweightTonnage: '113832', teamDisplayName: '远菊湾系列', tradeType: '外贸', sendCompany: '上海分公司', marineSupervisor: '许可', engineerSupervisor: '易伟辉', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '马月刚' },
  { cnShipName: '连欢湖', enShipName: 'LIAN HUAN HU', flagCountry: '中国洋浦港', factoryDate: '2017-01-16', deadweightTonnage: '50239', teamDisplayName: '連樂湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '刘雪松', engineerSupervisor: '卢云集', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '郭松' },
  { cnShipName: '楠林湾', enShipName: 'NAN LIN WAN', flagCountry: 'SINGAPORE', factoryDate: '2017-04-20', deadweightTonnage: '109700', teamDisplayName: '楠林湾系列', tradeType: '外贸', sendCompany: '上海分公司', marineSupervisor: '许可', engineerSupervisor: '王文优', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '刘勇' },
  { cnShipName: '桦林湾', enShipName: 'HUA LIN WAN', flagCountry: '上海', factoryDate: '2012-12-07', deadweightTonnage: '109475', teamDisplayName: '梅林湾系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '王家勇', engineerSupervisor: '王文优', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '李洪落' },
  { cnShipName: '連桂湖', enShipName: 'LIAN GUI HU', flagCountry: 'HONG KONG', factoryDate: '2018-12-05', deadweightTonnage: '72822', teamDisplayName: '连松湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '刘雪松', engineerSupervisor: '易伟辉', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '于昆鹏' },
  { cnShipName: '梅林湾', enShipName: 'MEI LIN WAN', flagCountry: '上海', factoryDate: '2012-11-02', deadweightTonnage: '109485', teamDisplayName: '梅林湾系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '许可', engineerSupervisor: '易伟辉', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '周新华' },
  { cnShipName: '贵池', enShipName: 'GUI CHI', flagCountry: '上海', factoryDate: '2012-10-25', deadweightTonnage: '48801', teamDisplayName: '荣池系列', tradeType: '内外贸兼营', sendCompany: '上海分公司', marineSupervisor: '郭爱观', engineerSupervisor: '陈小平', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '金鑫' },
  { cnShipName: '天鹅座', enShipName: 'TIAN E ZUO', flagCountry: 'HONG KONG', factoryDate: '2012-02-23', deadweightTonnage: '75583', teamDisplayName: '白鹭座系列', tradeType: '外贸', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '卢云集', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '黄壮' },
  { cnShipName: '桐林灣', enShipName: 'TONG LIN WAN', flagCountry: 'HONG KONG', factoryDate: '2014-05-23', deadweightTonnage: '109615', teamDisplayName: '梅林湾系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '王家勇', engineerSupervisor: '王文优', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '孙钟顺' },
  { cnShipName: '白鹭座', enShipName: 'BAI LU ZUO', flagCountry: 'HONG KONG', factoryDate: '2011-11-18', deadweightTonnage: '75594', teamDisplayName: '白鹭座系列', tradeType: '外贸', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '王文优', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '刘恒驰' },
  { cnShipName: '榕林湾', enShipName: 'RONG LIN WAN', flagCountry: 'SINGAPORE', factoryDate: '2017-07-18', deadweightTonnage: '109783', teamDisplayName: '楠林湾系列', tradeType: '外贸', sendCompany: '上海分公司', marineSupervisor: '许可', engineerSupervisor: '王文优', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '浦松超' },
  { cnShipName: '连松湖', enShipName: 'LIAN SONG HU', flagCountry: '中国洋浦港', factoryDate: '2017-12-04', deadweightTonnage: '72745', teamDisplayName: '连松湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '王家勇', engineerSupervisor: '曹伟', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '王宏志' },
  { cnShipName: '华川', enShipName: 'HUA CHUAN', flagCountry: '上海', factoryDate: '2013-01-08', deadweightTonnage: '6323', teamDisplayName: '', tradeType: '内外贸兼营', sendCompany: '', marineSupervisor: '王家勇', engineerSupervisor: '陈小平', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '未填写' },
  { cnShipName: '鲸鱼座', enShipName: 'JING YU ZUO', flagCountry: '上海', factoryDate: '2010-07-19', deadweightTonnage: '75577', teamDisplayName: '白鹭座系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '尤金灼', engineerSupervisor: '易伟辉', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '胡伟森' },
  { cnShipName: '連囍湖', enShipName: 'LIAN XI HU', flagCountry: 'HONG KONG', factoryDate: '2017-05-25', deadweightTonnage: '50252', teamDisplayName: '連樂湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '刘雪松', engineerSupervisor: '卢云集', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '田兆朋' },
  { cnShipName: '连杉湖', enShipName: 'LIAN SHAN HU', flagCountry: '中国洋浦港', factoryDate: '2018-09-17', deadweightTonnage: '72780', teamDisplayName: '连松湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '刘雪松', engineerSupervisor: '涂建红', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '尹兴权' },
  { cnShipName: '偉池', enShipName: 'WEI CHI', flagCountry: 'HONG KONG', factoryDate: '2009-06-18', deadweightTonnage: '45854', teamDisplayName: '偉池系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '郭爱观', engineerSupervisor: '陈小平', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '王琳' },
  { cnShipName: '远兰湾', enShipName: 'YUAN LAN WAN', flagCountry: '中国洋浦港', factoryDate: '2020-11-19', deadweightTonnage: '109844', teamDisplayName: '远菊湾系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '许可', engineerSupervisor: '王文优', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '唐宁礼' },
  { cnShipName: '麒麟座', enShipName: 'QI LIN ZUO', flagCountry: '上海', factoryDate: '2009-05-05', deadweightTonnage: '75578', teamDisplayName: '白鹭座系列', tradeType: '内外贸兼营', sendCompany: '广州分公司', marineSupervisor: '王家勇', engineerSupervisor: '李丹', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '沈青贵' },
  { cnShipName: '山鹰座', enShipName: 'SHAN YING ZUO', flagCountry: 'SINGAPORE', factoryDate: '2010-11-05', deadweightTonnage: '75588', teamDisplayName: '白鹭座系列', tradeType: '外贸', sendCompany: '广州分公司', marineSupervisor: '曾长成', engineerSupervisor: '曹伟', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '熊亮' },
  { cnShipName: '远晶河', enShipName: 'YUAN JING HE', flagCountry: '上海', factoryDate: '2021-09-13', deadweightTonnage: '49915', teamDisplayName: '远玉河系列', tradeType: '内外贸兼营', sendCompany: '大连分公司', marineSupervisor: '郭爱观', engineerSupervisor: '李丹', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '夏祥玉' },
  { cnShipName: '华池', enShipName: 'HUA CHI', flagCountry: '上海', factoryDate: '2012-08-21', deadweightTonnage: '48743', teamDisplayName: '荣池系列', tradeType: '内外贸兼营', sendCompany: '上海分公司', marineSupervisor: '曾长成', engineerSupervisor: '陈小平', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '刘洪尧' },
  { cnShipName: '连杨湖', enShipName: 'LIAN YANG HU', flagCountry: '中国洋浦港', factoryDate: '2018-07-02', deadweightTonnage: '72712', teamDisplayName: '连松湖系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '王家勇', engineerSupervisor: '涂建红', crewSupervisor: '黄新', electricSupervisor: '沈万东', politicalInstructor: '李长志' },
  { cnShipName: '千池', enShipName: 'QIAN CHI', flagCountry: 'HONG KONG', factoryDate: '2008-06-30', deadweightTonnage: '45541', teamDisplayName: '千池系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '郭爱观', engineerSupervisor: '涂建红', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '石太兴' },
  { cnShipName: '業池', enShipName: 'YE CHI', flagCountry: 'HONG KONG', factoryDate: '2009-11-18', deadweightTonnage: '45740', teamDisplayName: '偉池系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '郭爱观', engineerSupervisor: '陈小平', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '骆志哲' },
  { cnShipName: '秋池', enShipName: 'QIU CHI', flagCountry: 'HONG KONG', factoryDate: '2009-01-15', deadweightTonnage: '45484', teamDisplayName: '千池系列', tradeType: '外贸', sendCompany: '大连分公司', marineSupervisor: '郭爱观', engineerSupervisor: '涂建红', crewSupervisor: '黄新', electricSupervisor: '汪建军', politicalInstructor: '李维' },
];

async function main() {
  console.log('开始导入船舶数据...');
  
  for (const shipData of shipsData) {
    const buildYear = shipData.factoryDate ? parseInt(shipData.factoryDate.substring(0, 4)) : undefined;
    
    await prisma.ship.upsert({
      where: { teamCode_cnShipName: { teamCode: 'team2', cnShipName: shipData.cnShipName } },
      update: {
        ...shipData,
        buildYear,
      },
      create: {
        ...shipData,
        teamCode: 'team2',
        buildYear,
        currentStatus: 'voyage',
      },
    });
    
    console.log(`已导入/更新: ${shipData.cnShipName}`);
  }
  
  const count = await prisma.ship.count({ where: { teamCode: 'team2' } });
  console.log(`\n导入完成！team2 团队共有 ${count} 艘船舶`);
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
