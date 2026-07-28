import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { MigrationTrackerService } from '../prisma/migration-tracker.service';

export interface VersionInfo {
  version: string;
  buildTime: string;
  environment: string;
  nodeVersion: string;
  gitCommitHash: string | null;
  migrationStatus: {
    connected: boolean;
    totalMigrations: number;
    lastMigrationName: string | null;
    lastMigrationDate: string | null;
    status: 'connected' | 'disconnected' | 'error';
  } | null;
}

export interface VersionCheckResult {
  currentVersion: string;
  clientVersion: string;
  needsUpdate: boolean;
  updateType: 'required' | 'recommended' | 'optional' | 'none';
  updateMessage: string;
}

export interface SchemaVersionInfo {
  version: string;
  buildTime: string;
  breakingChanges: string[];
  deprecatedFields: Record<string, string[]>;
  requiredFields: Record<string, string[]>;
  fieldMappings: Record<string, Record<string, string>>;
}

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);
  private versionInfo: VersionInfo | null = null;

  constructor(private migrationTracker: MigrationTrackerService) {}

  /**
   * 初始化版本信息
   * 版本号单一真相源：package.json
   * version.json 仅存储 buildTime/environment 等构建元数据，不再作为版本号来源
   */
  async init(): Promise<VersionInfo> {
    const packageJson = this.loadPackageJson();
    const versionJson = this.loadVersionJson();

    // 版本号始终从 package.json 获取（单一真相源）
    const version = packageJson?.version || '0.0.0';

    this.versionInfo = {
      version,
      buildTime: versionJson?.buildTime || new Date().toISOString(),
      environment: versionJson?.environment || process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      gitCommitHash: await this.getGitCommitHash(),
      migrationStatus: null,
    };

    // 如果 version.json 中的版本号与 package.json 不一致，自动修复
    if (versionJson?.version && versionJson.version !== version) {
      this.logger.warn(`version.json 版本号(${versionJson.version})与 package.json(${version})不一致，以 package.json 为准`);
      this.syncVersionJson(version);
    }

    try {
      this.versionInfo.migrationStatus = await this.migrationTracker.getMigrationStatus();
    } catch (error) {
      this.logger.warn('获取数据库迁移状态失败:', error.message);
    }

    this.logger.log(`版本信息已加载: v${this.versionInfo.version} (${this.versionInfo.environment})`);
    return this.versionInfo;
  }

  /**
   * 获取版本信息
   */
  async getVersion(): Promise<VersionInfo> {
    if (!this.versionInfo) {
      return this.init();
    }
    // 每次刷新迁移状态
    try {
      this.versionInfo.migrationStatus = await this.migrationTracker.getMigrationStatus();
    } catch (error) {
      // 忽略错误
    }
    return this.versionInfo;
  }

  /**
   * 检查客户端版本是否需要更新
   */
  async checkVersion(clientVersion: string): Promise<VersionCheckResult> {
    const versionInfo = await this.getVersion();
    const serverVersion = versionInfo.version;

    const comparison = this.compareSemver(clientVersion, serverVersion);

    let updateType: 'required' | 'recommended' | 'optional' | 'none' = 'none';
    let needsUpdate = false;
    let updateMessage = '';

    if (comparison.major) {
      updateType = 'required';
      needsUpdate = true;
      updateMessage = `检测到重大版本更新，请升级到最新版本 v${serverVersion}`;
    } else if (comparison.minor) {
      updateType = 'recommended';
      needsUpdate = true;
      updateMessage = `建议更新到新版本 v${serverVersion}`;
    } else if (comparison.patch) {
      updateType = 'optional';
      needsUpdate = true;
      updateMessage = `可选更新 v${serverVersion} 已发布`;
    } else {
      updateMessage = '当前已是最新版本';
    }

    return {
      currentVersion: serverVersion,
      clientVersion,
      needsUpdate,
      updateType,
      updateMessage,
    };
  }

  /**
   * 比较两个语义化版本号
   * 支持 4 段式版本号: major.minor.patch.build
   * 例如: 1.1.0.0008
   * 
   * ⚠️ 关键逻辑：只有在 服务器版本 > 客户端版本 时才返回需要更新
   *    如果客户端版本 >= 服务器版本，绝不提示"从高版本升级到低版本"
   * 
   * 安全保证：任何解析失败的情况都返回不更新（安全降级）
   * 
   * @returns { major: boolean, minor: boolean, patch: boolean, build: boolean }
   */
  private compareSemver(clientVersion: string, serverVersion: string): { major: boolean; minor: boolean; patch: boolean; build: boolean } {
    const NO_UPDATE = { major: false, minor: false, patch: false, build: false };

    // 参数有效性校验
    if (!clientVersion || !serverVersion || typeof clientVersion !== 'string' || typeof serverVersion !== 'string') {
      this.logger.warn(`[compareSemver] 版本号参数无效: client=${clientVersion}, server=${serverVersion}`);
      return NO_UPDATE;
    }

    // 去除可能的 v 前缀和空白
    const cleanClient = clientVersion.replace(/^v/, '').trim();
    const cleanServer = serverVersion.replace(/^v/, '').trim();

    // 严格按点号分段解析，过滤非数字段，不足 4 段补 0
    const parseParts = (s: string): number[] => {
      return s.split('.')
        .map(p => parseInt(p.trim(), 10))
        .map(n => isNaN(n) ? 0 : n);
    };

    const clientParts = parseParts(cleanClient);
    const serverParts = parseParts(cleanServer);

    // 补齐 4 段
    const p = (arr: number[], idx: number) => (arr[idx] !== undefined ? arr[idx] : 0);
    const cMajor = p(clientParts, 0), cMinor = p(clientParts, 1), cPatch = p(clientParts, 2), cBuild = p(clientParts, 3);
    const sMajor = p(serverParts, 0), sMinor = p(serverParts, 1), sPatch = p(serverParts, 2), sBuild = p(serverParts, 3);

    // 按优先级判断：只有服务器版本严格大于客户端版本才标记为需要更新
    if (sMajor > cMajor) return { major: true, minor: false, patch: false, build: false };
    if (sMajor < cMajor) return NO_UPDATE;

    if (sMinor > cMinor) return { major: false, minor: true, patch: false, build: false };
    if (sMinor < cMinor) return NO_UPDATE;

    if (sPatch > cPatch) return { major: false, minor: false, patch: true, build: false };
    if (sPatch < cPatch) return NO_UPDATE;

    if (sBuild > cBuild) return { major: false, minor: false, patch: false, build: true };

    return NO_UPDATE;
  }

  /**
   * 获取Schema版本信息（用于离线数据兼容性检查）
   */
  async getSchemaVersion(): Promise<SchemaVersionInfo> {
    const versionInfo = await this.getVersion();
    
    return {
      version: versionInfo.version,
      buildTime: versionInfo.buildTime,
      breakingChanges: [],
      deprecatedFields: {},
      requiredFields: {
        schedules: ['title', 'startTime', 'teamCode'],
        ships: ['name', 'imo', 'teamCode'],
        diaries: ['shipId', 'date', 'content'],
      },
      fieldMappings: {},
    };
  }

  /**
   * 自动修复 version.json，使其版本号与 package.json 一致
   */
  private syncVersionJson(correctVersion: string): void {
    try {
      const possiblePaths = [
        path.join(__dirname, '..', '..', 'version.json'),
        path.join(__dirname, '..', 'version.json'),
        path.join(__dirname, '..', '..', '..', 'version.json'),
      ];
      for (const versionPath of possiblePaths) {
        if (fs.existsSync(versionPath)) {
          const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
          data.version = correctVersion;
          data.buildTime = new Date().toISOString();
          fs.writeFileSync(versionPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
          this.logger.log(`version.json 已自动修复: ${versionPath} -> ${correctVersion}`);
          return;
        }
      }
    } catch (error) {
      this.logger.warn('自动修复 version.json 失败:', error.message);
    }
  }

  /**
   * 从 package.json 读取版本信息
   */
  private loadPackageJson(): { version: string } | null {
    try {
      // __dirname in compiled service: /www/.../backend/dist/version/
      // We need: /www/.../backend/package.json
      // Try multiple paths: ../../ (dist/version -> backend) and ../../.. (dist/version -> nav-log-system)
      const possiblePaths = [
        path.join(__dirname, '..', '..', 'package.json'),              // backend/dist/version -> backend/package.json
        path.join(__dirname, '..', '..', '..', 'package.json'),        // nav-log-system/package.json (fallback)
      ];

      this.logger.debug(`Searching for package.json in: ${JSON.stringify(possiblePaths)}`);

      for (const packagePath of possiblePaths) {
        this.logger.debug(`Checking: ${packagePath}, exists: ${fs.existsSync(packagePath)}`);
        if (fs.existsSync(packagePath)) {
          const content = fs.readFileSync(packagePath, 'utf-8');
          const parsed = JSON.parse(content);
          this.logger.log(`Successfully loaded package.json from: ${packagePath}, version: ${parsed.version}`);
          return parsed;
        }
      }

      this.logger.warn('package.json not found in any of the searched paths');
      return null;
    } catch (error) {
      this.logger.warn('无法读取 package.json:', error.message);
      return null;
    }
  }

  /**
   * 从 version.json 读取构建信息
   */
  private loadVersionJson(): { version?: string; buildTime?: string; environment?: string } | null {
    try {
      // __dirname in compiled service: /www/wwwroot/nav-log-system/backend/dist/version
      // We need: /www/wwwroot/nav-log-system/backend/version.json
      
      const possiblePaths = [
        path.join(__dirname, '..', '..', 'version.json'),              // backend/dist/version -> backend/version.json
        path.join(__dirname, '..', 'version.json'),                    // backend/dist -> backend/version.json
        path.join(__dirname, '..', '..', '..', 'version.json'),        // nav-log-system/version.json
      ];

      this.logger.debug(`Searching for version.json in: ${JSON.stringify(possiblePaths)}`);

      for (const versionPath of possiblePaths) {
        this.logger.debug(`Checking: ${versionPath}, exists: ${fs.existsSync(versionPath)}`);
        if (fs.existsSync(versionPath)) {
          const content = fs.readFileSync(versionPath, 'utf-8');
          const parsed = JSON.parse(content);
          this.logger.log(`Successfully loaded version.json from: ${versionPath}, version: ${parsed.version}`);
          return parsed;
        }
      }
      
      this.logger.warn('version.json not found in any of the searched paths');
      return null;
    } catch (error) {
      this.logger.warn('无法读取 version.json:', error.message);
      return null;
    }
  }

  /**
   * 获取 Git commit hash
   */
  private async getGitCommitHash(): Promise<string | null> {
    try {
      // 方法1: 从 .git/HEAD 读取
      const gitHeadPath = path.join(process.cwd(), '..', '.git', 'HEAD');
      if (fs.existsSync(gitHeadPath)) {
        const headContent = fs.readFileSync(gitHeadPath, 'utf-8').trim();
        
        // 如果 HEAD 指向一个引用（如 ref: refs/heads/main）
        if (headContent.startsWith('ref:')) {
          const refPath = headContent.replace('ref: ', '');
          const fullPath = path.join(process.cwd(), '..', '.git', refPath);
          if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, 'utf-8').trim().substring(0, 8);
          }
        } else {
          // 直接是 commit hash（detached HEAD 状态）
          return headContent.substring(0, 8);
        }
      }

      // 方法2: 尝试执行 git 命令
      const { execSync } = await import('child_process');
      const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      return hash || null;
    } catch {
      return null;
    }
  }
}
