#!/usr/bin/env node
/**
 * 后端 server-side-extra.sh 的"轻量版本"（Node.js 版，只负责读取 version.json 里的版本号）
 * 用作 package.json 的 scripts.prepublishOnly，保留备用。
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
try {
  const vDoc = JSON.parse(readFileSync(join(__dirname, '..', 'version.json'), 'utf-8'));
  console.log(`PANDA_VERSION=${vDoc.version || ''}`);
  console.log(`PANDA_BUILD_TIME=${vDoc.buildTime || ''}`);
} catch (e) {
  console.warn('skip read version.json:', e.message);
}
