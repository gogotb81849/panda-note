import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, InternalServerErrorException } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { RoleMenuConfigService } from './role-menu-config/role-menu-config.service';
import { TeamCode } from '@prisma/client';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ---------- 启动时配置自检 ----------
  const nodeEnv = process.env.NODE_ENV || 'development';
  const missing: string[] = [];

  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');

  const aiConfigured = Boolean(process.env.AI_API_KEY && process.env.AI_ENDPOINT_ID);
  const defaultAiKey = process.env.AI_API_KEY?.includes('please-replace') ?? true;

  logger.log('=============================================');
  logger.log(`运行环境 (NODE_ENV): ${nodeEnv}`);
  logger.log(`AI 服务已配置: ${aiConfigured && !defaultAiKey ? '✅' : '❌（仍为占位值或未配置）'}`);
  logger.log(`CORS 白名单: ${process.env.FRONTEND_URL ?? '默认 localhost 3000/3001'}`);
  if (missing.length > 0) {
    logger.error(`缺少必填环境变量: ${missing.join(', ')}`);
    throw new InternalServerErrorException(`缺少必填环境变量: ${missing.join(', ')}`);
  }
  if (nodeEnv === 'production') {
    logger.log('✅ 生产模式：init-users 接口已禁用，登录页测试账号将隐藏');
  } else {
    logger.warn('⚠️ 当前为开发模式，请勿在公网暴露本服务');
  }
  logger.log('=============================================');

  const app = await NestFactory.create(AppModule);

  // CORS配置：仅允许FRONTEND_URL环境变量指定的域名
  const rawOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001'];

  // 自动为每个 origin 添加端口号变体（3000 和 3001）
  const allowedOrigins = new Set<string>();
  for (const url of rawOrigins) {
    allowedOrigins.add(url);
    // 如果 URL 没有端口，自动添加 :3000 和 :3001 变体
    if (!url.includes(':')) {
      allowedOrigins.add(url + ':3000');
      allowedOrigins.add(url + ':3001');
    }
    // 如果 URL 有端口但不是 3000/3001，也添加这些变体
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    if (!['3000', '3001'].includes(urlObj.port)) {
      urlObj.port = '3000';
      allowedOrigins.add(urlObj.origin);
      urlObj.port = '3001';
      allowedOrigins.add(urlObj.origin);
    }
  }

  const allowedList = Array.from(allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // 允许无origin的请求（如服务器内部调用、Postman、SSR）
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // 检查是否在白名单中
      if (allowedList.includes(origin)) {
        callback(null, true);
        return;
      }
      
      // 生产环境：如果 FRONTEND_URL 已配置但 origin 不在白名单中，记录警告并拒绝
      // 注意：使用 callback(null, false) 而不是 callback(new Error(...))，
      // 后者会导致 500 错误而不是正常的 CORS 拒绝
      logger.warn(`CORS 拒绝来源: ${origin} (允许: ${allowedList.join(', ')})`);
      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    forbidNonWhitelisted: false,
  }));
  
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());

  // 尝试初始化默认用户和数据，如果失败则跳过
  try {
    const authService = app.get(AuthService);
    await authService.createInitialUsers();
    logger.log('初始用户数据已初始化/更新完成');

    // 初始化菜单配置
    const menuConfigService = app.get(RoleMenuConfigService);
    const teamCodes: TeamCode[] = ['team1', 'team2', 'team3'];
    for (const tc of teamCodes) {
      await menuConfigService.seedDefaultMenus(tc);
    }
    logger.log('菜单配置已初始化');
  } catch (error) {
    logger.warn(`初始数据创建跳过: ${error.message}`);
  }

  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(`后端服务已启动: http://localhost:${port}`);
}

bootstrap();
