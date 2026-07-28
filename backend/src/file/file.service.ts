import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { Prisma, TeamCode, UserRole } from '@prisma/client';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

// 允许的文件扩展名白名单
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
  'mp4', 'avi', 'mov',
  'zip', 'rar', '7z', 'tar', 'gz',
  'csv', 'md',
]);

// 禁止的文件扩展名黑名单
const DISALLOWED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js',
  'jar', 'msi', 'dll', 'sys', 'drv', 'sh', 'bin', 'iso', 'img',
]);

// 最大文件大小 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 最大文件名长度
const MAX_FILENAME_LENGTH = 255;

// 最大描述长度
const MAX_DESCRIPTION_LENGTH = 500;

// 最大分类长度
const MAX_CATEGORY_LENGTH = 100;

// shore_crew_supervisor 及以上角色列表（数字越小优先级越高，3 级及以上为管理角色）
const MANAGER_ROLES: UserRole[] = [
  UserRole.shore_crew_supervisor,
  UserRole.shore_marine_supervisor,
  UserRole.shore_engineer_supervisor,
  UserRole.shore_electric_supervisor,
  UserRole.general_manager,
  UserRole.company_admin,
];

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export interface CreateSharedFileDto {
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

// 上传文件接口定义
interface UploadedFileInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export interface FileUploadMeta {
  description?: string;
  category?: string;
  isPublic?: boolean;
}

export interface UpdateSharedFileDto {
  fileName?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  async create(createDto: CreateSharedFileDto, userId: number, teamCode: TeamCode, ipAddress?: string, userAgent?: string) {
    // 1. 文件名校验
    if (!createDto.fileName || createDto.fileName.trim().length === 0) {
      throw new BadRequestException('文件名不能为空');
    }
    if (createDto.fileName.length > MAX_FILENAME_LENGTH) {
      throw new BadRequestException(`文件名长度不能超过 ${MAX_FILENAME_LENGTH} 字符`);
    }
    // 移除路径遍历字符
    const sanitizedFileName = createDto.fileName.replace(/\.\.[/\\]/g, '').replace(/\.{2,}/g, '.');
    if (sanitizedFileName.trim().length === 0) {
      throw new BadRequestException('文件名包含非法字符');
    }

    // 2. 文件类型白名单校验
    const fileExtension = createDto.fileType.split('.').pop()?.toLowerCase() || '';
    if (!fileExtension) {
      throw new BadRequestException('无法识别文件类型');
    }
    if (DISALLOWED_EXTENSIONS.has(fileExtension)) {
      throw new BadRequestException(`不支持的文件类型: .${fileExtension}`);
    }
    if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
      throw new BadRequestException(`不支持的文件类型: .${fileExtension}`);
    }

    // 3. 文件大小限制
    if (createDto.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(`文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`);
    }

    // 4. 描述和分类长度限制
    if (createDto.description && createDto.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new BadRequestException(`描述长度不能超过 ${MAX_DESCRIPTION_LENGTH} 字符`);
    }
    if (createDto.category && createDto.category.length > MAX_CATEGORY_LENGTH) {
      throw new BadRequestException(`分类长度不能超过 ${MAX_CATEGORY_LENGTH} 字符`);
    }

    try {
      const result = await this.prisma.sharedFile.create({
        data: {
          ...createDto,
          fileName: sanitizedFileName,
          uploadedBy: userId,
          teamCode,
          isPublic: createDto.isPublic ?? true,
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      });

      // 记录操作日志
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: 'create',
        operationContent: `创建文件：${result.originalName || result.fileName}`,
        ipAddress,
        userAgent,
      });

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('文件上传失败');
      }
      throw error;
    }
  }

  async createFromFileUpload(
    uploadedFile: UploadedFileInfo,
    meta: FileUploadMeta,
    userId: number,
    teamCode: TeamCode,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const relativePath = `uploads/${uploadedFile.filename}`;
    const fileExtension = uploadedFile.originalname.split('.').pop()?.toLowerCase() || '';

    // 1. 文件类型白名单校验
    if (!fileExtension) {
      throw new BadRequestException('无法识别文件类型');
    }
    if (DISALLOWED_EXTENSIONS.has(fileExtension)) {
      throw new BadRequestException(`不支持的文件类型: .${fileExtension}`);
    }
    if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
      throw new BadRequestException(`不支持的文件类型: .${fileExtension}`);
    }

    // 2. 文件大小限制
    if (uploadedFile.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`);
    }

    // 3. 描述和分类长度限制
    if (meta.description && meta.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new BadRequestException(`描述长度不能超过 ${MAX_DESCRIPTION_LENGTH} 字符`);
    }
    if (meta.category && meta.category.length > MAX_CATEGORY_LENGTH) {
      throw new BadRequestException(`分类长度不能超过 ${MAX_CATEGORY_LENGTH} 字符`);
    }

    try {
      const result = await this.prisma.sharedFile.create({
        data: {
          fileName: uploadedFile.originalname,
          originalName: uploadedFile.originalname,
          filePath: relativePath,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.mimetype || `.${fileExtension}`,
          description: meta.description || null,
          category: meta.category || null,
          uploadedBy: userId,
          teamCode,
          isPublic: meta.isPublic ?? true,
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      });

      // 记录操作日志
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: 'upload',
        operationContent: `上传文件：${result.originalName}`,
        ipAddress,
        userAgent,
      });

      return result;
    } catch (error) {
      // 数据库写入失败时，删除已上传的文件
      const fullPath = join(UPLOADS_DIR, uploadedFile.filename);
      if (existsSync(fullPath)) {
        try { unlinkSync(fullPath); } catch (_) { /* ignore */ }
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('文件上传失败');
      }
      throw error;
    }
  }

  async findAll(teamCode: TeamCode, category?: string, isPublic?: boolean, page?: number, pageSize?: number) {
    const where: Prisma.SharedFileWhereInput = { teamCode };

    if (category) {
      where.category = category;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const include = {
      uploader: {
        select: {
          id: true,
          username: true,
          realName: true,
        },
      },
    };

    try {
      if (page && pageSize) {
        const skip = (page - 1) * pageSize;
        const [data, total] = await Promise.all([
          this.prisma.sharedFile.findMany({
            where,
            include,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          this.prisma.sharedFile.count({ where }),
        ]);
        return {
          data,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }

      return this.prisma.sharedFile.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('查询文件列表失败');
      }
      throw error;
    }
  }

  async findOne(id: number, teamCode: TeamCode, userId?: number, userRole?: UserRole) {
    try {
      const file = await this.prisma.sharedFile.findFirst({
        where: { id, teamCode },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      });

      if (!file) {
        throw new NotFoundException('文件不存在');
      }

      const isManager = userRole !== undefined && MANAGER_ROLES.includes(userRole);
      const isOwner = userId !== undefined && file.uploadedBy === userId;

      if (!file.isPublic && !isOwner && !isManager) {
        throw new ForbiddenException('无权访问私有文件');
      }

      return file;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('查询文件失败');
      }
      throw error;
    }
  }

  async update(id: number, updateDto: UpdateSharedFileDto, userId: number, teamCode: TeamCode, userRole: UserRole, ipAddress?: string, userAgent?: string) {
    try {
      const file = await this.prisma.sharedFile.findFirst({
        where: { id, teamCode },
        select: { uploadedBy: true, isPublic: true },
      });

      if (!file) {
        throw new NotFoundException('文件不存在');
      }

      const isManager = MANAGER_ROLES.includes(userRole);
      if (file.uploadedBy !== userId && !isManager) {
        throw new ForbiddenException('无权修改此文件');
      }

      const result = await this.prisma.sharedFile.updateMany({
        where: { id, teamCode },
        data: updateDto,
      });

      if (result.count === 0) {
        throw new NotFoundException('文件不存在或无权修改');
      }

      const updatedFile = await this.prisma.sharedFile.findFirst({
        where: { id, teamCode },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      });

      // 记录操作日志
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: 'update',
        operationContent: `更新文件：${updatedFile?.fileName || id}`,
        ipAddress,
        userAgent,
      });

      return updatedFile;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('更新文件失败');
      }
      throw error;
    }
  }

  async remove(id: number, userId: number, teamCode: TeamCode, userRole: UserRole, ipAddress?: string, userAgent?: string) {
    try {
      const file = await this.prisma.sharedFile.findFirst({
        where: { id, teamCode },
        select: { uploadedBy: true, filePath: true },
      });

      if (!file) {
        throw new NotFoundException('文件不存在');
      }

      const isManager = MANAGER_ROLES.includes(userRole);
      if (file.uploadedBy !== userId && !isManager) {
        throw new ForbiddenException('无权删除此文件');
      }

      const result = await this.prisma.sharedFile.deleteMany({
        where: { id, teamCode },
      });

      if (result.count === 0) {
        throw new NotFoundException('文件不存在或无权删除');
      }

      // 删除物理文件
      if (file.filePath) {
        const fullPath = join(process.cwd(), file.filePath);
        if (existsSync(fullPath)) {
          try { unlinkSync(fullPath); } catch (_) { /* ignore cleanup errors */ }
        }
      }

      // 记录操作日志
      await this.operationLogService.create({
        userId,
        teamCode,
        operationType: 'delete',
        operationContent: `删除文件：${id}`,
        ipAddress,
        userAgent,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('删除文件失败');
      }
      throw error;
    }
  }

  async incrementDownload(id: number, teamCode: TeamCode, userId?: number, userRole?: UserRole) {
    try {
      const file = await this.prisma.sharedFile.findFirst({
        where: { id, teamCode },
        select: { uploadedBy: true, isPublic: true },
      });

      if (!file) {
        throw new NotFoundException('文件不存在');
      }

      const isManager = userRole !== undefined && MANAGER_ROLES.includes(userRole);
      const isOwner = userId !== undefined && file.uploadedBy === userId;

      if (!file.isPublic && !isOwner && !isManager) {
        throw new ForbiddenException('无权下载此文件');
      }

      const result = await this.prisma.sharedFile.updateMany({
        where: { id, teamCode },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('文件不存在');
      }

      return this.prisma.sharedFile.findFirst({
        where: { id, teamCode },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('更新下载次数失败');
      }
      throw error;
    }
  }
}
