import { ShipService } from '../src/ship/ship.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 模拟 ShipService.findOne 的逻辑
  const ship = await prisma.ship.findFirst({
    where: { teamCode: 'team2', cnShipName: '業池' }
  });

  if (!ship) {
    console.log('未找到業池');
    return;
  }

  console.log('Ship ID:', ship.id);
  console.log('politicalVoyage:', ship.politicalVoyage);
  console.log('politicalLocation:', ship.politicalLocation);
  console.log('politicalStatus:', ship.politicalStatus);
  console.log('politicalETA:', ship.politicalETA);
  console.log('politicalETAPort:', ship.politicalETAPort);
  console.log('politicalETD:', ship.politicalETD);
  console.log('politicalWeather:', ship.politicalWeather);
  console.log('politicalSeaCondition:', ship.politicalSeaCondition);
  console.log('politicalStaffChange:', ship.politicalStaffChange);
  console.log('politicalFocusPoints:', ship.politicalFocusPoints);
  console.log('politicalOtherNotes:', ship.politicalOtherNotes);
  console.log('politicalUpdatedAt:', ship.politicalUpdatedAt);

  // 构造 politicalReport 对象
  const politicalReport = {
    voyage: ship.politicalVoyage || '',
    location: ship.politicalLocation || '',
    status: ship.politicalStatus || '',
    eta: ship.politicalETA ? new Date(ship.politicalETA).toISOString() : '',
    etaPort: ship.politicalETAPort || '',
    etd: ship.politicalETD ? new Date(ship.politicalETD).toISOString() : '',
    weather: ship.politicalWeather || '',
    seaCondition: ship.politicalSeaCondition || '',
    staffChange: ship.politicalStaffChange || '',
    focusPoints: ship.politicalFocusPoints || '',
    otherNotes: ship.politicalOtherNotes || '',
    updatedAt: ship.politicalUpdatedAt ? new Date(ship.politicalUpdatedAt).toISOString() : '',
  };

  console.log('\n构造的 politicalReport:');
  console.log(JSON.stringify(politicalReport, null, 2));

  // 检查 truthy/falsy
  console.log('\n字段 truthy 检查:');
  console.log('  voyage:', !!politicalReport.voyage);
  console.log('  location:', !!politicalReport.location);
  console.log('  status:', !!politicalReport.status);
  console.log('  updatedAt:', !!politicalReport.updatedAt);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
