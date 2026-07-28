import { Module } from '@nestjs/common';
import { ShipReportParseService } from './ship-report-parse.service';

@Module({
  providers: [ShipReportParseService],
  exports: [ShipReportParseService],
})
export class ShipReportParseModule {}
