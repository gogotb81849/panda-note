import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AICategorizationService } from './ai-categorization.service';
import { User } from '../auth/user.decorator';
import { UserPayload } from '../auth/user.decorator';
import { UserRole } from '@prisma/client';

@Controller('ai-categorization')
@UseGuards(JwtAuthGuard)
export class AICategorizationController {
  constructor(private aiService: AICategorizationService) {}

  @Post('suggest')
  async suggestCategory(
    @User() user: UserPayload,
    @Body() body: { content: string; role?: string },
  ) {
    const role = (body.role || user.role) as UserRole;
    return this.aiService.suggestCategory(user.teamCode, role, body.content);
  }

  // AI为经验分享推荐分类和标签
  @Post('suggest-experience')
  async suggestExperienceCategory(
    @User() user: UserPayload,
    @Body() body: { title: string; content: string },
  ) {
    return this.aiService.suggestExperienceCategory(user.teamCode, body.title, body.content);
  }
}
