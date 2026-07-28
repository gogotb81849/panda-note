const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const menusToDisable = ['/staff-history', '/thought-reports', '/integrity-records', '/officer-profiles'];
  const role = 'ship_political_instructor';
  
  const teamCodes = await prisma.roleMenuConfig.findMany({
    where: { role },
    select: { teamCode: true },
    distinct: ['teamCode'],
  });
  
  for (const { teamCode } of teamCodes) {
    console.log(`处理 ${teamCode}...`);
    for (const menuKey of menusToDisable) {
      const existing = await prisma.roleMenuConfig.findUnique({
        where: {
          teamCode_role_menuKey: { teamCode, role, menuKey },
        },
      });
      
      if (existing) {
        if (existing.enabled) {
          await prisma.roleMenuConfig.update({
            where: {
              teamCode_role_menuKey: { teamCode, role, menuKey },
            },
            data: { enabled: false },
          });
          console.log(`  已禁用: ${menuKey}`);
        } else {
          console.log(`  已禁用(跳过): ${menuKey}`);
        }
      } else {
        console.log(`  未找到: ${menuKey}`);
      }
    }
  }
  
  console.log('完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
