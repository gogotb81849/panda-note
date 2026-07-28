import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { LayoutEngine, MagazineTemplate, Article } from './layout-engine';

/**
 * 杂志预览服务
 * 生成低分辨率预览PDF，支持实时预览
 */
export class MagazinePreviewService {
  private layoutEngine: LayoutEngine;

  constructor() {
    this.layoutEngine = new LayoutEngine();
  }

  /**
   * 生成预览PDF（低分辨率，体积小）
   * @param magazine 杂志数据
   * @param options 预览选项
   * @returns 预览PDF Buffer
   */
  async generatePreview(
    magazine: {
      id: string;
      name: string;
      templateId: string;
      sections: Array<{
        id: string;
        name: string;
        layout: string;
        articles: Article[];
      }>;
    },
    options: {
      scale?: number;      // 缩放比例，默认0.5
      pages?: number[];    // 只生成指定页面，默认全部
    } = {}
  ): Promise<Buffer> {
    const { scale = 0.5, pages } = options;

    const pdfDoc = await PDFDocument.create();
    const template = this.getTemplate(magazine.templateId);

    // A4尺寸缩放预览
    const scaledWidth = 210 * scale;
    const scaledHeight = 297 * scale;

    // PDF单位转换（1mm = 2.834645669 points）
    const mmToPoints = 2.834645669;
    const pdfWidth = scaledWidth * mmToPoints;
    const pdfHeight = scaledHeight * mmToPoints;

    // 边距
    const marginTop = 20 * scale * mmToPoints;
    const marginBottom = 20 * scale * mmToPoints;
    const marginLeft = 25 * scale * mmToPoints;
    const marginRight = 25 * scale * mmToPoints;

    // 可用内容宽度
    const contentWidth = pdfWidth - marginLeft - marginRight;

    // 字体大小缩放
    const titleFontSize = template.styles.titleFontSize * scale;
    const contentFontSize = template.styles.contentFontSize * scale;
    const lineHeight = contentFontSize * template.styles.lineHeight;

    // 估算总页数
    let totalPages = 1;
    for (const section of magazine.sections) {
      for (const article of section.articles) {
        const sectionConfig = this.getSectionConfig(section.layout);
        totalPages += this.layoutEngine.estimatePageCount(
          { title: article.title, content: article.content },
          template,
          sectionConfig
        );
      }
    }

    // 遍历每个版块
    for (const section of magazine.sections) {
      for (const article of section.articles) {
        const articleData = {
          title: article.title,
          content: article.content,
          author: article.author,
          images: article.images || [],
        };

        const sectionConfig = this.getSectionConfig(section.layout);
        const pageBreaks = this.layoutEngine.paginate(articleData, template, sectionConfig);

        for (let i = 0; i < pageBreaks.length; i++) {
          const page = pdfDoc.addPage([pdfWidth, pdfHeight]);
          const pageNum = pdfDoc.getPageCount() - 1;

          // 只预览指定的页面
          if (pages && !pages.includes(pageNum)) {
            continue;
          }

          // 绘制页面内容
          await this.drawPagePreview(
            page,
            pageBreaks[i],
            pageNum + 1,
            totalPages,
            {
              marginLeft,
              marginTop,
              marginRight,
              marginBottom,
              contentWidth,
              pdfHeight,
              pdfWidth,
              titleFontSize,
              contentFontSize,
              lineHeight,
              scale,
              mmToPoints,
              template,
            }
          );
        }
      }
    }

    return Buffer.from(await pdfDoc.save());
  }

  /**
   * 绘制单页预览
   */
  private async drawPagePreview(
    page: any,
    pageBreak: {
      content: Array<{ type: string; text?: string }>;
      pageNumber: number;
    },
    currentPage: number,
    totalPages: number,
    options: {
      marginLeft: number;
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      contentWidth: number;
      pdfHeight: number;
      pdfWidth: number;
      titleFontSize: number;
      contentFontSize: number;
      lineHeight: number;
      scale: number;
      mmToPoints: number;
      template: MagazineTemplate;
    }
  ) {
    const {
      marginLeft,
      marginTop,
      marginRight,
      marginBottom,
      contentWidth,
      pdfHeight,
      pdfWidth,
      titleFontSize,
      contentFontSize,
      lineHeight,
      scale,
      template,
    } = options;

    // 嵌入字体
    const pdfDoc = page.doc;
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const contentFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = pdfHeight - marginTop;

    // 绘制页面内容
    for (const item of pageBreak.content) {
      if (item.type === 'title' && item.text) {
        // 绘制标题
        const titleLines = this.wrapText(item.text, Math.floor(contentWidth / (titleFontSize * 0.5)));
        for (const line of titleLines) {
          if (y < marginBottom + lineHeight) break;
          page.drawText(line, {
            x: marginLeft,
            y,
            size: titleFontSize,
            font: titleFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= lineHeight * 1.2;
        }
        y -= lineHeight * 0.5;
      } else if (item.type === 'text' && item.text) {
        // 绘制正文
        const charsPerLine = Math.floor(contentWidth / (contentFontSize * 0.5));
        const contentLines = this.wrapText(item.text, charsPerLine);

        for (const line of contentLines) {
          if (y < marginBottom + lineHeight) break;
          page.drawText(line, {
            x: marginLeft,
            y,
            size: contentFontSize,
            font: contentFont,
            color: rgb(0.3, 0.3, 0.3),
          });
          y -= lineHeight;
        }
        y -= template.styles.paragraphSpacing * scale;
      }
    }

    // 绘制页码
    if (template.headerConfig.hasPageNumber) {
      const pageNumText = `${currentPage} / ${totalPages}`;
      let xPos: number;

      if (template.headerConfig.pageNumberPosition === 'bottom-right') {
        const textWidth = contentFont.widthOfTextAtSize(pageNumText, 8 * scale);
        xPos = pdfWidth - marginRight - textWidth;
      } else {
        xPos = marginLeft;
      }

      page.drawText(pageNumText, {
        x: xPos,
        y: marginBottom / 2,
        size: 8 * scale,
        font: contentFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  /**
   * 获取模板
   */
  private getTemplate(templateId: string): MagazineTemplate {
    const templates: Record<string, MagazineTemplate> = {
      'business-classic': {
        id: 'business-classic',
        name: '简洁商务风',
        description: '经典简洁排版，适合政工期刊、工作简报',
        pageConfig: {
          width: 210,
          height: 297,
          margin: { top: 20, bottom: 20, left: 25, right: 25 },
        },
        headerConfig: {
          height: 15,
          hasPageNumber: true,
          pageNumberPosition: 'bottom-center',
        },
        styles: {
          titleFont: 'Helvetica-Bold',
          titleFontSize: 16,
          contentFont: 'Helvetica',
          contentFontSize: 10,
          lineHeight: 1.5,
          paragraphSpacing: 6,
        },
        sectionStyles: [{ name: 'default', layout: 'single-column' }],
      },
      'fresh-magazine': {
        id: 'fresh-magazine',
        name: '清新杂志风',
        description: '现代清新风格，适合内刊、文化手册',
        pageConfig: {
          width: 210,
          height: 297,
          margin: { top: 15, bottom: 15, left: 20, right: 20 },
        },
        headerConfig: {
          height: 20,
          hasPageNumber: true,
          pageNumberPosition: 'bottom-right',
        },
        styles: {
          titleFont: 'Helvetica-Bold',
          titleFontSize: 14,
          contentFont: 'Helvetica',
          contentFontSize: 9,
          lineHeight: 1.8,
          paragraphSpacing: 8,
        },
        sectionStyles: [{ name: 'default', layout: 'single-column' }],
      },
      'newspaper': {
        id: 'newspaper',
        name: '传统报纸风',
        description: '多栏排版，适合新闻类内容',
        pageConfig: {
          width: 210,
          height: 297,
          margin: { top: 12, bottom: 12, left: 10, right: 10 },
        },
        headerConfig: {
          height: 12,
          hasPageNumber: true,
          pageNumberPosition: 'bottom-center',
        },
        styles: {
          titleFont: 'Helvetica-Bold',
          titleFontSize: 12,
          contentFont: 'Helvetica',
          contentFontSize: 8,
          lineHeight: 1.4,
          paragraphSpacing: 4,
        },
        sectionStyles: [
          { name: 'news', layout: 'three-column' },
          { name: 'feature', layout: 'two-column' },
          { name: 'default', layout: 'single-column' },
        ],
      },
    };

    return templates[templateId] || templates['business-classic'];
  }

  /**
   * 获取版块配置
   */
  private getSectionConfig(layout: string): { name: string; layout: 'single-column' | 'two-column' | 'three-column'; columnWidth?: number } {
    const layoutMap: Record<string, 'single-column' | 'two-column' | 'three-column'> = {
      'single-column': 'single-column',
      'two-column': 'two-column',
      'three-column': 'three-column',
    };

    return {
      name: 'default',
      layout: layoutMap[layout] || 'single-column',
    };
  }

  /**
   * 去除HTML标签
   */
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

  /**
   * 文本换行
   */
  private wrapText(text: string, maxCharsPerLine: number): string[] {
    if (maxCharsPerLine <= 0) return [text];

    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // 中文字符宽度为1，英文为0.5
      const charWidth = /[\u4e00-\u9fa5]/.test(char) ? 1 : 0.5;
      const testLine = currentLine + char;

      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = char;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
