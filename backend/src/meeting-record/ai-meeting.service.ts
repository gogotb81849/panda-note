import { Injectable, Logger } from '@nestjs/common';

/**
 * AI会议纪要服务
 * 
 * 负责：
 * 1. 语音转文字（STT）- 使用火山引擎或其他STT服务
 * 2. AI生成会议纪要 - 使用豆包API
 * 3. 提取行动项
 * 
 * TODO: 接入火山引擎语音识别API
 * 当前使用模拟实现，后续替换为真实API调用
 */
@Injectable()
export class AiMeetingService {
  private readonly logger = new Logger(AiMeetingService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;

  constructor() {
    this.apiKey = process.env.VOLCENGINE_API_KEY || '';
    this.apiEndpoint = process.env.VOLCENGINE_STT_ENDPOINT || 'https://openspeech.bytedance.com/api/v1';
  }

  /**
   * 语音转文字（STT）
   * @param audioFilePath 音频文件路径
   * @returns 转写文本
   */
  async speechToText(audioFilePath: string): Promise<string> {
    this.logger.log(`开始语音转写: ${audioFilePath}`);

    // TODO: 接入火山引擎语音识别API
    // 参考文档: https://www.volcengine.com/docs/6561/79817
    // 
    // 实现步骤:
    // 1. 读取音频文件
    // 2. 调用火山引擎ASR接口
    // 3. 解析返回结果
    //
    // 示例代码（待实现）:
    // const response = await fetch(this.apiEndpoint + '/auc/recognize', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'audio/wav',
    //     'Authorization': `Bearer ${this.apiKey}`,
    //   },
    //   body: audioBuffer,
    // });
    // const result = await response.json();
    // return result.result.text;

    // 模拟返回
    return '[语音转写功能待接入火山引擎ASR API]';
  }

  /**
   * AI生成会议纪要
   * @param transcript 语音转写文本
   * @param title 会议主题
   * @param template 会议模板（可选）
   * @param customTerms 专业词库（可选）
   * @returns 会议纪要 + 行动项
   */
  async generateSummary(
    transcript: string,
    title: string,
    template?: string,
    customTerms?: Array<{ term: string; explanation?: string }>,
  ): Promise<{ summary: string; actionItems: any[] }> {
    this.logger.log(`开始生成会议纪要: ${title}`);

    // 构建专业词库提示
    const termsPrompt = customTerms && customTerms.length > 0
      ? `\n【专业词库参考】\n${customTerms.map(t => `- ${t.term}${t.explanation ? ': ' + t.explanation : ''}`).join('\n')}`
      : '';

    // 构建模板提示
    const templatePrompt = template
      ? `\n【会议模板要求】\n${template}`
      : '';

    const systemPrompt = `你是一名专业的会议秘书，擅长从会议录音转写文本中提取关键信息并生成结构化会议纪要。

请生成包含以下内容的会议纪要：
1. 会议基本信息（时间、地点、参会人）
2. 会议议题及讨论要点
3. 形成的决议/结论
4. 行动项（负责人、截止时间）
5. 下次会议安排
6. 备注

注意：
- 保留专业术语的准确性
- 区分不同发言人的观点
- 对模糊表述进行合理推断并标注
- 行动项必须明确责任人和截止时间（如文本中有提及）
- 输出格式为Markdown${templatePrompt}${termsPrompt}`;

    const userPrompt = `【会议主题】${title}

【转写文本】
${transcript}

请生成结构化的会议纪要，并在最后以JSON格式列出所有行动项。`;

    // TODO: 接入豆包API生成会议纪要
    // 参考现有的 ai-brief.service.ts 实现
    // 
    // 示例代码（待实现）:
    // const response = await fetch(this.apiEndpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model: 'doubao-pro',
    //     messages: [
    //       { role: 'system', content: systemPrompt },
    //       { role: 'user', content: userPrompt },
    //     ],
    //     temperature: 0.7,
    //     max_tokens: 4000,
    //   }),
    // });

    // 模拟返回
    return {
      summary: `# ${title}\n\n> AI会议纪要生成功能待接入豆包API\n\n## 会议内容摘要\n\n${transcript.substring(0, 200)}...\n\n## 行动项\n\n（待AI提取）`,
      actionItems: [],
    };
  }

  /**
   * 从文本中提取行动项
   * @param text AI返回的文本
   * @returns 行动项列表
   */
  extractActionItems(text: string): any[] {
    // 尝试解析JSON格式的行动项
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]);
        if (Array.isArray(items)) {
          return items.map(item => ({
            content: item.content || item.task || '',
            assignee: item.assignee || item.responsible || '',
            deadline: item.deadline || item.dueDate || '',
            status: item.status || 'pending',
          }));
        }
      }
    } catch {
      // JSON解析失败，尝试正则提取
    }

    // 使用正则提取行动项
    const actionItemRegex = /[-*]\s*(.+?)(?:\s*[（(](.+?)[）)])?(?:\s*截止[：:](.+?))?$/gm;
    const items: any[] = [];
    let match;
    while ((match = actionItemRegex.exec(text)) !== null) {
      items.push({
        content: match[1]?.trim() || '',
        assignee: match[2]?.trim() || '',
        deadline: match[3]?.trim() || '',
        status: 'pending',
      });
    }

    return items;
  }
}
