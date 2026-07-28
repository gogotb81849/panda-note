import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MigrationTrackerService implements OnModuleInit {
  private readonly logger = new Logger(MigrationTrackerService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.recordStartupStatus();
  }

  /**
   * 记录当前数据库迁移状态
   */
  async recordStartupStatus(): Promise<void> {
    try {
      const migrations = await this.prisma.$queryRaw<Array<{ id: string; migration_name: string; finished_at: Date }>>`
        SELECT id, migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at ASC
      `;

      const status = {
        totalMigrations: migrations.length,
        lastMigration: migrations.length > 0 ? migrations[migrations.length - 1] : null,
        recordedAt: new Date().toISOString(),
      };

      this.logger.log(`数据库迁移状态: ${status.totalMigrations} 个迁移已执行`);
      if (status.lastMigration) {
        this.logger.log(`最新迁移: ${status.lastMigration.migration_name} (${status.lastMigration.finished_at.toISOString()})`);
      }
    } catch (error) {
      this.logger.warn('无法获取数据库迁移状态:', error.message);
    }
  }

  /**
   * 获取迁移状态信息
   */
  async getMigrationStatus(): Promise<{
    connected: boolean;
    totalMigrations: number;
    lastMigrationName: string | null;
    lastMigrationDate: string | null;
    status: 'connected' | 'disconnected' | 'error';
  }> {
    try {
      const migrations = await this.prisma.$queryRaw<Array<{ id: string; migration_name: string; finished_at: Date }>>`
        SELECT id, migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC 
        LIMIT 1
      `;

      const totalMigrationsResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM _prisma_migrations
      `;

      const totalMigrations = Number(totalMigrationsResult[0]?.count || 0);
      const lastMigration = migrations[0] || null;

      return {
        connected: true,
        totalMigrations,
        lastMigrationName: lastMigration?.migration_name || null,
        lastMigrationDate: lastMigration?.finished_at?.toISOString() || null,
        status: 'connected',
      };
    } catch (error) {
      this.logger.error('获取数据库迁移状态失败:', error.message);
      return {
        connected: false,
        totalMigrations: 0,
        lastMigrationName: null,
        lastMigrationDate: null,
        status: 'error',
      };
    }
  }
}
