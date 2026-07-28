import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const keepShipNames = [
  '孔雀座', '河池', '海豚座', '远玉河', '秀池',
  '連樂湖', '珊瑚座', '远菊湾', '连柏湖', '远莲湾',
  '连欢湖', '楠林湾', '桦林湾', '連桂湖', '梅林湾',
  '贵池', '天鹅座', '桐林灣', '白鹭座', '榕林湾',
  '连松湖', '华川', '鲸鱼座', '連囍湖', '连杉湖',
  '偉池', '远兰湾', '麒麟座', '山鹰座', '远晶河',
  '华池', '连杨湖', '千池', '業池', '秋池'
];

async function main() {
  console.log('开始清理测试船舶数据...');
  
  const allShips = await prisma.ship.findMany({
    where: { teamCode: 'team2' },
    select: { id: true, cnShipName: true }
  });
  
  console.log(`当前 team2 共有 ${allShips.length} 艘船舶`);
  
  const shipsToDelete = allShips.filter(ship => !keepShipNames.includes(ship.cnShipName));
  
  if (shipsToDelete.length > 0) {
    console.log(`需要删除 ${shipsToDelete.length} 艘测试船舶:`);
    shipsToDelete.forEach(s => console.log(`  - ${s.cnShipName}`));
    
    for (const ship of shipsToDelete) {
      await prisma.staffHistory.deleteMany({ where: { shipId: ship.id } });
      await prisma.staffAssignment.deleteMany({ where: { shipId: ship.id } });
      await prisma.schedule.deleteMany({ where: { shipId: ship.id } });
      await prisma.shipTaskStatus.deleteMany({ where: { shipId: ship.id } });
      await prisma.shipPartyConfig.deleteMany({ where: { shipId: ship.id } });
      await prisma.partyActivity.deleteMany({ where: { shipId: ship.id } });
      await prisma.fileSubmission.deleteMany({ where: { shipId: ship.id } });
      await prisma.healthReportUpload.deleteMany({ where: { shipId: ship.id } });
      await prisma.recurringScheduleTemplate.deleteMany({ where: { shipId: ship.id } });
      await prisma.ship.delete({ where: { id: ship.id } });
      console.log(`已删除: ${ship.cnShipName}`);
    }
  } else {
    console.log('没有需要删除的测试船舶');
  }
  
  const count = await prisma.ship.count({ where: { teamCode: 'team2' } });
  console.log(`\n清理完成！team2 团队现在共有 ${count} 艘船舶`);
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
