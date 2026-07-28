const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

db.all(
  "SELECT cnShipName, currentStatus, currentLocation, etaPort, eta, cargoStatus, departurePort, dynamicSource FROM Ship WHERE teamCode='team2' ORDER BY cnShipName",
  (err, rows) => {
    if (err) { console.error(err); process.exit(1); }
    console.log('=== 船舶状态数据分析 ===');
    console.log('共', rows.length, '艘船');
    console.log();
    for (const row of rows) {
      console.log('【', row.cnShipName, '】');
      console.log('  currentStatus:', JSON.stringify(row.currentStatus));
      console.log('  currentLocation:', JSON.stringify(row.currentLocation));
      console.log('  etaPort:', JSON.stringify(row.etaPort));
      console.log('  eta:', JSON.stringify(row.eta));
      console.log('  cargoStatus:', JSON.stringify(row.cargoStatus));
      console.log('  departurePort:', JSON.stringify(row.departurePort));
      console.log('  dynamicSource:', JSON.stringify(row.dynamicSource));
      console.log();
    }
    db.close();
  }
);