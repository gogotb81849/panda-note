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

  console.log('=== API动态状态计算验证 ===');
  console.log('当前逻辑优先级：锚泊 > 靠泊 > 抵港 > 航行');
  console.log();

  let fixedCount = 0;
  let sailingCount = 0;
  let berthedCount = 0;
  let anchoredCount = 0;
  let arrivedCount = 0;

  for (const ship of ships) {
    const rawStatus = (ship.currentStatus || '').toLowerCase();
    const rawLocation = ship.currentLocation || '';
    
    let status: 'berthed' | 'sailing' | 'anchored' | 'arrived' | 'repair' = 'sailing';

    if (rawStatus.includes('repair') || rawStatus.includes('修理') || rawStatus.includes('维修')) {
      status = 'repair';
    } else if (rawStatus.includes('berth') || rawStatus.includes('靠泊') || rawStatus.includes('在港')) {
      status = 'berthed';
    } else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊')) {
      status = 'anchored';
    } else if (rawStatus.includes('sail') || rawStatus.includes('voyage') || rawStatus.includes('航行') || rawStatus.includes('在航')) {
      status = 'sailing';
    }

    if (rawLocation) {
      if (/锚泊|抛锚|锚地/.test(rawLocation)) {
        status = 'anchored';
      } else if (/靠泊|在港靠|系泊|停靠|靠妥|泊位|码头/.test(rawLocation)) {
        status = 'berthed';
      } else if (/抵港|到港|抵达|到达/.test(rawLocation) && !/预计|预计抵达|预计到达/.test(rawLocation)) {
        status = 'arrived';
      } else if (/航行|在航|东行|西行|北上|南下|漂航|出港/.test(rawLocation)) {
        status = 'sailing';
      }
    }

    const dbStatus = ship.currentStatus || '未设置';
    const isFixed = status !== 'sailing' && (dbStatus === 'voyage' || dbStatus === '未设置');
    
    if (isFixed) fixedCount++;
    
    switch(status) {
      case 'sailing': sailingCount++; break;
      case 'berthed': berthedCount++; break;
      case 'anchored': anchoredCount++; break;
      case 'arrived': arrivedCount++; break;
    }

    if (isFixed || status !== 'sailing') {
      console.log(`【${ship.cnShipName}】`);
      console.log(`   数据库状态: ${dbStatus}`);
      console.log(`   API计算状态: ${status}`);
      console.log(`   currentLocation: ${rawLocation}`);
      console.log();
    }
  }

  console.log('=== 统计 ===');
  console.log(`航行中: ${sailingCount}`);
  console.log(`靠泊中: ${berthedCount}`);
  console.log(`锚泊中: ${anchoredCount}`);
  console.log(`已抵港: ${arrivedCount}`);
  console.log(`修复数量: ${fixedCount}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});