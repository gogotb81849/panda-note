import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDictDto, UpdateDictDto } from './dict.dto';
import { TeamCode, UserRole } from '@prisma/client';

export interface BatchCreateDictResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
  ids: number[];
}

export interface BatchCreateDictItem {
  categoryType: 'first_type' | 'second_type';
  categoryName: string;
  parentId?: number;
  sortOrder?: number;
  role?: string;
}

@Injectable()
export class DictService {
  constructor(private prisma: PrismaService) {}

  async findAllFirstTypes(teamCode: string, userRole?: string) {
    const where: any = {
      OR: [
        { teamCode: null },
        { teamCode: teamCode as TeamCode },
      ],
      categoryType: 'first_type',
    };

    // 按角色筛选
    if (userRole) {
      where.OR.push({ role: userRole as UserRole });
    }

    return this.prisma.dictCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findAllSecondTypes(teamCode: string, parentId?: number, userRole?: string) {
    const where: any = {
      OR: [
        { teamCode: null },
        { teamCode: teamCode as TeamCode },
      ],
      categoryType: 'second_type',
    };

    // 按角色筛选
    if (userRole) {
      where.OR.push({ role: userRole as UserRole });
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    return this.prisma.dictCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateDictDto) {
    const data: any = { ...dto };
    if (dto.teamCode) {
      data.teamCode = dto.teamCode as TeamCode;
    }
    if (dto.role) {
      data.role = dto.role as UserRole;
    }
    return this.prisma.dictCategory.create({
      data,
    });
  }

  async update(id: number, dto: UpdateDictDto) {
    const data: any = {};
    if (dto.categoryName !== undefined) data.categoryName = dto.categoryName;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.role !== undefined) data.role = dto.role as UserRole | null;

    return this.prisma.dictCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.dictCategory.delete({
      where: { id },
    });
  }

  // 批量创建分类
  async batchCreate(
    items: BatchCreateDictItem[],
    teamCode: TeamCode,
  ): Promise<BatchCreateDictResult> {
    const result: BatchCreateDictResult = {
      success: 0,
      failed: 0,
      total: items.length,
      errors: [],
      ids: [],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.categoryName) {
          throw new BadRequestException(`第 ${i + 1} 条：分类名称不能为空`);
        }
        if (item.categoryType !== 'first_type' && item.categoryType !== 'second_type') {
          throw new BadRequestException(`第 ${i + 1} 条：类型必须是 first_type 或 second_type`);
        }

        const created = await this.prisma.dictCategory.create({
          data: {
            teamCode,
            categoryType: item.categoryType,
            categoryName: item.categoryName,
            parentId: item.parentId || null,
            sortOrder: item.sortOrder || 0,
            role: item.role ? (item.role as UserRole) : null,
          },
        });
        result.success++;
        result.ids.push(created.id);
      } catch (err: any) {
        result.failed++;
        result.errors.push(err.message || `第 ${i + 1} 条处理失败`);
      }
    }

    return result;
  }

  // 从文本导入分类：格式为 "类型,一级分类,二级分类,排序"
  async importFromText(
    text: string,
    teamCode: TeamCode,
  ): Promise<BatchCreateDictResult> {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const items: BatchCreateDictItem[] = [];

    // 先建立一级分类映射
    const firstTypeMap = new Map<string, number>();

    for (const line of lines) {
      const parts = line.split(/[,，\t]/).map((p) => p.trim());
      if (parts.length >= 1) {
        // 格式：一级分类,二级分类,优先级,排序
        const firstTypeName = parts[0];
        const secondTypeName = parts[1];

        if (!firstTypeMap.has(firstTypeName)) {
          // 先添加一级分类（占位，稍后统一创建）
          items.push({
            categoryType: 'first_type',
            categoryName: firstTypeName,
            sortOrder: items.filter((i) => i.categoryType === 'first_type').length,
          });
          firstTypeMap.set(firstTypeName, -1); // -1 表示待创建
        }

        if (secondTypeName) {
          items.push({
            categoryType: 'second_type',
            categoryName: secondTypeName,
            // parentId 在创建时会从已创建的一级分类中查询
            sortOrder: parseInt(parts[2] || '0', 10),
          });
        }
      }
    }

    // 第一遍：创建所有一级分类
    const firstTypeItems = items.filter((i) => i.categoryType === 'first_type');
    const result: BatchCreateDictResult = {
      success: 0,
      failed: 0,
      total: items.length,
      errors: [],
      ids: [],
    };

    for (let i = 0; i < firstTypeItems.length; i++) {
      const item = firstTypeItems[i];
      try {
        // 先检查是否已存在同名的一级分类
        const existing = await this.prisma.dictCategory.findFirst({
          where: {
            teamCode,
            categoryType: 'first_type',
            categoryName: item.categoryName,
          },
        });
        if (existing) {
          firstTypeMap.set(item.categoryName, existing.id);
          result.success++;
          result.ids.push(existing.id);
          continue;
        }

        const created = await this.prisma.dictCategory.create({
          data: {
            teamCode,
            categoryType: 'first_type',
            categoryName: item.categoryName,
            sortOrder: item.sortOrder || 0,
          },
        });
        firstTypeMap.set(item.categoryName, created.id);
        result.success++;
        result.ids.push(created.id);
      } catch (err: any) {
        result.failed++;
        result.errors.push(err.message || `一级分类 ${item.categoryName} 创建失败`);
      }
    }

    // 第二遍：创建所有二级分类
    const secondTypeItems = items.filter((i) => i.categoryType === 'second_type');
    for (const item of secondTypeItems) {
      try {
        // 找到对应的一级分类ID
        const parentId = firstTypeMap.get(items
          .filter((i) => i.categoryType === 'first_type')
          .find((ft) => {
            // 找到此二级分类前面最近的一级分类
            const firstTypesInOrder = items
              .filter((i) => i.categoryType === 'first_type');
            // 简化：通过名称找
            const allSecondItems = items.filter((i) => i.categoryType === 'second_type');
            const idx = allSecondItems.indexOf(item);
            const allItems = [...items];
            const itemIdx = allItems.indexOf(item);
            let closestFirst: BatchCreateDictItem | null = null;
            for (let j = itemIdx - 1; j >= 0; j--) {
              if (allItems[j].categoryType === 'first_type') {
                closestFirst = allItems[j];
                break;
              }
            }
            return ft === closestFirst;
          })?.categoryName || '');

        if (!parentId || parentId < 0) {
          throw new BadRequestException(`二级分类「${item.categoryName}」未找到对应的一级分类`);
        }

        // 检查是否已存在同名的二级分类（在同一父级下）
        const existing = await this.prisma.dictCategory.findFirst({
          where: {
            teamCode,
            categoryType: 'second_type',
            categoryName: item.categoryName,
            parentId,
          },
        });
        if (existing) {
          result.success++;
          result.ids.push(existing.id);
          continue;
        }

        const created = await this.prisma.dictCategory.create({
          data: {
            teamCode,
            categoryType: 'second_type',
            categoryName: item.categoryName,
            parentId,
            sortOrder: item.sortOrder || 0,
          },
        });
        result.success++;
        result.ids.push(created.id);
      } catch (err: any) {
        result.failed++;
        result.errors.push(err.message || `二级分类 ${item.categoryName} 创建失败`);
      }
    }

    return result;
  }
}