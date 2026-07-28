import { Module } from '@nestjs/common';
import { RoleMenuConfigController } from './role-menu-config.controller';
import { RoleMenuConfigService } from './role-menu-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoleMenuConfigController],
  providers: [RoleMenuConfigService],
  exports: [RoleMenuConfigService],
})
export class RoleMenuConfigModule {}