import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ship = await prisma.ship.findFirst({
    where: { teamCode: 'team2', cnShipName: '海豚座' },
    select: {
      id: true,
      cnShipName: true,
      currentStatus: true,
      currentLocation: true,
      etaPort: true,
    }
  });

  if (!ship) {
    console.log('未找到海豚座');
    return;
  }

  console.log('海豚座原始数据:');
  console.log('  currentStatus:', ship.currentStatus);
  console.log('  currentLocation:', ship.currentLocation);
  console.log('  etaPort:', ship.etaPort);

  // 模拟状态判断逻辑
  const rawStatus = (ship.currentStatus || '').toLowerCase();
  const rawLocation = ship.currentLocation || '';

  let status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair' = 'sailing';
  let statusText = '航行中';

  if (rawLocation.match(/锚泊|抛锚|锚地/)) {
    status = 'anchored'; statusText = '锚泊中';
  } else if (rawLocation.match(/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/)) {
    status = 'berthed'; statusText = '已靠泊';
  } else if (rawLocation.match(/抵港|到港|抵达|到达/) && !rawLocation.match(/预计|预计抵达|预计到达/)) {
    status = 'arrived'; statusText = '已抵港';
  } else if (rawLocation.match(/航行|在航|东行|西行|北上|南下|漂航|出港/)) {
    status = 'sailing'; statusText = '航行中';
  } else if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
    status = 'repair'; statusText = '修理中';
  } else if (rawStatus.includes('berth') || /靠泊/.test(rawStatus) || rawStatus.includes('alongside')) {
    status = 'berthed'; statusText = '已靠泊';
  } else if (rawStatus.includes('arriv') || rawStatus.includes('抵港') || rawStatus.includes('到港') || rawStatus.includes('到达') || rawStatus.includes('抵达')) {
    status = 'arrived'; statusText = '已抵港';
  } else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊') || rawStatus.includes('抛锚')) {
    status = 'anchored'; statusText = '锚泊中';
  } else if (rawStatus.includes('sail') || rawStatus.includes('voyage') || rawStatus.includes('航行') || rawStatus.includes('在航')) {
    status = 'sailing'; statusText = '航行中';
  }

  console.log('\n判断结果:');
  console.log('  status:', status);
  console.log('  statusText:', statusText);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
