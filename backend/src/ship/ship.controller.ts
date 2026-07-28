import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Headers, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ShipService } from './ship.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

/**
 * Extract client IP address from request
 */
function getClientIp(req: any): string {
  return req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Controller('ships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipController {
  constructor(private readonly shipService: ShipService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  findAll(@Request() req) {
    return this.shipService.findAll(req.user.teamCode);
  }

  @Get('dynamic-status')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getDynamicStatus(@Request() req) {
    return this.shipService.getDynamicStatus(req.user.teamCode);
  }

  @Post('parse-report')
  @Roles(UserRole.shore_crew_supervisor)
  async parseReport(@Body() body: { text: string }, @Request() req) {
    return this.shipService.parseReport(body.text || '', req.user.teamCode);
  }

  @Post('batch-dynamic')
  @Roles(UserRole.shore_crew_supervisor)
  async batchUpdateDynamic(@Body() body: { updates: Array<{ shipId: number; parsed: any }> }, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.shipService.batchUpdateDynamic(body.updates || [], req.user.id, req.user.teamCode, getClientIp(req), userAgent);
  }

  @Post('parse-political-report')
  @Roles(UserRole.shore_crew_supervisor)
  async parsePoliticalReport(@Body() body: { text: string }, @Request() req) {
    return this.shipService.parsePoliticalReport(body.text || '', req.user.teamCode);
  }

  @Post('batch-political')
  @Roles(UserRole.shore_crew_supervisor)
  async batchUpdatePolitical(@Body() body: { updates: Array<{ shipId: number; parsed: any }> }, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.shipService.batchUpdatePolitical(body.updates || [], req.user.id, req.user.teamCode, getClientIp(req), userAgent);
  }

  @Get('dynamic-status/by-date')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor, UserRole.ship_political_instructor)
  getDynamicStatusByDate(@Request() req, @Query('dayOffset') dayOffset: number) {
    return this.shipService.getDynamicStatusByDate(req.user.teamCode, +dayOffset || 0);
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    return this.shipService.getShipTimeline(+id);
  }

  @Get(':id/analysis')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor, UserRole.ship_political_instructor, UserRole.shore_marine_supervisor, UserRole.shore_engineer_supervisor, UserRole.shore_electric_supervisor)
  async getAnalysis(@Param('id') id: string) {
    return this.shipService.getShipAnalysis(+id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shipService.findOne(+id);
  }

  @Post()
  @Roles(UserRole.shore_crew_supervisor)
  create(@Body() createShipDto: any, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.shipService.create(createShipDto, req.user.id, req.user.teamCode, getClientIp(req), userAgent);
  }

  @Patch(':id')
  @Roles(UserRole.shore_crew_supervisor)
  update(@Param('id') id: string, @Body() updateShipDto: any, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.shipService.update(+id, updateShipDto, req.user.id, req.user.teamCode, getClientIp(req), userAgent);
  }

  @Post(':id/photo')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          }
          cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname) || '.jpg';
          const uniqueName = `ship_${randomUUID()}${ext}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;
        if (allowed.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error('仅支持图片文件（jpg/png/gif/webp/svg）'), false);
        }
      },
    }),
  )
  async uploadShipPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    if (!file) {
      return { success: false, message: '未收到文件' };
    }
    const photoUrl = `/uploads/${file.filename}`;
    // 更新船舶照片字段
    const updated = await this.shipService.update(+id, { shipPhoto: photoUrl }, req.user.id, req.user.teamCode, getClientIp(req), userAgent);
    return { success: true, photoUrl, ship: updated };
  }

  @Delete(':id/photo')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor)
  async deleteShipPhoto(
    @Param('id') id: string,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    const ship = await this.shipService.findOne(+id);
    if (ship?.shipPhoto) {
      // 删除文件
      const filePath = join(process.cwd(), ship.shipPhoto.replace(/^\//, ''));
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // 文件删除失败不影响数据库更新
      }
      const updated = await this.shipService.update(+id, { shipPhoto: null }, req.user.id, req.user.teamCode, getClientIp(req), userAgent);
      return { success: true, ship: updated };
    }
    return { success: false, message: '船舶未设置照片' };
  }

  @Delete(':id')
  @Roles(UserRole.shore_crew_supervisor)
  remove(@Param('id') id: string, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.shipService.remove(+id, req.user.id, req.user.teamCode, getClientIp(req), userAgent);
  }

  @Post('init')
  async initShips() {
    return this.shipService.createInitialShips();
  }

  @Post('clear-data')
  @Roles(UserRole.admin, UserRole.shore_crew_supervisor)
  clearShipData(@Body() body: { shipIds: number[] }, @Request() req, @Headers('user-agent') userAgent: string) {
    return this.shipService.clearShipData(body.shipIds || [], req.user.id, req.user.teamCode, getClientIp(req), userAgent);
  }
}
