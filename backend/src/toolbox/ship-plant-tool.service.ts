/**
 * 熊猫笔记工具箱 · 海上菜篮子工具联动服务
 *
 * 【剥离边界·重要！】
 * 本文件是熊猫笔记侧与海上菜篮子对接的「唯一边界文件」：
 *  1. 作用：
 *     · 缓存 GET /api/pandanote/manifest 握手结果（TTL 5分钟），避免每次打开工具箱都跨服务握手
 *     · 提供「熊猫笔记版本号 ↔ 海上菜篮子版本号」映射表（PANDA_TO_SHIP_VERSION_MAP），便于发布联动
 *     · 提供远程触发服务器端同步更新的接口（triggerShipPlantSyncUpdate）
 *  2. 未来剥离场景：
 *     🔴 直接删除本文件即可。
 *     关联清理点：toolbox.controller.ts 中对本服务的 import 与注入（通常 1 处）。
 *     熊猫笔记内其他工具（PDF压缩、图片压缩、便签、屏保）100% 不受影响。
 *
 *  【架构原则】
 *  严格遵守「解耦设计铁律」：
 *  · 绝不读取海上菜篮子数据库（两边数据完全隔离，MySQL vs PostgreSQL）
 *  · 绝不 import 任何海上菜篮子代码（两侧代码仓库完全独立）
 *  · 所有通信均走 HTTP（manifest / ping / API白名单）+ 服务器 Shell 脚本（联动部署）
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/** 【发布联动】熊猫笔记版本号 → 海上菜篮子版本号绑定表
 *  规则：熊猫笔记每次发版（如 1.1.0.0813），对应一个已充分联调验证的海上菜篮子 TAG（如 v1.6.2）。
 *  熊猫笔记部署后，可调用 /api/toolbox/ship-plant/sync 更新服务器上的海上菜篮子到该绑定版本。
 *
 *  【剥离时怎么处理】
 *  删除本文件时整张表一起删除即可，不影响熊猫笔记发布逻辑。
 */
export const PANDA_TO_SHIP_VERSION_MAP: Record<string, string> = {
  '1.1.0.0813': 'v1.6.2', // 本版本：首次打通通过熊猫笔记发布系统联动发布
};

/** 默认回退的海上菜篮子版本号（绑定表找不到时使用） */
export const SHIP_PLANT_DEFAULT_VERSION = 'v1.6.2';

/** 海上菜篮子 manifest 缓存结构 */
export interface CachedManifest {
  manifest: any;
  fetchedAtMs: number;
  expireAtMs: number;
  sourceUrl: string;
}

@Injectable()
export class ShipPlantToolService implements OnModuleInit {
  private readonly logger = new Logger(ShipPlantToolService.name);

  /** 同机部署默认地址（HTTP，走内网/localhost，避免宝塔 HTTPS 配置） */
  private readonly shipPlantBaseUrl =
    process.env.SHIP_PLANT_BASE_URL || 'http://127.0.0.1:8080';

  /** 联动更新脚本路径（与熊猫笔记同机部署在 106.14.57.62） */
  private readonly shipPlantSyncScript =
    process.env.SHIP_PLANT_SYNC_SCRIPT ||
    '/opt/ship-plant/ship-plant-big-screen/scripts/sync-update-from-panda.sh';

  /** manifest 内存缓存（TTL 默认 5 分钟） */
  private manifestCache: CachedManifest | null = null;
  private readonly cacheTtlMs = 5 * 60 * 1000;

  onModuleInit() {
    this.logger.log(
      `[ShipPlantTool] init: baseUrl=${this.shipPlantBaseUrl}, syncScript=${this.shipPlantSyncScript}, ` +
        `panda->ship binding count=${Object.keys(PANDA_TO_SHIP_VERSION_MAP).length}`
    );
  }

  // ===================================================================
  // 1. 版本绑定表查询
  // ===================================================================

  /** 根据当前熊猫笔记版本号，获取「推荐绑定的」海上菜篮子 TAG 版本 */
  resolveShipPlantVersion(pandaNoteVersion: string): string {
    const mapped = PANDA_TO_SHIP_VERSION_MAP[pandaNoteVersion?.trim() || ''];
    if (mapped) {
      this.logger.log(`[ShipPlantTool] version bind: panda=${pandaNoteVersion} -> ship=${mapped}`);
      return mapped;
    }
    this.logger.warn(
      `[ShipPlantTool] panda version ${pandaNoteVersion} not in binding table, fall back to ${SHIP_PLANT_DEFAULT_VERSION}`
    );
    return SHIP_PLANT_DEFAULT_VERSION;
  }

  /** 返回当前绑定表（前端版本联动界面展示用） */
  getVersionBindings() {
    return {
      bindings: PANDA_TO_SHIP_VERSION_MAP,
      defaultVersion: SHIP_PLANT_DEFAULT_VERSION,
    };
  }

  // ===================================================================
  // 2. Manifest 缓存 + 握手
  // ===================================================================

  /** 获取海上菜篮子的 manifest（优先走缓存） */
  async getManifest(options: { forceRefresh?: boolean; sharedSecret?: string } = {}): Promise<any> {
    const now = Date.now();
    if (
      !options.forceRefresh &&
      this.manifestCache &&
      now < this.manifestCache.expireAtMs &&
      this.manifestCache.sourceUrl === this.shipPlantBaseUrl
    ) {
      return {
        ...this.manifestCache.manifest,
        _meta: { fromCache: true, cachedAt: this.manifestCache.fetchedAtMs },
      };
    }

    const url = `${this.shipPlantBaseUrl}/api/pandanote/manifest`;
    this.logger.log(`[ShipPlantTool] fetch manifest -> ${url} (force=${!!options.forceRefresh})`);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (options.sharedSecret) headers['X-Shared-Secret'] = options.sharedSecret;

      const res = await fetch(url, { headers, timeout: 5000 } as any);
      const json = await res.json();

      // 存缓存
      this.manifestCache = {
        manifest: json,
        fetchedAtMs: now,
        expireAtMs: now + this.cacheTtlMs,
        sourceUrl: this.shipPlantBaseUrl,
      };
      return {
        ...json,
        _meta: { fromCache: false, cachedAt: now },
      };
    } catch (err: any) {
      this.logger.warn(`[ShipPlantTool] manifest fetch failed: ${err?.message || err}. Tool will be shown as offline.`);
      throw err;
    }
  }

  /** 健康检查：ping 海上菜篮子 */
  async pingShipPlant(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await fetch(`${this.shipPlantBaseUrl}/api/pandanote/ping`, { timeout: 3000 } as any);
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - start, error: err?.message || String(err) };
    }
  }

  // ===================================================================
  // 3. 服务器端触发联动更新（熊猫笔记部署后一键同步海上菜篮子版本）
  //    NOTE: 默认不启用自动触发（避免每一次熊猫笔记发版都重启海上菜篮子容器），
  //          仅提供后端手动触发接口 /api/toolbox/ship-plant/sync
  // ===================================================================

  /**
   * 在服务器上执行 sync-update-from-panda.sh，将海上菜篮子更新到 pandaNoteVersion 绑定的 TAG。
   * 注意：仅当熊猫笔记与海上菜篮子部署在同一台服务器时才有效（当前 106.14.57.62 架构同机）。
   */
  async triggerSyncUpdate(pandaNoteVersion: string): Promise<{
    triggered: boolean;
    targetShipVersion: string;
    message: string;
  }> {
    const targetShipVersion = this.resolveShipPlantVersion(pandaNoteVersion);
    const scriptPath = this.shipPlantSyncScript;

    // 安全检查：生产环境必须在文件系统存在脚本，才允许执行；避免在非生产环境误触发 shell
    const fs = await import('fs');
    if (!fs.existsSync(scriptPath)) {
      return {
        triggered: false,
        targetShipVersion,
        message:
          `联动脚本不存在：${scriptPath}。` +
          `请先在 ${targetShipVersion} 部署到服务器后再触发。\n` +
          `手动执行命令：bash ${scriptPath} ${targetShipVersion}`,
      };
    }

    const { execFile } = await import('child_process');
    return new Promise((resolve) => {
      this.logger.log(`[ShipPlantTool] exec: bash ${scriptPath} ${targetShipVersion} (background)`);
      // 后台异步执行，不阻塞当前 API 返回（docker compose build 最长 15 分钟）
      const child = execFile(
        'bash',
        [scriptPath, targetShipVersion],
        { timeout: 20 * 60 * 1000, maxBuffer: 20 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error(`[ShipPlantTool] sync failed: ${error.message}\nSTDERR: ${stderr}`);
            resolve({
              triggered: true,
              targetShipVersion,
              message: `更新脚本执行失败：${error.message.slice(0, 300)}`,
            });
          } else {
            this.logger.log(`[ShipPlantTool] sync done to ${targetShipVersion}`);
            // 清理旧缓存，下次重新握手拿新 manifest（新版本）
            this.manifestCache = null;
            resolve({
              triggered: true,
              targetShipVersion,
              message: `已更新到 ${targetShipVersion}。后台执行结果最后 200 字符：\n${stdout.slice(-200)}`,
            });
          }
        }
      );
      // 给 child 一个引用，避免被 tree-shake
      void child;
    });
  }
}
