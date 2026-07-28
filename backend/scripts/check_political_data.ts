import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ships = await prisma.ship.findMany({
    where: { teamCode: 'team2', politicalUpdatedAt: { not: null } },
    select: {
      cnShipName: true,
      politicalVoyage: true,
      politicalLocation: true,
      politicalStatus: true,
      politicalETA: true,
      politicalETAPort: true,
      politicalETD: true,
      politicalWeather: true,
      politicalSeaCondition: true,
      politicalStaffChange: true,
      politicalFocusPoints: true,
      politicalOtherNotes: true,
      politicalUpdatedAt: true,
    }
  });

  console.log('共有', ships.length, '艘船有政委报告数据');
  console.log('='.repeat(100));

  for (const ship of ships) {
    console.log('船名:', ship.cnShipName);
    console.log('  航次:', ship.politicalVoyage || '空');
    console.log('  位置:', ship.politicalLocation || '空');
    console.log('  状态:', ship.politicalStatus || '空');
    console.log('  ETA:', ship.politicalETA || '空');
    console.log('  目的港:', ship.politicalETAPort || '空');
    console.log('  ETD:', ship.politicalETD || '空');
    console.log('  天气:', ship.politicalWeather || '空');
    console.log('  海况:', ship.politicalSeaCondition || '空');
    console.log('  人员变更:', ship.politicalStaffChange || '空');
    console.log('  关注重点:', ship.politicalFocusPoints || '空');
    console.log('  其它说明:', ship.politicalOtherNotes || '空');
    console.log('  更新时间:', ship.politicalUpdatedAt);
    console.log('-'.repeat(80));
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
