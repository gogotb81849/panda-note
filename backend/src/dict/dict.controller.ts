import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DictService, BatchCreateDictItem } from './dict.service';
import { CreateDictDto, UpdateDictDto } from './dict.dto';

@Controller('dict')
@UseGuards(JwtAuthGuard)
export class DictController {
  constructor(private dictService: DictService) {}

  @Get('first-types')
  async getFirstTypes(@Request() req: any, @Query('role') role?: string) {
    const teamCode = req.user.teamCode;
    return this.dictService.findAllFirstTypes(teamCode, role);
  }

  @Get('second-types')
  async getSecondTypes(@Request() req: any, @Query('parentId') parentId?: string, @Query('role') role?: string) {
    const teamCode = req.user.teamCode;
    return this.dictService.findAllSecondTypes(teamCode, parentId ? +parentId : undefined, role);
  }

  @Post()
  async create(@Body() createDictDto: CreateDictDto) {
    return this.dictService.create(createDictDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDictDto: UpdateDictDto) {
    return this.dictService.update(+id, updateDictDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.dictService.delete(+id);
  }

  // 批量创建分类
  @Post('batch')
  async batchCreate(
    @Body() body: { items: BatchCreateDictItem[] },
    @Request() req: any,
  ) {
    return this.dictService.batchCreate(body.items, req.user.teamCode);
  }

  // 从文本导入分类
  @Post('import')
  async importFromText(
    @Body() body: { text: string },
    @Request() req: any,
  ) {
    return this.dictService.importFromText(body.text, req.user.teamCode);
  }
}