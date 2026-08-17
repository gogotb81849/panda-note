import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { SanlvRuleService } from './sanlv-rule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TeamCode, UserRole } from '@prisma/client';
import { ImportSanlvRuleDto, SanlvRulePreviewInput } from './dto/import-sanlv-rule.dto';

@Controller('sanlv-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SanlvRuleController {
  constructor(private readonly service: SanlvRuleService) {}

  @Get()
  async list(@Req() req: any, @Query('limit') limit = 20) {
    return this.service.list(req.user.teamCode as TeamCode, limit);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const r = await this.service.findOne(id, req.user.teamCode as TeamCode);
    if (!r) throw new HttpException('评分规则不存在', HttpStatus.NOT_FOUND);
    return r;
  }

  @Post('/set-current/:id')
  async setCurrent(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.setCurrent(id, req.user.teamCode as TeamCode);
  }

  // ======== 导入流程：两步走 ========
  // Step 1: POST /sanlv-rules/preview —— 仅解析预览，不上传
  @Post('/preview')
  async preview(@Body() input: SanlvRulePreviewInput) {
    return this.service.preview(input);
  }

  // Step 2: POST /sanlv-rules —— 解析 + 入库
  @Post()
  async import(@Req() req: any, @Body() dto: ImportSanlvRuleDto) {
    try {
      return await this.service.import(dto, req.user.id, req.user.teamCode as TeamCode);
    } catch (e: any) {
      throw new HttpException(
        e?.message || '导入评分规则失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id, req.user.teamCode as TeamCode);
  }
}
