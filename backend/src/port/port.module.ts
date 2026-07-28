import { Module } from '@nestjs/common';
import { PortService } from './port.service';
import { PortController } from './port.controller';

@Module({
  controllers: [PortController],
  providers: [PortService],
  exports: [PortService],
})
export class PortModule {}
