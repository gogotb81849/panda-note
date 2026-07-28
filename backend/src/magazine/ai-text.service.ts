import { Injectable, Logger, BadRequestException, GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';

// 文字纠错结果
export interface CheckResult {
  errors: Array<{
    position: { start: number; end: number };
    type: 'spelling' | 'grammar' | 'style';
    message: string;
    suggestions: string[];
    confidence: number;
  }>;
}

// 文字润色结果
export interface PolishResult {
  result: string;
  changes: Array<{
    original: string;
    polished: string;
    reason: string;
  }>;
}

// 文字扩写结果
export interface ExpandResult {
  result: string;
  addedContent: string;
}

// 文字缩写结果
export interface CondenseResult {
  result: string;
  removedContent: string;
}

// 文字改写结果
export interface RewriteResult {
  result: string;
  styleChanges: string[];
}

// 标题建议结果
export interface TitleSuggestionResult {
  titles: Array<{
    title: string;
    style: 'formal' | 'creative' | 'question';
    reason: string;
  }>;
}

@Injectable()
export class AITextService {
  private readonly logger = new Logger(AITextService.name);

  // AI配置
  private readonly API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly API_KEY = process.env.AI_API_KEY;
  private readonly ENDPOINT_ID = process.env.AI_ENDPOINT_ID;

  // 调用AI
  private async callAI(prompt: string): Promise<string> {
    if (!this.API_KEY || !this.ENDPOINT_ID) {
      throw new BadRequestException('AI服务未配置，请在.env文件中设置AI_API_KEY和AI_ENDPOINT_ID');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

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
              content: '你是一个专业的文字编辑助手，擅长检查拼写、语法错误，优化文字表达，润色文章内容。请严格按照用户要求的JSON格式返回结果，不要添加任何额外的解释或说明。',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
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

  // 清理JSON响应（去除可能的markdown包裹）
  private cleanJsonResponse(response: string): string {
    return response
      .replace(/^```json?\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  // 文字纠错（拼写、语法）
  async checkText(text: string): Promise<CheckResult> {
    if (!text || text.trim().length === 0) {
      return { errors: [] };
    }

    const prompt = `
请检查以下文字的拼写和语法错误，并给出修正建议。

文字内容：
${text}

请返回JSON格式（不要添加任何其他内容）：
{
  "errors": [
    {
      "position": { "start": 10, "end": 15 },
      "type": "spelling",
      "message": "拼写错误描述",
      "suggestions": ["正确写法1", "正确写法2"],
      "confidence": 0.95
    }
  ]
}

如果没有错误，返回 {"errors": []}

注意：
1. position中的start和end是字符位置索引（从0开始）
2. type只能是: spelling（拼写错误）、grammar（语法错误）、style（风格问题）
3. confidence是置信度，范围0-1
`;

    try {
      const result = await this.callAI(prompt);
      const cleanJson = this.cleanJsonResponse(result);
      const parsed = JSON.parse(cleanJson);
      
      // 验证返回格式
      if (!parsed.errors || !Array.isArray(parsed.errors)) {
        return { errors: [] };
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('AI文字纠错失败', error);
      throw error;
    }
  }

  // 文字润色
  async polishText(text: string): Promise<PolishResult> {
    if (!text || text.trim().length === 0) {
      return { result: '', changes: [] };
    }

    const prompt = `
请润色以下文字，使其更加流畅、专业。保持原意不变。

原文：
${text}

要求：
1. 修正语法错误
2. 优化表达方式
3. 调整句子结构
4. 保持原文风格

请返回JSON格式（不要添加任何其他内容）：
{
  "result": "润色后的完整文字",
  "changes": [
    {
      "original": "原文片段",
      "polished": "润色后片段",
      "reason": "修改原因"
    }
  ]
}
`;

    try {
      const result = await this.callAI(prompt);
      const cleanJson = this.cleanJsonResponse(result);
      const parsed = JSON.parse(cleanJson);
      
      // 验证返回格式
      if (!parsed.result) {
        parsed.result = text;
      }
      if (!parsed.changes || !Array.isArray(parsed.changes)) {
        parsed.changes = [];
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('AI文字润色失败', error);
      throw error;
    }
  }

  // 文字扩写
  async expandText(text: string, targetLength?: number): Promise<ExpandResult> {
    if (!text || text.trim().length === 0) {
      return { result: '', addedContent: '' };
    }

    const prompt = `
请扩写以下文字，使其内容更加丰富。

原文：
${text}
${targetLength ? `目标字数：约${targetLength}字` : ''}

要求：
1. 保持原文核心观点
2. 增加相关细节和例子
3. 保持文章风格一致
4. 扩写后字数增加30%-50%

请返回JSON格式（不要添加任何其他内容）：
{
  "result": "扩写后的完整文字",
  "addedContent": "新增的内容摘要"
}
`;

    try {
      const result = await this.callAI(prompt);
      const cleanJson = this.cleanJsonResponse(result);
      const parsed = JSON.parse(cleanJson);
      
      // 验证返回格式
      if (!parsed.result) {
        parsed.result = text;
      }
      if (!parsed.addedContent) {
        parsed.addedContent = '';
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('AI文字扩写失败', error);
      throw error;
    }
  }

  // 文字缩写
  async condenseText(text: string, targetLength?: number): Promise<CondenseResult> {
    if (!text || text.trim().length === 0) {
      return { result: '', removedContent: '' };
    }

    const prompt = `
请缩写以下文字，保留核心内容。

原文：
${text}
${targetLength ? `目标字数：约${targetLength}字` : ''}

要求：
1. 保留核心观点和关键信息
2. 删除冗余表达
3. 合并相似内容
4. 缩写后字数减少30%-50%

请返回JSON格式（不要添加任何其他内容）：
{
  "result": "缩写后的完整文字",
  "removedContent": "删除的内容摘要"
}
`;

    try {
      const result = await this.callAI(prompt);
      const cleanJson = this.cleanJsonResponse(result);
      const parsed = JSON.parse(cleanJson);
      
      // 验证返回格式
      if (!parsed.result) {
        parsed.result = text;
      }
      if (!parsed.removedContent) {
        parsed.removedContent = '';
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('AI文字缩写失败', error);
      throw error;
    }
  }

  // 文字改写（换一种表达方式）
  async rewriteText(text: string, style?: 'formal' | 'casual' | 'creative'): Promise<RewriteResult> {
    if (!text || text.trim().length === 0) {
      return { result: '', styleChanges: [] };
    }

    const styleDescription = style 
      ? `目标风格：${style === 'formal' ? '正式、严肃' : style === 'casual' ? '轻松、口语化' : '创意、新颖'}`
      : '';

    const prompt = `
请改写以下文字，换一种表达方式。

原文：
${text}
${styleDescription}

要求：
1. 保持原意不变
2. 使用不同的表达方式
3. 调整语气和风格

请返回JSON格式（不要添加任何其他内容）：
{
  "result": "改写后的完整文字",
  "styleChanges": ["风格变化描述1", "风格变化描述2"]
}
`;

    try {
      const result = await this.callAI(prompt);
      const cleanJson = this.cleanJsonResponse(result);
      const parsed = JSON.parse(cleanJson);
      
      // 验证返回格式
      if (!parsed.result) {
        parsed.result = text;
      }
      if (!parsed.styleChanges || !Array.isArray(parsed.styleChanges)) {
        parsed.styleChanges = [];
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('AI文字改写失败', error);
      throw error;
    }
  }

  // 生成标题建议
  async suggestTitles(text: string): Promise<TitleSuggestionResult> {
    if (!text || text.trim().length === 0) {
      return { titles: [] };
    }

    const prompt = `
请为以下文字生成3-5个标题建议。

文字内容：
${text.substring(0, 500)}${text.length > 500 ? '...' : ''}

请返回JSON格式（不要添加任何其他内容）：
{
  "titles": [
    {
      "title": "标题1",
      "style": "formal",
      "reason": "适合正式场合"
    },
    {
      "title": "标题2",
      "style": "creative",
      "reason": "吸引眼球"
    },
    {
      "title": "标题3",
      "style": "question",
      "reason": "引发思考"
    }
  ]
}

注意：style只能是: formal（正式）、creative（创意）、question（疑问式）
`;

    try {
      const result = await this.callAI(prompt);
      const cleanJson = this.cleanJsonResponse(result);
      const parsed = JSON.parse(cleanJson);
      
      // 验证返回格式
      if (!parsed.titles || !Array.isArray(parsed.titles)) {
        parsed.titles = [];
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('AI标题建议失败', error);
      throw error;
    }
  }
}