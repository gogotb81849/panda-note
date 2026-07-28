import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Prisma } from '@prisma/client';
import {
  MagazineTemplate,
  MAGAZINE_TEMPLATES,
  CreateMagazineDto,
  AddArticleDto,
  UpdateArticleDto,
  CreateSectionDto,
  UpdateSectionDto,
} from './magazine.types';

// Alias for article type from ai-magazine.service if needed
interface ArticleBasic {
  id: string;
  title: string;
  content: string;
  author?: string;
  summary?: string;
  images?: string[];
  sectionId?: string;
  order: number;
}

@Injectable()
export class MagazineService {
  private readonly logger = new Logger(MagazineService.name);

  constructor(private prisma: PrismaService) {}

  // 获取所有预置模板
  getTemplates(): MagazineTemplate[] {
    return MAGAZINE_TEMPLATES;
  }

  // 获取模板详情
  getTemplateById(templateId: string): MagazineTemplate | undefined {
    return MAGAZINE_TEMPLATES.find(t => t.id === templateId);
  }

  // 获取杂志详情
  async getMagazine(id: string) {
    const magazine = await this.prisma.magazine.findUnique({
      where: { id },
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

    return magazine;
  }

  // 获取所有杂志
  async getMagazines(teamCode?: string) {
    const where = teamCode ? { teamCode } : {};
    return this.prisma.magazine.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  // 创建杂志
  async createMagazine(dto: CreateMagazineDto) {
    const template = this.getTemplateById(dto.templateId);
    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    return this.prisma.magazine.create({
      data: {
        name: dto.name,
        templateId: dto.templateId,
        totalPages: dto.totalPages || 8,
        coverImage: dto.coverImage,
        teamCode: dto.teamCode || 'team1',
        status: 'draft',
      },
      include: {
        sections: true,
      },
    });
  }

  // 更新杂志
  async updateMagazine(id: string, dto: Partial<CreateMagazineDto>) {
    const magazine = await this.prisma.magazine.findUnique({ where: { id } });
    if (!magazine) {
      throw new NotFoundException('杂志不存在');
    }

    return this.prisma.magazine.update({
      where: { id },
      data: dto,
    });
  }

  // 删除杂志
  async deleteMagazine(id: string) {
    const magazine = await this.prisma.magazine.findUnique({ where: { id } });
    if (!magazine) {
      throw new NotFoundException('杂志不存在');
    }

    // 级联删除文章和版块
    await this.prisma.magazineArticle.deleteMany({ where: { magazineId: id } });
    await this.prisma.magazineSection.deleteMany({ where: { magazineId: id } });
    await this.prisma.magazine.delete({ where: { id } });

    return { success: true };
  }

  // 添加文章到杂志
  async addArticle(id: string, dto: AddArticleDto) {
    const magazine = await this.prisma.magazine.findUnique({ where: { id } });
    if (!magazine) {
      throw new NotFoundException('杂志不存在');
    }

    // 获取当前最大排序
    const maxOrderArticle = await this.prisma.magazineArticle.findFirst({
      where: { magazineId: id, sectionId: dto.sectionId || null },
      orderBy: { order: 'desc' },
    });

    const order = maxOrderArticle ? maxOrderArticle.order + 1 : 0;

    return this.prisma.magazineArticle.create({
      data: {
        magazineId: id,
        sectionId: dto.sectionId,
        title: dto.title,
        content: dto.content,
        author: dto.author,
        summary: dto.summary,
        images: dto.images || [],
        order,
      },
    });
  }

  // 更新文章
  async updateArticle(id: string, articleId: string, dto: UpdateArticleDto) {
    const article = await this.prisma.magazineArticle.findUnique({
      where: { id: articleId },
    });
    if (!article || article.magazineId !== id) {
      throw new NotFoundException('文章不存在');
    }

    return this.prisma.magazineArticle.update({
      where: { id: articleId },
      data: dto,
    });
  }

  // 删除文章
  async deleteArticle(id: string, articleId: string) {
    const article = await this.prisma.magazineArticle.findUnique({
      where: { id: articleId },
    });
    if (!article || article.magazineId !== id) {
      throw new NotFoundException('文章不存在');
    }

    await this.prisma.magazineArticle.delete({ where: { id: articleId } });
    return { success: true };
  }

  // 创建版块
  async createSection(id: string, dto: CreateSectionDto) {
    const magazine = await this.prisma.magazine.findUnique({ where: { id } });
    if (!magazine) {
      throw new NotFoundException('杂志不存在');
    }

    // 获取当前最大排序
    const maxOrderSection = await this.prisma.magazineSection.findFirst({
      where: { magazineId: id },
      orderBy: { order: 'desc' },
    });

    const order = maxOrderSection ? maxOrderSection.order + 1 : 0;

    return this.prisma.magazineSection.create({
      data: {
        magazineId: id,
        name: dto.name,
        layout: dto.layout || 'single-column',
        pageStart: dto.pageStart || 1,
        pageEnd: dto.pageEnd || 1,
        order,
      },
    });
  }

  // 更新版块
  async updateSection(id: string, sectionId: string, dto: UpdateSectionDto) {
    const section = await this.prisma.magazineSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.magazineId !== id) {
      throw new NotFoundException('版块不存在');
    }

    return this.prisma.magazineSection.update({
      where: { id: sectionId },
      data: dto,
    });
  }

  // 删除版块
  async deleteSection(id: string, sectionId: string) {
    const section = await this.prisma.magazineSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.magazineId !== id) {
      throw new NotFoundException('版块不存在');
    }

    // 将版块内的文章移至未分配
    await this.prisma.magazineArticle.updateMany({
      where: { sectionId },
      data: { sectionId: null },
    });

    await this.prisma.magazineSection.delete({ where: { id: sectionId } });
    return { success: true };
  }

  // 生成PDF
  async generatePdf(magazineId: string): Promise<Buffer> {
    const magazine = await this.getMagazine(magazineId);
    const template = this.getTemplateById(magazine.templateId);

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    const pdfDoc = await PDFDocument.create();

    // A4页面尺寸转换为PDF单位（1mm = 2.834645669 points）
    const mmToPoints = 2.834645669;
    const pageWidth = template.pageConfig.width * mmToPoints;
    const pageHeight = template.pageConfig.height * mmToPoints;

    // 边距
    const marginTop = template.pageConfig.margin.top * mmToPoints;
    const marginBottom = template.pageConfig.margin.bottom * mmToPoints;
    const marginLeft = template.pageConfig.margin.left * mmToPoints;
    const marginRight = template.pageConfig.margin.right * mmToPoints;

    // 可用内容区域
    const contentWidth = pageWidth - marginLeft - marginRight;
    const contentHeight = pageHeight - marginTop - marginBottom;

    // 字体
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const contentFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 计算每页内容区域能容纳的字符数和行数
    const fontSize = template.styles.contentFontSize;
    const lineHeight = fontSize * template.styles.lineHeight;
    const charsPerLine = Math.floor(contentWidth / (fontSize * 0.5));
    const linesPerPage = Math.floor(contentHeight / lineHeight);

    // 当前页
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - marginTop;

    // 绘制页眉
    const drawHeader = (page: typeof currentPage, pageNum: number, totalPages: number) => {
      if (template.headerConfig.hasPageNumber) {
        const pageNumText = `第 ${pageNum} 页 / 共 ${totalPages} 页`;
        const fontSizeHeader = 9;

        let xPos: number;
        if (template.headerConfig.pageNumberPosition === 'bottom-right') {
          const textWidth = contentFont.widthOfTextAtSize(pageNumText, fontSizeHeader);
          xPos = pageWidth - marginRight - textWidth;
        } else {
          xPos = marginLeft;
        }

        page.drawText(pageNumText, {
          x: xPos,
          y: marginBottom / 2,
          size: fontSizeHeader,
          font: contentFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    };

    // 计算文本需要的页数
    const calculateTextPages = (text: string, titleLines: number = 0): number => {
      const plainText = this.stripHtml(text);
      const textLines = Math.ceil(plainText.length / charsPerLine);
      const totalLines = titleLines + textLines;
      return Math.ceil(totalLines / linesPerPage);
    };

    // 估算总页数
    let totalPages = 1;
    for (const section of magazine.sections) {
      for (const article of section.articles) {
        const titleLines = Math.ceil(article.title.length / charsPerLine);
        totalPages += calculateTextPages(article.content, titleLines);
      }
    }

    let currentPageNum = 1;

    // 遍历每个版块
    for (const section of magazine.sections) {
      // 版块标题
      yPosition -= lineHeight;
      if (yPosition < marginBottom + lineHeight * 2) {
        drawHeader(currentPage, currentPageNum, totalPages);
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - marginTop;
        currentPageNum++;
      }

      currentPage.drawText(section.name, {
        x: marginLeft,
        y: yPosition,
        size: fontSize + 2,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight * 1.5;

      // 遍历每个版块的文章
      for (const article of section.articles) {
        // 文章标题
        const titleText = article.title;
        const titleLines = this.wrapText(titleText, charsPerLine);

        for (const line of titleLines) {
          if (yPosition < marginBottom + lineHeight) {
            drawHeader(currentPage, currentPageNum, totalPages);
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - marginTop;
            currentPageNum++;
          }

          currentPage.drawText(line, {
            x: marginLeft,
            y: yPosition,
            size: template.styles.titleFontSize,
            font: titleFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= lineHeight;
        }

        yPosition -= lineHeight * 0.5;

        // 文章内容
        const plainContent = this.stripHtml(article.content);
        const contentLines = this.wrapText(plainContent, charsPerLine);

        for (const line of contentLines) {
          if (yPosition < marginBottom + lineHeight) {
            drawHeader(currentPage, currentPageNum, totalPages);
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - marginTop;
            currentPageNum++;
          }

          currentPage.drawText(line, {
            x: marginLeft,
            y: yPosition,
            size: fontSize,
            font: contentFont,
            color: rgb(0.2, 0.2, 0.2),
          });
          yPosition -= lineHeight;
        }

        // 段落间距
        yPosition -= template.styles.paragraphSpacing;
      }
    }

    // 添加最后一页的页码
    drawHeader(currentPage, currentPageNum, currentPageNum);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // 去除HTML标签
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 文本换行
  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // ==================== 文章管理额外方法（兼容现有控制器） ====================

  /**
   * 将文章分配到版块
   */
  async assignArticleToSection(articleId: string, sectionId: string) {
    return this.prisma.magazineArticle.update({
      where: { id: articleId },
      data: { sectionId },
    });
  }

  /**
   * 创建文章（通过版块）
   */
  async createArticle(data: {
    title: string;
    content: string;
    summary?: string;
    author?: string;
    images?: string[];
    sectionId: string;
  }) {
    const section = await this.prisma.magazineSection.findUnique({
      where: { id: data.sectionId },
      select: { magazineId: true },
    });
    if (!section) {
      throw new NotFoundException('版块不存在');
    }

    const maxOrderArticle = await this.prisma.magazineArticle.findFirst({
      where: { magazineId: section.magazineId, sectionId: data.sectionId },
      orderBy: { order: 'desc' },
    });

    const order = maxOrderArticle ? maxOrderArticle.order + 1 : 0;

    return this.prisma.magazineArticle.create({
      data: {
        title: data.title,
        content: data.content,
        summary: data.summary,
        author: data.author,
        images: data.images || [],
        sectionId: data.sectionId,
        magazineId: section.magazineId,
        order,
      },
    });
  }

  // ==================== AI功能存根（后续实现） ====================

  /**
   * AI分类所有文章 - 存根实现
   */
  async classifyArticles(magazineId: string) {
    this.logger.log(`classifyArticles called for magazine: ${magazineId}`);
    return [];
  }

  /**
   * 获取分类建议 - 存根实现
   */
  async getClassificationSuggestions(magazineId: string) {
    this.logger.log(`getClassificationSuggestions called for magazine: ${magazineId}`);
    return [];
  }

  /**
   * AI自动分配文章 - 存根实现
   */
  async autoAllocateArticles(magazineId: string) {
    this.logger.log(`autoAllocateArticles called for magazine: ${magazineId}`);
  }

  /**
   * 获取单篇文章的AI分类建议 - 存根实现
   */
  async getArticleSuggestion(articleId: string) {
    this.logger.log(`getArticleSuggestion called for article: ${articleId}`);
    return {
      suggestedSectionId: '',
      confidence: 0,
      reason: 'AI功能待实现',
    };
  }

  /**
   * 批量导入文章 - 存根实现
   */
  async importArticles(
    sectionId: string,
    articles: { title: string; content: string; summary?: string; author?: string }[],
  ) {
    const results = [];
    for (const articleData of articles) {
      const article = await this.prisma.magazineArticle.create({
        data: {
          title: articleData.title,
          content: articleData.content,
          summary: articleData.summary,
          author: articleData.author,
          sectionId,
          magazineId: '',
        },
      });
      results.push({ article, suggestion: null });
    }
    return results;
  }
}
