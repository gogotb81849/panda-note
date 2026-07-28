const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 开始模拟船舶动态状态 ===\n');

  // 获取所有团队二的船舶
  const ships = await prisma.ship.findMany({
    where: { teamCode: 'team2' },
    select: { id: true, cnShipName: true, currentStatus: true, eta: true, etd: true, currentLocation: true, currentVoyage: true, etaPort: true },
    orderBy: { id: 'asc' },
  });
  console.log(`找到 ${ships.length} 条船舶记录\n`);

  // 常用港口
  const ports = [
    { name: '舟山', loc: '中国浙江' },
    { name: '宁波', loc: '中国浙江' },
    { name: '上海', loc: '中国上海' },
    { name: '大连', loc: '中国辽宁' },
    { name: '青岛', loc: '中国山东' },
    { name: '广州', loc: '中国广东' },
    { name: '深圳', loc: '中国广东' },
    { name: '天津', loc: '中国天津' },
    { name: '新加坡', loc: '新加坡' },
    { name: '釜山', loc: '韩国' },
    { name: '横滨', loc: '日本' },
    { name: '鹿特丹', loc: '荷兰' },
    { name: '汉堡', loc: '德国' },
    { name: '休斯顿', loc: '美国' },
  ];

  const now = new Date();

  // 定义状态分布（共5种状态）
  // 35条船：靠泊10 + 航行12 + 锚泊5 + 修理4 + 近期ETA 4 = 35
  const statusPlan = [
    { type: 'berthed', count: 10, label: '靠泊' },   // 已靠泊：ETA已过，ETD未来
    { type: 'sailing', count: 12, label: '航行' },   // 航行中：无ETA或ETA未来
    { type: 'anchored', count: 5, label: '锚泊' },   // 锚泊：currentStatus=anchor
    { type: 'repair', count: 4, label: '修理' },     // 修理：currentStatus=repair
    { type: 'eta_near', count: 4, label: '近期ETA' }, // 近期ETA：24小时内抵港
  ];

  let shipIndex = 0;
  let updated = 0;

  for (const plan of statusPlan) {
    for (let i = 0; i < plan.count && shipIndex < ships.length; i++, shipIndex++) {
      const ship = ships[shipIndex];
      const port = ports[Math.floor(Math.random() * ports.length)];
      const voyageNo = `V${2026}${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`;

      let updateData = {};

      switch (plan.type) {
        case 'berthed': {
          // 已靠泊：ETA为3-48小时前，ETD为未来1-7天
          const eta = new Date(now);
          eta.setHours(eta.getHours() - (Math.floor(Math.random() * 45) + 3));
          const etd = new Date(now);
          etd.setDate(etd.getDate() + (Math.floor(Math.random() * 7) + 1));
          updateData = {
            currentStatus: 'berthed',
            currentLocation: `${port.loc} ${port.name}港`,
            currentVoyage: voyageNo,
            etaPort: port.name,
            eta,
            etd,
          };
          break;
        }
        case 'sailing': {
          // 航行中：ETA为未来2-15天，或无ETA
          const eta = new Date(now);
          eta.setDate(eta.getDate() + (Math.floor(Math.random() * 14) + 2));
          const destPort = ports[Math.floor(Math.random() * ports.length)];
          updateData = {
            currentStatus: 'voyage',
            currentLocation: `${destPort.loc}附近海域`,
            currentVoyage: voyageNo,
            etaPort: destPort.name,
            eta,
            etd: null,
          };
          break;
        }
        case 'anchored': {
          // 锚泊：currentStatus=anchor，ETA为未来1-3天
          const eta = new Date(now);
          eta.setDate(eta.getDate() + (Math.floor(Math.random() * 3) + 1));
          updateData = {
            currentStatus: 'anchored',
            currentLocation: `${port.loc} ${port.name}锚地`,
            currentVoyage: voyageNo,
            etaPort: port.name,
            eta,
            etd: null,
          };
          break;
        }
        case 'repair': {
          // 修理：currentStatus=repair，在船厂，ETA/ETD都为null
          const repairPorts = ['大连', '上海', '广州', '青岛'];
          const repairPort = repairPorts[Math.floor(Math.random() * repairPorts.length)];
          updateData = {
            currentStatus: 'repair',
            currentLocation: `${repairPort}船厂`,
            currentVoyage: '维修中',
            etaPort: repairPort,
            eta: null,
            etd: null,
          };
          break;
        }
        case 'eta_near': {
          // 近期ETA：24小时内抵港
          const eta = new Date(now);
          eta.setHours(eta.getHours() + (Math.floor(Math.random() * 24) + 1));
          updateData = {
            currentStatus: 'voyage',
            currentLocation: `距离${port.name}港约${Math.floor(Math.random() * 200) + 50}海里`,
            currentVoyage: voyageNo,
            etaPort: port.name,
            eta,
            etd: null,
          };
          break;
        }
      }

      await prisma.ship.update({
        where: { id: ship.id },
        data: updateData,
      });
      updated++;
      console.log(`  ${ship.cnShipName} → ${plan.label} (${updateData.currentLocation})`);
    }
  }

  console.log(`\n已更新 ${updated} 条船舶动态状态`);

  // 统计状态分布
  const statusStats = await prisma.ship.groupBy({
    by: ['currentStatus'],
    where: { teamCode: 'team2' },
    _count: true,
  });
  console.log('\n状态分布统计：');
  for (const stat of statusStats) {
    console.log(`  ${stat.currentStatus}: ${stat._count} 艘`);
  }

  console.log('\n=== 模拟完成 ===');
}

main()
  .catch((e) => {
    console.error('执行出错:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
