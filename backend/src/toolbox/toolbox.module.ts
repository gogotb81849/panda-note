import { Module } from '@nestjs/common';
import { ToolboxController } from './toolbox.controller';
import { ToolboxService } from './toolbox.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ToolboxController],
  providers: [ToolboxService],
  exports: [ToolboxService],
})
export class ToolboxModule {}
