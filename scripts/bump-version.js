/**
 * 版本号同步/递增脚本
 *
 * 用法：
 *   node bump-version.js         # 仅同步版本号（前后端一致），不递增
 *   node bump-version.js --bump  # 递增补丁号 + 同步到前后端
 *
 * 版本号格式：1.1.0.0064（主.次.修订.补丁），补丁号4位补零
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const frontendPkg = join(__dirname, '..', 'frontend', 'package.json');
const backendPkg = join(__dirname, '..', 'backend', 'package.json');

const shouldBump = process.argv.includes('--bump');

function readVersion(pkgPath) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

function writeVersion(pkgPath, newVersion) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const oldVersion = pkg.version;
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  return oldVersion;
}

function bumpPatch(version) {
  const parts = version.split('.');
  if (parts.length !== 4) {
    console.warn(`警告：版本号格式异常 "${version}"，期望 4 段式，将在末尾追加 .0001`);
    parts.push('0001');
    return parts.join('.');
  }
  const patch = parseInt(parts[3], 10) + 1;
  parts[3] = String(patch).padStart(4, '0');
  return parts.join('.');
}

let sourceVersion = readVersion(frontendPkg);
console.log(`当前前端版本：${sourceVersion}`);

if (shouldBump) {
  const newVersion = bumpPatch(sourceVersion);
  console.log(`递增补丁号：${sourceVersion} → ${newVersion}`);
  sourceVersion = newVersion;
}

const feOld = writeVersion(frontendPkg, sourceVersion);
const beOld = writeVersion(backendPkg, sourceVersion);

console.log(`\n前端版本：${feOld} → ${sourceVersion}${feOld === sourceVersion ? '（无变化）' : ''}`);
console.log(`后端版本：${beOld} → ${sourceVersion}${beOld === sourceVersion ? '（无变化）' : ''}`);
console.log('\n版本同步完成 ✅');
