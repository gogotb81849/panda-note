const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('=== 开始执行数据初始化 ===\n');

  // ========== 1. 团队二的船工主管改为陈建华 ==========
  console.log('1. 更新团队二的船工主管为陈建华...');
  const updateResult = await prisma.ship.updateMany({
    where: { teamCode: 'team2' },
    data: { crewSupervisor: '陈建华' },
  });
  console.log(`   已更新 ${updateResult.count} 条船舶记录\n`);

  // ========== 2. 根据政委姓名批量创建账号 ==========
  console.log('2. 根据船舶政委姓名批量创建账号...');
  
  // 获取所有有政委姓名的船舶
  const ships = await prisma.ship.findMany({
    where: {
      politicalInstructor: {
        not: null,
        notIn: ['', '-', '待定', '待派'],
      },
    },
    select: {
      id: true,
      teamCode: true,
      cnShipName: true,
      politicalInstructor: true,
    },
    orderBy: { politicalInstructor: 'asc' },
  });

  console.log(`   找到 ${ships.length} 条有政委姓名的船舶记录`);

  // 去重政委姓名
  const instructorMap = new Map();
  for (const ship of ships) {
    const name = ship.politicalInstructor.trim();
    if (!instructorMap.has(name)) {
      instructorMap.set(name, {
        name,
        teamCode: ship.teamCode,
        ships: [],
      });
    }
    instructorMap.get(name).ships.push(ship);
  }

  console.log(`   去重后共 ${instructorMap.size} 位政委\n`);

  const defaultPassword = '123456';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let createdCount = 0;
  let skippedCount = 0;
  const createdUsers = [];

  for (const [name, info] of instructorMap) {
    // 生成用户名：拼音首字母 + 名字（简单处理：用名字拼音首字母+名字）
    // 这里简化处理：username = name的拼音，没有拼音库的话用名字拼音替换
    // 先用 name_pol 作为用户名后缀
    const username = `${name.replace(/\s/g, '')}_pol`.toLowerCase();

    // 检查用户名是否已存在
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      console.log(`   跳过：${name} (${username}) 已存在`);
      skippedCount++;
      continue;
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        realName: name,
        teamCode: info.teamCode,
        role: 'ship_political_instructor',
        roles: ['ship_political_instructor'],
      },
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
      },
    });

    createdUsers.push(user);
    createdCount++;
    console.log(`   创建：${name} (${username}) - ${info.teamCode}`);

    // 更新船舶表中的政委用户ID
    for (const ship of info.ships) {
      await prisma.ship.update({
        where: { id: ship.id },
        data: {
          politicalOfficerId: user.id,
          politicalOfficerName: name,
        },
      });
    }
  }

  console.log(`\n   账号创建完成：新增 ${createdCount} 个，跳过 ${skippedCount} 个`);
  console.log(`   默认密码：${defaultPassword}\n`);

  // ========== 3. 模拟政委一个月的航线/日记信息 ==========
  console.log('3. 模拟政委一个月的航线和日记信息...');

  // 检查是否已有日记数据（避免重复生成）
  const existingDiaryCount = await prisma.diary.count();
  if (existingDiaryCount > 0) {
    console.log(`   数据库中已有 ${existingDiaryCount} 条日记，跳过模拟数据生成\n`);
  } else {
    // 获取所有政委用户
    const polUsers = await prisma.user.findMany({
      where: {
        role: 'ship_political_instructor',
      },
      select: {
        id: true,
        realName: true,
        teamCode: true,
      },
    });

    console.log(`   找到 ${polUsers.length} 位政委用户`);

    // 生成过去30天的日记
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);

    let diaryCount = 0;

    for (const user of polUsers) {
      // 找该政委对应的船
      const userShip = await prisma.ship.findFirst({
        where: { politicalOfficerId: user.id },
        select: { id: true, cnShipName: true },
      });

      if (!userShip) continue;

      // 生成过去30天的日记（每天一条，随机跳过一些天）
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        // 80%概率有日记
        if (Math.random() > 0.8) continue;

        const dateStr = new Date(d);
        dateStr.setHours(8, 0, 0, 0);

        // 随机天气和海况
        const weathers = ['晴', '多云', '阴', '小雨', '中雨', '雾'];
        const seaConditions = ['微浪', '轻浪', '中浪', '大浪'];
        const statuses = ['航行中', '锚泊', '靠泊'];

        const weather = weathers[Math.floor(Math.random() * weathers.length)];
        const seaCondition = seaConditions[Math.floor(Math.random() * seaConditions.length)];
        const dynamicStatus = statuses[Math.floor(Math.random() * statuses.length)];

        // 随机生成日记内容
        const contents = [
          `今日船舶${dynamicStatus}，天气${weather}，海况${seaCondition}。全体船员精神状态良好，工作有序开展。`,
          `${weather}，${seaCondition}。今日组织船员开展安全学习，重点学习了消防救生知识，船员反应积极。`,
          `船舶${dynamicStatus}中，${weather}。今日进行了船舶安全检查，各项设备运行正常。`,
          `${weather}转${seaConditions[Math.floor(Math.random() * seaConditions.length)]}。今日召开船员大会，传达公司最新文件精神，大家认真学习。`,
          `${weather}，海况${seaCondition}。今日开展党小组学习，学习党的最新理论成果，党员同志积极发言。`,
          `船舶${dynamicStatus}，${weather}。今日进行了伙食检查，伙食供应良好，船员满意度较高。`,
          `${weather}，${seaCondition}。今日组织船员进行了应急演练，演练效果良好，船员应急能力得到提升。`,
        ];

        const content = contents[Math.floor(Math.random() * contents.length)];

        try {
          await prisma.diary.create({
            data: {
              userId: user.id,
              teamCode: user.teamCode,
              shipId: userShip.id,
              shipName: userShip.cnShipName,
              date: dateStr,
              content,
              weather,
              seaCondition,
              dynamicStatus,
              politicalInstructorName: user.realName,
              categoryFirst: '日常工作',
              categorySecond: dynamicStatus === '航行中' ? '航行值班' : '在港工作',
              categorySource: 'auto',
            },
          });
          diaryCount++;
        } catch (e) {
          // 唯一键冲突跳过
          if (e.code === 'P2002') continue;
          console.error(`   生成日记失败：${user.realName} - ${dateStr.toISOString().split('T')[0]}`, e.message);
        }
      }
    }

    console.log(`   模拟日记生成完成：共生成 ${diaryCount} 条日记\n`);
  }

  console.log('=== 全部执行完成 ===');
}

main()
  .catch((e) => {
    console.error('执行出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
