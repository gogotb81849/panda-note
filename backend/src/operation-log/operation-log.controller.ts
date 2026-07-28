import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperationLogService } from './operation-log.service';

@Controller('operation-log')
export class OperationLogController {
  constructor(private operationLogService: OperationLogService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.operationLogService.findAll(
      req.user.teamCode,
      page ? +page : 1,
      pageSize ? +pageSize : 20,
    );
  }
}
