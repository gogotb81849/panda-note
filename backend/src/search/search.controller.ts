import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTeam } from '../auth/user.decorator';
import { TeamCode } from '@prisma/client';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 统一全文搜索
   * GET /api/search?q=keyword
   */
  @Get()
  async search(
    @Query('q') q: string,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.searchService.searchAll(teamCode, q);
  }
}