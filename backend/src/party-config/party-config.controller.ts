import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PartyConfigService } from './party-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('party-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartyConfigController {
  constructor(private readonly partyConfigService: PartyConfigService) {}

  @Get('ships')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor)
  async listAllShips(@Request() req) {
    return this.partyConfigService.getAllShipsConfig(req.user.teamCode);
  }

  @Get('ship/:shipId')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor)
  async getShipConfig(@Param('shipId', ParseIntPipe) shipId: number, @Request() req) {
    return this.partyConfigService.getShipSpecificConfig(
      req.user.teamCode,
      shipId,
    );
  }

  @Put('ship/:shipId')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor)
  async updateShipConfig(
    @Param('shipId', ParseIntPipe) shipId: number,
    @Body() config: any,
    @Request() req,
  ) {
    return this.partyConfigService.updateShipSpecificConfig(
      req.user.teamCode,
      shipId,
      config,
      req.user.id,
    );
  }
}