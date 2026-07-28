import { Module } from '@nestjs/common';
import { UserGuideController } from './user-guide.controller';
import { UserGuideService } from './user-guide.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserGuideController],
  providers: [UserGuideService],
  exports: [UserGuideService],
})
export class UserGuideModule {}
