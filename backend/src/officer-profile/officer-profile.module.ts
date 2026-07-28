import { Module } from '@nestjs/common';
import { OfficerProfileController } from './officer-profile.controller';
import { OfficerProfileService } from './officer-profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [OfficerProfileController],
  providers: [OfficerProfileService],
  exports: [OfficerProfileService],
})
export class OfficerProfileModule {}
