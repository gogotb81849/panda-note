import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VersionHistoryService, CreateVersionDto } from './version-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserPayload } from '../auth/user.decorator';

@Controller('version-history')
@UseGuards(JwtAuthGuard)
export class VersionHistoryController {
  constructor(private readonly versionHistoryService: VersionHistoryService) {}

  /**
   * 创建版本记录
   * POST /api/version-history
   */
  @Post()
  async createVersion(@Body() dto: CreateVersionDto, @Request() req: { user: UserPayload }) {
    const { id, realName } = req.user;
    return this.versionHistoryService.createVersion({
      ...dto,
      userId: id,
      userName: dto.userName || realName,
    });
  }

  /**
   * 获取实体的所有版本
   * GET /api/version-history/:entityType/:entityId
   */
  @Get(':entityType/:entityId')
  async getVersions(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Request() req: { user: UserPayload },
  ) {
    return this.versionHistoryService.getVersions(req.user.teamCode, entityType, +entityId);
  }

  /**
   * 获取指定版本
   * GET /api/version-history/:entityType/:entityId/:version
   */
  @Get(':entityType/:entityId/:version')
  async getVersion(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('version') version: string,
    @Request() req: { user: UserPayload },
  ) {
    return this.versionHistoryService.getVersion(req.user.teamCode, entityType, +entityId, +version);
  }

  /**
   * 恢复到指定版本
   * POST /api/version-history/:entityType/:entityId/:version/restore
   */
  @Post(':entityType/:entityId/:version/restore')
  async restoreVersion(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('version') version: string,
    @Request() req: { user: UserPayload },
  ) {
    const { id, realName } = req.user;
    return this.versionHistoryService.restoreVersion(
      req.user.teamCode,
      entityType,
      +entityId,
      +version,
      id,
      realName,
    );
  }

  /**
   * 比较两个版本的差异
   * GET /api/version-history/:entityType/:entityId/diff?versionA=1&versionB=2
   */
  @Get(':entityType/:entityId/diff')
  async diffVersions(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('versionA') versionA: string,
    @Query('versionB') versionB: string,
    @Request() req: { user: UserPayload },
  ) {
    return this.versionHistoryService.diffVersions(
      req.user.teamCode,
      entityType,
      +entityId,
      +versionA,
      +versionB,
    );
  }
}
