import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ship = await prisma.ship.findFirst({
    where: { cnShipName: '業池', teamCode: 'team2' }
  });

  if (ship) {
    console.log('=== 業池数据库完整数据 ===');
    console.log('cnShipName:', ship.cnShipName);
    console.log('dynamicSource:', ship.dynamicSource);
    console.log('dynamicUpdatedAt:', ship.dynamicUpdatedAt);
    
    console.log('\n=== 政委报告字段 ===');
    console.log('politicalUpdatedAt:', ship.politicalUpdatedAt);
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

    console.log('\n=== 前端显示条件 ===');
    console.log('politicalUpdatedAt 是否有值:', !!ship.politicalUpdatedAt);
    console.log('politicalReport.updatedAt 是否有值:', ship.politicalUpdatedAt ? new Date(ship.politicalUpdatedAt).toISOString() : '');
  } else {
    console.log('未找到業池');
  }

  await prisma.$disconnect();
}

main();