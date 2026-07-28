import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始初始化数据库...');
  
  const hashedPassword123 = await bcrypt.hash('123456', 10);
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);

  console.log('📝 创建/更新用户数据...');
  
  // 1. 创建用户：gogotb (岸基主管)
  const user1 = await prisma.user.upsert({
    where: { username: 'gogotb' },
    update: {
      password: hashedPassword123,
    },
    create: {
      username: 'gogotb',
      password: hashedPassword123,
      realName: '岸基主管',
      teamCode: 'team1',
      role: 'shore_crew_supervisor',
    },
  });
  console.log('✅ 用户 gogotb 已就绪');

  // 2. 创建用户：supervisor (船舶政委)
  const user2 = await prisma.user.upsert({
    where: { username: 'supervisor' },
    update: {
      password: hashedPassword123,
    },
    create: {
      username: 'supervisor',
      password: hashedPassword123,
      realName: '船舶政委',
      teamCode: 'team1',
      role: 'ship_political_instructor',
    },
  });
  console.log('✅ 用户 supervisor 已就绪');

  // 3. 创建用户：shore_crew (岸基船工主管)
  const user3 = await prisma.user.upsert({
    where: { username: 'shore_crew' },
    update: {
      password: hashedPasswordAdmin,
    },
    create: {
      username: 'shore_crew',
      password: hashedPasswordAdmin,
      realName: '岸基船工主管',
      teamCode: 'team2',
      role: 'shore_crew_supervisor',
    },
  });
  console.log('✅ 用户 shore_crew 已就绪');

  // 4. 创建用户：ship_political (船舶政委)
  const user4 = await prisma.user.upsert({
    where: { username: 'ship_political' },
    update: {
      password: hashedPasswordAdmin,
    },
    create: {
      username: 'ship_political',
      password: hashedPasswordAdmin,
      realName: '船舶政委',
      teamCode: 'team2',
      role: 'ship_political_instructor',
    },
  });
  console.log('✅ 用户 ship_political 已就绪');

  // 创建一些测试船舶数据
  console.log('🚢 创建/更新船舶数据...');
  
  await prisma.ship.upsert({
    where: {
      teamCode_cnShipName: {
        teamCode: 'team1',
        cnShipName: '远洋之星',
      },
    },
    update: {},
    create: {
      teamCode: 'team1',
      cnShipName: '远洋之星',
      enShipName: 'Ocean Star',
      flagCountry: '中国',
      portRegistry: '上海',
      buildYear: 2018,
      sendCompany: '中远海运',
      sendRuleNote: '常规航线',
    },
  });
  console.log('✅ 船舶 远洋之星 已就绪');

  await prisma.ship.upsert({
    where: {
      teamCode_cnShipName: {
        teamCode: 'team1',
        cnShipName: '和平号',
      },
    },
    update: {},
    create: {
      teamCode: 'team1',
      cnShipName: '和平号',
      enShipName: 'Peace',
      flagCountry: '中国',
      portRegistry: '广州',
      buildYear: 2020,
      sendCompany: '中海集运',
      sendRuleNote: '国际航线',
    },
  });
  console.log('✅ 船舶 和平号 已就绪');

  // 创建一些测试字典数据
  console.log('📚 创建/更新字典数据...');

  const firstTypes = ['船舶安全', '劳动纪律', '政治思想', '其他'];
  for (const name of firstTypes) {
    await prisma.dictCategory.upsert({
      where: {
        id: firstTypes.indexOf(name) + 1,
      },
      update: {},
      create: {
        categoryType: 'first_type',
        categoryName: name,
        teamCode: 'team1',
        sortOrder: firstTypes.indexOf(name),
      },
    });
  }
  console.log('✅ 一级分类字典已就绪');

  console.log('\n🎉 数据库初始化完成！');
  console.log('\n📋 可用账号：');
  console.log('  1. gogotb / 123456 (岸基主管)');
  console.log('  2. supervisor / 123456 (船舶政委)');
  console.log('  3. shore_crew / admin123 (岸基船工主管)');
  console.log('  4. ship_political / admin123 (船舶政委)');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
