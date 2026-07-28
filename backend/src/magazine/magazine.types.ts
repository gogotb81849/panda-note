// 杂志模块类型定义
export interface PageConfig {
  width: number;      // mm (A4: 210)
  height: number;     // mm (A4: 297)
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface HeaderConfig {
  height: number;
  hasPageNumber: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right';
  backgroundColor?: string;
  titleColor?: string;
  fontSize?: number;
}

export interface MagazineStyles {
  titleFont: string;
  titleFontSize: number;
  contentFont: string;
  contentFontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
}

export interface MagazineTemplate {
  id: string;
  name: string;
  description: string;
  pageConfig: PageConfig;
  headerConfig: HeaderConfig;
  styles: MagazineStyles;
  sectionStyles: SectionStyle[];
  // 自定义样式（可选）
  customStyle?: TemplateStyle;
}

// 可配置的模板样式
export interface TemplateStyle {
  // 页面设置
  page: {
    width: number;        // mm (默认210 A4)
    height: number;       // mm (默认297 A4)
    margin: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    backgroundColor?: string;  // 背景色
    backgroundImage?: string; // 背景图片URL
  };
  
  // 封面设置
  cover?: {
    enabled: boolean;
    fullBleed: boolean;    // 无边距出血
    overlayColor?: string;   // 文字叠加层颜色
  };
  
  // 目录设置
  toc?: {
    enabled: boolean;
    style: 'dot' | 'number' | 'line';  // 点状/数字/线条
  };
  
  // 文字样式
  typography: {
    titleFont: string;           // 标题字体
    titleFontSize: number;       // 标题字号
    titleColor: string;          // 标题颜色
    titleAlignment: 'left' | 'center' | 'right';  // 标题对齐
    
    contentFont: string;          // 正文字体
    contentFontSize: number;     // 正文字号
    contentColor: string;        // 正文字色
    lineHeight: number;          // 行高
    
    authorFontSize: number;      // 作者字号
    authorColor: string;         // 作者颜色
    
    dropCap: boolean;            // 首字下沉
    dropCapFontSize?: number;    // 首字字号（默认正文的3倍）
  };
  
  // 区块样式
  blocks: {
    quote?: {
      enabled: boolean;
      borderColor: string;
      borderWidth: number;
      backgroundColor: string;
      padding: number;
    };
    code?: {
      enabled: boolean;
      backgroundColor: string;
      fontFamily: string;
    };
    image?: {
      captionFontSize: number;
      captionColor: string;
      borderRadius: number;     // 圆角
      shadow: boolean;
    };
  };
}

// 预设颜色方案
export const colorSchemes = [
  { id: 'classic-blue', name: '经典蓝', primary: '#1a365d', secondary: '#2c5282', accent: '#4299e1' },
  { id: 'elegant-green', name: '雅致绿', primary: '#234e52', secondary: '#285e61', accent: '#38b2ac' },
  { id: 'warm-orange', name: '暖心橙', primary: '#c05621', secondary: '#dd6b20', accent: '#ed8936' },
  { id: 'simple-gray', name: '简约灰', primary: '#2d3748', secondary: '#4a5568', accent: '#718096' },
  { id: 'fresh-pink', name: '清新粉', primary: '#702459', secondary: '#97266d', accent: '#d53f8c' },
];

// 预设字体组合
export const fontCombinations = [
  { id: 'serif-classic', title: '思源宋体', titleFont: 'SimSun', contentFont: 'SimSun' },
  { id: 'sans-modern', title: '思源黑体', titleFont: 'Microsoft YaHei', contentFont: 'Microsoft YaHei' },
  { id: 'hei-title', title: '黑体+宋体', titleFont: 'SimHei', contentFont: 'SimSun' },
  { id: 'kai-regular', title: '楷体+宋体', titleFont: 'KaiTi', contentFont: 'SimSun' },
];

// 增强的模板样式
export interface EnhancedTemplateStyle {
  // 首字下沉
  dropCap?: {
    enabled: boolean;
    fontSize?: number;     // 默认正文的3倍
    color?: string;
    lines?: number;        // 下沉行数，默认3
  };

  // 图文绕排
  imageWrap?: {
    defaultStyle: 'left' | 'right' | 'center' | 'full';
    margin: number;         // 图片与文字间距
    maxWidth: number;       // 图片最大宽度（相对于列宽）
    captionEnabled: boolean;
    captionFontSize: number;
  };

  // 引用区块
  quoteBlock?: {
    enabled: boolean;
    borderColor: string;
    borderWidth: number;
    backgroundColor: string;
    padding: number;
    showMark: boolean;     // 显示引号装饰
  };

  // 页眉页脚
  headerFooter?: {
    showHeader: boolean;
    headerText?: string;
    headerStyle: 'plain' | 'line' | 'shadow';

    showFooter: boolean;
    footerText?: string;
    showPageNumber: boolean;
    pageNumberFormat: 'current' | 'currentOfTotal' | 'simple';
  };

  // 分割线
  dividers?: {
    enabled: boolean;
    style: 'solid' | 'dashed' | 'dotted';
    color: string;
    thickness: number;
    spacing: number;        // 与上下内容的间距
  };

  // 目录样式
  tocStyle?: {
    enabled: boolean;
    showDots: boolean;
    indent: number;         // 缩进
    pageNumberAlign: 'right' | 'sameLine';  // 页码对齐方式
  };
}

export interface SectionStyle {
  name: string;
  columns?: number;
  hasDropCap?: boolean;
  hasImage?: boolean;
  enhancedStyle?: EnhancedTemplateStyle;
  layout: 'single-column' | 'two-column' | 'three-column';
  columnWidth?: number;
}

export interface CreateMagazineDto {
  name: string;
  templateId: string;
  totalPages?: number;
  coverImage?: string;
  teamCode?: string;
}

export interface AddArticleDto {
  title: string;
  content: string;
  author?: string;
  summary?: string;
  images?: string[];
  sectionId?: string;
}

export interface UpdateArticleDto {
  title?: string;
  content?: string;
  author?: string;
  summary?: string;
  images?: string[];
  sectionId?: string;
  order?: number;
}

export interface CreateSectionDto {
  name: string;
  layout?: 'single-column' | 'two-column' | 'three-column';
  pageStart?: number;
  pageEnd?: number;
}

export interface UpdateSectionDto {
  name?: string;
  layout?: 'single-column' | 'two-column' | 'three-column';
  pageStart?: number;
  pageEnd?: number;
  order?: number;
}

// 预置杂志模板
export const MAGAZINE_TEMPLATES: MagazineTemplate[] = [
  {
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
    sectionStyles: [
      { name: 'default', hasDropCap: false, hasImage: false, layout: 'single-column' }
    ]
  },
  {
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
    sectionStyles: [
      { name: 'default', hasDropCap: true, hasImage: true, layout: 'single-column' }
    ]
  },
  {
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
      { name: 'news', columns: 3, hasImage: true, layout: 'three-column' },
      { name: 'feature', columns: 2, hasImage: true, layout: 'two-column' },
      { name: 'default', columns: 1, hasImage: false, layout: 'single-column' }
    ]
  },
];
