import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';

export interface SearchResultItem {
  id: number;
  type: 'diary' | 'experience' | 'template' | 'crew';
  title: string;
  snippet: string;
  highlight: string;
  date: string;
  extra?: Record<string, any>;
}

export interface SearchAllResponse {
  query: string;
  groups: {
    type: string;
    label: string;
    count: number;
    items: SearchResultItem[];
  }[];
  total: number;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * 统一全文搜索 - 使用 Prisma contains 模式
   * 搜索范围：diary.content, experience.title+content,
   *          publishTemplate.title+templateDesc, crewMember.name
   */
  async searchAll(
    teamCode: TeamCode,
    query: string,
  ): Promise<SearchAllResponse> {
    if (!query?.trim()) {
      return { query: '', groups: [], total: 0 };
    }

    const q = query.trim();

    const [diaryResults, experienceResults, templateResults, crewResults] =
      await Promise.all([
        this.searchDiary(teamCode, q),
        this.searchExperience(teamCode, q),
        this.searchTemplate(teamCode, q),
        this.searchCrew(teamCode, q),
      ]);

    const groups = [
      {
        type: 'diary',
        label: '航海日记',
        count: diaryResults.length,
        items: diaryResults,
      },
      {
        type: 'experience',
        label: '经验分享',
        count: experienceResults.length,
        items: experienceResults,
      },
      {
        type: 'template',
        label: '发布模板',
        count: templateResults.length,
        items: templateResults,
      },
      {
        type: 'crew',
        label: '船员信息',
        count: crewResults.length,
        items: crewResults,
      },
    ].filter((g) => g.count > 0);

    const total = groups.reduce((sum, g) => sum + g.count, 0);

    return { query: q, groups, total };
  }

  private highlightText(text: string, query: string): string {
    if (!text) return '';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private truncateSnippet(text: string, query: string, maxLen = 200): string {
    if (!text) return '';
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return text.substring(0, maxLen);

    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + query.length + 140);
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  }

  private async searchDiary(
    teamCode: TeamCode,
    query: string,
  ): Promise<SearchResultItem[]> {
    const diaries = await this.prisma.diary.findMany({
      where: {
        teamCode,
        content: { contains: query },
      },
      take: 20,
      orderBy: { date: 'desc' },
    });

    return diaries.map((d) => {
      const snippet = this.truncateSnippet(d.content, query);
      return {
        id: d.id,
        type: 'diary' as const,
        title: `日记 - ${this.formatDate(d.date)}`,
        snippet,
        highlight: this.highlightText(snippet, query),
        date: this.formatDate(d.date),
        extra: { shipName: d.shipName },
      };
    });
  }

  private async searchExperience(
    teamCode: TeamCode,
    query: string,
  ): Promise<SearchResultItem[]> {
    const experiences = await this.prisma.experience.findMany({
      where: {
        teamCode,
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return experiences.map((e) => {
      const matchedIn = e.title.toLowerCase().includes(query.toLowerCase())
        ? e.title
        : e.content;
      const snippet = this.truncateSnippet(matchedIn, query);
      return {
        id: e.id,
        type: 'experience' as const,
        title: e.title,
        snippet,
        highlight: this.highlightText(snippet, query),
        date: this.formatDate(e.createdAt),
        extra: { category: e.category, authorName: e.authorName },
      };
    });
  }

  private async searchTemplate(
    teamCode: TeamCode,
    query: string,
  ): Promise<SearchResultItem[]> {
    const templates = await this.prisma.publishTemplate.findMany({
      where: {
        teamCode,
        OR: [
          { title: { contains: query } },
          { templateDesc: { contains: query } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map((t) => {
      const matchedIn =
        t.title.toLowerCase().includes(query.toLowerCase())
          ? t.title
          : t.templateDesc || '';
      const snippet = this.truncateSnippet(matchedIn, query);
      return {
        id: t.id,
        type: 'template' as const,
        title: t.title,
        snippet,
        highlight: this.highlightText(snippet, query),
        date: this.formatDate(t.updatedAt),
        extra: { templateType: t.templateType, isPublished: t.isPublished },
      };
    });
  }

  private async searchCrew(
    teamCode: TeamCode,
    query: string,
  ): Promise<SearchResultItem[]> {
    const crewMembers = await this.prisma.crewMember.findMany({
      where: {
        teamCode,
        name: { contains: query },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    return crewMembers.map((c) => {
      const snippet = `船员: ${c.name} | 岗位: ${c.position || '-'} | 船舶: ${c.shipName || '-'}`;
      return {
        id: c.id,
        type: 'crew' as const,
        title: c.name,
        snippet,
        highlight: this.highlightText(snippet, query),
        date: this.formatDate(c.updatedAt),
        extra: { position: c.position, shipName: c.shipName, gender: c.gender },
      };
    });
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}