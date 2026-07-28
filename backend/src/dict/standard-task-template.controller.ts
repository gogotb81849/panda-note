import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  StandardTaskTemplateService,
  CreateTaskTemplateDto,
  UpdateTaskTemplateDto,
} from './standard-task-template.service';
import { TeamCode } from '@prisma/client';

@Controller('standard-task-templates')
@UseGuards(JwtAuthGuard)
export class StandardTaskTemplateController {
  constructor(private templateService: StandardTaskTemplateService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.templateService.findAll(req.user.teamCode);
  }

  @Get('by-category')
  async getByCategory(
    @Query('firstType') firstType: string,
    @Request() req: any,
  ) {
    return this.templateService.getTemplatesByCategory(firstType, req.user.teamCode);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(+id);
  }

  @Post()
  async create(
    @Body() dto: CreateTaskTemplateDto,
    @Request() req: any,
  ) {
    return this.templateService.create(dto, req.user.teamCode, req.user.id);
  }

  @Post('batch')
  async batchCreate(
    @Body() body: { items: CreateTaskTemplateDto[] },
    @Request() req: any,
  ) {
    return this.templateService.batchCreate(body.items, req.user.teamCode, req.user.id);
  }

  @Post('import')
  async importFromText(
    @Body() body: { text: string },
    @Request() req: any,
  ) {
    return this.templateService.importFromText(body.text, req.user.teamCode, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    return this.templateService.update(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.templateService.remove(+id);
  }
}
