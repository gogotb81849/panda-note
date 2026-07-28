/**
 * 版本号同步脚本：保持 package.json 与 version.json 一致
 * 
 * ⚠️ 注意：这个脚本只同步版本号，不会自动递增！
 * 如果需要递增版本号，请在运维监控中心点击"同步版本"按钮
 * 
 * 版本号优先级：
 * 1. backend/package.json → 后端运行时从 package.json 读取
 * 2. frontend/package.json → 前端运行时从 nuxt.config.ts 读取
 * 3. backend/version.json → 后端附加的构建时间等元数据
 * 
 * 工作流程：
 * - 读取 backend/package.json 的版本号
 * - 同步到 backend/version.json（供后端运行时读取）
 * - 可选同步到 frontend/package.json（如果需要）
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

try {
  // 1. 读取 backend/package.json 版本号
  const backendPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  const backendVersion = backendPkg.version;
  
  console.log(`[version-sync] 后端 package.json 版本: ${backendVersion}`);
  
  // 2. 读取或创建 backend/version.json
  const versionPath = join(rootDir, 'version.json');
  let versionData;
  try {
    versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
  } catch {
    versionData = { buildTime: '', environment: 'development', nodeVersion: 'auto' };
  }
  
  // 3. 同步版本到 version.json
  versionData.version = backendVersion;
  versionData.buildTime = new Date().toISOString();
  
  writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n', 'utf-8');
  console.log(`[version-sync] version.json 已同步: ${backendVersion}`);
  
  // 4. 尝试同步 frontend/package.json（如果存在）
  try {
    const frontendPkgPath = join(rootDir, '..', 'frontend', 'package.json');
    const frontendPkg = JSON.parse(readFileSync(frontendPkgPath, 'utf-8'));
    
    if (frontendPkg.version !== backendVersion) {
      frontendPkg.version = backendVersion;
      writeFileSync(frontendPkgPath, JSON.stringify(frontendPkg, null, 2) + '\n', 'utf-8');
      console.log(`[version-sync] frontend/package.json 已同步: ${frontendPkg.version} → ${backendVersion}`);
    } else {
      console.log(`[version-sync] frontend/package.json 已是最新: ${backendVersion}`);
    }
  } catch (err) {
    // frontend 可能不存在（单独开发后端时），忽略
    console.log(`[version-sync] 跳过 frontend/package.json（${err.message}）`);
  }
  
  console.log(`[version-sync] 版本同步完成 ✅`);
} catch (err) {
  console.error('[version-sync] 同步失败:', err.message);
  process.exit(1);
}
