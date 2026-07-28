import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import { marked } from 'marked';

@Injectable()
export class ArticleParserService {
  
  // 解析Word文档
  async parseWord(buffer: Buffer): Promise<{
    title: string;
    content: string;  // HTML格式
    plainText: string;
    images: string[];
    author?: string;
  }> {
    // 1. 提取文本和HTML
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    const messages = result.messages;
    
    // 2. 提取纯文本（用于AI分析）
    const textResult = await mammoth.extractRawText({ buffer });
    const plainText = textResult.value;
    
    // 3. 提取标题（文档第一行或从内容中提取）
    const title = this.extractTitle(plainText);
    
    // 4. 提取图片（Base64或远程URL）
    const images = this.extractImages(html);
    
    // 5. 清理HTML
    const cleanHtml = this.cleanHtml(html);
    
    return {
      title,
      content: cleanHtml,
      plainText,
      images,
    };
  }
  
  // 解析Markdown
  async parseMarkdown(content: string): Promise<{
    title: string;
    content: string;  // HTML格式
    plainText: string;
    images: string[];
  }> {
    // 1. 解析Markdown
    const html = await marked(content);
    
    // 2. 提取纯文本
    const plainText = content;
    
    // 3. 提取标题
    const title = this.extractTitle(plainText);
    
    // 4. 提取图片
    const images = this.extractImagesFromMarkdown(content);
    
    return {
      title,
      content: html,
      plainText,
      images,
    };
  }

  // 解析纯文本
  async parseTxt(content: string): Promise<{
    title: string;
    content: string;
    plainText: string;
    images: string[];
  }> {
    const title = this.extractTitle(content);
    return {
      title,
      content: `<p>${content.replace(/\n/g, '</p><p>')}</p>`,
      plainText: content,
      images: [],
    };
  }
  
  // 从文本中提取标题
  private extractTitle(text: string): string {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '无标题';
    
    // 取第一行作为标题
    let title = lines[0].trim();
    
    // 移除常见的标题前缀
    title = title.replace(/^(#+\s*|题[:：]\s*)/, '');
    
    // 限制长度
    if (title.length > 50) {
      title = title.substring(0, 50) + '...';
    }
    
    return title || '无标题';
  }
  
  // 从HTML中提取图片
  private extractImages(html: string): string[] {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const images: string[] = [];
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    return images;
  }
  
  // 从Markdown中提取图片
  private extractImagesFromMarkdown(markdown: string): string[] {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
    const images: string[] = [];
    let match;
    
    while ((match = imgRegex.exec(markdown)) !== null) {
      images.push(match[2]);
    }
    
    return images;
  }
  
  // 清理HTML
  private cleanHtml(html: string): string {
    return html
      .replace(/<p[^>]*>\s*<\/p>/gi, '')  // 移除空段落
      .replace(/\s+/g, ' ')                 // 合并空格
      .trim();
  }
}