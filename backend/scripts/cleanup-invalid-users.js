const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invalidNames = ['未填写', '待定', '待派', '-', ''];
  
  for (const name of invalidNames) {
    const username = `${name}_pol`.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username },
    });
    if (user) {
      await prisma.diary.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`已删除无效账号: ${name}`);
    }
  }
  
  console.log('清理完成');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
