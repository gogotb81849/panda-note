import { Module } from '@nestjs/common';
import { ToolboxController } from './toolbox.controller';
import { ToolboxService } from './toolbox.service';
import { ShipPlantSimpleEngineService } from './ship-plant-simple-engine.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ToolboxController],
  providers: [ToolboxService, ShipPlantSimpleEngineService],
  exports: [ToolboxService, ShipPlantSimpleEngineService],
})
export class ToolboxModule {}
