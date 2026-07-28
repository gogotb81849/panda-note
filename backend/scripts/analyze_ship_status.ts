import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ships = await prisma.ship.findMany({
    where: { teamCode: 'team2' },
    select: {
      cnShipName: true,
      currentStatus: true,
      currentLocation: true,
      etaPort: true,
      eta: true,
      cargoStatus: true,
      departurePort: true,
      dynamicSource: true,
    },
    orderBy: { cnShipName: 'asc' },
  });

  console.log('=== 船舶状态数据分析 ===');
  console.log('共', ships.length, '艘船');
  console.log();

  for (const ship of ships) {
    console.log('【', ship.cnShipName, '】');
    console.log('  currentStatus:', JSON.stringify(ship.currentStatus));
    console.log('  currentLocation:', JSON.stringify(ship.currentLocation));
    console.log('  etaPort:', JSON.stringify(ship.etaPort));
    console.log('  eta:', JSON.stringify(ship.eta));
    console.log('  cargoStatus:', JSON.stringify(ship.cargoStatus));
    console.log('  departurePort:', JSON.stringify(ship.departurePort));
    console.log('  dynamicSource:', JSON.stringify(ship.dynamicSource));
    console.log();
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});