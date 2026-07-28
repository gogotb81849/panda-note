// 模拟新 compareSemver 逻辑测试
function compareSemver(clientVersion, serverVersion) {
  const clientParts = clientVersion.split('.').map(Number);
  const serverParts = serverVersion.split('.').map(Number);
  const [cMaj, cMin, cPat, cBld] = [clientParts[0]||0, clientParts[1]||0, clientParts[2]||0, clientParts[3]||0];
  const [sMaj, sMin, sPat, sBld] = [serverParts[0]||0, serverParts[1]||0, serverParts[2]||0, serverParts[3]||0];

  if (sMaj > cMaj) return { major:true, minor:false, patch:false, build:false };
  if (sMaj < cMaj) return { major:false, minor:false, patch:false, build:false };
  if (sMin > cMin) return { major:false, minor:true, patch:false, build:false };
  if (sMin < cMin) return { major:false, minor:false, patch:false, build:false };
  if (sPat > cPat) return { major:false, minor:false, patch:true, build:false };
  if (sPat < cPat) return { major:false, minor:false, patch:false, build:false };
  if (sBld > cBld) return { major:false, minor:false, patch:false, build:true };
  return { major:false, minor:false, patch:false, build:false };
}

const tests = [
  ['1.1.0.0042', '1.1.0.0041', false],
  ['1.1.0.0041', '1.1.0.0042', true],
  ['1.1.0.0044', '1.1.0.0044', false],
  ['1.0.0.0001', '1.1.0.0044', true],
  ['1.1.0.0044', '2.0.0.0001', true],
  ['2.0.0.0001', '1.1.0.0044', false],
  ['1.1.0.0044', '1.1.1.0001', true],
];

console.log('=== compareSemver 全面测试 ===');
let allPassed = true;
for (const [client, server, expectNeed] of tests) {
  const r = compareSemver(client, server);
  const needs = r.major || r.minor || r.patch || r.build;
  const pass = needs === expectNeed;
  allPassed = allPassed && pass;
  const mark = pass ? '✓' : '✗';
  console.log(`[${mark}] 客户端=${client}  服务器=${server}  需要升级=${needs} 预期=${expectNeed}`);
}
console.log(allPassed ? '\n✓ 全部通过' : '\n✗ 有失败');
