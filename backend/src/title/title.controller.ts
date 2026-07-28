import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TitleService } from './title.service';
import { UserPayload, User } from '../auth/user.decorator';
import { UserRole } from '@prisma/client';

@Controller('title')
@UseGuards(JwtAuthGuard)
export class TitleController {
  constructor(private titleService: TitleService) {}

  @Get()
  async getTitles(@User() user: UserPayload, @Query('role') role?: string) {
    const roleToUse = (role || user.role) as UserRole;
    return this.titleService.getUserTitles(user.teamCode, roleToUse);
  }

  @Get('categories')
  async getCategories(@User() user: UserPayload, @Query('role') role?: string) {
    const roleToUse = (role || user.role) as UserRole;
    return this.titleService.getCategoryFirstList(user.teamCode, roleToUse);
  }

  @Post()
  async createTitle(@User() user: UserPayload, @Body() body: {
    categoryFirst: string;
    categorySecond: string;
    description?: string;
    sortOrder?: number;
  }) {
    return this.titleService.createTitle(user.teamCode, user.id, user.role, body);
  }

  @Put(':id')
  async updateTitle(@Param('id') id: string, @User() user: UserPayload, @Body() body: {
    categoryFirst?: string;
    categorySecond?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    role?: UserRole;
  }) {
    return this.titleService.updateTitle(Number(id), user.teamCode, user.id, body);
  }

  @Delete(':id')
  async deleteTitle(@Param('id') id: string, @User() user: UserPayload) {
    return this.titleService.deleteTitle(Number(id), user.teamCode);
  }

  @Post('sort')
  async updateSort(@User() user: UserPayload, @Body() body: { updates: { id: number; sortOrder: number }[] }) {
    return this.titleService.updateSort(user.teamCode, body.updates);
  }

  @Post('usage')
  async recordUsage(@User() user: UserPayload, @Body() body: {
    diaryId: number;
    categoryFirst: string;
    categorySecond: string;
    isAISuggested?: boolean;
    userAccepted?: boolean;
  }) {
    return this.titleService.recordTitleUsage(user.teamCode, body.diaryId, user.id, {
      categoryFirst: body.categoryFirst,
      categorySecond: body.categorySecond,
      isAISuggested: body.isAISuggested,
      userAccepted: body.userAccepted,
    });
  }

  @Post('init')
  async initSystemTitles(@User() user: UserPayload) {
    await this.titleService.initSystemTitles(user.teamCode);
    return { message: '系统标题已初始化' };
  }

  @Post('move')
  async moveTitle(@User() user: UserPayload, @Body() body: {
    id: number;
    categoryFirst: string;
    role?: string;
  }) {
    return this.titleService.moveTitle(Number(body.id), user.teamCode, {
      categoryFirst: body.categoryFirst,
      role: body.role as UserRole,
    });
  }

  @Post('copy')
  async copyTitle(@User() user: UserPayload, @Body() body: {
    id: number;
    categoryFirst?: string;
    role?: string;
  }) {
    return this.titleService.copyTitle(Number(body.id), user.teamCode, user.id, {
      categoryFirst: body.categoryFirst,
      role: body.role as UserRole,
    });
  }
}
