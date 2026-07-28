const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const menusToDisable = ['/sop-flow', '/public-case', '/port-check'];
  const roles = ['ship_political_instructor'];
  
  for (const role of roles) {
    const teamCodes = await prisma.roleMenuConfig.findMany({
      where: { role },
      select: { teamCode: true },
      distinct: ['teamCode'],
    });
    
    for (const { teamCode } of teamCodes) {
      console.log(`处理 ${teamCode} / ${role}...`);
      
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
        }
      }
    }
  }
  
  console.log('完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
