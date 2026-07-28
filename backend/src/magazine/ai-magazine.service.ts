import { Injectable, Logger, BadRequestException, GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { LayoutEngine, MagazineTemplate, Article, SectionStyle, PageBreak } from './layout-engine';
import { TemplateService } from './template.service';

// AI文章分类结果
export interface ClassificationResult {
  articleId: string;
  suggestedSectionId: string;
  confidence: number;
  reason: string;
}

// AI排版建议响应
interface LayoutSuggestion {
  suggestedLayout: 'single-column' | 'two-column' | 'three-column';
  suggestedFontSize: number;
  hasDropCap: boolean;
  imagePosition: 'left' | 'right' | 'center';
  reason: string;
}

// AI标题生成响应
interface TitleGenerationResult {
  titles: string[];
  reason: string;
}

@Injectable()
export class AIMagazineService {
  private readonly logger = new Logger(AIMagazineService.name);
  private readonly layoutEngine: LayoutEngine;
  
  // AI配置
  private readonly API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly API_KEY = process.env.AI_API_KEY;
  private readonly ENDPOINT_ID = process.env.AI_ENDPOINT_ID;

  constructor(private templateService: TemplateService) {
    this.layoutEngine = new LayoutEngine();
  }

  // 调用AI
  private async callAI(prompt: string): Promise<string> {
    if (!this.API_KEY || !this.ENDPOINT_ID) {
      throw new BadRequestException('AI服务未配置，请在.env文件中设置AI_API_KEY和AI_ENDPOINT_ID');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          model: this.ENDPOINT_ID,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的杂志编辑助手，擅长生成吸引人的标题和提供排版建议。',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.logger.error('调用AI失败', error);
      if (error.name === 'AbortError') {
        throw new GatewayTimeoutException('AI服务响应超时，请稍后重试');
      }
      throw new ServiceUnavailableException(`网络连接失败：${error.message || '未知错误'}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      this.logger.error(`API调用失败: ${response.status}`);
      throw new ServiceUnavailableException(`AI服务调用失败 (错误码: ${response.status})`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new ServiceUnavailableException('AI服务返回数据格式异常');
    }
    return data.choices[0].message.content;
  }

  // AI标题生成
  async generateTitles(
    content: string,
    count: number = 3
  ): Promise<TitleGenerationResult> {
    const prompt = `
请为以下文章生成${count}个候选标题。

文章内容：
${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

要求：
1. 简洁有力，8-20个字
2. 吸引读者，符合杂志风格
3. 体现文章核心内容
4. 避免标题党

请返回JSON格式：
{
  "titles": ["标题1", "标题2", "标题3"],
  "reason": "推荐理由"
}
`;

    try {
      const result = await this.callAI(prompt);
      // 清理可能的markdown包裹
      const cleanJson = result.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      this.logger.error('AI标题生成失败', error);
      throw error;
    }
  }

  // AI摘要生成
  async generateSummary(content: string): Promise<string> {
    const prompt = `
请为以下文章生成一个50-100字的摘要。

文章内容：
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

要求：
1. 概括文章核心内容
2. 语言简洁
3. 可以引起读者兴趣

请直接返回摘要内容，不需要JSON。
`;

    try {
      return await this.callAI(prompt);
    } catch (error) {
      this.logger.error('AI摘要生成失败', error);
      throw error;
    }
  }

  // AI排版优化建议
  async suggestLayout(
    article: { title: string; content: string; hasImages: boolean },
    section: { name: string; layout: string }
  ): Promise<LayoutSuggestion> {
    const prompt = `
文章信息：
- 标题：${article.title}
- 是否包含图片：${article.hasImages ? '有' : '无'}
- 版块：${section.name}（${section.layout}布局）

请为这篇文章推荐最佳的排版方式，考虑因素：
1. 文章长度（长文适合多栏）
2. 是否有图片（影响布局选择）
3. 内容类型（新闻适合多栏，经验适合单栏）

请返回JSON格式：
{
  "suggestedLayout": "two-column",
  "suggestedFontSize": 10,
  "hasDropCap": true,
  "imagePosition": "right",
  "reason": "推荐理由"
}
`;

    try {
      const result = await this.callAI(prompt);
      // 清理可能的markdown包裹
      const cleanJson = result.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      this.logger.error('AI排版建议失败', error);
      throw error;
    }
  }

  // 执行智能分页
  async generatePageBreaks(
    article: Article,
    templateId: string,
    sectionName: string = '默认'
  ): Promise<{
    pages: PageBreak[];
    totalPages: number;
    template: MagazineTemplate;
  }> {
    const template = this.templateService.getTemplate(templateId);
    if (!template) {
      throw new BadRequestException(`模板 ${templateId} 不存在`);
    }

    const sectionConfig = template.sectionStyles.find(s => s.name === sectionName) || {
      name: sectionName,
      layout: 'single-column' as const,
    };

    const pages = this.layoutEngine.paginate(article, template, sectionConfig);

    return {
      pages,
      totalPages: pages.length,
      template,
    };
  }

  // 估算页数
  async estimatePageCount(
    article: Article,
    templateId: string,
    sectionName: string = '默认'
  ): Promise<number> {
    const template = this.templateService.getTemplate(templateId);
    if (!template) {
      throw new BadRequestException(`模板 ${templateId} 不存在`);
    }

    const sectionConfig = template.sectionStyles.find(s => s.name === sectionName) || {
      name: sectionName,
      layout: 'single-column' as const,
    };

    return this.layoutEngine.estimatePageCount(article, template, sectionConfig);
  }

  // 获取所有模板
  getAllTemplates(): MagazineTemplate[] {
    return this.templateService.getAllTemplates();
  }

  // 获取模板详情
  getTemplate(id: string): MagazineTemplate | null {
    return this.templateService.getTemplate(id);
  }
}
