import { Controller, Get, Post, Body } from '@nestjs/common';
import { VersionService, VersionInfo, VersionCheckResult, SchemaVersionInfo } from './version.service';
import { FrontendHashService } from './frontend-hash.service';

@Controller('version')
export class VersionController {
  constructor(
    private readonly versionService: VersionService,
    private readonly frontendHashService: FrontendHashService,
  ) {}

  /**
   * 返回当前后端版本号（简洁版）
   * GET /api/version
   */
  @Get()
  async getVersion(): Promise<{ version: string; buildTime: string }> {
    const info = await this.versionService.getVersion();
    return { version: info.version, buildTime: info.buildTime };
  }

  /**
   * 获取当前服务器版本信息
   */
  @Get('info')
  async getVersionInfo(): Promise<VersionInfo> {
    return this.versionService.getVersion();
  }

  /**
   * 客户端检查版本是否需要更新
   */
  @Post('check')
  async checkVersion(@Body('clientVersion') clientVersion: string): Promise<VersionCheckResult> {
    if (!clientVersion) {
      return {
        currentVersion: 'unknown',
        clientVersion: '',
        needsUpdate: false,
        updateType: 'none',
        updateMessage: '未提供客户端版本号',
      };
    }
    return this.versionService.checkVersion(clientVersion);
  }

  /**
   * 获取前端资源哈希（用于检测内容更新，无需修改版本号）
   */
  @Get('hash')
  async getFrontendHash(): Promise<{ hash: string; timestamp: number; version: string }> {
    const hashInfo = this.frontendHashService.getFrontendHash();
    const versionInfo = await this.versionService.getVersion();
    return {
      hash: hashInfo.hash,
      timestamp: hashInfo.timestamp,
      version: versionInfo.version,
    };
  }

  /**
   * 获取Schema版本信息（用于离线数据兼容性检查）
   */
  @Get('schema')
  async getSchemaVersion(): Promise<SchemaVersionInfo> {
    return this.versionService.getSchemaVersion();
  }

  /**
   * 检查前端资源是否有更新（基于内容哈希）
   */
  @Post('check-hash')
  async checkHash(@Body('clientHash') clientHash: string): Promise<{
    hasUpdate: boolean;
    serverHash: string;
    serverVersion: string;
    message: string;
  }> {
    const hashInfo = this.frontendHashService.getFrontendHash();
    const versionInfo = await this.versionService.getVersion();

    const hasUpdate = clientHash !== hashInfo.hash && hashInfo.hash !== 'unknown' && hashInfo.hash !== 'error';

    return {
      hasUpdate,
      serverHash: hashInfo.hash,
      serverVersion: versionInfo.version,
      message: hasUpdate 
        ? '检测到前端资源更新，请刷新页面' 
        : '前端资源已是最新',
    };
  }
}
