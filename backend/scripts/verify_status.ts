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
    },
    orderBy: { cnShipName: 'asc' },
  });

  console.log('=== 修复后的状态验证 ===');
  console.log();

  for (const ship of ships) {
    const rawLocation = ship.currentLocation || '';
    let expectedStatus: string = 'sailing';
    
    if (/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/.test(rawLocation)) {
      expectedStatus = 'berthed';
    } else if (/抵港|到港|抵达|到达/.test(rawLocation)) {
      expectedStatus = 'arrived';
    } else if (/锚泊|抛锚|锚地/.test(rawLocation)) {
      expectedStatus = 'anchored';
    } else if (/航行|在航|东行|西行|北上|南下|漂航|出港/.test(rawLocation)) {
      expectedStatus = 'sailing';
    }

    const statusMatch = expectedStatus === ship.currentStatus;
    const statusSymbol = statusMatch ? '✅' : '❌';
    
    if (!statusMatch) {
      console.log(`${statusSymbol}【${ship.cnShipName}】`);
      console.log(`   当前状态: ${ship.currentStatus} | 应该是: ${expectedStatus}`);
      console.log(`   currentLocation: ${rawLocation}`);
      console.log();
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});