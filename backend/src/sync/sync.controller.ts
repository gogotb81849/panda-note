import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { VersionService } from '../version/version.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly versionService: VersionService,
  ) {}

  @Post('full-download')
  async fullDownload(@Request() req) {
    const result = await this.syncService.getFullData(
      req.user.id,
      req.user.teamCode,
    );
    const versionInfo = await this.versionService.getVersion();
    const schemaInfo = await this.versionService.getSchemaVersion();
    return {
      success: true,
      data: {
        ...result,
        version: versionInfo.version,
        schemaInfo,
        syncTime: Date.now(),
      },
    };
  }

  @Post('incremental')
  async incrementalSync(@Request() req, @Body() body: { lastSyncTime?: number; stores?: string[] }) {
    const result = await this.syncService.getIncrementalData(
      req.user.id,
      req.user.teamCode,
      body.lastSyncTime || 0,
      body.stores || [],
    );
    return { success: true, data: result };
  }

  @Post('batch-sync')
  async batchSync(@Request() req, @Body() body: { batchSize?: number; items: any[] }) {
    const { batchSize = 50, items } = body;
    const results = [];
    const totalItems = items.length;
    const totalBatches = Math.ceil(totalItems / batchSize);

    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResult = await this.syncService.syncData(
        req.user.id,
        req.user.teamCode,
        batch.reduce((acc, item) => {
          const storeName = item.storeName;
          if (!acc[storeName]) acc[storeName] = [];
          acc[storeName].push(item.data);
          return acc;
        }, {} as any),
      );
      results.push(batchResult);
    }

    const conflicts = results.flatMap(r => r.conflicts || []);
    return {
      success: true,
      data: {
        totalItems,
        totalBatches,
        processedBatches: results.length,
        conflicts,
      },
    };
  }

  @Post()
  async sync(@Request() req, @Body() body: any) {
    const result = await this.syncService.syncData(
      req.user.id,
      req.user.teamCode,
      body
    );
    return { success: true, data: result };
  }

  @Get('server-time')
  getServerTime() {
    return { success: true, data: { serverTime: Date.now() } };
  }

  @Get('stats')
  async getSyncStats(@Request() req) {
    const stats = await this.syncService.getSyncStats(req.user.id, req.user.teamCode);
    return { success: true, data: stats };
  }
}
