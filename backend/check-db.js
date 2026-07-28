
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('=== Checking database connection...');
  
  try {
    // 1. Check all users
    console.log('\n1. Checking users in database:');
    const users = await prisma.user.findMany();
    console.log('Found ' + users.length + ' users:');
    users.forEach(user => {
      console.log('- ID: ' + user.id + ', Username: ' + user.username + ', RealName: ' + user.realName + ', PasswordHash: ' + user.password.substring(0, 20) + '...');
    });

    // 2. Check all ships
    console.log('\n2. Checking ships in database:');
    const ships = await prisma.ship.findMany();
    console.log('Found ' + ships.length + ' ships:');
    ships.forEach(ship => {
      console.log('- ID: ' + ship.id + ', ShipName: ' + ship.cnShipName + ', EnName: ' + ship.enShipName);
    });

    console.log('\nDatabase check completed!');

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
