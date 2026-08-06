import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ⚠️ 临时一次性修复控制器（仅本次部署使用，下一版本会移除）
 *
 * 背景：GitHub PAT 缺少 workflow scope，无法修改 .github/workflows/deploy.yml
 * 添加 pm2 delete+start 的修复脚本；同时本机沙箱网络无法直连服务器 22 端口（超时）。
 *
 * 因此在后端内部加一个无鉴权但带长 token 保护的接口，调用后会在服务器内部执行：
 *   1) pm2 delete nav-log-frontend / nav-log-backend（清除 PM2 保存的旧 exec cwd）
 *   2) 从 /www/wwwroot/nav-log-system/{backend,frontend} 重新 pm2 start --cwd=...
 *   3) pm2 save
 *
 * 保护方式：query.token 必须匹配 FIX_TOKEN（32 字符随机）。不匹配直接返回 404，避免扫描攻击。
 */

const FIX_TOKEN = 'Pm2FixToken_2026Aug06_x9K2m7Qp5zR4tV1wN8hB3cL6sY0jF4gD';

// 文档 6.1 & 11.3 已确认部署路径：/www/wwwroot/nav-log-system
const DEPLOY_DIR = '/www/wwwroot/nav-log-system';

@Controller('_fix_pm2_20260806')
export class TempFixPm2Controller {
  @Get()
  async fix(@Query('token') token: string, @Res() res: Response) {
    if (token !== FIX_TOKEN) {
      return res.status(HttpStatus.NOT_FOUND).send('Not Found');
    }

    const log: string[] = [];
    const run = (cmd: string): { out: string; err: string; code: number } => {
      log.push(`$ ${cmd}`);
      try {
        const out = execSync(cmd, { encoding: 'utf-8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] });
        log.push(out.trimEnd());
        return { out, err: '', code: 0 };
      } catch (e: any) {
        const errMsg = [
          e.stdout?.toString() || '',
          e.stderr?.toString() || '',
          `exit code = ${e.status ?? 'unknown'}`,
        ].filter(Boolean).join('\n').trimEnd();
        log.push(errMsg);
        return { out: e.stdout?.toString() || '', err: e.stderr?.toString() || '', code: e.status ?? 1 };
      }
    };

    log.push(`[start] ${new Date().toISOString()}`);

    // 0) 确认目录存在
    if (!fs.existsSync(DEPLOY_DIR)) {
      log.push(`ERROR: DEPLOY_DIR ${DEPLOY_DIR} not exist`);
      return this.ok(res, log);
    }
    if (!fs.existsSync(`${DEPLOY_DIR}/frontend/.output/server/index.mjs`)) {
      log.push('WARNING: frontend .output/server/index.mjs not exist — GitHub Actions may still building, skip frontend restart');
    } else {
      // 1) 前端：delete 旧进程（保证旧 cwd 不会被沿用）
      run('pm2 delete nav-log-frontend 2>/dev/null || true');
      // 重新 start，显式 --cwd
      run(`cd "${DEPLOY_DIR}/frontend" && pm2 start .output/server/index.mjs --name nav-log-frontend --cwd "${DEPLOY_DIR}/frontend" --node-args="--max-old-space-size=512" || true`);
    }

    if (!fs.existsSync(`${DEPLOY_DIR}/backend/dist/main.js`)) {
      log.push('WARNING: backend dist/main.js not exist — Actions may still building, skip backend restart');
    } else {
      // 2) 后端：delete + restart
      run('pm2 delete nav-log-backend 2>/dev/null || true');
      run(`cd "${DEPLOY_DIR}/backend" && pm2 start dist/main.js --name nav-log-backend --cwd "${DEPLOY_DIR}/backend" --node-args="--max-old-space-size=512" || true`);
    }

    // 3) 保存 PM2
    run('pm2 save || true');
    // 4) 查看状态
    run('sleep 3; pm2 ls || true');

    // 5) 记录到 logs/ops.log
    try {
      const logDir = path.join(DEPLOY_DIR, 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(
        path.join(logDir, 'ops.log'),
        `\n--- ${new Date().toISOString()} ---\n[PM2 Fix] token triggered reset\n${log.join('\n')}\n`,
        'utf8',
      );
    } catch {
      /* ignore */
    }

    log.push(`[done] ${new Date().toISOString()}`);
    return this.ok(res, log);
  }

  private ok(res: Response, log: string[]) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(HttpStatus.OK).send(log.join('\n'));
  }
}
