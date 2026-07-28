import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { MigrationService } from './migration.service';

@Controller('migration')
export class MigrationController {
  private readonly logger = new Logger(MigrationController.name);

  constructor(private readonly migrationService: MigrationService) {}

  /**
   * 预览迁移数据（不执行实际迁移）
   */
  @Get('preview')
  async previewMigration(@Query('teamCode') teamCode: string) {
    try {
      const result = await this.migrationService.previewMigration(teamCode);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error('预览迁移失败', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 执行迁移
   */
  @Post('execute')
  async executeMigration(@Body('teamCode') teamCode: string) {
    try {
      const result = await this.migrationService.executeMigration(teamCode);
      return {
        success: true,
        data: result,
        message: `迁移完成：成功匹配 ${result.matchedDiaries} 条日记，新建 ${result.newRelations} 条关联`,
      };
    } catch (error: any) {
      this.logger.error('执行迁移失败', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
