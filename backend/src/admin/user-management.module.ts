import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserManagementService } from './user-management.service';
import { UserManagementController } from './user-management.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UserManagementController],
  providers: [UserManagementService],
  exports: [UserManagementService],
})
export class UserManagementModule {}
