import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ship = await prisma.ship.findFirst({
    where: { cnShipName: '海豚座', teamCode: 'team2' }
  });

  if (ship) {
    console.log('=== 海豚座数据库原始数据 ===');
    console.log('currentStatus:', JSON.stringify(ship.currentStatus));
    console.log('currentLocation:', JSON.stringify(ship.currentLocation));
    console.log('etaPort:', JSON.stringify(ship.etaPort));

    // 完全模拟 getDynamicStatusByDate 中的 calcShipStatus 逻辑
    const rawStatus = (ship.currentStatus || '').toLowerCase();
    const rawLocation = ship.currentLocation || '';

    let status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair' = 'sailing';
    let statusText = '航行中';

    if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
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

    console.log('\n=== 第一步判断（currentStatus）===');
    console.log('status:', status);

    if (rawLocation) {
      if (/锚泊|抛锚|锚地/.test(rawLocation)) {
        status = 'anchored'; statusText = '锚泊中';
      } else if (/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/.test(rawLocation)) {
        status = 'berthed'; statusText = '已靠泊';
      } else if (/抵港|到港|抵达|到达/.test(rawLocation) && !/预计|预计抵达|预计到达/.test(rawLocation)) {
        status = 'arrived'; statusText = '已抵港';
      } else if (/航行|在航|东行|西行|北上|南下|漂航|出港/.test(rawLocation)) {
        status = 'sailing'; statusText = '航行中';
      }
    }

    console.log('\n=== 第二步判断（currentLocation覆盖）===');
    console.log('status:', status);
    console.log('匹配关键词:', rawLocation.match(/系泊|泊位|码头|装货/));

  } else {
    console.log('未找到海豚座');
  }

  await prisma.$disconnect();
}

main();