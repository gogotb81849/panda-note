import { Module } from '@nestjs/common';
import { PartyConfigService } from './party-config.service';
import { PartyConfigController } from './party-config.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PartyConfigController],
  providers: [PartyConfigService],
  exports: [PartyConfigService],
})
export class PartyConfigModule {}