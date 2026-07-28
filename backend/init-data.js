
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化测试数据...');

  await prisma.publicCase.deleteMany();
  await prisma.sopFlow.deleteMany();
  await prisma.dictCategory.deleteMany();
  await prisma.operationLog.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.staffHistory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ship.deleteMany();

  console.log('旧数据已清空');

  const firstTypes = await Promise.all([
    { categoryType: 'first_type', categoryName: '检修', sortOrder: 1 },
    { categoryType: 'first_type', categoryName: '培训', sortOrder: 2 },
    { categoryType: 'first_type', categoryName: '检查', sortOrder: 3 },
    { categoryType: 'first_type', categoryName: '会议', sortOrder: 4 },
    { categoryType: 'first_type', categoryName: '其它', sortOrder: 5 },
  ].map(function(d) { return prisma.dictCategory.create({ data: d }); }));

  const secondTypes = await Promise.all([
    { categoryType: 'second_type', categoryName: '年度检修', sortOrder: 1 },
    { categoryType: 'second_type', categoryName: '安全培训', sortOrder: 2 },
    { categoryType: 'second_type', categoryName: '安全检查', sortOrder: 3 },
    { categoryType: 'second_type', categoryName: '工作安排', sortOrder: 4 },
  ].map(function(d) { return prisma.dictCategory.create({ data: d }); }));

  console.log('分类字典数据已创建');

  const shipsData = [
    { teamCode: 'team2', cnShipName: '连杉湖', teamDisplayName: '第二总管团队', marineSupervisor: '程奇' },
    { teamCode: 'team2', cnShipName: '连桂湖', teamDisplayName: '第二总管团队', marineSupervisor: '程奇' },
    { teamCode: 'team2', cnShipName: '连欢湖', teamDisplayName: '第二总管团队', marineSupervisor: '程奇' },
    { teamCode: 'team2', cnShipName: '连喜湖', teamDisplayName: '第二总管团队', marineSupervisor: '程奇' },
    { teamCode: 'team2', cnShipName: '连乐湖', teamDisplayName: '第二总管团队', marineSupervisor: '程奇' },
    { teamCode: 'team2', cnShipName: '远菊湾', teamDisplayName: '第二总管团队', marineSupervisor: '程奇' },
    { teamCode: 'team2', cnShipName: '梅林湾', teamDisplayName: '第一团队', marineSupervisor: '许可' },
    { teamCode: 'team2', cnShipName: '枫林湾', teamDisplayName: '第一团队', marineSupervisor: '许可' },
    { teamCode: 'team2', cnShipName: '榕林湾', teamDisplayName: '第一团队', marineSupervisor: '许可' },
    { teamCode: 'team2', cnShipName: '远兰湾', teamDisplayName: '第一团队', marineSupervisor: '许可' },
    { teamCode: 'team2', cnShipName: '海豚座', teamDisplayName: '第一团队', marineSupervisor: '尤金灼' },
    { teamCode: 'team2', cnShipName: '珊瑚座', teamDisplayName: '第一团队', marineSupervisor: '尤金灼' },
    { teamCode: 'team2', cnShipName: '鲸鱼座', teamDisplayName: '第一团队', marineSupervisor: '尤金灼' },
    { teamCode: 'team2', cnShipName: '孔雀座', teamDisplayName: '第一团队', marineSupervisor: '尤金灼' },
    { teamCode: 'team2', cnShipName: '白鹭座', teamDisplayName: '第一团队', marineSupervisor: '尤金灼' },
    { teamCode: 'team2', cnShipName: '天鹅座', teamDisplayName: '第一团队', marineSupervisor: '尤金灼' },
    { teamCode: 'team2', cnShipName: '千池', teamDisplayName: '第一团队', marineSupervisor: '郭爱观' },
    { teamCode: 'team2', cnShipName: '秋池', teamDisplayName: '第一团队', marineSupervisor: '郭爱观' },
    { teamCode: 'team2', cnShipName: '俸池', teamDisplayName: '第一团队', marineSupervisor: '郭爱观' },
    { teamCode: 'team2', cnShipName: '业池', teamDisplayName: '第一团队', marineSupervisor: '郭爱观' },
    { teamCode: 'team2', cnShipName: '贵池', teamDisplayName: '第一团队', marineSupervisor: '郭爱观' },
    { teamCode: 'team2', cnShipName: '远晶河', teamDisplayName: '第一团队', marineSupervisor: '郭爱观' },
    { teamCode: 'team2', cnShipName: '连柏湖', teamDisplayName: '第一团队', marineSupervisor: '侯春杨' },
    { teamCode: 'team2', cnShipName: '山鹰座', teamDisplayName: '第一团队', marineSupervisor: '侯春杨' },
    { teamCode: 'team2', cnShipName: '华池', teamDisplayName: '第一团队', marineSupervisor: '侯春杨' },
    { teamCode: 'team2', cnShipName: '秀池', teamDisplayName: '第一团队', marineSupervisor: '侯春杨' },
    { teamCode: 'team2', cnShipName: '河池', teamDisplayName: '第一团队', marineSupervisor: '侯春杨' },
    { teamCode: 'team2', cnShipName: '远玉河', teamDisplayName: '第一团队', marineSupervisor: '侯春杨' },
    { teamCode: 'team2', cnShipName: '桦林湾', teamDisplayName: '第一团队', marineSupervisor: '王家勇', engineerSupervisor: '王文优' },
    { teamCode: 'team2', cnShipName: '连松湖', teamDisplayName: '第一团队', marineSupervisor: '王家勇', engineerSupervisor: '王文优' },
    { teamCode: 'team2', cnShipName: '麒麟座', teamDisplayName: '第一团队', marineSupervisor: '王家勇', engineerSupervisor: '易伟辉' },
    { teamCode: 'team2', cnShipName: '华川', teamDisplayName: '第一团队', marineSupervisor: '王家勇', engineerSupervisor: '易伟辉' },
    { teamCode: 'team2', cnShipName: '曾长成', teamDisplayName: '待调离' },
    { teamCode: 'team2', cnShipName: '唐新政', teamDisplayName: '待调离' },
    { teamCode: 'team2', cnShipName: '刘雪松', teamDisplayName: '待调离' },
  ];

  const ships = await Promise.all(shipsData.map(function(data) { 
    return prisma.ship.upsert({
      where: { teamCode_cnShipName: { teamCode: data.teamCode, cnShipName: data.cnShipName } },
      update: data,
      create: data
    }); 
  }));

  console.log('船舶数据已创建，共', ships.length, '艘');

  const hashedPassword = await bcrypt.hash('123456', 10);
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'gogotb' },
      update: {},
      create: {
        username: 'gogotb',
        password: hashedPassword,
        realName: '邓红光',
        teamCode: 'team2',
        role: 'shore_crew_supervisor'
      }
    }),
    prisma.user.upsert({
      where: { username: 'supervisor' },
      update: {},
      create: {
        username: 'supervisor',
        password: hashedPassword,
        realName: '船舶政委',
        teamCode: 'team2',
        role: 'ship_political_instructor'
      }
    }),
    prisma.user.upsert({
      where: { username: 'shore_crew' },
      update: {},
      create: {
        username: 'shore_crew',
        password: hashedPasswordAdmin,
        realName: '岸基主管',
        teamCode: 'team2',
        role: 'shore_crew_supervisor'
      }
    }),
    prisma.user.upsert({
      where: { username: 'ship_political' },
      update: {},
      create: {
        username: 'ship_political',
        password: hashedPasswordAdmin,
        realName: '船舶政委',
        teamCode: 'team2',
        role: 'ship_political_instructor'
      }
    })
  ]);

  console.log('用户数据已创建');
  console.log('\n初始化完成！');
  console.log('\n测试账号：');
  console.log('  - 邓红光: gogotb / 123456');
  console.log('  - 岸基主管: shore_crew / admin123');
  console.log('  - 船舶政委: ship_political / admin123');
  console.log('\n船舶数量：', ships.length, '艘');
}

main()
  .catch(function(e) {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async function() {
    await prisma.$disconnect();
  });
