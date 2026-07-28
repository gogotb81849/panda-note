import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  '会议文件',
  '培训资料',
  '规章制度',
  '应急预案',
  '工作报告',
  '学习材料',
  '证书证件',
  '其他',
];

async function main() {
  console.log('开始初始化文件分类字典...');

  for (const teamCode of ['team1', 'team2', 'team3']) {
    console.log(`\n处理团队 ${teamCode}...`);
    
    for (let i = 0; i < defaultCategories.length; i++) {
      const categoryName = defaultCategories[i];
      
      const existing = await prisma.dictCategory.findFirst({
        where: {
          teamCode: teamCode as any,
          categoryType: 'first_type',
          categoryName,
        },
      });
      
      if (existing) {
        console.log(`  ✓ ${categoryName} 已存在`);
        continue;
      }
      
      await prisma.dictCategory.create({
        data: {
          teamCode: teamCode as any,
          categoryType: 'first_type',
          categoryName,
          sortOrder: i,
        },
      });
      console.log(`  + 添加: ${categoryName}`);
    }
  }

  console.log('\n✅ 初始化完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
