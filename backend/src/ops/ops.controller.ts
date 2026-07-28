import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Controller('ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.company_admin, UserRole.general_manager)
export class OpsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const result: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
      services: {
        backend: {
          port: process.env.PORT || 3002,
          status: 'running',
        },
        database: {
          status: 'unknown',
          latency: null as number | null,
          error: null as string | null,
        },
      },
    };

    // 检查数据库连接
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - dbStart;
      result.services.database.status = 'connected';
      result.services.database.latency = latency;
    } catch (err: any) {
      result.services.database.status = 'disconnected';
      result.services.database.error = err.message;
      result.status = 'error';
    }

    return result;
  }

  @Get('status')
  async status() {
    const mem = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const cpus = os.cpus();

    let dbStats = {};
    try {
      const counts = await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.diary.count(),
        this.prisma.task.count(),
        this.prisma.sharedFile.count(),
        this.prisma.experience.count(),
        this.prisma.partyActivity.count(),
        this.prisma.thoughtReport.count(),
        this.prisma.integrityRecord.count(),
      ]);
      dbStats = {
        users: counts[0],
        diaries: counts[1],
        tasks: counts[2],
        files: counts[3],
        experiences: counts[4],
        partyActivities: counts[5],
        thoughtReports: counts[6],
        integrityRecords: counts[7],
      };
    } catch {
      dbStats = { error: 'Database unavailable' };
    }

    // 获取磁盘使用情况
    let diskInfo = {};
    try {
      const stats = fs.statfsSync(process.cwd());
      const totalSpace = stats.bsize * stats.blocks;
      const freeSpace = stats.bsize * stats.bfree;
      const usedSpace = totalSpace - freeSpace;
      diskInfo = {
        total: this.formatBytes(totalSpace),
        used: this.formatBytes(usedSpace),
        free: this.formatBytes(freeSpace),
        usagePercent: ((usedSpace / totalSpace) * 100).toFixed(1) + '%',
      };
    } catch {
      diskInfo = { error: '无法获取磁盘信息' };
    }

    // 获取版本信息
    const versionInfo = this.getVersionInfo();

    return {
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        uptimeHuman: this.formatUptime(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rss: this.formatBytes(mem.rss),
        heapUsed: this.formatBytes(mem.heapUsed),
        heapTotal: this.formatBytes(mem.heapTotal),
        external: this.formatBytes(mem.external),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        cores: cpus.length,
        model: cpus[0]?.model || '未知',
      },
      disk: diskInfo,
      database: dbStats,
      versions: versionInfo,
    };
  }

  /**
   * 获取前后端版本信息
   */
  @Get('versions')
  async getVersions() {
    return this.getVersionInfo();
  }

  /**
   * 同步版本号（更新前端和后端版本）
   */
  @Post('sync-version')
  async syncVersion(
    @Body() body: { backendVersion?: string; frontendVersion?: string; buildTime?: string },
  ) {
    const versionJsonPath = path.join(process.cwd(), 'version.json');
    const currentVersion = this.loadJson(versionJsonPath) || {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    // 更新版本号
    if (body.backendVersion) {
      currentVersion.version = body.backendVersion;
    }
    if (body.frontendVersion) {
      currentVersion.frontendVersion = body.frontendVersion;
    }
    currentVersion.buildTime = body.buildTime || new Date().toISOString();

    // 写入 version.json
    fs.writeFileSync(versionJsonPath, JSON.stringify(currentVersion, null, 2), 'utf8');

    // 同时更新后端 package.json 版本
    if (body.backendVersion) {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = this.loadJson(pkgPath);
      if (pkg) {
        pkg.version = body.backendVersion;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
      }
    }

    // 记录日志
    const logDir = path.join(process.cwd(), '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'ops.log');
    const timestamp = new Date().toISOString();
    const entry = `\n--- ${timestamp} ---\n[版本同步] 后端: ${body.backendVersion || '未变'} | 前端: ${body.frontendVersion || '未变'}\n`;
    fs.appendFileSync(logFile, entry, 'utf8');

    return {
      message: '版本同步成功',
      versions: this.getVersionInfo(),
    };
  }

  @Post('restart')
  async restartService(@Body('service') service: 'frontend' | 'backend') {
    const logDir = path.join(process.cwd(), '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'ops.log');
    const timestamp = new Date().toISOString();
    const entry = `\n--- ${timestamp} ---\n[重启请求] 服务: ${service}\n`;
    fs.appendFileSync(logFile, entry, 'utf8');

    // 注意：由于安全考虑，这里不直接执行重启命令
    // 实际生产环境中应该使用 PM2、systemd 或其他进程管理器
    // 这里返回提示信息
    return {
      message: `${service} 服务重启请求已记录`,
      timestamp,
      note: '请通过宝塔面板或服务器管理工具执行重启操作',
    };
  }

  @Post('save-log')
  async saveLog(@Body('content') content: string) {
    const logDir = path.join(process.cwd(), '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'ops.log');
    const timestamp = new Date().toISOString();
    const entry = `\n--- ${timestamp} ---\n${content}\n`;
    fs.appendFileSync(logFile, entry, 'utf8');
    return { message: '日志已保存', file: logFile };
  }

  @Get('logs')
  async getLogs() {
    const logFile = path.join(process.cwd(), '..', 'logs', 'ops.log');
    if (!fs.existsSync(logFile)) {
      return { content: '' };
    }
    const content = fs.readFileSync(logFile, 'utf8');
    // 只返回最后 100 行
    const lines = content.split('\n');
    const recent = lines.slice(-100).join('\n');
    return { content: recent, totalLines: lines.length };
  }

  /**
   * 获取版本信息
   */
  private getVersionInfo() {
    const versionJsonPath = path.join(process.cwd(), 'version.json');
    const pkgPath = path.join(process.cwd(), 'package.json');
    const frontendPkgPath = path.join(process.cwd(), '..', 'frontend', 'package.json');

    const versionJson = this.loadJson(versionJsonPath);
    const backendPkg = this.loadJson(pkgPath);
    const frontendPkg = this.loadJson(frontendPkgPath);

    return {
      backend: {
        version: backendPkg?.version || '1.0.0',
        name: backendPkg?.name || 'nav-log-backend',
      },
      frontend: {
        version: frontendPkg?.version || '1.0.0',
        name: frontendPkg?.name || 'nav-log-frontend',
      },
      buildTime: versionJson?.buildTime || '-',
      environment: versionJson?.environment || process.env.NODE_ENV || 'development',
    };
  }

  /**
   * 安全加载 JSON 文件
   */
  private loadJson(filePath: string): any {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}小时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
