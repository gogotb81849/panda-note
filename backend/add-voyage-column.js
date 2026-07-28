const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRaw`ALTER TABLE "Diary" ADD COLUMN "voyageNumber" VARCHAR(10);`
    console.log('航次字段添加成功！')
  } catch (error) {
    if (error.code === '42701') {
      console.log('航次字段已存在，跳过添加')
    } else {
      console.error('添加字段失败:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()