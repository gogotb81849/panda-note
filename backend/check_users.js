const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  try {
    console.log('=== 查询所有用户 ===');
    const users = await p.user.findMany({
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        teamCode: true,
        password: true,
      },
    });
    console.log('用户数量:', users.length);
    for (const u of users) {
      console.log(`\n用户: ${u.username} (${u.realName})`);
      console.log(`  角色: ${u.role}`);
      console.log(`  团队: ${u.teamCode}`);
      console.log(`  密码哈希前20位: ${u.password?.substring(0, 20) || '(空)'}`);
      
      // 测试几个常见密码
      const testPasswords = ['123456', 'admin123', '254430', 'password', '123', 'test'];
      for (const pwd of testPasswords) {
        const isValid = await bcrypt.compare(pwd, u.password);
        if (isValid) {
          console.log(`  密码匹配: ${pwd} ✅`);
        }
      }
    }
  } catch (e) {
    console.error('错误:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
