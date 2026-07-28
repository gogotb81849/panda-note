import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('检查船舶数据...\n');
  
  const ships = await prisma.ship.findMany({
    where: { teamCode: 'team2' },
    orderBy: { cnShipName: 'asc' },
    select: {
      id: true,
      cnShipName: true,
      enShipName: true,
      flagCountry: true,
      factoryDate: true,
      deadweightTonnage: true,
      teamDisplayName: true,
      tradeType: true,
      sendCompany: true,
      marineSupervisor: true,
      engineerSupervisor: true,
      crewSupervisor: true,
      electricSupervisor: true,
      politicalInstructor: true,
    }
  });
  
  console.log(`team2 团队共有 ${ships.length} 艘船舶:\n`);
  
  ships.forEach((ship, index) => {
    console.log(`${index + 1}. ${ship.cnShipName} (${ship.enShipName})`);
    console.log(`   船旗: ${ship.flagCountry} | 出厂: ${ship.factoryDate} | 载重吨: ${ship.deadweightTonnage}`);
    console.log(`   系列: ${ship.teamDisplayName} | 贸易: ${ship.tradeType} | 派员公司: ${ship.sendCompany}`);
    console.log(`   海务: ${ship.marineSupervisor} | 机务: ${ship.engineerSupervisor} | 船工: ${ship.crewSupervisor} | 电气: ${ship.electricSupervisor}`);
    console.log(`   政委: ${ship.politicalInstructor}`);
    console.log('');
  });
  
  const chenShip = ships.find(s => s.politicalInstructor?.includes('陈'));
  if (chenShip) {
    console.log('✅ 找到含"陈"姓政委的船舶:');
    console.log(`   ${chenShip.cnShipName} - 政委: ${chenShip.politicalInstructor}`);
  }
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
