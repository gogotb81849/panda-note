import { Injectable } from '@nestjs/common';
import { 
  MagazineTemplate, 
  PageConfig, 
  HeaderConfig, 
  MagazineStyles, 
  SectionStyle,
  colorSchemes,
  fontCombinations,
  TemplateStyle
} from './magazine.types';

// 预置模板配置
const presetTemplates: MagazineTemplate[] = [
  // 模板1：简约商务风
  {
    id: 'simple-business',
    name: '简约商务风',
    description: '简洁大方，适合正式场合使用',
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
      titleFontSize: 14,
      contentFont: 'Helvetica',
      contentFontSize: 10,
      lineHeight: 1.5,
      paragraphSpacing: 6,
    },
    sectionStyles: [
      { name: '默认', layout: 'single-column' },
    ],
  },
  // 模板2：活力橙
  {
    id: 'vibrant-orange',
    name: '活力橙',
    description: '橙色主调，充满活力，适合团建活动',
    pageConfig: {
      width: 210,
      height: 297,
      margin: { top: 20, bottom: 20, left: 25, right: 25 },
    },
    headerConfig: {
      height: 20,
      hasPageNumber: true,
      pageNumberPosition: 'bottom-right',
      backgroundColor: '#ff6600',
      titleColor: '#ffffff',
      fontSize: 12,
    },
    styles: {
      titleFont: 'Helvetica-Bold',
      titleFontSize: 16,
      contentFont: 'Helvetica',
      contentFontSize: 10,
      lineHeight: 1.6,
      paragraphSpacing: 8,
    },
    sectionStyles: [
      { name: '默认', layout: 'two-column' },
    ],
  },
  // 模板3：清新绿
  {
    id: 'fresh-green',
    name: '清新绿',
    description: '绿色清新风格，适合安全宣传',
    pageConfig: {
      width: 210,
      height: 297,
      margin: { top: 20, bottom: 20, left: 25, right: 25 },
    },
    headerConfig: {
      height: 18,
      hasPageNumber: true,
      pageNumberPosition: 'bottom-center',
      backgroundColor: '#52c41a',
      titleColor: '#ffffff',
      fontSize: 12,
    },
    styles: {
      titleFont: 'Helvetica-Bold',
      titleFontSize: 15,
      contentFont: 'Helvetica',
      contentFontSize: 10,
      lineHeight: 1.5,
      paragraphSpacing: 6,
    },
    sectionStyles: [
      { name: '默认', layout: 'single-column' },
    ],
  },
  // 模板4：节日特刊风
  {
    id: 'festival-special',
    name: '节日特刊风',
    description: '适合春节、国庆等节日特刊，大标题醒目',
    pageConfig: {
      width: 210,
      height: 297,
      margin: { top: 25, bottom: 25, left: 30, right: 30 },
    },
    headerConfig: {
      height: 40,
      hasPageNumber: true,
      pageNumberPosition: 'bottom-center',
      backgroundColor: '#c41e3a',
      titleColor: '#ffd700',
      fontSize: 24,
    },
    styles: {
      titleFont: 'Helvetica-Bold',
      titleFontSize: 20,
      contentFont: 'Helvetica',
      contentFontSize: 11,
      lineHeight: 1.6,
      paragraphSpacing: 8,
    },
    sectionStyles: [
      { name: '默认', layout: 'single-column' },
    ],
  },
  // 模板5：安全生产风
  {
    id: 'safety-special',
    name: '安全生产风',
    description: '适合安全月、活动专刊，橙红色调警示',
    pageConfig: {
      width: 210,
      height: 297,
      margin: { top: 20, bottom: 20, left: 25, right: 25 },
    },
    headerConfig: {
      height: 30,
      hasPageNumber: true,
      pageNumberPosition: 'bottom-center',
      backgroundColor: '#ff6600',
      titleColor: '#ffffff',
      fontSize: 18,
    },
    styles: {
      titleFont: 'Helvetica-Bold',
      titleFontSize: 14,
      contentFont: 'Helvetica',
      contentFontSize: 10,
      lineHeight: 1.5,
      paragraphSpacing: 6,
    },
    sectionStyles: [
      { name: '默认', layout: 'single-column' },
    ],
  },
];

@Injectable()
export class TemplateService {
  
  // 获取所有模板
  getAllTemplates(): MagazineTemplate[] {
    return presetTemplates;
  }
  
  // 获取模板详情
  getTemplate(id: string): MagazineTemplate | null {
    return presetTemplates.find(t => t.id === id) || null;
  }
  
  // 创建自定义模板
  createCustomTemplate(config: Partial<MagazineTemplate>): MagazineTemplate {
    const template: MagazineTemplate = {
      id: `custom-${Date.now()}`,
      name: config.name || '自定义模板',
      description: config.description || '',
      pageConfig: config.pageConfig || { 
        width: 210, 
        height: 297, 
        margin: { top: 20, bottom: 20, left: 25, right: 25 } 
      },
      headerConfig: config.headerConfig || { 
        height: 15, 
        hasPageNumber: true, 
        pageNumberPosition: 'bottom-center' 
      },
      styles: config.styles || { 
        titleFont: 'Helvetica-Bold', 
        titleFontSize: 14, 
        contentFont: 'Helvetica', 
        contentFontSize: 10, 
        lineHeight: 1.5, 
        paragraphSpacing: 6 
      },
      sectionStyles: config.sectionStyles || [],
    };
    
    presetTemplates.push(template);
    return template;
  }
  
  // 更新模板
  updateTemplate(id: string, config: Partial<MagazineTemplate>): MagazineTemplate | null {
    const index = presetTemplates.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    presetTemplates[index] = { ...presetTemplates[index], ...config };
    return presetTemplates[index];
  }
  
  // 删除自定义模板
  deleteTemplate(id: string): boolean {
    const index = presetTemplates.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    // 不允许删除预置模板
    if (!id.startsWith('custom-')) return false;
    
    presetTemplates.splice(index, 1);
    return true;
  }
  
  // 获取指定布局的模板
  getTemplatesByLayout(layout: 'single-column' | 'two-column' | 'three-column'): MagazineTemplate[] {
    return presetTemplates.filter(t => 
      t.sectionStyles.some(s => s.layout === layout)
    );
  }

  // 生成模板预览（缩略图）
  async generateTemplatePreview(template: MagazineTemplate): Promise<string> {
    // 生成缩略图的HTML内容
    const previewHtml = this.generatePreviewHtml(template);
    
    // 返回HTML内容（前端可使用iframe或其他方式渲染）
    // 实际项目中可使用 puppeteer 等工具生成图片
    return Buffer.from(previewHtml).toString('base64');
  }

  // 生成预览HTML
  private generatePreviewHtml(template: MagazineTemplate): string {
    const { pageConfig, styles, customStyle } = template;
    const bgColor = customStyle?.page?.backgroundColor || '#ffffff';
    const titleColor = customStyle?.typography?.titleColor || '#333333';
    const contentColor = customStyle?.typography?.contentColor || '#666666';
    const titleFont = customStyle?.typography?.titleFont || styles.titleFont;
    const titleSize = customStyle?.typography?.titleFontSize || styles.titleFontSize;
    const contentFont = customStyle?.typography?.contentFont || styles.contentFont;
    const contentSize = customStyle?.typography?.contentFontSize || styles.contentFontSize;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: #f0f0f0;
      font-family: sans-serif;
    }
    .preview-container {
      width: ${pageConfig.width * 0.3}px;
      height: ${pageConfig.height * 0.3}px;
      background-color: ${bgColor};
      margin: 0 auto;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: ${pageConfig.margin.top * 0.3}px;
      box-sizing: border-box;
    }
    .preview-title {
      font-family: ${titleFont};
      font-size: ${titleSize * 0.3}px;
      color: ${titleColor};
      margin-bottom: 8px;
    }
    .preview-content {
      font-family: ${contentFont};
      font-size: ${contentSize * 0.3}px;
      color: ${contentColor};
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-title">${template.name}</div>
    <div class="preview-content">
      <p>这是示例正文内容，用于预览模板效果。</p>
      <p>第二段正文内容展示。</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  // 获取可用的样式选项
  getStyleOptions(): {
    colorSchemes: typeof colorSchemes;
    fontCombinations: typeof fontCombinations;
    layoutOptions: string[];
  } {
    return {
      colorSchemes,
      fontCombinations,
      layoutOptions: ['single-column', 'two-column', 'three-column'],
    };
  }
}
