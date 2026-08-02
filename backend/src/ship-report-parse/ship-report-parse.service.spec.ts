import { Test, TestingModule } from '@nestjs/testing';
import { ShipReportParseService } from './ship-report-parse.service';

describe('ShipReportParseService', () => {
  let service: ShipReportParseService;
  const originalApiKey = process.env.AI_API_KEY;
  const originalEndpointId = process.env.AI_ENDPOINT_ID;

  beforeEach(async () => {
    // 确保未配置 AI_API_KEY，使服务回退到正则解析模式
    delete process.env.AI_API_KEY;
    delete process.env.AI_ENDPOINT_ID;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShipReportParseService],
    }).compile();

    service = module.get<ShipReportParseService>(ShipReportParseService);
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.AI_API_KEY = originalApiKey;
    } else {
      delete process.env.AI_API_KEY;
    }
    if (originalEndpointId !== undefined) {
      process.env.AI_ENDPOINT_ID = originalEndpointId;
    } else {
      delete process.env.AI_ENDPOINT_ID;
    }
    jest.clearAllMocks();
  });

  it('空文本应返回 {success: false, data: []}', async () => {
    const result = await service.parseReport('');

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
  });

  it('未配置 AI_API_KEY 时应回退到正则模式', async () => {
    const text = '远洋1号（V178 GMT+8）\n目前状态位置：南海东行航行';
    const result = await service.parseReport(text);

    expect(result.mode).toBe('regex');
    expect(result.success).toBe(true);
  });

  it('正则解析应从报告文本中提取船名', async () => {
    const text = [
      '远洋1号（V178 GMT+8）',
      '满载（惠州-新加坡）',
      '目前状态位置：南海东行航行',
      'ETA：2026-08-05 0800LT （GMT+8）',
    ].join('\n');

    const result = await service.parseReport(text);

    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].shipName).toBe('远洋1号');
  });

  it('使用正则兜底时应返回 mode=regex', async () => {
    const result = await service.parseReport('这是一段无法识别的普通文本');

    expect(result.mode).toBe('regex');
  });
});
