import { Controller, Post, Delete, UseGuards, Request } from '@nestjs/common';
import { MockDataService } from './mock-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mock-data')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MockDataController {
  constructor(private readonly service: MockDataService) {}

  @Post('generate')
  @Roles(UserRole.admin)
  async generateMockData() {
    return this.service.generateMockData();
  }

  @Delete('clear')
  @Roles(UserRole.admin)
  async clearMockData() {
    return this.service.clearMockData();
  }
}
