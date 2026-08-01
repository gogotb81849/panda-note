import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile, Request, Headers } from '@nestjs/common';
import { FileService, CreateSharedFileDto, UpdateSharedFileDto } from './file.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserId, UserTeam, UserRoles } from '../auth/user.decorator';
import { TeamCode, UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, createReadStream, statSync } from 'fs';

// Multer文件对象类型定义
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}
import * as express from 'express';

const ALL_ROLES = [
  UserRole.ship_political_instructor,
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
] as const;

const UPLOADS_DIR = join(process.cwd(), 'uploads');

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

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(...ALL_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const uniqueName = `${randomUUID()}${ext}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif|bmp|webp|svg|mp4|avi|mov|zip|rar|7z|tar|gz|csv|md)$/i;
        if (allowedExtensions.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error('不支持的文件类型'), false);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() uploadedFile: MulterFile,
    @Body('description') description: string,
    @Body('category') category: string,
    @Body('isPublic') isPublic: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    // 修复 multer 将 UTF-8 中文文件名按 Latin-1 解码导致的乱码
    if (uploadedFile?.originalname) {
      try {
        uploadedFile.originalname = Buffer.from(uploadedFile.originalname, 'latin1').toString('utf8');
      } catch {
        // 转码失败则保持原样
      }
    }
    const isPublicBool = isPublic === 'false' ? false : true;
    return this.fileService.createFromFileUpload(
      uploadedFile,
      { description, category, isPublic: isPublicBool },
      userId,
      teamCode,
      getClientIp(req),
      userAgent,
    );
  }

  @Get()
  async findAll(
    @UserTeam() teamCode: TeamCode,
    @Query('category') category?: string,
    @Query('isPublic') isPublic?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const isPublicBool = isPublic !== undefined ? isPublic === 'true' : undefined;
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.fileService.findAll(teamCode, category, isPublicBool, pageNum, pageSizeNum);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.fileService.findOne(+id, teamCode, userId, userRole);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ship_political_instructor,
    UserRole.shore_crew_supervisor,
    UserRole.shore_marine_supervisor,
    UserRole.shore_engineer_supervisor,
    UserRole.shore_electric_supervisor,
    UserRole.general_manager,
    UserRole.company_admin,
  )
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSharedFileDto,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.fileService.update(+id, updateDto, userId, teamCode, userRole, getClientIp(req), userAgent);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ship_political_instructor,
    UserRole.shore_crew_supervisor,
    UserRole.shore_marine_supervisor,
    UserRole.shore_engineer_supervisor,
    UserRole.shore_electric_supervisor,
    UserRole.general_manager,
    UserRole.company_admin,
  )
  async remove(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Request() req,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.fileService.remove(+id, userId, teamCode, userRole, getClientIp(req), userAgent);
  }

  @Post(':id/download')
  async recordDownload(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
  ) {
    return this.fileService.incrementDownload(+id, teamCode, userId, userRole);
  }

  @Get(':id/stream')
  async streamFile(
    @Param('id') id: string,
    @UserId() userId: number,
    @UserTeam() teamCode: TeamCode,
    @UserRoles() userRole: UserRole,
    @Headers('range') range: string,
    @Res() res: Response,
  ) {
    const file = await this.fileService.findOne(+id, teamCode, userId, userRole);
    const filePath = join(UPLOADS_DIR, file.filePath);

    if (!existsSync(filePath)) {
      res.status(404).json({ message: '文件不存在' });
      return;
    }

    const fileSize = statSync(filePath).size;
    const fileName = file.originalName || file.fileName;
    const mimeType = file.fileType || 'application/octet-stream';

    // 判断是否为图片类型，图片应内联显示而非下载
    const isImage = mimeType.startsWith('image/');
    const disposition = isImage ? 'inline' : 'attachment';

    // 支持 Range 请求（断点续传下载）
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      });

      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': mimeType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      });

      createReadStream(filePath).pipe(res);
    }
  }
}
