import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TitleService } from '../title/title.service';
import { DictService } from '../dict/dict.service';
import { TeamCode, UserRole } from '@prisma/client';

@Injectable()
export class AICategorizationService {
  private readonly logger = new Logger(AICategorizationService.name);
  private readonly API_URL = process.env.AI_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly API_KEY = process.env.AI_API_KEY;
  private readonly ENDPOINT_ID = process.env.AI_ENDPOINT_ID;

  constructor(
    private prisma: PrismaService,
    private titleService: TitleService,
    private dictService: DictService,
  ) {}

  // AI分析日记内容，建议归类标题
  async suggestCategory(teamCode: TeamCode, role: UserRole, content: string) {
    try {
      // 获取可用的标题列表
      const titles = await this.titleService.getUserTitles(teamCode, role);
      
      if (Object.keys(titles).length === 0) {
        return { success: false, message: '没有可用的标题分类', suggestions: [] };
      }

      // 构建标题列表字符串
      let titleListStr = '可用标题分类：\n';
      for (const [first, seconds] of Object.entries(titles)) {
        titleListStr += `- ${first}\n`;
        for (const s of seconds) {
          titleListStr += `  - ${s.title}${s.description ? `（${s.description}）` : ''}\n`;
        }
      }

      const messages = [
        {
          role: 'system',
          content: `你是一位专业的航务管理AI助手。你的任务是根据用户输入的日记内容，分析其语义，并从提供的标题分类中选择最匹配的一级分类和二级标题。

要求：
1. 只从提供的标题列表中选择，不要创造新标题
2. 如果内容涉及多个标题，选择最相关的一个
3. 如果内容无法匹配任何标题，返回null
4. 用JSON格式返回结果`,
        },
        {
          role: 'user',
          content: `请分析以下日记内容，并建议最合适的标题分类：

${titleListStr}

日记内容：
${content}

请返回JSON格式的结果，格式如下：
{
  "categoryFirst": "一级分类名称",
  "categorySecond": "二级标题名称",
  "confidence": 0.95,
  "reason": "选择该标题的原因"
}

如果无法匹配，返回：{"categoryFirst": null, "categorySecond": null, "confidence": 0, "reason": "无法匹配到合适的标题"}
`,
        },
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
            messages,
            temperature: 0.3,
            max_tokens: 500,
          }),
          signal: controller.signal,
        });
      } catch (error: any) {
        clearTimeout(timeoutId);
        this.logger.error('AI归类调用失败', error);
        return { success: false, message: error.message || 'AI服务调用失败', suggestions: [] };
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.error(`AI归类API调用失败: ${response.status}`);
        return { success: false, message: 'AI服务调用失败', suggestions: [] };
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';
      
      try {
        // 解析JSON响应
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            suggestions: result.categoryFirst ? [result] : [],
          };
        }
        return { success: false, message: 'AI返回格式异常', suggestions: [] };
      } catch (e) {
        this.logger.error('解析AI响应失败', e);
        return { success: false, message: '解析AI响应失败', suggestions: [] };
      }
    } catch (error) {
      this.logger.error('AI归类失败', error);
      return { success: false, message: error.message || '未知错误', suggestions: [] };
    }
  }

  // AI为经验分享推荐分类和标签
  async suggestExperienceCategory(teamCode: TeamCode, title: string, content: string) {
    try {
      // 获取可用的经验分享分类
      const categories = await this.dictService.findAllFirstTypes(teamCode);
      
      if (!categories || categories.length === 0) {
        return { success: false, message: '没有可用的分类', suggestions: [] };
      }

      // 构建分类列表字符串
      const categoryListStr = categories.map(c => c.categoryName).join('、');

      // 预设的标签库
      const tagLibrary = [
        '实操经验', '安全提示', '注意事项', '故障处理', '日常维护',
        '新手必看', '技巧分享', '案例分析', '问题解决', '经验总结',
        '设备操作', '航行经验', '港口操作', '应急处理', '培训资料'
      ];

      const messages = [
        {
          role: 'system',
          content: `你是一位专业的航海经验分享助手。你的任务是根据用户输入的文章标题和内容，分析其语义，并推荐最匹配的一个分类和3-5个标签。

要求：
1. 分类只能从提供的分类列表中选择一个
2. 标签从提供的标签库中选择3-5个最相关的，也可以根据内容生成1-2个新标签（但不要创造太多新标签）
3. 用JSON格式返回结果`,
        },
        {
          role: 'user',
          content: `请分析以下经验分享文章，推荐合适的分类和标签：

可用分类：${categoryListStr}

标签库：${tagLibrary.join('、')}

文章标题：${title}

文章内容：
${content}

请返回JSON格式的结果，格式如下：
{
  "category": "推荐分类名称",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "confidence": 0.95,
  "reason": "推荐理由"
}

如果无法确定合适的分类，返回：{"category": null, "tags": [], "confidence": 0, "reason": "无法匹配到合适的分类"}
`,
        },
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
            messages,
            temperature: 0.3,
            max_tokens: 500,
          }),
          signal: controller.signal,
        });
      } catch (error: any) {
        clearTimeout(timeoutId);
        this.logger.error('AI经验分类调用失败', error);
        return { success: false, message: error.message || 'AI服务调用失败', suggestions: [] };
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.error(`AI经验分类API调用失败: ${response.status}`);
        return { success: false, message: 'AI服务调用失败', suggestions: [] };
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';
      
      try {
        // 解析JSON响应
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            suggestions: result.category ? [result] : [],
          };
        }
        return { success: false, message: 'AI返回格式异常', suggestions: [] };
      } catch (e) {
        this.logger.error('解析AI响应失败', e);
        return { success: false, message: '解析AI响应失败', suggestions: [] };
      }
    } catch (error) {
      this.logger.error('AI经验分类失败', error);
      return { success: false, message: error.message || '未知错误', suggestions: [] };
    }
  }
}
