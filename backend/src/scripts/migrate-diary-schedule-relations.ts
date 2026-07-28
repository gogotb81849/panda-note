import { PrismaClient, TeamCode } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 历史数据迁移脚本：将日记与已完成日程建立关联
 *
 * 匹配规则：
 * 1. 根据日记的 date 字段匹配 schedule 的 recordDate
 * 2. 根据日记的 shipName 反查 shipId，匹配 schedule 的 shipId
 * 3. 根据日记的 categoryFirst / categorySecond 匹配 schedule 的 firstType / secondType
 * 4. schedule 的 finishStatus 必须是 'completed' 或 'in_progress'
 *
 * 执行方式：
 *   npx ts-node src/scripts/migrate-diary-schedule-relations.ts
 *   或编译后：node dist/scripts/migrate-diary-schedule-relations.js
 */

interface MatchResult {
  diaryId: number;
  diaryDate: string;
  matchedScheduleIds: number[];
  unmatchedReason?: string;
}

async function processTeam(teamCode: TeamCode): Promise<{ total: number; matched: number; unmatched: number }> {
  console.log(`\n========================================`);
  console.log(`🔄 处理团队: ${teamCode}`);
  console.log(`========================================`);

  // 1. 加载所有船舶映射
  const ships = await prisma.ship.findMany({
    where: { teamCode },
    select: { id: true, cnShipName: true },
  });
  const shipNameToId = new Map<string, number>();
  for (const s of ships) {
    if (s.cnShipName) shipNameToId.set(s.cnShipName, s.id);
  }
  console.log(`📋 加载了 ${ships.length} 艘船舶`);

  // 2. 加载该团队的所有日记
  const diaries = await prisma.diary.findMany({
    where: { teamCode },
    select: {
      id: true,
      date: true,
      shipName: true,
      categoryFirst: true,
      categorySecond: true,
    },
    orderBy: { date: 'desc' },
  });
  console.log(`📝 加载了 ${diaries.length} 条日记`);

  // 3. 加载该团队的所有已完成/进行中日程
  const schedules = await prisma.schedule.findMany({
    where: {
      teamCode,
      OR: [
        { finishStatus: 'completed' },
        { finishStatus: 'in_progress' },
      ],
    },
    select: {
      id: true,
      recordDate: true,
      shipId: true,
      firstType: true,
      secondType: true,
      finishStatus: true,
    },
  });
  console.log(`📅 加载了 ${schedules.length} 条已完成/进行中日程`);

  // 4. 建立日程索引，方便快速匹配
  // 索引方式: "YYYY-MM-DD||shipId||firstType||secondType" => scheduleId[]
  const scheduleIndex = new Map<string, number[]>();
  for (const s of schedules) {
    if (!s.recordDate) continue;
    const dateStr = new Date(s.recordDate).toISOString().split('T')[0];
    const key = `${dateStr}||${s.shipId || 'null'}||${s.firstType || ''}||${s.secondType || ''}`;
    if (!scheduleIndex.has(key)) {
      scheduleIndex.set(key, []);
    }
    scheduleIndex.get(key)!.push(s.id);
  }
  console.log(`🔍 建立了 ${scheduleIndex.size} 个索引条目`);

  // 5. 已有关联关系的 diaryId 集合（避免重复创建）
  const existingRelations = await prisma.diaryScheduleRelation.findMany({
    where: { teamCode },
    select: { diaryId: true, scheduleId: true },
  });
  const existingRelationSet = new Set<string>();
  for (const r of existingRelations) {
    existingRelationSet.add(`${r.diaryId}-${r.scheduleId}`);
  }
  console.log(`⏭️  已存在 ${existingRelations.length} 条关联关系，将跳过`);

  // 6. 对每条日记进行匹配
  const results: MatchResult[] = [];
  let newRelationsCount = 0;

  for (const diary of diaries) {
    // 6.1 日期字段处理
    if (!diary.date) {
      results.push({
        diaryId: diary.id,
        diaryDate: '',
        matchedScheduleIds: [],
        unmatchedReason: '日记无日期字段',
      });
      continue;
    }
    const dateStr = typeof diary.date === 'string'
      ? diary.date
      : new Date(diary.date as any).toISOString().split('T')[0];

    const matchResult: MatchResult = {
      diaryId: diary.id,
      diaryDate: dateStr,
      matchedScheduleIds: [],
    };

    // 6.2 船舶匹配
    const shipId = diary.shipName ? shipNameToId.get(diary.shipName) : null;

    // 6.3 分类字段匹配
    // 尝试多种匹配方式：精确匹配(日期+船舶+一级+二级)、宽松匹配(日期+船舶+一级)、最宽松匹配(日期+船舶)
    const matchKeys = [
      `${dateStr}||${shipId || 'null'}||${diary.categoryFirst || ''}||${diary.categorySecond || ''}`,
    ];

    // 添加一些变体匹配（例如船舶为空的情况）
    if (shipId !== null) {
      matchKeys.push(`${dateStr}||null||${diary.categoryFirst || ''}||${diary.categorySecond || ''}`);
    }
    if (diary.categoryFirst) {
      matchKeys.push(`${dateStr}||${shipId || 'null'}||${diary.categoryFirst}||`);
      if (shipId !== null) {
        matchKeys.push(`${dateStr}||null||${diary.categoryFirst}||`);
      }
    }

    let foundMatches: number[] = [];
    for (const key of matchKeys) {
      const matches = scheduleIndex.get(key);
      if (matches && matches.length > 0) {
        foundMatches = [...foundMatches, ...matches];
      }
    }

    // 去重
    foundMatches = [...new Set(foundMatches)];

    if (foundMatches.length > 0) {
      // 为每个匹配创建关联（如果尚不存在）
      for (const scheduleId of foundMatches) {
        const relationKey = `${diary.id}-${scheduleId}`;
        if (!existingRelationSet.has(relationKey)) {
          try {
            await prisma.diaryScheduleRelation.create({
              data: {
                teamCode,
                diaryId: diary.id,
                scheduleId,
              },
            });
            existingRelationSet.add(relationKey);
            newRelationsCount++;
            matchResult.matchedScheduleIds.push(scheduleId);
          } catch (err: any) {
            // 可能因唯一约束冲突失败，忽略
            if (!String(err.message).includes('Unique constraint')) {
              console.warn(`  ⚠️  创建关联失败 diary=${diary.id} schedule=${scheduleId}: ${err.message}`);
            }
          }
        }
      }
    } else {
      // 未找到匹配
      const reasons: string[] = [];
      if (!diary.categoryFirst && !diary.categorySecond) {
        reasons.push('无分类信息');
      }
      if (!diary.shipName) {
        reasons.push('无船舶信息');
      }
      matchResult.unmatchedReason = reasons.length > 0 ? reasons.join('; ') : '无匹配日程';
    }

    results.push(matchResult);
  }

  // 7. 输出统计
  const matched = results.filter(r => r.matchedScheduleIds.length > 0).length;
  const unmatched = results.length - matched;

  console.log(`\n📊 统计结果:`);
  console.log(`  总日记数: ${results.length}`);
  console.log(`  成功匹配: ${matched} (${results.length > 0 ? ((matched / results.length) * 100).toFixed(1) : 0}%)`);
  console.log(`  未匹配: ${unmatched}`);
  console.log(`  新增关联: ${newRelationsCount} 条`);

  // 8. 输出未匹配的前 10 条详情（作为调试参考）
  const unmatchedDiaries = results.filter(r => r.matchedScheduleIds.length === 0).slice(0, 10);
  if (unmatchedDiaries.length > 0) {
    console.log(`\n🔍 未匹配日记示例（最多10条）:`);
    for (const r of unmatchedDiaries) {
      const diary = diaries.find(d => d.id === r.diaryId);
      console.log(`  - ID: ${r.diaryId}, 日期: ${r.diaryDate}, 船舶: ${diary?.shipName || '-'}, 分类: ${diary?.categoryFirst || '-'}/${diary?.categorySecond || '-'} (原因: ${r.unmatchedReason})`);
    }
  }

  return { total: results.length, matched, unmatched };
}

async function main() {
  console.log('🚀 开始执行日记-日程关联迁移...');
  console.log(`⏰ 执行时间: ${new Date().toLocaleString()}`);

  const teams: TeamCode[] = ['team1', 'team2', 'team3'];
  const summary = { total: 0, matched: 0, unmatched: 0 };

  for (const team of teams) {
    try {
      const result = await processTeam(team);
      summary.total += result.total;
      summary.matched += result.matched;
      summary.unmatched += result.unmatched;
    } catch (err: any) {
      console.error(`❌ 处理团队 ${team} 失败: ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`🎯 总执行摘要:`);
  console.log(`========================================`);
  console.log(`  总日记数: ${summary.total}`);
  console.log(`  成功匹配: ${summary.matched} (${summary.total > 0 ? ((summary.matched / summary.total) * 100).toFixed(1) : 0}%)`);
  console.log(`  未匹配: ${summary.unmatched}`);
  console.log(`\n⚠️  未匹配日记常见原因:`);
  console.log(`  1. 日记缺少分类字段 (categoryFirst/categorySecond)`);
  console.log(`  2. 日记日期当日无完成的日程记录`);
  console.log(`  3. 分类名称与日程分类不完全一致 (可能需要手动修正)`);
  console.log(`  4. 船舶名称不一致`);
  console.log(`\n✅ 迁移完成！建议在看板/日程页面验证数据显示。`);
}

main()
  .catch((e) => {
    console.error('❌ 迁移失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
