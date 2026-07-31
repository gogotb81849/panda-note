import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DiaryBlockService } from './diary-block.service';
import { CreateDiaryBlockDto } from './dto/create-diary-block.dto';
import { UpdateDiaryBlockDto } from './dto/update-diary-block.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTeam, UserId } from '../auth/user.decorator';
import { TeamCode } from '@prisma/client';

@Controller('diary-blocks')
@UseGuards(JwtAuthGuard)
export class DiaryBlockController {
  constructor(private readonly service: DiaryBlockService) {}

  @Get('by-diary/:diaryId')
  findByDiary(
    @Param('diaryId') diaryId: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.findByDiaryId(+diaryId, userId, teamCode);
  }

  @Get('by-ship/:shipId')
  findByShip(
    @Param('shipId') shipId: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.findByShipId(+shipId, userId, teamCode);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.findOne(+id, userId, teamCode);
  }

  @Post()
  create(
    @Body() dto: CreateDiaryBlockDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.create(dto, userId, teamCode);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDiaryBlockDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.update(+id, dto, userId, teamCode);
  }

  @Patch(':id')
  patch(
    @Param('id') id: string,
    @Body() dto: UpdateDiaryBlockDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.update(+id, dto, userId, teamCode);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.remove(+id, userId, teamCode);
  }

  @Post('reorder/:diaryId')
  reorder(
    @Param('diaryId') diaryId: string,
    @Body() body: { orderedIds: number[] },
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.reorder(+diaryId, body.orderedIds, userId, teamCode);
  }

  @Post('retrain')
  retrain(
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
  ) {
    return this.service.retrain(userId, teamCode);
  }
}
