const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 开始模拟完整数据流转（日程+日记联动） ===\n');

  // 获取所有政委用户
  const polUsers = await prisma.user.findMany({
    where: {
      role: 'ship_political_instructor',
      realName: { notIn: ['未填写', '待定', '待派', '-', ''] },
    },
    select: {
      id: true,
      username: true,
      realName: true,
      teamCode: true,
    },
    orderBy: { id: 'asc' },
  });
  console.log(`找到 ${polUsers.length} 位政委用户\n`);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30);

  // 日程分类（一级/二级）
  const scheduleCategories = [
    { first: '日常工作', second: '航行值班' },
    { first: '日常工作', second: '在港工作' },
    { first: '安全管理', second: '安全检查' },
    { first: '安全管理', second: '应急演练' },
    { first: '人员管理', second: '船员培训' },
    { first: '人员管理', second: '思想教育' },
    { first: '党务工作', second: '党员学习' },
    { first: '党务工作', second: '组织生活' },
    { first: '船舶管理', second: '设备维护' },
    { first: '船舶管理', second: '伙食管理' },
  ];

  // 每个状态的比例
  const statusRatio = {
    completed: 0.75,    // 已完成
    in_progress: 0.10,  // 进行中
    pending: 0.10,      // 待处理
    cancelled: 0.05,    // 已取消
  };

  let totalSchedules = 0;
  let totalDiariesLinked = 0;

  for (const user of polUsers) {
    // 找该政委对应的船
    const userShip = await prisma.ship.findFirst({
      where: { politicalOfficerId: user.id },
      select: { id: true, cnShipName: true, currentStatus: true, eta: true, etd: true },
    });

    if (!userShip) continue;

    // 生成过去30天的日程（每天2-5条）
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = new Date(d);
      dateStr.setHours(0, 0, 0, 0);

      // 跳过一些天（约10%的天没有日程）
      if (Math.random() > 0.9) continue;

      const scheduleCount = Math.floor(Math.random() * 4) + 2; // 2-5条
      const daySchedules = [];

      for (let i = 0; i < scheduleCount; i++) {
        const cat = scheduleCategories[Math.floor(Math.random() * scheduleCategories.length)];

        // 随机状态
        const rand = Math.random();
        let status = 'pending';
        let cumulative = 0;
        for (const [s, ratio] of Object.entries(statusRatio)) {
          cumulative += ratio;
          if (rand < cumulative) { status = s; break; }
        }

        // 如果是今天的日程，pending/in_progress 比例高一些
        const isToday = dateStr.toDateString() === today.toDateString();
        if (isToday && Math.random() > 0.5) {
          status = Math.random() > 0.5 ? 'pending' : 'in_progress';
        }

        const startTime = new Date(dateStr);
        startTime.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1 + Math.floor(Math.random() * 3));

        // 日程详情
        const details = [
          `${cat.second}工作正常开展，船员精神状态良好。`,
          `组织进行${cat.second}，全体船员参与，效果良好。`,
          `今日${cat.first}工作按计划推进，${cat.second}任务已落实。`,
          `开展${cat.second}工作，重点检查了相关事项，发现问题已及时整改。`,
          `${cat.second}工作会议，传达上级指示精神，部署下一步工作。`,
        ];

        try {
          const schedule = await prisma.schedule.create({
            data: {
              teamCode: user.teamCode,
              recordDate: dateStr,
              shipId: userShip.id,
              firstType: cat.first,
              secondType: cat.second,
              title: `${cat.first} - ${cat.second}`,
              description: details[Math.floor(Math.random() * details.length)],
              eventDetail: details[Math.floor(Math.random() * details.length)],
              startTime,
              endTime,
              finishStatus: status,
              priority: Math.random() > 0.7 ? 'important' : 'normal',
              createdById: user.id,
              assignedToId: user.id,
            },
            select: { id: true, finishStatus: true },
          });
          daySchedules.push(schedule);
          totalSchedules++;
        } catch (e) {
          if (e.code === 'P2002') continue;
          console.error(`创建日程失败: ${user.realName} - ${dateStr.toISOString().split('T')[0]}`, e.message);
        }
      }

      // 为有已完成日程的天生成日记（约60%的天数有日记）
      const hasCompleted = daySchedules.some(s => s.finishStatus === 'completed');
      if (hasCompleted && Math.random() > 0.4) {
        // 检查该天是否已有日记
        const existingDiary = await prisma.diary.findFirst({
          where: {
            userId: user.id,
            date: dateStr,
          },
          select: { id: true },
        });

        if (existingDiary) continue;

        // 随机天气和海况
        const weathers = ['晴', '多云', '阴', '小雨', '中雨', '雾'];
        const seaConditions = ['微浪', '轻浪', '中浪', '大浪'];
        const weather = weathers[Math.floor(Math.random() * weathers.length)];
        const seaCondition = seaConditions[Math.floor(Math.random() * seaConditions.length)];

        // 获取该船当前动态
        let dynamicStatus = 'sailing';
        const rawStatus = (userShip.currentStatus || '').toLowerCase();
        if (rawStatus.includes('berth') || rawStatus.includes('靠泊')) dynamicStatus = 'berthed';
        else if (rawStatus.includes('anchor') || rawStatus.includes('锚泊')) dynamicStatus = 'anchored';
        else if (rawStatus.includes('repair') || rawStatus.includes('修理')) dynamicStatus = 'repair';

        // 日记内容
        const diaryContents = [
          `今日船舶${dynamicStatus === 'berthed' ? '靠泊' : dynamicStatus === 'anchored' ? '锚泊' : dynamicStatus === 'repair' ? '修理' : '航行'}中。天气${weather}，海况${seaCondition}。\n\n今日工作重点：\n1. 安全检查：对船舶重点设备进行了安全巡检，运行正常\n2. 人员管理：组织船员开展业务学习，效果良好\n3. 党务工作：召开党小组会，学习党的最新文件精神\n\n全体船员精神状态良好，工作有序开展。`,
          `${weather}，${seaCondition}。\n\n今日主要工作：\n- 完成了今日的航行值班任务，航行安全\n- 组织船员进行安全培训，提升安全意识\n- 检查了伙食供应情况，伙食良好\n- 与岸基沟通了下一步工作安排\n\n船舶运行正常，船员状态稳定。`,
          `船舶${dynamicStatus === 'berthed' ? '靠泊作业' : dynamicStatus === 'anchored' ? '锚泊待命' : '航行'}中。\n\n今日工作总结：\n1. ${dynamicStatus === 'berthed' ? '靠泊期间进行了货物装卸作业' : '航行期间按计划推进'}\n2. 开展了船员思想教育工作，了解船员思想动态\n3. 进行了应急演练，提升船员应急处置能力\n4. 检查了船舶设备，确保运行正常\n\n明日工作计划：继续做好本职工作，确保船舶安全。`,
        ];

        try {
          const diary = await prisma.diary.create({
            data: {
              userId: user.id,
              teamCode: user.teamCode,
              shipId: userShip.id,
              shipName: userShip.cnShipName,
              date: dateStr,
              content: diaryContents[Math.floor(Math.random() * diaryContents.length)],
              weather,
              seaCondition,
              dynamicStatus,
              politicalInstructorName: user.realName,
              categoryFirst: '日常工作',
              categorySecond: dynamicStatus === 'berthed' ? '在港工作' : '航行值班',
              categorySource: 'auto',
            },
            select: { id: true },
          });

          // 关联今日已完成的日程到日记
          const completedScheduleIds = daySchedules
            .filter(s => s.finishStatus === 'completed')
            .map(s => s.id);

          if (completedScheduleIds.length > 0) {
            for (const scheduleId of completedScheduleIds) {
              try {
                await prisma.diaryScheduleRelation.create({
                  data: {
                    diaryId: diary.id,
                    scheduleId,
                  },
                });
              } catch (e) {
                if (e.code === 'P2002') continue;
              }
            }
            totalDiariesLinked++;
          }
        } catch (e) {
          if (e.code === 'P2002') continue;
          console.error(`创建日记失败: ${user.realName} - ${dateStr.toISOString().split('T')[0]}`, e.message);
        }
      }
    }
  }

  console.log(`\n数据生成统计：`);
  console.log(`  新增日程：${totalSchedules} 条`);
  console.log(`  新增关联日记：${totalDiariesLinked} 条`);

  // 统计今日数据
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const todayStats = await prisma.schedule.groupBy({
    by: ['finishStatus'],
    where: {
      recordDate: { gte: todayStart, lte: todayEnd },
      teamCode: 'team2',
    },
    _count: true,
  });
  console.log(`\n今日日程分布（team2）：`);
  for (const stat of todayStats) {
    console.log(`  ${stat.finishStatus}: ${stat._count} 条`);
  }

  const todayDiaryCount = await prisma.diary.count({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      teamCode: 'team2',
    },
  });
  console.log(`  今日日记：${todayDiaryCount} 条`);

  console.log('\n=== 模拟完成 ===');
}

main()
  .catch((e) => {
    console.error('执行出错:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
