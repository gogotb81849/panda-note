import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublicCaseService } from './public-case.service';
import { CreatePublicCaseDto } from './public-case.dto';

@Controller('public-case')
export class PublicCaseController {
  constructor(private publicCaseService: PublicCaseService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('caseType') caseType?: string) {
    return this.publicCaseService.findAll(caseType);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.publicCaseService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreatePublicCaseDto) {
    return this.publicCaseService.create(createDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.publicCaseService.delete(+id);
  }
}
