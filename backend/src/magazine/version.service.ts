import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Magazine, MagazineSection, MagazineArticle } from '@prisma/client';

interface MagazineFullData {
  id: string;
  name: string;
  templateId: string;
  totalPages: number;
  coverImage: string | null;
  status: string;
  teamCode: string | null;
  createdBy: number | null;
  sections: {
    id: string;
    name: string;
    pageStart: number;
    pageEnd: number;
    layout: string;
    order: number;
    articles: {
      id: string;
      title: string;
      content: string;
      author: string | null;
      summary: string | null;
      images: string[];
      order: number;
    }[];
  }[];
}

export interface VersionListItem {
  id: string;
  versionNumber: number;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
}

export interface CompareResult {
  added: { section: string; articles: string[] };
  removed: { section: string; articles: string[] };
  modified: { section: string; articles: { title: string; changes: string[] }[] };
}

@Injectable()
export class MagazineVersionService {
  private readonly logger = new Logger(MagazineVersionService.name);

  constructor(private prisma: PrismaService) {}

  // 获取杂志完整数据（用于创建版本快照）
  private async getMagazineFullData(magazineId: string): Promise<MagazineFullData> {
    const magazine = await this.prisma.magazine.findUnique({
      where: { id: magazineId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            articles: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!magazine) {
      throw new NotFoundException('杂志不存在');
    }

    return magazine as unknown as MagazineFullData;
  }

  // 创建版本快照
  async createVersion(
    magazineId: string,
    userId: number,
    description?: string,
  ): Promise<{ id: string; versionNumber: number }> {
    // 1. 获取杂志完整数据
    const magazine = await this.getMagazineFullData(magazineId);

    // 2. 获取当前最大版本号
    const latestVersion = await this.prisma.magazineVersion.findFirst({
      where: { magazineId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (latestVersion?.versionNumber || 0) + 1;

    // 3. 创建版本记录
    const version = await this.prisma.magazineVersion.create({
      data: {
        magazineId,
        versionNumber,
        description: description || `版本 ${versionNumber}`,
        data: magazine as any,
        createdBy: userId,
      },
    });

    // 4. 删除过期的自动保存
    await this.prisma.magazineAutoSave.deleteMany({
      where: {
        magazineId,
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Created version ${versionNumber} for magazine ${magazineId}`);

    return {
      id: version.id,
      versionNumber: version.versionNumber,
    };
  }

  // 获取版本列表
  async getVersionList(magazineId: string): Promise<VersionListItem[]> {
    const versions = await this.prisma.magazineVersion.findMany({
      where: { magazineId },
      orderBy: { versionNumber: 'desc' },
      include: {
        magazine: {
          select: { createdBy: true },
        },
      },
    });

    // 获取创建者信息
    const userIds = [...new Set(versions.map(v => v.createdBy))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, realName: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.realName]));

    return versions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      name: v.name || `版本 ${v.versionNumber}`,
      description: v.description || '',
      createdBy: userMap.get(v.createdBy) || '未知',
      createdAt: v.createdAt,
    }));
  }

  // 获取版本详情
  async getVersion(versionId: string): Promise<any> {
    const version = await this.prisma.magazineVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException('版本不存在');
    }
    return version.data;
  }

  // 恢复版本
  async restoreVersion(
    versionId: string,
    userId: number,
  ): Promise<Magazine> {
    // 1. 获取版本数据
    const version = await this.prisma.magazineVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    const magazineData = version.data as any;

    // 2. 创建当前版本的快照（恢复前备份）
    await this.createVersion(version.magazineId, userId, '恢复前备份');

    // 3. 恢复杂志基础数据
    const updatedMagazine = await this.prisma.magazine.update({
      where: { id: version.magazineId },
      data: {
        name: magazineData.name,
        templateId: magazineData.templateId,
        totalPages: magazineData.totalPages,
        coverImage: magazineData.coverImage,
      },
    });

    // 4. 恢复版块和文章 - 先删除现有数据再重新创建
    await this.prisma.magazineArticle.deleteMany({
      where: { magazineId: version.magazineId },
    });
    await this.prisma.magazineSection.deleteMany({
      where: { magazineId: version.magazineId },
    });

    // 5. 恢复版块和文章
    for (const section of magazineData.sections || []) {
      const newSection = await this.prisma.magazineSection.create({
        data: {
          magazineId: version.magazineId,
          name: section.name,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd,
          layout: section.layout,
          order: section.order,
        },
      });

      for (const article of section.articles || []) {
        await this.prisma.magazineArticle.create({
          data: {
            magazineId: version.magazineId,
            sectionId: newSection.id,
            title: article.title,
            content: article.content,
            author: article.author,
            summary: article.summary,
            images: article.images || [],
            order: article.order,
          },
        });
      }
    }

    this.logger.log(`Restored version ${version.versionNumber} for magazine ${version.magazineId}`);

    return updatedMagazine;
  }

  // 版本对比
  async compareVersions(
    versionId1: string,
    versionId2: string,
  ): Promise<CompareResult> {
    const [v1, v2] = await Promise.all([
      this.prisma.magazineVersion.findUnique({ where: { id: versionId1 } }),
      this.prisma.magazineVersion.findUnique({ where: { id: versionId2 } }),
    ]);

    if (!v1 || !v2) {
      throw new NotFoundException('版本不存在');
    }

    const data1 = v1.data as any;
    const data2 = v2.data as any;

    const result: CompareResult = {
      added: { section: '', articles: [] },
      removed: { section: '', articles: [] },
      modified: { section: '', articles: [] },
    };

    // 构建文章映射
    const articles1Map = new Map<string, any>();
    const articles2Map = new Map<string, any>();

    for (const section of data1.sections || []) {
      for (const article of section.articles || []) {
        articles1Map.set(article.id, { ...article, sectionName: section.name });
      }
    }

    for (const section of data2.sections || []) {
      for (const article of section.articles || []) {
        articles2Map.set(article.id, { ...article, sectionName: section.name });
      }
    }

    // 找出新增的文章（存在于v2但不存在于v1）
    const addedArticles: string[] = [];
    for (const [id, article] of articles2Map) {
      if (!articles1Map.has(id)) {
        addedArticles.push(`[${article.sectionName}] ${article.title}`);
      }
    }
    result.added.articles = addedArticles;

    // 找出删除的文章（存在于v1但不存在于v2）
    const removedArticles: string[] = [];
    for (const [id, article] of articles1Map) {
      if (!articles2Map.has(id)) {
        removedArticles.push(`[${article.sectionName}] ${article.title}`);
      }
    }
    result.removed.articles = removedArticles;

    // 找出修改的文章
    const modifiedArticles: { title: string; changes: string[] }[] = [];
    for (const [id, article1] of articles1Map) {
      const article2 = articles2Map.get(id);
      if (article2) {
        const changes: string[] = [];
        if (article1.title !== article2.title) {
          changes.push(`标题: "${article1.title}" -> "${article2.title}"`);
        }
        if (article1.content !== article2.content) {
          changes.push('内容已修改');
        }
        if (article1.author !== article2.author) {
          changes.push(`作者: "${article1.author || '无'}" -> "${article2.author || '无'}"`);
        }
        if (changes.length > 0) {
          modifiedArticles.push({
            title: article1.title,
            changes,
          });
        }
      }
    }
    result.modified.articles = modifiedArticles;

    return result;
  }

  // 自动保存
  async autoSave(magazineId: string, data: any): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 查找现有自动保存
    const existing = await this.prisma.magazineAutoSave.findFirst({
      where: { magazineId },
    });

    if (existing) {
      await this.prisma.magazineAutoSave.update({
        where: { id: existing.id },
        data: {
          data,
          expiresAt,
        },
      });
    } else {
      await this.prisma.magazineAutoSave.create({
        data: {
          magazineId,
          data,
          expiresAt,
        },
      });
    }
  }

  // 获取自动保存
  async getAutoSave(magazineId: string): Promise<any | null> {
    const autoSave = await this.prisma.magazineAutoSave.findFirst({
      where: {
        magazineId,
        expiresAt: { gt: new Date() },
      },
    });
    return autoSave?.data || null;
  }

  // 删除自动保存
  async deleteAutoSave(magazineId: string): Promise<void> {
    await this.prisma.magazineAutoSave.deleteMany({
      where: { magazineId },
    });
  }
}
