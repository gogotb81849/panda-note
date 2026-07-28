const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = 'ship_political_instructor';
  const menus = await prisma.roleMenuConfig.findMany({
    where: { role },
    orderBy: { sortOrder: 'asc' },
  });
  
  console.log(`=== ${role} 所有菜单 ===`);
  menus.forEach(m => {
    console.log(`  ${m.enabled ? '✓' : '✗'} [${m.sortOrder}] ${m.menuKey} - ${m.label}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
