const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = 'ship_political_instructor';
  const teamCodes = await prisma.roleMenuConfig.findMany({
    where: { role },
    select: { teamCode: true },
    distinct: ['teamCode'],
  });
  
  for (const { teamCode } of teamCodes) {
    console.log(`\n=== ${teamCode} / ${role} ===`);
    const menus = await prisma.roleMenuConfig.findMany({
      where: { teamCode, role },
      orderBy: { sortOrder: 'asc' },
    });
    menus.forEach(m => {
      console.log(`  ${m.enabled ? '✓' : '✗'} ${m.menuKey} - ${m.label}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
