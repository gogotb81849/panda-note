// 杂志页面配置
export interface PageConfig {
  width: number;      // 页面宽度 (mm)
  height: number;     // 页面高度 (mm)
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// 杂志头部配置
export interface HeaderConfig {
  height: number;
  hasPageNumber: boolean;
  pageNumberPosition: 'top-center' | 'bottom-center' | 'bottom-right';
  backgroundColor?: string;
  titleColor?: string;
  fontSize?: number;
}

// 杂志样式配置
export interface MagazineStyles {
  titleFont: string;
  titleFontSize: number;
  contentFont: string;
  contentFontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
}

// 版块样式
export interface SectionStyle {
  name: string;
  layout: 'single-column' | 'two-column' | 'three-column';
  columnWidth?: number;
}

// 杂志模板
export interface MagazineTemplate {
  id: string;
  name: string;
  description: string;
  pageConfig: PageConfig;
  headerConfig: HeaderConfig;
  styles: MagazineStyles;
  sectionStyles: SectionStyle[];
}

// 文章数据
export interface Article {
  title: string;
  content: string;
  author?: string;
  date?: string;
  images?: string[];
}

// 页面断点
export interface PageBreak {
  content: Array<{
    type: 'title' | 'text' | 'image' | 'dropcap';
    text?: string;
    url?: string;
  }>;
  currentHeight: number;
  pageNumber: number;
}

// 智能排版引擎
export class LayoutEngine {
  
  // 计算文本占用高度
  calculateTextHeight(
    text: string,
    fontSize: number,
    lineHeight: number,
    columnWidth: number
  ): number {
    // 每行字符数（根据字体大小和列宽计算）
    // 中文字符宽度约为字号的0.5-0.6倍
    const avgCharWidth = fontSize * 0.55;
    const charsPerLine = Math.floor(columnWidth / avgCharWidth);
    
    // 总行数
    const lines = Math.ceil(text.length / charsPerLine);
    
    // 占用高度
    return lines * fontSize * lineHeight;
  }
  
  // 计算图片占用高度
  calculateImageHeight(
    imageWidth: number,
    imageHeight: number,
    columnWidth: number,
    maxHeight: number = 100
  ): number {
    // 按列宽等比缩放
    const ratio = imageHeight / imageWidth;
    let height = columnWidth * ratio;
    
    // 限制最大高度
    return Math.min(height, maxHeight);
  }
  
  // 提取段落
  private extractParagraphs(content: string): string[] {
    return content
      .split(/[\n\n]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  // 分页算法（对标行业主流）
  paginate(
    article: Article,
    template: MagazineTemplate,
    sectionConfig: SectionStyle
  ): PageBreak[] {
    const pages: PageBreak[] = [];
    const columnWidth = sectionConfig.columnWidth || 
                        (template.pageConfig.width - template.pageConfig.margin.left - template.pageConfig.margin.right);
    
    const pageHeight = template.pageConfig.height - 
                       template.pageConfig.margin.top - 
                       template.pageConfig.margin.bottom -
                       (template.headerConfig?.height || 0);
    
    let currentPage = {
      content: [] as Array<{ type: 'title' | 'text' | 'image' | 'dropcap'; text?: string; url?: string }>,
      currentHeight: 0,
      pageNumber: 1,
    };
    
    // 1. 处理标题
    const titleHeight = this.calculateTextHeight(
      article.title,
      template.styles.titleFontSize,
      template.styles.lineHeight,
      columnWidth
    );
    
    if (currentPage.currentHeight + titleHeight > pageHeight) {
      pages.push({ ...currentPage });
      currentPage = { content: [], currentHeight: 0, pageNumber: currentPage.pageNumber + 1 };
    }
    currentPage.content.push({ type: 'title', text: article.title });
    currentPage.currentHeight += titleHeight + 10; // 标题后间距
    
    // 2. 处理正文（按段落）
    const paragraphs = this.extractParagraphs(article.content);
    for (const para of paragraphs) {
      const paraHeight = this.calculateTextHeight(
        para,
        template.styles.contentFontSize,
        template.styles.lineHeight,
        columnWidth
      );
      
      // 检查是否需要分页
      if (currentPage.currentHeight + paraHeight > pageHeight) {
        // 避免在段落中间分页（至少保留一行）
        if (paraHeight > pageHeight * 0.3) {
          // 大段落：尝试找到合适的断点
          const breakResult = this.findBestBreakPoint(
            para, 
            pageHeight - currentPage.currentHeight,
            template,
            columnWidth
          );
          currentPage.content.push({ type: 'text', text: breakResult.before });
          pages.push({ ...currentPage });
          
          currentPage = { 
            content: [{ type: 'text', text: breakResult.after }], 
            currentHeight: this.calculateTextHeight(breakResult.after, template.styles.contentFontSize, template.styles.lineHeight, columnWidth),
            pageNumber: currentPage.pageNumber + 1 
          };
        } else {
          // 小段落：直接分页
          pages.push({ ...currentPage });
          currentPage = { 
            content: [{ type: 'text', text: para }], 
            currentHeight: paraHeight,
            pageNumber: currentPage.pageNumber + 1 
          };
        }
      } else {
        currentPage.content.push({ type: 'text', text: para });
        currentPage.currentHeight += paraHeight + template.styles.paragraphSpacing;
      }
    }
    
    // 3. 处理图片
    if (article.images && article.images.length > 0) {
      for (const imageUrl of article.images) {
        const imageHeight = this.calculateImageHeight(
          800, 600, // 假设图片尺寸
          columnWidth
        );
        
        if (currentPage.currentHeight + imageHeight > pageHeight) {
          pages.push({ ...currentPage });
          currentPage = { 
            content: [{ type: 'image', url: imageUrl }], 
            currentHeight: imageHeight,
            pageNumber: currentPage.pageNumber + 1 
          };
        } else {
          currentPage.content.push({ type: 'image', url: imageUrl });
          currentPage.currentHeight += imageHeight + 5;
        }
      }
    }
    
    // 4. 添加最后一页
    if (currentPage.content.length > 0) {
      pages.push(currentPage);
    }
    
    return pages;
  }
  
  // 找到最佳断点（避免孤立行）
  private findBestBreakPoint(
    text: string, 
    maxHeight: number,
    template: MagazineTemplate,
    columnWidth: number
  ): { before: string; after: string } {
    const maxChars = this.estimateCharsForHeight(maxHeight, template, columnWidth);
    
    // 从后往前找标点符号断点
    let breakIndex = maxChars;
    const breakPoints = ['。', '！', '？', '；', '\n'];
    
    for (let i = maxChars; i < text.length; i++) {
      if (breakPoints.includes(text[i])) {
        breakIndex = i + 1;
        break;
      }
    }
    
    // 如果找不到合适的断点，至少保证不是最后一个字
    if (breakIndex >= text.length - 1) {
      breakIndex = maxChars;
    }
    
    return {
      before: text.substring(0, breakIndex),
      after: text.substring(breakIndex),
    };
  }
  
  private estimateCharsForHeight(height: number, template: MagazineTemplate, columnWidth: number): number {
    const lines = Math.floor(height / (template.styles.contentFontSize * template.styles.lineHeight));
    const charsPerLine = Math.floor(columnWidth / (template.styles.contentFontSize * 0.55));
    return lines * charsPerLine;
  }
  
  // 估算总页数
  estimatePageCount(
    article: Article,
    template: MagazineTemplate,
    sectionConfig: SectionStyle
  ): number {
    const pages = this.paginate(article, template, sectionConfig);
    return pages.length;
  }

  // ========== 增强排版功能 ==========

  // 绘制首字下沉
  drawDropCap(
    page: any,
    text: string,
    options: {
      x: number;
      y: number;
      fontSize: number;
      fontColor: string;
      lines: number;
    }
  ): { offsetX: number; offsetY: number } {
    const { x, y, fontSize, fontColor, lines } = options;

    // 绘制首字
    page.drawText(text[0], {
      x,
      y: y - fontSize * 3,  // PDF坐标系，首字放大3倍
      size: fontSize * 3,
      color: fontColor,
    });

    // 后续文字从首字右侧开始
    return {
      offsetX: fontSize * 1.5,  // 首字宽度
      offsetY: fontSize * (lines - 1),  // 跳过下沉行
    };
  }

  // 绘制图文绕排
  drawImageWithWrap(
    page: any,
    imageData: Uint8Array,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
      wrapStyle: 'left' | 'right' | 'center' | 'full';
      margin: number;
    }
  ): { textX?: number; textWidth?: number; newY: number } {
    const { x, y, width, height, wrapStyle, margin } = options;

    // 嵌入图片
    const image = page.doc.embedPNG(imageData);

    if (wrapStyle === 'full') {
      // 全宽图片
      page.drawImage(image, { x, y, width, height });
      return { newY: y - height };
    }

    // 带绕排的图片
    page.drawImage(image, { x, y, width, height });

    // 返回文本区域（扣除图片占用区域）
    if (wrapStyle === 'left') {
      return {
        textX: x + width + margin,
        textWidth: page.width - x - width - margin * 2,
        newY: y - height,
      };
    } else if (wrapStyle === 'right') {
      return {
        textX: page.marginLeft,
        textWidth: x - page.marginLeft - margin,
        newY: y - height,
      };
    }

    return { newY: y - height };
  }

  // 绘制引用区块
  drawQuoteBlock(
    page: any,
    text: string,
    options: {
      x: number;
      y: number;
      width: number;
      borderColor: string;
      backgroundColor: string;
      padding: number;
      showMark: boolean;
    }
  ): { newY: number } {
    const { x, y, width, borderColor, backgroundColor, padding, showMark } = options;
    const blockHeight = this.calculateTextHeight(text, 10, 1.5, width - padding * 2);

    // 绘制背景
    page.drawRectangle({
      x,
      y: y - blockHeight - padding * 2,
      width,
      height: blockHeight + padding * 2,
      color: backgroundColor,
    });

    // 绘制左边框
    page.drawRectangle({
      x,
      y: y - blockHeight - padding * 2,
      width: 3,
      height: blockHeight + padding * 2,
      color: borderColor,
    });

    // 绘制引号装饰
    if (showMark) {
      page.drawText('"', {
        x: x + padding,
        y: y - padding,
        size: 24,
        color: borderColor,
      });
    }

    // 绘制文字
    this.drawText(page, text, {
      x: x + padding + (showMark ? 10 : 0),
      y: y - padding - 10,
      width: width - padding * 2 - (showMark ? 15 : 0),
      fontSize: 10,
      lineHeight: 1.5,
    });

    return { newY: y - blockHeight - padding * 2 };
  }

  // 绘制页眉页脚
  drawHeaderFooter(
    page: any,
    options: {
      headerText?: string;
      headerAlign: 'left' | 'center' | 'right';
      footerText?: string;
      footerAlign: 'left' | 'center' | 'right';
      pageNumber: number;
      totalPages: number;
    }
  ): void {
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    // 页眉
    if (options.headerText) {
      const x = options.headerAlign === 'left' ? 20 :
                options.headerAlign === 'right' ? pageWidth - 20 : pageWidth / 2;

      page.drawText(options.headerText, {
        x,
        y: pageHeight - 15,
        size: 9,
        color: '#666666',
        align: options.headerAlign,
      });
    }

    // 页脚（包含页码）
    const footerText = options.footerText || `第 ${options.pageNumber} 页 / 共 ${options.totalPages} 页`;
    const footerX = options.footerAlign === 'left' ? 20 :
                     options.footerAlign === 'right' ? pageWidth - 20 : pageWidth / 2;

    page.drawText(footerText, {
      x: footerX,
      y: 15,
      size: 9,
      color: '#666666',
      align: options.footerAlign,
    });
  }

  // 绘制分割线
  drawDivider(
    page: any,
    options: {
      x: number;
      y: number;
      width: number;
      style: 'solid' | 'dashed' | 'dotted';
      color: string;
      thickness: number;
    }
  ): void {
    const { x, y, width, style, color, thickness } = options;

    if (style === 'solid') {
      page.drawLine({
        start: { x, y },
        end: { x: x + width, y },
        thickness,
        color,
      });
    } else if (style === 'dashed') {
      // 虚线：画若干短线段
      const dashLength = 5;
      const gapLength = 3;
      let currentX = x;

      while (currentX < x + width) {
        page.drawLine({
          start: { x: currentX, y },
          end: { x: Math.min(currentX + dashLength, x + width), y },
          thickness,
          color,
        });
        currentX += dashLength + gapLength;
      }
    } else if (style === 'dotted') {
      // 点线：画若干短点
      const dotLength = 1;
      const gapLength = 3;
      let currentX = x;

      while (currentX < x + width) {
        page.drawLine({
          start: { x: currentX, y },
          end: { x: Math.min(currentX + dotLength, x + width), y },
          thickness,
          color,
        });
        currentX += dotLength + gapLength;
      }
    }
  }

  // 绘制文本（辅助方法）
  private drawText(
    page: any,
    text: string,
    options: {
      x: number;
      y: number;
      width: number;
      fontSize: number;
      lineHeight: number;
    }
  ): void {
    const { x, y, width, fontSize, lineHeight } = options;
    const charsPerLine = Math.floor(width / (fontSize * 0.55));
    const lines = Math.ceil(text.length / charsPerLine);

    page.drawText(text, {
      x,
      y: y - lines * fontSize * lineHeight,
      size: fontSize,
      lineHeight: fontSize * lineHeight,
      width,
    });
  }

  // ========== 智能排版增强功能 ==========

  // 文章结构分析结果
  analyzeArticleStructure(article: Article): {
    title: string;
    paragraphs: Array<{
      type: 'heading' | 'text' | 'quote' | 'list';
      level?: number;
      content: string;
    }>;
    estimatedReadingTime: number;
    wordCount: number;
  } {
    const paragraphs: Array<{
      type: 'heading' | 'text' | 'quote' | 'list';
      level?: number;
      content: string;
    }> = [];

    const rawParagraphs = article.content
      .split(/[\n\n]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    let wordCount = article.title.length;

    for (const para of rawParagraphs) {
      wordCount += para.length;
      
      if (/^#{1,3}\s+/.test(para)) {
        const level = para.match(/^#+/)?.[0].length || 1;
        const content = para.replace(/^#{1,3}\s+/, '');
        paragraphs.push({ type: 'heading', level, content });
      } else if (/^[>＞]/.test(para)) {
        const content = para.replace(/^[>＞]\s*/, '');
        paragraphs.push({ type: 'quote', content });
      } else if (/^[\d一二三四五六七八九十]+[.、．]/.test(para) || /^[-•·]/.test(para)) {
        paragraphs.push({ type: 'list', content: para });
      } else {
        paragraphs.push({ type: 'text', content: para });
      }
    }

    const estimatedReadingTime = Math.ceil(wordCount / 300);

    return {
      title: article.title,
      paragraphs,
      estimatedReadingTime,
      wordCount,
    };
  }

  // 智能图片放置算法
  smartImagePlacement(
    article: Article,
    template: MagazineTemplate,
    sectionConfig: SectionStyle
  ): Array<{
    imageUrl: string;
    position: 'top' | 'middle' | 'bottom' | 'left' | 'right' | 'full';
    pageIndex: number;
    wrapStyle: 'left' | 'right' | 'center' | 'full';
  }> {
    const result: Array<{
      imageUrl: string;
      position: 'top' | 'middle' | 'bottom' | 'left' | 'right' | 'full';
      pageIndex: number;
      wrapStyle: 'left' | 'right' | 'center' | 'full';
    }> = [];

    if (!article.images || article.images.length === 0) {
      return result;
    }

    const structure = this.analyzeArticleStructure(article);
    const pages = this.paginate(article, template, sectionConfig);
    const totalPages = pages.length;

    article.images.forEach((imageUrl, index) => {
      const pageIndex = Math.min(
        Math.floor((index + 0.5) * (totalPages / article.images!.length)),
        totalPages - 1
      );

      let position: 'top' | 'middle' | 'bottom' | 'left' | 'right' | 'full';
      let wrapStyle: 'left' | 'right' | 'center' | 'full';

      if (index === 0) {
        position = 'top';
        wrapStyle = 'full';
      } else if (index % 3 === 1) {
        position = 'right';
        wrapStyle = 'right';
      } else if (index % 3 === 2) {
        position = 'left';
        wrapStyle = 'left';
      } else {
        position = 'middle';
        wrapStyle = 'center';
      }

      result.push({
        imageUrl,
        position,
        pageIndex,
        wrapStyle,
      });
    });

    return result;
  }

  // 智能分页（避免孤立行/寡妇行）
  smartPaginate(
    article: Article,
    template: MagazineTemplate,
    sectionConfig: SectionStyle
  ): PageBreak[] {
    const pages = this.paginate(article, template, sectionConfig);
    
    if (pages.length <= 1) {
      return pages;
    }

    const columnWidth = sectionConfig.columnWidth || 
      (template.pageConfig.width - template.pageConfig.margin.left - template.pageConfig.margin.right);

    const processedPages: PageBreak[] = [];

    for (let i = 0; i < pages.length; i++) {
      const currentPage = pages[i];
      const nextPage = pages[i + 1];

      if (!nextPage) {
        processedPages.push(currentPage);
        continue;
      }

      const lastItem = currentPage.content[currentPage.content.length - 1];
      const firstItem = nextPage.content[0];

      if (lastItem?.type === 'text' && firstItem?.type === 'text') {
        const lastText = lastItem.text || '';
        const firstText = firstItem.text || '';

        const lastLineCount = this.estimateLineCount(lastText, template.styles.contentFontSize, columnWidth);
        const firstLineCount = this.estimateLineCount(firstText, template.styles.contentFontSize, columnWidth);

        if (lastLineCount <= 2) {
          continue;
        }

        if (firstLineCount <= 2 && currentPage.currentHeight < this.getPageContentHeight(template) * 0.85) {
          const combinedHeight = this.calculateTextHeight(
            lastText + firstText,
            template.styles.contentFontSize,
            template.styles.lineHeight,
            columnWidth
          );

          const availableSpace = this.getPageContentHeight(template) - currentPage.currentHeight;

          if (combinedHeight <= availableSpace + template.styles.paragraphSpacing) {
            currentPage.content[currentPage.content.length - 1] = {
              type: 'text',
              text: lastText + firstText,
            };
            currentPage.currentHeight = currentPage.currentHeight - 
              this.calculateTextHeight(lastText, template.styles.contentFontSize, template.styles.lineHeight, columnWidth) +
              combinedHeight;

            nextPage.content.shift();
            
            if (nextPage.content.length === 0) {
              pages.splice(i + 1, 1);
              i--;
            } else {
              nextPage.currentHeight = this.calculatePageContentHeight(nextPage, template, columnWidth);
            }
          }
        }
      }

      processedPages.push(currentPage);
    }

    return processedPages.length > 0 ? processedPages : pages;
  }

  // 估算行数
  private estimateLineCount(text: string, fontSize: number, columnWidth: number): number {
    const avgCharWidth = fontSize * 0.55;
    const charsPerLine = Math.floor(columnWidth / avgCharWidth);
    return Math.ceil(text.length / charsPerLine);
  }

  // 获取页面内容高度
  private getPageContentHeight(template: MagazineTemplate): number {
    return template.pageConfig.height - 
      template.pageConfig.margin.top - 
      template.pageConfig.margin.bottom -
      (template.headerConfig?.height || 0);
  }

  // 计算页面内容总高度
  private calculatePageContentHeight(
    page: PageBreak,
    template: MagazineTemplate,
    columnWidth: number
  ): number {
    let height = 0;
    for (const item of page.content) {
      if (item.type === 'title') {
        height += this.calculateTextHeight(
          item.text || '',
          template.styles.titleFontSize,
          template.styles.lineHeight,
          columnWidth
        ) + 10;
      } else if (item.type === 'text') {
        height += this.calculateTextHeight(
          item.text || '',
          template.styles.contentFontSize,
          template.styles.lineHeight,
          columnWidth
        ) + template.styles.paragraphSpacing;
      } else if (item.type === 'image') {
        height += this.calculateImageHeight(800, 600, columnWidth) + 5;
      }
    }
    return height;
  }

  // 自动排版入口
  autoLayout(
    article: Article,
    template: MagazineTemplate,
    sectionConfig: SectionStyle
  ): {
    pages: PageBreak[];
    imagePlacements: Array<{
      imageUrl: string;
      position: string;
      pageIndex: number;
      wrapStyle: string;
    }>;
    structure: any;
  } {
    const structure = this.analyzeArticleStructure(article);
    const pages = this.smartPaginate(article, template, sectionConfig);
    const imagePlacements = this.smartImagePlacement(article, template, sectionConfig);

    return {
      pages,
      imagePlacements,
      structure,
    };
  }
}

// 页面断点定义
export interface PageBreakResult {
  pages: PageBreak[];
  totalPages: number;
}
