import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserGuideService } from './user-guide.service';
import { User } from '../auth/user.decorator';
import { UserPayload } from '../auth/user.decorator';

@Controller('user-guide')
@UseGuards(JwtAuthGuard)
export class UserGuideController {
  constructor(private userGuideService: UserGuideService) {}

  @Get('status')
  async getStatus(@User() user: UserPayload) {
    return this.userGuideService.getGuideState(user.teamCode, user.id);
  }

  @Post('update')
  async updateStep(@User() user: UserPayload, @Body() body: { step: string }) {
    return this.userGuideService.updateGuideStep(user.teamCode, user.id, body.step);
  }

  @Post('complete')
  async completeGuide(@User() user: UserPayload, @Body() body: { completedSteps: number[] }) {
    return this.userGuideService.completeGuide(user.teamCode, user.id, body.completedSteps);
  }

  @Post('skip')
  async skipGuide(@User() user: UserPayload) {
    return this.userGuideService.skipGuide(user.teamCode, user.id);
  }

  @Post('reset')
  async resetGuide(@User() user: UserPayload) {
    return this.userGuideService.resetGuide(user.teamCode, user.id);
  }
}
