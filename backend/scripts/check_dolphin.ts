import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ship = await prisma.ship.findFirst({
    where: { teamCode: 'team2', cnShipName: '海豚座' },
    select: {
      cnShipName: true,
      currentStatus: true,
      currentLocation: true,
      currentVoyage: true,
      eta: true,
      etaPort: true,
      etd: true,
      politicalVoyage: true,
      politicalLocation: true,
      politicalStatus: true,
      politicalETA: true,
      politicalETAPort: true,
      politicalETD: true,
      cargoStatus: true,
      departurePort: true,
      dynamicSource: true,
      dynamicUpdatedAt: true,
      politicalUpdatedAt: true,
    }
  });

  console.log('海豚座详细数据:');
  console.log(JSON.stringify(ship, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
