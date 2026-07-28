import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PortService } from './port.service';
import { CreatePortDto } from './dto/create-port.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ports')
@UseGuards(JwtAuthGuard)
export class PortController {
  constructor(private readonly portService: PortService) {}

  @Post()
  async create(@Body() createPortDto: CreatePortDto) {
    return this.portService.create(createPortDto);
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.portService.findAll(search);
  }

  @Get(':id')
  async findOne(@Query('id') id: string) {
    return this.portService.findOne(+id);
  }
}
