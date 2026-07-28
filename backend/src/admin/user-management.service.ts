import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserManagementService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { username: { contains: search } },
            { realName: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          realName: true,
          teamCode: true,
          role: true,
          roles: true,
          lastLoginAt: true,
          loginFailCount: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
        role: true,
        roles: true,
        lastLoginAt: true,
        loginFailCount: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    // Check if username already exists
    const existing = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const roles = createUserDto.roles || [createUserDto.role];

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        roles,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
        role: true,
        roles: true,
        createdAt: true,
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        username: true,
        realName: true,
        teamCode: true,
        role: true,
        roles: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // Prevent deleting the main admin account
    if (user.username === 'gogotb') {
      throw new BadRequestException('不能删除主管理员账号');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: '用户已删除' };
  }

  async resetPassword(id: number, resetPasswordDto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        loginFailCount: 0,
        lockedUntil: null,
      },
    });

    return { message: '密码已重置' };
  }

  async assignRoles(id: number, assignRolesDto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (assignRolesDto.roles.length === 0) {
      throw new BadRequestException('至少需要分配一个角色');
    }

    return this.prisma.user.update({
      where: { id },
      data: { roles: assignRolesDto.roles },
      select: {
        id: true,
        username: true,
        realName: true,
        roles: true,
      },
    });
  }

  async lockAccount(id: number, durationHours: number = 24) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const lockedUntil = new Date();
    lockedUntil.setHours(lockedUntil.getHours() + durationHours);

    return this.prisma.user.update({
      where: { id },
      data: { lockedUntil },
      select: {
        id: true,
        username: true,
        lockedUntil: true,
      },
    });
  }

  async unlockAccount(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        lockedUntil: null,
        loginFailCount: 0,
      },
      select: {
        id: true,
        username: true,
        lockedUntil: true,
        loginFailCount: true,
      },
    });
  }

  // Get all available roles
  getAvailableRoles() {
    return {
      roles: Object.values(UserRole),
      labels: {
        admin: '系统管理员',
        ship_political_instructor: '船舶政委',
        shore_crew_supervisor: '岸基船工主管',
        shore_marine_supervisor: '岸基海务主管',
        shore_engineer_supervisor: '岸基机务主管',
        shore_electric_supervisor: '岸基电气主管',
        general_manager: '总管团队',
        company_admin: '油轮船管部',
      },
    };
  }
}
