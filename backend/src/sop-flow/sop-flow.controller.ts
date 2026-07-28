import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SopFlowService } from './sop-flow.service';
import { CreateSopFlowDto, UpdateSopFlowDto } from './sop-flow.dto';

@Controller('sop-flow')
export class SopFlowController {
  constructor(private sopFlowService: SopFlowService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.sopFlowService.findAll();
  }

  @Get('type')
  @UseGuards(JwtAuthGuard)
  async findByType(@Query('firstType') firstType?: string, @Query('secondType') secondType?: string) {
    return this.sopFlowService.findByType(firstType, secondType);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.sopFlowService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createDto: CreateSopFlowDto) {
    return this.sopFlowService.create(req.user.id, createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateSopFlowDto,
  ) {
    return this.sopFlowService.update(+id, req.user.id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.sopFlowService.delete(+id);
  }
}
